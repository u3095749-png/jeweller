import {
  CATEGORY_CARDS,
  PRODUCTS,
  type CategoryCardItem,
  type JewelleryProduct,
} from '../data/products.ts';
import { STORE_CONFIG } from '../config/storeConfig.ts';
import {
  ALL_ORDER_STATUSES,
  type AdminActivityEntry,
  type AdminDashboardPayload,
  type AdminNotificationItem,
  type AdminProductCostEntry,
  type AdminProfileInfo,
  type CouponRecord,
  type CustomerRecord,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ProductReviewRecord,
  type ReviewStatus,
  type ShippingZoneRecord,
  type StoreOrder,
  type StoreOrderItem,
  type TopSellingProductStat,
  type WebsiteSettings,
} from '../types/assistant.ts';

export const CART_STORAGE_KEY = 'zaveri_atelier_cart_v1';
export const WISHLIST_STORAGE_KEY = 'zaveri_atelier_wishlist_v1';
export const CATALOG_PRODUCTS_STORAGE_KEY = 'zaveri_atelier_catalog_products_v1';
export const CATALOG_CATEGORIES_STORAGE_KEY = 'zaveri_atelier_catalog_categories_v1';
export const ADMIN_COSTS_STORAGE_KEY = 'zaveri_admin_costs_v1';
export const ADMIN_STATE_STORAGE_KEY = 'zaveri_atelier_admin_state_v1';
export const ADMIN_STORAGE_EVENT = 'zaveri-admin-storage-updated';

const DEFAULT_STUDIO_IMAGE = '/src/assets/images/cat_rings_solitaire_1795173688192.jpg';

export interface AdminPreferences {
  lastActiveSection: string;
  defaultProductCategoryFilter: string;
  defaultOrderStatusFilter: string;
  compactTables: boolean;
}

export interface DeletedRecordsLedger {
  products: string[];
  categories: string[];
  orders: string[];
  customers: string[];
  coupons: string[];
  reviews: string[];
  shippingZones: string[];
}

export interface PersistedAdminWorkspaceState {
  schemaVersion: 1;
  updatedAt: string;
  hasCustomEdits: boolean;
  products: JewelleryProduct[];
  categories: CategoryCardItem[];
  orders: StoreOrder[];
  customers: CustomerRecord[];
  coupons: CouponRecord[];
  reviews: ProductReviewRecord[];
  shippingZones: ShippingZoneRecord[];
  notifications: AdminNotificationItem[];
  websiteSettings: WebsiteSettings;
  activityLogs: AdminActivityEntry[];
  adminPreferences: AdminPreferences;
  deletedIds: DeletedRecordsLedger;
}

export interface StorageSaveResult {
  ok: boolean;
  error?: string;
  bytesUsed: number;
}

export interface BackupDocumentV1 {
  app: string;
  schemaVersion: 1;
  exportedAt: string;
  data: {
    products: JewelleryProduct[];
    categories: CategoryCardItem[];
    orders: StoreOrder[];
    customers: CustomerRecord[];
    coupons: CouponRecord[];
    reviews: ProductReviewRecord[];
    shippingZones: ShippingZoneRecord[];
    notifications: AdminNotificationItem[];
    websiteSettings: WebsiteSettings;
    activityLogs: AdminActivityEntry[];
    adminPreferences: AdminPreferences;
    adminCosts?: AdminProductCostEntry[];
    wishlistIds?: string[];
  };
}

export function createDefaultWebsiteSettings(): WebsiteSettings {
  return {
    brandName: STORE_CONFIG.brandName,
    brandTagline: STORE_CONFIG.tagline,
    announcementBar:
      'Complimentary insured delivery across Pakistan on orders above Rs. 50,000.',
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
}

export function createDefaultShippingZones(): ShippingZoneRecord[] {
  return [
    {
      id: 'zone-lahore-express',
      name: 'Lahore Atelier Express',
      regions: 'Lahore (Gulberg, DHA, Model Town, Cantt)',
      courierPartner: 'Zaveri Armoured Concierge',
      feePkr: 0,
      freeAbovePkr: 0,
      estimatedDays: 'Same Day – 24 Hours',
      insured: true,
      active: true,
    },
    {
      id: 'zone-major-cities',
      name: 'Major Cities Insured Air',
      regions: 'Karachi, Islamabad, Rawalpindi, Faisalabad, Multan',
      courierPartner: 'TCS Priority Insured',
      feePkr: STORE_CONFIG.standardDeliveryFeePkr,
      freeAbovePkr: STORE_CONFIG.freeDeliveryThresholdPkr,
      estimatedDays: '1 – 3 Business Days',
      insured: true,
      active: true,
    },
    {
      id: 'zone-nationwide',
      name: 'Nationwide Insured Registered',
      regions: 'All Other Cities across Pakistan',
      courierPartner: 'Leopards Insured Vault',
      feePkr: STORE_CONFIG.standardDeliveryFeePkr,
      freeAbovePkr: STORE_CONFIG.freeDeliveryThresholdPkr,
      estimatedDays: '3 – 5 Business Days',
      insured: true,
      active: true,
    },
  ];
}

export function createDefaultAdminPreferences(): AdminPreferences {
  return {
    lastActiveSection: 'overview',
    defaultProductCategoryFilter: 'All',
    defaultOrderStatusFilter: 'All',
    compactTables: false,
  };
}

export function createEmptyDeletedLedger(): DeletedRecordsLedger {
  return {
    products: [],
    categories: [],
    orders: [],
    customers: [],
    coupons: [],
    reviews: [],
    shippingZones: [],
  };
}

export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const probeKey = '__zaveri_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function isSafeClientImageUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2_000_000) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  if (
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/assets/')
  ) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function makeClientId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `piece-${Date.now()}`;
}

