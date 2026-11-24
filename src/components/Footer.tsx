import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STORE_CONFIG, getWhatsAppUrl } from '../config/storeConfig';

export function Footer() {
  const { navigate, mainCategories, websiteSettings } = useStore();
  const waDigits = (
    websiteSettings.whatsappBusinessNumber || STORE_CONFIG.whatsappBusinessNumber
  ).replace(/[^\d]/g, '');
  const conciergeWaUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        'Assalam-o-Alaikum! I would like assistance from the Zaveri Atelier jewellery concierge.'
      )}`
    : getWhatsAppUrl(
        'Assalam-o-Alaikum! I would like assistance from the Zaveri Atelier jewellery concierge.'
      );

  return (
    <footer className="bg-[#252525] text-[#FFFDF8] border-t border-[#FFFDF8]/10">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#FFFDF8]/12">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-[#FFFDF8]">
              {websiteSettings.brandName || STORE_CONFIG.brandName}
            </h3>
            <p className="text-sm text-[#FFFDF8]/70 leading-relaxed max-w-xs">
              {websiteSettings.brandTagline ||
                'Handcrafted 22K gold, certified diamonds, 925 sterling silver, and heirloom bridal suites forged in Lahore and Karachi.'}
            </p>
            <a
              href={conciergeWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-[#C6A15B] hover:text-[#FFFDF8] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                WhatsApp Concierge (
                {websiteSettings.whatsappDisplayNumber || STORE_CONFIG.whatsappDisplayNumber})
              </span>
            </a>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#C6A15B] mb-4">
              Categories
            </h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm text-[#FFFDF8]/75">
              {mainCategories.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        page: 'shop',
                        category,
                        subcategory: 'All',
                        collection: 'All',
                        onlyNew: false,
                      })
                    }
                    className="text-left hover:text-[#FFFDF8] transition-colors cursor-pointer"
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#C6A15B] mb-4">
              Maison
            </h4>
            <ul className="space-y-2.5 text-sm text-[#FFFDF8]/75">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'home' })}
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
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
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  Shop All Jewellery
                </button>
              </li>
              <li>
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
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  New Arrivals
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'wishlist' })}
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  Saved Wishlist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'about' })}
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  About & Craftsmanship
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'contact' })}
                  className="hover:text-[#FFFDF8] transition-colors cursor-pointer"
                >
                  Contact & Salons
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#C6A15B] mb-4">
              Boutiques
            </h4>
            <div className="space-y-4 text-sm text-[#FFFDF8]/75">
              {STORE_CONFIG.boutiques.map((b) => (
                <div key={b.city}>
                  <p className="font-medium text-[#FFFDF8]">{b.city}</p>
                  <p className="text-xs text-[#FFFDF8]/65 mt-0.5">{b.address}</p>
                  <p className="text-xs text-[#FFFDF8]/55 mt-0.5">{b.hours}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#FFFDF8]/55">
          <span>
            © {new Date().getFullYear()} {STORE_CONFIG.brandName}. All prices displayed in Pakistani Rupees (PKR).
          </span>
          <span>22K Hallmarked Purity · Insured Nationwide Delivery</span>
        </div>
      </div>
    </footer>
  );
}
