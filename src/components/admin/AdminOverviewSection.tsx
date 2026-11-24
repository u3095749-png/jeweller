import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  FolderOpen,
  Gem,
  Percent,
  Plus,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { CategoryCardItem, JewelleryProduct } from '../../data/products';
import type { AdminDashboardPayload } from '../../types/assistant';
import type { AdminSection } from '../../context/StoreContext';
import { formatPKR } from '../../config/storeConfig';
import { JewelryImage } from '../JewelryImage';

interface AdminOverviewSectionProps {
  dashboard: AdminDashboardPayload;
  products: JewelleryProduct[];
  categories: CategoryCardItem[];
  loading: boolean;
  onSwitchSection: (section: AdminSection) => void;
  onOpenAddProduct: () => void;
  onOpenAddCategory: () => void;
}

export function AdminOverviewSection({
  dashboard,
  products,
  categories,
  loading,
  onSwitchSection,
  onOpenAddProduct,
  onOpenAddCategory,
}: AdminOverviewSectionProps) {
  const {
    stats,
    orders,
    customers,
    lowStockProducts,
    topSellingProducts,
    notifications,
    activityLogs,
    revenueByDay,
  } = dashboard;

  const categoryBreakdown = useMemo(() => {
    const counts = categories.map((cat) => {
      const count = products.filter(
        (p) => p.category === cat.category || p.categories.includes(cat.category)
      ).length;
      return { name: cat.category, count };
    });
    const maxCount = Math.max(1, ...counts.map((c) => c.count));
    return counts
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        widthPct: Math.round((item.count / maxCount) * 100),
      }));
  }, [categories, products]);

  const maxDayRevenue = Math.max(1, ...revenueByDay.map((d) => d.revenuePkr));
  const pendingOrdersList = useMemo(
    () => orders.filter((o) => o.status === 'New' || o.status === 'Pending'),
    [orders]
  );

  return (
    <div className="space-y-6">
      {/* Operational Alerts Bar (Real Data Only) */}
      {(pendingOrdersList.length > 0 || lowStockProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingOrdersList.length > 0 && (
            <button
              type="button"
              onClick={() => onSwitchSection('orders')}
              className="text-left p-4 bg-[#FFFDF8] border border-[#C6A15B] hover:bg-[#F3ECE0] transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <ShoppingBag className="w-4 h-4 text-[#8E6E30] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#252525] tabular-nums">
                    Pending Order Alerts ({pendingOrdersList.length})
                  </p>
                  <p className="text-[11px] text-[#252525]/70 mt-0.5">
                    {pendingOrdersList.length} order{pendingOrdersList.length === 1 ? '' : 's'} awaiting confirmation &amp; dispatch.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E6E30] shrink-0" />
            </button>
          )}

          {lowStockProducts.length > 0 && (
            <button
              type="button"
              onClick={() => onSwitchSection('inventory')}
              className="text-left p-4 bg-[#FFFDF8] border border-amber-400/70 hover:bg-amber-50/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#252525] tabular-nums">
                    Stock Attention Needed ({lowStockProducts.length})
                  </p>
                  <p className="text-[11px] text-[#252525]/70 mt-0.5 tabular-nums">
                    {stats.lowStockCount} low stock · {stats.outOfStockCount} out of stock
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">
            Total Revenue
          </p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {formatPKR(stats.totalRevenuePkr)}
          </p>
          <p className="text-[11px] text-[#252525]/60 mt-1 tabular-nums">
            Today: {formatPKR(stats.todaysSalesPkr)} · Month: {formatPKR(stats.monthlySalesPkr)}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">
            Orders Pipeline
          </p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {stats.totalOrders}
          </p>
          <p className="text-[11px] text-[#252525]/60 mt-1 tabular-nums">
            {stats.pendingOrders} pending · {stats.completedOrders} delivered · {stats.cancelledOrders} cancelled
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">
            Catalog &amp; Stock
          </p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {stats.totalProducts} Pieces · {stats.totalCategories} Depts
          </p>
          <p className="text-[11px] text-[#252525]/60 mt-1 tabular-nums">
            {stats.inStockCount} available · {stats.lowStockCount} low · {stats.outOfStockCount} out
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/12 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#252525]/55">
            Clients &amp; Security
          </p>
          <p className="font-serif text-2xl font-semibold text-[#252525] tabular-nums mt-1">
            {stats.totalCustomers} Customers
          </p>
          <p className="text-[11px] text-[#252525]/60 mt-1">
            WhatsApp Alerts: {stats.whatsappConfigured ? 'Cloud API Active' : 'Env Setup Needed'}
          </p>
        </div>
      </div>

      {/* Detailed KPI Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Today's Sales", value: formatPKR(stats.todaysSalesPkr), target: 'analytics' as AdminSection },
          { label: 'Monthly Sales', value: formatPKR(stats.monthlySalesPkr), target: 'analytics' as AdminSection },
          { label: 'Pending Orders', value: String(stats.pendingOrders), target: 'orders' as AdminSection },
          { label: 'Completed Orders', value: String(stats.completedOrders), target: 'orders' as AdminSection },
          { label: 'Low Stock Pieces', value: String(stats.lowStockCount), target: 'inventory' as AdminSection },
          {
            label: 'Best Sellers (Sold)',
            value:
              topSellingProducts.length > 0
                ? `${topSellingProducts.reduce((s, p) => s + p.unitsSold, 0)} sold`
                : '0 sold',
            target: 'products' as AdminSection,
          },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onSwitchSection(kpi.target)}
            className="text-left p-3.5 bg-[#FFFDF8] border border-[#252525]/10 hover:border-[#C6A15B] transition-colors cursor-pointer"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#252525]/55">
              {kpi.label}
            </p>
            <p className="font-serif text-lg font-semibold text-[#252525] tabular-nums mt-1 truncate">
              {kpi.value}
            </p>
          </button>
        ))}
      </div>

      {/* Quick Management Actions */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
          Quick Management Actions
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-4 py-2.5 bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>Add Product</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddCategory}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchSection('orders')}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Manage Orders ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchSection('customers')}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Customers ({customers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchSection('discounts')}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Discounts &amp; Offers</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchSection('coupons')}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Coupons ({stats.activeCouponsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchSection('reports')}
            className="px-4 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#8E6E30]" />
            <span>Reports &amp; CSV Export</span>
          </button>
        </div>
      </div>

      {/* Revenue Chart + Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              7-Day Sales Revenue
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('analytics')}
              className="text-[11px] font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              Full Analytics
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 border-b border-[#252525]/10">
            {revenueByDay.map((day) => {
              const heightPct =
                day.revenuePkr > 0 ? Math.max(12, Math.round((day.revenuePkr / maxDayRevenue) * 100)) : 4;
              return (
                <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <span className="text-[10px] text-[#252525]/60 tabular-nums">
                    {day.ordersCount > 0 ? `${day.ordersCount}` : '0'}
                  </span>
                  <div className="w-full max-w-[32px] bg-[#F3ECE0] flex items-end h-24">
                    <div
                      className={`w-full transition-all ${
                        day.revenuePkr > 0 ? 'bg-[#C6A15B]' : 'bg-[#252525]/12'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.date}: ${formatPKR(day.revenuePkr)} (${day.ordersCount} orders)`}
                    />
                  </div>
                  <span className="text-[10px] text-[#252525]/65 pb-1">{day.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#252525]/55 tabular-nums">
            Net recorded revenue (excludes cancelled, returned &amp; refunded orders).
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Catalog Distribution by Category
            </h2>
            <span className="text-[11px] text-[#252525]/55 tabular-nums">
              {products.length} total pieces
            </span>
          </div>
          <div className="space-y-2.5">
            {categoryBreakdown.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#252525]">{item.name}</span>
                  <span className="text-[#252525]/65 tabular-nums">
                    {item.count} {item.count === 1 ? 'piece' : 'pieces'}
                  </span>
                </div>
                <div className="h-2 bg-[#F3ECE0] overflow-hidden">
                  <div
                    className="h-full bg-[#C6A15B] transition-all duration-300"
                    style={{ width: `${Math.max(item.count > 0 ? 8 : 0, item.widthPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Recent Orders
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('orders')}
              className="text-xs font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              View All Orders
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-xs text-[#252525]/60 py-6 text-center border border-dashed border-[#252525]/15">
              No orders recorded yet. Real customer checkout inquiries and manual orders will appear here.
            </p>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#252525] truncate">
                      {order.id} · {order.customerName}
                    </p>
                    <p className="text-[11px] text-[#252525]/60 tabular-nums">
                      {order.items.length} item(s) · {order.paymentMethod} · {order.status}
                    </p>
                  </div>
                  <span className="font-semibold text-[#252525] tabular-nums shrink-0">
                    {formatPKR(order.totalPkr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Top Selling Products
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('products')}
              className="text-xs font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              View Catalog
            </button>
          </div>
          {topSellingProducts.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-[#252525]/15 space-y-1.5">
              <Gem className="w-4 h-4 text-[#C6A15B] mx-auto" />
              <p className="text-xs text-[#252525]/60">
                Top-selling pieces will rank here automatically as orders are placed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {topSellingProducts.map((item) => (
                <div key={item.productId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-9 shrink-0 bg-[#E8DDCC] overflow-hidden">
                      <JewelryImage src={item.image} alt={item.name} className="w-full h-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#252525] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#252525]/60 tabular-nums">
                        {item.unitsSold} unit(s) sold · Stock: {item.stockQuantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#252525] tabular-nums shrink-0">
                    {formatPKR(item.revenuePkr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest Customers, Low Stock & Latest Notifications / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Latest Customers
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('customers')}
              className="text-xs font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              All ({customers.length})
            </button>
          </div>
          {customers.length === 0 ? (
            <p className="text-xs text-[#252525]/60 py-4">
              No customer profiles recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {customers.slice(0, 5).map((cust) => (
                <div key={cust.id} className="py-2 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#252525] truncate">{cust.name}</p>
                    <p className="text-[11px] text-[#252525]/55 truncate">
                      {cust.city || cust.phone || cust.email || 'Client profile'}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium tabular-nums shrink-0 text-[#8E6E30]">
                    {cust.orderCount || 0} orders
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Latest Notifications
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('notifications')}
              className="text-xs font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              Center ({stats.unreadNotificationsCount})
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-[#252525]/60 py-4">All clear — no pending notifications.</p>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {notifications.slice(0, 5).map((note) => (
                <div key={note.id} className="py-2 text-xs space-y-0.5">
                  <p className="font-medium text-[#252525] flex items-center justify-between gap-2">
                    <span className="truncate">{note.title}</span>
                    {!note.read && (
                      <span className="text-[10px] uppercase tracking-wider text-[#8E6E30] shrink-0">
                        Unread
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[#252525]/60 line-clamp-2">{note.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
              Recent Activities
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSection('activity')}
              className="text-xs font-medium text-[#252525] hover:text-[#8E6E30] cursor-pointer"
            >
              Audit Log
            </button>
          </div>
          {loading ? (
            <p className="text-xs text-[#252525]/60 py-4">Loading activities...</p>
          ) : activityLogs.length === 0 ? (
            <p className="text-xs text-[#252525]/60 py-4">No activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#252525]/8">
              {activityLogs.slice(0, 5).map((entry) => (
                <div key={entry.id} className="py-2 text-xs space-y-0.5">
                  <p className="font-medium text-[#252525] truncate">{entry.summary}</p>
                  <p className="text-[11px] text-[#252525]/55 tabular-nums">
                    {entry.type.replace('_', ' ')} · {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
