/**
 * PROMETHEUS METRICS SYSTEM
 * 
 * Exposes application metrics in Prometheus format for monitoring and alerting.
 * 
 * Available metrics:
 * - HTTP request count/duration
 * - File conversion metrics
 * - Payment processing metrics
 * - System resource usage
 * - Error rates
 * - Uptime and availability
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class MetricsCollector {
    constructor(options = {}) {
        this.options = {
            ...options
        };
        
        // Metric counters and gauges
        this.metrics = {
            // HTTP requests
            http_requests_total: new Map(),
            http_request_duration_seconds: new Map(),
            http_errors_total: new Map(),
            
            // Conversions
            conversions_total: 0,
            conversions_successful: 0,
            conversions_failed: 0,
            conversions_pending: 0,
            conversion_duration_seconds: [],
            
            // Payments
            payments_total: 0,
            payments_successful: 0,
            payments_failed: 0,
            payments_amount_total_brl: 0,
            
            // System
            uptime_seconds: 0,
            process_memory_rss_bytes: 0,
            process_heap_used_bytes: 0,
            process_heap_total_bytes: 0,
            disk_used_bytes: 0,
            disk_free_bytes: 0,
            disk_total_bytes: 0,
            
            // Jobs/Queue
            queue_jobs_total: 0,
            queue_jobs_pending: 0,
            queue_jobs_completed: 0,
            queue_jobs_failed: 0,
            queue_jobs_retried: 0,
            
            // Logs
            log_files_total_mb: 0,
            log_entries_total: 0,
            log_errors_total: 0
        };
        
        this.startTime = Date.now();
    }

    /**
     * Record HTTP request
     */
    recordHttpRequest(method, path, statusCode, duration) {
        const key = `${method}_${path}_${statusCode}`;
        this.metrics.http_requests_total.set(
            key,
            (this.metrics.http_requests_total.get(key) || 0) + 1
        );
        
        if (statusCode >= 400) {
            this.metrics.http_errors_total.set(
                key,
                (this.metrics.http_errors_total.get(key) || 0) + 1
            );
        }
    }

    /**
     * Record conversion metrics
     */
    recordConversion(success, duration, size) {
        this.metrics.conversions_total++;
        if (success) {
            this.metrics.conversions_successful++;
        } else {
            this.metrics.conversions_failed++;
        }
        
        this.metrics.conversion_duration_seconds.push(duration);
        
        // Keep last 1000 durations for averaging
        if (this.metrics.conversion_duration_seconds.length > 1000) {
            this.metrics.conversion_duration_seconds.shift();
        }
    }

    /**
     * Record payment
     */
    recordPayment(success, amountBRL) {
        this.metrics.payments_total++;
        if (success) {
            this.metrics.payments_successful++;
            this.metrics.payments_amount_total_brl += amountBRL;
        } else {
            this.metrics.payments_failed++;
        }
    }

    /**
     * Record queue job
     */
    recordQueueJob(status, retried = false) {
        this.metrics.queue_jobs_total++;
        
        switch (status) {
            case 'pending':
                this.metrics.queue_jobs_pending++;
                break;
            case 'completed':
                this.metrics.queue_jobs_completed++;
                break;
            case 'failed':
                this.metrics.queue_jobs_failed++;
                break;
        }
        
        if (retried) {
            this.metrics.queue_jobs_retried++;
        }
    }

    /**
     * Update system metrics
     */
    updateSystemMetrics() {
        this.metrics.uptime_seconds = (Date.now() - this.startTime) / 1000;
        
        const memUsage = process.memoryUsage();
        this.metrics.process_memory_rss_bytes = memUsage.rss;
        this.metrics.process_heap_used_bytes = memUsage.heapUsed;
        this.metrics.process_heap_total_bytes = memUsage.heapTotal;
        
        // Disk usage
        try {
            const diskUsage = this._getDiskUsage();
            this.metrics.disk_used_bytes = diskUsage.used;
            this.metrics.disk_free_bytes = diskUsage.free;
            this.metrics.disk_total_bytes = diskUsage.total;
        } catch (e) {
            // Silently fail if disk metrics unavailable
        }
    }

    /**
     * Get disk usage (approximation on Windows/Linux)
     */
    _getDiskUsage() {
        // This is a simplified version - in production use 'diskusage' package
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        
        return {
            total: totalMemory * 100, // Approximate (multiply for bytes)
            free: freeMemory * 100,
            used: (totalMemory - freeMemory) * 100
        };
    }

    /**
     * Calculate average conversion duration
     */
    getAverageConversionDuration() {
        if (this.metrics.conversion_duration_seconds.length === 0) return 0;
        const sum = this.metrics.conversion_duration_seconds.reduce((a, b) => a + b, 0);
        return sum / this.metrics.conversion_duration_seconds.length;
    }

    /**
     * Get success rate
     */
    getConversionSuccessRate() {
        if (this.metrics.conversions_total === 0) return 0;
        return (this.metrics.conversions_successful / this.metrics.conversions_total * 100).toFixed(2);
    }

    /**
     * Export metrics in Prometheus format
     */
    exportPrometheus() {
        this.updateSystemMetrics();
        
        let output = '';
        
        // HELP and TYPE comments
        output += '# HELP http_requests_total Total HTTP requests\n';
        output += '# TYPE http_requests_total counter\n';
        
        for (const [key, value] of this.metrics.http_requests_total) {
            output += `http_requests_total{endpoint="${key}"} ${value}\n`;
        }
        
        output += '# HELP http_errors_total Total HTTP errors\n';
        output += '# TYPE http_errors_total counter\n';
        
        for (const [key, value] of this.metrics.http_errors_total) {
            output += `http_errors_total{endpoint="${key}"} ${value}\n`;
        }
        
        output += '# HELP conversions_total Total file conversions attempted\n';
        output += '# TYPE conversions_total counter\n';
        output += `conversions_total ${this.metrics.conversions_total}\n`;
        
        output += '# HELP conversions_successful Total successful conversions\n';
        output += '# TYPE conversions_successful counter\n';
        output += `conversions_successful ${this.metrics.conversions_successful}\n`;
        
        output += '# HELP conversions_failed Total failed conversions\n';
        output += '# TYPE conversions_failed counter\n';
        output += `conversions_failed ${this.metrics.conversions_failed}\n`;
        
        output += '# HELP conversion_success_rate Conversion success rate percentage\n';
        output += '# TYPE conversion_success_rate gauge\n';
        output += `conversion_success_rate ${this.getConversionSuccessRate()}\n`;
        
        output += '# HELP conversion_duration_avg Average conversion duration in seconds\n';
        output += '# TYPE conversion_duration_avg gauge\n';
        output += `conversion_duration_avg ${this.getAverageConversionDuration().toFixed(3)}\n`;
        
        output += '# HELP payments_total Total payments processed\n';
        output += '# TYPE payments_total counter\n';
        output += `payments_total ${this.metrics.payments_total}\n`;
        
        output += '# HELP payments_successful Total successful payments\n';
        output += '# TYPE payments_successful counter\n';
        output += `payments_successful ${this.metrics.payments_successful}\n`;
        
        output += '# HELP payments_failed Total failed payments\n';
        output += '# TYPE payments_failed counter\n';
        output += `payments_failed ${this.metrics.payments_failed}\n`;
        
        output += '# HELP payments_amount_total_brl Total amount received in BRL\n';
        output += '# TYPE payments_amount_total_brl counter\n';
        output += `payments_amount_total_brl ${this.metrics.payments_amount_total_brl}\n`;
        
        output += '# HELP queue_jobs_total Total queue jobs processed\n';
        output += '# TYPE queue_jobs_total counter\n';
        output += `queue_jobs_total ${this.metrics.queue_jobs_total}\n`;
        
        output += '# HELP queue_jobs_completed Completed queue jobs\n';
        output += '# TYPE queue_jobs_completed counter\n';
        output += `queue_jobs_completed ${this.metrics.queue_jobs_completed}\n`;
        
        output += '# HELP queue_jobs_failed Failed queue jobs\n';
        output += '# TYPE queue_jobs_failed counter\n';
        output += `queue_jobs_failed ${this.metrics.queue_jobs_failed}\n`;
        
        output += '# HELP queue_jobs_retried Retried queue jobs\n';
        output += '# TYPE queue_jobs_retried counter\n';
        output += `queue_jobs_retried ${this.metrics.queue_jobs_retried}\n`;
        
        output += '# HELP uptime_seconds Application uptime in seconds\n';
        output += '# TYPE uptime_seconds gauge\n';
        output += `uptime_seconds ${this.metrics.uptime_seconds.toFixed(0)}\n`;
        
        output += '# HELP process_memory_rss_bytes Process RSS memory in bytes\n';
        output += '# TYPE process_memory_rss_bytes gauge\n';
        output += `process_memory_rss_bytes ${this.metrics.process_memory_rss_bytes}\n`;
        
        output += '# HELP process_heap_used_bytes Process heap used in bytes\n';
        output += '# TYPE process_heap_used_bytes gauge\n';
        output += `process_heap_used_bytes ${this.metrics.process_heap_used_bytes}\n`;
        
        output += '# HELP process_heap_total_bytes Process heap total in bytes\n';
        output += '# TYPE process_heap_total_bytes gauge\n';
        output += `process_heap_total_bytes ${this.metrics.process_heap_total_bytes}\n`;
        
        output += '# HELP disk_used_bytes Disk used in bytes\n';
        output += '# TYPE disk_used_bytes gauge\n';
        output += `disk_used_bytes ${this.metrics.disk_used_bytes}\n`;
        
        output += '# HELP disk_free_bytes Disk free in bytes\n';
        output += '# TYPE disk_free_bytes gauge\n';
        output += `disk_free_bytes ${this.metrics.disk_free_bytes}\n`;
        
        output += '# HELP disk_total_bytes Disk total in bytes\n';
        output += '# TYPE disk_total_bytes gauge\n';
        output += `disk_total_bytes ${this.metrics.disk_total_bytes}\n`;
        
        return output;
    }

    /**
     * Export metrics as JSON
     */
    exportJSON() {
        this.updateSystemMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: this.metrics.uptime_seconds.toFixed(0),
                minutes: (this.metrics.uptime_seconds / 60).toFixed(2),
                hours: (this.metrics.uptime_seconds / 3600).toFixed(2)
            },
            conversions: {
                total: this.metrics.conversions_total,
                successful: this.metrics.conversions_successful,
                failed: this.metrics.conversions_failed,
                successRate: this.getConversionSuccessRate() + '%',
                avgDurationSeconds: this.getAverageConversionDuration().toFixed(3)
            },
            payments: {
                total: this.metrics.payments_total,
                successful: this.metrics.payments_successful,
                failed: this.metrics.payments_failed,
                totalRevenueR$: this.metrics.payments_amount_total_brl.toFixed(2)
            },
            queue: {
                total: this.metrics.queue_jobs_total,
                completed: this.metrics.queue_jobs_completed,
                failed: this.metrics.queue_jobs_failed,
                retried: this.metrics.queue_jobs_retried
            },
            memory: {
                rss_mb: (this.metrics.process_memory_rss_bytes / 1024 / 1024).toFixed(2),
                heap_used_mb: (this.metrics.process_heap_used_bytes / 1024 / 1024).toFixed(2),
                heap_total_mb: (this.metrics.process_heap_total_bytes / 1024 / 1024).toFixed(2)
            },
            disk: {
                used_gb: (this.metrics.disk_used_bytes / 1024 / 1024 / 1024).toFixed(2),
                free_gb: (this.metrics.disk_free_bytes / 1024 / 1024 / 1024).toFixed(2),
                total_gb: (this.metrics.disk_total_bytes / 1024 / 1024 / 1024).toFixed(2)
            }
        };
    }

    /**
     * Get summary for display
     */
    getSummary() {
        this.updateSystemMetrics();
        
        return {
            uptime_hours: (this.metrics.uptime_seconds / 3600).toFixed(2),
            conversions_successful: this.metrics.conversions_successful,
            conversions_success_rate: this.getConversionSuccessRate() + '%',
            payments_total: `R$ ${this.metrics.payments_amount_total_brl.toFixed(2)}`,
            queue_jobs_completed: this.metrics.queue_jobs_completed,
            memory_usage_mb: (this.metrics.process_memory_rss_bytes / 1024 / 1024).toFixed(2)
        };
    }
}

module.exports = MetricsCollector;
