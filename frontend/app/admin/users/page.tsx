'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  CreditCard,
  Ban,
  Pause,
  Play,
  Key,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  credits: number;
  createdAt: string;
  _count: {
    jobs: number;
  };
}

interface ActionModalState {
  isOpen: boolean;
  user: User | null;
  action: string;
  loading: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    user: null,
    action: '',
    loading: false
  });
  const [actionInput, setActionInput] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function openActionModal(user: User, action: string) {
    setActionModal({ isOpen: true, user, action, loading: false });
    setActionInput('');
    setActiveDropdown(null);
  }

  async function executeAction() {
    if (!actionModal.user) return;

    setActionModal(prev => ({ ...prev, loading: true }));

    try {
      const body: Record<string, unknown> = { action: actionModal.action };

      if (actionModal.action === 'adjust-credits') {
        body.credits = parseInt(actionInput);
        body.reason = 'Admin adjustment';
      }

      const res = await fetch(`/api/admin/users/${actionModal.user.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setToast({ type: 'success', message: data.message || 'Action completed successfully' });
      loadUsers();
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setActionModal({ isOpen: false, user: null, action: '', loading: false });
    }
  }

  function getActionTitle(action: string) {
    switch (action) {
      case 'adjust-credits': return 'Adjust Credits';
      case 'suspend': return 'Suspend User';
      case 'unsuspend': return 'Unsuspend User';
      case 'ban': return 'Ban User';
      case 'unban': return 'Unban User';
      case 'reset-password': return 'Reset Password';
      default: return 'Confirm Action';
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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
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
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Users className="h-12 w-12 mb-4" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Credits</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Jobs</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Joined</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name || 'No name'}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                        user.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        user.status === 'SUSPENDED' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium">{user.credits}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300">{user._count.jobs}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        {activeDropdown === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-700 rounded-lg shadow-lg py-1 z-10">
                            <button
                              onClick={() => openActionModal(user, 'adjust-credits')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                            >
                              <CreditCard className="h-4 w-4" />
                              Adjust Credits
                            </button>
                            <button
                              onClick={() => openActionModal(user, 'reset-password')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                            >
                              <Key className="h-4 w-4" />
                              Reset Password
                            </button>
                            {user.status === 'ACTIVE' ? (
                              <button
                                onClick={() => openActionModal(user, 'suspend')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-gray-600"
                              >
                                <Pause className="h-4 w-4" />
                                Suspend User
                              </button>
                            ) : user.status === 'SUSPENDED' ? (
                              <button
                                onClick={() => openActionModal(user, 'unsuspend')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-gray-600"
                              >
                                <Play className="h-4 w-4" />
                                Unsuspend User
                              </button>
                            ) : null}
                            {user.status !== 'BANNED' ? (
                              <button
                                onClick={() => openActionModal(user, 'ban')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                              >
                                <Ban className="h-4 w-4" />
                                Ban User
                              </button>
                            ) : (
                              <button
                                onClick={() => openActionModal(user, 'unban')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-gray-600"
                              >
                                <Play className="h-4 w-4" />
                                Unban User
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

      {/* Action Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {getActionTitle(actionModal.action)}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {actionModal.action === 'adjust-credits' 
                ? `Adjust credits for ${actionModal.user?.email}`
                : `Are you sure you want to ${actionModal.action.replace('-', ' ')} ${actionModal.user?.email}?`
              }
            </p>

            {actionModal.action === 'adjust-credits' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Credits (positive to add, negative to remove)
                </label>
                <input
                  type="number"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10 or -5"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionModal({ isOpen: false, user: null, action: '', loading: false })}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionModal.loading || (actionModal.action === 'adjust-credits' && !actionInput)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  actionModal.action.includes('ban') || actionModal.action === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionModal.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
