'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  Database,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';

interface MonitoringData {
  prometheus: {
    available: boolean;
    metrics: {
      httpRequestsTotal?: number;
      httpRequestDuration?: number;
      activeConnections?: number;
      processMemoryBytes?: number;
      processCpuSeconds?: number;
    };
  };
  redis: {
    available: boolean;
    connected: boolean;
    memory: {
      used: string;
      peak: string;
    };
    stats: {
      connectedClients: number;
      totalCommands: number;
      opsPerSec: number;
    };
  };
  queue: {
    available: boolean;
    queues: {
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }[];
  };
  mppConverter: {
    available: boolean;
    healthy: boolean;
    responseTime: number;
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
  };
  timestamp: string;
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  async function loadData() {
    if (!loading) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/monitoring');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatUptime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring</h1>
          <p className="text-gray-400 mt-1">
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Never'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Prometheus */}
        <ServiceCard
          name="Prometheus"
          icon={Activity}
          available={data?.prometheus.available || false}
          details={data?.prometheus.available ? `${data.prometheus.metrics.httpRequestsTotal || 0} requests` : 'Not connected'}
        />
        
        {/* Redis */}
        <ServiceCard
          name="Redis"
          icon={Database}
          available={!!(data?.redis.available && data?.redis.connected)}
          details={data?.redis.available ? `${data.redis.stats.opsPerSec} ops/sec` : 'Not connected'}
        />
        
        {/* Queue (BullMQ) */}
        <ServiceCard
          name="Job Queue"
          icon={Server}
          available={data?.queue.available || false}
          details={data?.queue.available 
            ? `${data.queue.queues.reduce((acc, q) => acc + q.active, 0)} active jobs`
            : 'Not connected'
          }
        />
        
        {/* MPP Converter */}
        <ServiceCard
          name="MPP Converter"
          icon={Zap}
          available={!!(data?.mppConverter.available && data?.mppConverter.healthy)}
          details={data?.mppConverter.available 
            ? `${data.mppConverter.responseTime}ms response`
            : 'Not connected'
          }
        />
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Memory Usage</h2>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Used</span>
              <span className="text-white">
                {formatBytes(data?.system.memory.used || 0)} / {formatBytes(data?.system.memory.total || 0)}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (data?.system.memory.usagePercent || 0) > 80 ? 'bg-red-500' :
                  (data?.system.memory.usagePercent || 0) > 60 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${data?.system.memory.usagePercent || 0}%` }}
              />
            </div>
            <p className="text-right text-sm text-gray-400 mt-1">
              {data?.system.memory.usagePercent.toFixed(1)}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Free</span>
              <p className="text-white font-medium">{formatBytes(data?.system.memory.free || 0)}</p>
            </div>
            <div>
              <span className="text-gray-400">Uptime</span>
              <p className="text-white font-medium">{formatUptime(data?.system.uptime || 0)}</p>
            </div>
          </div>
        </div>

        {/* Redis Stats */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Redis</h2>
          </div>
          
          {data?.redis.available ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Memory Used</span>
                  <p className="text-white font-medium">{data.redis.memory.used}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Peak Memory</span>
                  <p className="text-white font-medium">{data.redis.memory.peak}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Connected Clients</span>
                  <p className="text-white font-medium">{data.redis.stats.connectedClients}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Ops/Second</span>
                  <p className="text-white font-medium">{data.redis.stats.opsPerSec}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Total Commands</span>
                <p className="text-white font-medium">{data.redis.stats.totalCommands.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p>Redis not connected</p>
            </div>
          )}
        </div>
      </div>

      {/* Queue Stats */}
      {data?.queue.available && data.queue.queues.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Job Queues</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Queue</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Waiting</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Active</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Completed</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Failed</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Delayed</th>
                </tr>
              </thead>
              <tbody>
                {data.queue.queues.map((queue) => (
                  <tr key={queue.name} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-white font-medium">{queue.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-sm ${
                        queue.waiting > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400'
                      }`}>
                        {queue.waiting}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-sm ${
                        queue.active > 0 ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'
                      }`}>
                        {queue.active}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-green-400">{queue.completed.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-sm ${
                        queue.failed > 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-400'
                      }`}>
                        {queue.failed}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-400">{queue.delayed}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prometheus Metrics */}
      {data?.prometheus.available && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Application Metrics</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="HTTP Requests"
              value={data.prometheus.metrics.httpRequestsTotal?.toLocaleString() || '0'}
              icon={Zap}
            />
            <MetricCard
              label="Avg Response Time"
              value={`${data.prometheus.metrics.httpRequestDuration?.toFixed(2) || '0'} ms`}
              icon={Clock}
            />
            <MetricCard
              label="Active Connections"
              value={data.prometheus.metrics.activeConnections?.toString() || '0'}
              icon={Server}
            />
            <MetricCard
              label="Process Memory"
              value={formatBytes(data.prometheus.metrics.processMemoryBytes || 0)}
              icon={Cpu}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  name,
  icon: Icon,
  available,
  details
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  details: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${available ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-white font-medium">{name}</span>
        </div>
        {available ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
      </div>
      <p className="text-gray-400 text-sm">{details}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}
