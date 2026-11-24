import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CATEGORY_CARDS,
  CategoryCardItem,
  JewelleryCollection,
  JewelleryProduct,
  MainCategory,
  PRODUCTS,
  Subcategory,
} from '../data/products.ts';
import {
  STORE_CONFIG,
  WhatsAppSingleOrderItem,
  buildCartWhatsAppMessage,
  buildSingleProductWhatsAppMessage,
} from '../config/storeConfig.ts';
import type {
  AdminSessionStatus,
  MetalFinishKey,
  ShopFilterState,
  WebsiteSettings,
} from '../types/assistant.ts';
import { safeReadJson } from '../utils/safeFetchJson.ts';
import {
  ADMIN_STATE_STORAGE_KEY,
  ADMIN_STORAGE_EVENT,
  loadPersistedAdminState,
  mergeCatalogFromServer,
  savePersistedAdminState,
} from '../utils/adminStorage.ts';

export type AdminSection =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'discounts'
  | 'coupons'
  | 'reviews'
  | 'payments'
  | 'shipping'
  | 'analytics'
  | 'reports'
  | 'notifications'
  | 'whatsapp'
  | 'activity'
  | 'website-settings'
  | 'profile';

export type AppRoute =
  | { page: 'home' }
  | {
      page: 'shop';
      category?: MainCategory | 'All';
      subcategory?: Subcategory | 'All';
      collection?: JewelleryCollection | 'All';
      onlyNew?: boolean;
    }
  | { page: 'product'; slug: string }
  | { page: 'wishlist' }
  | { page: 'about' }
  | { page: 'contact' }
  | { page: 'admin-login' }
  | { page: 'admin'; section?: AdminSection };

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
}

export type WhatsAppOrderPayload =
  | {
      type: 'single';
      item: WhatsAppSingleOrderItem;
      defaultMessage: string;
    }
  | {
      type: 'cart';
      itemsCount: number;
      totalPkr: number;
      defaultMessage: string;
    };

interface ToastMessage {
  id: number;
  text: string;
}

export interface AddToCartResult {
  ok: boolean;
  reason?: 'made-to-order' | 'not-found';
  sizeUsed?: string;
}

export const DEFAULT_SHOP_FILTERS: ShopFilterState = {
  searchQuery: '',
  category: 'All',
  subcategory: 'All',
  collection: 'All',
  onlyNewArrivals: false,
  priceRange: 'all',
  minPricePkr: undefined,
  maxPricePkr: undefined,
  sortBy: 'featured',
};

