import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  TrendingUp,
  Unlock,
} from 'lucide-react';
import { getDiscountPercentage } from '../data/products.ts';
import { formatPKR } from '../config/storeConfig.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { AdminProductCostEntry, BusinessRecommendationCard } from '../types/assistant.ts';
import { JewelryImage } from './JewelryImage.tsx';

interface AssistantBusinessAdvisorProps {
  isAdminAuthorized: boolean;
  onAuthorizeAdmin: () => void;
  onLockAdmin: () => void;
  adminCosts: AdminProductCostEntry[];
  onUpdateCostEntry: (entry: AdminProductCostEntry) => void;
  onAskAdvisorPrompt: (prompt: string) => void;
}

const ADVISOR_QUICK_PROMPTS = [
  'Which product gives me the highest profit?',
  'Which products have better profit margins?',
  'Which jewellery product should I promote?',
  'Which products are not selling well?',
];

export function AssistantBusinessAdvisor({
  isAdminAuthorized,
  onAuthorizeAdmin,
  onLockAdmin,
  adminCosts,
  onUpdateCostEntry,
  onAskAdvisorPrompt,
}: AssistantBusinessAdvisorProps) {
  const { products, getProductById, adminSession } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const costMap = useMemo(() => {
    const map = new Map<string, AdminProductCostEntry>();
    adminCosts.forEach((c) => map.set(c.productId, c));
    return map;
  }, [adminCosts]);

  const computedMetrics = useMemo(() => {
    const cards: BusinessRecommendationCard[] = [];
    let totalRealizedProfit = 0;
    let hasAnySales = false;

    for (const product of products) {
      const entry = costMap.get(product.id);
      if (!entry || typeof entry.purchaseCostPkr !== 'number' || entry.purchaseCostPkr <= 0) {
        continue;
      }
      const extra =
        typeof entry.extraExpensesPkr === 'number' && entry.extraExpensesPkr > 0
          ? entry.extraExpensesPkr
          : 0;
      const profit = product.pricePkr - entry.purchaseCostPkr - extra;
      const margin = product.pricePkr > 0 ? (profit / product.pricePkr) * 100 : 0;
      const unitsSold =
        typeof entry.unitsSold === 'number' && entry.unitsSold >= 0 ? entry.unitsSold : undefined;
      const actualProfit = typeof unitsSold === 'number' ? profit * unitsSold : undefined;

      if (typeof actualProfit === 'number') {
        totalRealizedProfit += actualProfit;
        hasAnySales = true;
      }

      const discountPct = getDiscountPercentage(product);
      let recommendation = 'Solid gross margin based on entered cost.';
      if (profit <= 0) {
        recommendation = 'Negative or zero unit margin — review purchase cost or adjust pricing.';
      } else if (margin >= 30 && product.inStock) {
        recommendation = 'High-margin in-stock piece — strong candidate to feature and promote.';
      } else if (discountPct && discountPct > 0) {
        recommendation = `Discounted ${discountPct}% — monitor margin after promotional markdown.`;
      } else if (!product.inStock) {
        recommendation = 'Made-to-order commission — zero holding inventory cost.';
      }

      cards.push({
        productId: product.id,
        purchaseCostPkr: entry.purchaseCostPkr,
        extraExpensesPkr: extra,
        sellingPricePkr: product.pricePkr,
        estimatedProfitPkr: profit,
        profitMarginPct: Number(margin.toFixed(2)),
        unitsSold,
        actualProfitPkr: actualProfit,
        recommendation,
      });
    }

    const sortedByProfit = [...cards].sort((a, b) => b.estimatedProfitPkr - a.estimatedProfitPkr);
    const sortedByMargin = [...cards].sort((a, b) => b.profitMarginPct - a.profitMarginPct);

    return {
      cards: sortedByProfit,
      highestProfitCard: sortedByProfit[0] || null,
      highestMarginCard: sortedByMargin[0] || null,
      totalRealizedProfit: hasAnySales ? totalRealizedProfit : null,
      missingCostCount: products.length - cards.length,
    };
  }, [costMap, products]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isVerifying) return;
    setAuthError(null);
    setIsVerifying(true);
    try {
      const endpoint = adminSession.setupRequired ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setAuthError(`Authentication server error (HTTP ${res.status}). Please try again.`);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.status >= 500) {
        setAuthError(data.error || `Server error (HTTP ${res.status}). Please try again.`);
        return;
      }
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Invalid administrator email or password.');
        return;
      }
      setEmail('');
      setPassword('');
      onAuthorizeAdmin();
    } catch {
      setAuthError('Unable to reach authentication server. Please check your connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAdminAuthorized) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 bg-[#F8F5EF] flex items-center justify-center">
        <div className="w-full max-w-sm bg-[#FFFDF8] border border-[#252525]/15 p-6 space-y-4">
          <div className="w-11 h-11 bg-[#252525] text-[#C6A15B] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-2xl font-medium text-[#252525]">
              {adminSession.setupRequired ? 'Claim Admin Account' : 'Authorized Business Advisor'}
            </h3>
            <p className="text-xs text-[#252525]/70 leading-relaxed">
              {adminSession.setupRequired
                ? 'Set up the private owner email and password once to unlock wholesale cost & profit analytics.'
                : 'Wholesale purchase costs, profit margins, and sales performance analytics are restricted to authenticated store administrators.'}
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <div>
              <label
                htmlFor="advisor-admin-email"
                className="block text-xs font-medium text-[#252525] mb-1"
              >
                Admin Email
              </label>
              <input
                id="advisor-admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zaveriatelier.pk"
                className="w-full px-3 py-2.5 min-h-[42px] bg-[#F8F5EF] border border-[#252525]/20 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              />
            </div>

            <div>
              <label
                htmlFor="advisor-admin-password"
                className="block text-xs font-medium text-[#252525] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="advisor-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={adminSession.setupRequired ? 'Minimum 8 characters' : 'Enter admin password'}
                  className="w-full pl-3 pr-10 py-2.5 min-h-[42px] bg-[#F8F5EF] border border-[#252525]/20 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#252525]/60 hover:text-[#252525] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password || isVerifying}
              className="w-full py-2.5 px-4 min-h-[42px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
            >
              {isVerifying
                ? 'Verifying...'
                : adminSession.setupRequired
                ? 'Create Admin Account & Unlock'
                : 'Sign In & Unlock Advisor'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F8F5EF]">
      {/* Header + Lock Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#252525]/10">
        <div>
          <h3 className="font-serif text-xl font-medium text-[#252525]">
            Profit Calculator &amp; Business Advisor
          </h3>
          <p className="text-[11px] text-[#252525]/65">
            Enter real wholesale purchase costs and sales history below. No cost or profit figure is ever fabricated.
          </p>
        </div>
        <button
          type="button"
          onClick={onLockAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] border border-[#252525]/20 bg-[#FFFDF8] text-xs font-medium text-[#252525] hover:border-[#C6A15B] cursor-pointer"
        >
          <Unlock className="w-3.5 h-3.5 text-[#8E6E30]" />
          <span>Lock Admin</span>
        </button>
      </div>

      {/* Live Profit Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Priced Items</p>
          <p className="text-base font-semibold text-[#252525] tabular-nums mt-0.5">
            {computedMetrics.cards.length} / {products.length}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Top Est. Unit Profit</p>
          <p className="text-sm font-semibold text-[#252525] tabular-nums mt-0.5 truncate">
            {computedMetrics.highestProfitCard
              ? formatPKR(computedMetrics.highestProfitCard.estimatedProfitPkr)
              : 'Enter cost'}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Best Margin</p>
          <p className="text-sm font-semibold text-[#8E6E30] tabular-nums mt-0.5">
            {computedMetrics.highestMarginCard
              ? `${computedMetrics.highestMarginCard.profitMarginPct.toFixed(2)}%`
              : 'Enter cost'}
          </p>
        </div>

        <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#252525]/55">Actual Recorded Profit</p>
          <p className="text-sm font-semibold text-[#252525] tabular-nums mt-0.5">
            {computedMetrics.totalRealizedProfit !== null
              ? formatPKR(computedMetrics.totalRealizedProfit)
              : 'Enter units sold'}
          </p>
        </div>
      </div>

      {/* AI Business Questions */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-3 space-y-2">
        <p className="text-xs font-medium text-[#252525] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#8E6E30]" />
          <span>Ask Noor Business Advisor</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ADVISOR_QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAskAdvisorPrompt(q)}
              className="px-2.5 py-1.5 bg-[#F8F5EF] border border-[#252525]/15 hover:border-[#C6A15B] text-[11px] text-[#252525] cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Business Recommendation Cards (when costs exist) */}
      {computedMetrics.cards.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8E6E30] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Calculated Profit &amp; Margin Cards</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {computedMetrics.cards.map((card) => {
              const product = getProductById(card.productId);
              if (!product) return null;

              return (
                <div
                  key={card.productId}
                  className="bg-[#FFFDF8] border border-[#252525]/12 p-3 space-y-2"
                >
                  <div className="flex gap-2.5">
                    <div className="w-16 h-14 shrink-0 bg-[#E8DDCC] overflow-hidden border border-[#252525]/10">
                      <JewelryImage
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-sm font-semibold text-[#252525] truncate">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-[#252525]/65 tabular-nums">
                        Selling: {formatPKR(card.sellingPricePkr)} <span aria-hidden="true">·</span> Cost: {formatPKR(card.purchaseCostPkr)}
                      </p>
                      {card.extraExpensesPkr > 0 && (
                        <p className="text-[10px] text-[#252525]/55 tabular-nums">
                          Shipping &amp; Tax: {formatPKR(card.extraExpensesPkr)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#252525]/8 text-xs tabular-nums">
                    <div>
                      <span className="block text-[10px] text-[#252525]/55">Estimated Unit Profit</span>
                      <span className={`font-semibold ${card.estimatedProfitPkr > 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                        {formatPKR(card.estimatedProfitPkr)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#252525]/55">Profit Margin</span>
                      <span className="font-semibold text-[#8E6E30]">
                        {card.profitMarginPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {typeof card.actualProfitPkr === 'number' && (
                    <p className="text-[11px] text-[#252525] tabular-nums">
                      Actual Profit ({card.unitsSold} sold):{' '}
                      <strong className="font-semibold">{formatPKR(card.actualProfitPkr)}</strong>
                    </p>
                  )}

                  <p className="text-[11px] text-[#252525]/75 leading-snug">
                    {card.recommendation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost & Sales Entry Ledger */}
      <div className="bg-[#FFFDF8] border border-[#252525]/12 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#252525]">
            Enter Purchase Cost, Expenses &amp; Sales History
          </h4>
          {computedMetrics.missingCostCount > 0 && (
            <span className="text-[11px] text-[#8E6E30] tabular-nums">
              {computedMetrics.missingCostCount} missing purchase cost
            </span>
          )}
        </div>

        <div className="divide-y divide-[#252525]/10">
          {products.map((product) => {
            const existing = costMap.get(product.id);
            return (
              <div
                key={product.id}
                className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                <div className="sm:col-span-5 flex items-center gap-2 min-w-0">
                  <div className="w-10 h-9 shrink-0 bg-[#E8DDCC] overflow-hidden">
                    <JewelryImage src={product.images[0]} alt={product.name} className="w-full h-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#252525] truncate">{product.name}</p>
                    <p className="text-[10px] text-[#252525]/60 tabular-nums">
                      Price: {formatPKR(product.pricePkr)}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-7 grid grid-cols-3 gap-1.5">
                  <label className="block">
                    <span className="block text-[9px] text-[#252525]/55">Purchase Cost</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Rs."
                      value={existing?.purchaseCostPkr ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                        onUpdateCostEntry({
                          productId: product.id,
                          purchaseCostPkr: val,
                          extraExpensesPkr: existing?.extraExpensesPkr,
                          unitsSold: existing?.unitsSold,
                        });
                      }}
                      className="w-full px-2 py-1 text-xs bg-[#F8F5EF] border border-[#252525]/15 tabular-nums focus:outline-none focus:border-[#C6A15B]"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-[9px] text-[#252525]/55">Ship / Tax Exp.</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={existing?.extraExpensesPkr ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                        onUpdateCostEntry({
                          productId: product.id,
                          purchaseCostPkr: existing?.purchaseCostPkr,
                          extraExpensesPkr: val,
                          unitsSold: existing?.unitsSold,
                        });
                      }}
                      className="w-full px-2 py-1 text-xs bg-[#F8F5EF] border border-[#252525]/15 tabular-nums focus:outline-none focus:border-[#C6A15B]"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-[9px] text-[#252525]/55">Units Sold</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={existing?.unitsSold ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value)));
                        onUpdateCostEntry({
                          productId: product.id,
                          purchaseCostPkr: existing?.purchaseCostPkr,
                          extraExpensesPkr: existing?.extraExpensesPkr,
                          unitsSold: val,
                        });
                      }}
                      className="w-full px-2 py-1 text-xs bg-[#F8F5EF] border border-[#252525]/15 tabular-nums focus:outline-none focus:border-[#C6A15B]"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
