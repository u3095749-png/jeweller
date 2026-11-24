import React, { useState } from 'react';
import { Lock, Menu, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STORE_CONFIG } from '../config/storeConfig';

export function Navbar() {
  const { route, navigate, cartCount, openCart, wishlistIds, adminSession } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavActive = (key: string) => {
    if (key === 'shop') return route.page === 'shop' && !route.onlyNew;
    if (key === 'new') return route.page === 'shop' && Boolean(route.onlyNew);
    return route.page === key;
  };

  const handleNavClick = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  const openAdminPanel = () => {
    handleNavClick(() =>
      navigate(
        adminSession.authenticated
          ? { page: 'admin', section: 'overview' }
          : { page: 'admin-login' }
      )
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b border-[#252525]/10">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick(() => navigate({ page: 'home' }))}
          className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#252525] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6A15B]"
        >
          {STORE_CONFIG.brandName}
        </button>

        {/* Zone 2: 5 concise single-line text links */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() =>
              navigate({ page: 'shop', category: 'All', subcategory: 'All', collection: 'All', onlyNew: false })
            }
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b ${
              isNavActive('shop')
                ? 'text-[#252525] border-[#C6A15B]'
                : 'text-[#252525]/70 border-transparent hover:text-[#252525] hover:border-[#252525]/30'
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() =>
              navigate({ page: 'shop', category: 'All', subcategory: 'All', collection: 'All', onlyNew: true })
            }
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b ${
              isNavActive('new')
                ? 'text-[#252525] border-[#C6A15B]'
                : 'text-[#252525]/70 border-transparent hover:text-[#252525] hover:border-[#252525]/30'
            }`}
          >
            New Arrivals
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'wishlist' })}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b tabular-nums ${
              isNavActive('wishlist')
                ? 'text-[#252525] border-[#C6A15B]'
                : 'text-[#252525]/70 border-transparent hover:text-[#252525] hover:border-[#252525]/30'
            }`}
          >
            Wishlist{wishlistIds.length > 0 ? ` (${wishlistIds.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'about' })}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b ${
              isNavActive('about')
                ? 'text-[#252525] border-[#C6A15B]'
                : 'text-[#252525]/70 border-transparent hover:text-[#252525] hover:border-[#252525]/30'
            }`}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'contact' })}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b ${
              isNavActive('contact')
                ? 'text-[#252525] border-[#C6A15B]'
                : 'text-[#252525]/70 border-transparent hover:text-[#252525] hover:border-[#252525]/30'
            }`}
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: Admin access & Bag action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openAdminPanel}
            aria-label="Open Admin Panel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium tracking-wide border border-[#252525]/20 bg-[#FFFDF8] text-[#252525] hover:border-[#C6A15B] hover:bg-[#F3ECE0] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A15B]"
          >
            {adminSession.authenticated ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#9F7A36]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-[#9F7A36]" />
            )}
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={openCart}
            className="px-4 py-2 min-h-[40px] text-xs font-medium tracking-wide bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A15B]"
          >
            Bag ({cartCount})
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#252525]/10 bg-[#FFFDF8] px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleNavClick(() => navigate({ page: 'home' }))}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavClick(() =>
                navigate({ page: 'shop', category: 'All', subcategory: 'All', collection: 'All', onlyNew: false })
              )
            }
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            Shop All Jewellery
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavClick(() =>
                navigate({ page: 'shop', category: 'All', subcategory: 'All', collection: 'All', onlyNew: true })
              )
            }
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            New Arrivals
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => navigate({ page: 'wishlist' }))}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer tabular-nums"
          >
            Wishlist ({wishlistIds.length})
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => navigate({ page: 'about' }))}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            About Atelier
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => navigate({ page: 'contact' }))}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
          >
            Contact & Salons
          </button>
          <div className="pt-2 mt-2 border-t border-[#252525]/10">
            <button
              type="button"
              onClick={openAdminPanel}
              className="w-full flex items-center gap-2 text-left px-3 py-3 text-sm font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
            >
              {adminSession.authenticated ? (
                <ShieldCheck className="w-4 h-4 text-[#9F7A36]" />
              ) : (
                <Lock className="w-4 h-4 text-[#9F7A36]" />
              )}
              <span>Admin Panel</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
