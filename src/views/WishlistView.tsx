import React, { useMemo } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';

export function WishlistView() {
  const { wishlistIds, navigate, getProductById } = useStore();

  const savedProducts = useMemo(() => {
    return wishlistIds
      .map((id) => getProductById(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [wishlistIds, getProductById]);

  return (
    <section className="py-12 lg:py-16 bg-[#F8F5EF] min-h-[75vh]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
        <div className="border-b border-[#252525]/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
              Personal Archive
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#252525] mt-1">
              Saved Wishlist
            </h1>
          </div>
          <p className="text-sm text-[#252525]/65 tabular-nums">
            {savedProducts.length} {savedProducts.length === 1 ? 'piece saved' : 'pieces saved'}
          </p>
        </div>

        {savedProducts.length === 0 ? (
          <div className="py-20 px-6 text-center bg-[#FFFDF8] border border-[#252525]/10">
            <Heart className="w-10 h-10 text-[#C6A15B] stroke-[1.25] mx-auto mb-4" />
            <h2 className="font-serif text-3xl text-[#252525] mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-sm text-[#252525]/65 max-w-md mx-auto mb-6 leading-relaxed">
              Save your favourite 22K gold rings, heirloom bangles, sterling silver pieces, and bridal suites to revisit or share with our atelier.
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
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors cursor-pointer"
            >
              <span>Browse Collections</span>
              <ArrowRight className="w-4 h-4 text-[#C6A15B]" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {savedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