function normalizeProduct(p: Partial<JewelleryProduct>): JewelleryProduct | null {
  if (!p || typeof p.name !== 'string' || !p.name.trim()) return null;
  const pricePkr = Math.round(Number(p.pricePkr) || 0);
  if (!Number.isFinite(pricePkr) || pricePkr <= 0) return null;

  const id = String(p.id || makeClientId('za'));
  const inStockFlag = typeof p.inStock === 'boolean' ? p.inStock : true;
  const stockQuantity =
    typeof p.stockQuantity === 'number' && Number.isFinite(p.stockQuantity)
      ? Math.max(0, Math.floor(p.stockQuantity))
      : inStockFlag
      ? 6
      : 0;
  const lowStockThreshold =
    typeof p.lowStockThreshold === 'number' && Number.isFinite(p.lowStockThreshold)
      ? Math.max(0, Math.floor(p.lowStockThreshold))
      : 2;

  const images = Array.isArray(p.images)
    ? p.images.filter((img): img is string => isSafeClientImageUrl(img))
    : [];
  if (images.length === 0) images.push(DEFAULT_STUDIO_IMAGE);

  const primaryCat = String(p.category || 'Rings').trim() || 'Rings';
  const categories = Array.from(
    new Set([
      primaryCat,
      ...(Array.isArray(p.categories) ? p.categories.map((c) => String(c).trim()).filter(Boolean) : []),
    ])
  );

  return {
    id,
    slug: String(p.slug || slugify(p.name)),
    sku: String(p.sku || `ZA-${id.slice(-4).toUpperCase()}`).trim(),
    name: p.name.trim().slice(0, 140),
    category: primaryCat,
    categories,
    subcategory: typeof p.subcategory === 'string' && p.subcategory.trim() ? p.subcategory.trim() : undefined,
    collection: String(p.collection || 'Royal Heritage').trim(),
    pricePkr,
    compareAtPricePkr:
      typeof p.compareAtPricePkr === 'number' && p.compareAtPricePkr > pricePkr
        ? Math.round(p.compareAtPricePkr)
        : undefined,
    rating: typeof p.rating === 'number' && Number.isFinite(p.rating) ? p.rating : 4.9,
    reviewCount: typeof p.reviewCount === 'number' && Number.isFinite(p.reviewCount) ? p.reviewCount : 1,
    material: String(p.material || '22K Solid Yellow Gold'),
    weightGrams: String(p.weightGrams || '10.0 g'),
    gemstones: String(p.gemstones || 'Certified Fine Gemstones'),
    availableSizes:
      Array.isArray(p.availableSizes) && p.availableSizes.length > 0
        ? p.availableSizes.map((s) => String(s).trim()).filter(Boolean)
        : ['Standard'],
    shortDescription: String(p.shortDescription || p.description || p.name).trim(),
    description: String(p.description || p.shortDescription || p.name).trim(),
    careNote: String(
      p.careNote || 'Store inside the velvet pouch provided; polish gently with a dry chamois cloth.'
    ),
    images,
    model3dType: p.model3dType,
    default3dFinish: p.default3dFinish,
    isNewArrival: Boolean(p.isNewArrival),
    isBestSeller: Boolean(p.isBestSeller),
    popularityScore: typeof p.popularityScore === 'number' ? p.popularityScore : 85,
    inStock: stockQuantity > 0 ? inStockFlag : false,
    stockQuantity,
    lowStockThreshold,
    releasedOrder: typeof p.releasedOrder === 'number' ? p.releasedOrder : 19,
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function dedupeCategories(items: CategoryCardItem[]): CategoryCardItem[] {
  const seen = new Set<string>();
  const out: CategoryCardItem[] = [];
  for (const c of items) {
    if (!c || typeof c.category !== 'string') continue;
    const cleanName = c.category.trim();
    const key = cleanName.toLowerCase();
    if (!cleanName || seen.has(key)) continue;
    seen.add(key);
    out.push({
      category: cleanName,
      description: String(c.description || `Explore fine ${cleanName.toLowerCase()} curated by Zaveri Atelier.`),
      image: isSafeClientImageUrl(c.image) ? c.image : DEFAULT_STUDIO_IMAGE,
      subcategories: Array.isArray(c.subcategories) ? c.subcategories.filter(Boolean) : undefined,
    });
  }
  return out;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'Cash on Delivery',
  'Bank Transfer',
  'JazzCash / EasyPaisa',
  'Card / Online',
];
const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Paid', 'Partial', 'Refunded'];

function normalizeOrder(raw: Partial<StoreOrder>, products: JewelleryProduct[]): StoreOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const items: StoreOrderItem[] = Array.isArray(raw.items)
    ? raw.items.map((item) => {
        const matched = products.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            (item.sku && p.sku === item.sku) ||
            p.name.toLowerCase() === String(item.name || '').toLowerCase()
        );
        return {
          productId: item.productId || matched?.id,
          name: String(item.name || matched?.name || 'Jewellery Piece'),
          sku: item.sku || matched?.sku,
          image: isSafeClientImageUrl(item.image) ? item.image : matched?.images[0],
          category: item.category || matched?.category,
          size: String(item.size || 'Standard'),
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          unitPricePkr: Math.max(0, Math.round(Number(item.unitPricePkr) || matched?.pricePkr || 0)),
        };
      })
    : [];

  const subtotalPkr =
    typeof raw.subtotalPkr === 'number' && Number.isFinite(raw.subtotalPkr)
      ? Math.max(0, Math.round(raw.subtotalPkr))
      : items.reduce((s, i) => s + i.unitPricePkr * i.quantity, 0);
  const discountPkr =
    typeof raw.discountPkr === 'number' && Number.isFinite(raw.discountPkr)
      ? Math.max(0, Math.round(raw.discountPkr))
      : 0;
  const shippingPkr =
    typeof raw.shippingPkr === 'number' && Number.isFinite(raw.shippingPkr)
      ? Math.max(0, Math.round(raw.shippingPkr))
      : 0;
  const totalPkr =
    typeof raw.totalPkr === 'number' && Number.isFinite(raw.totalPkr)
      ? Math.max(0, Math.round(raw.totalPkr))
      : Math.max(0, subtotalPkr - discountPkr + shippingPkr);

  const statusRaw = String(raw.status || 'New');
  const status: OrderStatus = ALL_ORDER_STATUSES.includes(statusRaw as OrderStatus)
    ? (statusRaw as OrderStatus)
    : 'New';

  return {
    id: String(raw.id || makeClientId('ORD')),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    type: raw.type === 'cart' || raw.type === 'manual' ? raw.type : 'single',
    customerId: raw.customerId,
    customerName: String(raw.customerName || 'WhatsApp Concierge Client').trim(),
    customerPhone: raw.customerPhone,
    customerEmail: raw.customerEmail,
    deliveryAddress: raw.deliveryAddress,
    city: raw.city,
    items,
    subtotalPkr,
    discountPkr,
    couponCode: raw.couponCode,
    shippingPkr,
    totalPkr,
    paymentMethod: VALID_PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethod)
      ? (raw.paymentMethod as PaymentMethod)
      : 'Cash on Delivery',
    paymentStatus: VALID_PAYMENT_STATUSES.includes(raw.paymentStatus as PaymentStatus)
      ? (raw.paymentStatus as PaymentStatus)
      : 'Unpaid',
    courierName: raw.courierName,
    trackingNumber: raw.trackingNumber,
    customerNote: raw.customerNote,
    internalNotes: raw.internalNotes,
    status,
  };
}

function createSeedWorkspaceState(): PersistedAdminWorkspaceState {
  // Check legacy catalog keys first so we never wipe previously saved catalog data
  let seedProducts = (JSON.parse(JSON.stringify(PRODUCTS)) as JewelleryProduct[])
    .map((p) => normalizeProduct(p))
    .filter((p): p is JewelleryProduct => p !== null);
  let seedCategories = dedupeCategories(
    JSON.parse(JSON.stringify(CATEGORY_CARDS)) as CategoryCardItem[]
  );
  let hadLegacyEdits = false;

  if (isLocalStorageAvailable()) {
    try {
      const legacyProdRaw = window.localStorage.getItem(CATALOG_PRODUCTS_STORAGE_KEY);
      if (legacyProdRaw) {
        const parsed = JSON.parse(legacyProdRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .map((p) => normalizeProduct(p))
            .filter((p): p is JewelleryProduct => p !== null);
          if (normalized.length > 0) {
            seedProducts = dedupeById(normalized);
            hadLegacyEdits = true;
          }
        }
      }
      const legacyCatRaw = window.localStorage.getItem(CATALOG_CATEGORIES_STORAGE_KEY);
      if (legacyCatRaw) {
        const parsed = JSON.parse(legacyCatRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = dedupeCategories(parsed as CategoryCardItem[]);
          if (normalized.length > 0) {
            seedCategories = normalized;
            hadLegacyEdits = true;
          }
        }
      }
    } catch {
      // Ignore malformed legacy entries
    }
  }

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    hasCustomEdits: hadLegacyEdits,
    products: seedProducts,
    categories: seedCategories,
    orders: [],
    customers: [],
    coupons: [],
    reviews: [],
    shippingZones: createDefaultShippingZones(),
    notifications: [],
    websiteSettings: createDefaultWebsiteSettings(),
    activityLogs: [],
    adminPreferences: createDefaultAdminPreferences(),
    deletedIds: createEmptyDeletedLedger(),
  };
}

