# 🔔 Enterprise Alert System Documentation

## Overview

The CannaConverter Enterprise Alert System provides multi-channel notification capabilities for monitoring system health, performance, and critical events. The system is designed with Email as the **PRIMARY** notification channel, with other channels serving as **REDUNDANCY** based on alert severity.

## Table of Contents

1. [Architecture](#architecture)
2. [Channel Configuration](#channel-configuration)
3. [Severity Routing](#severity-routing)
4. [Alert Rules](#alert-rules)
5. [Templates](#templates)
6. [Admin UI](#admin-ui)
7. [API Endpoints](#api-endpoints)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Prometheus    │────▶│  Alertmanager   │────▶│  Webhook API    │
│   (Metrics)     │     │  (Routing)      │     │  (Logging)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │  Email  │ │  Slack  │ │ Discord │
              │(Primary)│ │         │ │         │
              └─────────┘ └─────────┘ └─────────┘
                    │          │          │
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │PagerDuty│ │Telegram │ │   SMS   │
              │         │ │         │ │ (Twilio)│
              └─────────┘ └─────────┘ └─────────┘
```

### Components

| Component | Port | Purpose |
|-----------|------|---------|
| Prometheus | 9090 | Metrics collection & alert evaluation |
| Alertmanager | 9093 | Alert routing & notification |
| API Server | 3001 | Webhook logging & SMS/Telegram delivery |
| Grafana | 3002 | Dashboards linked from alerts |

---

## Channel Configuration

### Email (PRIMARY)

Email is the **mandatory primary channel** that receives ALL alerts regardless of severity.

```yaml
# Environment Variables
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=alerts@yourdomain.com
SMTP_PASSWORD=app-password
ALERT_EMAIL_TO=team@yourdomain.com
```

### Slack

Used for MEDIUM, HIGH, and CRITICAL alerts.

```yaml
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_CHANNEL=#alerts
```

### Discord

Used for LOW severity alerts and general notifications.

```yaml
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

### PagerDuty

Used for CRITICAL alerts requiring on-call escalation.

```yaml
PAGERDUTY_SERVICE_KEY=your-pagerduty-integration-key
```

### Telegram

Used for HIGH and CRITICAL alerts for on-call engineers.

```yaml
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=-100123456789
```

### SMS (Twilio)

Used for CRITICAL alerts only.

```yaml
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_FROM=+15551234567
ALERT_PHONE_TO=+15559876543
```

---

## Severity Routing

| Severity | Email | Slack | Discord | PagerDuty | Telegram | SMS |
|----------|:-----:|:-----:|:-------:|:---------:|:--------:|:---:|
| **CRITICAL** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **HIGH** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **MEDIUM** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **LOW** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Routing Logic

```yaml
# alertmanager.yml routing
routes:
  - match:
      severity: critical
    receiver: critical-all-channels
    repeat_interval: 5m
    
  - match:
      severity: high
    receiver: high-multi-channel
    repeat_interval: 15m
    
  - match:
      severity: medium
    receiver: medium-slack
    repeat_interval: 30m
    
  - match:
      severity: low
    receiver: discord-notifications
    repeat_interval: 1h
```

---

## Alert Rules

### Critical Alerts (Immediate Action Required)

| Alert | Condition | Action |
|-------|-----------|--------|
| `APIDown` | API unreachable > 1min | Immediate escalation |
| `DatabaseDown` | DB connection failed | DBA on-call |
| `HighErrorRate` | Error rate > 10% | Engineering escalation |
| `CriticalSecurityEvent` | Auth failures > 50/min | Security team |
| `PaymentProcessingDown` | Stripe failures | Business critical |

### High Alerts (Response within 15min)

| Alert | Condition | Action |
|-------|-----------|--------|
| `HighMemoryUsage` | Memory > 85% | Resource scaling |
| `HighCPUUsage` | CPU > 80% sustained | Performance review |
| `QueueBacklog` | Queue > 100 jobs | Worker scaling |
| `SlowResponseTime` | p95 > 5s | Performance investigation |

### Medium Alerts (Response within 1hr)

| Alert | Condition | Action |
|-------|-----------|--------|
| `ModerateMemory` | Memory 70-85% | Monitor and plan |
| `ConversionFailures` | Failure rate > 5% | Investigation |
| `CacheIssues` | Redis slow | Cache optimization |

### Low Alerts (Informational)

| Alert | Condition | Action |
|-------|-----------|--------|
| `DiskSpaceWarning` | Disk > 70% | Cleanup scheduled |
| `CertExpiringSoon` | Cert expires < 30d | Certificate renewal |
| `MaintenanceReminder` | Scheduled | Planning |

---

## Templates

### Location

Templates are stored in `alertmanager/templates/`:

```
alertmanager/templates/
├── email.html      # Rich HTML email template
├── slack.tmpl      # Slack message format
├── discord.tmpl    # Discord embed format
├── pagerduty.tmpl  # PagerDuty Events API v2
├── telegram.tmpl   # Telegram markdown
└── sms.tmpl        # 120-char SMS format
```

### Email Template Features

- Color-coded severity headers (red/orange/yellow/blue)
- Alert metadata table
- Labels and annotations display
- Action buttons for Grafana dashboards
- Responsive design for mobile

### Slack Template Features

- Emoji indicators by severity
- Formatted fields for context
- Dashboard action buttons
- Thread-friendly format

---

## Admin UI

### Access

Navigate to `/admin/alerts` in the frontend application.

### Features

1. **Dashboard Overview**
   - Total alerts count
   - Last 24h alerts
   - Critical/High counts

2. **Alert List**
   - Paginated table view
   - Severity badges
   - Channel indicators
   - Quick actions (view, dashboard link)

3. **Filters**
   - By severity (critical/high/medium/low)
   - By service
   - By status (sent/delivered/failed)

4. **Alert Details Modal**
   - Full alert payload
   - Channel delivery status
   - Timeline information
   - Dashboard links

---

## API Endpoints

### Webhook Endpoints

#### POST `/api/webhooks/alerts`

Main webhook for Alertmanager.

**Request:**
```json
{
  "status": "firing",
  "groupLabels": {
    "alertname": "APIDown",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "API server is down"
  },
  "alerts": [...]
}
```

**Response:**
```json
{
  "success": true,
  "alertId": "clx...",
  "channels": ["email", "slack", "pagerduty", "telegram", "sms"],
  "responseTime": 45
}
```

#### POST `/api/webhooks/alerts/sms`

SMS delivery via Twilio (CRITICAL only).

#### POST `/api/webhooks/alerts/telegram`

Telegram message delivery (HIGH/CRITICAL).

### Admin Endpoints

#### GET `/api/admin/alerts/list`

List alerts with pagination and filters.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `severity` (optional)
- `service` (optional)
- `status` (optional)

#### GET `/api/admin/alerts/stats`

Get alert statistics.

**Response:**
```json
{
  "total": 150,
  "last24h": 12,
  "bySeverity": {
    "critical": 5,
    "high": 20,
    "medium": 75,
    "low": 50
  }
}
```

#### GET `/api/admin/alerts/:id`

Get single alert details.

---

## Testing

### Validate Alertmanager Config

```bash
node scripts/test-alertmanager-config.js
```

### Test Alert Delivery

```bash
node scripts/test-alert-delivery.js
```

### Run API Tests

```bash
cd frontend && npm run test:api -- alerts.spec.ts
```

### Manual Test Alerts

```bash
# Fire a test critical alert
curl -X POST http://localhost:3001/api/webhooks/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "groupLabels": {"alertname": "TestAlert", "severity": "critical"},
    "commonAnnotations": {"summary": "Manual test alert"},
    "alerts": [{"status": "firing", "startsAt": "'$(date -Iseconds)'"}]
  }'
```

---

## Troubleshooting

### Alerts Not Sending

1. **Check Alertmanager status:**
   ```bash
   curl http://localhost:9093/-/healthy
   ```

2. **View pending alerts:**
   ```bash
   curl http://localhost:9093/api/v1/alerts
   ```

3. **Check silences:**
   ```bash
   curl http://localhost:9093/api/v1/silences
   ```

### Email Not Delivered

1. Verify SMTP credentials in environment
2. Check spam folder
3. Review Alertmanager logs:
   ```bash
   docker logs alertmanager 2>&1 | grep -i email
   ```

### Slack Not Working

1. Verify webhook URL is valid
2. Check Slack app permissions
3. Test webhook directly:
   ```bash
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```

### PagerDuty Not Triggering

1. Verify integration key
2. Check service is enabled
3. Review PagerDuty event logs

### SMS Not Sending

1. Verify Twilio credentials
2. Check phone number format (E.164)
3. Review Twilio console for errors

---

## Configuration Reference

### Full alertmanager.yml Example

See `alertmanager/alertmanager.yml` for complete configuration.

### Environment Variables

```bash
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
ALERT_EMAIL_TO=team@company.com

# Slack
SLACK_WEBHOOK_URL=

# Discord
DISCORD_WEBHOOK_URL=

# PagerDuty
PAGERDUTY_SERVICE_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_FROM=
ALERT_PHONE_TO=
```

---

## Changelog

### v1.0.0 (2024-12-04)

- Initial enterprise alert system
- Multi-channel routing by severity
- Email as primary channel
- Admin UI for alert management
- Professional message templates
- Prometheus alert rules integration
- Webhook logging to database

---

## Support

For issues with the alert system:

1. Check this documentation
2. Review logs in `logs/` directory
3. Open issue in project repository
4. Contact on-call engineer for CRITICAL alerts
