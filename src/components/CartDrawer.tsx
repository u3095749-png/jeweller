import React from 'react';
import { X, Plus, Minus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR, STORE_CONFIG } from '../config/storeConfig';
import { JewelryImage } from './JewelryImage';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotalPkr,
    cartDeliveryPkr,
    cartTotalPkr,
    isCartOpen,
    closeCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    openCartWhatsAppOrder,
    navigate,
    getProductById,
    websiteSettings,
  } = useStore();

  if (!isCartOpen) return null;

  const amountRemainingForFreeShipping = Math.max(
    0,
    websiteSettings.freeDeliveryThresholdPkr - cartSubtotalPkr
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div
        className="fixed inset-0 bg-[#252525]/55 backdrop-blur-[2px] transition-opacity"
        onClick={closeCart}
      />

      <aside className="relative z-10 w-full max-w-md bg-[#FFFDF8] h-full flex flex-col border-l border-[#252525]/15 shadow-2xl">
        <div className="px-6 py-5 border-b border-[#252525]/10 flex items-center justify-between bg-[#F8F5EF]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#252525]">
              Shopping Bag
            </h2>
            <p className="text-xs text-[#252525]/60 tabular-nums mt-0.5">
              {cartCount} {cartCount === 1 ? 'piece' : 'pieces'} selected
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close shopping bag"
            className="w-10 h-10 flex items-center justify-center text-[#252525]/70 hover:text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cartCount > 0 && (
          <div className="px-6 py-2.5 bg-[#E8DDCC] border-b border-[#252525]/10 text-xs text-[#252525]/85">
            {amountRemainingForFreeShipping === 0 ? (
              <span>Your bag qualifies for complimentary insured courier delivery across Pakistan.</span>
            ) : (
              <span className="tabular-nums">
                Add {formatPKR(amountRemainingForFreeShipping)} more for complimentary insured delivery.
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <ShoppingBag className="w-10 h-10 text-[#C6A15B] stroke-[1.25] mb-4" />
              <h3 className="font-serif text-2xl text-[#252525] mb-2">Your Bag is Empty</h3>
              <p className="text-sm text-[#252525]/65 max-w-xs mb-6 leading-relaxed">
                Explore our handcrafted 22K gold, solitaire, sterling silver, and bridal pieces priced in Pakistani Rupees.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate({ page: 'shop', category: 'All', subcategory: 'All', collection: 'All', onlyNew: false });
                }}
                className="px-6 py-3 text-xs font-medium bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] transition-colors cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            cart.map((entry) => {
              const product = getProductById(entry.productId);
              if (!product) return null;
              const lineTotal = product.pricePkr * entry.quantity;

              return (
                <div
                  key={`${entry.productId}-${entry.size}`}
                  className="flex gap-4 pb-5 border-b border-[#252525]/10 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      closeCart();
                      navigate({ page: 'product', slug: product.slug });
                    }}
                    className="w-24 h-20 shrink-0 bg-[#E8DDCC] overflow-hidden cursor-pointer"
                  >
                    <JewelryImage
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full"
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            closeCart();
                            navigate({ page: 'product', slug: product.slug });
                          }}
                          className="text-left font-serif text-lg font-semibold text-[#252525] hover:text-[#8E6E30] transition-colors truncate cursor-pointer"
                        >
                          {product.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(entry.productId, entry.size)}
                          aria-label={`Remove ${product.name}`}
                          className="p-1.5 text-[#252525]/45 hover:text-[#252525] transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#252525]/60 mt-0.5 truncate">
                        Size: {entry.size} <span aria-hidden="true">·</span> {formatPKR(product.pricePkr)} each
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#252525]/20 bg-[#F8F5EF]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(entry.productId, entry.size, -1)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium tabular-nums">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(entry.productId, entry.size, 1)}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-[#252525] tabular-nums">
                        {formatPKR(lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[#252525]/10 bg-[#F8F5EF] space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[#252525]/75">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#252525]">
                  {formatPKR(cartSubtotalPkr)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#252525]/75">
                <span>Insured Delivery</span>
                <span className="tabular-nums font-medium text-[#252525]">
                  {cartDeliveryPkr === 0 ? 'Complimentary' : formatPKR(cartDeliveryPkr)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#252525]/10 flex items-center justify-between text-base font-semibold text-[#252525]">
                <span>Total (PKR)</span>
                <span className="tabular-nums">{formatPKR(cartTotalPkr)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={openCartWhatsAppOrder}
              className="w-full py-3.5 px-5 min-h-[46px] flex items-center justify-center gap-2 bg-[#252525] text-[#FFFDF8] text-sm font-medium hover:bg-[#363636] transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#C6A15B]" />
              <span>Order on WhatsApp</span>
            </button>

            <div className="flex items-center justify-between text-xs text-[#252525]/60">
              <span>Orders confirmed via WhatsApp concierge</span>
              <button
                type="button"
                onClick={clearCart}
                className="underline underline-offset-4 hover:text-[#252525] cursor-pointer"
              >
                Clear Bag
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