interface StoreContextValue {
  route: AppRoute;
  navigate: (nextRoute: AppRoute, options?: { replace?: boolean }) => void;
  products: JewelleryProduct[];
  categories: CategoryCardItem[];
  mainCategories: MainCategory[];
  websiteSettings: WebsiteSettings;
  setWebsiteSettings: (next: WebsiteSettings) => void;
  getProductById: (id: string) => JewelleryProduct | undefined;
  getProductBySlug: (slug: string) => JewelleryProduct | undefined;
  refreshCatalog: () => Promise<void>;
  applyCatalogSnapshot: (snapshot: {
    products?: JewelleryProduct[];
    categories?: CategoryCardItem[];
    settings?: WebsiteSettings;
  }) => void;
  adminSession: AdminSessionStatus;
  adminSessionChecked: boolean;
  refreshAdminSession: () => Promise<AdminSessionStatus>;
  logoutAdmin: () => Promise<void>;
  shopFilters: ShopFilterState;
  applyShopFilters: (
    next: Partial<ShopFilterState>,
    options?: { navigateToShop?: boolean; replace?: boolean }
  ) => void;
  resetShopFilters: (navigateToShop?: boolean) => void;
  selectedSizeByProductId: Record<string, string>;
  getSelectedSize: (product: JewelleryProduct) => string;
  setProductSize: (productId: string, size: string) => void;
  selectedFinishByProductId: Record<string, MetalFinishKey>;
  getSelectedFinish: (product: JewelleryProduct) => MetalFinishKey;
  setProductFinish: (productId: string, finish: MetalFinishKey) => void;
  assistantSelectedProductId: string | null;
  setAssistantSelectedProductId: (productId: string | null) => void;
  activeProduct: JewelleryProduct | null;
  cart: CartItem[];
  cartCount: number;
  cartSubtotalPkr: number;
  cartDeliveryPkr: number;
  cartTotalPkr: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (
    product: JewelleryProduct,
    size?: string,
    quantity?: number,
    options?: { openDrawer?: boolean }
  ) => AddToCartResult;
  updateCartQuantity: (productId: string, size: string, delta: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => boolean;
  isWishlisted: (productId: string) => boolean;
  quickViewProduct: JewelleryProduct | null;
  openQuickView: (product: JewelleryProduct) => void;
  closeQuickView: () => void;
  whatsappModalPayload: WhatsAppOrderPayload | null;
  openSingleWhatsAppOrder: (product: JewelleryProduct, size?: string, quantity?: number) => void;
  openCartWhatsAppOrder: () => void;
  closeWhatsAppModal: () => void;
  toast: ToastMessage | null;
  dismissToast: () => void;
  showToast: (text: string) => void;
}

const CART_STORAGE_KEY = 'zaveri_atelier_cart_v1';
const WISHLIST_STORAGE_KEY = 'zaveri_atelier_wishlist_v1';
const CATALOG_PRODUCTS_STORAGE_KEY = 'zaveri_atelier_catalog_products_v1';
const CATALOG_CATEGORIES_STORAGE_KEY = 'zaveri_atelier_catalog_categories_v1';

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const VALID_ADMIN_SECTIONS = new Set<AdminSection>([
  'overview',
  'products',
  'categories',
  'orders',
  'customers',
  'inventory',
  'discounts',
  'coupons',
  'reviews',
  'payments',
  'shipping',
  'analytics',
  'reports',
  'notifications',
  'whatsapp',
  'activity',
  'website-settings',
  'profile',
]);

const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  brandName: STORE_CONFIG.brandName,
  brandTagline: STORE_CONFIG.tagline,
  announcementBar: 'Complimentary insured delivery across Pakistan on orders above Rs. 50,000.',
  whatsappDisplayNumber: STORE_CONFIG.whatsappDisplayNumber,
  whatsappBusinessNumber: STORE_CONFIG.whatsappBusinessNumber,
  conciergeEmail: STORE_CONFIG.email,
  freeDeliveryThresholdPkr: STORE_CONFIG.freeDeliveryThresholdPkr,
  standardDeliveryFeePkr: STORE_CONFIG.standardDeliveryFeePkr,
  codEnabled: true,
  bankTransferDetails:
    'Meezan Bank Limited — Title: Zaveri Atelier Fine Jewellers — Confirmation via WhatsApp concierge.',
  defaultLowStockThreshold: 2,
};

function parseRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') return { page: 'home' };

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const rawHash = window.location.hash.replace(/^#/, '');

  // Support direct URL access (/admin, /admin/login, /admin/products, etc.) as well as hash URLs
  const adminCandidate = pathname.startsWith('/admin')
    ? pathname
    : rawHash.startsWith('/admin')
    ? rawHash
    : null;

  if (adminCandidate) {
    if (adminCandidate === '/admin/login') {
      return { page: 'admin-login' };
    }
    const parts = adminCandidate.split('/').filter(Boolean); // ['admin', section?]
    const sec = parts[1] as AdminSection | undefined;
    if (sec && VALID_ADMIN_SECTIONS.has(sec)) {
      return { page: 'admin', section: sec };
    }
    return { page: 'admin', section: 'overview' };
  }

  if (!rawHash || rawHash === '/' || rawHash === 'home') return { page: 'home' };
  if (rawHash.startsWith('/product/')) {
    const slug = decodeURIComponent(rawHash.replace('/product/', ''));
    return { page: 'product', slug };
  }
  if (rawHash === '/shop' || rawHash.startsWith('/shop?')) {
    const queryIndex = rawHash.indexOf('?');
    if (queryIndex === -1) return { page: 'shop' };
    const params = new URLSearchParams(rawHash.slice(queryIndex + 1));
    const cat = params.get('category') as MainCategory | 'All' | null;
    const sub = params.get('subcategory') as Subcategory | 'All' | null;
    const col = params.get('collection') as JewelleryCollection | 'All' | null;
    const onlyNew = params.get('new') === 'true';
    return {
      page: 'shop',
      category: cat || 'All',
      subcategory: sub || 'All',
      collection: col || 'All',
      onlyNew,
    };
  }
  if (rawHash === '/wishlist') return { page: 'wishlist' };
  if (rawHash === '/about') return { page: 'about' };
  if (rawHash === '/contact') return { page: 'contact' };
  return { page: 'home' };
}

