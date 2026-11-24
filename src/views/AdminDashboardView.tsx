import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Gem,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Pencil,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  Upload,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {
  COLLECTIONS,
  SUBCATEGORIES,
  getDiscountPercentage,
  type CategoryCardItem,
  type JewelleryProduct,
} from '../data/products';
import { AdminSection, useStore } from '../context/StoreContext';
import { STORE_CONFIG, formatPKR } from '../config/storeConfig';
import type { AdminDashboardPayload } from '../types/assistant';
import { safeReadJson } from '../utils/safeFetchJson';
import { JewelryImage } from '../components/JewelryImage';
import { AdminOverviewSection } from '../components/admin/AdminOverviewSection';
import { AdminOrdersSection } from '../components/admin/AdminOrdersSection';
import {
  AdminCouponsSection,
  AdminCustomersSection,
  AdminDiscountsSection,
  AdminInventorySection,
  AdminReviewsSection,
} from '../components/admin/AdminCommerceSections';
import {
  AdminAnalyticsSection,
  AdminNotificationsSection,
  AdminPaymentsSection,
  AdminReportsSection,
  AdminShippingSection,
} from '../components/admin/AdminOperationsSections';
import {
  AdminActivitySection,
  AdminProfileSection,
  AdminWebsiteSettingsSection,
  AdminWhatsAppAlertsSection,
} from '../components/admin/AdminSettingsSections';
import {
  compressImageFileToDataUrl,
  computeDashboardPayload,
  loadPersistedAdminState,
  mergeDashboardFromServer,
  storageDeleteCategory,
  storageDeleteProduct,
  storageUpdateAdminPreferences,
  storageUpsertCategory,
  storageUpsertProduct,
} from '../utils/adminStorage';

const STUDIO_GALLERY_IMAGES = [
  '/src/assets/images/cat_rings_solitaire_1795173688192.jpg',
  '/src/assets/images/cat_necklaces_gold_1795173687371.jpg',
  '/src/assets/images/cat_earrings_jhumka_1795173687924.jpg',
  '/src/assets/images/cat_bracelets_chain_1795173686866.jpg',
  '/src/assets/images/cat_bangles_kara_1795173688625.jpg',
  '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
  '/src/assets/images/cat_pendants_emerald_1795173687582.jpg',
  '/src/assets/images/cat_diamond_necklace_render_1795174246914.jpg',
  '/src/assets/images/cat_diamond_stud_hoops_1795174247335.jpg',
  '/src/assets/images/cat_wedding_bands_1795174246552.jpg',
  '/src/assets/images/cat_silver_jewellery_render_1795174246954.jpg',
  '/src/assets/images/cat_mens_jewellery_render_1795174247389.jpg',
  '/src/assets/images/hero_luxury_jewellery_1795173687556.jpg',
  '/src/assets/images/atelier_craftsmanship_1795173687131.jpg',
];

interface ProductFormState {
  id?: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  collection: string;
  pricePkr: string;
  discountPercent: string;
  stockQuantity: string;
  lowStockThreshold: string;
  material: string;
  weightGrams: string;
  gemstones: string;
  availableSizes: string;
  shortDescription: string;
  description: string;
  careNote: string;
  imageUrl: string;
  inStock: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
}

interface CategoryFormState {
  originalName?: string;
  category: string;
  description: string;
  image: string;
}

interface NavGroup {
  heading: string;
  items: Array<{
    key: AdminSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }>;
}