function sanitizeWorkspaceState(raw: unknown): PersistedAdminWorkspaceState {
  const base = createSeedWorkspaceState();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<PersistedAdminWorkspaceState>;

  const products = Array.isArray(obj.products)
    ? dedupeById(
        obj.products
          .map((p) => normalizeProduct(p))
          .filter((p): p is JewelleryProduct => p !== null)
      )
    : base.products;

  const categories = Array.isArray(obj.categories)
    ? dedupeCategories(obj.categories as CategoryCardItem[])
    : base.categories;

  const orders = Array.isArray(obj.orders)
    ? dedupeById(
        obj.orders
          .map((o) => normalizeOrder(o, products))
          .filter((o): o is StoreOrder => o !== null)
      )
    : [];

  const customers = Array.isArray(obj.customers)
    ? dedupeById(
        obj.customers.filter(
          (c): c is CustomerRecord => Boolean(c && typeof c.id === 'string' && typeof c.name === 'string')
        )
      )
    : [];

  const coupons = Array.isArray(obj.coupons)
    ? dedupeById(
        obj.coupons.filter(
          (c): c is CouponRecord => Boolean(c && typeof c.id === 'string' && typeof c.code === 'string')
        )
      )
    : [];

  const reviews = Array.isArray(obj.reviews)
    ? dedupeById(
        obj.reviews.filter(
          (r): r is ProductReviewRecord =>
            Boolean(r && typeof r.id === 'string' && typeof r.productId === 'string')
        )
      )
    : [];

  const shippingZones =
    Array.isArray(obj.shippingZones) && obj.shippingZones.length > 0
      ? dedupeById(
          obj.shippingZones.filter(
            (z): z is ShippingZoneRecord => Boolean(z && typeof z.id === 'string' && typeof z.name === 'string')
          )
        )
      : base.shippingZones;

  const notifications = Array.isArray(obj.notifications)
    ? dedupeById(
        obj.notifications.filter(
          (n): n is AdminNotificationItem => Boolean(n && typeof n.id === 'string' && typeof n.title === 'string')
        )
      ).slice(0, 100)
    : [];

  const activityLogs = Array.isArray(obj.activityLogs)
    ? dedupeById(
        obj.activityLogs.filter(
          (a): a is AdminActivityEntry => Boolean(a && typeof a.id === 'string' && typeof a.summary === 'string')
        )
      ).slice(0, 200)
    : [];

  const rawDeleted = obj.deletedIds as Partial<DeletedRecordsLedger> | undefined;
  const deletedIds: DeletedRecordsLedger = {
    products: Array.isArray(rawDeleted?.products) ? rawDeleted!.products.map(String) : [],
    categories: Array.isArray(rawDeleted?.categories) ? rawDeleted!.categories.map(String) : [],
    orders: Array.isArray(rawDeleted?.orders) ? rawDeleted!.orders.map(String) : [],
    customers: Array.isArray(rawDeleted?.customers) ? rawDeleted!.customers.map(String) : [],
    coupons: Array.isArray(rawDeleted?.coupons) ? rawDeleted!.coupons.map(String) : [],
    reviews: Array.isArray(rawDeleted?.reviews) ? rawDeleted!.reviews.map(String) : [],
    shippingZones: Array.isArray(rawDeleted?.shippingZones)
      ? rawDeleted!.shippingZones.map(String)
      : [],
  };

  return {
    schemaVersion: 1,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    hasCustomEdits: Boolean(
      obj.hasCustomEdits ||
        orders.length > 0 ||
        customers.length > 0 ||
        coupons.length > 0 ||
        reviews.length > 0 ||
        activityLogs.length > 0
    ),
    products: products.length > 0 || deletedIds.products.length > 0 ? products : base.products,
    categories:
      categories.length > 0 || deletedIds.categories.length > 0 ? categories : base.categories,
    orders,
    customers,
    coupons,
    reviews,
    shippingZones,
    notifications,
    websiteSettings: {
      ...createDefaultWebsiteSettings(),
      ...(obj.websiteSettings && typeof obj.websiteSettings === 'object' ? obj.websiteSettings : {}),
    },
    activityLogs,
    adminPreferences: {
      ...createDefaultAdminPreferences(),
      ...(obj.adminPreferences && typeof obj.adminPreferences === 'object'
        ? obj.adminPreferences
        : {}),
    },
    deletedIds,
  };
}

