'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  MessageSquare,
  DollarSign
} from 'lucide-react';

interface RefundRequest {
  id: string;
  userId: string;
  jobId: string | null;
  amount: number;
  reason: string;
  status: string;
  adminNotes: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  job: {
    id: string;
    fileName: string;
    status: string;
  } | null;
}

interface ActionModalState {
  isOpen: boolean;
  request: RefundRequest | null;
  action: 'approve' | 'reject' | null;
  loading: boolean;
}

export default function RefundsPage() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRefunded: 0
  });
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    request: null,
    action: null,
    loading: false
  });
  const [adminNotes, setAdminNotes] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/refund-requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to load refund requests:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function openActionModal(request: RefundRequest, action: 'approve' | 'reject') {
    setActionModal({ isOpen: true, request, action, loading: false });
    setAdminNotes('');
  }

  async function executeAction() {
    if (!actionModal.request || !actionModal.action) return;

    setActionModal(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch(`/api/admin/refund-requests/${actionModal.request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          adminNotes
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setToast({
        type: 'success',
        message: actionModal.action === 'approve'
          ? 'Refund approved and credits returned'
          : 'Refund request rejected'
      });
      loadRequests();
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setActionModal({ isOpen: false, request: null, action: null, loading: false });
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Refunds</h1>
          <p className="text-gray-400 mt-1">{total} total requests</p>
        </div>
        <button
          onClick={loadRequests}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <span className="text-gray-400 text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">Approved</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.approved}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-gray-400 text-sm">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.rejected}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Refunded</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalRefunded} credits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RefreshCw className="h-12 w-12 mb-4" />
            <p>No refund requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Request</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Amount</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Reason</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <span className="text-gray-400 font-mono text-sm">
                          {request.id.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white text-sm">{request.user?.email || 'Unknown'}</p>
                      {request.job && (
                        <p className="text-gray-500 text-xs">Job: {request.job.fileName}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium">{request.amount} credits</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-400 text-sm truncate max-w-[200px]" title={request.reason}>
                        {request.reason}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {request.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openActionModal(request, 'approve')}
                            className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'reject')}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          {request.adminNotes && (
                            <button
                              className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                              title={request.adminNotes}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
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

      {/* Action Modal */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {actionModal.action === 'approve' ? 'Approve Refund' : 'Reject Refund'}
            </h3>
            
            <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-300 text-sm">
                <strong>User:</strong> {actionModal.request.user?.email}
              </p>
              <p className="text-gray-300 text-sm mt-1">
                <strong>Amount:</strong> {actionModal.request.amount} credits
              </p>
              <p className="text-gray-300 text-sm mt-1">
                <strong>Reason:</strong> {actionModal.request.reason}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any notes about this decision..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionModal({ isOpen: false, request: null, action: null, loading: false })}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionModal.loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionModal.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
