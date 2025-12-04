'use client';

import { useState, useEffect } from 'react';

interface MetricValue {
  name: string;
  value: number | string;
  help: string;
  type: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  checks?: {
    redis?: { status: string; latencyMs?: number };
    mppService?: { status: string; latencyMs?: number };
    database?: { status: string; latencyMs?: number };
    queue?: { status: string; counts?: Record<string, number> };
  };
}

interface SystemStats {
  conversion: {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
  };
  stripe: {
    webhooksReceived: number;
    webhooksFailed: number;
    autoRefunds: number;
  };
  system: {
    redisLatency: number;
    mppServiceUp: boolean;
    activeUsers: number;
  };
}

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<MetricValue[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch metrics from API
  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const text = await response.text();
      const parsed = parsePrometheusMetrics(text);
      setMetrics(parsed);
      setStats(calculateStats(parsed));
      setError(null);
    } catch (_err) {
      setError('Could not load metrics. Is the API running?');
    }
  };

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health/detailed`);
      if (!response.ok) throw new Error('Failed to fetch health');
      
      const data = await response.json();
      setHealth(data);
    } catch (_err) {
      // Health check failure is not critical for display
    }
  };

  // Parse Prometheus text format into metric objects
  const parsePrometheusMetrics = (text: string): MetricValue[] => {
    const metrics: MetricValue[] = [];
    const lines = text.split('\n');
    
    let currentHelp = '';
    let currentType = '';
    
    for (const line of lines) {
      if (line.startsWith('# HELP ')) {
        const parts = line.substring(7).split(' ');
        currentHelp = parts.slice(1).join(' ');
      } else if (line.startsWith('# TYPE ')) {
        const parts = line.substring(7).split(' ');
        currentType = parts[1];
      } else if (line && !line.startsWith('#')) {
        const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*(?:\{[^}]*\})?)[\s]+(.+)$/);
        if (match) {
          metrics.push({
            name: match[1],
            value: parseFloat(match[2]) || match[2],
            help: currentHelp,
            type: currentType,
          });
        }
      }
    }
    
    return metrics;
  };

  // Calculate summary stats from metrics
  const calculateStats = (metrics: MetricValue[]): SystemStats => {
    const getValue = (prefix: string, labels?: Record<string, string>): number => {
      for (const m of metrics) {
        if (m.name.startsWith(prefix)) {
          if (labels) {
            const labelMatch = Object.entries(labels).every(([k, v]) => 
              m.name.includes(`${k}="${v}"`)
            );
            if (labelMatch && typeof m.value === 'number') return m.value;
          } else if (typeof m.value === 'number') {
            return m.value;
          }
        }
      }
      return 0;
    };

    const completed = getValue('conversion_jobs_total', { status: 'completed' });
    const failed = getValue('conversion_jobs_total', { status: 'failed' });
    const total = completed + failed;

    return {
      conversion: {
        total,
        completed,
        failed,
        successRate: total > 0 ? (completed / total) * 100 : 100,
      },
      queue: {
        waiting: getValue('queue_waiting_jobs'),
        active: getValue('queue_active_jobs'),
        delayed: getValue('queue_delayed_jobs'),
        failed: getValue('queue_failed_jobs'),
      },
      stripe: {
        webhooksReceived: getValue('stripe_webhook_received_total'),
        webhooksFailed: getValue('stripe_webhook_failed_total'),
        autoRefunds: getValue('auto_refund_triggered_total'),
      },
      system: {
        redisLatency: getValue('redis_latency_ms'),
        mppServiceUp: getValue('mpp_microservice_status') === 1,
        activeUsers: getValue('active_users_24h'),
      },
    };
  };

  // Initial load and refresh
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchHealth()]);
      setLastUpdate(new Date());
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 10 seconds
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics();
        fetchHealth();
        setLastUpdate(new Date());
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Status indicator component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      up: 'bg-green-100 text-green-800',
      unhealthy: 'bg-red-100 text-red-800',
      down: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unknown: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.unknown}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Stat card component
  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    color = 'blue' 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'border-blue-500 bg-blue-50',
      green: 'border-green-500 bg-green-50',
      red: 'border-red-500 bg-red-50',
      yellow: 'border-yellow-500 bg-yellow-50',
      purple: 'border-purple-500 bg-purple-50',
    };

    return (
      <div className={`p-4 rounded-lg border-l-4 ${colorClasses[color]}`}>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Metrics</h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring dashboard
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => {
                fetchMetrics();
                fetchHealth();
                setLastUpdate(new Date());
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">System Health</h2>
            {health && <StatusBadge status={health.status} />}
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">API</span>
                <StatusBadge status={health ? 'healthy' : 'unknown'} />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Redis</span>
                <StatusBadge status={health?.checks?.redis?.status || 'unknown'} />
              </div>
              {health?.checks?.redis?.latencyMs && (
                <p className="text-xs text-gray-500 mt-1">
                  {health.checks.redis.latencyMs}ms latency
                </p>
              )}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">MPP Service</span>
                <StatusBadge status={stats?.system.mppServiceUp ? 'healthy' : 'down'} />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Database</span>
                <StatusBadge status={health?.checks?.database?.status || 'unknown'} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <>
            {/* Conversion Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Conversion Metrics</h2>
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  title="Total Conversions"
                  value={stats.conversion.total}
                  color="blue"
                />
                <StatCard
                  title="Successful"
                  value={stats.conversion.completed}
                  color="green"
                />
                <StatCard
                  title="Failed"
                  value={stats.conversion.failed}
                  color="red"
                />
                <StatCard
                  title="Success Rate"
                  value={`${stats.conversion.successRate.toFixed(1)}%`}
                  color={stats.conversion.successRate >= 95 ? 'green' : 'yellow'}
                />
              </div>
            </div>

            {/* Queue Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  title="Waiting"
                  value={stats.queue.waiting}
                  color={stats.queue.waiting > 50 ? 'yellow' : 'blue'}
                />
                <StatCard
                  title="Active"
                  value={stats.queue.active}
                  color="purple"
                />
                <StatCard
                  title="Delayed"
                  value={stats.queue.delayed}
                  color="yellow"
                />
                <StatCard
                  title="Failed"
                  value={stats.queue.failed}
                  color={stats.queue.failed > 10 ? 'red' : 'blue'}
                />
              </div>
            </div>

            {/* Stripe Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Payments & Webhooks</h2>
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  title="Webhooks Received"
                  value={stats.stripe.webhooksReceived}
                  color="blue"
                />
                <StatCard
                  title="Webhooks Failed"
                  value={stats.stripe.webhooksFailed}
                  color={stats.stripe.webhooksFailed > 5 ? 'red' : 'green'}
                />
                <StatCard
                  title="Auto Refunds"
                  value={stats.stripe.autoRefunds}
                  color={stats.stripe.autoRefunds > 10 ? 'yellow' : 'blue'}
                />
                <StatCard
                  title="Active Users (24h)"
                  value={stats.system.activeUsers}
                  color="purple"
                />
              </div>
            </div>

            {/* System Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">System</h2>
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  title="Redis Latency"
                  value={`${stats.system.redisLatency}ms`}
                  color={stats.system.redisLatency > 50 ? 'yellow' : 'green'}
                />
              </div>
            </div>
          </>
        )}

        {/* Raw Metrics Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Metrics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.slice(0, 50).map((metric, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {typeof metric.value === 'number' 
                        ? metric.value.toLocaleString() 
                        : metric.value}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {metric.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {metrics.length > 50 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing first 50 of {metrics.length} metrics
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {lastUpdate && (
            <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
          )}
          <p className="mt-2">
            For full dashboards, use{' '}
            <a href="http://localhost:3000" className="text-blue-600 hover:underline">
              Grafana
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
