import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { JewelryImage } from '../components/JewelryImage';
import { STORE_CONFIG, getWhatsAppUrl } from '../config/storeConfig';

export function AboutView() {
  const { navigate } = useStore();
  const bespokeUrl = getWhatsAppUrl(
    'Assalam-o-Alaikum! I would like to learn more about bespoke jewellery commissions at Zaveri Atelier.'
  );

  return (
    <div className="bg-[#F8F5EF]">
      <section className="py-12 lg:py-20 border-b border-[#252525]/10 bg-[#FFFDF8]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
                Our Heritage
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#252525] leading-tight">
                Preserving Pakistani Goldsmithing with Architectural Clarity
              </h1>
              <p className="text-base text-[#252525]/75 leading-relaxed">
                Founded as an intimate family workshop in Lahore and now welcoming patrons in Gulberg and Clifton, {STORE_CONFIG.brandName} unites multi-generational karigar mastery with contemporary, wearable silhouettes.
              </p>
              <p className="text-base text-[#252525]/75 leading-relaxed">
                Every gram of 22K gold, 18K white gold, 925 sterling silver, and every natural Swat emerald or uncut Polki diamond is ethically sourced, weighed transparently, and certified before leaving our bench.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
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
                  className="inline-flex items-center gap-2 px-6 py-3.5 min-h-[44px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] transition-colors cursor-pointer"
                >
                  <span>Explore Jewellery</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A15B]" />
                </button>
                <a
                  href={bespokeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 min-h-[44px] border border-[#252525]/20 text-xs font-medium text-[#252525] hover:border-[#C6A15B] hover:text-[#8E6E30] transition-colors inline-flex items-center"
                >
                  Speak with an Artisan
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[340px] lg:min-h-[480px] bg-[#E8DDCC] border border-[#252525]/10 overflow-hidden">
                <JewelryImage
                  src="/src/assets/images/atelier_craftsmanship_1795173687131.jpg"
                  alt="Artisan jeweller workbench inside Zaveri Atelier"
                  className="w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#F8F5EF]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
              From Sketch to Heirloom
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#252525] mt-1">
              Three Disciplines Behind Every Creation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="p-7 bg-[#FFFDF8] border border-[#252525]/10 space-y-3">
              <h3 className="font-serif text-2xl font-semibold text-[#252525]">
                01. CAD & Botanical Sketching
              </h3>
              <p className="text-sm text-[#252525]/70 leading-relaxed">
                Pieces are engineered in 3D CAD and hand-drawn to scale, ensuring collar curvature, earring balance, and ring profile sit effortlessly against the wearer.
              </p>
            </div>

            <div className="p-7 bg-[#FFFDF8] border border-[#252525]/10 space-y-3">
              <h3 className="font-serif text-2xl font-semibold text-[#252525]">
                02. Hand-Forged Precious Metals
              </h3>
              <p className="text-sm text-[#252525]/70 leading-relaxed">
                Our master goldsmiths hand-solder delicate jaali filigree, micro-granulation beads, and concealed kara hinges in hallmarked 22K, 18K, and 925 silver.
              </p>
            </div>

            <div className="p-7 bg-[#FFFDF8] border border-[#252525]/10 space-y-3">
              <h3 className="font-serif text-2xl font-semibold text-[#252525]">
                03. Polki & Gemstone Setting
              </h3>
              <p className="text-sm text-[#252525]/70 leading-relaxed">
                Natural Swat emeralds, VVS diamonds, and Syndicate Polki stones are hand-set with precision and inspected under 20x loupe magnification.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