export function AdminDashboardView({
  initialSection = 'overview',
}: {
  initialSection?: AdminSection;
}) {
  const {
    navigate,
    products,
    categories,
    mainCategories,
    websiteSettings,
    setWebsiteSettings,
    applyCatalogSnapshot,
    adminSession,
    adminSessionChecked,
    refreshAdminSession,
    logoutAdmin,
    showToast,
  } = useStore();

  const initialLocalState = useMemo(() => loadPersistedAdminState(), []);

  const [section, setSection] = useState<AdminSection>(initialSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<AdminDashboardPayload | null>(() =>
    computeDashboardPayload(initialLocalState, {
      email: adminSession.email || 'admin',
      source: 'env',
      canChangePassword: false,
      whatsappConfigured: false,
    })
  );
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>(
    () => initialLocalState.adminPreferences.defaultProductCategoryFilter || 'All'
  );

  // Product Add/Edit Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: '',
    sku: '',
    category: mainCategories[0] || 'Rings',
    subcategory: '',
    collection: COLLECTIONS[0],
    pricePkr: '',
    discountPercent: '0',
    stockQuantity: '6',
    lowStockThreshold: '2',
    material: '22K Solid Yellow Gold',
    weightGrams: '10.0 g',
    gemstones: 'Certified Fine Gemstones',
    availableSizes: 'Standard',
    shortDescription: '',
    description: '',
    careNote: 'Store inside the velvet pouch provided; polish gently with a dry chamois cloth.',
    imageUrl: STUDIO_GALLERY_IMAGES[0],
    inStock: true,
    isBestSeller: false,
    isNewArrival: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Add/Edit Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    category: '',
    description: '',
    image: STUDIO_GALLERY_IMAGES[0],
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'product'; id: string; label: string }
    | { kind: 'category'; name: string; label: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const handleUnauthorized = useCallback(() => {
    void refreshAdminSession();
    navigate({ page: 'admin-login' }, { replace: true });
  }, [navigate, refreshAdminSession]);

  const refreshFromLocalStorage = useCallback(() => {
    const local = loadPersistedAdminState();
    const profile = dashboardData?.profile || {
      email: adminSession.email || 'admin',
      source: 'env' as const,
      canChangePassword: false,
      whatsappConfigured: false,
    };
    const computed = computeDashboardPayload(local, profile);
    setDashboardData(computed);
    setWebsiteSettings(local.websiteSettings);
    return { local, computed };
  }, [adminSession.email, dashboardData?.profile, setWebsiteSettings]);

  const syncLocalWorkspaceToServer = useCallback(async () => {
    const local = loadPersistedAdminState();
    try {
      await fetch('/api/admin/restore', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          mode: 'replace',
          silent: true,
          data: {
            products: local.products,
            categories: local.categories,
            orders: local.orders,
            customers: local.customers,
            coupons: local.coupons,
            reviews: local.reviews,
            shippingZones: local.shippingZones,
            notifications: local.notifications,
            websiteSettings: local.websiteSettings,
            activityLogs: local.activityLogs,
            deletedIds: local.deletedIds,
          },
        }),
      });
    } catch {
      // Chrome LocalStorage remains authoritative if offline
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (HTTP ${res.status}).`);
      }
      const data = await safeReadJson<AdminDashboardPayload>(res, 'Admin dashboard');
      const localBefore = loadPersistedAdminState();
      const merged = mergeDashboardFromServer(
        data,
        localBefore.hasCustomEdits ? undefined : { products, categories }
      );
      const computed = computeDashboardPayload(merged, data.profile);
      setDashboardData(computed);
      setWebsiteSettings(merged.websiteSettings);

      // If browser LocalStorage holds persisted custom edits/orders missing from a cold-started server, re-sync server silently
      const serverNeedsSync =
        merged.hasCustomEdits &&
        (merged.orders.length > data.orders.length ||
          merged.customers.length > data.customers.length ||
          merged.coupons.length > data.coupons.length ||
          merged.reviews.length > data.reviews.length ||
          merged.products.length !== data.stats.totalProducts ||
          merged.categories.length !== data.stats.totalCategories ||
          merged.deletedIds.products.length > 0 ||
          merged.deletedIds.categories.length > 0);
      if (serverNeedsSync) {
        void syncLocalWorkspaceToServer();
      }
    } catch (err) {
      refreshFromLocalStorage();
      setActionError(
        err instanceof Error ? err.message : 'Unable to refresh server records; showing saved Chrome storage data.'
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [
    categories,
    handleUnauthorized,
    products,
    refreshFromLocalStorage,
    setWebsiteSettings,
    syncLocalWorkspaceToServer,
  ]);

  // Zero-trust re-verification on mount, focus, and bfcache pageshow
  useEffect(() => {
    let active = true;
    const verify = async () => {
      const session = await refreshAdminSession();
      if (!active) return;
      if (!session.authenticated) {
        navigate({ page: 'admin-login' }, { replace: true });
      } else {
        void fetchDashboard();
      }
    };
    void verify();

    const onFocusOrPageShow = () => {
      void verify();
    };
    window.addEventListener('focus', onFocusOrPageShow);
    window.addEventListener('pageshow', onFocusOrPageShow);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocusOrPageShow);
      window.removeEventListener('pageshow', onFocusOrPageShow);
    };
  }, [fetchDashboard, navigate, refreshAdminSession]);

  const switchSection = (next: AdminSection) => {
    setSection(next);
    setSidebarOpen(false);
    storageUpdateAdminPreferences({ lastActiveSection: next });
    navigate({ page: 'admin', section: next });
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (
        productCategoryFilter !== 'All' &&
        p.category !== productCategoryFilter &&
        !p.categories.includes(productCategoryFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return `${p.name} ${p.sku} ${p.category} ${p.collection} ${p.material}`
        .toLowerCase()
        .includes(q);
    });
  }, [products, productCategoryFilter, productSearch]);

  const openAddProductModal = () => {
    setActionError(null);
    setProductForm({
      name: '',
      sku: '',
      category: mainCategories[0] || 'Rings',
      subcategory: '',
      collection: COLLECTIONS[0],
      pricePkr: '',
      discountPercent: '0',
      stockQuantity: '6',
      lowStockThreshold: String(websiteSettings.defaultLowStockThreshold || 2),
      material: '22K Solid Yellow Gold',
      weightGrams: '10.0 g',
      gemstones: 'Certified Fine Gemstones',
      availableSizes: 'Standard',
      shortDescription: '',
      description: '',
      careNote: 'Store inside the velvet pouch provided; polish gently with a dry chamois cloth.',
      imageUrl: STUDIO_GALLERY_IMAGES[0],
      inStock: true,
      isBestSeller: false,
      isNewArrival: true,
    });
    setProductModalOpen(true);
  };

  const openEditProductModal = (product: JewelleryProduct) => {
    setActionError(null);
    const discountPct = getDiscountPercentage(product);
    setProductForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      subcategory: product.subcategory || '',
      collection: product.collection,
      pricePkr: String(product.pricePkr),
      discountPercent: String(discountPct ?? 0),
      stockQuantity: String(product.stockQuantity ?? (product.inStock ? 6 : 0)),
      lowStockThreshold: String(product.lowStockThreshold ?? 2),
      material: product.material,
      weightGrams: product.weightGrams,
      gemstones: product.gemstones,
      availableSizes: product.availableSizes.join(', '),
      shortDescription: product.shortDescription,
      description: product.description,
      careNote: product.careNote,
      imageUrl: product.images[0] || STUDIO_GALLERY_IMAGES[0],
      inStock: product.inStock,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
    });
    setProductModalOpen(true);
  };

  const handleImageFileUpload = async (
    file: File | undefined,
    onDone: (uploadedUrl: string) => void
  ) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setActionError('Image file must be under 4 MB.');
      return;
    }
    setUploadingImage(true);
    setActionError(null);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file);
      if (!compressedDataUrl || compressedDataUrl.length > 1_900_000) {
        throw new Error('Compressed image is still too large for browser storage. Choose a smaller photo.');
      }
      onDone(compressedDataUrl);
      showToast('Image prepared for permanent Chrome storage.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to process image file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProduct) return;

    const parsedPrice = Math.round(Number(productForm.pricePkr));
    const parsedDiscount = Math.max(0, Math.min(90, Number(productForm.discountPercent) || 0));
    const parsedStock = Math.max(0, Math.floor(Number(productForm.stockQuantity) || 0));
    const parsedThreshold = Math.max(0, Math.floor(Number(productForm.lowStockThreshold) || 0));

    if (!productForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setActionError('Please enter a valid product name and selling price in PKR.');
      return;
    }

    setSavingProduct(true);
    setActionError(null);

    const isEditing = Boolean(productForm.id);
    const compareAtPricePkr =
      parsedDiscount > 0 ? Math.round(parsedPrice / (1 - parsedDiscount / 100)) : undefined;
    const availableSizes = productForm.availableSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || undefined,
      category: productForm.category.trim(),
      categories: [productForm.category.trim()],
      subcategory: productForm.subcategory.trim() || undefined,
      collection: productForm.collection.trim(),
      pricePkr: parsedPrice,
      discountPercent: parsedDiscount,
      compareAtPricePkr,
      stockQuantity: parsedStock,
      lowStockThreshold: parsedThreshold,
      material: productForm.material.trim(),
      weightGrams: productForm.weightGrams.trim(),
      gemstones: productForm.gemstones.trim(),
      availableSizes: availableSizes.length > 0 ? availableSizes : ['Standard'],
      shortDescription: productForm.shortDescription.trim(),
      description: productForm.description.trim(),
      careNote: productForm.careNote.trim(),
      images: [productForm.imageUrl.trim() || STUDIO_GALLERY_IMAGES[0]],
      inStock: parsedStock > 0 ? productForm.inStock : false,
      isBestSeller: productForm.isBestSeller,
      isNewArrival: productForm.isNewArrival,
    };

    try {
      const url = isEditing
        ? `/api/admin/products/${encodeURIComponent(productForm.id!)}`
        : '/api/admin/products';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (res.ok) {
        const data = (await res.json()) as {
          product?: JewelleryProduct;
          products?: JewelleryProduct[];
          categories?: CategoryCardItem[];
        };
        if (data.product) {
          const nextState = storageUpsertProduct(
            data.product,
            adminSession.email || 'admin',
            isEditing
          );
          applyCatalogSnapshot({
            products: nextState.products,
            categories: nextState.categories,
          });
        } else if (data.products) {
          applyCatalogSnapshot({ products: data.products, categories: data.categories });
        }
        setProductModalOpen(false);
        showToast(isEditing ? 'Product updated & saved in Chrome storage.' : 'New product saved permanently.');
        refreshFromLocalStorage();
        return;
      }

      // If server returned 400 validation error on fields, surface it cleanly
      if (res.status === 400) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Please check the product fields.');
      }

      // Server cold-started (e.g. 404 item missing on ephemeral backend): persist in Chrome LocalStorage & re-sync server
      const existingProd = isEditing ? products.find((p) => p.id === productForm.id) : undefined;
      const localRecord: JewelleryProduct = {
        ...(existingProd || {}),
        id: productForm.id || `za-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
        slug: existingProd?.slug || `${productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
        sku: payload.sku || existingProd?.sku || `ZA-${Date.now().toString().slice(-4)}`,
        name: payload.name,
        category: payload.category,
        categories: payload.categories,
        subcategory: payload.subcategory,
        collection: payload.collection,
        pricePkr: payload.pricePkr,
        compareAtPricePkr: payload.compareAtPricePkr,
        rating: existingProd?.rating ?? 4.9,
        reviewCount: existingProd?.reviewCount ?? 1,
        material: payload.material,
        weightGrams: payload.weightGrams,
        gemstones: payload.gemstones,
        availableSizes: payload.availableSizes,
        shortDescription: payload.shortDescription || payload.description || payload.name,
        description: payload.description || payload.shortDescription || payload.name,
        careNote: payload.careNote,
        images: payload.images,
        isNewArrival: payload.isNewArrival,
        isBestSeller: payload.isBestSeller,
        popularityScore: existingProd?.popularityScore ?? (payload.isBestSeller ? 96 : 85),
        inStock: payload.inStock,
        stockQuantity: payload.stockQuantity,
        lowStockThreshold: payload.lowStockThreshold,
        releasedOrder: existingProd?.releasedOrder ?? products.length + 1,
      };
      const nextState = storageUpsertProduct(localRecord, adminSession.email || 'admin', isEditing);
      applyCatalogSnapshot({ products: nextState.products, categories: nextState.categories });
      refreshFromLocalStorage();
      void syncLocalWorkspaceToServer();
      setProductModalOpen(false);
      showToast(isEditing ? 'Product updated in Chrome LocalStorage.' : 'Product saved in Chrome LocalStorage.');
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        // Network offline fallback -> Chrome LocalStorage
        const existingProd = isEditing ? products.find((p) => p.id === productForm.id) : undefined;
        const localRecord: JewelleryProduct = {
          ...(existingProd || {}),
          id: productForm.id || `za-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
          slug: existingProd?.slug || `${productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
          sku: payload.sku || existingProd?.sku || `ZA-${Date.now().toString().slice(-4)}`,
          name: payload.name,
          category: payload.category,
          categories: payload.categories,
          subcategory: payload.subcategory,
          collection: payload.collection,
          pricePkr: payload.pricePkr,
          compareAtPricePkr: payload.compareAtPricePkr,
          rating: existingProd?.rating ?? 4.9,
          reviewCount: existingProd?.reviewCount ?? 1,
          material: payload.material,
          weightGrams: payload.weightGrams,
          gemstones: payload.gemstones,
          availableSizes: payload.availableSizes,
          shortDescription: payload.shortDescription || payload.description || payload.name,
          description: payload.description || payload.shortDescription || payload.name,
          careNote: payload.careNote,
          images: payload.images,
          isNewArrival: payload.isNewArrival,
          isBestSeller: payload.isBestSeller,
          popularityScore: existingProd?.popularityScore ?? 85,
          inStock: payload.inStock,
          stockQuantity: payload.stockQuantity,
          lowStockThreshold: payload.lowStockThreshold,
          releasedOrder: existingProd?.releasedOrder ?? products.length + 1,
        };
        const nextState = storageUpsertProduct(localRecord, adminSession.email || 'admin', isEditing);
        applyCatalogSnapshot({ products: nextState.products, categories: nextState.categories });
        refreshFromLocalStorage();
        setProductModalOpen(false);
        showToast('Saved persistently to Chrome LocalStorage.');
      } else {
        setActionError(err instanceof Error ? err.message : 'Unable to save product.');
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const openAddCategoryModal = () => {
    setActionError(null);
    setCategoryForm({
      category: '',
      description: '',
      image: STUDIO_GALLERY_IMAGES[0],
    });
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryCardItem) => {
    setActionError(null);
    setCategoryForm({
      originalName: cat.category,
      category: cat.category,
      description: cat.description,
      image: cat.image,
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCategory || !categoryForm.category.trim()) return;

    setSavingCategory(true);
    setActionError(null);

    const isEditing = Boolean(categoryForm.originalName);
    const catItem: CategoryCardItem = {
      category: categoryForm.category.trim(),
      description: categoryForm.description.trim(),
      image: categoryForm.image.trim() || STUDIO_GALLERY_IMAGES[0],
    };

    try {
      const url = isEditing
        ? `/api/admin/categories/${encodeURIComponent(categoryForm.originalName!)}`
        : '/api/admin/categories';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(catItem),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (res.status === 400) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Invalid category data.');
      }

      const nextState = storageUpsertCategory(
        catItem,
        categoryForm.originalName,
        adminSession.email || 'admin'
      );
      applyCatalogSnapshot({ categories: nextState.categories, products: nextState.products });
      refreshFromLocalStorage();
      if (!res.ok) {
        void syncLocalWorkspaceToServer();
      }
      setCategoryModalOpen(false);
      showToast(isEditing ? 'Category updated permanently.' : 'New category created permanently.');
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        const nextState = storageUpsertCategory(
          catItem,
          categoryForm.originalName,
          adminSession.email || 'admin'
        );
        applyCatalogSnapshot({ categories: nextState.categories, products: nextState.products });
        refreshFromLocalStorage();
        setCategoryModalOpen(false);
        showToast('Category saved to Chrome LocalStorage.');
      } else {
        setActionError(err instanceof Error ? err.message : 'Unable to save category.');
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setActionError(null);

    try {
      const url =
        deleteTarget.kind === 'product'
          ? `/api/admin/products/${encodeURIComponent(deleteTarget.id)}`
          : `/api/admin/categories/${encodeURIComponent(deleteTarget.name)}`;

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const nextState =
        deleteTarget.kind === 'product'
          ? storageDeleteProduct(deleteTarget.id, adminSession.email || 'admin')
          : storageDeleteCategory(deleteTarget.name, adminSession.email || 'admin');

      applyCatalogSnapshot({ products: nextState.products, categories: nextState.categories });
      refreshFromLocalStorage();
      if (!res.ok) {
        void syncLocalWorkspaceToServer();
      }
      showToast(`Deleted "${deleteTarget.label}".`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        const nextState =
          deleteTarget.kind === 'product'
            ? storageDeleteProduct(deleteTarget.id, adminSession.email || 'admin')
            : storageDeleteCategory(deleteTarget.name, adminSession.email || 'admin');
        applyCatalogSnapshot({ products: nextState.products, categories: nextState.categories });
        refreshFromLocalStorage();
        showToast(`Deleted "${deleteTarget.label}" from Chrome storage.`);
        setDeleteTarget(null);
      } else {
        setActionError(err instanceof Error ? err.message : 'Unable to complete delete.');
      }
    } finally {
      setDeleting(false);
    }
  };

  // Block rendering private UI until real server verification confirms authenticated admin session
  if (!adminSessionChecked || !adminSession.authenticated) {
    return (
      <div className="min-h-screen bg-[#F8F5EF] flex items-center justify-center p-6">
        <div className="text-xs uppercase tracking-[0.18em] text-[#252525]/60">
          Authorizing Private Workspace...
        </div>
      </div>
    );
  }

  const fallbackDashboard: AdminDashboardPayload = dashboardData || {
    stats: {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalOrders: 0,
      newOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      refundedOrders: 0,
      totalCustomers: 0,
      totalRevenuePkr: 0,
      todaysSalesPkr: 0,
      monthlySalesPkr: 0,
      inStockCount: products.filter((p) => p.inStock).length,
      lowStockCount: 0,
      outOfStockCount: products.filter((p) => !p.inStock).length,
      featuredCount: products.filter((p) => p.isBestSeller).length,
      activeCouponsCount: 0,
      pendingReviewsCount: 0,
      unreadNotificationsCount: 0,
      whatsappConfigured: false,
    },
    orders: [],
    customers: [],
    coupons: [],
    reviews: [],
    shippingZones: [],
    notifications: [],
    activityLogs: [],
    settings: websiteSettings,
    profile: {
      email: adminSession.email || 'admin',
      source: 'env',
      canChangePassword: false,
      whatsappConfigured: false,
    },
    topSellingProducts: [],
    lowStockProducts: [],
    revenueByDay: [],
  };

  const navGroups: NavGroup[] = [
    {
      heading: 'Overview & Insights',
      items: [
        { key: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { key: 'analytics', label: 'Sales & Revenue', icon: <BarChart3 className="w-4 h-4" /> },
        { key: 'reports', label: 'Reports & Export', icon: <FileSpreadsheet className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Catalog & Merchandising',
      items: [
        { key: 'products', label: 'Products Management', icon: <Gem className="w-4 h-4" /> },
        { key: 'categories', label: 'Category Management', icon: <FolderOpen className="w-4 h-4" /> },
        { key: 'inventory', label: 'Inventory Management', icon: <Boxes className="w-4 h-4" />, badge: fallbackDashboard.stats.lowStockCount + fallbackDashboard.stats.outOfStockCount },
        { key: 'discounts', label: 'Discounts & Offers', icon: <Percent className="w-4 h-4" /> },
        { key: 'coupons', label: 'Coupon Management', icon: <Tag className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Orders & Clients',
      items: [
        { key: 'orders', label: 'Orders Management', icon: <ShoppingBag className="w-4 h-4" />, badge: fallbackDashboard.stats.pendingOrders },
        { key: 'customers', label: 'Customer Management', icon: <Users className="w-4 h-4" /> },
        { key: 'reviews', label: 'Reviews & Ratings', icon: <Star className="w-4 h-4" /> },
        { key: 'payments', label: 'Payments Management', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'shipping', label: 'Shipping & Delivery', icon: <Truck className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Alerts & Settings',
      items: [
        { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: fallbackDashboard.stats.unreadNotificationsCount },
        { key: 'whatsapp', label: 'WhatsApp Alerts', icon: <MessageCircle className="w-4 h-4" /> },
        { key: 'activity', label: 'Security & Activity', icon: <Activity className="w-4 h-4" /> },
        { key: 'website-settings', label: 'Website Settings', icon: <Globe className="w-4 h-4" /> },
        { key: 'profile', label: 'Admin Profile', icon: <UserCog className="w-4 h-4" /> },
      ],
    },
  ];

  const activeNavLabel =
    navGroups.flatMap((g) => g.items).find((i) => i.key === section)?.label || 'Admin Panel';

  const priceNum = Number(productForm.pricePkr) || 0;
  const discountNum = Math.max(0, Math.min(90, Number(productForm.discountPercent) || 0));
  const previewCompareAt =
    priceNum > 0 && discountNum > 0 ? Math.round(priceNum / (1 - discountNum / 100)) : null;

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#252525] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#252525]/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#252525] text-[#FFFDF8] flex flex-col justify-between shrink-0 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#FFFDF8]/12">
            <div>
              <p className="font-serif text-xl font-semibold tracking-tight text-[#FFFDF8]">
                {STORE_CONFIG.brandName}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#C6A15B] mt-0.5">
                Private Admin Console
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden w-8 h-8 flex items-center justify-center text-[#FFFDF8]/70 hover:text-[#FFFDF8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav aria-label="Admin sections" className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <p className="px-3 text-[10px] uppercase tracking-[0.15em] text-[#FFFDF8]/45 font-medium">
                  {group.heading}
                </p>
                {group.items.map((item) => {
                  const active = section === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => switchSection(item.key)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#C6A15B] text-[#252525]'
                          : 'text-[#FFFDF8]/80 hover:bg-[#FFFDF8]/10 hover:text-[#FFFDF8]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                            active ? 'text-[#252525]' : 'text-[#C6A15B]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#FFFDF8]/12">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#E8DDCC] hover:bg-[#FFFDF8]/10 transition-colors cursor-pointer"
            >
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C6A15B]" />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-[#FFFDF8]/12 space-y-2.5 bg-[#1E1E1E] shrink-0">
          <div className="text-xs">
            <span className="block text-[10px] uppercase tracking-wider text-[#FFFDF8]/50">
              Signed in as
            </span>
            <span className="block text-[#FFFDF8] font-medium truncate mt-0.5">
              {adminSession.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void logoutAdmin()}
            className="w-full py-2 px-3 bg-[#FFFDF8]/10 hover:bg-[#FFFDF8]/18 text-[#FFFDF8] text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 bg-[#FFFDF8] border-b border-[#252525]/10 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden w-10 h-10 flex items-center justify-center border border-[#252525]/15 text-[#252525] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-serif text-xl sm:text-2xl font-medium text-[#252525] truncate">
              {activeNavLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => switchSection('notifications')}
              aria-label="Open Notifications"
              className="relative w-9 h-9 flex items-center justify-center border border-[#252525]/18 bg-[#F8F5EF] hover:border-[#C6A15B] cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#252525]" />
              {fallbackDashboard.stats.unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#252525] text-[#C6A15B] text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {fallbackDashboard.stats.unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={openAddProductModal}
              className="px-3.5 py-2 min-h-[38px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Product</span>
            </button>
            <button
              type="button"
              onClick={() => void logoutAdmin()}
              className="px-3 py-2 min-h-[38px] border border-[#252525]/20 bg-[#F8F5EF] text-xs font-medium text-[#252525] hover:border-[#C6A15B] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#8E6E30]" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {actionError && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-red-700 font-medium cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {section === 'overview' && (
            <AdminOverviewSection
              dashboard={fallbackDashboard}
              products={products}
              categories={categories}
              loading={loadingDashboard}
              onSwitchSection={switchSection}
              onOpenAddProduct={openAddProductModal}
              onOpenAddCategory={openAddCategoryModal}
            />
          )}

          {/* PRODUCTS CRUD SECTION */}
          {section === 'products' && (
            <div className="space-y-5">
              <div className="bg-[#FFFDF8] border border-[#252525]/10 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#252525]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search by product name, SKU, material..."
                      className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                    />
                  </div>

                  <select
                    value={productCategoryFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProductCategoryFilter(val);
                      storageUpdateAdminPreferences({ defaultProductCategoryFilter: val });
                    }}
                    aria-label="Filter products by category"
                    className="px-3 py-2 min-h-[40px] bg-[#F8F5EF] border border-[#252525]/15 text-xs text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  >
                    <option value="All">All Categories ({products.length})</option>
                    {mainCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="px-4 py-2 min-h-[40px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map((product) => {
                  const discPct = getDiscountPercentage(product);
                  return (
                    <article
                      key={product.id}
                      className="bg-[#FFFDF8] border border-[#252525]/12 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-14 shrink-0 bg-[#E8DDCC] border border-[#252525]/10 overflow-hidden">
                          <JewelryImage
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-base font-semibold text-[#252525] leading-snug">
                            {product.name}
                          </h3>
                          <p className="text-[11px] text-[#252525]/60 mt-0.5 tabular-nums">
                            {product.category} · SKU: {product.sku} · Stock:{' '}
                            {product.stockQuantity ?? (product.inStock ? 6 : 0)}
                          </p>
                          <p className="text-xs font-semibold text-[#252525] mt-1 tabular-nums">
                            {formatPKR(product.pricePkr)}
                            {discPct !== null && (
                              <span className="ml-1.5 text-[11px] text-[#8E6E30]">
                                (-{discPct}%)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#252525]/8">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium ${
                            product.inStock
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-[#E8DDCC] text-[#8E6E30] border border-[#C6A15B]/40'
                          }`}
                        >
                          {product.inStock ? 'In Stock' : 'Made to Order'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(product)}
                            className="px-3 py-1.5 min-h-[36px] border border-[#252525]/18 bg-[#F8F5EF] text-xs font-medium text-[#252525] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-[#8E6E30]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'product',
                                id: product.id,
                                label: product.name,
                              })
                            }
                            className="px-3 py-1.5 min-h-[36px] border border-red-200 bg-red-50 text-xs font-medium text-red-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-[#FFFDF8] border border-[#252525]/10 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#252525]/10 bg-[#F8F5EF] text-[11px] uppercase tracking-wider text-[#252525]/65">
                      <th className="py-3 px-4 font-medium">Piece</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium">Price (PKR)</th>
                      <th className="py-3 px-4 font-medium">Stock</th>
                      <th className="py-3 px-4 font-medium">Tags</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]/8">
                    {filteredProducts.map((product) => {
                      const discPct = getDiscountPercentage(product);
                      const qty = product.stockQuantity ?? (product.inStock ? 6 : 0);
                      return (
                        <tr key={product.id} className="hover:bg-[#F8F5EF]/60">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="w-14 h-12 shrink-0 bg-[#E8DDCC] border border-[#252525]/10 overflow-hidden">
                                <JewelryImage
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-serif text-sm font-semibold text-[#252525] truncate max-w-[220px]">
                                  {product.name}
                                </p>
                                <p className="text-[11px] text-[#252525]/55 tabular-nums">
                                  SKU: {product.sku}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#252525]/80 whitespace-nowrap">
                            {product.category}
                          </td>
                          <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-[#252525]">
                              {formatPKR(product.pricePkr)}
                            </span>
                            {discPct !== null && (
                              <span className="ml-1.5 text-[11px] font-semibold text-[#8E6E30]">
                                (-{discPct}%)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-medium ${
                                product.inStock
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-[#E8DDCC] text-[#8E6E30] border border-[#C6A15B]/40'
                              }`}
                            >
                              {product.inStock ? `${qty} In Stock` : 'Made to Order'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {product.isBestSeller && (
                                <span className="px-2 py-0.5 bg-[#252525] text-[#FFFDF8] text-[10px]">
                                  Featured
                                </span>
                              )}
                              {product.isNewArrival && (
                                <span className="px-2 py-0.5 bg-[#E8DDCC] text-[#252525] text-[10px]">
                                  New
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProductModal(product)}
                                className="px-2.5 py-1.5 border border-[#252525]/18 bg-[#FFFDF8] hover:border-[#C6A15B] text-[#252525] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-[#8E6E30]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: 'product',
                                    id: product.id,
                                    label: product.name,
                                  })
                                }
                                className="px-2.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES CRUD SECTION */}
          {section === 'categories' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFDF8] border border-[#252525]/10 p-4">
                <p className="text-xs text-[#252525]/70">
                  Manage jewellery departments. Changes update the storefront navigation, filters, and Noor AI concierge immediately.
                </p>
                <button
                  type="button"
                  onClick={openAddCategoryModal}
                  className="px-4 py-2 min-h-[40px] bg-[#252525] text-[#FFFDF8] text-xs font-medium hover:bg-[#363636] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Add New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.category === cat.category || p.categories.includes(cat.category)
                  ).length;

                  return (
                    <article
                      key={cat.category}
                      className="bg-[#FFFDF8] border border-[#252525]/12 flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        <div className="aspect-[16/10] w-full bg-[#E8DDCC] overflow-hidden">
                          <JewelryImage
                            src={cat.image}
                            alt={cat.category}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="p-4 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-serif text-xl font-semibold text-[#252525]">
                              {cat.category}
                            </h3>
                            <span className="text-[11px] text-[#8E6E30] font-medium tabular-nums">
                              {count} {count === 1 ? 'piece' : 'pieces'}
                            </span>
                          </div>
                          <p className="text-xs text-[#252525]/65 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 border-t border-[#252525]/8 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCategoryModal(cat)}
                          className="flex-1 py-2 px-3 border border-[#252525]/18 bg-[#F8F5EF] hover:border-[#C6A15B] text-xs font-medium text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#8E6E30]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'category',
                              name: cat.category,
                              label: cat.category,
                            })
                          }
                          className="py-2 px-3 border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-medium text-red-800 inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {section === 'orders' && (
            <AdminOrdersSection
              orders={fallbackDashboard.orders}
              products={products}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'customers' && (
            <AdminCustomersSection
              customers={fallbackDashboard.customers}
              orders={fallbackDashboard.orders}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'inventory' && (
            <AdminInventorySection
              products={products}
              applyCatalogSnapshot={applyCatalogSnapshot}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'discounts' && (
            <AdminDiscountsSection
              products={products}
              categories={categories}
              applyCatalogSnapshot={applyCatalogSnapshot}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'coupons' && (
            <AdminCouponsSection
              coupons={fallbackDashboard.coupons}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'reviews' && (
            <AdminReviewsSection
              reviews={fallbackDashboard.reviews}
              products={products}
              applyCatalogSnapshot={applyCatalogSnapshot}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'payments' && (
            <AdminPaymentsSection
              orders={fallbackDashboard.orders}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'shipping' && (
            <AdminShippingSection
              shippingZones={fallbackDashboard.shippingZones}
              orders={fallbackDashboard.orders}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'analytics' && (
            <AdminAnalyticsSection dashboard={fallbackDashboard} products={products} />
          )}

          {section === 'reports' && (
            <AdminReportsSection
              dashboard={fallbackDashboard}
              products={products}
              categories={categories}
              applyCatalogSnapshot={applyCatalogSnapshot}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'notifications' && (
            <AdminNotificationsSection
              notifications={fallbackDashboard.notifications}
              profile={fallbackDashboard.profile}
              onSwitchSection={switchSection}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'whatsapp' && (
            <AdminWhatsAppAlertsSection
              whatsappConfigured={fallbackDashboard.stats.whatsappConfigured}
              settings={fallbackDashboard.settings}
              activityLogs={fallbackDashboard.activityLogs}
            />
          )}

          {section === 'activity' && (
            <AdminActivitySection activityLogs={fallbackDashboard.activityLogs} />
          )}

          {section === 'website-settings' && (
            <AdminWebsiteSettingsSection
              settings={fallbackDashboard.settings}
              onSettingsSaved={setWebsiteSettings}
              onRefreshDashboard={refreshFromLocalStorage}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}

          {section === 'profile' && (
            <AdminProfileSection
              profile={fallbackDashboard.profile}
              onUnauthorized={handleUnauthorized}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={productForm.id ? 'Edit Product' : 'Add Product'}
        >
          <div
            className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]"
            onClick={() => setProductModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between shrink-0">
              <h2 className="font-serif text-xl font-medium">
                {productForm.id ? 'Edit Jewellery Product' : 'Add New Jewellery Product'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                aria-label="Close modal"
                className="w-8 h-8 flex items-center justify-center text-[#FFFDF8]/75 hover:text-[#FFFDF8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Noor 22K Kundan Choker"
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  >
                    {mainCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Selling Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.pricePkr}
                    onChange={(e) => setProductForm({ ...productForm, pricePkr: e.target.value })}
                    placeholder="145000"
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] tabular-nums focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={productForm.discountPercent}
                    onChange={(e) =>
                      setProductForm({ ...productForm, discountPercent: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] tabular-nums focus:outline-none focus:border-[#C6A15B]"
                  />
                  {previewCompareAt && (
                    <p className="text-[11px] text-[#8E6E30] mt-1 tabular-nums">
                      Original Price Shown: {formatPKR(previewCompareAt)} (-{discountNum}% OFF)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stockQuantity}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stockQuantity: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] tabular-nums focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.lowStockThreshold}
                    onChange={(e) =>
                      setProductForm({ ...productForm, lowStockThreshold: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] tabular-nums focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">Collection</label>
                  <select
                    value={productForm.collection}
                    onChange={(e) => setProductForm({ ...productForm, collection: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  >
                    {COLLECTIONS.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">Subcategory</label>
                  <select
                    value={productForm.subcategory}
                    onChange={(e) =>
                      setProductForm({ ...productForm, subcategory: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  >
                    <option value="">None</option>
                    {SUBCATEGORIES.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Sizes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={productForm.availableSizes}
                    onChange={(e) =>
                      setProductForm({ ...productForm, availableSizes: e.target.value })
                    }
                    placeholder="10, 12, 14, 16"
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">Material</label>
                  <input
                    type="text"
                    value={productForm.material}
                    onChange={(e) => setProductForm({ ...productForm, material: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#252525] mb-1">
                    Estimated Weight
                  </label>
                  <input
                    type="text"
                    value={productForm.weightGrams}
                    onChange={(e) =>
                      setProductForm({ ...productForm, weightGrams: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#252525] mb-1">Gemstones</label>
                <input
                  type="text"
                  value={productForm.gemstones}
                  onChange={(e) => setProductForm({ ...productForm, gemstones: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#252525] mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                      shortDescription:
                        productForm.shortDescription || e.target.value.slice(0, 140),
                    })
                  }
                  placeholder="Describe craftsmanship, hallmark purity, and stone setting..."
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              {/* Image Upload + Studio Gallery + URL */}
              <div className="p-3.5 bg-[#F8F5EF] border border-[#252525]/12 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#252525]">Product Image</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] text-[#FFFDF8] cursor-pointer hover:bg-[#363636]">
                    <Upload className="w-3.5 h-3.5 text-[#C6A15B]" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) =>
                        void handleImageFileUpload(e.target.files?.[0], (url) =>
                          setProductForm((prev) => ({ ...prev, imageUrl: url }))
                        )
                      }
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-16 shrink-0 bg-[#E8DDCC] border border-[#252525]/15 overflow-hidden">
                    <JewelryImage
                      src={productForm.imageUrl}
                      alt="Preview"
                      className="w-full h-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    placeholder="Or paste /src/assets/images/... or https://... URL"
                    className="flex-1 px-3 py-2 bg-[#FFFDF8] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {STUDIO_GALLERY_IMAGES.map((imgUrl) => (
                    <button
                      key={imgUrl}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, imageUrl: imgUrl })}
                      className={`w-12 h-10 shrink-0 overflow-hidden border cursor-pointer ${
                        productForm.imageUrl === imgUrl
                          ? 'border-[#C6A15B] ring-1 ring-[#C6A15B]'
                          : 'border-[#252525]/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <JewelryImage src={imgUrl} alt="Studio option" className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock, Featured, New Arrival Flags */}
              <div className="flex flex-wrap gap-5 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm({ ...productForm, inStock: e.target.checked })}
                    className="accent-[#252525] w-4 h-4"
                  />
                  <span className="font-medium text-[#252525]">In Stock (Ready to Dispatch)</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isBestSeller}
                    onChange={(e) =>
                      setProductForm({ ...productForm, isBestSeller: e.target.checked })
                    }
                    className="accent-[#252525] w-4 h-4"
                  />
                  <span className="font-medium text-[#252525] inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#8E6E30]" />
                    Featured Product
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isNewArrival}
                    onChange={(e) =>
                      setProductForm({ ...productForm, isNewArrival: e.target.checked })
                    }
                    className="accent-[#252525] w-4 h-4"
                  />
                  <span className="font-medium text-[#252525]">New Arrival</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#252525]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 border border-[#252525]/20 text-[#252525] font-medium hover:bg-[#E8DDCC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingImage}
                  className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct
                    ? 'Saving...'
                    : productForm.id
                    ? 'Save Product Changes'
                    : 'Publish Product Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={categoryForm.originalName ? 'Edit Category' : 'Add Category'}
        >
          <div
            className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]"
            onClick={() => setCategoryModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-[#FFFDF8] border border-[#252525]/15 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#252525] text-[#FFFDF8] flex items-center justify-between">
              <h2 className="font-serif text-xl font-medium">
                {categoryForm.originalName ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                aria-label="Close modal"
                className="w-8 h-8 flex items-center justify-center text-[#FFFDF8]/75 hover:text-[#FFFDF8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#252525] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.category}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, category: e.target.value })
                  }
                  placeholder="e.g. Anklets & Payal"
                  className="w-full px-3 py-2.5 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#252525] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="Concise editorial description shown on homepage category card..."
                  className="w-full px-3 py-2 bg-[#F8F5EF] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              <div className="p-3.5 bg-[#F8F5EF] border border-[#252525]/12 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#252525]">Category Cover Image</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] text-[#FFFDF8] cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#C6A15B]" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) =>
                        void handleImageFileUpload(e.target.files?.[0], (url) =>
                          setCategoryForm((prev) => ({ ...prev, image: url }))
                        )
                      }
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 shrink-0 bg-[#E8DDCC] border border-[#252525]/15 overflow-hidden">
                    <JewelryImage
                      src={categoryForm.image}
                      alt="Category preview"
                      className="w-full h-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={categoryForm.image}
                    onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#FFFDF8] border border-[#252525]/18 text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#252525]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2.5 border border-[#252525]/20 text-[#252525] font-medium hover:bg-[#E8DDCC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || uploadingImage}
                  className="px-5 py-2.5 bg-[#252525] text-[#FFFDF8] font-medium hover:bg-[#363636] disabled:opacity-50 cursor-pointer"
                >
                  {savingCategory
                    ? 'Saving...'
                    : categoryForm.originalName
                    ? 'Update Category'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Deletion"
        >
          <div
            className="fixed inset-0 bg-[#252525]/60 backdrop-blur-[2px]"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-[#FFFDF8] border border-[#252525]/15 p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-semibold text-[#252525]">
              Delete {deleteTarget.kind === 'product' ? 'Product' : 'Category'}?
            </h3>
            <p className="text-xs text-[#252525]/70 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-[#252525]">{deleteTarget.label}</strong>? This updates the live storefront and AI assistant immediately.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#252525]/20 text-xs font-medium text-[#252525] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
