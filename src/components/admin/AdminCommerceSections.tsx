import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import {
  getDiscountPercentage,
  type CategoryCardItem,
  type JewelleryProduct,
} from '../../data/products';
import type {
  CouponRecord,
  CustomerRecord,
  ProductReviewRecord,
  ReviewStatus,
  StoreOrder,
} from '../../types/assistant';
import { formatPKR } from '../../config/storeConfig';
import { JewelryImage } from '../JewelryImage';
import {
  storageDeleteCoupon,
  storageDeleteCustomer,
  storageDeleteReview,
  storageSyncProductsCatalog,
  storageUpdateReviewStatus,
  storageUpsertCoupon,
  storageUpsertCustomer,
  storageUpsertReview,
} from '../../utils/adminStorage';

interface CommonCommerceProps {
  onRefreshDashboard: () => void;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}

// ==========================================
// 1. CUSTOMER MANAGEMENT
// ==========================================
export function AdminCustomersSection({
  customers,
  orders,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonCommerceProps & { customers: CustomerRecord[]; orders: StoreOrder[] }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<CustomerRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.phone || ''} ${c.email || ''} ${c.city || ''} ${c.address || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [customers, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (c: CustomerRecord) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      city: c.city || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !form.name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    const existing = editingId ? customers.find((c) => c.id === editingId) : undefined;
    const nowIso = new Date().toISOString();
    const fallbackRecord: CustomerRecord = {
      id: editingId || `CUST-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim().toLowerCase() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };
    try {
      const url = editingId
        ? `/api/admin/customers/${encodeURIComponent(editingId)}`
        : '/api/admin/customers';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Unable to save customer.');
      }
      const data = res.ok ? ((await res.json()) as { customer?: CustomerRecord }) : {};
      storageUpsertCustomer(data.customer || fallbackRecord, 'admin');
      setModalOpen(false);
      showToast(editingId ? 'Customer profile updated.' : 'Customer profile saved.');
      onRefreshDashboard();
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        storageUpsertCustomer(fallbackRecord, 'admin');
        setModalOpen(false);
        showToast('Customer saved in Chrome LocalStorage.');
        onRefreshDashboard();
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CustomerRecord) => {
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      storageDeleteCustomer(c.id, 'admin');
      if (detailCustomer?.id === c.id) setDetailCustomer(null);
      showToast(`Deleted customer "${c.name}".`);
      onRefreshDashboard();
    } catch {
      storageDeleteCustomer(c.id, 'admin');
      if (detailCustomer?.id === c.id) setDetailCustomer(null);
      showToast(`Deleted customer "${c.name}".`);
      onRefreshDashboard();
    }
  };

  const detailOrders = useMemo(() => {
    if (!detailCustomer) return [];
    return orders.filter(
      (o) =>
        o.customerId === detailCustomer.id ||
        (detailCustomer.phone && o.customerPhone === detailCustomer.phone) ||
        (detailCustomer.email && o.customerEmail?.toLowerCase() === detailCustomer.email.toLowerCase())
    );
  }, [detailCustomer, orders]);

  return (
    <div className="space-y-5">
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#252525]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, email, or city..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs focus:outline-none focus:border-[#C6A15B]"
          />
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2 min-h-[40px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
          <span>Add Customer</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">{errorMsg}</div>
      )}

      <div className="bg-[#FFFDF8] border border-[#252525]/10 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#252525]/60">
            No customer records yet. Customers are created automatically when orders are placed or can be added manually.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Contact</th>
                <th className="py-3 px-4 font-medium">City &amp; Address</th>
                <th className="py-3 px-4 font-medium">Orders</th>
                <th className="py-3 px-4 font-medium">Lifetime Spend</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252525]/8">
              {filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-[#F8F5EF]/60">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => setDetailCustomer(cust)}
                      className="text-left font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
                    >
                      {cust.name}
                    </button>
                    <p className="text-[11px] text-[#252525]/55 tabular-nums">{cust.id}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    <p>{cust.phone || '—'}</p>
                    <p className="text-[11px] text-[#252525]/60">{cust.email || '—'}</p>
                  </td>
                  <td className="py-3 px-4 max-w-[220px]">
                    <p>{cust.city || '—'}</p>
                    <p className="text-[11px] text-[#252525]/60 truncate">{cust.address || '—'}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums font-medium">{cust.orderCount || 0}</td>
                  <td className="py-3 px-4 tabular-nums font-semibold">
                    {formatPKR(cust.totalSpentPkr || 0)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(cust)}
                        className="px-2.5 py-1.5 border border-[#252525]/18 bg-[#F8F5EF] hover:border-[#C6A15B] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#8E6E30]" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(cust)}
                        className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-red-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailCustomer && (
        <div className="bg-[#FFFDF8] border border-[#C6A15B] p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg font-medium text-[#252525]">
                Client History: {detailCustomer.name}
              </h3>
              <p className="text-[#252525]/65">
                {detailCustomer.notes || 'No private styling notes saved.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailCustomer(null)}
              className="px-3 py-1.5 border border-[#252525]/20 cursor-pointer"
            >
              Close
            </button>
          </div>
          {detailOrders.length === 0 ? (
            <p className="text-[#252525]/60">No orders matched to this client profile yet.</p>
          ) : (
            <div className="divide-y divide-[#252525]/10">
              {detailOrders.map((ord) => (
                <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                  <span>
                    {ord.id} · {ord.status} · {ord.items.map((i) => i.name).join(', ')}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPKR(ord.totalPkr)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between">
              <h2 className="font-serif text-xl font-medium">
                {editingId ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Atelier Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div className="pt-3 border-t border-[#252525]/10 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-[#252525]/20 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#252525] text-[#FFFDF8] font-medium cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. INVENTORY MANAGEMENT
// ==========================================
export function AdminInventorySection({
  products,
  applyCatalogSnapshot,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonCommerceProps & {
  products: JewelleryProduct[];
  applyCatalogSnapshot: (snapshot: { products?: JewelleryProduct[] }) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { qty: string; threshold: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return products.map((p) => {
      const qty = p.stockQuantity ?? (p.inStock ? 6 : 0);
      const threshold = p.lowStockThreshold ?? 2;
      const state: 'in-stock' | 'low-stock' | 'out-of-stock' =
        !p.inStock || qty === 0 ? 'out-of-stock' : qty <= threshold ? 'low-stock' : 'in-stock';
      return { product: p, qty, threshold, state };
    });
  }, [products]);

  const counts = useMemo(
    () => ({
      all: enriched.length,
      inStock: enriched.filter((e) => e.state === 'in-stock').length,
      lowStock: enriched.filter((e) => e.state === 'low-stock').length,
      outOfStock: enriched.filter((e) => e.state === 'out-of-stock').length,
    }),
    [enriched]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter !== 'all' && e.state !== filter) return false;
      if (!q) return true;
      return `${e.product.name} ${e.product.sku} ${e.product.category}`.toLowerCase().includes(q);
    });
  }, [enriched, filter, search]);

  const saveStock = async (productId: string, stockQuantity: number, lowStockThreshold: number) => {
    setSavingId(productId);
    const cleanQty = Math.max(0, Math.floor(stockQuantity));
    const cleanThreshold = Math.max(0, Math.floor(lowStockThreshold));
    const updatedProductsLocal = products.map((p) =>
      p.id === productId
        ? {
            ...p,
            stockQuantity: cleanQty,
            lowStockThreshold: cleanThreshold,
            inStock: cleanQty > 0,
          }
        : p
    );
    try {
      const res = await fetch(`/api/admin/inventory/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          stockQuantity: cleanQty,
          lowStockThreshold: cleanThreshold,
          inStock: cleanQty > 0,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      storageSyncProductsCatalog(updatedProductsLocal);
      applyCatalogSnapshot({ products: updatedProductsLocal });
      showToast('Inventory count saved & synced.');
      onRefreshDashboard();
    } catch {
      storageSyncProductsCatalog(updatedProductsLocal);
      applyCatalogSnapshot({ products: updatedProductsLocal });
      showToast('Inventory saved to Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3 flex flex-wrap gap-2">
        {[
          { key: 'all', label: `All (${counts.all})` },
          { key: 'in-stock', label: `Healthy Stock (${counts.inStock})` },
          { key: 'low-stock', label: `Low Stock (${counts.lowStock})` },
          { key: 'out-of-stock', label: `Out of Stock (${counts.outOfStock})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-3 py-2 text-xs font-medium tabular-nums cursor-pointer ${
              filter === tab.key ? 'bg-[#252525] text-[#FFFDF8]' : 'bg-[#F8F5EF] text-[#252525]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#252525]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter inventory by name, SKU, category..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs focus:outline-none focus:border-[#C6A15B]"
          />
        </div>
      </div>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
              <th className="py-3 px-4 font-medium">Piece</th>
              <th className="py-3 px-4 font-medium">Stock Status</th>
              <th className="py-3 px-4 font-medium">Units On Hand</th>
              <th className="py-3 px-4 font-medium">Alert Threshold</th>
              <th className="py-3 px-4 font-medium text-right">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252525]/8">
            {visible.map(({ product, qty, threshold, state }) => {
              const draft = drafts[product.id] || { qty: String(qty), threshold: String(threshold) };
              return (
                <tr key={product.id}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-11 h-9 shrink-0 bg-[#E8DDCC] overflow-hidden">
                        <JewelryImage src={product.images[0]} alt={product.name} className="w-full h-full" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#252525] truncate max-w-[220px]">{product.name}</p>
                        <p className="text-[11px] text-[#252525]/55 tabular-nums">
                          {product.sku} · {product.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 border text-[11px] font-medium ${
                        state === 'out-of-stock'
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : state === 'low-stock'
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {state === 'out-of-stock'
                        ? 'Out of Stock'
                        : state === 'low-stock'
                        ? 'Low Stock'
                        : 'In Stock'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min={0}
                      value={draft.qty}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [product.id]: { ...draft, qty: e.target.value } })
                      }
                      aria-label={`Stock quantity for ${product.name}`}
                      className="w-20 px-2.5 py-1.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min={0}
                      value={draft.threshold}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [product.id]: { ...draft, threshold: e.target.value } })
                      }
                      aria-label={`Low stock threshold for ${product.name}`}
                      className="w-20 px-2.5 py-1.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
                    />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={savingId === product.id}
                      onClick={() =>
                        void saveStock(
                          product.id,
                          Number(draft.qty) || 0,
                          Number(draft.threshold) || 0
                        )
                      }
                      className="px-3 py-1.5 bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
                    >
                      {savingId === product.id ? 'Saving...' : 'Save Stock'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 3. DISCOUNTS & OFFERS
// ==========================================
export function AdminDiscountsSection({
  products,
  categories,
  applyCatalogSnapshot,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonCommerceProps & {
  products: JewelleryProduct[];
  categories: CategoryCardItem[];
  applyCatalogSnapshot: (snapshot: { products?: JewelleryProduct[] }) => void;
}) {
  const [scope, setScope] = useState<'category' | 'product'>('category');
  const [target, setTarget] = useState<string>(categories[0]?.category || '');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [applying, setApplying] = useState(false);

  const discountedProducts = useMemo(
    () => products.filter((p) => (getDiscountPercentage(p) || 0) > 0),
    [products]
  );

  const computeUpdatedDiscounts = (
    targetScope: 'category' | 'product',
    targetKey: string,
    pct: number
  ): JewelleryProduct[] =>
    products.map((prod) => {
      const matches =
        targetScope === 'product'
          ? prod.id === targetKey
          : prod.category.toLowerCase() === targetKey.trim().toLowerCase() ||
            prod.categories.some((c) => c.toLowerCase() === targetKey.trim().toLowerCase());
      if (!matches) return prod;
      if (pct === 0) return { ...prod, compareAtPricePkr: undefined };
      const baseline =
        prod.compareAtPricePkr && prod.compareAtPricePkr > prod.pricePkr
          ? prod.compareAtPricePkr
          : prod.pricePkr;
      return {
        ...prod,
        pricePkr: Math.max(100, Math.round(baseline * (1 - pct / 100))),
        compareAtPricePkr: baseline,
      };
    });

  const applyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || applying) return;
    setApplying(true);
    const pct = Math.min(90, Math.max(0, Number(discountPercent) || 0));
    const localUpdated = computeUpdatedDiscounts(scope, target, pct);
    try {
      const res = await fetch('/api/admin/discounts/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ scope, target, discountPercent: pct }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      storageSyncProductsCatalog(localUpdated);
      applyCatalogSnapshot({ products: localUpdated });
      showToast('Promotional offer applied & saved.');
      onRefreshDashboard();
    } catch {
      storageSyncProductsCatalog(localUpdated);
      applyCatalogSnapshot({ products: localUpdated });
      showToast('Promotional offer saved to Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setApplying(false);
    }
  };

  const clearSingleDiscount = async (productId: string) => {
    const localUpdated = computeUpdatedDiscounts('product', productId, 0);
    try {
      const res = await fetch('/api/admin/discounts/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ scope: 'product', target: productId, discountPercent: 0 }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      storageSyncProductsCatalog(localUpdated);
      applyCatalogSnapshot({ products: localUpdated });
      showToast('Discount cleared.');
      onRefreshDashboard();
    } catch {
      storageSyncProductsCatalog(localUpdated);
      applyCatalogSnapshot({ products: localUpdated });
      showToast('Discount cleared.');
      onRefreshDashboard();
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={applyDiscount} className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-4 text-xs">
        <div>
          <h2 className="font-serif text-xl font-medium text-[#252525]">
            Launch Category or Product Offer
          </h2>
          <p className="text-[#252525]/60 mt-0.5">
            Apply seasonal markdowns directly to selling prices and show strikethrough comparison prices on the live storefront.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block font-medium mb-1">Apply To</label>
            <select
              value={scope}
              onChange={(e) => {
                const nextScope = e.target.value as 'category' | 'product';
                setScope(nextScope);
                setTarget(
                  nextScope === 'category'
                    ? categories[0]?.category || ''
                    : products[0]?.id || ''
                );
              }}
              className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
            >
              <option value="category">Entire Category</option>
              <option value="product">Single Product</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-medium mb-1">
              {scope === 'category' ? 'Select Category' : 'Select Jewellery Piece'}
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18"
            >
              {scope === 'category'
                ? categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))
                : products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatPKR(p.pricePkr)})
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Discount % (0 clears badge)</label>
            <input
              type="number"
              min={0}
              max={90}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={applying}
            className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] cursor-pointer"
          >
            {applying ? 'Applying...' : 'Apply Offer Live'}
          </button>
        </div>
      </form>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3 text-xs">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
          Active Product Markdowns ({discountedProducts.length})
        </h3>
        {discountedProducts.length === 0 ? (
          <p className="text-[#252525]/60 py-6 text-center border border-dashed border-[#252525]/15">
            No products currently have active strikethrough discounts.
          </p>
        ) : (
          <div className="divide-y divide-[#252525]/8">
            {discountedProducts.map((p) => {
              const pct = getDiscountPercentage(p) || 0;
              return (
                <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#252525]">{p.name}</p>
                    <p className="text-[11px] text-[#252525]/60 tabular-nums">
                      Sale: {formatPKR(p.pricePkr)} · Original: {formatPKR(p.compareAtPricePkr || p.pricePkr)} (-{pct}%)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void clearSingleDiscount(p.id)}
                    className="px-3 py-1.5 border border-[#252525]/20 bg-[#F8F5EF] hover:border-[#C6A15B] cursor-pointer"
                  >
                    Clear Offer Badge
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. COUPON MANAGEMENT
// ==========================================
export function AdminCouponsSection({
  coupons,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonCommerceProps & { coupons: CouponRecord[] }) {
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '10',
    minOrderPkr: '0',
    maxUses: '',
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || saving) return;
    setSaving(true);
    setErrorMsg(null);
    const codeClean = form.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
    const localCoupon: CouponRecord = {
      id: `CPN-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      code: codeClean,
      description: form.description.trim() || `${codeClean} promotional privilege`,
      discountType: form.discountType,
      discountValue: Math.max(1, Number(form.discountValue) || 10),
      minOrderPkr: Math.max(0, Number(form.minOrderPkr) || 0),
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      usedCount: 0,
      active: true,
      expiresAt: form.expiresAt || undefined,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          code: codeClean,
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue) || 0,
          minOrderPkr: Number(form.minOrderPkr) || 0,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
          active: true,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not create coupon.');
      }
      const data = res.ok ? ((await res.json()) as { coupon?: CouponRecord }) : {};
      storageUpsertCoupon(data.coupon || localCoupon, 'admin');
      setForm({
        code: '',
        description: '',
        discountType: 'percent',
        discountValue: '10',
        minOrderPkr: '0',
        maxUses: '',
        expiresAt: '',
      });
      showToast('Promo code created & saved persistently.');
      onRefreshDashboard();
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        storageUpsertCoupon(localCoupon, 'admin');
        setForm({
          code: '',
          description: '',
          discountType: 'percent',
          discountValue: '10',
          minOrderPkr: '0',
          maxUses: '',
          expiresAt: '',
        });
        showToast('Promo code saved to Chrome LocalStorage.');
        onRefreshDashboard();
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Coupon save failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: CouponRecord) => {
    try {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(c.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Offline LocalStorage update below
    }
    storageUpsertCoupon({ ...c, active: !c.active }, 'admin');
    showToast(`Coupon ${c.code} ${!c.active ? 'activated' : 'paused'}.`);
    onRefreshDashboard();
  };

  const deleteCoupon = async (c: CouponRecord) => {
    try {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(c.id)}`, {
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
    storageDeleteCoupon(c.id, 'admin');
    showToast(`Deleted coupon ${c.code}.`);
    onRefreshDashboard();
  };

  return (
    <div className="space-y-5 text-xs">
      <form onSubmit={handleCreate} className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-4">
        <div>
          <h2 className="font-serif text-xl font-medium text-[#252525]">
            Create Promotional Coupon
          </h2>
          <p className="text-[#252525]/60 mt-0.5">
            Active promo codes work live in the storefront WhatsApp checkout modal.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800">{errorMsg}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium mb-1">Coupon Code *</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="EIDGOLD10"
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 uppercase"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Discount Type</label>
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })
              }
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount (PKR)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">
              {form.discountType === 'percent' ? 'Discount (%)' : 'Discount (PKR)'}
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Minimum Order (PKR)</label>
            <input
              type="number"
              min={0}
              value={form.minOrderPkr}
              onChange={(e) => setForm({ ...form, minOrderPkr: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Max Uses (Optional)</label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Unlimited"
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Expiry Date (Optional)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
            />
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., 10% bridal privilege on gold necklaces"
            className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] cursor-pointer"
          >
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </form>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 overflow-x-auto">
        {coupons.length === 0 ? (
          <div className="py-12 text-center text-[#252525]/60">
            No promotional coupons created yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Benefit</th>
                <th className="py-3 px-4 font-medium">Min Order</th>
                <th className="py-3 px-4 font-medium">Redemptions</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252525]/8">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-semibold tracking-wider text-[#252525]">
                    {c.code}
                    <p className="text-[11px] font-normal text-[#252525]/60">{c.description}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.discountType === 'percent' ? `${c.discountValue}% OFF` : formatPKR(c.discountValue)}
                  </td>
                  <td className="py-3 px-4 tabular-nums">{formatPKR(c.minOrderPkr)}</td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 border text-[11px] font-medium ${
                        c.active
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-[#252525]/20 bg-[#F8F5EF] text-[#252525]/60'
                      }`}
                    >
                      {c.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => void toggleActive(c)}
                      className="px-2.5 py-1.5 border border-[#252525]/20 bg-[#F8F5EF] cursor-pointer"
                    >
                      {c.active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCoupon(c)}
                      className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-red-800 cursor-pointer"
                    >
                      Delete
                    </button>
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
// 5. REVIEWS & RATINGS
// ==========================================
export function AdminReviewsSection({
  reviews,
  products,
  applyCatalogSnapshot,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: CommonCommerceProps & {
  reviews: ProductReviewRecord[];
  products: JewelleryProduct[];
  applyCatalogSnapshot: (snapshot: { products?: JewelleryProduct[] }) => void;
}) {
  const [filter, setFilter] = useState<'All' | ReviewStatus>('All');
  const [form, setForm] = useState({
    productId: products[0]?.id || '',
    customerName: '',
    rating: '5',
    title: '',
    comment: '',
  });
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => (filter === 'All' ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter]
  );

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.productId || saving) return;
    setSaving(true);
    const prod = products.find((p) => p.id === form.productId);
    const ratingVal = Math.min(5, Math.max(1, Number(form.rating) || 5));
    const localReview: ProductReviewRecord = {
      id: `REV-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      productId: form.productId,
      productName: prod?.name || 'Jewellery Piece',
      customerName: form.customerName.trim(),
      rating: ratingVal,
      title: form.title.trim() || `${ratingVal}-star Client Review`,
      comment: form.comment.trim(),
      status: 'Approved',
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          productId: form.productId,
          customerName: form.customerName.trim(),
          rating: ratingVal,
          title: form.title.trim(),
          comment: form.comment.trim(),
          status: 'Approved',
          verifiedPurchase: true,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = res.ok ? ((await res.json()) as { review?: ProductReviewRecord }) : {};
      const nextState = storageUpsertReview(data.review || localReview, 'admin');
      applyCatalogSnapshot({ products: nextState.products });
      setForm({ ...form, customerName: '', title: '', comment: '' });
      showToast('Client review saved & rating updated.');
      onRefreshDashboard();
    } catch {
      const nextState = storageUpsertReview(localReview, 'admin');
      applyCatalogSnapshot({ products: nextState.products });
      setForm({ ...form, customerName: '', title: '', comment: '' });
      showToast('Review saved to Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: ReviewStatus) => {
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
    } catch {
      // Offline LocalStorage update below
    }
    const nextState = storageUpdateReviewStatus(id, status, 'admin');
    applyCatalogSnapshot({ products: nextState.products });
    showToast(`Review marked ${status}.`);
    onRefreshDashboard();
  };

  const removeReview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
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
    storageDeleteReview(id, 'admin');
    showToast('Review deleted.');
    onRefreshDashboard();
  };

  return (
    <div className="space-y-5 text-xs">
      <form onSubmit={handleAddReview} className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h2 className="font-serif text-xl font-medium text-[#252525]">Record Verified Client Review</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium mb-1">Product *</label>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Client Name *</label>
            <input
              type="text"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Client name"
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Rating</label>
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} Stars
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Headline (e.g., Exceptional Kundan setting)"
            className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
          <input
            type="text"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="Client testimonial..."
            className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-[#252525] text-[#FFFDF8] cursor-pointer">
            {saving ? 'Saving...' : 'Publish Review'}
          </button>
        </div>
      </form>

      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-medium text-[#252525]">Moderated Reviews ({reviews.length})</h3>
          <div className="flex gap-1.5">
            {(['All', 'Approved', 'Pending', 'Hidden'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 cursor-pointer ${
                  filter === tab ? 'bg-[#252525] text-[#FFFDF8]' : 'bg-[#F8F5EF] text-[#252525]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-[#252525]/60">No client reviews recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#252525]/10">
            {visible.map((rev) => (
              <div key={rev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#252525]">{rev.productName}</span>
                    <span className="inline-flex items-center gap-0.5 text-[#8E6E30] tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]" />
                      {rev.rating}.0
                    </span>
                    <span className="text-[#252525]/60">by {rev.customerName}</span>
                  </div>
                  <p className="text-[#252525]/80">
                    <strong>{rev.title}</strong>
                    {rev.comment ? ` — ${rev.comment}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={rev.status}
                    onChange={(e) => void updateStatus(rev.id, e.target.value as ReviewStatus)}
                    className="px-2.5 py-1.5 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void removeReview(rev.id)}
                    className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-red-800 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
