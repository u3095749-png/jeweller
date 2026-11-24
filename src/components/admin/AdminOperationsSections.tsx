import React, { useMemo, useState } from 'react';
import { CheckCheck, Database, Download, Plus, RotateCcw, Trash2, Truck, Upload } from 'lucide-react';
import type { CategoryCardItem, JewelleryProduct } from '../../data/products';
import type {
  AdminDashboardPayload,
  AdminNotificationItem,
  AdminProfileInfo,
  PaymentStatus,
  ShippingZoneRecord,
  StoreOrder,
  WebsiteSettings,
} from '../../types/assistant';
import type { AdminSection } from '../../context/StoreContext';
import { formatPKR } from '../../config/storeConfig';
import {
  buildAdminBackupJson,
  getChromeStorageUsageStats,
  resetAdminStorageToDefaults,
  storageDeleteShippingZone,
  storageMarkNotificationsRead,
  storageUpdateOrder,
  storageUpsertShippingZone,
  validateAndImportBackupJson,
} from '../../utils/adminStorage';

interface CommonOpProps {
  onRefreshDashboard: () => void;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}

// ==========================================
// 6. PAYMENTS MANAGEMENT
// ==========================================
export function AdminPaymentsSection({
  orders,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonOpProps & { orders: StoreOrder[] }) {
  const [filterStatus, setFilterStatus] = useState<'All' | PaymentStatus>('All');

  const summary = useMemo(() => {
    const paid = orders
      .filter((o) => o.paymentStatus === 'Paid')
      .reduce((s, o) => s + o.totalPkr, 0);
    const unpaid = orders
      .filter((o) => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Partial')
      .reduce((s, o) => s + o.totalPkr, 0);
    const refunded = orders
      .filter((o) => o.paymentStatus === 'Refunded')
      .reduce((s, o) => s + o.totalPkr, 0);
    return { paid, unpaid, refunded };
  }, [orders]);

  const visible = useMemo(
    () => (filterStatus === 'All' ? orders : orders.filter((o) => o.paymentStatus === filterStatus)),
    [orders, filterStatus]
  );

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ paymentStatus }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Persist cleanly to Chrome LocalStorage below
    }
    storageUpdateOrder(orderId, { paymentStatus }, 'admin');
    showToast(`Payment for ${orderId} updated to ${paymentStatus}.`);
    onRefreshDashboard();
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Collected Revenue</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(summary.paid)}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Pending / COD Receivables</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(summary.unpaid)}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Refunded Total</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(summary.refunded)}
          </p>
        </div>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3 flex flex-wrap gap-2">
        {(['All', 'Paid', 'Unpaid', 'Partial', 'Refunded'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterStatus(tab)}
            className={`px-3 py-2 font-medium cursor-pointer ${
              filterStatus === tab ? 'bg-[#252525] text-[#FFFDF8]' : 'bg-[#F8F5EF] text-[#252525]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 overflow-x-auto">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-[#252525]/60">No payment records in this view.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
                <th className="py-3 px-4 font-medium">Order ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Method</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Order Status</th>
                <th className="py-3 px-4 font-medium text-right">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252525]/8">
              {visible.map((ord) => (
                <tr key={ord.id}>
                  <td className="py-3 px-4 font-semibold tabular-nums">{ord.id}</td>
                  <td className="py-3 px-4">{ord.customerName}</td>
                  <td className="py-3 px-4">{ord.paymentMethod}</td>
                  <td className="py-3 px-4 font-semibold tabular-nums">{formatPKR(ord.totalPkr)}</td>
                  <td className="py-3 px-4">{ord.status}</td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={ord.paymentStatus}
                      onChange={(e) =>
                        void updatePaymentStatus(ord.id, e.target.value as PaymentStatus)
                      }
                      className="px-2.5 py-1.5 bg-[#F8F5EF] border border-[#252525]/20 cursor-pointer"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 7. SHIPPING & DELIVERY
// ==========================================
export function AdminShippingSection({
  shippingZones,
  orders,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonOpProps & { shippingZones: ShippingZoneRecord[]; orders: StoreOrder[] }) {
  const [form, setForm] = useState({
    name: '',
    regions: '',
    courierPartner: 'TCS Priority Insured',
    feePkr: '500',
    freeAbovePkr: '50000',
    estimatedDays: '2 – 4 Business Days',
  });
  const [saving, setSaving] = useState(false);

  const activeShipments = useMemo(
    () =>
      orders.filter((o) =>
        ['Confirmed', 'Processing', 'Shipped', 'Delivered'].includes(o.status)
      ),
    [orders]
  );

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const localZone: ShippingZoneRecord = {
      id: `zone-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      regions: form.regions.trim() || 'Pakistan Nationwide',
      courierPartner: form.courierPartner.trim() || 'TCS Priority Insured',
      feePkr: Math.max(0, Number(form.feePkr) || 0),
      freeAbovePkr: Math.max(0, Number(form.freeAbovePkr) || 0),
      estimatedDays: form.estimatedDays.trim() || '2 – 4 Business Days',
      insured: true,
      active: true,
    };
    try {
      const res = await fetch('/api/admin/shipping', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          name: localZone.name,
          regions: localZone.regions,
          courierPartner: localZone.courierPartner,
          feePkr: localZone.feePkr,
          freeAbovePkr: localZone.freeAbovePkr,
          estimatedDays: localZone.estimatedDays,
          insured: true,
          active: true,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = res.ok ? ((await res.json()) as { zone?: ShippingZoneRecord }) : {};
      storageUpsertShippingZone(data.zone || localZone, 'admin');
      setForm({ ...form, name: '', regions: '' });
      showToast('Shipping zone saved.');
      onRefreshDashboard();
    } catch {
      storageUpsertShippingZone(localZone, 'admin');
      setForm({ ...form, name: '', regions: '' });
      showToast('Shipping zone saved to Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setSaving(false);
    }
  };

  const toggleZone = async (z: ShippingZoneRecord) => {
    try {
      const res = await fetch(`/api/admin/shipping/${encodeURIComponent(z.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ active: !z.active }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Offline LocalStorage update below
    }
    storageUpsertShippingZone({ ...z, active: !z.active }, 'admin');
    showToast(`Zone "${z.name}" ${!z.active ? 'enabled' : 'paused'}.`);
    onRefreshDashboard();
  };

  const removeZone = async (z: ShippingZoneRecord) => {
    try {
      const res = await fetch(`/api/admin/shipping/${encodeURIComponent(z.id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Offline LocalStorage delete below
    }
    storageDeleteShippingZone(z.id, 'admin');
    showToast(`Deleted shipping zone "${z.name}".`);
    onRefreshDashboard();
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shippingZones.map((zone) => (
          <div key={zone.id} className="bg-[#FFFDF8] border border-[#252525]/12 p-4 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-medium text-[#252525]">{zone.name}</h3>
                <span className="text-[11px] font-medium text-[#8E6E30]">
                  {zone.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-[#252525]/70">{zone.regions}</p>
              <p className="text-[11px] text-[#252525]/60">
                Courier: {zone.courierPartner} · {zone.estimatedDays}
              </p>
              <p className="font-semibold text-[#252525] tabular-nums pt-1">
                Fee: {zone.feePkr === 0 ? 'Complimentary' : formatPKR(zone.feePkr)}
                {zone.freeAbovePkr > 0 && (
                  <span className="font-normal text-[#252525]/60">
                    {' '}
                    · Free above {formatPKR(zone.freeAbovePkr)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[#252525]/10">
              <button
                type="button"
                onClick={() => void toggleZone(zone)}
                className="flex-1 py-1.5 border border-[#252525]/20 bg-[#F8F5EF] cursor-pointer"
              >
                {zone.active ? 'Pause' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={() => void removeZone(zone)}
                className="p-1.5 border border-red-200 bg-red-50 text-red-800 cursor-pointer"
                aria-label={`Delete ${zone.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddZone} className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h3 className="font-serif text-lg font-medium text-[#252525] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#8E6E30]" />
          <span>Add Courier Zone</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Zone Name (e.g., Islamabad Same-Day)"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
          <input
            type="text"
            value={form.regions}
            onChange={(e) => setForm({ ...form, regions: e.target.value })}
            placeholder="Cities / Sectors covered"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
          <input
            type="text"
            value={form.courierPartner}
            onChange={(e) => setForm({ ...form, courierPartner: e.target.value })}
            placeholder="Courier Partner"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
          <input
            type="number"
            min={0}
            value={form.feePkr}
            onChange={(e) => setForm({ ...form, feePkr: e.target.value })}
            placeholder="Delivery Fee (PKR)"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
          <input
            type="number"
            min={0}
            value={form.freeAbovePkr}
            onChange={(e) => setForm({ ...form, freeAbovePkr: e.target.value })}
            placeholder="Free Threshold (PKR)"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
          />
          <input
            type="text"
            value={form.estimatedDays}
            onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
            placeholder="Transit Time"
            className="px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-[#252525] text-[#FFFDF8] cursor-pointer">
            {saving ? 'Saving...' : 'Add Shipping Zone'}
          </button>
        </div>
      </form>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30] flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>Active Dispatch &amp; Tracking Ledger ({activeShipments.length})</span>
        </h3>
        {activeShipments.length === 0 ? (
          <p className="text-[#252525]/60 py-6 text-center">
            Confirmed, processing, and shipped orders appear here with tracking details.
          </p>
        ) : (
          <div className="divide-y divide-[#252525]/10">
            {activeShipments.map((ord) => (
              <div key={ord.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[#252525]">
                    {ord.id} · {ord.customerName} ({ord.city || 'Pakistan'})
                  </p>
                  <p className="text-[11px] text-[#252525]/60">
                    Courier: {ord.courierName || 'Not assigned'} · Tracking: {ord.trackingNumber || 'Pending'}
                  </p>
                </div>
                <span className="font-medium text-[#8E6E30]">{ord.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 8. SALES & REVENUE ANALYTICS
// ==========================================
export function AdminAnalyticsSection({
  dashboard,
  products,
}: {
  dashboard: AdminDashboardPayload;
  products: JewelleryProduct[];
}) {
  const { stats, orders, topSellingProducts, revenueByDay } = dashboard;

  const avgOrderValue =
    orders.length > 0 ? Math.round(stats.totalRevenuePkr / Math.max(1, orders.length - stats.cancelledOrders)) : 0;

  const catalogRetailValuation = useMemo(
    () =>
      products.reduce((sum, p) => sum + p.pricePkr * (p.stockQuantity ?? (p.inStock ? 6 : 0)), 0),
    [products]
  );

  const revenueByPaymentMethod = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      if (o.status === 'Cancelled' || o.status === 'Refunded') continue;
      const cur = map.get(o.paymentMethod) || { count: 0, total: 0 };
      map.set(o.paymentMethod, { count: cur.count + 1, total: cur.total + o.totalPkr });
    }
    return Array.from(map.entries());
  }, [orders]);

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Net Sales Revenue</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(stats.totalRevenuePkr)}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Average Order Value</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(avgOrderValue)}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Inventory Valuation</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(catalogRetailValuation)}
          </p>
        </div>
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">Fulfillment Rate</p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {stats.totalOrders > 0
              ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
              : '0%'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
            7-Day Revenue Breakdown
          </h3>
          <div className="divide-y divide-[#252525]/8">
            {revenueByDay.map((d) => (
              <div key={d.date} className="py-2 flex items-center justify-between tabular-nums">
                <span>
                  {d.date} ({d.label}) · {d.ordersCount} order(s)
                </span>
                <span className="font-semibold text-[#252525]">{formatPKR(d.revenuePkr)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
            Revenue by Payment Method
          </h3>
          {revenueByPaymentMethod.length === 0 ? (
            <p className="text-[#252525]/60 py-6">No completed or active order revenue recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {revenueByPaymentMethod.map(([method, data]) => (
                <div key={method} className="py-2.5 flex items-center justify-between tabular-nums">
                  <span>
                    {method} · {data.count} order(s)
                  </span>
                  <span className="font-semibold text-[#252525]">{formatPKR(data.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
          Best-Selling Jewellery Ranking
        </h3>
        {topSellingProducts.length === 0 ? (
          <p className="text-[#252525]/60">No product unit sales recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#252525]/8">
            {topSellingProducts.map((p, i) => (
              <div key={p.productId} className="py-2.5 flex items-center justify-between tabular-nums">
                <span>
                  #{i + 1} · {p.name} ({p.sku})
                </span>
                <span>
                  {p.unitsSold} units · <strong>{formatPKR(p.revenuePkr)}</strong>
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
// 9. REPORTS & CSV EXPORT
// ==========================================
function triggerCsvDownload(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminReportsSection({
  dashboard,
  products,
  categories,
  applyCatalogSnapshot,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: {
  dashboard: AdminDashboardPayload;
  products: JewelleryProduct[];
  categories: CategoryCardItem[];
  applyCatalogSnapshot: (snapshot: {
    products?: JewelleryProduct[];
    categories?: CategoryCardItem[];
    settings?: WebsiteSettings;
  }) => void;
  onRefreshDashboard: () => void;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const storageStats = useMemo(
    () => getChromeStorageUsageStats(),
    // Re-evaluate whenever visible entities update
    [
      products.length,
      categories.length,
      dashboard.orders.length,
      dashboard.customers.length,
      dashboard.coupons.length,
      dashboard.reviews.length,
      dashboard.activityLogs.length,
    ]
  );

  const exportCatalog = () => {
    triggerCsvDownload(
      `zaveri-catalog-inventory-${today}.csv`,
      ['ID', 'SKU', 'Name', 'Category', 'Collection', 'Price_PKR', 'Stock_Units', 'In_Stock', 'Best_Seller'],
      products.map((p) => [
        p.id,
        p.sku,
        p.name,
        p.category,
        p.collection,
        p.pricePkr,
        p.stockQuantity ?? (p.inStock ? 6 : 0),
        p.inStock ? 'Yes' : 'No',
        p.isBestSeller ? 'Yes' : 'No',
      ])
    );
    showToast('Downloaded catalog & inventory CSV.');
  };

  const exportOrders = () => {
    triggerCsvDownload(
      `zaveri-orders-ledger-${today}.csv`,
      ['Order_ID', 'Date', 'Customer', 'Phone', 'City', 'Payment_Method', 'Payment_Status', 'Status', 'Total_PKR'],
      dashboard.orders.map((o) => [
        o.id,
        o.createdAt,
        o.customerName,
        o.customerPhone || '',
        o.city || '',
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.totalPkr,
      ])
    );
    showToast('Downloaded orders ledger CSV.');
  };

  const exportCustomers = () => {
    triggerCsvDownload(
      `zaveri-customers-${today}.csv`,
      ['Customer_ID', 'Name', 'Phone', 'Email', 'City', 'Address', 'Orders_Count', 'Lifetime_Spend_PKR'],
      dashboard.customers.map((c) => [
        c.id,
        c.name,
        c.phone || '',
        c.email || '',
        c.city || '',
        c.address || '',
        c.orderCount || 0,
        c.totalSpentPkr || 0,
      ])
    );
    showToast('Downloaded customer directory CSV.');
  };

  const exportSecurityLogs = () => {
    triggerCsvDownload(
      `zaveri-security-audit-${today}.csv`,
      ['Log_ID', 'Timestamp', 'Event_Type', 'Actor', 'Summary', 'WhatsApp_Status'],
      dashboard.activityLogs.map((a) => [
        a.id,
        a.timestamp,
        a.type,
        a.actorEmail,
        a.summary,
        a.whatsappAlertStatus || '',
      ])
    );
    showToast('Downloaded security & activity audit CSV.');
  };

  const exportFullJsonBackup = () => {
    const json = buildAdminBackupJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zaveri-atelier-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported complete Chrome LocalStorage JSON backup.');
  };

  const handleImportJsonBackup = async (file: File | undefined) => {
    if (!file) return;
    setRestoreError(null);
    setRestoreStatus(null);
    try {
      const text = await file.text();
      const result = validateAndImportBackupJson(
        text,
        restoreMode,
        dashboard.profile.email || 'admin'
      );
      if (!result.ok || !result.state || !result.summary) {
        setRestoreError(result.error || 'Could not import backup JSON.');
        return;
      }

      applyCatalogSnapshot({
        products: result.state.products,
        categories: result.state.categories,
        settings: result.state.websiteSettings,
      });

      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          mode: restoreMode,
          data: {
            products: result.state.products,
            categories: result.state.categories,
            orders: result.state.orders,
            customers: result.state.customers,
            coupons: result.state.coupons,
            reviews: result.state.reviews,
            shippingZones: result.state.shippingZones,
            notifications: result.state.notifications,
            websiteSettings: result.state.websiteSettings,
            activityLogs: result.state.activityLogs,
          },
        }),
      }).catch(() => null);

      if (res?.status === 401) {
        onUnauthorized();
        return;
      }

      onRefreshDashboard();
      const msg = `Restored ${result.summary.products} products, ${result.summary.categories} categories, ${result.summary.orders} orders, and ${result.summary.customers} customers (${restoreMode} mode).`;
      setRestoreStatus(msg);
      showToast('Backup restored to Chrome LocalStorage.');
    } catch {
      setRestoreError('Failed to read backup file.');
    }
  };

  const handleResetStorage = async () => {
    setRestoreError(null);
    const fresh = resetAdminStorageToDefaults(dashboard.profile.email || 'admin');
    applyCatalogSnapshot({
      products: fresh.products,
      categories: fresh.categories,
      settings: fresh.websiteSettings,
    });
    setConfirmReset(false);

    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          mode: 'replace',
          data: {
            products: fresh.products,
            categories: fresh.categories,
            orders: fresh.orders,
            customers: fresh.customers,
            coupons: fresh.coupons,
            reviews: fresh.reviews,
            shippingZones: fresh.shippingZones,
            notifications: fresh.notifications,
            websiteSettings: fresh.websiteSettings,
            activityLogs: fresh.activityLogs,
          },
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // LocalStorage reset succeeded independently
    }
    onRefreshDashboard();
    setRestoreStatus('Chrome LocalStorage reset cleanly to factory catalog defaults.');
    showToast('Workspace reset to factory defaults.');
  };

  const reportCards = [
    {
      title: 'Products & Stock Valuation Report',
      description: `${products.length} jewellery pieces across ${categories.length} categories with PKR prices and stock counts.`,
      action: exportCatalog,
    },
    {
      title: 'Complete Orders & Payment Ledger',
      description: `${dashboard.orders.length} order record(s) including customer contact, payment method, and status.`,
      action: exportOrders,
    },
    {
      title: 'Customer Directory & Spend Export',
      description: `${dashboard.customers.length} client profile(s) with total orders and PKR lifetime spend.`,
      action: exportCustomers,
    },
    {
      title: 'Security & Admin Activity Audit',
      description: `${dashboard.activityLogs.length} security and administrative event(s) including WhatsApp delivery status.`,
      action: exportSecurityLogs,
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      {/* Chrome LocalStorage Backup, Restore & Storage Monitor */}
      <div className="bg-[#FFFDF8] border border-[#C6A15B]/50 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#252525]/10 pb-4">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-medium text-[#252525] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#8E6E30]" />
              <span>Chrome LocalStorage Persistence &amp; JSON Backup</span>
            </h2>
            <p className="text-[#252525]/65 leading-relaxed">
              All products, images, categories, orders, customers, coupons, reviews, and storefront settings persist directly in Chrome storage across page refreshes and browser restarts. Passwords and secrets are never included in backups.
            </p>
          </div>
          <div className="shrink-0 text-right tabular-nums">
            <p className="font-semibold text-[#252525]">{storageStats.kbUsed} KB Stored</p>
            <p className="text-[11px] text-[#252525]/55">
              Updated {new Date(storageStats.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 tabular-nums">
          {[
            { label: 'Products', value: storageStats.counts.products },
            { label: 'Categories', value: storageStats.counts.categories },
            { label: 'Orders', value: storageStats.counts.orders },
            { label: 'Customers', value: storageStats.counts.customers },
            { label: 'Coupons', value: storageStats.counts.coupons },
            { label: 'Reviews', value: storageStats.counts.reviews },
            { label: 'Logs', value: storageStats.counts.activityLogs },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 bg-[#F8F5EF] border border-[#252525]/10">
              <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">{stat.label}</p>
              <p className="font-serif text-lg font-semibold text-[#252525] mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        {restoreError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800">{restoreError}</div>
        )}
        {restoreStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">
            {restoreStatus}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportFullJsonBackup}
              className="px-4 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>Export Full Backup (JSON)</span>
            </button>

            <div className="inline-flex items-center border border-[#252525]/20 bg-[#F8F5EF]">
              <select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                aria-label="Backup import mode"
                className="px-2.5 py-2.5 bg-transparent text-xs text-[#252525] border-r border-[#252525]/15 focus:outline-none"
              >
                <option value="merge">Merge with Existing</option>
                <option value="replace">Replace All Data</option>
              </select>
              <label className="px-3.5 py-2.5 font-medium text-[#252525] hover:bg-[#E8DDCC] inline-flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#8E6E30]" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void handleImportJsonBackup(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3.5 py-2.5 border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Storage to Defaults</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1.5 bg-red-50 border border-red-300">
                <span className="text-[11px] font-medium text-red-900 px-1.5">
                  Clear orders &amp; custom edits?
                </span>
                <button
                  type="button"
                  onClick={() => void handleResetStorage()}
                  className="px-2.5 py-1.5 bg-red-700 text-white font-medium cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1.5 border border-[#252525]/20 bg-[#FFFDF8] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Standard CSV Ledger Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((card) => (
          <div key={card.title} className="bg-[#FFFDF8] border border-[#252525]/12 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="font-serif text-xl font-medium text-[#252525]">{card.title}</h3>
              <p className="text-[#252525]/65 leading-relaxed">{card.description}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={card.action}
                className="px-4 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 10. NOTIFICATIONS CENTER
// ==========================================
export function AdminNotificationsSection({
  notifications,
  profile,
  onSwitchSection,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonOpProps & {
  notifications: AdminNotificationItem[];
  profile: AdminProfileInfo;
  onSwitchSection: (section: AdminSection) => void;
}) {
  const [onlyUnread, setOnlyUnread] = useState(false);

  const visible = useMemo(
    () => (onlyUnread ? notifications.filter((n) => !n.read) : notifications),
    [notifications, onlyUnread]
  );

  const markRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/notifications/read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Offline LocalStorage mark-read below
    }
    storageMarkNotificationsRead(id, profile);
    if (id === 'all') showToast('All notifications marked read.');
    onRefreshDashboard();
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 cursor-pointer ${!onlyUnread ? 'bg-[#252525] text-[#FFFDF8]' : 'bg-[#F8F5EF]'}`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 cursor-pointer ${onlyUnread ? 'bg-[#252525] text-[#FFFDF8]' : 'bg-[#F8F5EF]'}`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>
        <button
          type="button"
          onClick={() => void markRead('all')}
          className="px-3.5 py-2 border border-[#252525]/20 bg-[#F8F5EF] hover:border-[#C6A15B] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5 text-[#8E6E30]" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 divide-y divide-[#252525]/10">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-[#252525]/60">No notifications to display.</div>
        ) : (
          visible.map((note) => (
            <div
              key={note.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !note.read ? 'bg-[#F8F5EF]/65' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 border text-[10px] uppercase font-semibold ${
                      note.severity === 'critical'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : note.severity === 'warning'
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-[#252525]/20 bg-[#E8DDCC] text-[#252525]'
                    }`}
                  >
                    {note.category}
                  </span>
                  <span className="font-semibold text-[#252525]">{note.title}</span>
                  {!note.read && <span className="text-[10px] text-[#8E6E30] font-semibold">NEW</span>}
                </div>
                <p className="text-[#252525]/70">{note.message}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {note.targetSection && (
                  <button
                    type="button"
                    onClick={() => onSwitchSection(note.targetSection as AdminSection)}
                    className="px-3 py-1.5 bg-[#252525] text-[#FFFDF8] cursor-pointer"
                  >
                    Open Section
                  </button>
                )}
                {!note.read && (
                  <button
                    type="button"
                    onClick={() => void markRead(note.id)}
                    className="px-3 py-1.5 border border-[#252525]/20 bg-[#FFFDF8] cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
