'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Eye,
  X
} from 'lucide-react';

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface DetailsModalState {
  isOpen: boolean;
  log: AuditLog | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailsModal, setDetailsModal] = useState<DetailsModalState>({ isOpen: false, log: null });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (adminFilter) params.set('adminEmail', adminFilter);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, adminFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function getActionColor(action: string) {
    if (action.includes('DELETE') || action.includes('BAN') || action.includes('REJECT')) {
      return 'bg-red-500/20 text-red-400';
    }
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ADD')) {
      return 'bg-green-500/20 text-green-400';
    }
    if (action.includes('UPDATE') || action.includes('MODIFY') || action.includes('ADJUST')) {
      return 'bg-yellow-500/20 text-yellow-400';
    }
    return 'bg-blue-500/20 text-blue-400';
  }

  function formatAction(action: string) {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 mt-1">{total} total entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by admin email..."
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="USER_UPDATE">User Update</option>
                <option value="USER_SUSPEND">User Suspend</option>
                <option value="USER_BAN">User Ban</option>
                <option value="CREDIT_ADJUST">Credit Adjust</option>
                <option value="JOB_REPROCESS">Job Reprocess</option>
                <option value="REFUND_APPROVE">Refund Approve</option>
                <option value="REFUND_REJECT">Refund Reject</option>
                <option value="CONFIG_UPDATE">Config Update</option>
              </select>
            </div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="User">User</option>
              <option value="Job">Job</option>
              <option value="Credit">Credit</option>
              <option value="RefundRequest">Refund</option>
              <option value="SystemConfig">Config</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ClipboardList className="h-12 w-12 mb-4" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Timestamp</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Admin</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Action</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Entity</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">IP Address</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-4 px-6">
                      <span className="text-gray-300 text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-white text-sm">{log.adminEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {log.entityType ? (
                        <div>
                          <span className="text-gray-300 text-sm">{log.entityType}</span>
                          {log.entityId && (
                            <p className="text-gray-500 text-xs font-mono">
                              {log.entityId.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm font-mono">
                        {log.ipAddress || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setDetailsModal({ isOpen: true, log })}
                          className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Audit Log Details</h3>
              <button
                onClick={() => setDetailsModal({ isOpen: false, log: null })}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Log ID</label>
                  <p className="text-white font-mono text-sm">{detailsModal.log.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Timestamp</label>
                  <p className="text-white text-sm">
                    {new Date(detailsModal.log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Admin</label>
                <p className="text-white">{detailsModal.log.adminEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Action</label>
                  <p className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(detailsModal.log.action)}`}>
                    {formatAction(detailsModal.log.action)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">IP Address</label>
                  <p className="text-white font-mono text-sm">{detailsModal.log.ipAddress || '-'}</p>
                </div>
              </div>

              {detailsModal.log.entityType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Entity Type</label>
                    <p className="text-white">{detailsModal.log.entityType}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Entity ID</label>
                    <p className="text-white font-mono text-sm">{detailsModal.log.entityId}</p>
                  </div>
                </div>
              )}

              {detailsModal.log.oldValue && (
                <div>
                  <label className="text-sm text-gray-400">Old Value</label>
                  <pre className="mt-1 p-3 bg-gray-700 rounded-lg text-white text-sm overflow-x-auto">
                    {JSON.stringify(JSON.parse(detailsModal.log.oldValue), null, 2)}
                  </pre>
                </div>
              )}

              {detailsModal.log.newValue && (
                <div>
                  <label className="text-sm text-gray-400">New Value</label>
                  <pre className="mt-1 p-3 bg-gray-700 rounded-lg text-white text-sm overflow-x-auto">
                    {JSON.stringify(JSON.parse(detailsModal.log.newValue), null, 2)}
                  </pre>
                </div>
              )}

              {detailsModal.log.metadata && Object.keys(detailsModal.log.metadata).length > 0 && (
                <div>
                  <label className="text-sm text-gray-400">Metadata</label>
                  <pre className="mt-1 p-3 bg-gray-700 rounded-lg text-white text-sm overflow-x-auto">
                    {JSON.stringify(detailsModal.log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