function serializeRouteToHash(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'shop': {
      const params = new URLSearchParams();
      if (route.category && route.category !== 'All') params.set('category', route.category);
      if (route.subcategory && route.subcategory !== 'All') {
        params.set('subcategory', route.subcategory);
      }
      if (route.collection && route.collection !== 'All') {
        params.set('collection', route.collection);
      }
      if (route.onlyNew) params.set('new', 'true');
      const qs = params.toString();
      return qs ? `#/shop?${qs}` : '#/shop';
    }
    case 'product':
      return `#/product/${encodeURIComponent(route.slug)}`;
    case 'wishlist':
      return '#/wishlist';
    case 'about':
      return '#/about';
    case 'contact':
      return '#/contact';
    case 'admin-login':
      return '/admin/login';
    case 'admin':
      return route.section && route.section !== 'overview'
        ? `/admin/${route.section}`
        : '/admin';
  }
}

function syncBrowserUrl(route: AppRoute, replace = false): void {
  if (typeof window === 'undefined') return;
  if (route.page === 'admin-login' || route.page === 'admin') {
    const targetPath = serializeRouteToHash(route);
    if (window.location.pathname !== targetPath || window.location.hash) {
      if (replace) {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }
    }
    return;
  }

  const targetHash = serializeRouteToHash(route);
  if (window.location.pathname.startsWith('/admin')) {
    const targetUrl = `/${targetHash}`;
    if (replace) {
      window.history.replaceState(null, '', targetUrl);
    } else {
      window.history.pushState(null, '', targetUrl);
    }
  } else if (window.location.hash !== targetHash) {
    if (replace) {
      window.history.replaceState(null, '', targetHash);
    } else {
      window.location.hash = targetHash;
    }
  }
}

function loadInitialProducts(): JewelleryProduct[] {
  try {
    const saved = localStorage.getItem(CATALOG_PRODUCTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as JewelleryProduct[];
      }
    }
  } catch {
    // Fallback cleanly to defaults
  }
  return PRODUCTS;
}

