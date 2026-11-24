import React from 'react';
import { Check, Eye, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { getDiscountPercentage, type JewelleryProduct } from '../data/products.ts';
import { formatPKR } from '../config/storeConfig.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { BusinessRecommendationCard } from '../types/assistant.ts';
import { JewelryImage } from './JewelryImage.tsx';

interface AssistantProductCardProps {
  product: JewelleryProduct;
  index?: number;
  onOpenDetail?: (product: JewelleryProduct) => void;
  onActionTaken?: (summary: string) => void;
}

export function AssistantProductCard({
  product,
  index,
  onOpenDetail,
  onActionTaken,
}: AssistantProductCardProps) {
  const {
    navigate,
    addToCart,
    toggleWishlist,
    isWishlisted,
    getSelectedSize,
    setProductSize,
    assistantSelectedProductId,
    setAssistantSelectedProductId,
    openSingleWhatsAppOrder,
  } = useStore();

  const selectedSize = getSelectedSize(product);
  const isSelected = assistantSelectedProductId === product.id;
  const saved = isWishlisted(product.id);
  const discountPercent = getDiscountPercentage(product);

  const openDetails = () => {
    if (onOpenDetail) {
      onOpenDetail(product);
    } else {
      navigate({ page: 'product', slug: product.slug });
    }
  };

  const handleAdd = () => {
    if (!product.inStock) {
      openSingleWhatsAppOrder(product, selectedSize, 1);
      onActionTaken?.(`Opened WhatsApp commission inquiry for ${product.name}`);
      return;
    }
    const result = addToCart(product, selectedSize, 1, { openDrawer: false });
    if (result.ok) {
      setAssistantSelectedProductId(product.id);
      onActionTaken?.(`Added ${product.name} (${result.sizeUsed}) to bag`);
    }
  };

  return (
    <div
      className={`bg-[#FFFDF8] border transition-colors p-2.5 space-y-2.5 ${
        isSelected ? 'border-[#C6A15B] ring-1 ring-[#C6A15B]/40' : 'border-[#252525]/12'
      }`}
    >
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={openDetails}
          className="relative w-24 h-20 shrink-0 bg-[#E8DDCC] overflow-hidden cursor-pointer border border-[#252525]/10"
        >
          <JewelryImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full"
          />
          {typeof index === 'number' && (
            <span className="absolute top-1 left-1 w-4 h-4 bg-[#252525]/85 text-[#FFFDF8] text-[10px] font-medium flex items-center justify-center">
              {index + 1}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={openDetails}
              className="text-left font-serif text-sm font-semibold text-[#252525] leading-snug hover:text-[#8E6E30] transition-colors cursor-pointer line-clamp-1"
            >
              {product.name}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
              className="p-1 text-[#252525]/60 hover:text-[#8E6E30] cursor-pointer shrink-0"
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-[#C6A15B] text-[#8E6E30]' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
            <span className="text-xs font-semibold text-[#252525]">
              {formatPKR(product.pricePkr)}
            </span>
            {product.compareAtPricePkr && product.compareAtPricePkr > product.pricePkr && (
              <>
                <span className="text-[11px] text-[#252525]/45 line-through">
                  {formatPKR(product.compareAtPricePkr)}
                </span>
                {discountPercent !== null && (
                  <span className="text-[10px] font-semibold text-[#8E6E30]">
                    -{discountPercent}%
                  </span>
                )}
              </>
            )}
            <span className="inline-flex items-center gap-0.5 text-[11px] text-[#252525]/65 ml-auto">
              <Star className="w-3 h-3 fill-[#C6A15B] text-[#C6A15B]" />
              {product.rating.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#252525]/60">
            <span>{product.inStock ? 'In Stock' : 'Made to Order'}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.material}</span>
          </div>
        </div>
      </div>

      {/* Size Picker when multiple sizes exist */}
      {product.availableSizes.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[10px] text-[#252525]/55 mr-0.5">Size:</span>
          {product.availableSizes.slice(0, 5).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setProductSize(product.id, size)}
              className={`px-1.5 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer ${
                selectedSize === size
                  ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                  : 'bg-[#F8F5EF] text-[#252525]/80 border-[#252525]/15 hover:border-[#252525]/40'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons: View Details, Select, Add to Cart, Buy Now */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={openDetails}
          className="px-2 py-1.5 min-h-[34px] border border-[#252525]/18 bg-[#F8F5EF] hover:bg-[#E8DDCC] text-[11px] font-medium text-[#252525] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3 h-3 text-[#8E6E30]" />
          <span>View Details</span>
        </button>

        <button
          type="button"
          onClick={() => setAssistantSelectedProductId(isSelected ? null : product.id)}
          className={`px-2 py-1.5 min-h-[34px] border text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
            isSelected
              ? 'border-[#C6A15B] bg-[#E8DDCC] text-[#252525]'
              : 'border-[#252525]/18 bg-[#FFFDF8] text-[#252525]/80 hover:border-[#252525]/40'
          }`}
        >
          <Check className={`w-3 h-3 ${isSelected ? 'text-[#8E6E30]' : 'text-[#252525]/50'}`} />
          <span>{isSelected ? 'Selected' : 'Select'}</span>
        </button>

        <button
          type="button"
          onClick={handleAdd}
          className="px-2 py-1.5 min-h-[34px] bg-[#252525] hover:bg-[#363636] text-[#FFFDF8] text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ShoppingBag className="w-3 h-3 text-[#C6A15B]" />
          <span>{product.inStock ? 'Add to Cart' : 'Commission'}</span>
        </button>

        <button
          type="button"
          onClick={() => openSingleWhatsAppOrder(product, selectedSize, 1)}
          className="px-2 py-1.5 min-h-[34px] border border-[#C6A15B] bg-[#F8F5EF] hover:bg-[#E8DDCC] text-[#252525] text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <MessageCircle className="w-3 h-3 text-[#8E6E30]" />
          <span>Buy Now</span>
        </button>
      </div>
    </div>
  );
}

interface AssistantCompareCardProps {
  productIds: string[];
  onOpenDetail?: (product: JewelleryProduct) => void;
}

export function AssistantCompareCard({ productIds, onOpenDetail }: AssistantCompareCardProps) {
  const { navigate, addToCart, getSelectedSize, openSingleWhatsAppOrder, getProductById } = useStore();
  const items = productIds
    .map((id) => getProductById(id))
    .filter((p): p is JewelleryProduct => Boolean(p))
    .slice(0, 2);

  if (items.length < 2) return null;

  return (
    <div className="bg-[#FFFDF8] border border-[#C6A15B]/60 p-3 space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E6E30]">
        Side-by-Side Comparison
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const size = getSelectedSize(item);
          return (
            <div key={item.id} className="space-y-1.5 min-w-0">
              <button
                type="button"
                onClick={() =>
                  onOpenDetail
                    ? onOpenDetail(item)
                    : navigate({ page: 'product', slug: item.slug })
                }
                className="w-full aspect-[4/3] bg-[#E8DDCC] overflow-hidden border border-[#252525]/10 cursor-pointer block"
              >
                <JewelryImage src={item.images[0]} alt={item.name} className="w-full h-full" />
              </button>
              <p className="font-serif text-xs font-semibold text-[#252525] leading-snug line-clamp-2 min-h-[2rem]">
                {item.name}
              </p>
              <p className="text-xs font-semibold text-[#252525] tabular-nums">
                {formatPKR(item.pricePkr)}
              </p>
              <dl className="text-[10px] text-[#252525]/75 space-y-1 border-t border-[#252525]/10 pt-1.5">
                <div>
                  <dt className="text-[#252525]/50">Material</dt>
                  <dd className="font-medium text-[#252525] truncate">{item.material}</dd>
                </div>
                <div>
                  <dt className="text-[#252525]/50">Weight</dt>
                  <dd className="font-medium text-[#252525] tabular-nums">{item.weightGrams}</dd>
                </div>
                <div>
                  <dt className="text-[#252525]/50">Stock</dt>
                  <dd className="font-medium text-[#252525]">
                    {item.inStock ? 'In Stock' : 'Made to Order'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#252525]/50">Rating</dt>
                  <dd className="font-medium text-[#252525]">
                    ★ {item.rating.toFixed(1)} ({item.reviewCount})
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDetail
                        ? onOpenDetail(item)
                        : navigate({ page: 'product', slug: item.slug })
                    }
                    className="flex-1 py-1.5 text-[10px] font-medium border border-[#252525]/20 bg-[#F8F5EF] hover:bg-[#E8DDCC] cursor-pointer"
                  >
                    Details
                  </button>
                  {item.inStock && (
                    <button
                      type="button"
                      onClick={() => addToCart(item, size, 1)}
                      className="flex-1 py-1.5 text-[10px] font-medium bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openSingleWhatsAppOrder(item, size, 1)}
                  className="w-full py-1.5 text-[10px] font-medium border border-[#C6A15B] bg-[#FFFDF8] hover:bg-[#E8DDCC] text-[#252525] cursor-pointer"
                >
                  Buy Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AssistantBusinessCardProps {
  card: BusinessRecommendationCard;
  onOpenDetail?: (product: JewelleryProduct) => void;
}

export function AssistantBusinessCard({ card, onOpenDetail }: AssistantBusinessCardProps) {
  const { getProductById } = useStore();
  const product = getProductById(card.productId);
  if (!product) return null;

  return (
    <div className="bg-[#FFFDF8] border border-[#C6A15B]/55 p-3 space-y-2">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onOpenDetail?.(product)}
          className="w-14 h-12 shrink-0 bg-[#E8DDCC] overflow-hidden border border-[#252525]/10 cursor-pointer"
        >
          <JewelryImage src={product.images[0]} alt={product.name} className="w-full h-full" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm font-semibold text-[#252525] truncate">{product.name}</p>
          <p className="text-[11px] text-[#252525]/65 tabular-nums">
            Cost: {formatPKR(card.purchaseCostPkr)} <span aria-hidden="true">·</span> Price: {formatPKR(card.sellingPricePkr)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-1.5 border-y border-[#252525]/10 text-xs tabular-nums">
        <div>
          <span className="block text-[10px] text-[#252525]/55">Expected Profit</span>
          <span className={`font-semibold ${card.estimatedProfitPkr > 0 ? 'text-emerald-800' : 'text-red-700'}`}>
            {formatPKR(card.estimatedProfitPkr)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-[#252525]/55">Profit Margin</span>
          <span className="font-semibold text-[#8E6E30]">{card.profitMarginPct.toFixed(2)}%</span>
        </div>
      </div>

      {typeof card.actualProfitPkr === 'number' && (
        <p className="text-[11px] text-[#252525] tabular-nums">
          Actual Profit ({card.unitsSold} sold): <strong>{formatPKR(card.actualProfitPkr)}</strong>
        </p>
      )}

      <p className="text-[11px] text-[#252525]/80 leading-snug">{card.recommendation}</p>
    </div>
  );
}
