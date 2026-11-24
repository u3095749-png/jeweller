import React, { useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  COLLECTIONS,
  JewelleryCollection,
  MainCategory,
  SUBCATEGORIES,
  Subcategory,
} from '../data/products';
import { formatPKR } from '../config/storeConfig';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { ShopPriceRangeKey, ShopSortKey } from '../types/assistant';

export function ShopView() {
  const { shopFilters, applyShopFilters, resetShopFilters, products, mainCategories } = useStore();
  const {
    searchQuery,
    category: selectedCategory,
    subcategory: selectedSubcategory,
    collection: selectedCollection,
    onlyNewArrivals,
    priceRange,
    minPricePkr,
    maxPricePkr,
    sortBy,
  } = shopFilters;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (
        selectedCategory !== 'All' &&
        p.category !== selectedCategory &&
        !p.categories.includes(selectedCategory)
      ) {
        return false;
      }
      if (selectedSubcategory !== 'All' && p.subcategory !== selectedSubcategory) {
        return false;
      }
      if (selectedCollection !== 'All' && p.collection !== selectedCollection) {
        return false;
      }
      if (onlyNewArrivals && !p.isNewArrival) return false;

      if (priceRange === 'under-50k' && p.pricePkr >= 50000) return false;
      if (priceRange === '50k-150k' && (p.pricePkr < 50000 || p.pricePkr > 150000)) return false;
      if (priceRange === '150k-250k' && (p.pricePkr < 150000 || p.pricePkr > 250000)) return false;
      if (priceRange === 'above-250k' && p.pricePkr <= 250000) return false;
      if (priceRange === 'custom') {
        if (typeof minPricePkr === 'number' && p.pricePkr < minPricePkr) return false;
        if (typeof maxPricePkr === 'number' && p.pricePkr > maxPricePkr) return false;
      }

      if (q) {
        const hay = `${p.name} ${p.category} ${p.categories.join(' ')} ${p.subcategory || ''} ${p.collection} ${p.material} ${p.gemstones} ${p.shortDescription} ${p.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
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
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedCollection,
    priceRange,
    minPricePkr,
    maxPricePkr,
    onlyNewArrivals,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedSubcategory !== 'All' ||
    selectedCollection !== 'All' ||
    priceRange !== 'all' ||
    onlyNewArrivals;

  const headingTitle = onlyNewArrivals
    ? 'New Arrivals'
    : selectedSubcategory !== 'All'
    ? selectedSubcategory
    : selectedCategory !== 'All'
    ? selectedCategory
    : selectedCollection !== 'All'
    ? selectedCollection
    : 'All Jewellery';

  const customPriceBadge =
    priceRange === 'custom'
      ? typeof minPricePkr === 'number' && typeof maxPricePkr === 'number'
        ? `${formatPKR(minPricePkr)} – ${formatPKR(maxPricePkr)}`
        : typeof maxPricePkr === 'number'
        ? `Under ${formatPKR(maxPricePkr)}`
        : typeof minPricePkr === 'number'
        ? `Above ${formatPKR(minPricePkr)}`
        : null
      : null;

  return (
    <section className="py-10 lg:py-14 bg-[#F8F5EF] min-h-[75vh]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-7">
        <div className="border-b border-[#252525]/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
              Fine Jewellery Catalogue
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#252525] mt-1">
              {headingTitle}
            </h1>
          </div>

          <p className="text-sm text-[#252525]/65 tabular-nums">
            Showing {filteredProducts.length} of {products.length} pieces
          </p>
        </div>

        {/* Main Category Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() =>
              applyShopFilters({ category: 'All', subcategory: 'All' })
            }
            className={`px-4 py-2 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              selectedCategory === 'All' && selectedSubcategory === 'All'
                ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                : 'bg-[#FFFDF8] text-[#252525]/75 border-[#252525]/15 hover:border-[#252525]/40 hover:text-[#252525]'
            }`}
          >
            All Categories
          </button>
          {mainCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                applyShopFilters({ category: category as MainCategory, subcategory: 'All' })
              }
              className={`px-4 py-2 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                selectedCategory === category
                  ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                  : 'bg-[#FFFDF8] text-[#252525]/75 border-[#252525]/15 hover:border-[#252525]/40 hover:text-[#252525]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search, Subcategory, Collection, Price & Sort Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-[#E8DDCC]/55 border border-[#252525]/10">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#252525]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => applyShopFilters({ searchQuery: e.target.value })}
              placeholder="Search rings, diamonds, 925 silver, Polki..."
              aria-label="Search jewellery products"
              className="w-full pl-10 pr-4 py-2.5 min-h-[42px] bg-[#FFFDF8] border border-[#252525]/15 text-sm text-[#252525] placeholder:text-[#252525]/45 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by subcategory"
              value={selectedSubcategory}
              onChange={(e) =>
                applyShopFilters({ subcategory: e.target.value as Subcategory | 'All' })
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-[#FFFDF8] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B] cursor-pointer"
            >
              <option value="All">All Subcategories</option>
              {SUBCATEGORIES.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by collection"
              value={selectedCollection}
              onChange={(e) =>
                applyShopFilters({ collection: e.target.value as JewelleryCollection | 'All' })
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-[#FFFDF8] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B] cursor-pointer"
            >
              <option value="All">All Collections</option>
              {COLLECTIONS.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by price range in PKR"
              value={priceRange}
              onChange={(e) =>
                applyShopFilters({ priceRange: e.target.value as ShopPriceRangeKey })
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-[#FFFDF8] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B] cursor-pointer"
            >
              <option value="all">All Prices (PKR)</option>
              <option value="under-50k">Under Rs. 50,000</option>
              <option value="50k-150k">Rs. 50,000 – Rs. 150,000</option>
              <option value="150k-250k">Rs. 150,000 – Rs. 250,000</option>
              <option value="above-250k">Above Rs. 250,000</option>
              {priceRange === 'custom' && customPriceBadge && (
                <option value="custom">{customPriceBadge}</option>
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => applyShopFilters({ sortBy: e.target.value as ShopSortKey })}
              className="w-full px-3 py-2.5 min-h-[42px] bg-[#FFFDF8] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B] cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest Arrivals</option>
              <option value="popular">Popularity</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyShopFilters({ onlyNewArrivals: !onlyNewArrivals })}
              className={`inline-flex items-center gap-2 px-3.5 py-2 border transition-colors cursor-pointer ${
                onlyNewArrivals
                  ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                  : 'bg-[#FFFDF8] text-[#252525]/75 border-[#252525]/15 hover:border-[#252525]/40'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Only New Arrivals</span>
            </button>

            {customPriceBadge && (
              <button
                type="button"
                onClick={() =>
                  applyShopFilters({
                    priceRange: 'all',
                    minPricePkr: undefined,
                    maxPricePkr: undefined,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FFFDF8] border border-[#C6A15B] text-[#252525] cursor-pointer"
              >
                <span>Price: {customPriceBadge}</span>
                <X className="w-3.5 h-3.5 text-[#8E6E30]" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => resetShopFilters(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E6E30] hover:text-[#252525] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-20 px-6 text-center bg-[#FFFDF8] border border-[#252525]/10">
            <h2 className="font-serif text-3xl text-[#252525] mb-2">
              No Matching Pieces Available
            </h2>
            <p className="text-sm text-[#252525]/65 max-w-md mx-auto mb-6 leading-relaxed">
              No jewellery pieces match your current filter selection. Reset filters or message our concierge on WhatsApp for bespoke commissions.
            </p>
            <button
              type="button"
              onClick={() => resetShopFilters(true)}
              className="px-6 py-3 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors cursor-pointer"
            >
              Reset Catalogue Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
