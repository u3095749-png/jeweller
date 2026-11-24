import React from 'react';
import { Box, Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import { JewelleryProduct, getDiscountPercentage } from '../data/products';
import { formatPKR } from '../config/storeConfig';
import { useStore } from '../context/StoreContext';
import { JewelryImage } from './JewelryImage';

interface ProductCardProps {
  product: JewelleryProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const {
    navigate,
    addToCart,
    toggleWishlist,
    isWishlisted,
    openQuickView,
    openSingleWhatsAppOrder,
  } = useStore();

  const saved = isWishlisted(product.id);
  const discountPercent = getDiscountPercentage(product);

  return (
    <article className="group flex flex-col bg-[#FFFDF8] border border-[#252525]/10 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(37,37,37,0.16)]">
      {/* Image Canvas */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E8DDCC]">
        <button
          type="button"
          onClick={() => navigate({ page: 'product', slug: product.slug })}
          className="block w-full h-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C6A15B]"
          aria-label={`View ${product.name}`}
        >
          <JewelryImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </button>

        {/* Top-Left Real Discount Badge / Interactive 3D Indicator */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {discountPercent !== null && (
            <span className="px-2.5 py-1 bg-[#252525] text-[#FFFDF8] text-[11px] font-semibold tracking-wide tabular-nums">
              -{discountPercent}% OFF
            </span>
          )}
          {product.model3dType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFFDF8]/92 border border-[#252525]/12 text-[11px] font-medium text-[#252525]">
              <Box className="w-3 h-3 text-[#8E6E30]" />
              <span>3D View</span>
            </span>
          )}
        </div>

        {/* Top-Right Wishlist & Quick View Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className="w-10 h-10 flex items-center justify-center bg-[#FFFDF8]/92 border border-[#252525]/12 text-[#252525] hover:bg-[#FFFDF8] transition-colors cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                saved ? 'fill-[#C6A15B] text-[#8E6E30]' : 'text-[#252525]/70'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => openQuickView(product)}
            aria-label={`Quick view ${product.name}`}
            title="Quick View"
            className="w-10 h-10 flex items-center justify-center bg-[#FFFDF8]/92 border border-[#252525]/12 text-[#252525] hover:bg-[#FFFDF8] transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#252525]/75" />
          </button>
        </div>
      </div>

      {/* Product Body */}
      <div className="flex flex-col flex-1 p-5 gap-2.5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#252525]/60">
          <span className="truncate">
            {product.category} <span aria-hidden="true">·</span> {product.collection}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 font-medium text-[#252525] tabular-nums">
            <Star className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-[#252525]/50">({product.reviewCount})</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate({ page: 'product', slug: product.slug })}
          className="text-left cursor-pointer"
        >
          <h3 className="font-serif text-xl font-semibold text-[#252525] leading-snug group-hover:text-[#8E6E30] transition-colors line-clamp-1">
            {product.name}
          </h3>
        </button>

        <p className="text-xs text-[#252525]/65 line-clamp-2 leading-relaxed">
          {product.shortDescription}
        </p>

        {/* Price Row */}
        <div className="pt-1 flex items-baseline gap-2.5 tabular-nums">
          <span className="text-[15px] font-semibold text-[#252525]">
            {formatPKR(product.pricePkr)}
          </span>
          {product.compareAtPricePkr && product.compareAtPricePkr > product.pricePkr && (
            <span className="text-xs text-[#252525]/45 line-through">
              {formatPKR(product.compareAtPricePkr)}
            </span>
          )}
        </div>

        {/* Action Footer: View Details + Add to Cart */}
        <div className="mt-auto pt-3 border-t border-[#252525]/8 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate({ page: 'product', slug: product.slug })}
            className="inline-flex items-center justify-center px-3 py-2.5 min-h-[40px] text-xs font-medium border border-[#252525]/18 text-[#252525] hover:border-[#C6A15B] hover:text-[#8E6E30] transition-colors whitespace-nowrap cursor-pointer"
          >
            View Details
          </button>

          <button
            type="button"
            onClick={() =>
              product.inStock
                ? addToCart(product, product.availableSizes[0], 1)
                : openSingleWhatsAppOrder(product)
            }
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-medium bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>{product.inStock ? 'Add to Cart' : 'Inquire'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
