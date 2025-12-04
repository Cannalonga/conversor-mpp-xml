/**
 * 🔌 QUEUE API ROUTES
 * 
 * Endpoints para gerenciamento de fila de jobs:
 * - GET /api/queue/stats - Estatísticas da fila
 * - GET /api/queue/info - Informações do backend
 * - GET /api/queue/job/:id - Status de um job
 * - POST /api/queue/job - Adicionar job de teste
 */

const express = require('express');
const router = express.Router();
const { getQueueManager } = require('../../queue/queue-manager');

// Inicializar queue manager
let queueManager = null;

async function getQueue() {
    if (!queueManager) {
        queueManager = getQueueManager();
        await queueManager.init();
    }
    return queueManager;
}

/**
 * GET /api/queue/info
 * Retorna informações do backend de fila
 */
router.get('/info', async (req, res) => {
    try {
        const queue = await getQueue();
        const info = queue.getInfo();
        
        res.json({
            success: true,
            ...info,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/queue/stats
 * Retorna estatísticas da fila
 */
router.get('/stats', async (req, res) => {
    try {
        const queue = await getQueue();
        const stats = await queue.getStats();
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/queue/job/:id
 * Retorna status de um job específico
 */
router.get('/job/:id', async (req, res) => {
    try {
        const queue = await getQueue();
        const status = await queue.getJobStatus(req.params.id);
        
        res.json({
            success: true,
            job: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/queue/job
 * Adiciona um job de teste à fila
 */
router.post('/job', async (req, res) => {
    try {
        const queue = await getQueue();
        
        const { type, data } = req.body;
        
        if (!type) {
            return res.status(400).json({
                success: false,
                error: 'Job type is required'
            });
        }
        
        const job = await queue.addJob(type, data || {});
        
        res.status(201).json({
            success: true,
            job,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/queue/health
 * Health check específico da fila
 */
router.get('/health', async (req, res) => {
    try {
        const queue = await getQueue();
        const info = queue.getInfo();
        const stats = await queue.getStats();
        
        const isHealthy = info.ready;
        
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            backend: info.backend,
            ready: info.ready,
            stats: {
                waiting: stats.waiting,
                active: stats.active
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
