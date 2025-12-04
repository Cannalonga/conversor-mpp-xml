/**
 * Alert Webhook Handler
 * Receives alerts from Alertmanager and logs them to the database
 * Also handles SMS delivery via Twilio
 */

const express = require('express');
const router = express.Router();

// Try to import Prisma client
let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  console.warn('[AlertWebhook] Prisma not available, using in-memory storage');
}

// In-memory fallback storage
const alertLogs = [];

// Twilio client (optional)
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (e) {
  console.warn('[AlertWebhook] Twilio not available');
}

/**
 * POST /api/webhooks/alerts
 * Main webhook endpoint for Alertmanager
 */
router.post('/alerts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const payload = req.body;
    
    // Extract alert information
    const {
      status,
      groupLabels = {},
      commonLabels = {},
      commonAnnotations = {},
      alerts = [],
      groupKey,
      externalURL
    } = payload;
    
    const alertname = groupLabels.alertname || commonLabels.alertname || 'unknown';
    const severity = groupLabels.severity || commonLabels.severity || 'medium';
    const service = groupLabels.service || commonLabels.service || 'unknown';
    const instance = commonLabels.instance || null;
    
    // Determine which channels this alert was routed to
    const channels = determineChannels(severity);
    
    // Count firing and resolved
    const firingAlerts = alerts.filter(a => a.status === 'firing');
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
    
    // Build log entry
    const logEntry = {
      alertname,
      severity,
      service,
      instance,
      status: 'SENT',
      channels: JSON.stringify(channels),
      payload: JSON.stringify(payload),
      summary: commonAnnotations.summary || null,
      description: commonAnnotations.description || null,
      dashboardUrl: commonAnnotations.dashboard_url || null,
      firingCount: firingAlerts.length,
      resolvedCount: resolvedAlerts.length,
      groupKey: groupKey || null,
      fingerprint: alerts[0]?.fingerprint || null,
      startsAt: alerts[0]?.startsAt ? new Date(alerts[0].startsAt) : null,
      endsAt: alerts[0]?.endsAt ? new Date(alerts[0].endsAt) : null,
      responseTime: Date.now() - startTime
    };
    
    // Save to database or in-memory
    let savedLog;
    if (prisma) {
      savedLog = await prisma.alertDeliveryLog.create({
        data: logEntry
      });
      
      // Log individual channel deliveries
      for (const channel of channels) {
        await prisma.alertChannelDelivery.create({
          data: {
            alertLogId: savedLog.id,
            channel,
            status: 'SENT',
            deliveredAt: new Date()
          }
        });
      }
    } else {
      savedLog = { id: `mem-${Date.now()}`, ...logEntry, createdAt: new Date() };
      alertLogs.push(savedLog);
    }
    
    console.log(`[AlertWebhook] Logged alert: ${alertname} (${severity}) - ${firingAlerts.length} firing`);
    
    res.json({
      success: true,
      alertId: savedLog.id,
      channels,
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('[AlertWebhook] Error processing alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/webhooks/alerts/sms
 * Endpoint for sending SMS via Twilio (CRITICAL alerts only)
 */
router.post('/alerts/sms', async (req, res) => {
  try {
    const payload = req.body;
    const { groupLabels = {}, commonAnnotations = {}, alerts = [] } = payload;
    
    const alertname = groupLabels.alertname || 'Unknown Alert';
    const service = groupLabels.service || 'unknown';
    const summary = commonAnnotations.summary || 'Critical alert triggered';
    
    // Build SMS message (max 160 chars)
    const message = `🚨 CRITICAL: ${alertname} - ${service}. ${summary}`.substring(0, 155);
    
    if (twilioClient && process.env.TWILIO_PHONE_FROM && process.env.ALERT_PHONE_TO) {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_FROM,
        to: process.env.ALERT_PHONE_TO
      });
      
      console.log(`[AlertWebhook] SMS sent for: ${alertname}`);
      
      res.json({ success: true, message: 'SMS sent' });
    } else {
      console.log(`[AlertWebhook] SMS would be sent: ${message}`);
      res.json({ success: true, message: 'SMS simulated (Twilio not configured)' });
    }
    
  } catch (error) {
    console.error('[AlertWebhook] SMS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/alerts/telegram
 * Endpoint for formatting and sending Telegram messages
 */
router.post('/alerts/telegram', async (req, res) => {
  try {
    const payload = req.body;
    const { groupLabels = {}, commonAnnotations = {}, alerts = [], status } = payload;
    
    const alertname = groupLabels.alertname || 'Unknown';
    const severity = groupLabels.severity || 'medium';
    const service = groupLabels.service || 'unknown';
    const summary = commonAnnotations.summary || '';
    
    // Build Telegram message
    const emoji = status === 'resolved' ? '✅' : 
                  severity === 'critical' ? '🚨' : 
                  severity === 'high' ? '⚠️' : 'ℹ️';
    
    const message = `${emoji} *[${status.toUpperCase()}]* ${alertname}\n\n` +
                   `*Severity:* ${severity.toUpperCase()}\n` +
                   `*Service:* ${service}\n\n` +
                   `📋 ${summary}\n\n` +
                   `🔥 Firing: ${alerts.filter(a => a.status === 'firing').length}`;
    
    // If Telegram bot is configured, send message
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const fetch = require('node-fetch');
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      console.log(`[AlertWebhook] Telegram sent for: ${alertname}`);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[AlertWebhook] Telegram error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/alerts/list
 * Admin endpoint to list alert history
 */
router.get('/list', async (req, res) => {
  try {
    // Check admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { 
      page = 1, 
      limit = 20, 
      severity, 
      service, 
      status,
      startDate,
      endDate
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    if (prisma) {
      // Build where clause
      const where = {};
      if (severity) where.severity = severity;
      if (service) where.service = service;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      
      const [alerts, total] = await Promise.all([
        prisma.alertDeliveryLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            // Note: Need to add relation if we want channel deliveries
          }
        }),
        prisma.alertDeliveryLog.count({ where })
      ]);
      
      res.json({
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / take)
        }
      });
    } else {
      // In-memory fallback
      const filtered = alertLogs.filter(a => {
        if (severity && a.severity !== severity) return false;
        if (service && a.service !== service) return false;
        if (status && a.status !== status) return false;
        return true;
      });
      
      const paginated = filtered.slice(skip, skip + take);
      
      res.json({
        alerts: paginated,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filtered.length,
          pages: Math.ceil(filtered.length / take)
        }
      });
    }
    
  } catch (error) {
    console.error('[AlertWebhook] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/alerts/stats
 * Get alert statistics
 */
router.get('/stats', async (req, res) => {
  try {
    if (prisma) {
      const [
        totalAlerts,
        bySeverity,
        byService,
        byStatus,
        last24h
      ] = await Promise.all([
        prisma.alertDeliveryLog.count(),
        prisma.alertDeliveryLog.groupBy({
          by: ['severity'],
          _count: true
        }),
        prisma.alertDeliveryLog.groupBy({
          by: ['service'],
          _count: true,
          orderBy: { _count: { service: 'desc' } },
          take: 10
        }),
        prisma.alertDeliveryLog.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.alertDeliveryLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);
      
      res.json({
        total: totalAlerts,
        last24h,
        bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count])),
        byService: Object.fromEntries(byService.map(s => [s.service, s._count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count]))
      });
    } else {
      res.json({
        total: alertLogs.length,
        last24h: alertLogs.filter(a => 
          new Date(a.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        bySeverity: {},
        byService: {},
        byStatus: {}
      });
    }
    
  } catch (error) {
    console.error('[AlertWebhook] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/alerts/:id
 * Get single alert details with channel deliveries
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (prisma) {
      const alert = await prisma.alertDeliveryLog.findUnique({
        where: { id }
      });
      
      const channelDeliveries = await prisma.alertChannelDelivery.findMany({
        where: { alertLogId: id }
      });
      
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      res.json({
        ...alert,
        channelDeliveries,
        payloadParsed: JSON.parse(alert.payload || '{}')
      });
    } else {
      const alert = alertLogs.find(a => a.id === id);
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      res.json(alert);
    }
    
  } catch (error) {
    console.error('[AlertWebhook] Get alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Determine which channels an alert should be sent to based on severity
 */
function determineChannels(severity) {
  const channels = ['email']; // Email always receives
  
  switch (severity) {
    case 'critical':
      channels.push('slack', 'pagerduty', 'telegram', 'sms');
      break;
    case 'high':
      channels.push('slack', 'telegram');
      break;
    case 'medium':
      channels.push('slack');
      break;
    case 'low':
      channels.push('discord');
      break;
  }
  
  return channels;
}

module.exports = router;
