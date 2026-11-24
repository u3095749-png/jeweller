import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Heart,
  MessageCircle,
  Search,
  ShoppingBag,
  Star,
} from 'lucide-react';
import {
  getDiscountPercentage,
  type JewelleryProduct,
} from '../data/products.ts';
import { formatPKR } from '../config/storeConfig.ts';
import { useStore } from '../context/StoreContext.tsx';
import {
  CHATBOT_CATEGORIES,
  type ChatbotCategoryTab,
  type ShopSortKey,
} from '../types/assistant.ts';
import { JewelryImage } from './JewelryImage.tsx';

interface AssistantStoreCatalogProps {
  isMaximized: boolean;
  activeCategory: ChatbotCategoryTab;
  onSelectCategory: (cat: ChatbotCategoryTab) => void;
  onOpenProductDetail: (product: JewelleryProduct) => void;
  compareSelectedIds: string[];
  onToggleCompareId: (productId: string) => void;
}

const INITIAL_BATCH = 6;
const BATCH_STEP = 6;

export function AssistantStoreCatalog({
  isMaximized,
  activeCategory,
  onSelectCategory,
  onOpenProductDetail,
  compareSelectedIds,
  onToggleCompareId,
}: AssistantStoreCatalogProps) {
  const {
    products,
    mainCategories,
    addToCart,
    toggleWishlist,
    isWishlisted,
    getSelectedSize,
    assistantSelectedProductId,
    setAssistantSelectedProductId,
    openSingleWhatsAppOrder,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ShopSortKey>('featured');
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categoryTabs = useMemo(() => {
    const merged = Array.from(new Set([...CHATBOT_CATEGORIES, ...mainCategories]));
    return merged;
  }, [mainCategories]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = products.filter((p) => {
      if (activeCategory === 'New Arrivals' && !p.isNewArrival) return false;
      else if (activeCategory === 'Best Sellers' && !p.isBestSeller) return false;
      else if (
        activeCategory === 'Sale' &&
        !(p.compareAtPricePkr && p.compareAtPricePkr > p.pricePkr)
      ) {
        return false;
      } else if (
        activeCategory !== 'All Products' &&
        activeCategory !== 'New Arrivals' &&
        activeCategory !== 'Best Sellers' &&
        activeCategory !== 'Sale'
      ) {
        if (p.category !== activeCategory && !p.categories.includes(activeCategory)) {
          return false;
        }
      }

      if (q) {
        const hay = `${p.name} ${p.category} ${p.categories.join(' ')} ${p.collection} ${p.material} ${p.gemstones} ${p.shortDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...matched];
    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.pricePkr - b.pricePkr);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.pricePkr - a.pricePkr);
        break;
      case 'newest':
        sorted.sort((a, b) => b.releasedOrder - a.releasedOrder);
        break;
      case 'popular':
        sorted.sort((a, b) => b.popularityScore - a.popularityScore);
        break;
      case 'featured':
      default:
        sorted.sort(
          (a, b) =>
            Number(b.isBestSeller) - Number(a.isBestSeller) ||
            b.popularityScore - a.popularityScore
        );
        break;
    }
    return sorted;
  }, [products, activeCategory, searchQuery, sortBy]);

  // Reset pagination cleanly when category or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [activeCategory, searchQuery, sortBy]);

  // Infinite scroll auto-load when sentinel enters scroll viewport
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    if (visibleCount >= filteredProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingBatch) {
          setIsLoadingBatch(true);
          window.setTimeout(() => {
            setVisibleCount((prev) => Math.min(filteredProducts.length, prev + BATCH_STEP));
            setIsLoadingBatch(false);
          }, 140);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredProducts.length, isLoadingBatch, visibleCount]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F5EF]">
      {/* Automatic Product Category Bar */}
      <div className="px-3.5 py-2.5 bg-[#FFFDF8] border-b border-[#252525]/10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categoryTabs.map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className={`px-3 py-1.5 min-h-[34px] text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#F8F5EF] text-[#252525]/80 border-[#252525]/15 hover:border-[#C6A15B] hover:text-[#252525]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Search + Sort Bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#252525]/45 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rings, Polki, diamonds, silver..."
              aria-label="Search store inside assistant"
              className="w-full pl-8 pr-2.5 py-1.5 min-h-[36px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] placeholder:text-[#252525]/45 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <select
            aria-label="Sort products inside assistant"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ShopSortKey)}
            className="px-2.5 py-1.5 min-h-[36px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] focus:outline-none focus:border-[#C6A15B] cursor-pointer shrink-0"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
            <option value="price-asc">Price: Low–High</option>
            <option value="price-desc">Price: High–Low</option>
          </select>
        </div>
      </div>

      {/* Scrollable Product Collection Grid */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#252525]/65">
          <span>
            Showing <strong className="text-[#252525]">{visibleProducts.length}</strong> of{' '}
            <strong className="text-[#252525]">{filteredProducts.length}</strong> pieces
          </span>
          <span>Tap any piece to inspect gallery &amp; sizes</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#FFFDF8] border border-[#252525]/10 space-y-3">
            <p className="font-serif text-xl text-[#252525]">No Matching Pieces</p>
            <p className="text-xs text-[#252525]/65 max-w-xs mx-auto">
              No jewellery items match that filter. Reset to All Products to view our full collection.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectCategory('All Products');
              }}
              className="px-4 py-2 bg-[#252525] text-[#FFFDF8] text-xs font-medium cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-3 ${
              isMaximized ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {visibleProducts.map((product) => {
              const discountPct = getDiscountPercentage(product);
              const saved = isWishlisted(product.id);
              const isSelected = assistantSelectedProductId === product.id;
              const isCompared = compareSelectedIds.includes(product.id);
              const selectedSize = getSelectedSize(product);

              return (
                <article
                  key={product.id}
                  className={`bg-[#FFFDF8] border flex flex-col justify-between transition-colors ${
                    isSelected || isCompared
                      ? 'border-[#C6A15B] ring-1 ring-[#C6A15B]/40'
                      : 'border-[#252525]/12 hover:border-[#C6A15B]/75'
                  }`}
                >
                  <div>
                    {/* Clickable Large Product Photo */}
                    <div className="relative aspect-[4/3] w-full bg-[#E8DDCC] overflow-hidden group">
                      <button
                        type="button"
                        onClick={() => onOpenProductDetail(product)}
                        className="w-full h-full block cursor-pointer"
                        aria-label={`Open details for ${product.name}`}
                      >
                        <JewelryImage
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </button>

                      {/* Wishlist Heart */}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        className="absolute top-2 right-2 w-8 h-8 bg-[#FFFDF8]/90 border border-[#252525]/15 flex items-center justify-center text-[#252525] hover:border-[#C6A15B] cursor-pointer"
                      >
                        <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-[#C6A15B] text-[#8E6E30]' : ''}`} />
                      </button>

                      {/* Compare Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleCompareId(product.id)}
                        className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-medium border cursor-pointer transition-colors ${
                          isCompared
                            ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                            : 'bg-[#FFFDF8]/90 text-[#252525] border-[#252525]/15 hover:border-[#C6A15B]'
                        }`}
                      >
                        {isCompared ? 'Compare ✓' : 'Compare'}
                      </button>
                    </div>

                    {/* Product Details */}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#252525]/60">
                        <span className="truncate">{product.category}</span>
                        <span className={product.inStock ? 'text-emerald-800 font-medium shrink-0' : 'text-[#8E6E30] font-medium shrink-0'}>
                          {product.inStock ? 'In Stock' : 'Made to Order'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenProductDetail(product)}
                        className="text-left font-serif text-base font-semibold text-[#252525] hover:text-[#8E6E30] transition-colors line-clamp-1 cursor-pointer w-full"
                      >
                        {product.name}
                      </button>

                      <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                        <span className="text-sm font-semibold text-[#252525]">
                          {formatPKR(product.pricePkr)}
                        </span>
                        {product.compareAtPricePkr && product.compareAtPricePkr > product.pricePkr && (
                          <>
                            <span className="text-xs text-[#252525]/45 line-through">
                              {formatPKR(product.compareAtPricePkr)}
                            </span>
                            {discountPct !== null && (
                              <span className="text-[11px] font-semibold text-[#8E6E30]">
                                -{discountPct}%
                              </span>
                            )}
                          </>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-[#252525]/70 ml-auto">
                          <Star className="w-3 h-3 fill-[#C6A15B] text-[#C6A15B]" />
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions: Select, View Details, Add to Cart, Buy Now */}
                  <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssistantSelectedProductId(isSelected ? null : product.id)}
                      className={`px-2 py-2 min-h-[36px] text-[11px] font-medium border inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#E8DDCC] border-[#C6A15B] text-[#252525]'
                          : 'bg-[#F8F5EF] border-[#252525]/15 text-[#252525] hover:border-[#C6A15B]'
                      }`}
                    >
                      <Check className="w-3 h-3 text-[#8E6E30]" />
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProductDetail(product)}
                      className="px-2 py-2 min-h-[36px] text-[11px] font-medium border border-[#252525]/15 bg-[#FFFDF8] hover:border-[#252525]/45 text-[#252525] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3 text-[#8E6E30]" />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        product.inStock
                          ? addToCart(product, selectedSize, 1, { openDrawer: false })
                          : onOpenProductDetail(product)
                      }
                      className="px-2 py-2 min-h-[36px] text-[11px] font-medium bg-[#252525] hover:bg-[#363636] text-[#FFFDF8] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ShoppingBag className="w-3 h-3 text-[#C6A15B]" />
                      <span>{product.inStock ? 'Add to Cart' : 'Commission'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openSingleWhatsAppOrder(product, selectedSize, 1)}
                      className="px-2 py-2 min-h-[36px] text-[11px] font-medium border border-[#C6A15B] bg-[#F8F5EF] hover:bg-[#E8DDCC] text-[#252525] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <MessageCircle className="w-3 h-3 text-[#8E6E30]" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Skeleton Loading Cards during pagination */}
            {isLoadingBatch &&
              Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  aria-hidden="true"
                  className="bg-[#FFFDF8] border border-[#252525]/10 p-3 space-y-2.5 animate-pulse"
                >
                  <div className="aspect-[4/3] w-full bg-[#E8DDCC]" />
                  <div className="h-4 w-3/4 bg-[#E8DDCC]" />
                  <div className="h-3.5 w-1/2 bg-[#E8DDCC]" />
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <div className="h-9 bg-[#E8DDCC]" />
                    <div className="h-9 bg-[#E8DDCC]" />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Infinite Scroll Sentinel + Manual Load More Fallback */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-3 flex justify-center">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((prev) => Math.min(filteredProducts.length, prev + BATCH_STEP))
              }
              className="px-4 py-2 min-h-[40px] bg-[#FFFDF8] border border-[#252525]/20 hover:border-[#C6A15B] text-xs font-medium text-[#252525] cursor-pointer"
            >
              Load More Jewellery ({filteredProducts.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
