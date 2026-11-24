import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { getDiscountPercentage } from '../data/products';
import { formatPKR } from '../config/storeConfig';
import { useStore } from '../context/StoreContext';
import { JewelryImage } from '../components/JewelryImage';
import { Jewelry3DViewer } from '../components/Jewelry3DViewer';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailViewProps {
  slug: string;
}

export function ProductDetailView({ slug }: ProductDetailViewProps) {
  const {
    navigate,
    products,
    getProductBySlug,
    addToCart,
    toggleWishlist,
    isWishlisted,
    openSingleWhatsAppOrder,
    getSelectedSize,
    setProductSize,
  } = useStore();
  const product = getProductBySlug(slug);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mediaMode, setMediaMode] = useState<'photo' | '3d'>('photo');
  const [quantity, setQuantity] = useState(1);

  const selectedSize = product ? getSelectedSize(product) : 'Standard';

  useEffect(() => {
    if (product) {
      setSelectedImageIdx(0);
      setMediaMode('photo');
      setQuantity(1);
    }
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) =>
          p.id !== product.id &&
          (p.category === product.category || p.collection === product.collection)
      )
      .slice(0, 3);
  }, [product, products]);

  if (!product) {
    return (
      <section className="py-24 px-4 text-center max-w-xl mx-auto">
        <h1 className="font-serif text-3xl text-[#252525] mb-3">Piece Not Found</h1>
        <p className="text-sm text-[#252525]/65 mb-6">
          This jewellery item may have been archived or moved. Explore our current collections below.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate({
              page: 'shop',
              category: 'All',
              subcategory: 'All',
              collection: 'All',
              onlyNew: false,
            })
          }
          className="px-6 py-3 bg-[#252525] text-[#FFFDF8] text-xs font-medium cursor-pointer"
        >
          Return to Shop
        </button>
      </section>
    );
  }

  const saved = isWishlisted(product.id);
  const discountPercent = getDiscountPercentage(product);
  const activeImage = product.images[selectedImageIdx] || product.images[0];
  const lineTotal = product.pricePkr * quantity;

  return (
    <div className="bg-[#F8F5EF] pb-20 lg:pb-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-12">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#252525]/60 mb-8">
          <button
            type="button"
            onClick={() =>
              navigate({
                page: 'shop',
                category: 'All',
                subcategory: 'All',
                collection: 'All',
                onlyNew: false,
              })
            }
            className="inline-flex items-center gap-1.5 text-[#252525] hover:text-[#8E6E30] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shop</span>
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() =>
              navigate({
                page: 'shop',
                category: product.category,
                subcategory: 'All',
                collection: 'All',
                onlyNew: false,
              })
            }
            className="hover:text-[#252525] transition-colors cursor-pointer"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#252525] truncate">{product.name}</span>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Sticky Gallery / On-Demand Interactive 3D Left */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
            <div className="aspect-[4/3] w-full bg-[#E8DDCC] border border-[#252525]/10 overflow-hidden">
              {mediaMode === '3d' && product.model3dType ? (
                <Jewelry3DViewer
                  modelType={product.model3dType}
                  productName={product.name}
                  fallbackImage={activeImage}
                  initialFinish={product.default3dFinish}
                  className="w-full h-full"
                />
              ) : (
                <JewelryImage
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full"
                  priority
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Photo Thumbnails */}
              <div className="flex items-center gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={img + idx}
                    type="button"
                    onClick={() => {
                      setMediaMode('photo');
                      setSelectedImageIdx(idx);
                    }}
                    className={`w-24 aspect-[4/3] overflow-hidden border transition-colors cursor-pointer ${
                      mediaMode === 'photo' && idx === selectedImageIdx
                        ? 'border-[#C6A15B]'
                        : 'border-[#252525]/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <JewelryImage
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>

              {/* Photo vs Interactive 3D Mode Switcher (ONLY when real 3D model exists) */}
              {product.model3dType && (
                <div className="inline-flex items-center border border-[#252525]/15 bg-[#FFFDF8]">
                  <button
                    type="button"
                    onClick={() => setMediaMode('photo')}
                    className={`px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      mediaMode === 'photo'
                        ? 'bg-[#252525] text-[#FFFDF8]'
                        : 'text-[#252525] hover:bg-[#E8DDCC]'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Studio Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaMode('3d')}
                    className={`px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      mediaMode === '3d'
                        ? 'bg-[#252525] text-[#FFFDF8]'
                        : 'text-[#252525] hover:bg-[#E8DDCC]'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-[#C6A15B]" />
                    <span>Interactive 3D</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Purchase Module Right */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 bg-[#FFFDF8] p-6 sm:p-8 border border-[#252525]/10">
            <div className="space-y-3 border-b border-[#252525]/10 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#252525]/60">
                <span>{product.category}</span>
                {product.subcategory && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{product.subcategory}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{product.collection}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#8E6E30] font-medium">
                  {product.inStock ? 'Ready to Dispatch' : 'Made to Order (3–4 Weeks)'}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline justify-between gap-4 pt-1">
                <div className="flex items-baseline gap-3 tabular-nums">
                  <p className="text-2xl font-semibold text-[#252525]">
                    {formatPKR(product.pricePkr)}
                  </p>
                  {product.compareAtPricePkr &&
                    product.compareAtPricePkr > product.pricePkr && (
                      <>
                        <span className="text-sm text-[#252525]/45 line-through">
                          {formatPKR(product.compareAtPricePkr)}
                        </span>
                        {discountPercent !== null && (
                          <span className="text-xs font-semibold text-[#8E6E30]">
                            Save {discountPercent}%
                          </span>
                        )}
                      </>
                    )}
                </div>
                <span className="text-xs text-[#252525]/55 tabular-nums">SKU: {product.sku}</span>
              </div>

              <p className="text-sm text-[#252525]/75 leading-relaxed pt-1">
                {product.description}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#252525]">Select Size / Fit</span>
                <span className="text-[#252525]/60">{selectedSize}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setProductSize(product.id, size)}
                    className={`px-3.5 py-2 min-h-[40px] text-xs font-medium border transition-colors cursor-pointer ${
                      selectedSize === size
                        ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                        : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/20 hover:border-[#252525]/50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-[#252525]/20 bg-[#F8F5EF]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-11 h-11 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-11 h-11 flex items-center justify-center text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="flex-1 min-h-[44px] px-4 py-2.5 border border-[#252525]/20 text-xs font-medium text-[#252525] hover:border-[#C6A15B] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${saved ? 'fill-[#C6A15B] text-[#8E6E30]' : 'text-[#252525]/70'}`}
                  />
                  <span>{saved ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                </button>
              </div>

              {product.inStock ? (
                <button
                  type="button"
                  onClick={() => addToCart(product, selectedSize, quantity)}
                  className="w-full py-3.5 px-6 min-h-[48px] bg-[#252525] text-[#FFFDF8] text-sm font-medium hover:bg-[#363636] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-[#C6A15B]" />
                  <span>Add to Bag · {formatPKR(lineTotal)}</span>
                </button>
              ) : (
                <div className="p-3.5 bg-[#E8DDCC]/60 border border-[#252525]/10 text-xs text-[#252525]/85 leading-relaxed">
                  Currently crafted exclusively to order. Place a bespoke commission inquiry via WhatsApp below.
                </div>
              )}

              <button
                type="button"
                onClick={() => openSingleWhatsAppOrder(product, selectedSize, quantity)}
                className="w-full py-3.5 px-6 min-h-[48px] border border-[#C6A15B] bg-[#F8F5EF] text-[#252525] text-sm font-medium hover:bg-[#E8DDCC] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
                <span>{product.inStock ? 'Buy Now · Order on WhatsApp' : 'Commission on WhatsApp'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#252525]/10 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#252525]/70">
                Specifications & Craftsmanship
              </h2>
              <dl className="divide-y divide-[#252525]/8 text-xs">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#252525]/60">Material</dt>
                  <dd className="text-right font-medium text-[#252525]">{product.material}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#252525]/60">Estimated Weight</dt>
                  <dd className="text-right font-medium text-[#252525] tabular-nums">
                    {product.weightGrams}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#252525]/60">Gemstones</dt>
                  <dd className="text-right font-medium text-[#252525]">{product.gemstones}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#252525]/60">Care</dt>
                  <dd className="text-right text-[#252525]/80 max-w-[60%]">{product.careNote}</dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-[#252525]/70">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8E6E30] shrink-0" />
                  <span>Purity Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#8E6E30] shrink-0" />
                  <span>Insured PK Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#252525]/10 space-y-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Complementary Pieces
              </p>
              <h2 className="font-serif text-3xl font-medium text-[#252525] mt-1">
                You May Also Admire
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