export function loadPersistedAdminState(): PersistedAdminWorkspaceState {
  if (!isLocalStorageAvailable()) {
    return createSeedWorkspaceState();
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_STATE_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedWorkspaceState();
      // Initialize storage without overwriting legacy keys if they exist
      window.localStorage.setItem(ADMIN_STATE_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return sanitizeWorkspaceState(parsed);
  } catch (err) {
    console.warn('[AdminStorage] Failed to parse saved workspace state, recovering safely:', err);
    return createSeedWorkspaceState();
  }
}

export function savePersistedAdminState(next: PersistedAdminWorkspaceState): StorageSaveResult {
  const serialized = JSON.stringify(next);
  if (!isLocalStorageAvailable()) {
    return {
      ok: false,
      error: 'Chrome LocalStorage is unavailable in this browser context.',
      bytesUsed: serialized.length,
    };
  }
  try {
    window.localStorage.setItem(ADMIN_STATE_STORAGE_KEY, serialized);
    window.localStorage.setItem(CATALOG_PRODUCTS_STORAGE_KEY, JSON.stringify(next.products));
    window.localStorage.setItem(CATALOG_CATEGORIES_STORAGE_KEY, JSON.stringify(next.categories));
    window.dispatchEvent(new CustomEvent(ADMIN_STORAGE_EVENT, { detail: { updatedAt: next.updatedAt } }));
    return { ok: true, bytesUsed: serialized.length };
  } catch (err) {
    const message =
      err instanceof Error && /quota/i.test(err.message)
        ? 'Browser storage quota reached. Please export a JSON backup and reduce oversized embedded images.'
        : 'Unable to persist data to Chrome LocalStorage.';
    return { ok: false, error: message, bytesUsed: serialized.length };
  }
}

function updateState(
  updater: (current: PersistedAdminWorkspaceState) => PersistedAdminWorkspaceState
): { state: PersistedAdminWorkspaceState; saveResult: StorageSaveResult } {
  const current = loadPersistedAdminState();
  const next = updater(current);
  const stamped: PersistedAdminWorkspaceState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  const saveResult = savePersistedAdminState(stamped);
  return { state: stamped, saveResult };
}

function appendDeletedId(
  ledger: DeletedRecordsLedger,
  bucket: keyof DeletedRecordsLedger,
  id: string
): DeletedRecordsLedger {
  const set = new Set(ledger[bucket]);
  set.add(id);
  return {
    ...ledger,
    [bucket]: Array.from(set).slice(-300),
  };
}

function removeDeletedId(
  ledger: DeletedRecordsLedger,
  bucket: keyof DeletedRecordsLedger,
  id: string
): DeletedRecordsLedger {
  if (!ledger[bucket].includes(id)) return ledger;
  return {
    ...ledger,
    [bucket]: ledger[bucket].filter((x) => x !== id),
  };
}

// ==========================================================
// NON-DESTRUCTIVE SERVER <-> CHROME LOCALSTORAGE MERGE SYNC
// ==========================================================
export function mergeCatalogFromServer(serverSnapshot: {
  products?: JewelleryProduct[];
  categories?: CategoryCardItem[];
  settings?: WebsiteSettings;
}): PersistedAdminWorkspaceState {
  const local = loadPersistedAdminState();

  // If browser already has custom admin edits/deletions or persisted data, DO NOT wipe them with a cold-started empty/default backend snapshot.
  const deletedProdSet = new Set(local.deletedIds.products);
  const deletedCatSet = new Set(local.deletedIds.categories.map((c) => c.toLowerCase()));

  let mergedProducts = local.products;
  if (Array.isArray(serverSnapshot.products) && serverSnapshot.products.length > 0) {
    if (!local.hasCustomEdits) {
      mergedProducts = dedupeById(
        serverSnapshot.products
          .map((p) => normalizeProduct(p))
          .filter((p): p is JewelleryProduct => p !== null && !deletedProdSet.has(p.id))
      );
    } else {
      // Keep all local edits/additions intact, and only add genuinely unseen non-deleted products
      const localMap = new Map(local.products.map((p) => [p.id, p]));
      for (const srvProd of serverSnapshot.products) {
        const norm = normalizeProduct(srvProd);
        if (!norm || deletedProdSet.has(norm.id)) continue;
        if (!localMap.has(norm.id)) {
          // Only pull in new server items created outside default seed catalog
          if (!PRODUCTS.some((def) => def.id === norm.id)) {
            localMap.set(norm.id, norm);
          }
        }
      }
      mergedProducts = Array.from(localMap.values());
    }
  }

  let mergedCategories = local.categories;
  if (Array.isArray(serverSnapshot.categories) && serverSnapshot.categories.length > 0) {
    if (!local.hasCustomEdits) {
      mergedCategories = dedupeCategories(
        serverSnapshot.categories.filter((c) => !deletedCatSet.has(c.category.toLowerCase()))
      );
    } else {
      const existingNames = new Set(local.categories.map((c) => c.category.toLowerCase()));
      const additions = serverSnapshot.categories.filter(
        (c) =>
          !existingNames.has(c.category.toLowerCase()) &&
          !deletedCatSet.has(c.category.toLowerCase()) &&
          !CATEGORY_CARDS.some((def) => def.category.toLowerCase() === c.category.toLowerCase())
      );
      mergedCategories = dedupeCategories([...local.categories, ...additions]);
    }
  }

  const mergedSettings = local.hasCustomEdits
    ? local.websiteSettings
    : { ...local.websiteSettings, ...(serverSnapshot.settings || {}) };

  const next: PersistedAdminWorkspaceState = {
    ...local,
    products: mergedProducts,
    categories: mergedCategories,
    websiteSettings: mergedSettings,
  };
  savePersistedAdminState(next);
  return next;
}

export function mergeDashboardFromServer(
  serverPayload: AdminDashboardPayload,
  catalogSnapshot?: { products?: JewelleryProduct[]; categories?: CategoryCardItem[] }
): PersistedAdminWorkspaceState {
  const local = mergeCatalogFromServer({
    products: catalogSnapshot?.products,
    categories: catalogSnapshot?.categories,
    settings: serverPayload.settings,
  });

  const delOrders = new Set(local.deletedIds.orders);
  const delCust = new Set(local.deletedIds.customers);
  const delCoupons = new Set(local.deletedIds.coupons);
  const delReviews = new Set(local.deletedIds.reviews);
  const delZones = new Set(local.deletedIds.shippingZones);

  const mergeLists = <T extends { id: string }>(
    localList: T[],
    serverList: T[] | undefined,
    deleted: Set<string>,
    preferLocalOnConflict = true
  ): T[] => {
    const map = new Map<string, T>();
    if (preferLocalOnConflict) {
      for (const item of localList) map.set(item.id, item);
      for (const item of serverList || []) {
        if (!deleted.has(item.id) && !map.has(item.id)) {
          map.set(item.id, item);
        }
      }
    } else {
      for (const item of serverList || []) {
        if (!deleted.has(item.id)) map.set(item.id, item);
      }
      for (const item of localList) {
        if (!map.has(item.id)) map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  };

  // Merge orders: if server has newer updatedAt on an existing order, keep newer
  const orderMap = new Map<string, StoreOrder>();
  for (const ord of local.orders) orderMap.set(ord.id, ord);
  for (const srvOrd of serverPayload.orders || []) {
    if (delOrders.has(srvOrd.id)) continue;
    const existing = orderMap.get(srvOrd.id);
    if (!existing) {
      orderMap.set(srvOrd.id, srvOrd);
    } else {
      const srvTime = new Date(srvOrd.updatedAt || srvOrd.createdAt).getTime();
      const locTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (srvTime > locTime) {
        orderMap.set(srvOrd.id, srvOrd);
      }
    }
  }
  const mergedOrders = Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const mergedCustomers = mergeLists(local.customers, serverPayload.customers, delCust);
  const mergedCoupons = mergeLists(local.coupons, serverPayload.coupons, delCoupons);
  const mergedReviews = mergeLists(local.reviews, serverPayload.reviews, delReviews);
  const mergedZones =
    local.hasCustomEdits && local.shippingZones.length > 0
      ? mergeLists(local.shippingZones, serverPayload.shippingZones, delZones)
      : dedupeById([...(serverPayload.shippingZones || []), ...local.shippingZones]);

  // Preserve read notifications cleanly
  const notifMap = new Map<string, AdminNotificationItem>();
  for (const n of local.notifications) notifMap.set(n.id, n);
  for (const n of serverPayload.notifications || []) {
    if (!notifMap.has(n.id)) notifMap.set(n.id, n);
  }

  const logMap = new Map<string, AdminActivityEntry>();
  for (const a of [...(serverPayload.activityLogs || []), ...local.activityLogs]) {
    if (!logMap.has(a.id)) logMap.set(a.id, a);
  }
  const mergedLogs = Array.from(logMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);

  const next: PersistedAdminWorkspaceState = {
    ...local,
    orders: mergedOrders,
    customers: mergedCustomers,
    coupons: mergedCoupons,
    reviews: mergedReviews,
    shippingZones: mergedZones,
    notifications: Array.from(notifMap.values()).slice(0, 100),
    activityLogs: mergedLogs,
    hasCustomEdits:
      local.hasCustomEdits ||
      mergedOrders.length > 0 ||
      mergedCustomers.length > 0 ||
      mergedCoupons.length > 0 ||
      mergedReviews.length > 0,
  };
  savePersistedAdminState(next);
  return next;
}

// ==========================================================
// LOCALSTORAGE CRUD MUTATIONS (PERMANENT CHROME PERSISTENCE)
// ==========================================================
export function storageUpsertProduct(
  product: JewelleryProduct,
  actorEmail = 'admin',
  isEdit = false
): PersistedAdminWorkspaceState {
  const norm = normalizeProduct(product);
  if (!norm) return loadPersistedAdminState();
  return updateState((cur) => {
    const idx = cur.products.findIndex((p) => p.id === norm.id);
    const nextProducts = [...cur.products];
    if (idx >= 0) {
      nextProducts[idx] = norm;
    } else {
      nextProducts.unshift(norm);
    }
    const nextCategories = [...cur.categories];
    if (!nextCategories.some((c) => c.category.toLowerCase() === norm.category.toLowerCase())) {
      nextCategories.push({
        category: norm.category,
        description: `Handcrafted ${norm.category.toLowerCase()} from Zaveri Atelier.`,
        image: norm.images[0] || DEFAULT_STUDIO_IMAGE,
      });
    }
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'product',
      actorEmail,
      summary: `${isEdit || idx >= 0 ? 'Updated' : 'Added'} product "${norm.name}" (Rs. ${norm.pricePkr.toLocaleString('en-PK')})`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      products: dedupeById(nextProducts),
      categories: dedupeCategories(nextCategories),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'products', norm.id),
    };
  }).state;
}

export function storageDeleteProduct(
  productId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.products.find((p) => p.id === productId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'product',
      actorEmail,
      summary: `Deleted product "${target.name}" (${target.sku})`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      products: cur.products.filter((p) => p.id !== productId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'products', productId),
    };
  }).state;
}

