import React, { useMemo, useState } from 'react';
import { ArrowRight, Box, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import {
  FEATURED_COLLECTIONS,
  MainCategory,
  Model3DType,
  SUBCATEGORIES,
  TESTIMONIALS,
} from '../data/products';
import { useStore } from '../context/StoreContext';
import { JewelryImage } from '../components/JewelryImage';
import { ProductCard } from '../components/ProductCard';
import { Jewelry3DViewer } from '../components/Jewelry3DViewer';
import { formatPKR, getWhatsAppUrl } from '../config/storeConfig';

const INTERACTIVE_3D_SHOWCASE_ITEMS: Array<{
  productId: string;
  label: string;
  modelType: Model3DType;
  finish: 'champagne-gold' | 'white-gold' | 'sterling-silver' | 'rose-gold';
}> = [
  {
    productId: 'za-002',
    label: 'Solitaire Diamond Ring',
    modelType: 'solitaire-ring',
    finish: 'champagne-gold',
  },
  {
    productId: 'za-016',
    label: 'Pavé Wedding Bands',
    modelType: 'wedding-band',
    finish: 'champagne-gold',
  },
  {
    productId: 'za-007',
    label: 'Swat Emerald Pendant',
    modelType: 'pendant-necklace',
    finish: 'champagne-gold',
  },
  {
    productId: 'za-006',
    label: 'Heritage Gold Bangle',
    modelType: 'gold-bangle',
    finish: 'champagne-gold',
  },
  {
    productId: 'za-017',
    label: 'Diamond Stud & Hoops',
    modelType: 'hoop-earrings',
    finish: 'white-gold',
  },
  {
    productId: 'za-019',
    label: "Men's Onyx Signet",
    modelType: 'signet-ring',
    finish: 'champagne-gold',
  },
];

export function HomeView() {
  const { navigate, openSingleWhatsAppOrder, products, categories, mainCategories } = useStore();
  const [selectedAllCategory, setSelectedAllCategory] = useState<MainCategory | 'All'>('All');
  const [active3dIndex, setActive3dIndex] = useState(0);
  const [is3dMounted, setIs3dMounted] = useState(true);

  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.isBestSeller).slice(0, 6);
  }, [products]);

  const allSectionProducts = useMemo(() => {
    if (selectedAllCategory === 'All') return products;
    return products.filter(
      (p) => p.category === selectedAllCategory || p.categories.includes(selectedAllCategory)
    );
  }, [products, selectedAllCategory]);

  const active3dPreset = INTERACTIVE_3D_SHOWCASE_ITEMS[active3dIndex];
  const active3dProduct = products.find((p) => p.id === active3dPreset.productId) || products[0];

  const bridalConsultUrl = getWhatsAppUrl(
    'Assalam-o-Alaikum! I would like to book a private bridal jewellery consultation with Zaveri Atelier.'
  );

  const scrollToAllProducts = () => {
    const el = document.getElementById('all-products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate({
        page: 'shop',
        category: 'All',
        subcategory: 'All',
        collection: 'All',
        onlyNew: false,
      });
    }
  };

  return (
    <div className="bg-[#F8F5EF] text-[#252525]">
      {/* 1. Large Luxury Jewellery Storefront Hero (Image first on mobile, side-by-side on desktop) */}
      <section className="border-b border-[#252525]/10 bg-[#FFFDF8]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Large Luxury Showroom Interior Image */}
            <div className="lg:col-span-7">
              <div className="relative h-full min-h-[300px] sm:min-h-[420px] lg:min-h-[540px] bg-[#E8DDCC] overflow-hidden border border-[#252525]/12 shadow-sm">
                <JewelryImage
                  src="/src/assets/images/hero_luxury_showroom_1795174883864.jpg"
                  alt="Zaveri Atelier luxury fine jewellery flagship showroom with illuminated glass display vitrines and travertine marble interior"
                  className="w-full h-full"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#252525]/80 via-[#252525]/25 to-transparent p-5 sm:p-7 flex items-end justify-between gap-4">
                  <div className="text-[#FFFDF8]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#C6A15B]">
                      Flagship Jewellery Boutique
                    </p>
                    <p className="font-serif text-lg sm:text-2xl font-medium mt-0.5">
                      Gulberg III, Lahore & Clifton, Karachi
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Heading, Description & CTA Buttons */}
            <div className="lg:col-span-5 flex flex-col justify-between py-2 lg:py-6">
              <div className="space-y-6">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8E6E30]">
                  Maison Zaveri · Fine Gold, Diamonds & Bridal
                </p>

                <h1 className="font-serif text-[clamp(2.4rem,4.1vw,3.75rem)] font-medium leading-[1.06] tracking-tight text-[#252525]">
                  Discover the Art of Timeless Jewellery
                </h1>

                <p className="text-base text-[#252525]/75 leading-relaxed max-w-md">
                  Step inside our curated collection of hallmarked 22K gold, certified VVS diamonds, 925 sterling silver, and uncut Polki bridal suites—priced transparently in PKR with interactive 3D inspection and direct WhatsApp ordering.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={scrollToAllProducts}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[46px] bg-[#252525] text-[#FFFDF8] text-sm font-medium hover:bg-[#363636] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Explore Collection</span>
                    <ArrowRight className="w-4 h-4 text-[#C6A15B]" />
                  </button>

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
                    className="inline-flex items-center justify-center px-6 py-3.5 min-h-[46px] border border-[#252525]/25 bg-[#F8F5EF] text-sm font-medium text-[#252525] hover:border-[#C6A15B] hover:text-[#8E6E30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Shop Now
                  </button>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-[#252525]/10 grid grid-cols-3 gap-4 text-xs text-[#252525]/70">
                <div>
                  <span className="block font-semibold text-[#252525]">22K & 18K Tested</span>
                  <span className="block mt-0.5">Purity certificate included</span>
                </div>
                <div>
                  <span className="block font-semibold text-[#252525]">Insured Courier</span>
                  <span className="block mt-0.5">Free over Rs. 50,000</span>
                </div>
                <div>
                  <span className="block font-semibold text-[#252525]">WhatsApp Direct</span>
                  <span className="block mt-0.5">Personal concierge review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Jewellery Categories */}
      <section className="py-14 lg:py-18 border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Browse Departments
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
                Jewellery Categories
              </h2>
            </div>
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#252525] hover:text-[#8E6E30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>View Full Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'shop',
                    category: item.category,
                    subcategory: 'All',
                    collection: 'All',
                    onlyNew: false,
                  })
                }
                className="group text-left bg-[#FFFDF8] border border-[#252525]/10 hover:border-[#C6A15B] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#E8DDCC]">
                  <JewelryImage
                    src={item.image}
                    alt={item.category}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[#252525] group-hover:text-[#8E6E30] transition-colors">
                      {item.category}
                    </h3>
                    <p className="text-[11px] text-[#252525]/65 mt-1 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Remaining Main Categories + Specialty Subcategories */}
          <div className="pt-4 border-t border-[#252525]/10 flex flex-wrap items-center gap-2">
            {categories.slice(6).map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'shop',
                    category: item.category,
                    subcategory: 'All',
                    collection: 'All',
                    onlyNew: false,
                  })
                }
                className="px-3.5 py-2 text-xs font-medium bg-[#FFFDF8] border border-[#252525]/15 text-[#252525] hover:border-[#C6A15B] hover:text-[#8E6E30] transition-colors whitespace-nowrap cursor-pointer"
              >
                {item.category}
              </button>
            ))}
            {SUBCATEGORIES.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'shop',
                    category: 'All',
                    subcategory: sub,
                    collection: 'All',
                    onlyNew: false,
                  })
                }
                className="px-3.5 py-2 text-xs font-medium bg-[#E8DDCC]/55 border border-[#252525]/12 text-[#252525]/85 hover:border-[#C6A15B] hover:text-[#252525] transition-colors whitespace-nowrap cursor-pointer"
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="py-14 lg:py-18 bg-[#FFFDF8] border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Maison Highlights
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
                Featured Products
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'shop',
                  category: 'All',
                  subcategory: 'All',
                  collection: 'All',
                  onlyNew: true,
                })
              }
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#252525] hover:text-[#8E6E30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Shop New Arrivals</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. All Products (Displays all existing jewellery products organized by category) */}
      <section id="all-products-section" className="py-14 lg:py-20 border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Complete Collection
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
                All Jewellery Products
              </h2>
            </div>

            <p className="text-sm text-[#252525]/65 tabular-nums">
              Showing {allSectionProducts.length} of {products.length} pieces
            </p>
          </div>

          {/* Category Filter Bar for All Products */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedAllCategory('All')}
              className={`px-4 py-2 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                selectedAllCategory === 'All'
                  ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                  : 'bg-[#FFFDF8] text-[#252525]/75 border-[#252525]/15 hover:border-[#252525]/40 hover:text-[#252525]'
              }`}
            >
              All ({products.length})
            </button>
            {mainCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedAllCategory(category)}
                className={`px-4 py-2 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  selectedAllCategory === category
                    ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                    : 'bg-[#FFFDF8] text-[#252525]/75 border-[#252525]/15 hover:border-[#252525]/40 hover:text-[#252525]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {allSectionProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Remaining Section: Interactive 3D Inspection Studio */}
      <section className="py-16 lg:py-20 bg-[#FFFDF8] border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Interactive 3D Studio
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
                Rotate & Inspect Fine Pieces in 3D
              </h2>
              <p className="text-sm text-[#252525]/70 mt-2 max-w-2xl">
                Examine prong architecture, bezel proportions, and metallic reflections across 22K champagne gold, 18K white gold, and 925 sterling silver before ordering.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIs3dMounted((prev) => !prev)}
              className="self-start lg:self-auto px-4 py-2.5 text-xs font-medium border border-[#252525]/20 text-[#252525] hover:border-[#C6A15B] cursor-pointer inline-flex items-center gap-2"
            >
              <Box className="w-3.5 h-3.5 text-[#8E6E30]" />
              <span>{is3dMounted ? 'Switch to Studio Photo' : 'Load Interactive 3D Studio'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 border border-[#252525]/12 bg-[#E8DDCC] min-h-[380px] sm:min-h-[460px]">
              {is3dMounted ? (
                <Jewelry3DViewer
                  modelType={active3dPreset.modelType}
                  productName={active3dProduct.name}
                  fallbackImage={active3dProduct.images[0]}
                  initialFinish={active3dPreset.finish}
                  className="w-full h-[380px] sm:h-[460px]"
                />
              ) : (
                <JewelryImage
                  src={active3dProduct.images[0]}
                  alt={active3dProduct.name}
                  className="w-full h-[380px] sm:h-[460px]"
                />
              )}
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between p-6 bg-[#F8F5EF] border border-[#252525]/10 space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#252525]/60">
                  Select 3D Piece
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {INTERACTIVE_3D_SHOWCASE_ITEMS.map((item, idx) => (
                    <button
                      key={item.productId}
                      type="button"
                      onClick={() => {
                        setActive3dIndex(idx);
                        setIs3dMounted(true);
                      }}
                      className={`px-3.5 py-2.5 text-left text-xs font-medium border transition-colors cursor-pointer flex items-center justify-between ${
                        idx === active3dIndex
                          ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                          : 'bg-[#FFFDF8] text-[#252525] border-[#252525]/12 hover:border-[#C6A15B]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <Box className="w-3.5 h-3.5 text-[#C6A15B]" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#252525]/10 space-y-3">
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-[#252525]">
                    {active3dProduct.name}
                  </h3>
                  <p className="text-base font-semibold text-[#252525] tabular-nums mt-1">
                    {formatPKR(active3dProduct.pricePkr)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'product', slug: active3dProduct.slug })}
                    className="py-3 px-4 bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => openSingleWhatsAppOrder(active3dProduct)}
                    className="py-3 px-4 border border-[#C6A15B] bg-[#FFFDF8] text-[#252525] text-xs font-medium hover:bg-[#E8DDCC] transition-colors cursor-pointer"
                  >
                    WhatsApp Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Featured Collections */}
      <section className="py-16 lg:py-20 bg-[#F8F5EF] border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
              Maison Lines
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
              Featured Collections
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_COLLECTIONS.map((col) => (
              <button
                key={col.collection}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'shop',
                    category: 'All',
                    subcategory: 'All',
                    collection: col.collection,
                    onlyNew: false,
                  })
                }
                className="group text-left bg-[#FFFDF8] border border-[#252525]/10 hover:border-[#C6A15B] transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#E8DDCC]">
                  <JewelryImage
                    src={col.image}
                    alt={col.collection}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-[#252525] group-hover:text-[#8E6E30] transition-colors">
                      {col.collection}
                    </h3>
                    <p className="text-xs text-[#252525]/70 mt-1.5 leading-relaxed">
                      {col.tagline}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#252525]">
                    <span>View Collection</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E6E30]" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Exclusive Bridal Collection Spotlight */}
      <section className="py-16 lg:py-20 bg-[#E8DDCC]/45 border-b border-[#252525]/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
            <div className="lg:col-span-6">
              <div className="h-full min-h-[320px] lg:min-h-[460px] bg-[#E8DDCC] overflow-hidden border border-[#252525]/10">
                <JewelryImage
                  src="/src/assets/images/cat_bridal_polki_1795173686381.jpg"
                  alt="Exclusive Polki Kundan and 22K Gold Bridal Jewellery Set"
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-6 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Exclusive Bridal Atelier
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] leading-tight">
                Hand-Set Polki Kundan & Jadau Bridal Suites
              </h2>
              <p className="text-base text-[#252525]/75 leading-relaxed">
                From intimate nikah chokers to multi-tiered walima rani haars, every bridal commission is tailored to your neckline, dupatta palette, and family heritage.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-[#252525]/10">
                <div className="space-y-1.5">
                  <ShieldCheck className="w-5 h-5 text-[#8E6E30] stroke-[1.5]" />
                  <h3 className="font-serif text-lg font-semibold text-[#252525]">
                    22K Hallmarked
                  </h3>
                  <p className="text-xs text-[#252525]/65 leading-relaxed">
                    Full gold weight & stone specification dossier.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Sparkles className="w-5 h-5 text-[#8E6E30] stroke-[1.5]" />
                  <h3 className="font-serif text-lg font-semibold text-[#252525]">
                    Private Fittings
                  </h3>
                  <p className="text-xs text-[#252525]/65 leading-relaxed">
                    Lahore, Karachi & WhatsApp video consultations.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Truck className="w-5 h-5 text-[#8E6E30] stroke-[1.5]" />
                  <h3 className="font-serif text-lg font-semibold text-[#252525]">
                    Insured Delivery
                  </h3>
                  <p className="text-xs text-[#252525]/65 leading-relaxed">
                    Armored nationwide courier across Pakistan.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'shop',
                      category: 'Bridal Jewellery',
                      subcategory: 'All',
                      collection: 'All',
                      onlyNew: false,
                    })
                  }
                  className="px-6 py-3 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors cursor-pointer"
                >
                  Explore Bridal Sets
                </button>
                <a
                  href={bridalConsultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 min-h-[44px] border border-[#252525]/22 bg-[#FFFDF8] text-xs font-medium text-[#252525] hover:border-[#C6A15B] hover:text-[#8E6E30] transition-colors inline-flex items-center"
                >
                  Book Bridal Consultation
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Customer Testimonials */}
      <section className="py-16 lg:py-20 bg-[#F8F5EF]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
              Client Stories
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
              Trusted by Patrons Across Pakistan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.id}
                className="p-7 bg-[#FFFDF8] border border-[#252525]/10 flex flex-col justify-between space-y-6"
              >
                <p className="text-sm text-[#252525]/80 leading-relaxed">
                  “{t.quote}”
                </p>
                <footer className="pt-4 border-t border-[#252525]/10 text-xs">
                  <p className="font-semibold text-[#252525]">{t.author}</p>
                  <p className="text-[#252525]/60 mt-0.5">
                    {t.city} <span aria-hidden="true">·</span> {t.piece}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
