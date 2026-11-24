import React, { useMemo, useState } from 'react';
import { Eye, Plus, Search, Trash2, X } from 'lucide-react';
import type { JewelleryProduct } from '../../data/products';
import {
  ALL_ORDER_STATUSES,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type StoreOrder,
} from '../../types/assistant';
import { formatPKR } from '../../config/storeConfig';
import { JewelryImage } from '../JewelryImage';
import {
  storageDeleteOrder,
  storageRecordOrder,
  storageUpdateOrder,
} from '../../utils/adminStorage';

interface AdminOrdersSectionProps {
  orders: StoreOrder[];
  products: JewelleryProduct[];
  onRefreshDashboard: () => void;
  onUnauthorized: () => void;
  showToast: (text: string) => void;
}

const ORDER_TABS: Array<'All' | OrderStatus> = ['All', ...ALL_ORDER_STATUSES];
const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash on Delivery',
  'Bank Transfer',
  'JazzCash / EasyPaisa',
  'Card / Online',
];
const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Paid', 'Partial', 'Refunded'];

function getStatusTextTone(status: OrderStatus): string {
  switch (status) {
    case 'Delivered':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900';
    case 'Cancelled':
    case 'Returned':
    case 'Refunded':
      return 'border-red-300 bg-red-50 text-red-900';
    case 'Shipped':
    case 'Confirmed':
      return 'border-[#C6A15B] bg-[#F3ECE0] text-[#252525]';
    default:
      return 'border-[#252525]/20 bg-[#F8F5EF] text-[#252525]';
  }
}