export function storageUpsertCategory(
  categoryItem: CategoryCardItem,
  originalName?: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const cleanName = categoryItem.category.trim();
    if (!cleanName) return cur;
    const targetName = (originalName || cleanName).trim().toLowerCase();
    const idx = cur.categories.findIndex((c) => c.category.toLowerCase() === targetName);
    const nextCats = [...cur.categories];
    const cleanItem: CategoryCardItem = {
      category: cleanName,
      description: categoryItem.description.trim() || `Explore fine ${cleanName.toLowerCase()}.`,
      image: isSafeClientImageUrl(categoryItem.image) ? categoryItem.image : DEFAULT_STUDIO_IMAGE,
      subcategories: categoryItem.subcategories,
    };

    let nextProducts = cur.products;
    if (idx >= 0) {
      const oldName = cur.categories[idx].category;
      nextCats[idx] = cleanItem;
      if (oldName !== cleanName) {
        nextProducts = cur.products.map((p) => ({
          ...p,
          category: p.category === oldName ? cleanName : p.category,
          categories: p.categories.map((c) => (c === oldName ? cleanName : c)),
        }));
      }
    } else {
      nextCats.push(cleanItem);
    }

    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'category',
      actorEmail,
      summary: `${idx >= 0 ? 'Updated' : 'Created'} category "${cleanName}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      categories: dedupeCategories(nextCats),
      products: nextProducts,
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'categories', cleanName.toLowerCase()),
    };
  }).state;
}

export function storageDeleteCategory(
  categoryName: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const targetLower = categoryName.trim().toLowerCase();
    if (!cur.categories.some((c) => c.category.toLowerCase() === targetLower)) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'category',
      actorEmail,
      summary: `Deleted category "${categoryName}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      categories: cur.categories.filter((c) => c.category.toLowerCase() !== targetLower),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'categories', targetLower),
    };
  }).state;
}

export function storageRecordOrder(
  orderInput: Partial<StoreOrder>,
  actorEmail = 'storefront'
): { state: PersistedAdminWorkspaceState; order: StoreOrder } {
  let createdOrder: StoreOrder | null = null;
  const { state } = updateState((cur) => {
    const order = normalizeOrder(
      {
        id: orderInput.id || makeClientId('ORD'),
        createdAt: orderInput.createdAt || new Date().toISOString(),
        ...orderInput,
      },
      cur.products
    );
    if (!order) return cur;
    createdOrder = order;

    // Upsert customer cleanly without duplicating
    const cleanPhone = order.customerPhone?.trim();
    const cleanEmail = order.customerEmail?.trim().toLowerCase();
    const cleanName = order.customerName.trim();
    let nextCustomers = [...cur.customers];
    if (cleanPhone || cleanEmail || (cleanName && cleanName !== 'WhatsApp Concierge Client')) {
      const existingIdx = nextCustomers.findIndex(
        (c) =>
          (order.customerId && c.id === order.customerId) ||
          (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '')) ||
          (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail)
      );
      if (existingIdx >= 0) {
        const existing = nextCustomers[existingIdx];
        order.customerId = existing.id;
        nextCustomers[existingIdx] = {
          ...existing,
          name: cleanName !== 'WhatsApp Concierge Client' ? cleanName : existing.name,
          phone: cleanPhone || existing.phone,
          email: cleanEmail || existing.email,
          city: order.city || existing.city,
          address: order.deliveryAddress || existing.address,
          updatedAt: order.createdAt,
        };
      } else {
        const custId = order.customerId || makeClientId('CUST');
        order.customerId = custId;
        nextCustomers.unshift({
          id: custId,
          name: cleanName || 'Valued Client',
          phone: cleanPhone,
          email: cleanEmail,
          city: order.city,
          address: order.deliveryAddress,
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
        });
      }
    }

    // Decrement stock cleanly
    const nextProducts = cur.products.map((prod) => {
      const qty = order.items
        .filter((it) => it.productId === prod.id || (it.sku && it.sku === prod.sku))
        .reduce((s, it) => s + it.quantity, 0);
      if (qty <= 0) return prod;
      const currentQty = prod.stockQuantity ?? (prod.inStock ? 6 : 0);
      const updatedQty = Math.max(0, currentQty - qty);
      return { ...prod, stockQuantity: updatedQty, inStock: updatedQty > 0 };
    });

    // Increment coupon usage if applied
    const nextCoupons = order.couponCode
      ? cur.coupons.map((c) =>
          c.code.toUpperCase() === order.couponCode!.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
      : cur.coupons;

    const notif: AdminNotificationItem = {
      id: makeClientId('notif'),
      title: `New Order ${order.id}`,
      message: `${order.customerName} placed an order totaling Rs. ${order.totalPkr.toLocaleString('en-PK')}.`,
      category: 'order',
      severity: 'info',
      createdAt: order.createdAt,
      read: false,
      targetSection: 'orders',
    };
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: order.createdAt,
      type: 'order',
      actorEmail,
      summary: `Recorded order ${order.id} from ${order.customerName} — Rs. ${order.totalPkr.toLocaleString('en-PK')}`,
    };

    const existingOrderIdx = cur.orders.findIndex((o) => o.id === order.id);
    const nextOrders = [...cur.orders];
    if (existingOrderIdx >= 0) {
      nextOrders[existingOrderIdx] = order;
    } else {
      nextOrders.unshift(order);
    }

    return {
      ...cur,
      hasCustomEdits: true,
      products: nextProducts,
      orders: dedupeById(nextOrders).slice(0, 300),
      customers: dedupeById(nextCustomers),
      coupons: nextCoupons,
      notifications: [notif, ...cur.notifications].slice(0, 100),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'orders', order.id),
    };
  });
  return {
    state,
    order: createdOrder || state.orders[0],
  };
}

export function storageUpdateOrder(
  orderId: string,
  patch: Partial<StoreOrder>,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const idx = cur.orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return cur;
    const existing = cur.orders[idx];
    const nextOrder: StoreOrder = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    if (patch.status === 'Refunded' && patch.paymentStatus === undefined) {
      nextOrder.paymentStatus = 'Refunded';
    }
    const nextOrders = [...cur.orders];
    nextOrders[idx] = nextOrder;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: nextOrder.updatedAt!,
      type: 'order',
      actorEmail,
      summary: `Updated order ${orderId}: status=${nextOrder.status}, payment=${nextOrder.paymentStatus}`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      orders: nextOrders,
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
    };
  }).state;
}

