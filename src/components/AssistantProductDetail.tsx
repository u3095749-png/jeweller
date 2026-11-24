import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { getDiscountPercentage, type JewelleryProduct } from '../data/products.ts';
import { formatPKR } from '../config/storeConfig.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { MetalFinishKey } from '../types/assistant.ts';
import { JewelryImage } from './JewelryImage.tsx';

const FINISH_OPTIONS: Array<{ key: MetalFinishKey; label: string; swatchClass: string }> = [
  { key: 'champagne-gold', label: 'Champagne Gold', swatchClass: 'bg-[#C6A15B]' },
  { key: 'white-gold', label: 'White Gold', swatchClass: 'bg-[#E5E7EB]' },
  { key: 'sterling-silver', label: 'Sterling Silver', swatchClass: 'bg-[#D1D5DB]' },
  { key: 'rose-gold', label: 'Rose Gold', swatchClass: 'bg-[#D99B82]' },
];

interface AssistantProductDetailProps {
  product: JewelleryProduct;
  onBack: () => void;
  onAskAboutProduct: (product: JewelleryProduct) => void;
}

export function AssistantProductDetail({
  product,
  onBack,
  onAskAboutProduct,
}: AssistantProductDetailProps) {
  const {
    navigate,
    addToCart,
    toggleWishlist,
    isWishlisted,
    getSelectedSize,
    setProductSize,
    getSelectedFinish,
    setProductFinish,
    openSingleWhatsAppOrder,
  } = useStore();

  const [imageIdx, setImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const selectedSize = getSelectedSize(product);
  const selectedFinish = getSelectedFinish(product);
  const saved = isWishlisted(product.id);
  const discountPct = getDiscountPercentage(product);
  const activeImage = product.images[imageIdx] || product.images[0];

  const handlePrevImage = () => {
    setImageIdx((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleNextImage = () => {
    setImageIdx((prev) => (prev + 1) % product.images.length);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F8F5EF]">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#252525]/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-[#FFFDF8] border border-[#252525]/15 text-xs font-medium text-[#252525] hover:border-[#C6A15B] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'product', slug: product.slug })}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#8E6E30] hover:text-[#252525] transition-colors cursor-pointer"
        >
          <span>Full Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Gallery / Carousel */}
      <div className="space-y-2.5">
        <div className="relative aspect-[4/3] w-full bg-[#E8DDCC] border border-[#252525]/10 overflow-hidden">
          <JewelryImage
            src={activeImage}
            alt={product.name}
            className="w-full h-full"
            priority
          />

          {product.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Previous product image"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#FFFDF8]/90 border border-[#252525]/15 flex items-center justify-center text-[#252525] hover:bg-[#FFFDF8] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Next product image"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#FFFDF8]/90 border border-[#252525]/15 flex items-center justify-center text-[#252525] hover:bg-[#FFFDF8] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {product.images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {product.images.map((img, idx) => (
              <button
                key={img + idx}
                type="button"
                onClick={() => setImageIdx(idx)}
                className={`w-16 aspect-[4/3] shrink-0 overflow-hidden border cursor-pointer transition-opacity ${
                  idx === imageIdx
                    ? 'border-[#C6A15B] opacity-100'
                    : 'border-[#252525]/15 opacity-70 hover:opacity-100'
                }`}
              >
                <JewelryImage
                  src={img}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  className="w-full h-full"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Summary & Pricing */}
      <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#252525]/65">
            <span>
              {product.category} <span aria-hidden="true">·</span> {product.collection}
            </span>
            <span className={product.inStock ? 'text-emerald-800 font-medium' : 'text-[#8E6E30] font-medium'}>
              {product.inStock ? 'In Stock' : 'Made to Order'}
            </span>
          </div>

          <h3 className="font-serif text-2xl font-medium text-[#252525] leading-snug">
            {product.name}
          </h3>

          <div className="flex flex-wrap items-baseline gap-2.5 tabular-nums">
            <span className="text-xl font-semibold text-[#252525]">
              {formatPKR(product.pricePkr)}
            </span>
            {product.compareAtPricePkr && product.compareAtPricePkr > product.pricePkr && (
              <>
                <span className="text-sm text-[#252525]/45 line-through">
                  {formatPKR(product.compareAtPricePkr)}
                </span>
                {discountPct !== null && (
                  <span className="text-xs font-semibold text-[#8E6E30]">
                    Save {discountPct}%
                  </span>
                )}
              </>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-[#252525]/75 ml-auto">
              <Star className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-[#252525]/50">({product.reviewCount})</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#252525]/80 leading-relaxed pt-1">
            {product.description}
          </p>
        </div>

        {/* Size Variations */}
        <div className="space-y-2 pt-2 border-t border-[#252525]/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#252525]">Size / Fit</span>
            <span className="text-[#252525]/60">{selectedSize}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setProductSize(product.id, size)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium border transition-colors cursor-pointer ${
                  selectedSize === size
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/18 hover:border-[#252525]/45'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Metal Tone / Color Finish Variations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#252525]">Metal Tone / Finish</span>
            <span className="text-[#252525]/60">
              {FINISH_OPTIONS.find((f) => f.key === selectedFinish)?.label}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {FINISH_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setProductFinish(product.id, opt.key)}
                className={`px-2.5 py-2 min-h-[38px] text-[11px] font-medium border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedFinish === opt.key
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/15 hover:border-[#252525]/45'
                }`}
              >
                <span className={`w-3 h-3 rounded-full border border-black/15 shrink-0 ${opt.swatchClass}`} />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Wishlist */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="inline-flex items-center border border-[#252525]/20 bg-[#F8F5EF]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="w-10 h-10 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center text-xs font-medium tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="w-10 h-10 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className="flex-1 min-h-[40px] px-3 py-2 border border-[#252525]/20 text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-[#C6A15B] text-[#8E6E30]' : 'text-[#252525]/70'}`} />
            <span>{saved ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
          </button>
        </div>

        {/* Purchase Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {product.inStock ? (
            <button
              type="button"
              onClick={() => addToCart(product, selectedSize, quantity, { openDrawer: true })}
              className="w-full py-3 px-4 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#C6A15B]" />
              <span>Add to Cart · {formatPKR(product.pricePkr * quantity)}</span>
            </button>
          ) : (
            <div className="px-3 py-2.5 bg-[#E8DDCC]/70 border border-[#252525]/10 text-[11px] text-[#252525]/85 flex items-center">
              Crafted to order (3–4 weeks). Commission via Buy Now.
            </div>
          )}

          <button
            type="button"
            onClick={() => openSingleWhatsAppOrder(product, selectedSize, quantity)}
            className="w-full py-3 px-4 min-h-[44px] border border-[#C6A15B] bg-[#F8F5EF] text-[#252525] text-xs font-medium hover:bg-[#E8DDCC] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
            <span>Buy Now · Checkout</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAskAboutProduct(product)}
          className="w-full py-2.5 px-4 border border-[#252525]/15 bg-[#FFFDF8] hover:border-[#C6A15B] text-xs font-medium text-[#252525] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8E6E30]" />
          <span>Ask Noor AI About This Piece</span>
        </button>

        {/* Specifications */}
        <dl className="divide-y divide-[#252525]/8 text-xs pt-2 border-t border-[#252525]/10">
          <div className="py-2 flex justify-between gap-4">
            <dt className="text-[#252525]/60">Material</dt>
            <dd className="text-right font-medium text-[#252525]">{product.material}</dd>
          </div>
          <div className="py-2 flex justify-between gap-4">
            <dt className="text-[#252525]/60">Weight</dt>
            <dd className="text-right font-medium text-[#252525] tabular-nums">{product.weightGrams}</dd>
          </div>
          <div className="py-2 flex justify-between gap-4">
            <dt className="text-[#252525]/60">Gemstones</dt>
            <dd className="text-right font-medium text-[#252525]">{product.gemstones}</dd>
          </div>
          <div className="py-2 flex justify-between gap-4">
            <dt className="text-[#252525]/60">Care</dt>
            <dd className="text-right text-[#252525]/80 max-w-[65%]">{product.careNote}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
