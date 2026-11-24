import React, { useEffect, useMemo, useState } from 'react';
import { Lock, MessageCircle, Search, ShieldAlert, UserCheck } from 'lucide-react';
import type {
  AdminActivityEntry,
  AdminProfileInfo,
  WebsiteSettings,
} from '../../types/assistant';
import { storageUpdateWebsiteSettings } from '../../utils/adminStorage';

interface CommonSettingsProps {
  onRefreshDashboard: () => void;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}

// ==========================================
// 11. WHATSAPP ALERTS
// ==========================================
export function AdminWhatsAppAlertsSection({
  whatsappConfigured,
  settings,
  activityLogs,
}: {
  whatsappConfigured: boolean;
  settings: WebsiteSettings;
  activityLogs: AdminActivityEntry[];
}) {
  const loginAndOrderEvents = useMemo(
    () =>
      activityLogs.filter(
        (a) =>
          a.type === 'login_success' ||
          a.type === 'login_failed' ||
          a.type === 'setup' ||
          Boolean(a.whatsappAlertStatus)
      ),
    [activityLogs]
  );

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-medium text-[#252525] flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
              <span>Meta WhatsApp Cloud API Status</span>
            </h2>
            <span
              className={`px-2 py-0.5 border text-[11px] font-medium ${
                whatsappConfigured
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {whatsappConfigured ? 'Connected' : 'Secrets Required'}
            </span>
          </div>
          <p className="text-[#252525]/70 leading-relaxed">
            Every successful or failed admin login attempt dispatches an automated WhatsApp security notification without exposing passwords. Configure{' '}
            <code className="px-1 bg-[#F8F5EF] border border-[#252525]/10">WHATSAPP_CLOUD_API_TOKEN</code>,{' '}
            <code className="px-1 bg-[#F8F5EF] border border-[#252525]/10">WHATSAPP_PHONE_NUMBER_ID</code>, and{' '}
            <code className="px-1 bg-[#F8F5EF] border border-[#252525]/10">ADMIN_WHATSAPP_TO</code> in Settings &gt; Secrets.
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5 space-y-2">
          <h2 className="font-serif text-lg font-medium text-[#252525]">
            Storefront WhatsApp Concierge
          </h2>
          <p className="text-[#252525]/70">
            Customer checkout messages are directed to:{' '}
            <strong className="text-[#252525]">{settings.whatsappDisplayNumber}</strong>
          </p>
          <p className="text-[11px] text-[#252525]/60">
            Update this number anytime inside Website Settings.
          </p>
        </div>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
          WhatsApp Security Alert Delivery History ({loginAndOrderEvents.length})
        </h3>
        {loginAndOrderEvents.length === 0 ? (
          <p className="text-[#252525]/60 py-6 text-center">No WhatsApp login alerts logged yet.</p>
        ) : (
          <div className="divide-y divide-[#252525]/8">
            {loginAndOrderEvents.map((ev) => (
              <div key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[#252525]">{ev.summary}</p>
                  <p className="text-[11px] text-[#252525]/60">
                    Dispatch status: {ev.whatsappAlertStatus || 'Processed'}
                  </p>
                </div>
                <span className="text-[11px] text-[#252525]/55 tabular-nums shrink-0">
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 12. SECURITY & ACTIVITY LOGS
// ==========================================
export function AdminActivitySection({ activityLogs }: { activityLogs: AdminActivityEntry[] }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activityLogs.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (!q) return true;
      return `${a.summary} ${a.actorEmail} ${a.type}`.toLowerCase().includes(q);
    });
  }, [activityLogs, search, typeFilter]);

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#252525]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity summary or actor email..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 focus:outline-none focus:border-[#C6A15B]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15"
        >
          <option value="all">All Event Types ({activityLogs.length})</option>
          <option value="login_success">Login Success</option>
          <option value="login_failed">Login Failed</option>
          <option value="product">Product Edits</option>
          <option value="order">Order Updates</option>
          <option value="customer">Customer Changes</option>
          <option value="inventory">Inventory</option>
          <option value="settings">Settings &amp; Security</option>
        </select>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-4">
        <h2 className="font-serif text-xl font-medium text-[#252525] flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#8E6E30]" />
          <span>Security Audit &amp; Activity History</span>
        </h2>
        {filtered.length === 0 ? (
          <p className="text-[#252525]/60 py-8 text-center">No matching audit entries.</p>
        ) : (
          <div className="divide-y divide-[#252525]/8">
            {filtered.map((entry) => (
              <div key={entry.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 border text-[10px] font-semibold uppercase ${
                        entry.type === 'login_failed'
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : entry.type === 'login_success' || entry.type === 'setup'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-[#252525]/15 bg-[#E8DDCC] text-[#252525]'
                      }`}
                    >
                      {entry.type}
                    </span>
                    <span className="font-medium text-[#252525]">{entry.summary}</span>
                  </div>
                  <p className="text-[11px] text-[#252525]/60">
                    Actor: {entry.actorEmail}
                    {entry.whatsappAlertStatus ? ` · WhatsApp: ${entry.whatsappAlertStatus}` : ''}
                  </p>
                </div>
                <span className="text-[11px] text-[#252525]/55 tabular-nums shrink-0">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 13. WEBSITE SETTINGS
// ==========================================
export function AdminWebsiteSettingsSection({
  settings,
  onSettingsSaved,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonSettingsProps & {
  settings: WebsiteSettings;
  onSettingsSaved: (next: WebsiteSettings) => void;
}) {
  const [form, setForm] = useState<WebsiteSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = res.ok ? ((await res.json()) as { settings?: WebsiteSettings }) : {};
      const finalSettings = data.settings || form;
      storageUpdateWebsiteSettings(finalSettings, 'admin');
      onSettingsSaved(finalSettings);
      showToast('Website settings saved permanently.');
      onRefreshDashboard();
    } catch {
      storageUpdateWebsiteSettings(form, 'admin');
      onSettingsSaved(form);
      showToast('Website settings saved to Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-[#FFFDF8] border border-[#252525]/10 p-6 space-y-5 text-xs">
      <div>
        <h2 className="font-serif text-xl font-medium text-[#252525]">Storefront &amp; Delivery Settings</h2>
        <p className="text-[#252525]/60 mt-0.5">
          Configure public storefront concierge contact, delivery thresholds, and payment options.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">Brand Tagline</label>
          <input
            type="text"
            value={form.brandTagline}
            onChange={(e) => setForm({ ...form, brandTagline: e.target.value })}
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Concierge Email</label>
          <input
            type="email"
            value={form.conciergeEmail}
            onChange={(e) => setForm({ ...form, conciergeEmail: e.target.value })}
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">WhatsApp Display Number</label>
          <input
            type="text"
            value={form.whatsappDisplayNumber}
            onChange={(e) => setForm({ ...form, whatsappDisplayNumber: e.target.value })}
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">WhatsApp Routing Number (digits only)</label>
          <input
            type="text"
            value={form.whatsappBusinessNumber}
            onChange={(e) => setForm({ ...form, whatsappBusinessNumber: e.target.value })}
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Free Delivery Threshold (PKR)</label>
          <input
            type="number"
            min={0}
            value={form.freeDeliveryThresholdPkr}
            onChange={(e) =>
              setForm({ ...form, freeDeliveryThresholdPkr: Number(e.target.value) || 0 })
            }
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Standard Delivery Fee (PKR)</label>
          <input
            type="number"
            min={0}
            value={form.standardDeliveryFeePkr}
            onChange={(e) =>
              setForm({ ...form, standardDeliveryFeePkr: Number(e.target.value) || 0 })
            }
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Default Low-Stock Alert Threshold</label>
          <input
            type="number"
            min={0}
            value={form.defaultLowStockThreshold}
            onChange={(e) =>
              setForm({ ...form, defaultLowStockThreshold: Number(e.target.value) || 0 })
            }
            className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.codEnabled}
              onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#252525]"
            />
            <span className="font-medium text-[#252525]">Enable Cash on Delivery at Checkout</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block font-medium mb-1">Storefront Announcement Banner</label>
        <input
          type="text"
          value={form.announcementBar}
          onChange={(e) => setForm({ ...form, announcementBar: e.target.value })}
          className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Bank Transfer Instructions</label>
        <textarea
          rows={2}
          value={form.bankTransferDetails}
          onChange={(e) => setForm({ ...form, bankTransferDetails: e.target.value })}
          className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-[#252525]/10">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Website Settings'}
        </button>
      </div>
    </form>
  );
}

// ==========================================
// 14. ADMIN PROFILE & SETTINGS
// ==========================================
export function AdminProfileSection({
  profile,
  onUnauthorized,
  showToast,
}: {
  profile: AdminProfileInfo;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not update password.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Administrator password updated.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-[#FFFDF8] border border-[#252525]/12 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#252525] text-[#C6A15B] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium text-[#252525]">
              Authenticated Administrator
            </h2>
            <p className="text-[#252525]/70">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#252525]/10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Credential Source</p>
            <p className="font-medium text-[#252525] mt-0.5">
              {profile.source === 'env'
                ? 'Server Environment Secrets'
                : 'Encrypted Store Credential'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Session Signed In</p>
            <p className="font-medium text-[#252525] tabular-nums mt-0.5">
              {profile.sessionCreatedAt
                ? new Date(profile.sessionCreatedAt).toLocaleString()
                : 'Active'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Session Expires</p>
            <p className="font-medium text-[#252525] tabular-nums mt-0.5">
              {profile.sessionExpiresAt
                ? new Date(profile.sessionExpiresAt).toLocaleString()
                : 'Active'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/12 p-6 space-y-4">
        <h3 className="font-serif text-lg font-medium text-[#252525] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#8E6E30]" />
          <span>Password &amp; Credential Security</span>
        </h3>

        {!profile.canChangePassword ? (
          <div className="p-4 bg-[#F8F5EF] border border-[#252525]/12 text-[#252525]/80 leading-relaxed">
            Your administrator email and password are managed via server secrets (
            <strong>ADMIN_EMAIL</strong> / <strong>ADMIN_PASSWORD</strong>). To change your password securely, update <strong>ADMIN_PASSWORD</strong> in Settings &gt; Secrets.
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800">{errorMsg}</div>
            )}
            <div>
              <label className="block font-medium mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] cursor-pointer"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
