'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  DollarSign,
  ToggleLeft,
  Bell
} from 'lucide-react';

interface SystemConfig {
  MAINTENANCE_MODE: boolean;
  AUTO_REFUND_ENABLED: boolean;
  STRIPE_ENABLED: boolean;
  MAX_FILE_SIZE_MB: number;
  MAX_QUEUE_SIZE: number;
  ALERT_EMAIL_ENABLED: boolean;
  ALERT_SLACK_ENABLED: boolean;
}

interface ConverterCost {
  type: string;
  credits: number;
  description: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>({
    MAINTENANCE_MODE: false,
    AUTO_REFUND_ENABLED: true,
    STRIPE_ENABLED: true,
    MAX_FILE_SIZE_MB: 100,
    MAX_QUEUE_SIZE: 1000,
    ALERT_EMAIL_ENABLED: true,
    ALERT_SLACK_ENABLED: false
  });
  const [converterCosts, setConverterCosts] = useState<ConverterCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadSettings() {
    setLoading(true);
    try {
      const [configRes, costsRes] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/config/converters')
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(prev => ({ ...prev, ...data.config }));
      }

      if (costsRes.ok) {
        const data = await costsRes.json();
        setConverterCosts(data.costs || []);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      setToast({ type: 'success', message: 'Configuration saved successfully' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function saveConverterCost(cost: ConverterCost) {
    try {
      const res = await fetch('/api/admin/config/converters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cost),
      });

      if (!res.ok) {
        throw new Error('Failed to update converter cost');
      }

      setToast({ type: 'success', message: 'Converter cost updated' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save' });
    }
  }

  async function testAlerts() {
    setTestingAlert(true);
    try {
      const res = await fetch('/api/admin/alerts/test', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to send test alert');
      }

      setToast({ type: 'success', message: 'Test alert sent successfully' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to send test alert' });
    } finally {
      setTestingAlert(false);
    }
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
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">System configuration</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </button>
      </div>

      {/* System Flags */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <ToggleLeft className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">System Flags</h2>
        </div>

        <div className="space-y-4">
          <ToggleItem
            label="Maintenance Mode"
            description="When enabled, users cannot access the system"
            checked={config.MAINTENANCE_MODE}
            onChange={(checked) => setConfig(prev => ({ ...prev, MAINTENANCE_MODE: checked }))}
            danger
          />
          <ToggleItem
            label="Auto Refund"
            description="Automatically refund credits for failed jobs"
            checked={config.AUTO_REFUND_ENABLED}
            onChange={(checked) => setConfig(prev => ({ ...prev, AUTO_REFUND_ENABLED: checked }))}
          />
          <ToggleItem
            label="Stripe Payments"
            description="Enable Stripe payment processing"
            checked={config.STRIPE_ENABLED}
            onChange={(checked) => setConfig(prev => ({ ...prev, STRIPE_ENABLED: checked }))}
          />
          <ToggleItem
            label="Email Alerts"
            description="Send alerts via email"
            checked={config.ALERT_EMAIL_ENABLED}
            onChange={(checked) => setConfig(prev => ({ ...prev, ALERT_EMAIL_ENABLED: checked }))}
          />
          <ToggleItem
            label="Slack Alerts"
            description="Send alerts to Slack"
            checked={config.ALERT_SLACK_ENABLED}
            onChange={(checked) => setConfig(prev => ({ ...prev, ALERT_SLACK_ENABLED: checked }))}
          />

          <div className="pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={config.MAX_FILE_SIZE_MB}
                  onChange={(e) => setConfig(prev => ({ ...prev, MAX_FILE_SIZE_MB: parseInt(e.target.value) || 100 }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Queue Size
                </label>
                <input
                  type="number"
                  value={config.MAX_QUEUE_SIZE}
                  onChange={(e) => setConfig(prev => ({ ...prev, MAX_QUEUE_SIZE: parseInt(e.target.value) || 1000 }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Converter Costs */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-5 w-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Converter Costs</h2>
        </div>

        <div className="space-y-4">
          {converterCosts.length === 0 ? (
            <p className="text-gray-400">No converters configured</p>
          ) : (
            converterCosts.map((cost, index) => (
              <div key={cost.type} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{cost.type}</p>
                  <p className="text-gray-400 text-sm">{cost.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={cost.credits}
                    onChange={(e) => {
                      const newCosts = [...converterCosts];
                      newCosts[index] = { ...cost, credits: parseInt(e.target.value) || 1 };
                      setConverterCosts(newCosts);
                    }}
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">credits</span>
                  <button
                    onClick={() => saveConverterCost(converterCosts[index])}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Testing */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Alert Testing</h2>
        </div>

        <p className="text-gray-400 mb-4">
          Send a test alert to verify your notification channels are working correctly.
        </p>

        <button
          onClick={testAlerts}
          disabled={testingAlert}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {testingAlert ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Send Test Alert
        </button>
      </div>
    </div>
  );
}

function ToggleItem({
  label,
  description,
  checked,
  onChange,
  danger = false
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className={`font-medium ${danger && checked ? 'text-red-400' : 'text-white'}`}>{label}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked
            ? danger ? 'bg-red-600' : 'bg-blue-600'
            : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