export function storageDeleteOrder(
  orderId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.orders.find((o) => o.id === orderId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'order',
      actorEmail,
      summary: `Deleted order record ${orderId} (${target.customerName})`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      orders: cur.orders.filter((o) => o.id !== orderId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'orders', orderId),
    };
  }).state;
}

export function storageUpsertCustomer(
  customer: CustomerRecord,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const idx = cur.customers.findIndex((c) => c.id === customer.id);
    const nextCustomers = [...cur.customers];
    if (idx >= 0) {
      nextCustomers[idx] = customer;
    } else {
      nextCustomers.unshift(customer);
    }
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'customer',
      actorEmail,
      summary: `${idx >= 0 ? 'Updated' : 'Added'} customer "${customer.name}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      customers: dedupeById(nextCustomers),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'customers', customer.id),
    };
  }).state;
}

export function storageDeleteCustomer(
  customerId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.customers.find((c) => c.id === customerId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'customer',
      actorEmail,
      summary: `Deleted customer "${target.name}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      customers: cur.customers.filter((c) => c.id !== customerId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'customers', customerId),
    };
  }).state;
}

export function storageSyncProductsCatalog(products: JewelleryProduct[]): PersistedAdminWorkspaceState {
  return updateState((cur) => ({
    ...cur,
    hasCustomEdits: true,
    products: dedupeById(
      products.map((p) => normalizeProduct(p)).filter((p): p is JewelleryProduct => p !== null)
    ),
  })).state;
}

export function storageUpsertCoupon(
  coupon: CouponRecord,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const idx = cur.coupons.findIndex((c) => c.id === coupon.id);
    const nextCoupons = [...cur.coupons];
    if (idx >= 0) nextCoupons[idx] = coupon;
    else nextCoupons.unshift(coupon);
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'coupon',
      actorEmail,
      summary: `${idx >= 0 ? 'Updated' : 'Created'} coupon ${coupon.code}`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      coupons: dedupeById(nextCoupons),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'coupons', coupon.id),
    };
  }).state;
}

export function storageDeleteCoupon(
  couponId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.coupons.find((c) => c.id === couponId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'coupon',
      actorEmail,
      summary: `Deleted coupon ${target.code}`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      coupons: cur.coupons.filter((c) => c.id !== couponId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'coupons', couponId),
    };
  }).state;
}

export function storageUpsertReview(
  review: ProductReviewRecord,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const idx = cur.reviews.findIndex((r) => r.id === review.id);
    const nextReviews = [...cur.reviews];
    if (idx >= 0) nextReviews[idx] = review;
    else nextReviews.unshift(review);

    const approved = nextReviews.filter(
      (r) => r.productId === review.productId && r.status === 'Approved'
    );
    const nextProducts = cur.products.map((p) => {
      if (p.id !== review.productId || approved.length === 0) return p;
      const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
      return { ...p, rating: Number(avg.toFixed(1)), reviewCount: approved.length };
    });

    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'review',
      actorEmail,
      summary: `Saved ${review.rating}★ review by ${review.customerName} (${review.status})`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      products: nextProducts,
      reviews: dedupeById(nextReviews),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'reviews', review.id),
    };
  }).state;
}

export function storageUpdateReviewStatus(
  reviewId: string,
  status: ReviewStatus,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.reviews.find((r) => r.id === reviewId);
    if (!target) return cur;
    const nextReviews = cur.reviews.map((r) => (r.id === reviewId ? { ...r, status } : r));
    const approved = nextReviews.filter(
      (r) => r.productId === target.productId && r.status === 'Approved'
    );
    const nextProducts = cur.products.map((p) => {
      if (p.id !== target.productId || approved.length === 0) return p;
      const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
      return { ...p, rating: Number(avg.toFixed(1)), reviewCount: approved.length };
    });
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'review',
      actorEmail,
      summary: `Marked review by ${target.customerName} as ${status}`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      products: nextProducts,
      reviews: nextReviews,
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
    };
  }).state;
}

export function storageDeleteReview(
  reviewId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.reviews.find((r) => r.id === reviewId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'review',
      actorEmail,
      summary: `Deleted review by ${target.customerName}`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      reviews: cur.reviews.filter((r) => r.id !== reviewId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'reviews', reviewId),
    };
  }).state;
}