export function AdminOrdersSection({
  orders,
  products,
  onRefreshDashboard,
  onUnauthorized,
  showToast,
}: AdminOrdersSectionProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);

  // Order detail edit fields
  const [detailStatus, setDetailStatus] = useState<OrderStatus>('New');
  const [detailPaymentStatus, setDetailPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [detailPaymentMethod, setDetailPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [detailCourier, setDetailCourier] = useState('');
  const [detailTracking, setDetailTracking] = useState('');
  const [detailNotes, setDetailNotes] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  // Manual Order Creation Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('Confirmed');
  const [newProductId, setNewProductId] = useState<string>(products[0]?.id || '');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newNote, setNewNote] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { All: orders.length };
    for (const st of ALL_ORDER_STATUSES) {
      map[st] = orders.filter((o) => o.status === st).length;
    }
    return map;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'All' && o.paymentMethod !== paymentFilter) return false;
      if (!q) return true;
      const haystack = [
        o.id,
        o.customerName,
        o.customerPhone,
        o.city,
        o.deliveryAddress,
        o.trackingNumber,
        ...o.items.map((it) => `${it.name} ${it.sku || ''}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  const openOrderDetail = (order: StoreOrder) => {
    setSelectedOrder(order);
    setDetailStatus(order.status);
    setDetailPaymentStatus(order.paymentStatus);
    setDetailPaymentMethod(order.paymentMethod);
    setDetailCourier(order.courierName || '');
    setDetailTracking(order.trackingNumber || '');
    setDetailNotes(order.internalNotes || '');
    setErrorMsg(null);
  };

  const patchOrder = async (
    orderId: string,
    payload: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      courierName?: string;
      trackingNumber?: string;
      internalNotes?: string;
    }
  ) => {
    setSavingDetail(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const nextState = storageUpdateOrder(orderId, payload);
      const updatedLocal = nextState.orders.find((o) => o.id === orderId) || null;
      if (selectedOrder?.id === orderId && updatedLocal) {
        setSelectedOrder(updatedLocal);
      }
      showToast(`Order ${orderId} updated & saved.`);
      onRefreshDashboard();
    } catch {
      const nextState = storageUpdateOrder(orderId, payload);
      const updatedLocal = nextState.orders.find((o) => o.id === orderId) || null;
      if (selectedOrder?.id === orderId && updatedLocal) {
        setSelectedOrder(updatedLocal);
      }
      showToast(`Order ${orderId} updated in Chrome storage.`);
      onRefreshDashboard();
    } finally {
      setSavingDetail(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      storageDeleteOrder(orderId);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      showToast(`Order ${orderId} removed.`);
      onRefreshDashboard();
    } catch {
      storageDeleteOrder(orderId);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      showToast(`Order ${orderId} removed from Chrome storage.`);
      onRefreshDashboard();
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingOrder) return;
    const prod = products.find((p) => p.id === newProductId) || products[0];
    if (!prod || !newCustomerName.trim()) {
      setErrorMsg('Customer name and jewellery item are required.');
      return;
    }
    setCreatingOrder(true);
    setErrorMsg(null);
    const orderPayload = {
      type: 'manual' as const,
      customerName: newCustomerName.trim(),
      customerPhone: newCustomerPhone.trim() || undefined,
      customerEmail: newCustomerEmail.trim() || undefined,
      city: newCity.trim() || undefined,
      deliveryAddress: newAddress.trim() || undefined,
      paymentMethod: newPaymentMethod,
      paymentStatus: newPaymentStatus,
      status: newOrderStatus,
      customerNote: newNote.trim() || undefined,
      items: [
        {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          image: prod.images[0],
          category: prod.category,
          size: prod.availableSizes[0] || 'Standard',
          quantity: Math.max(1, newQuantity),
          unitPricePkr: prod.pricePkr,
        },
      ],
    };
    try {
      const { order: savedOrder } = storageRecordOrder(orderPayload, 'admin');
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ ...orderPayload, id: savedOrder.id }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      setCreateOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCity('');
      setNewAddress('');
      setNewNote('');
      showToast(`Order ${savedOrder.id} saved persistently.`);
      onRefreshDashboard();
    } catch {
      setCreateOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCity('');
      setNewAddress('');
      setNewNote('');
      showToast('Order saved in Chrome LocalStorage.');
      onRefreshDashboard();
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Status Tabs */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {ORDER_TABS.map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                  active
                    ? 'bg-[#252525] text-[#FFFDF8]'
                    : 'bg-[#F8F5EF] text-[#252525]/75 hover:bg-[#E8DDCC]'
                }`}
              >
                {tab} ({statusCounts[tab] || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#252525]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer name, phone, city, SKU..."
              className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as 'All' | PaymentMethod)}
            aria-label="Filter by payment method"
            className="px-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] focus:outline-none focus:border-[#C6A15B]"
          >
            <option value="All">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setNewProductId(products[0]?.id || '');
            setCreateOpen(true);
          }}
          className="px-4 py-2 min-h-[40px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
          <span>Record Manual Order</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">{errorMsg}</div>
      )}

      {/* Orders List */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10">
        {filteredOrders.length === 0 ? (
          <div className="py-14 px-6 text-center text-xs text-[#252525]/60">
            No orders match the current filter. Orders from storefront WhatsApp checkout or manual boutique entry appear here automatically.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#252525]/10">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#252525] tabular-nums">{order.id}</p>
                      <p className="text-[11px] text-[#252525]/65">
                        {order.customerName}
                        {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-[#252525] tabular-nums">
                      {formatPKR(order.totalPkr)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        {it.image && (
                          <div className="w-10 h-9 shrink-0 bg-[#E8DDCC] overflow-hidden">
                            <JewelryImage src={it.image} alt={it.name} className="w-full h-full" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#252525] truncate">{it.name}</p>
                          <p className="text-[11px] text-[#252525]/60 tabular-nums">
                            {it.size} × {it.quantity} · {formatPKR(it.unitPricePkr)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(order.deliveryAddress || order.city) && (
                    <p className="text-[11px] text-[#252525]/65">
                      Delivery: {[order.deliveryAddress, order.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#252525]/8">
                    <span className={`px-2 py-0.5 border text-[11px] font-medium ${getStatusTextTone(order.status)}`}>
                      {order.status} · {order.paymentStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => openOrderDetail(order)}
                      className="px-3 py-1.5 border border-[#252525]/20 bg-[#F8F5EF] font-medium text-[#252525] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#8E6E30]" />
                      <span>Manage</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
                    <th className="py-3 px-4 font-medium">Order &amp; Date</th>
                    <th className="py-3 px-4 font-medium">Customer &amp; Delivery</th>
                    <th className="py-3 px-4 font-medium">Pieces</th>
                    <th className="py-3 px-4 font-medium">Payment</th>
                    <th className="py-3 px-4 font-medium">Total (PKR)</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252525]/8">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F8F5EF]/60">
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <p className="font-semibold text-[#252525] tabular-nums">{order.id}</p>
                        <p className="text-[11px] text-[#252525]/55 tabular-nums mt-0.5">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top max-w-[220px]">
                        <p className="font-medium text-[#252525] truncate">{order.customerName}</p>
                        {order.customerPhone && (
                          <p className="text-[11px] text-[#252525]/65 tabular-nums">
                            {order.customerPhone}
                          </p>
                        )}
                        {(order.deliveryAddress || order.city) && (
                          <p className="text-[11px] text-[#252525]/60 truncate">
                            {[order.deliveryAddress, order.city].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1.5">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2 min-w-[180px]">
                              {it.image && (
                                <div className="w-8 h-7 shrink-0 bg-[#E8DDCC] overflow-hidden">
                                  <JewelryImage src={it.image} alt={it.name} className="w-full h-full" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[#252525] font-medium truncate max-w-[170px]">
                                  {it.name}
                                </p>
                                <p className="text-[10px] text-[#252525]/60 tabular-nums">
                                  {it.size} × {it.quantity} ({formatPKR(it.unitPricePkr)})
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <p className="text-[#252525]">{order.paymentMethod}</p>
                        <p className="text-[11px] text-[#8E6E30] font-medium">
                          {order.paymentStatus}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top font-semibold tabular-nums whitespace-nowrap">
                        {formatPKR(order.totalPkr)}
                        {order.couponCode && (
                          <p className="text-[10px] font-normal text-[#8E6E30]">
                            Code: {order.couponCode}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            void patchOrder(order.id, { status: e.target.value as OrderStatus })
                          }
                          aria-label={`Order status for ${order.id}`}
                          className={`px-2 py-1 border text-[11px] font-medium cursor-pointer ${getStatusTextTone(
                            order.status
                          )}`}
                        >
                          {ALL_ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openOrderDetail(order)}
                            className="px-2.5 py-1.5 border border-[#252525]/20 bg-[#FFFDF8] hover:border-[#C6A15B] text-[#252525] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-[#8E6E30]" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]" onClick={() => setSelectedOrder(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-serif text-xl font-medium">Order {selectedOrder.id}</h2>
                <p className="text-[11px] text-[#FFFDF8]/70 tabular-nums">
                  Placed {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="w-8 h-8 flex items-center justify-center text-[#FFFDF8]/75 hover:text-[#FFFDF8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Customer & Address Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8F5EF] border border-[#252525]/10">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Customer</p>
                  <p className="font-semibold text-[#252525] mt-0.5">{selectedOrder.customerName}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-[#252525]/75 tabular-nums">{selectedOrder.customerPhone}</p>
                  )}
                  {selectedOrder.customerEmail && (
                    <p className="text-[#252525]/75">{selectedOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Delivery Address</p>
                  <p className="text-[#252525] mt-0.5">
                    {[selectedOrder.deliveryAddress, selectedOrder.city].filter(Boolean).join(', ') ||
                      'To be confirmed via WhatsApp'}
                  </p>
                  {selectedOrder.customerNote && (
                    <p className="text-[#252525]/65 mt-1">Note: {selectedOrder.customerNote}</p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="border border-[#252525]/10 divide-y divide-[#252525]/8">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {it.image && (
                        <div className="w-12 h-10 shrink-0 bg-[#E8DDCC] overflow-hidden">
                          <JewelryImage src={it.image} alt={it.name} className="w-full h-full" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-[#252525] truncate">{it.name}</p>
                        <p className="text-[11px] text-[#252525]/60 tabular-nums">
                          {it.sku ? `${it.sku} · ` : ''}Size: {it.size} · Qty: {it.quantity} ×{' '}
                          {formatPKR(it.unitPricePkr)}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-[#252525] tabular-nums shrink-0">
                      {formatPKR(it.unitPricePkr * it.quantity)}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-[#F8F5EF] flex flex-wrap items-center justify-between gap-3 tabular-nums">
                  <div className="text-[#252525]/70 space-x-3">
                    <span>Subtotal: {formatPKR(selectedOrder.subtotalPkr)}</span>
                    {selectedOrder.discountPkr > 0 && (
                      <span>Discount: -{formatPKR(selectedOrder.discountPkr)}</span>
                    )}
                    <span>Shipping: {formatPKR(selectedOrder.shippingPkr)}</span>
                  </div>
                  <span className="font-semibold text-sm text-[#252525]">
                    Total: {formatPKR(selectedOrder.totalPkr)}
                  </span>
                </div>
              </div>

              {/* Status, Payment & Tracking Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Order Status</label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {ALL_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Payment Status</label>
                  <select
                    value={detailPaymentStatus}
                    onChange={(e) => setDetailPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {PAYMENT_STATUSES.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Payment Method</label>
                  <select
                    value={detailPaymentMethod}
                    onChange={(e) => setDetailPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Courier Partner</label>
                  <input
                    type="text"
                    value={detailCourier}
                    onChange={(e) => setDetailCourier(e.target.value)}
                    placeholder="e.g., TCS Priority Insured"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={detailTracking}
                    onChange={(e) => setDetailTracking(e.target.value)}
                    placeholder="Enter insured tracking ID"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#252525] mb-1">Internal Atelier Notes</label>
                  <input
                    type="text"
                    value={detailNotes}
                    onChange={(e) => setDetailNotes(e.target.value)}
                    placeholder="Sizing notes, gift box instructions..."
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#252525]/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedOrder.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => void patchOrder(selectedOrder.id, { status: 'Cancelled' })}
                      className="px-3 py-2 border border-red-200 bg-red-50 text-red-800 font-medium cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteOrder(selectedOrder.id)}
                    className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 border border-[#252525]/20 text-[#252525] cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() =>
                      void patchOrder(selectedOrder.id, {
                        status: detailStatus,
                        paymentStatus: detailPaymentStatus,
                        paymentMethod: detailPaymentMethod,
                        courierName: detailCourier,
                        trackingNumber: detailTracking,
                        internalNotes: detailNotes,
                      })
                    }
                    className="px-5 py-2 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
                  >
                    {savingDetail ? 'Saving...' : 'Save Order Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Walk-in Order Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between shrink-0">
              <h2 className="font-serif text-xl font-medium">Record Manual / Boutique Order</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close modal"
                className="w-8 h-8 flex items-center justify-center text-[#FFFDF8]/75 hover:text-[#FFFDF8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Lahore"
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street, sector, city"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Jewellery Piece *</label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatPKR(p.pricePkr)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Order Status</label>
                  <select
                    value={newOrderStatus}
                    onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {ALL_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Payment Method</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Payment Status</label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                  >
                    {PAYMENT_STATUSES.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Order Notes</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Engraving, sizing, or concierge details"
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18"
                />
              </div>
              <div className="pt-3 border-t border-[#252525]/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-[#252525]/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="px-5 py-2 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
                >
                  {creatingOrder ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
