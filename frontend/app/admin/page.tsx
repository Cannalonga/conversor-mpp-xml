'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    todayCount: number;
    successRate: number;
  };
  credits: {
    totalSold: number;
    totalUsed: number;
    revenue: number;
    revenueToday: number;
  };
  refunds: {
    pending: number;
    approvedThisMonth: number;
    totalRefunded: number;
  };
  alerts: {
    critical: number;
    warning: number;
    resolved: number;
  };
}

interface RecentJob {
  id: string;
  fileName: string;
  status: string;
  converterType: string;
  createdAt: string;
  user: {
    email: string;
  } | null;
}

interface RecentAlert {
  id: string;
  severity: string;
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsRes, jobsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/jobs?limit=5'),
        fetch('/api/admin/alerts?limit=5'),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setRecentJobs(data.jobs || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setRecentAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your system</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{stats?.users.newThisWeek || 0} this week
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{stats?.users.total || 0}</h3>
            <p className="text-gray-400 text-sm">Total Users</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.users.active || 0} active · {stats?.users.newToday || 0} today
          </div>
        </div>

        {/* Jobs Card */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              {stats?.jobs.successRate.toFixed(1)}% success
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{stats?.jobs.total || 0}</h3>
            <p className="text-gray-400 text-sm">Total Jobs</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.jobs.todayCount || 0} today · {stats?.jobs.pending || 0} pending
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ${stats?.credits.revenueToday.toFixed(2)} today
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">
              ${stats?.credits.revenue.toFixed(2) || '0.00'}
            </h3>
            <p className="text-gray-400 text-sm">Total Revenue</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.credits.totalSold || 0} credits sold
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            {(stats?.alerts.critical || 0) > 0 ? (
              <span className="text-xs text-red-400 flex items-center gap-1">
                {stats?.alerts.critical} critical
              </span>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1">
                All clear
              </span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{stats?.alerts.warning || 0}</h3>
            <p className="text-gray-400 text-sm">Active Alerts</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.refunds.pending || 0} refunds pending
          </div>
        </div>
      </div>

      {/* Jobs Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversions Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Conversions (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getConversionsData(stats)}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Status Pie Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Job Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getJobDistributionData(stats)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getJobDistributionData(stats).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute">
              <p className="text-2xl font-bold text-white text-center">{stats?.jobs.total || 0}</p>
              <p className="text-xs text-gray-400 text-center">Total</p>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400 text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-400 text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-400 text-sm">Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue (Last 30 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getRevenueData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Job Status and Credits Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Status Breakdown */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Job Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Completed</span>
              </div>
              <span className="text-white font-medium">{stats?.jobs.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-300">Pending</span>
              </div>
              <span className="text-white font-medium">{stats?.jobs.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-300">Processing</span>
              </div>
              <span className="text-white font-medium">{stats?.jobs.processing || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-300">Failed</span>
              </div>
              <span className="text-white font-medium">{stats?.jobs.failed || 0}</span>
            </div>
          </div>
        </div>

        {/* Credits Overview */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Credits Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">Total Sold</span>
              </div>
              <span className="text-white font-medium">{stats?.credits.totalSold || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">Total Used</span>
              </div>
              <span className="text-white font-medium">{stats?.credits.totalUsed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">Pending Refunds</span>
              </div>
              <span className="text-white font-medium">{stats?.refunds.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-red-400" />
                <span className="text-gray-300">Total Refunded</span>
              </div>
              <span className="text-white font-medium">${stats?.refunds.totalRefunded.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
            <a href="/admin/jobs" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </a>
          </div>
          {recentJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent jobs</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <JobStatusIcon status={job.status} />
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[150px]">
                        {job.fileName}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {job.user?.email || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
            <a href="/admin/alerts" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </a>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertSeverityIcon severity={alert.severity} resolved={alert.resolved} />
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[200px]">
                        {alert.message}
                      </p>
                      <p className="text-gray-400 text-xs">{alert.source}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(alert.severity, alert.resolved)}`}>
                    {alert.resolved ? 'Resolved' : alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    case 'FAILED':
      return <AlertTriangle className="h-5 w-5 text-red-400" />;
    case 'PROCESSING':
      return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-400" />;
  }
}

function AlertSeverityIcon({ severity, resolved }: { severity: string; resolved: boolean }) {
  if (resolved) {
    return <CheckCircle className="h-5 w-5 text-green-400" />;
  }
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-5 w-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-blue-400" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-500/20 text-green-400';
    case 'FAILED':
      return 'bg-red-500/20 text-red-400';
    case 'PROCESSING':
      return 'bg-blue-500/20 text-blue-400';
    default:
      return 'bg-yellow-500/20 text-yellow-400';
  }
}

function getSeverityColor(severity: string, resolved: boolean) {
  if (resolved) return 'bg-green-500/20 text-green-400';
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400';
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-400';
    default:
      return 'bg-blue-500/20 text-blue-400';
  }
}

// Chart data helper functions
function getConversionsData(stats: DashboardStats | null) {
  // Generate last 7 days data
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Simulate data based on stats (in real app, this would come from API)
    const baseCompleted = Math.floor((stats?.jobs.completed || 0) / 7);
    const baseFailed = Math.floor((stats?.jobs.failed || 0) / 7);
    
    data.push({
      date: dayStr,
      completed: baseCompleted + Math.floor(Math.random() * 5),
      failed: baseFailed + Math.floor(Math.random() * 2)
    });
  }
  
  return data;
}

function getJobDistributionData(stats: DashboardStats | null) {
  return [
    { name: 'Completed', value: stats?.jobs.completed || 0, color: '#22c55e' },
    { name: 'Pending', value: (stats?.jobs.pending || 0) + (stats?.jobs.processing || 0), color: '#eab308' },
    { name: 'Failed', value: stats?.jobs.failed || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);
}

function getRevenueData() {
  // Generate last 30 days revenue data (mock)
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Show every 5th day label
    const showLabel = i % 5 === 0;
    const dayStr = showLabel ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    
    data.push({
      date: dayStr,
      revenue: Math.random() * 100 + 20
    });
  }
  
  return data;
}

