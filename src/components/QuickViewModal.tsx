import React, { useEffect, useState } from 'react';
import { X, Box, Image as ImageIcon, MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../config/storeConfig';
import { getDiscountPercentage } from '../data/products';
import { JewelryImage } from './JewelryImage';
import { Jewelry3DViewer } from './Jewelry3DViewer';

export function QuickViewModal() {
  const {
    quickViewProduct,
    closeQuickView,
    addToCart,
    openSingleWhatsAppOrder,
    navigate,
    getSelectedSize,
    setProductSize,
  } = useStore();

  const [viewMode, setViewMode] = useState<'photo' | '3d'>('photo');
  const selectedSize = quickViewProduct ? getSelectedSize(quickViewProduct) : 'Standard';

  useEffect(() => {
    if (quickViewProduct) {
      setViewMode('photo');
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const discountPercent = getDiscountPercentage(quickViewProduct);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${quickViewProduct.name}`}
    >
      <div
        className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]"
        onClick={closeQuickView}
      />

      <div className="relative z-10 w-full max-w-4xl bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
        <button
          type="button"
          onClick={closeQuickView}
          aria-label="Close quick view"
          className="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center bg-[#FFFDF8] border border-[#252525]/15 text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Media / Optional On-Demand 3D Studio */}
        <div className="md:w-1/2 bg-[#E8DDCC] flex flex-col">
          <div className="relative aspect-[4/3] md:aspect-auto md:flex-1 min-h-[280px] sm:min-h-[340px]">
            {viewMode === '3d' && quickViewProduct.model3dType ? (
              <Jewelry3DViewer
                modelType={quickViewProduct.model3dType}
                productName={quickViewProduct.name}
                fallbackImage={quickViewProduct.images[0]}
                initialFinish={quickViewProduct.default3dFinish}
                className="w-full h-full min-h-[320px]"
              />
            ) : (
              <JewelryImage
                src={quickViewProduct.images[0]}
                alt={quickViewProduct.name}
                className="w-full h-full"
              />
            )}
          </div>

          {quickViewProduct.model3dType && (
            <div className="p-3 bg-[#F8F5EF] border-t border-[#252525]/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('photo')}
                className={`flex-1 py-2 px-3 text-xs font-medium inline-flex items-center justify-center gap-1.5 border cursor-pointer transition-colors ${
                  viewMode === 'photo'
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#FFFDF8] text-[#252525] border-[#252525]/15 hover:border-[#252525]/40'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Studio Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`flex-1 py-2 px-3 text-xs font-medium inline-flex items-center justify-center gap-1.5 border cursor-pointer transition-colors ${
                  viewMode === '3d'
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#FFFDF8] text-[#252525] border-[#252525]/15 hover:border-[#252525]/40'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span>Inspect 3D Model</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Purchase Summary */}
        <div className="md:w-1/2 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="text-xs text-[#252525]/60">
              {quickViewProduct.category}
              {quickViewProduct.subcategory ? ` · ${quickViewProduct.subcategory}` : ''}
              {' · '}
              {quickViewProduct.collection}
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#252525] leading-tight pr-8">
              {quickViewProduct.name}
            </h2>

            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="text-xl font-semibold text-[#252525]">
                {formatPKR(quickViewProduct.pricePkr)}
              </span>
              {quickViewProduct.compareAtPricePkr &&
                quickViewProduct.compareAtPricePkr > quickViewProduct.pricePkr && (
                  <>
                    <span className="text-sm text-[#252525]/45 line-through">
                      {formatPKR(quickViewProduct.compareAtPricePkr)}
                    </span>
                    {discountPercent !== null && (
                      <span className="text-xs font-semibold text-[#8E6E30]">
                        Save {discountPercent}%
                      </span>
                    )}
                  </>
                )}
            </div>

            <p className="text-sm text-[#252525]/75 leading-relaxed">
              {quickViewProduct.description}
            </p>

            <div className="py-3 border-y border-[#252525]/10 text-xs space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-[#252525]/60">Material</span>
                <span className="font-medium text-right text-[#252525]">
                  {quickViewProduct.material}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#252525]/60">Weight</span>
                <span className="font-medium text-[#252525] tabular-nums">
                  {quickViewProduct.weightGrams}
                </span>
              </div>
            </div>

            {/* Size Picker */}
            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#252525]">Select Size</span>
              <div className="flex flex-wrap gap-2">
                {quickViewProduct.availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setProductSize(quickViewProduct.id, size)}
                    className={`px-3 py-1.5 text-xs font-medium border cursor-pointer transition-colors ${
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
          </div>

          <div className="space-y-2.5 pt-2">
            {quickViewProduct.inStock && (
              <button
                type="button"
                onClick={() => {
                  addToCart(quickViewProduct, selectedSize, 1);
                  closeQuickView();
                }}
                className="w-full py-3 px-5 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#C6A15B]" />
                <span>Add to Cart</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                closeQuickView();
                openSingleWhatsAppOrder(quickViewProduct, selectedSize, 1);
              }}
              className="w-full py-3 px-5 min-h-[44px] border border-[#C6A15B] bg-[#F8F5EF] text-[#252525] text-xs font-medium hover:bg-[#E8DDCC] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
              <span>Order on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate({ page: 'product', slug: quickViewProduct.slug })}
              className="w-full py-2 text-xs font-medium text-[#252525]/70 hover:text-[#252525] inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View Full Product Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