function loadInitialCategories(): CategoryCardItem[] {
  try {
    const saved = localStorage.getItem(CATALOG_CATEGORIES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CategoryCardItem[];
      }
    }
  } catch {
    // Fallback cleanly to defaults
  }
  return CATEGORY_CARDS;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<JewelleryProduct[]>(
    () => loadPersistedAdminState().products
  );
  const [categories, setCategories] = useState<CategoryCardItem[]>(
    () => loadPersistedAdminState().categories
  );
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(
    () => loadPersistedAdminState().websiteSettings || DEFAULT_WEBSITE_SETTINGS
  );

  const [adminSession, setAdminSession] = useState<AdminSessionStatus>({
    authenticated: false,
    setupRequired: false,
  });
  const [adminSessionChecked, setAdminSessionChecked] = useState(false);

  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromLocation());
  const [shopFilters, setShopFilters] = useState<ShopFilterState>(() => {
    const initial = parseRouteFromLocation();
    if (initial.page === 'shop') {
      return {
        ...DEFAULT_SHOP_FILTERS,
        category: initial.category || 'All',
        subcategory: initial.subcategory || 'All',
        collection: initial.collection || 'All',
        onlyNewArrivals: Boolean(initial.onlyNew),
        sortBy: initial.onlyNew ? 'newest' : 'featured',
      };
    }
    return DEFAULT_SHOP_FILTERS;
  });

  const [selectedSizeByProductId, setSelectedSizeByProductId] = useState<Record<string, string>>(
    {}
  );
  const [selectedFinishByProductId, setSelectedFinishByProductId] = useState<
    Record<string, MetalFinishKey>
  >({});
  const [assistantSelectedProductId, setAssistantSelectedProductId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<JewelleryProduct | null>(null);
  const [whatsappModalPayload, setWhatsappModalPayload] = useState<WhatsAppOrderPayload | null>(
    null
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is CartItem =>
          typeof item?.productId === 'string' &&
          typeof item?.size === 'string' &&
          typeof item?.quantity === 'number' &&
          item.quantity > 0
      );
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id): id is string => typeof id === 'string');
    } catch {
      return [];
    }
  });

  const applyCatalogSnapshot = useCallback(
    (snapshot: {
      products?: JewelleryProduct[];
      categories?: CategoryCardItem[];
      settings?: WebsiteSettings;
    }) => {
      const current = loadPersistedAdminState();
      const nextProducts = Array.isArray(snapshot.products) ? snapshot.products : current.products;
      const nextCategories = Array.isArray(snapshot.categories)
        ? snapshot.categories
        : current.categories;
      const nextSettings = snapshot.settings || current.websiteSettings;

      if (Array.isArray(snapshot.products)) {
        setProducts(snapshot.products);
      }
      if (Array.isArray(snapshot.categories)) {
        setCategories(snapshot.categories);
      }
      if (snapshot.settings) {
        setWebsiteSettings(snapshot.settings);
      }

      savePersistedAdminState({
        ...current,
        updatedAt: new Date().toISOString(),
        hasCustomEdits:
          current.hasCustomEdits ||
          Boolean(snapshot.products || snapshot.categories || snapshot.settings),
        products: nextProducts,
        categories: nextCategories,
        websiteSettings: nextSettings,
      });
    },
    []
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await safeReadJson<{
        products?: JewelleryProduct[];
        categories?: CategoryCardItem[];
        settings?: WebsiteSettings;
      }>(res, 'Storefront catalog');
      const merged = mergeCatalogFromServer(data);
      setProducts(merged.products);
      setCategories(merged.categories);
      setWebsiteSettings(merged.websiteSettings);
    } catch {
      // Chrome LocalStorage persisted catalog remains active seamlessly offline
    }
  }, []);

  const refreshAdminSession = useCallback(async (): Promise<AdminSessionStatus> => {
    try {
      const res = await fetch('/api/admin/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        const unauth: AdminSessionStatus = { authenticated: false, setupRequired: false };
        setAdminSession(unauth);
        setAdminSessionChecked(true);
        return unauth;
      }
      const data = await safeReadJson<AdminSessionStatus>(res, 'Admin session');
      setAdminSession(data);
      setAdminSessionChecked(true);
      return data;
    } catch {
      const fallback: AdminSessionStatus = { authenticated: false, setupRequired: false };
      setAdminSession(fallback);
      setAdminSessionChecked(true);
      return fallback;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // Clear local state regardless
    }
    setAdminSession({ authenticated: false, setupRequired: false });
    setAdminSessionChecked(true);
    syncBrowserUrl({ page: 'admin-login' }, true);
    setRoute({ page: 'admin-login' });
  }, []);

  useEffect(() => {
    void refreshCatalog();
    void refreshAdminSession();
  }, [refreshCatalog, refreshAdminSession]);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getProductBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products]
  );

  const mainCategories = useMemo(
    () => categories.map((c) => c.category),
    [categories]
  );

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [wishlistIds]);

  useEffect(() => {
    const syncRoute = () => {
      const next = parseRouteFromLocation();
      setRoute(next);
      if (next.page === 'shop') {
        setShopFilters((prev) => ({
          ...prev,
          category: next.category || 'All',
          subcategory: next.subcategory || 'All',
          collection: next.collection || 'All',
          onlyNewArrivals: Boolean(next.onlyNew),
          sortBy: next.onlyNew ? 'newest' : prev.sortBy,
        }));
      }
      if (next.page === 'admin' || next.page === 'admin-login') {
        void refreshAdminSession();
      }
    };
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted || window.location.pathname.startsWith('/admin')) {
        void refreshAdminSession();
      }
    };
    const onAdminStateUpdate = () => {
      const persisted = loadPersistedAdminState();
      setProducts(persisted.products);
      setCategories(persisted.categories);
      setWebsiteSettings(persisted.websiteSettings);
    };
    const onStorageSync = (ev: StorageEvent) => {
      if (!ev.newValue) return;
      try {
        if (ev.key === ADMIN_STATE_STORAGE_KEY) {
          onAdminStateUpdate();
          return;
        }
        const parsed = JSON.parse(ev.newValue);
        if (!Array.isArray(parsed)) return;
        if (ev.key === CATALOG_PRODUCTS_STORAGE_KEY && parsed.length > 0) {
          setProducts(parsed as JewelleryProduct[]);
        } else if (ev.key === CATALOG_CATEGORIES_STORAGE_KEY && parsed.length > 0) {
          setCategories(parsed as CategoryCardItem[]);
        } else if (ev.key === CART_STORAGE_KEY) {
          setCart(
            parsed.filter(
              (item): item is CartItem =>
                typeof item?.productId === 'string' &&
                typeof item?.size === 'string' &&
                typeof item?.quantity === 'number' &&
                item.quantity > 0
            )
          );
        } else if (ev.key === WISHLIST_STORAGE_KEY) {
          setWishlistIds(parsed.filter((id): id is string => typeof id === 'string'));
        }
      } catch {
        // Ignore invalid storage entries gracefully
      }
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorageSync);
    window.addEventListener(ADMIN_STORAGE_EVENT, onAdminStateUpdate);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorageSync);
      window.removeEventListener(ADMIN_STORAGE_EVENT, onAdminStateUpdate);
    };
  }, [refreshAdminSession]);

  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = useCallback(
    (nextRoute: AppRoute, options: { replace?: boolean } = {}) => {
      syncBrowserUrl(nextRoute, Boolean(options.replace));
      setRoute(nextRoute);
      if (nextRoute.page === 'shop') {
        setShopFilters({
          ...DEFAULT_SHOP_FILTERS,
          category: nextRoute.category || 'All',
          subcategory: nextRoute.subcategory || 'All',
          collection: nextRoute.collection || 'All',
          onlyNewArrivals: Boolean(nextRoute.onlyNew),
          sortBy: nextRoute.onlyNew ? 'newest' : 'featured',
        });
      } else if (nextRoute.page === 'product') {
        const found = getProductBySlug(nextRoute.slug);
        if (found) setAssistantSelectedProductId(found.id);
      }
      setQuickViewProduct(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [getProductBySlug]
  );

  const applyShopFilters = useCallback(
    (
      next: Partial<ShopFilterState>,
      options: { navigateToShop?: boolean; replace?: boolean } = {}
    ) => {
      const { navigateToShop = false, replace = false } = options;

      setShopFilters((prev) => {
        const base = replace ? DEFAULT_SHOP_FILTERS : prev;
        const merged: ShopFilterState = {
          ...base,
          ...next,
        };

        if (next.priceRange && next.priceRange !== 'custom') {
          merged.minPricePkr = undefined;
          merged.maxPricePkr = undefined;
        }
        if (
          (next.minPricePkr !== undefined || next.maxPricePkr !== undefined) &&
          next.priceRange === undefined
        ) {
          merged.priceRange = 'custom';
        }

        if (navigateToShop) {
          const shopRoute: AppRoute = {
            page: 'shop',
            category: merged.category,
            subcategory: merged.subcategory,
            collection: merged.collection,
            onlyNew: merged.onlyNewArrivals,
          };
          syncBrowserUrl(shopRoute);
          setRoute(shopRoute);
          setQuickViewProduct(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        return merged;
      });
    },
    []
  );

  const resetShopFilters = useCallback((navigateToShop = true) => {
    setShopFilters(DEFAULT_SHOP_FILTERS);
    if (navigateToShop) {
      const shopRoute: AppRoute = {
        page: 'shop',
        category: 'All',
        subcategory: 'All',
        collection: 'All',
        onlyNew: false,
      };
      syncBrowserUrl(shopRoute);
      setRoute(shopRoute);
      setQuickViewProduct(null);
    }
  }, []);

  const getSelectedSize = useCallback(
    (product: JewelleryProduct) => {
      const stored = selectedSizeByProductId[product.id];
      if (stored && product.availableSizes.includes(stored)) {
        return stored;
      }
      return product.availableSizes[0] || 'Standard';
    },
    [selectedSizeByProductId]
  );

  const setProductSize = useCallback((productId: string, size: string) => {
    setSelectedSizeByProductId((prev) => ({
      ...prev,
      [productId]: size,
    }));
  }, []);

  const getSelectedFinish = useCallback(
    (product: JewelleryProduct): MetalFinishKey => {
      const stored = selectedFinishByProductId[product.id];
      if (stored) return stored;
      if (product.default3dFinish) return product.default3dFinish;
      if (/white gold|platinum/i.test(product.material)) return 'white-gold';
      if (/silver/i.test(product.material)) return 'sterling-silver';
      if (/rose/i.test(product.material)) return 'rose-gold';
      return 'champagne-gold';
    },
    [selectedFinishByProductId]
  );

  const setProductFinish = useCallback((productId: string, finish: MetalFinishKey) => {
    setSelectedFinishByProductId((prev) => ({
      ...prev,
      [productId]: finish,
    }));
  }, []);

  const activeProduct = useMemo(() => {
    if (quickViewProduct) return quickViewProduct;
    if (route.page === 'product') {
      return getProductBySlug(route.slug) || null;
    }
    if (assistantSelectedProductId) {
      return getProductById(assistantSelectedProductId) || null;
    }
    return null;
  }, [quickViewProduct, route, assistantSelectedProductId, getProductById, getProductBySlug]);

  const addToCart = useCallback(
    (
      product: JewelleryProduct,
      size?: string,
      quantity = 1,
      options: { openDrawer?: boolean } = {}
    ): AddToCartResult => {
      if (!product.inStock) {
        showToast(`${product.name} is crafted to order. Inquire on WhatsApp.`);
        return { ok: false, reason: 'made-to-order' };
      }
      const fallbackSize =
        selectedSizeByProductId[product.id] || product.availableSizes[0] || 'Standard';
      const chosenSize = size && product.availableSizes.includes(size) ? size : fallbackSize;
      const safeQty = Math.max(1, Math.floor(quantity));

      setSelectedSizeByProductId((prev) => ({
        ...prev,
        [product.id]: chosenSize,
      }));

      setCart((prev) => {
        const idx = prev.findIndex((i) => i.productId === product.id && i.size === chosenSize);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + safeQty };
          return updated;
        }
        return [...prev, { productId: product.id, size: chosenSize, quantity: safeQty }];
      });

      if (options.openDrawer !== false) {
        setIsCartOpen(true);
      }
      showToast(`Added ${product.name} to your bag`);
      return { ok: true, sizeUsed: chosenSize };
    },
    [selectedSizeByProductId, showToast]
  );

  const updateCartQuantity = useCallback((productId: string, size: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.size === size) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string, size: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.size === size)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    (productId: string) => {
      const product = getProductById(productId);
      const exists = wishlistIds.includes(productId);
      setWishlistIds((prev) => {
        const currentlyExists = prev.includes(productId);
        if (currentlyExists) {
          if (product) showToast(`Removed ${product.name} from wishlist`);
          return prev.filter((id) => id !== productId);
        }
        if (product) showToast(`Saved ${product.name} to wishlist`);
        return [...prev, productId];
      });
      return !exists;
    },
    [getProductById, wishlistIds, showToast]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const cartSubtotalPkr = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = getProductById(item.productId);
      return sum + (product ? product.pricePkr * item.quantity : 0);
    }, 0);
  }, [cart, getProductById]);

  const cartDeliveryPkr = useMemo(() => {
    if (cartSubtotalPkr === 0) return 0;
    return cartSubtotalPkr >= websiteSettings.freeDeliveryThresholdPkr
      ? 0
      : websiteSettings.standardDeliveryFeePkr;
  }, [
    cartSubtotalPkr,
    websiteSettings.freeDeliveryThresholdPkr,
    websiteSettings.standardDeliveryFeePkr,
  ]);

  const cartTotalPkr = cartSubtotalPkr + cartDeliveryPkr;

  const openSingleWhatsAppOrder = useCallback(
    (product: JewelleryProduct, size?: string, quantity = 1) => {
      const chosenSize =
        size || selectedSizeByProductId[product.id] || product.availableSizes[0] || 'Standard';
      const safeQty = Math.max(1, Math.floor(quantity));
      const item: WhatsAppSingleOrderItem = {
        name: product.name,
        sku: product.sku,
        category: product.category,
        material: product.material,
        size: chosenSize,
        quantity: safeQty,
        unitPricePkr: product.pricePkr,
      };
      setWhatsappModalPayload({
        type: 'single',
        item,
        defaultMessage: buildSingleProductWhatsAppMessage(item),
      });
    },
    [selectedSizeByProductId]
  );

  const openCartWhatsAppOrder = useCallback(() => {
    const detailedItems = cart
      .map((entry) => {
        const product = getProductById(entry.productId);
        if (!product) return null;
        return {
          name: product.name,
          sku: product.sku,
          size: entry.size,
          quantity: entry.quantity,
          unitPricePkr: product.pricePkr,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (detailedItems.length === 0) return;

    setIsCartOpen(false);
    setWhatsappModalPayload({
      type: 'cart',
      itemsCount: cartCount,
      totalPkr: cartTotalPkr,
      defaultMessage: buildCartWhatsAppMessage(
        detailedItems,
        cartSubtotalPkr,
        cartDeliveryPkr,
        cartTotalPkr
      ),
    });
  }, [cart, cartCount, cartSubtotalPkr, cartDeliveryPkr, cartTotalPkr, getProductById]);

  const value: StoreContextValue = {
    route,
    navigate,
    products,
    categories,
    mainCategories,
    websiteSettings,
    setWebsiteSettings,
    getProductById,
    getProductBySlug,
    refreshCatalog,
    applyCatalogSnapshot,
    adminSession,
    adminSessionChecked,
    refreshAdminSession,
    logoutAdmin,
    shopFilters,
    applyShopFilters,
    resetShopFilters,
    selectedSizeByProductId,
    getSelectedSize,
    setProductSize,
    selectedFinishByProductId,
    getSelectedFinish,
    setProductFinish,
    assistantSelectedProductId,
    setAssistantSelectedProductId,
    activeProduct,
    cart,
    cartCount,
    cartSubtotalPkr,
    cartDeliveryPkr,
    cartTotalPkr,
    isCartOpen,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    wishlistIds,
    toggleWishlist,
    isWishlisted,
    quickViewProduct,
    openQuickView: (product) => {
      setAssistantSelectedProductId(product.id);
      setQuickViewProduct(product);
    },
    closeQuickView: () => setQuickViewProduct(null),
    whatsappModalPayload,
    openSingleWhatsAppOrder,
    openCartWhatsAppOrder,
    closeWhatsAppModal: () => setWhatsappModalPayload(null),
    toast,
    dismissToast: () => setToast(null),
    showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
