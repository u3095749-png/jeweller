import React, { useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { WhatsAppOrderModal } from './components/WhatsAppOrderModal';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { HomeView } from './views/HomeView';
import { ShopView } from './views/ShopView';
import { ProductDetailView } from './views/ProductDetailView';
import { WishlistView } from './views/WishlistView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';

function MainContent() {
  const { route, toast, dismissToast, adminSession, adminSessionChecked, navigate } = useStore();

  useEffect(() => {
    if (route.page === 'admin' && adminSessionChecked && !adminSession.authenticated) {
      navigate({ page: 'admin-login' }, { replace: true });
    }
  }, [route.page, adminSessionChecked, adminSession.authenticated, navigate]);

  const toastOverlay = (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-5 z-50 flex items-center gap-4 px-5 py-3 bg-[#252525] text-[#FFFDF8] text-xs font-medium shadow-xl border border-[#FFFDF8]/15"
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="text-[#C6A15B] hover:text-[#FFFDF8] cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Completely isolated Private Admin Routes
  if (route.page === 'admin-login') {
    return (
      <>
        <AdminLoginView />
        {toastOverlay}
      </>
    );
  }

  if (route.page === 'admin') {
    if (!adminSessionChecked) {
      return (
        <div className="min-h-screen bg-[#F8F5EF] flex items-center justify-center p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-[#252525]/60">
            Verifying Session...
          </div>
        </div>
      );
    }
    if (!adminSession.authenticated) {
      return (
        <>
          <AdminLoginView />
          {toastOverlay}
        </>
      );
    }
    return (
      <>
        <AdminDashboardView initialSection={route.section || 'overview'} />
        {toastOverlay}
      </>
    );
  }

  const routeKey =
    route.page === 'product'
      ? `product-${route.slug}`
      : route.page === 'shop'
      ? `shop-${route.category || 'All'}-${route.subcategory || 'All'}-${route.collection || 'All'}-${String(Boolean(route.onlyNew))}`
      : route.page;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EF] text-[#252525]">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {route.page === 'home' && <HomeView />}
            {route.page === 'shop' && <ShopView />}
            {route.page === 'product' && <ProductDetailView slug={route.slug} />}
            {route.page === 'wishlist' && <WishlistView />}
            {route.page === 'about' && <AboutView />}
            {route.page === 'contact' && <ContactView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <WhatsAppOrderModal />
      <AIAssistantWidget />
      {toastOverlay}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <MainContent />
      </StoreProvider>
    </MotionConfig>
  );
}
