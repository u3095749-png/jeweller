import React, { useMemo, useState } from 'react';
import { X, MessageCircle, Copy, Check, ExternalLink, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  buildCartWhatsAppMessage,
  buildSingleProductWhatsAppMessage,
  formatPKR,
  getWhatsAppUrl,
} from '../config/storeConfig';
import type { PaymentMethod } from '../types/assistant';
import { safeReadJson } from '../utils/safeFetchJson';
import { loadPersistedAdminState, storageRecordOrder } from '../utils/adminStorage';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash on Delivery',
  'Bank Transfer',
  'JazzCash / EasyPaisa',
  'Card / Online',
];

export function WhatsAppOrderModal() {
  const {
    whatsappModalPayload,
    closeWhatsAppModal,
    cart,
    cartSubtotalPkr,
    cartDeliveryPkr,
    cartTotalPkr,
    products,
    getProductById,
    websiteSettings,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPkr: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [copied, setCopied] = useState(false);

  const detailedCartItems = useMemo(() => {
    return cart
      .map((entry) => {
        const product = getProductById(entry.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          image: product.images[0],
          category: product.category,
          size: entry.size,
          quantity: entry.quantity,
          unitPricePkr: product.pricePkr,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, getProductById]);

  const baseSubtotal = useMemo(() => {
    if (!whatsappModalPayload) return 0;
    if (whatsappModalPayload.type === 'single') {
      return whatsappModalPayload.item.unitPricePkr * whatsappModalPayload.item.quantity;
    }
    return cartSubtotalPkr;
  }, [whatsappModalPayload, cartSubtotalPkr]);

  const baseDelivery = useMemo(() => {
    if (!whatsappModalPayload) return 0;
    if (whatsappModalPayload.type === 'single') {
      return baseSubtotal >= websiteSettings.freeDeliveryThresholdPkr || baseSubtotal === 0
        ? 0
        : websiteSettings.standardDeliveryFeePkr;
    }
    return cartDeliveryPkr;
  }, [
    whatsappModalPayload,
    baseSubtotal,
    cartDeliveryPkr,
    websiteSettings.freeDeliveryThresholdPkr,
    websiteSettings.standardDeliveryFeePkr,
  ]);

  const discountPkr = appliedCoupon ? Math.min(baseSubtotal, appliedCoupon.discountPkr) : 0;
  const finalTotalPkr = Math.max(0, baseSubtotal - discountPkr + baseDelivery);

  const combinedNote = useMemo(() => {
    const parts: string[] = [];
    if (customerName.trim()) parts.push(`Name: ${customerName.trim()}`);
    if (customerPhone.trim()) parts.push(`Phone: ${customerPhone.trim()}`);
    if (city.trim()) parts.push(`City: ${city.trim()}`);
    if (deliveryAddress.trim()) parts.push(`Address: ${deliveryAddress.trim()}`);
    parts.push(`Payment: ${paymentMethod}`);
    if (appliedCoupon) {
      parts.push(`Promo Code: ${appliedCoupon.code} (-${formatPKR(discountPkr)})`);
    }
    if (customerNote.trim()) parts.push(`Note: ${customerNote.trim()}`);
    return parts.join(' | ');
  }, [
    customerName,
    customerPhone,
    city,
    deliveryAddress,
    paymentMethod,
    appliedCoupon,
    discountPkr,
    customerNote,
  ]);

  const formattedMessage = useMemo(() => {
    if (!whatsappModalPayload) return '';
    if (whatsappModalPayload.type === 'single') {
      return buildSingleProductWhatsAppMessage(whatsappModalPayload.item, combinedNote);
    }
    if (detailedCartItems.length === 0) return whatsappModalPayload.defaultMessage;
    return buildCartWhatsAppMessage(
      detailedCartItems,
      cartSubtotalPkr,
      cartDeliveryPkr,
      finalTotalPkr || cartTotalPkr,
      combinedNote
    );
  }, [
    whatsappModalPayload,
    combinedNote,
    detailedCartItems,
    cartSubtotalPkr,
    cartDeliveryPkr,
    finalTotalPkr,
    cartTotalPkr,
  ]);

  if (!whatsappModalPayload) return null;

  const customWhatsappUrl = (() => {
    const phone = (websiteSettings.whatsappBusinessNumber || '').replace(/[^\d]/g, '');
    if (!phone) return getWhatsAppUrl(formattedMessage);
    return `https://wa.me/${phone}?text=${encodeURIComponent(formattedMessage)}`;
  })();

  const validateLocalCouponFallback = (code: string): boolean => {
    const localCoupons = loadPersistedAdminState().coupons;
    const found = localCoupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) return false;
    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now() - 86400000) {
      setAppliedCoupon(null);
      setCouponError('This promotional coupon has expired.');
      return true;
    }
    if (found.maxUses && found.usedCount >= found.maxUses) {
      setAppliedCoupon(null);
      setCouponError('This promotional coupon has reached its redemption limit.');
      return true;
    }
    if (found.minOrderPkr > 0 && baseSubtotal < found.minOrderPkr) {
      setAppliedCoupon(null);
      setCouponError(`Minimum order of ${formatPKR(found.minOrderPkr)} required for ${found.code}.`);
      return true;
    }
    const calcDiscount =
      found.discountType === 'percent'
        ? Math.round((baseSubtotal * found.discountValue) / 100)
        : Math.min(baseSubtotal, found.discountValue);
    setAppliedCoupon({
      code: found.code,
      discountPkr: calcDiscount,
      description: found.description || 'Applied',
    });
    return true;
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a promo code first.');
      return;
    }
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ code, subtotalPkr: baseSubtotal }),
      });
      const data = await safeReadJson<{
        valid?: boolean;
        code?: string;
        discountPkr?: number;
        description?: string;
        error?: string;
      }>(res, 'Coupon verification');
      if (!res.ok || !data.valid || !data.code) {
        if (validateLocalCouponFallback(code)) return;
        setAppliedCoupon(null);
        setCouponError(data.error || 'Coupon code is not valid.');
        return;
      }
      setAppliedCoupon({
        code: data.code,
        discountPkr: Number(data.discountPkr) || 0,
        description: data.description || 'Applied',
      });
    } catch {
      if (!validateLocalCouponFallback(code)) {
        setCouponError('Unable to verify coupon right now.');
      }
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored gracefully
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review WhatsApp Order"
    >
      <div
        className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]"
        onClick={closeWhatsAppModal}
      />

      <div className="relative z-10 w-full max-w-xl bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-[#C6A15B]" />
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-wide">
                Review WhatsApp Order
              </h2>
              <p className="text-xs text-[#FFFDF8]/70">
                Atelier Concierge: {websiteSettings.whatsappDisplayNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeWhatsAppModal}
            aria-label="Close WhatsApp order review"
            className="w-9 h-9 flex items-center justify-center text-[#FFFDF8]/70 hover:text-[#FFFDF8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[#252525]/10 text-sm">
            <span className="text-[#252525]/75">
              {whatsappModalPayload.type === 'single'
                ? `${whatsappModalPayload.item.name} × ${whatsappModalPayload.item.quantity}`
                : `Shopping Bag (${whatsappModalPayload.itemsCount} items)`}
            </span>
            <div className="text-right tabular-nums">
              {discountPkr > 0 && (
                <span className="text-xs text-[#8E6E30] mr-2">
                  -{formatPKR(discountPkr)}
                </span>
              )}
              <span className="font-semibold text-[#252525]">{formatPKR(finalTotalPkr)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Ayesha Khan"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">Phone / WhatsApp</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Lahore, Karachi, Islamabad"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              >
                {PAYMENT_METHODS.filter(
                  (m) => websiteSettings.codEnabled || m !== 'Cash on Delivery'
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {paymentMethod === 'Bank Transfer' && websiteSettings.bankTransferDetails && (
            <div className="p-3 bg-[#F8F5EF] border border-[#C6A15B]/35 text-[11px] text-[#252525]/80">
              <span className="font-semibold text-[#8E6E30] uppercase tracking-wider mr-1.5">
                Bank Transfer:
              </span>
              {websiteSettings.bankTransferDetails}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House, Street, Sector / Phase"
                className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#252525]/75 mb-1">
                Promo Code (Optional)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Enter code"
                  className="flex-1 min-w-0 px-3 py-2 bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] uppercase focus:outline-none focus:border-[#C6A15B]"
                />
                <button
                  type="button"
                  disabled={checkingCoupon}
                  onClick={() => void handleApplyCoupon()}
                  className="px-3 py-2 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] shrink-0 cursor-pointer inline-flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-[#C6A15B]" />
                  <span>{checkingCoupon ? '...' : 'Apply'}</span>
                </button>
              </div>
              {couponError && <p className="text-[11px] text-red-700 mt-1">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-[11px] text-emerald-800 mt-1 tabular-nums">
                  {appliedCoupon.code} applied (-{formatPKR(discountPkr)})
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="wa-customer-note"
              className="block text-xs font-medium text-[#252525]/75 mb-1"
            >
              Engraving or Sizing Note (Optional)
            </label>
            <input
              id="wa-customer-note"
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g., Custom gift message or ring resizing request"
              className="w-full px-3 py-2 text-xs bg-[#F8F5EF] border border-[#252525]/15 text-[#252525] placeholder:text-[#252525]/40 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#252525]/75">
                WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#8E6E30] hover:text-[#252525] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-[#E8DDCC]/55 border border-[#252525]/10 text-xs text-[#252525] font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {formattedMessage}
            </pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href={customWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const matchedSingle =
                  whatsappModalPayload.type === 'single'
                    ? products.find(
                        (p) =>
                          p.sku === whatsappModalPayload.item.sku ||
                          p.name === whatsappModalPayload.item.name
                      )
                    : undefined;
                const payload =
                  whatsappModalPayload.type === 'single'
                    ? {
                        type: 'single' as const,
                        customerName,
                        customerPhone,
                        city,
                        deliveryAddress,
                        paymentMethod,
                        couponCode: appliedCoupon?.code,
                        discountPkr,
                        shippingPkr: baseDelivery,
                        subtotalPkr: baseSubtotal,
                        items: [
                          {
                            productId: matchedSingle?.id,
                            name: whatsappModalPayload.item.name,
                            sku: whatsappModalPayload.item.sku,
                            image: matchedSingle?.images[0],
                            category: whatsappModalPayload.item.category,
                            size: whatsappModalPayload.item.size,
                            quantity: whatsappModalPayload.item.quantity,
                            unitPricePkr: whatsappModalPayload.item.unitPricePkr,
                          },
                        ],
                        totalPkr: finalTotalPkr,
                        customerNote: customerNote || combinedNote,
                      }
                    : {
                        type: 'cart' as const,
                        customerName,
                        customerPhone,
                        city,
                        deliveryAddress,
                        paymentMethod,
                        couponCode: appliedCoupon?.code,
                        discountPkr,
                        shippingPkr: baseDelivery,
                        subtotalPkr: baseSubtotal,
                        items: detailedCartItems,
                        totalPkr: finalTotalPkr,
                        customerNote: customerNote || combinedNote,
                      };

                const { order } = storageRecordOrder(
                  payload,
                  customerName.trim() || 'storefront'
                );

                void fetch('/api/orders', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  body: JSON.stringify({ ...payload, id: order.id }),
                  keepalive: true,
                }).catch(() => {
                  // Chrome LocalStorage persistence already saved order reliably
                });
                closeWhatsAppModal();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-[#252525] text-[#FFFDF8] text-sm font-medium hover:bg-[#363636] transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#C6A15B]" />
              <span>Continue to WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
            <button
              type="button"
              onClick={closeWhatsAppModal}
              className="px-5 py-3 min-h-[46px] border border-[#252525]/20 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
