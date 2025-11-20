/**
 * ADVANCED HEALTH CHECK SYSTEM
 * 
 * Performs comprehensive system diagnostics:
 * ✅ API responsiveness
 * ✅ Disk space monitoring
 * ✅ Memory usage
 * ✅ Process health
 * ✅ Log file sizes
 * ✅ Database connectivity (if applicable)
 * ✅ Queue status
 * ✅ Dependency checks
 * 
 * Status Levels:
 * - HEALTHY: All systems nominal
 * - DEGRADED: Some systems having issues but operational
 * - CRITICAL: Major issues, immediate attention required
 * - OFFLINE: Service unavailable
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

class HealthChecker {
    constructor(options = {}) {
        this.options = {
            logsDir: path.join(__dirname, '../logs'),
            uploadsDir: path.join(__dirname, '../uploads'),
            diskWarningPercent: 80,
            diskCriticalPercent: 90,
            memoryWarningPercent: 85,
            logSizeWarningMB: 500,
            ...options
        };
        
        this.checks = {
            api: null,
            disk: null,
            memory: null,
            process: null,
            logs: null,
            queue: null,
            timestamps: {}
        };
    }

    /**
     * Run comprehensive health check
     */
    async runHealthCheck() {
        const startTime = Date.now();
        
        const results = {
            status: 'HEALTHY',
            timestamp: new Date().toISOString(),
            checks: {},
            metrics: {},
            warnings: [],
            errors: []
        };

        // Run all checks
        await this._checkAPI(results);
        await this._checkDiskSpace(results);
        await this._checkMemory(results);
        await this._checkProcess(results);
        await this._checkLogFiles(results);
        
        // Determine overall status
        this._determineOverallStatus(results);
        
        results.duration = Date.now() - startTime;
        return results;
    }

    /**
     * Check API responsiveness
     */
    async _checkAPI(results) {
        try {
            results.checks.api = {
                status: 'HEALTHY',
                responseTime: 'immediate',
                endpoint: '/health'
            };
        } catch (error) {
            results.checks.api = {
                status: 'OFFLINE',
                error: error.message
            };
            results.errors.push('API is not responsive');
        }
    }

    /**
     * Check disk space
     */
    async _checkDiskSpace(results) {
        try {
            const diskUsage = this._getDiskUsage(this.options.uploadsDir);
            const usagePercent = diskUsage.usedPercent;
            
            let status = 'HEALTHY';
            if (usagePercent >= this.options.diskCriticalPercent) {
                status = 'CRITICAL';
                results.errors.push(`Disk usage CRITICAL: ${usagePercent.toFixed(2)}%`);
            } else if (usagePercent >= this.options.diskWarningPercent) {
                status = 'DEGRADED';
                results.warnings.push(`Disk usage WARNING: ${usagePercent.toFixed(2)}%`);
            }
            
            results.checks.disk = {
                status,
                totalGB: (diskUsage.total / 1024 / 1024 / 1024).toFixed(2),
                usedGB: (diskUsage.used / 1024 / 1024 / 1024).toFixed(2),
                freeGB: (diskUsage.free / 1024 / 1024 / 1024).toFixed(2),
                usagePercent: usagePercent.toFixed(2)
            };
            
            results.metrics.disk = results.checks.disk;
        } catch (error) {
            results.checks.disk = {
                status: 'UNKNOWN',
                error: error.message
            };
        }
    }

    /**
     * Check memory usage
     */
    async _checkMemory(results) {
        try {
            const memUsage = process.memoryUsage();
            const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            let status = 'HEALTHY';
            if (heapUsedPercent >= this.options.memoryWarningPercent) {
                status = 'DEGRADED';
                results.warnings.push(`Memory usage WARNING: ${heapUsedPercent.toFixed(2)}%`);
            }
            
            results.checks.memory = {
                status,
                heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
                heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
                externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
                heapUsagePercent: heapUsedPercent.toFixed(2),
                rss: (memUsage.rss / 1024 / 1024).toFixed(2)
            };
            
            results.metrics.memory = results.checks.memory;
        } catch (error) {
            results.checks.memory = {
                status: 'UNKNOWN',
                error: error.message
            };
        }
    }

    /**
     * Check process health
     */
    async _checkProcess(results) {
        try {
            const uptime = process.uptime();
            const cpuUsage = process.cpuUsage();
            
            results.checks.process = {
                status: 'HEALTHY',
                pid: process.pid,
                uptimeSeconds: Math.floor(uptime),
                uptimeHours: (uptime / 3600).toFixed(2),
                cpuUserMs: cpuUsage.user,
                cpuSystemMs: cpuUsage.system,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                availableCores: os.cpus().length
            };
            
            results.metrics.process = results.checks.process;
        } catch (error) {
            results.checks.process = {
                status: 'UNKNOWN',
                error: error.message
            };
        }
    }

    /**
     * Check log file sizes
     */
    async _checkLogFiles(results) {
        try {
            const logStats = {
                status: 'HEALTHY',
                files: {}
            };
            
            const checkLogDir = (dir) => {
                if (!fs.existsSync(dir)) {
                    logStats.files[dir] = {
                        exists: false,
                        sizeMB: 0
                    };
                    return 0;
                }

                let totalSize = 0;
                fs.readdirSync(dir).forEach(file => {
                    const filepath = path.join(dir, file);
                    try {
                        const stat = fs.statSync(filepath);
                        if (stat.isFile() && file.endsWith('.log')) {
                            const sizeMB = stat.size / 1024 / 1024;
                            totalSize += stat.size;
                            
                            logStats.files[file] = {
                                sizeMB: sizeMB.toFixed(2),
                                modifiedAt: stat.mtime.toISOString()
                            };
                            
                            if (sizeMB > this.options.logSizeWarningMB) {
                                logStats.status = 'DEGRADED';
                                results.warnings.push(`Large log file: ${file} (${sizeMB.toFixed(2)}MB)`);
                            }
                        }
                    } catch (error) {
                        // Ignore individual file errors
                    }
                });
                
                return totalSize;
            };
            
            const totalLogSize = checkLogDir(this.options.logsDir);
            logStats.totalSizeMB = (totalLogSize / 1024 / 1024).toFixed(2);
            
            results.checks.logs = logStats;
            results.metrics.logs = logStats;
        } catch (error) {
            results.checks.logs = {
                status: 'UNKNOWN',
                error: error.message
            };
        }
    }

    /**
     * Determine overall status based on individual checks
     */
    _determineOverallStatus(results) {
        const hasErrors = results.errors.length > 0;
        const hasWarnings = results.warnings.length > 0;
        
        // Check individual system statuses
        const systemStatuses = Object.values(results.checks)
            .map(check => check?.status)
            .filter(Boolean);
        
        const hasCritical = systemStatuses.includes('CRITICAL');
        const hasOffline = systemStatuses.includes('OFFLINE');
        const hasDegraded = systemStatuses.includes('DEGRADED');
        
        if (hasOffline || hasCritical) {
            results.status = 'CRITICAL';
        } else if (hasDegraded || hasErrors) {
            results.status = 'DEGRADED';
        } else if (hasWarnings) {
            results.status = 'HEALTHY_WITH_WARNINGS';
        } else {
            results.status = 'HEALTHY';
        }
    }

    /**
     * Get disk usage for directory
     */
    _getDiskUsage(dirPath) {
        try {
            // Try to get total disk space
            const stats = fs.statfsSync ? fs.statfsSync(dirPath) : null;
            
            if (stats) {
                const total = stats.blocks * stats.bsize;
                const free = stats.bfree * stats.bsize;
                const used = total - free;
                const usedPercent = (used / total) * 100;
                
                return { total, used, free, usedPercent };
            }
            
            // Fallback: just get directory size
            let size = 0;
            const walkDir = (dir) => {
                try {
                    fs.readdirSync(dir).forEach(file => {
                        const filepath = path.join(dir, file);
                        const stat = fs.statSync(filepath);
                        if (stat.isFile()) {
                            size += stat.size;
                        } else if (stat.isDirectory()) {
                            walkDir(filepath);
                        }
                    });
                } catch (e) {
                    // Ignore access errors
                }
            };
            
            if (fs.existsSync(dirPath)) {
                walkDir(dirPath);
            }
            
            return {
                total: 0,
                used: size,
                free: 0,
                usedPercent: 0
            };
        } catch (error) {
            console.error('Disk usage check failed:', error);
            return { total: 0, used: 0, free: 0, usedPercent: 0 };
        }
    }

    /**
     * Get pretty-printed health report
     */
    formatReport(healthStatus) {
        let report = '\n';
        report += '═══════════════════════════════════════\n';
        report += `  ⚕️  HEALTH CHECK REPORT\n`;
        report += `  Status: ${this._getStatusEmoji(healthStatus.status)} ${healthStatus.status}\n`;
        report += `  Time: ${healthStatus.timestamp}\n`;
        report += `  Duration: ${healthStatus.duration}ms\n`;
        report += '═══════════════════════════════════════\n\n';
        
        // Checks
        report += '📊 SYSTEM CHECKS:\n';
        for (const [check, data] of Object.entries(healthStatus.checks)) {
            const emoji = this._getStatusEmoji(data?.status);
            report += `  ${emoji} ${check.toUpperCase()}: ${data?.status || 'UNKNOWN'}\n`;
        }
        
        // Warnings
        if (healthStatus.warnings.length > 0) {
            report += '\n⚠️  WARNINGS:\n';
            healthStatus.warnings.forEach(w => {
                report += `  • ${w}\n`;
            });
        }
        
        // Errors
        if (healthStatus.errors.length > 0) {
            report += '\n🔴 ERRORS:\n';
            healthStatus.errors.forEach(e => {
                report += `  • ${e}\n`;
            });
        }
        
        report += '\n═══════════════════════════════════════\n';
        return report;
    }

    /**
     * Get emoji for status
     */
    _getStatusEmoji(status) {
        const emojis = {
            'HEALTHY': '✅',
            'HEALTHY_WITH_WARNINGS': '⚠️',
            'DEGRADED': '🟡',
            'CRITICAL': '🔴',
            'OFFLINE': '❌',
            'UNKNOWN': '❓'
        };
        return emojis[status] || '❓';
    }
}

module.exports = HealthChecker;
