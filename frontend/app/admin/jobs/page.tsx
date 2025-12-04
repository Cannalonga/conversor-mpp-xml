'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  Eye,
  X
} from 'lucide-react';

interface Job {
  id: string;
  fileName: string;
  originalName: string;
  status: string;
  converterType: string;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface JobDetailsModalState {
  isOpen: boolean;
  job: Job | null;
}

interface ActionModalState {
  isOpen: boolean;
  job: Job | null;
  action: string;
  loading: boolean;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [converterFilter, setConverterFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState<JobDetailsModalState>({ isOpen: false, job: null });
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    job: null,
    action: '',
    loading: false
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (converterFilter) params.set('converterType', converterFilter);

      const res = await fetch(`/api/admin/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, converterFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function openActionModal(job: Job, action: string) {
    setActionModal({ isOpen: true, job, action, loading: false });
    setActiveDropdown(null);
  }

  async function executeAction() {
    if (!actionModal.job) return;

    setActionModal(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch(`/api/admin/jobs/${actionModal.job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionModal.action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setToast({ type: 'success', message: data.message || 'Action completed successfully' });
      loadJobs();
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setActionModal({ isOpen: false, job: null, action: '', loading: false });
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
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
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-gray-400 mt-1">{total} total jobs</p>
        </div>
        <button
          onClick={loadJobs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
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
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <select
              value={converterFilter}
              onChange={(e) => {
                setConverterFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="mpp-to-xml">MPP to XML</option>
              <option value="xml-to-mpp">XML to MPP</option>
              <option value="mpp-to-xlsx">MPP to Excel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="h-12 w-12 mb-4" />
            <p>No jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">File</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Progress</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="text-white font-medium truncate max-w-[200px]">
                            {job.originalName || job.fileName}
                          </p>
                          <p className="text-gray-400 text-xs font-mono">{job.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300">{job.converterType}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-300 text-sm truncate max-w-[150px]">
                        {job.user?.email || 'Unknown'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              job.status === 'COMPLETED' ? 'bg-green-500' :
                              job.status === 'FAILED' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === job.id ? null : job.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        {activeDropdown === job.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-700 rounded-lg shadow-lg py-1 z-10">
                            <button
                              onClick={() => {
                                setDetailsModal({ isOpen: true, job });
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                            {job.status === 'COMPLETED' && (
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                              >
                                <Download className="h-4 w-4" />
                                Download Result
                              </button>
                            )}
                            {job.status === 'FAILED' && (
                              <button
                                onClick={() => openActionModal(job, 'reprocess')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:bg-gray-600"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Reprocess
                              </button>
                            )}
                            {(job.status === 'PENDING' || job.status === 'PROCESSING') && (
                              <button
                                onClick={() => openActionModal(job, 'force-fail')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                              >
                                <XCircle className="h-4 w-4" />
                                Force Fail
                              </button>
                            )}
                          </div>
                        )}
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
      {detailsModal.isOpen && detailsModal.job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Job Details</h3>
              <button
                onClick={() => setDetailsModal({ isOpen: false, job: null })}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Job ID</label>
                <p className="text-white font-mono text-sm">{detailsModal.job.id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">File Name</label>
                <p className="text-white">{detailsModal.job.originalName || detailsModal.job.fileName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(detailsModal.job.status)}`}>
                    {detailsModal.job.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Converter</label>
                  <p className="text-white">{detailsModal.job.converterType}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Created</label>
                  <p className="text-white text-sm">{new Date(detailsModal.job.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Completed</label>
                  <p className="text-white text-sm">
                    {detailsModal.job.completedAt 
                      ? new Date(detailsModal.job.completedAt).toLocaleString()
                      : '-'
                    }
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">User</label>
                <p className="text-white">{detailsModal.job.user?.email || 'Unknown'}</p>
              </div>
              {detailsModal.job.error && (
                <div>
                  <label className="text-sm text-gray-400">Error</label>
                  <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg mt-1">
                    {detailsModal.job.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {actionModal.action === 'reprocess' ? 'Reprocess Job' : 'Force Fail Job'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to {actionModal.action === 'reprocess' ? 'reprocess' : 'force fail'} this job?
              <br />
              <span className="text-gray-500">File: {actionModal.job?.originalName || actionModal.job?.fileName}</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionModal({ isOpen: false, job: null, action: '', loading: false })}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionModal.loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  actionModal.action === 'force-fail'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionModal.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionModal.action === 'reprocess' ? 'Reprocess' : 'Force Fail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
