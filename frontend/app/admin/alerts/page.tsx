'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Phone,
  XCircle,
  Eye
} from 'lucide-react';

interface Alert {
  id: string;
  alertname: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service: string;
  instance: string | null;
  status: string;
  channels: string;
  summary: string | null;
  description: string | null;
  dashboardUrl: string | null;
  firingCount: number;
  resolvedCount: number;
  responseTime: number;
  groupKey: string | null;
  fingerprint: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface AlertStats {
  total: number;
  last24h: number;
  bySeverity: Record<string, number>;
  byService: Record<string, number>;
  byStatus: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const severityConfig = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: AlertCircle,
    label: 'CRITICAL'
  },
  high: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: AlertTriangle,
    label: 'HIGH'
  },
  medium: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: Info,
    label: 'MEDIUM'
  },
  low: {
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: Bell,
    label: 'LOW'
  }
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  slack: <MessageSquare className="w-4 h-4" />,
  discord: <MessageSquare className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  sms: <Phone className="w-4 h-4" />,
  pagerduty: <AlertCircle className="w-4 h-4" />
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    severity: '',
    service: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.service) params.set('service', filters.service);
      if (filters.status) params.set('status', filters.status);
      
      const response = await fetch(`${API_URL}/api/admin/alerts/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      setAlerts(data.alerts || []);
      setPagination(prev => ({
        ...prev,
        ...data.pagination
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_URL, pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/admin/alerts/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const parseChannels = (channelsJson: string): string[] => {
    try {
      return JSON.parse(channelsJson);
    } catch {
      return [];
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ severity: '', service: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Alert Dashboard</h1>
                <p className="text-sm text-gray-500">Monitor and manage system alerts</p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchAlerts();
                fetchStats();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Bell className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 24h</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.last24h}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Critical</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.bySeverity.critical || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">High</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.bySeverity.high || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.severity || filters.service || filters.status) && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
            
            {(filters.severity || filters.service || filters.status) && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear filters
              </button>
            )}
          </div>
          
          {showFilters && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <input
                  type="text"
                  value={filters.service}
                  onChange={(e) => handleFilterChange('service', e.target.value)}
                  placeholder="Filter by service..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Alerts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading alerts...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium">No alerts found</p>
                      <p className="text-sm">Alerts will appear here when triggered by Alertmanager</p>
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => {
                    const config = severityConfig[alert.severity] || severityConfig.medium;
                    const SeverityIcon = config.icon;
                    const channels = parseChannels(alert.channels);
                    
                    return (
                      <tr key={alert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <SeverityIcon className={`w-5 h-5 ${config.textColor}`} />
                            <div>
                              <p className="font-medium text-gray-900">{alert.alertname}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {alert.summary || 'No summary'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {alert.service}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                            alert.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {channels.map((channel) => (
                              <span
                                key={channel}
                                className="inline-flex items-center p-1.5 bg-gray-100 rounded-md"
                                title={channel}
                              >
                                {channelIcons[channel] || <Bell className="w-4 h-4" />}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(alert.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {alert.dashboardUrl && (
                              <a
                                href={alert.dashboardUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Open dashboard"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} alerts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Alert Details</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className={`p-4 rounded-lg ${severityConfig[selectedAlert.severity]?.bgColor || 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = severityConfig[selectedAlert.severity] || severityConfig.medium;
                    const SeverityIcon = config.icon;
                    return <SeverityIcon className={`w-6 h-6 ${config.textColor}`} />;
                  })()}
                  <div>
                    <h3 className="font-bold text-lg">{selectedAlert.alertname}</h3>
                    <p className="text-sm text-gray-600">{selectedAlert.summary}</p>
                  </div>
                </div>
              </div>
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Severity</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.severity.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Service</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.service}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Instance</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.instance || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Firing Count</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.firingCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Response Time</p>
                  <p className="mt-1 text-gray-900">{selectedAlert.responseTime}ms</p>
                </div>
              </div>
              
              {/* Description */}
              {selectedAlert.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAlert.description}</p>
                </div>
              )}
              
              {/* Channels */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Notification Channels</p>
                <div className="flex flex-wrap gap-2">
                  {parseChannels(selectedAlert.channels).map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm"
                    >
                      {channelIcons[channel] || <Bell className="w-4 h-4" />}
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Timestamps */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(selectedAlert.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="font-medium">{formatDate(selectedAlert.startsAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ended</p>
                    <p className="font-medium">{formatDate(selectedAlert.endsAt)}</p>
                  </div>
                </div>
              </div>
              
              {/* Dashboard Link */}
              {selectedAlert.dashboardUrl && (
                <div className="border-t border-gray-200 pt-4">
                  <a
                    href={selectedAlert.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Dashboard
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