export function storageUpsertShippingZone(
  zone: ShippingZoneRecord,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const idx = cur.shippingZones.findIndex((z) => z.id === zone.id);
    const nextZones = [...cur.shippingZones];
    if (idx >= 0) nextZones[idx] = zone;
    else nextZones.push(zone);
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'shipping',
      actorEmail,
      summary: `${idx >= 0 ? 'Updated' : 'Added'} shipping zone "${zone.name}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      shippingZones: dedupeById(nextZones),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: removeDeletedId(cur.deletedIds, 'shippingZones', zone.id),
    };
  }).state;
}

export function storageDeleteShippingZone(
  zoneId: string,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const target = cur.shippingZones.find((z) => z.id === zoneId);
    if (!target) return cur;
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'shipping',
      actorEmail,
      summary: `Deleted shipping zone "${target.name}"`,
    };
    return {
      ...cur,
      hasCustomEdits: true,
      shippingZones: cur.shippingZones.filter((z) => z.id !== zoneId),
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
      deletedIds: appendDeletedId(cur.deletedIds, 'shippingZones', zoneId),
    };
  }).state;
}

export function storageMarkNotificationsRead(
  targetId: string | 'all',
  profile: AdminProfileInfo
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const computed = computeDashboardPayload(cur, profile).notifications;
    const nextNotifs = computed.map((n) =>
      targetId === 'all' || n.id === targetId ? { ...n, read: true } : n
    );
    return {
      ...cur,
      hasCustomEdits: true,
      notifications: nextNotifs.slice(0, 100),
    };
  }).state;
}

export function storageUpdateWebsiteSettings(
  settings: WebsiteSettings,
  actorEmail = 'admin'
): PersistedAdminWorkspaceState {
  return updateState((cur) => {
    const log: AdminActivityEntry = {
      id: makeClientId('act'),
      timestamp: new Date().toISOString(),
      type: 'settings',
      actorEmail,
      summary: 'Updated storefront website settings & delivery rules',
    };
    return {
      ...cur,
      hasCustomEdits: true,
      websiteSettings: { ...createDefaultWebsiteSettings(), ...settings },
      activityLogs: [log, ...cur.activityLogs].slice(0, 200),
    };
  }).state;
}

export function storageUpdateAdminPreferences(
  patch: Partial<AdminPreferences>
): PersistedAdminWorkspaceState {
  return updateState((cur) => ({
    ...cur,
    adminPreferences: {
      ...cur.adminPreferences,
      ...patch,
    },
  })).state;
}

// ==========================================================
// DYNAMIC DASHBOARD STATISTICS CALCULATOR (CLIENT-SIDE MIRROR)
// ==========================================================
export function computeDashboardPayload(
  state: PersistedAdminWorkspaceState,
  profile: AdminProfileInfo
): AdminDashboardPayload {
  const { products, categories, orders, coupons, reviews, shippingZones, websiteSettings, activityLogs } =
    state;

  const customers: CustomerRecord[] = state.customers.map((cust) => {
    const matchingOrders = orders.filter(
      (o) =>
        o.customerId === cust.id ||
        (cust.phone && o.customerPhone && o.customerPhone.replace(/\s+/g, '') === cust.phone.replace(/\s+/g, '')) ||
        (cust.email && o.customerEmail && o.customerEmail.toLowerCase() === cust.email.toLowerCase())
    );
    const activeSpend = matchingOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded')
      .reduce((s, o) => s + o.totalPkr, 0);
    return {
      ...cust,
      orderCount: matchingOrders.length,
      totalSpentPkr: activeSpend,
      lastOrderAt: matchingOrders[0]?.createdAt || cust.lastOrderAt,
    };
  });

  // Derive low stock & pending order alerts merged cleanly with saved read status
  const derivedAlerts: AdminNotificationItem[] = [];
  for (const prod of products) {
    const qty = prod.stockQuantity ?? (prod.inStock ? 6 : 0);
    const threshold = prod.lowStockThreshold ?? websiteSettings.defaultLowStockThreshold;
    if (qty === 0 || !prod.inStock) {
      derivedAlerts.push({
        id: `stock-out-${prod.id}`,
        title: `Out of Stock: ${prod.name}`,
        message: `SKU ${prod.sku} has 0 units available on the storefront.`,
        category: 'inventory',
        severity: 'critical',
        createdAt: state.updatedAt,
        read: false,
        targetSection: 'inventory',
      });
    } else if (qty <= threshold) {
      derivedAlerts.push({
        id: `stock-low-${prod.id}`,
        title: `Low Stock: ${prod.name}`,
        message: `Only ${qty} unit(s) remaining (threshold ${threshold}).`,
        category: 'inventory',
        severity: 'warning',
        createdAt: state.updatedAt,
        read: false,
        targetSection: 'inventory',
      });
    }
  }
  for (const ord of orders) {
    if (ord.status === 'New' || ord.status === 'Pending') {
      derivedAlerts.push({
        id: `order-pending-${ord.id}`,
        title: `${ord.status} Order ${ord.id}`,
        message: `Awaiting atelier confirmation from ${ord.customerName} (Rs. ${ord.totalPkr.toLocaleString('en-PK')}).`,
        category: 'order',
        severity: 'warning',
        createdAt: ord.createdAt,
        read: false,
        targetSection: 'orders',
      });
    }
  }

  const persistedMap = new Map(state.notifications.map((n) => [n.id, n]));
  const notifications: AdminNotificationItem[] = [...state.notifications];
  for (const alert of derivedAlerts) {
    if (!persistedMap.has(alert.id)) {
      notifications.push(alert);
    }
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const activeSalesOrders = orders.filter(
    (o) => o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded'
  );

  const totalRevenuePkr = activeSalesOrders.reduce((s, o) => s + o.totalPkr, 0);
  const todaysSalesPkr = activeSalesOrders
    .filter((o) => new Date(o.createdAt).getTime() >= startOfToday)
    .reduce((s, o) => s + o.totalPkr, 0);
  const monthlySalesPkr = activeSalesOrders
    .filter((o) => new Date(o.createdAt).getTime() >= startOfMonth)
    .reduce((s, o) => s + o.totalPkr, 0);

  const lowStockProducts = products
    .filter((p) => {
      const qty = p.stockQuantity ?? (p.inStock ? 6 : 0);
      const threshold = p.lowStockThreshold ?? websiteSettings.defaultLowStockThreshold;
      return qty <= threshold || !p.inStock;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stockQuantity ?? (p.inStock ? 6 : 0),
      lowStockThreshold: p.lowStockThreshold ?? websiteSettings.defaultLowStockThreshold,
      inStock: p.inStock,
      image: p.images[0] || DEFAULT_STUDIO_IMAGE,
    }));

  const outOfStockCount = products.filter(
    (p) => !p.inStock || (p.stockQuantity ?? 0) === 0
  ).length;
  const lowStockCount = products.filter((p) => {
    const qty = p.stockQuantity ?? (p.inStock ? 6 : 0);
    const threshold = p.lowStockThreshold ?? websiteSettings.defaultLowStockThreshold;
    return p.inStock && qty > 0 && qty <= threshold;
  }).length;

  const productSalesMap = new Map<string, { units: number; revenue: number }>();
  for (const ord of activeSalesOrders) {
    for (const item of ord.items) {
      const key = item.productId || item.sku || item.name;
      const prev = productSalesMap.get(key) || { units: 0, revenue: 0 };
      productSalesMap.set(key, {
        units: prev.units + item.quantity,
        revenue: prev.revenue + item.unitPricePkr * item.quantity,
      });
    }
  }

  const topSellingProducts: TopSellingProductStat[] = Array.from(productSalesMap.entries())
    .map(([key, agg]) => {
      const prod = products.find((p) => p.id === key || p.sku === key || p.name === key);
      if (!prod) return null;
      return {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        image: prod.images[0] || DEFAULT_STUDIO_IMAGE,
        unitsSold: agg.units,
        revenuePkr: agg.revenue,
        stockQuantity: prod.stockQuantity ?? (prod.inStock ? 6 : 0),
        inStock: prod.inStock,
      };
    })
    .filter((x): x is TopSellingProductStat => x !== null)
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenuePkr - a.revenuePkr)
    .slice(0, 6);

  const revenueByDay: Array<{
    date: string;
    label: string;
    revenuePkr: number;
    ordersCount: number;
  }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayOrders = activeSalesOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    });
    revenueByDay.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-PK', { weekday: 'short' }),
      revenuePkr: dayOrders.reduce((s, o) => s + o.totalPkr, 0),
      ordersCount: dayOrders.length,
    });
  }

  return {
    stats: {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalOrders: orders.length,
      newOrders: orders.filter((o) => o.status === 'New').length,
      pendingOrders: orders.filter((o) => o.status === 'Pending' || o.status === 'New').length,
      confirmedOrders: orders.filter((o) => o.status === 'Confirmed').length,
      processingOrders: orders.filter((o) => o.status === 'Processing').length,
      shippedOrders: orders.filter((o) => o.status === 'Shipped').length,
      completedOrders: orders.filter((o) => o.status === 'Delivered').length,
      cancelledOrders: orders.filter((o) => o.status === 'Cancelled').length,
      returnedOrders: orders.filter((o) => o.status === 'Returned').length,
      refundedOrders: orders.filter((o) => o.status === 'Refunded').length,
      totalCustomers: customers.length,
      totalRevenuePkr,
      todaysSalesPkr,
      monthlySalesPkr,
      inStockCount: products.filter((p) => p.inStock && (p.stockQuantity ?? 1) > 0).length,
      lowStockCount,
      outOfStockCount,
      featuredCount: products.filter((p) => p.isBestSeller).length,
      activeCouponsCount: coupons.filter((c) => c.active).length,
      pendingReviewsCount: reviews.filter((r) => r.status === 'Pending').length,
      unreadNotificationsCount: notifications.filter((n) => !n.read).length,
      whatsappConfigured: profile.whatsappConfigured,
    },
    orders,
    customers,
    coupons,
    reviews,
    shippingZones,
    notifications: notifications.slice(0, 100),
    activityLogs,
    settings: websiteSettings,
    profile,
    topSellingProducts,
    lowStockProducts,
    revenueByDay,
  };
}

// ==========================================================
// JSON BACKUP EXPORT & IMPORT / RESTORE (ZERO PASSWORDS)
// ==========================================================
export function buildAdminBackupJson(): string {
  const state = loadPersistedAdminState();
  let adminCosts: AdminProductCostEntry[] | undefined;
  let wishlistIds: string[] | undefined;
  if (isLocalStorageAvailable()) {
    try {
      const cRaw = window.localStorage.getItem(ADMIN_COSTS_STORAGE_KEY);
      if (cRaw) {
        const parsed = JSON.parse(cRaw);
        if (Array.isArray(parsed)) adminCosts = parsed as AdminProductCostEntry[];
      }
      const wRaw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (wRaw) {
        const parsed = JSON.parse(wRaw);
        if (Array.isArray(parsed)) wishlistIds = parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      // Ignore optional auxiliary storage keys
    }
  }

  const backup: BackupDocumentV1 = {
    app: STORE_CONFIG.brandName,
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      products: state.products,
      categories: state.categories,
      orders: state.orders,
      customers: state.customers,
      coupons: state.coupons,
      reviews: state.reviews,
      shippingZones: state.shippingZones,
      notifications: state.notifications,
      websiteSettings: state.websiteSettings,
      activityLogs: state.activityLogs,
      adminPreferences: state.adminPreferences,
      ...(adminCosts ? { adminCosts } : {}),
      ...(wishlistIds ? { wishlistIds } : {}),
    },
  };
  return JSON.stringify(backup, null, 2);
}

export function validateAndImportBackupJson(
  rawJsonText: string,
  mode: 'merge' | 'replace',
  actorEmail = 'admin'
): {
  ok: boolean;
  error?: string;
  state?: PersistedAdminWorkspaceState;
  summary?: { products: number; categories: number; orders: number; customers: number };
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { ok: false, error: 'Selected file is not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Backup JSON root must be an object.' };
  }

  const root = parsed as Partial<BackupDocumentV1> & { data?: unknown };
  const payload =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : (root as Record<string, unknown>);

  if (!Array.isArray(payload.products) && !Array.isArray(payload.orders) && !Array.isArray(payload.categories)) {
    return {
      ok: false,
      error: 'Backup file is missing Zaveri Atelier products, categories, or orders data.',
    };
  }

  const incomingSanitized = sanitizeWorkspaceState({
    ...payload,
    hasCustomEdits: true,
  });

  const current = loadPersistedAdminState();
  let finalState: PersistedAdminWorkspaceState;

  if (mode === 'replace') {
    finalState = {
      ...incomingSanitized,
      hasCustomEdits: true,
      updatedAt: new Date().toISOString(),
      deletedIds: createEmptyDeletedLedger(),
    };
  } else {
    const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
      const map = new Map<string, T>();
      for (const item of existing) map.set(item.id, item);
      for (const item of incoming) map.set(item.id, item);
      return Array.from(map.values());
    };
    finalState = {
      ...current,
      hasCustomEdits: true,
      updatedAt: new Date().toISOString(),
      products: mergeById(current.products, incomingSanitized.products),
      categories: dedupeCategories([...current.categories, ...incomingSanitized.categories]),
      orders: mergeById(current.orders, incomingSanitized.orders).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      customers: mergeById(current.customers, incomingSanitized.customers),
      coupons: mergeById(current.coupons, incomingSanitized.coupons),
      reviews: mergeById(current.reviews, incomingSanitized.reviews),
      shippingZones: mergeById(current.shippingZones, incomingSanitized.shippingZones),
      notifications: mergeById(current.notifications, incomingSanitized.notifications).slice(0, 100),
      websiteSettings: { ...current.websiteSettings, ...incomingSanitized.websiteSettings },
      activityLogs: mergeById(current.activityLogs, incomingSanitized.activityLogs).slice(0, 200),
      adminPreferences: { ...current.adminPreferences, ...incomingSanitized.adminPreferences },
    };
  }

  const auditEntry: AdminActivityEntry = {
    id: makeClientId('act'),
    timestamp: new Date().toISOString(),
    type: 'settings',
    actorEmail,
    summary: `Restored Chrome LocalStorage backup (${mode} mode): ${finalState.products.length} products, ${finalState.orders.length} orders`,
  };
  finalState.activityLogs = [auditEntry, ...finalState.activityLogs].slice(0, 200);

  const saved = savePersistedAdminState(finalState);
  if (!saved.ok) {
    return { ok: false, error: saved.error };
  }

  if (isLocalStorageAvailable()) {
    try {
      if (Array.isArray(payload.adminCosts)) {
        window.localStorage.setItem(ADMIN_COSTS_STORAGE_KEY, JSON.stringify(payload.adminCosts));
      }
      if (Array.isArray(payload.wishlistIds)) {
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(payload.wishlistIds));
      }
    } catch {
      // Non-critical auxiliary keys
    }
  }

  return {
    ok: true,
    state: finalState,
    summary: {
      products: finalState.products.length,
      categories: finalState.categories.length,
      orders: finalState.orders.length,
      customers: finalState.customers.length,
    },
  };
}

export function resetAdminStorageToDefaults(actorEmail = 'admin'): PersistedAdminWorkspaceState {
  const fresh: PersistedAdminWorkspaceState = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    hasCustomEdits: false,
    products: (JSON.parse(JSON.stringify(PRODUCTS)) as JewelleryProduct[])
      .map((p) => normalizeProduct(p))
      .filter((p): p is JewelleryProduct => p !== null),
    categories: dedupeCategories(JSON.parse(JSON.stringify(CATEGORY_CARDS)) as CategoryCardItem[]),
    orders: [],
    customers: [],
    coupons: [],
    reviews: [],
    shippingZones: createDefaultShippingZones(),
    notifications: [],
    websiteSettings: createDefaultWebsiteSettings(),
    activityLogs: [
      {
        id: makeClientId('act'),
        timestamp: new Date().toISOString(),
        type: 'settings',
        actorEmail,
        summary: 'Reset browser LocalStorage catalog & workspace to factory defaults',
      },
    ],
    adminPreferences: createDefaultAdminPreferences(),
    deletedIds: createEmptyDeletedLedger(),
  };
  savePersistedAdminState(fresh);
  return fresh;
}

export function getChromeStorageUsageStats(): {
  available: boolean;
  bytesUsed: number;
  kbUsed: number;
  updatedAt: string;
  counts: {
    products: number;
    categories: number;
    orders: number;
    customers: number;
    coupons: number;
    reviews: number;
    activityLogs: number;
  };
} {
  const available = isLocalStorageAvailable();
  const state = loadPersistedAdminState();
  let bytesUsed = 0;
  if (available) {
    for (const key of [
      ADMIN_STATE_STORAGE_KEY,
      CATALOG_PRODUCTS_STORAGE_KEY,
      CATALOG_CATEGORIES_STORAGE_KEY,
      CART_STORAGE_KEY,
      WISHLIST_STORAGE_KEY,
      ADMIN_COSTS_STORAGE_KEY,
    ]) {
      try {
        const val = window.localStorage.getItem(key);
        if (val) bytesUsed += val.length * 2; // UTF-16 byte estimate in Chrome
      } catch {
        // Ignore read error
      }
    }
  }
  return {
    available,
    bytesUsed,
    kbUsed: Math.round((bytesUsed / 1024) * 10) / 10,
    updatedAt: state.updatedAt,
    counts: {
      products: state.products.length,
      categories: state.categories.length,
      orders: state.orders.length,
      customers: state.customers.length,
      coupons: state.coupons.length,
      reviews: state.reviews.length,
      activityLogs: state.activityLogs.length,
    },
  };
}

export async function compressImageFileToDataUrl(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined') return rawDataUrl;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 960;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      const compressed = canvas.toDataURL(outMime, 0.84);
      resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
