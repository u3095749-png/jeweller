import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  CATEGORY_CARDS,
  PRODUCTS,
  type CategoryCardItem,
  type JewelleryProduct,
} from '../src/data/products.ts';
import { STORE_CONFIG } from '../src/config/storeConfig.ts';
import {
  ALL_ORDER_STATUSES,
  type AdminActivityEntry,
  type AdminDashboardPayload,
  type AdminNotificationItem,
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
} from '../src/types/assistant.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'zaveri-atelier-data') : path.join(ROOT_DIR, '.data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
export const UPLOADS_DIR = IS_VERCEL
  ? path.join('/tmp', 'zaveri-atelier-uploads')
  : path.join(ROOT_DIR, 'public', 'uploads');

const DEFAULT_STUDIO_IMAGE = '/src/assets/images/cat_rings_solitaire_1795173688192.jpg';

export interface StoredAdminCredential {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface PersistedStoreState {
  version: number;
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
  adminCredential?: StoredAdminCredential;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'Cash on Delivery',
  'Bank Transfer',
  'JazzCash / EasyPaisa',
  'Card / Online',
];

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Paid', 'Partial', 'Refunded'];

function createDefaultWebsiteSettings(): WebsiteSettings {
  return {
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
}

function createDefaultShippingZones(): ShippingZoneRecord[] {
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

function normalizeProductRecord(p: JewelleryProduct): JewelleryProduct {
  const inStock = typeof p.inStock === 'boolean' ? p.inStock : true;
  const stockQuantity =
    typeof p.stockQuantity === 'number' && Number.isFinite(p.stockQuantity)
      ? Math.max(0, Math.floor(p.stockQuantity))
      : inStock
      ? 6
      : 0;
  const lowStockThreshold =
    typeof p.lowStockThreshold === 'number' && Number.isFinite(p.lowStockThreshold)
      ? Math.max(0, Math.floor(p.lowStockThreshold))
      : 2;

  return {
    ...p,
    inStock: stockQuantity > 0 ? inStock : false,
    stockQuantity,
    lowStockThreshold,
  };
}

function normalizeLegacyOrderStatus(raw: unknown): OrderStatus {
  const s = String(raw || 'New').trim();
  if (s === 'Dispatched') return 'Shipped';
  if (s === 'Completed') return 'Delivered';
  if (ALL_ORDER_STATUSES.includes(s as OrderStatus)) {
    return s as OrderStatus;
  }
  return 'New';
}

function normalizeOrderRecord(raw: Partial<StoreOrder>, products: JewelleryProduct[]): StoreOrder {
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
          image: item.image || matched?.images[0],
          category: item.category || matched?.category,
          size: String(item.size || 'Standard'),
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          unitPricePkr: Math.max(0, Math.round(Number(item.unitPricePkr) || 0)),
        };
      })
    : [];

  const computedSub = items.reduce((sum, i) => sum + i.unitPricePkr * i.quantity, 0);
  const subtotalPkr =
    typeof raw.subtotalPkr === 'number' && Number.isFinite(raw.subtotalPkr)
      ? Math.max(0, Math.round(raw.subtotalPkr))
      : computedSub;
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

  const status = normalizeLegacyOrderStatus(raw.status);
  const paymentMethod = VALID_PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethod)
    ? (raw.paymentMethod as PaymentMethod)
    : 'Cash on Delivery';
  const paymentStatus = VALID_PAYMENT_STATUSES.includes(raw.paymentStatus as PaymentStatus)
    ? (raw.paymentStatus as PaymentStatus)
    : status === 'Delivered'
    ? 'Paid'
    : status === 'Refunded'
    ? 'Refunded'
    : 'Unpaid';

  return {
    id: String(raw.id || `ORD-${Date.now().toString().slice(-6)}`),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt,
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
    paymentMethod,
    paymentStatus,
    courierName: raw.courierName,
    trackingNumber: raw.trackingNumber,
    customerNote: raw.customerNote,
    internalNotes: raw.internalNotes,
    status,
  };
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function createInitialState(): PersistedStoreState {
  const initialProducts = (JSON.parse(JSON.stringify(PRODUCTS)) as JewelleryProduct[]).map(
    normalizeProductRecord
  );
  return {
    version: 2,
    products: initialProducts,
    categories: JSON.parse(JSON.stringify(CATEGORY_CARDS)) as CategoryCardItem[],
    orders: [],
    customers: [],
    coupons: [],
    reviews: [],
    shippingZones: createDefaultShippingZones(),
    notifications: [],
    websiteSettings: createDefaultWebsiteSettings(),
    activityLogs: [],
  };
}

let cachedState: PersistedStoreState | null = null;

function loadState(): PersistedStoreState {
  if (cachedState) return cachedState;
  ensureDirectories();
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialState();
    saveState(initial);
    cachedState = initial;
    return initial;
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedStoreState>;
    const initial = createInitialState();
    const loadedProducts = Array.isArray(parsed.products)
      ? parsed.products.map(normalizeProductRecord)
      : initial.products;
    const loadedOrders = Array.isArray(parsed.orders)
      ? parsed.orders.map((o) => normalizeOrderRecord(o, loadedProducts))
      : [];

    cachedState = {
      version: 2,
      products: loadedProducts,
      categories: Array.isArray(parsed.categories) ? parsed.categories : initial.categories,
      orders: loadedOrders,
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      shippingZones:
        Array.isArray(parsed.shippingZones) && parsed.shippingZones.length > 0
          ? parsed.shippingZones
          : initial.shippingZones,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      websiteSettings: parsed.websiteSettings
        ? { ...createDefaultWebsiteSettings(), ...parsed.websiteSettings }
        : createDefaultWebsiteSettings(),
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
      adminCredential:
        parsed.adminCredential &&
        typeof parsed.adminCredential.email === 'string' &&
        typeof parsed.adminCredential.passwordHash === 'string' &&
        typeof parsed.adminCredential.salt === 'string'
          ? parsed.adminCredential
          : undefined,
    };
    return cachedState;
  } catch {
    const fallback = createInitialState();
    saveState(fallback);
    cachedState = fallback;
    return fallback;
  }
}

function saveState(next: PersistedStoreState): void {
  ensureDirectories();
  const tmpPath = `${STORE_PATH}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
  cachedState = next;
}

export function isSafeImageUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2_000_000) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  if (trimmed.length > 1000) return false;
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

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `piece-${Date.now()}`;
}

function ensureUniqueSlug(desired: string, products: JewelleryProduct[], excludeId?: string): string {
  const clean = slugify(desired);
  let candidate = clean;
  let counter = 2;
  while (products.some((p) => p.slug === candidate && p.id !== excludeId)) {
    candidate = `${clean}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export function getCatalogProducts(): JewelleryProduct[] {
  return loadState().products;
}

export function getCatalogCategories(): CategoryCardItem[] {
  return loadState().categories;
}

export function getCatalogProductById(id: string): JewelleryProduct | undefined {
  return loadState().products.find((p) => p.id === id);
}

export function getStoredAdminCredential(): StoredAdminCredential | undefined {
  return loadState().adminCredential;
}

export function setStoredAdminCredential(cred: StoredAdminCredential): void {
  const state = loadState();
  saveState({
    ...state,
    adminCredential: cred,
  });
}

function makeNotification(
  partial: Omit<AdminNotificationItem, 'id' | 'createdAt' | 'read'>
): AdminNotificationItem {
  return {
    id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
    read: false,
    ...partial,
  };
}

export function appendActivityLog(
  entry: Omit<AdminActivityEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): AdminActivityEntry {
  const state = loadState();
  const fullEntry: AdminActivityEntry = {
    id: entry.id || `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    type: entry.type,
    actorEmail: entry.actorEmail,
    summary: entry.summary,
    whatsappAlertStatus: entry.whatsappAlertStatus,
  };
  let nextNotifications = state.notifications;
  if (entry.type === 'login_failed') {
    nextNotifications = [
      makeNotification({
        title: 'Failed Admin Login Attempt',
        message: entry.summary,
        category: 'security',
        severity: 'critical',
        targetSection: 'activity',
      }),
      ...state.notifications,
    ].slice(0, 100);
  }
  const updatedLogs = [fullEntry, ...state.activityLogs].slice(0, 200);
  saveState({
    ...state,
    notifications: nextNotifications,
    activityLogs: updatedLogs,
  });
  return fullEntry;
}

export function updateActivityLogWhatsAppStatus(entryId: string, status: string): void {
  const state = loadState();
  const idx = state.activityLogs.findIndex((a) => a.id === entryId);
  if (idx < 0) return;
  const nextLogs = [...state.activityLogs];
  nextLogs[idx] = { ...nextLogs[idx], whatsappAlertStatus: status };
  saveState({ ...state, activityLogs: nextLogs });
}

export function getActivityLogs(): AdminActivityEntry[] {
  return loadState().activityLogs;
}

export function getOrders(): StoreOrder[] {
  return loadState().orders;
}

export function validateCouponCode(
  codeRaw: string,
  subtotalPkr: number
): { valid: boolean; coupon?: CouponRecord; discountPkr: number; error?: string } {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) {
    return { valid: false, discountPkr: 0, error: 'Please enter a coupon code.' };
  }
  const state = loadState();
  const coupon = state.coupons.find((c) => c.code.toUpperCase() === code);
  if (!coupon || !coupon.active) {
    return { valid: false, discountPkr: 0, error: 'Coupon code is invalid or inactive.' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, discountPkr: 0, error: 'This coupon has expired.' };
  }
  if (typeof coupon.maxUses === 'number' && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountPkr: 0, error: 'This coupon has reached its redemption limit.' };
  }
  if (subtotalPkr < coupon.minOrderPkr) {
    return {
      valid: false,
      discountPkr: 0,
      error: `Minimum order of Rs. ${coupon.minOrderPkr.toLocaleString('en-PK')} required.`,
    };
  }
  const rawDiscount =
    coupon.discountType === 'percent'
      ? Math.round((subtotalPkr * coupon.discountValue) / 100)
      : Math.round(coupon.discountValue);
  const discountPkr = Math.min(subtotalPkr, Math.max(0, rawDiscount));
  return { valid: true, coupon, discountPkr };
}

function upsertCustomerFromOrder(
  customers: CustomerRecord[],
  input: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    deliveryAddress?: string;
    city?: string;
  },
  timestamp: string
): { customers: CustomerRecord[]; customerId?: string } {
  const cleanPhone = input.customerPhone?.trim();
  const cleanEmail = input.customerEmail?.trim().toLowerCase();
  const cleanName = input.customerName.trim();
  if (!cleanPhone && !cleanEmail && (!cleanName || cleanName === 'WhatsApp Concierge Client')) {
    return { customers, customerId: undefined };
  }

  const existingIdx = customers.findIndex(
    (c) =>
      (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '')) ||
      (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail)
  );

  if (existingIdx >= 0) {
    const existing = customers[existingIdx];
    const updated: CustomerRecord = {
      ...existing,
      name: cleanName !== 'WhatsApp Concierge Client' ? cleanName : existing.name,
      phone: cleanPhone || existing.phone,
      email: cleanEmail || existing.email,
      city: input.city?.trim() || existing.city,
      address: input.deliveryAddress?.trim() || existing.address,
      updatedAt: timestamp,
    };
    const next = [...customers];
    next[existingIdx] = updated;
    return { customers: next, customerId: updated.id };
  }

  const newCustomer: CustomerRecord = {
    id: `CUST-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    name: cleanName || 'Valued Client',
    phone: cleanPhone,
    email: cleanEmail,
    city: input.city?.trim() || undefined,
    address: input.deliveryAddress?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { customers: [newCustomer, ...customers], customerId: newCustomer.id };
}

export function recordCustomerOrder(input: {
  id?: string;
  type: 'single' | 'cart' | 'manual';
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  city?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  couponCode?: string;
  shippingPkr?: number;
  items: StoreOrderItem[];
  totalPkr?: number;
  customerNote?: string;
  internalNotes?: string;
  actorEmail?: string;
}): StoreOrder {
  const state = loadState();
  const safeClientOrderId =
    typeof input.id === 'string' && /^ORD-[A-Za-z0-9_-]{4,36}$/.test(input.id.trim())
      ? input.id.trim()
      : undefined;
  if (safeClientOrderId) {
    const existingOrder = state.orders.find((o) => o.id === safeClientOrderId);
    if (existingOrder) return existingOrder;
  }
  const nowIso = new Date().toISOString();

  const sanitizedItems: StoreOrderItem[] = input.items.slice(0, 25).map((item) => {
    const matched = state.products.find(
      (p) =>
        (item.productId && p.id === item.productId) ||
        (item.sku && p.sku === item.sku) ||
        p.name.toLowerCase() === String(item.name || '').trim().toLowerCase()
    );
    return {
      productId: item.productId || matched?.id,
      name: String(item.name || matched?.name || 'Jewellery Piece').trim().slice(0, 140),
      sku: (typeof item.sku === 'string' && item.sku.trim()) || matched?.sku,
      image: item.image || matched?.images[0],
      category: item.category || matched?.category,
      size: String(item.size || 'Standard').trim().slice(0, 60),
      quantity: Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1))),
      unitPricePkr: Math.max(
        0,
        Math.round(Number(item.unitPricePkr) || matched?.pricePkr || 0)
      ),
    };
  });

  const subtotalPkr = sanitizedItems.reduce((sum, i) => sum + i.unitPricePkr * i.quantity, 0);

  let discountPkr = 0;
  let appliedCouponCode: string | undefined;
  let nextCoupons = state.coupons;
  if (input.couponCode && input.couponCode.trim()) {
    const couponCheck = validateCouponCode(input.couponCode, subtotalPkr);
    if (couponCheck.valid && couponCheck.coupon) {
      discountPkr = couponCheck.discountPkr;
      appliedCouponCode = couponCheck.coupon.code;
      nextCoupons = state.coupons.map((c) =>
        c.id === couponCheck.coupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c
      );
    }
  }

  const shippingPkr =
    typeof input.shippingPkr === 'number' && Number.isFinite(input.shippingPkr)
      ? Math.max(0, Math.round(input.shippingPkr))
      : subtotalPkr >= state.websiteSettings.freeDeliveryThresholdPkr || subtotalPkr === 0
      ? 0
      : state.websiteSettings.standardDeliveryFeePkr;

  const computedTotal = Math.max(0, subtotalPkr - discountPkr + shippingPkr);
  const safeTotal =
    typeof input.totalPkr === 'number' && Number.isFinite(input.totalPkr) && input.totalPkr > 0
      ? Math.round(input.totalPkr)
      : computedTotal;

  const customerName =
    typeof input.customerName === 'string' && input.customerName.trim()
      ? input.customerName.trim().slice(0, 100)
      : 'WhatsApp Concierge Client';

  const customerSync = upsertCustomerFromOrder(
    state.customers,
    {
      customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      deliveryAddress: input.deliveryAddress,
      city: input.city,
    },
    nowIso
  );

  // Decrement stock gracefully for ordered items
  const nextProducts = state.products.map((prod) => {
    const orderedQty = sanitizedItems
      .filter((it) => it.productId === prod.id)
      .reduce((sum, it) => sum + it.quantity, 0);
    if (orderedQty <= 0) return prod;
    const currentStock = prod.stockQuantity ?? (prod.inStock ? 6 : 0);
    const updatedStock = Math.max(0, currentStock - orderedQty);
    return {
      ...prod,
      stockQuantity: updatedStock,
      inStock: updatedStock > 0,
    };
  });

  const paymentMethod: PaymentMethod = VALID_PAYMENT_METHODS.includes(
    input.paymentMethod as PaymentMethod
  )
    ? (input.paymentMethod as PaymentMethod)
    : 'Cash on Delivery';

  const status: OrderStatus =
    input.status && ALL_ORDER_STATUSES.includes(input.status) ? input.status : 'New';

  const paymentStatus: PaymentStatus = VALID_PAYMENT_STATUSES.includes(
    input.paymentStatus as PaymentStatus
  )
    ? (input.paymentStatus as PaymentStatus)
    : 'Unpaid';

  const order: StoreOrder = {
    id:
      safeClientOrderId ||
      `ORD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    type: input.type === 'cart' || input.type === 'manual' ? input.type : 'single',
    customerId: customerSync.customerId,
    customerName,
    customerPhone: input.customerPhone?.trim() || undefined,
    customerEmail: input.customerEmail?.trim() || undefined,
    deliveryAddress: input.deliveryAddress?.trim() || undefined,
    city: input.city?.trim() || undefined,
    items: sanitizedItems,
    subtotalPkr,
    discountPkr,
    couponCode: appliedCouponCode,
    shippingPkr,
    totalPkr: safeTotal,
    paymentMethod,
    paymentStatus,
    customerNote:
      typeof input.customerNote === 'string' && input.customerNote.trim()
        ? input.customerNote.trim().slice(0, 300)
        : undefined,
    internalNotes:
      typeof input.internalNotes === 'string' && input.internalNotes.trim()
        ? input.internalNotes.trim().slice(0, 400)
        : undefined,
    status,
  };

  const nextOrders = [order, ...state.orders].slice(0, 300);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: nowIso,
    type: 'order',
    actorEmail: input.actorEmail || customerName,
    summary: `New order ${order.id} from ${customerName} — Rs. ${order.totalPkr.toLocaleString('en-PK')} (${paymentMethod})`,
  };
  const notifEntry = makeNotification({
    title: `New Order ${order.id}`,
    message: `${customerName} placed an order for ${sanitizedItems.length} item(s) totaling Rs. ${order.totalPkr.toLocaleString('en-PK')}.`,
    category: 'order',
    severity: 'info',
    targetSection: 'orders',
  });

  saveState({
    ...state,
    products: nextProducts,
    orders: nextOrders,
    customers: customerSync.customers,
    coupons: nextCoupons,
    notifications: [notifEntry, ...state.notifications].slice(0, 100),
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return order;
}

export function updateOrderDetails(
  orderId: string,
  patch: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    courierName?: string;
    trackingNumber?: string;
    internalNotes?: string;
    deliveryAddress?: string;
    city?: string;
  },
  actorEmail = 'admin'
): StoreOrder | null {
  const state = loadState();
  const idx = state.orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  const existing = state.orders[idx];

  const nextStatus =
    patch.status !== undefined
      ? ALL_ORDER_STATUSES.includes(patch.status)
        ? patch.status
        : null
      : existing.status;
  if (!nextStatus) return null;

  const nextPaymentStatus =
    patch.paymentStatus !== undefined
      ? VALID_PAYMENT_STATUSES.includes(patch.paymentStatus)
        ? patch.paymentStatus
        : existing.paymentStatus
      : nextStatus === 'Refunded'
      ? 'Refunded'
      : existing.paymentStatus;

  const nextPaymentMethod =
    patch.paymentMethod && VALID_PAYMENT_METHODS.includes(patch.paymentMethod)
      ? patch.paymentMethod
      : existing.paymentMethod;

  const updated: StoreOrder = {
    ...existing,
    status: nextStatus,
    paymentStatus: nextPaymentStatus,
    paymentMethod: nextPaymentMethod,
    courierName:
      patch.courierName !== undefined ? patch.courierName.trim() || undefined : existing.courierName,
    trackingNumber:
      patch.trackingNumber !== undefined
        ? patch.trackingNumber.trim() || undefined
        : existing.trackingNumber,
    internalNotes:
      patch.internalNotes !== undefined
        ? patch.internalNotes.trim() || undefined
        : existing.internalNotes,
    deliveryAddress:
      patch.deliveryAddress !== undefined
        ? patch.deliveryAddress.trim() || undefined
        : existing.deliveryAddress,
    city: patch.city !== undefined ? patch.city.trim() || undefined : existing.city,
    updatedAt: new Date().toISOString(),
  };

  const nextOrders = [...state.orders];
  nextOrders[idx] = updated;

  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: updated.updatedAt!,
    type: 'order',
    actorEmail,
    summary: `Updated order ${orderId}: status=${updated.status}, payment=${updated.paymentStatus}`,
  };

  saveState({
    ...state,
    orders: nextOrders,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteOrder(orderId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.orders.find((o) => o.id === orderId);
  if (!target) return false;
  const nextOrders = state.orders.filter((o) => o.id !== orderId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'order',
    actorEmail,
    summary: `Deleted order record ${orderId} (${target.customerName})`,
  };
  saveState({
    ...state,
    orders: nextOrders,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// Legacy alias kept cleanly for compatibility
export function updateOrderStatus(orderId: string, status: OrderStatus): StoreOrder | null {
  return updateOrderDetails(orderId, { status });
}

export interface ProductMutationInput {
  name: string;
  sku?: string;
  category: string;
  categories?: string[];
  subcategory?: string;
  collection?: string;
  pricePkr: number;
  discountPercent?: number;
  compareAtPricePkr?: number;
  material?: string;
  weightGrams?: string;
  gemstones?: string;
  availableSizes?: string[];
  shortDescription?: string;
  description?: string;
  careNote?: string;
  images?: string[];
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  inStock?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

function normalizeProductFields(
  input: ProductMutationInput,
  existing?: JewelleryProduct,
  allProducts: JewelleryProduct[] = []
): JewelleryProduct {
  const name = String(input.name || existing?.name || '').trim().slice(0, 140);
  if (!name) {
    throw new Error('Product name is required.');
  }

  const pricePkr = Math.round(Number(input.pricePkr));
  if (!Number.isFinite(pricePkr) || pricePkr <= 0) {
    throw new Error('Selling price must be greater than zero PKR.');
  }

  let compareAtPricePkr: number | undefined;
  if (typeof input.discountPercent === 'number' && Number.isFinite(input.discountPercent)) {
    const pct = Math.min(90, Math.max(0, input.discountPercent));
    if (pct > 0) {
      compareAtPricePkr = Math.round(pricePkr / (1 - pct / 100));
    }
  } else if (
    typeof input.compareAtPricePkr === 'number' &&
    Number.isFinite(input.compareAtPricePkr) &&
    input.compareAtPricePkr > pricePkr
  ) {
    compareAtPricePkr = Math.round(input.compareAtPricePkr);
  }

  const primaryCat = String(input.category || existing?.category || 'Rings').trim().slice(0, 60);
  const rawCats = Array.isArray(input.categories)
    ? input.categories.map((c) => String(c).trim()).filter(Boolean)
    : existing?.categories || [];
  const categories = Array.from(new Set([primaryCat, ...rawCats]));

  const cleanImages = (Array.isArray(input.images) ? input.images : existing?.images || [])
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => isSafeImageUrl(u));
  if (cleanImages.length === 0) {
    cleanImages.push(DEFAULT_STUDIO_IMAGE);
  }

  const availableSizes = (
    Array.isArray(input.availableSizes) && input.availableSizes.length > 0
      ? input.availableSizes
      : existing?.availableSizes || ['Standard']
  )
    .map((s) => String(s).trim())
    .filter(Boolean);

  const id = existing?.id || `za-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;
  const slug = existing
    ? ensureUniqueSlug(existing.name === name ? existing.slug : name, allProducts, existing.id)
    : ensureUniqueSlug(name, allProducts);

  const maxOrder = allProducts.reduce((m, p) => Math.max(m, p.releasedOrder || 0), 18);

  const inStockFlag = typeof input.inStock === 'boolean' ? input.inStock : existing?.inStock ?? true;
  const stockQuantity =
    typeof input.stockQuantity === 'number' && Number.isFinite(input.stockQuantity)
      ? Math.max(0, Math.floor(input.stockQuantity))
      : existing?.stockQuantity ?? (inStockFlag ? 6 : 0);
  const lowStockThreshold =
    typeof input.lowStockThreshold === 'number' && Number.isFinite(input.lowStockThreshold)
      ? Math.max(0, Math.floor(input.lowStockThreshold))
      : existing?.lowStockThreshold ?? 2;

  return {
    id,
    slug,
    sku:
      String(input.sku || existing?.sku || `ZA-${id.slice(-4).toUpperCase()}`)
        .trim()
        .slice(0, 32),
    name,
    category: primaryCat,
    categories,
    subcategory: input.subcategory?.trim() || existing?.subcategory || undefined,
    collection: String(input.collection || existing?.collection || 'Royal Heritage').trim().slice(0, 60),
    pricePkr,
    compareAtPricePkr,
    rating: existing?.rating ?? 4.9,
    reviewCount: existing?.reviewCount ?? 1,
    material: String(input.material || existing?.material || '22K Solid Yellow Gold').trim().slice(0, 120),
    weightGrams: String(input.weightGrams || existing?.weightGrams || '10.0 g').trim().slice(0, 40),
    gemstones: String(input.gemstones || existing?.gemstones || 'Certified Fine Gemstones').trim().slice(0, 140),
    availableSizes: availableSizes.length > 0 ? availableSizes : ['Standard'],
    shortDescription:
      String(input.shortDescription || input.description || existing?.shortDescription || name)
        .trim()
        .slice(0, 220),
    description:
      String(input.description || input.shortDescription || existing?.description || name)
        .trim()
        .slice(0, 1500),
    careNote:
      String(
        input.careNote ||
          existing?.careNote ||
          'Store inside the velvet pouch provided; polish gently with a dry chamois cloth.'
      )
        .trim()
        .slice(0, 240),
    images: cleanImages,
    model3dType: existing?.model3dType,
    default3dFinish: existing?.default3dFinish,
    isNewArrival:
      typeof input.isNewArrival === 'boolean' ? input.isNewArrival : existing?.isNewArrival ?? true,
    isBestSeller:
      typeof input.isBestSeller === 'boolean' ? input.isBestSeller : existing?.isBestSeller ?? false,
    popularityScore: existing?.popularityScore ?? (input.isBestSeller ? 96 : 85),
    inStock: stockQuantity > 0 ? inStockFlag : false,
    stockQuantity,
    lowStockThreshold,
    releasedOrder: existing?.releasedOrder ?? maxOrder + 1,
  };
}

export function createProduct(input: ProductMutationInput, actorEmail: string): JewelleryProduct {
  const state = loadState();
  const created = normalizeProductFields(input, undefined, state.products);
  const nextCategories = [...state.categories];
  if (!nextCategories.some((c) => c.category.toLowerCase() === created.category.toLowerCase())) {
    nextCategories.push({
      category: created.category,
      description: `Handcrafted ${created.category.toLowerCase()} from Zaveri Atelier.`,
      image: created.images[0] || DEFAULT_STUDIO_IMAGE,
    });
  }
  const nextProducts = [created, ...state.products];
  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'product',
    actorEmail,
    summary: `Added product "${created.name}" (Rs. ${created.pricePkr.toLocaleString('en-PK')})`,
  };
  saveState({
    ...state,
    products: nextProducts,
    categories: nextCategories,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateProduct(
  productId: string,
  input: ProductMutationInput,
  actorEmail: string
): JewelleryProduct | null {
  const state = loadState();
  const idx = state.products.findIndex((p) => p.id === productId);
  if (idx < 0) return null;
  const existing = state.products[idx];
  const updated = normalizeProductFields(input, existing, state.products);
  const nextProducts = [...state.products];
  nextProducts[idx] = updated;
  const nextCategories = [...state.categories];
  if (!nextCategories.some((c) => c.category.toLowerCase() === updated.category.toLowerCase())) {
    nextCategories.push({
      category: updated.category,
      description: `Handcrafted ${updated.category.toLowerCase()} from Zaveri Atelier.`,
      image: updated.images[0] || DEFAULT_STUDIO_IMAGE,
    });
  }
  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'product',
    actorEmail,
    summary: `Updated product "${updated.name}"`,
  };
  saveState({
    ...state,
    products: nextProducts,
    categories: nextCategories,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteProduct(productId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.products.find((p) => p.id === productId);
  if (!target) return false;
  const nextProducts = state.products.filter((p) => p.id !== productId);
  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'product',
    actorEmail,
    summary: `Deleted product "${target.name}" (${target.sku})`,
  };
  saveState({
    ...state,
    products: nextProducts,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

export interface CategoryMutationInput {
  category: string;
  description?: string;
  image?: string;
  subcategories?: string[];
}

export function createCategory(input: CategoryMutationInput, actorEmail: string): CategoryCardItem {
  const state = loadState();
  const name = String(input.category || '').trim().slice(0, 60);
  if (!name) throw new Error('Category name is required.');
  if (state.categories.some((c) => c.category.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Category "${name}" already exists.`);
  }
  const image = isSafeImageUrl(input.image) ? input.image.trim() : DEFAULT_STUDIO_IMAGE;
  const created: CategoryCardItem = {
    category: name,
    description:
      String(input.description || `Explore fine ${name.toLowerCase()} curated by Zaveri Atelier.`)
        .trim()
        .slice(0, 220),
    image,
    subcategories: Array.isArray(input.subcategories)
      ? input.subcategories.map((s) => String(s).trim()).filter(Boolean)
      : undefined,
  };
  const nextCategories = [...state.categories, created];
  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'category',
    actorEmail,
    summary: `Created category "${created.category}"`,
  };
  saveState({
    ...state,
    categories: nextCategories,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateCategory(
  currentName: string,
  input: CategoryMutationInput,
  actorEmail: string
): CategoryCardItem | null {
  const state = loadState();
  const idx = state.categories.findIndex(
    (c) => c.category.toLowerCase() === currentName.trim().toLowerCase()
  );
  if (idx < 0) return null;
  const existing = state.categories[idx];
  const newName = String(input.category || existing.category).trim().slice(0, 60);
  if (!newName) throw new Error('Category name cannot be empty.');
  const duplicate = state.categories.some(
    (c, i) => i !== idx && c.category.toLowerCase() === newName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Another category named "${newName}" already exists.`);
  }

  const updated: CategoryCardItem = {
    category: newName,
    description:
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim().slice(0, 220)
        : existing.description,
    image: isSafeImageUrl(input.image) ? input.image.trim() : existing.image,
    subcategories: Array.isArray(input.subcategories)
      ? input.subcategories.map((s) => String(s).trim()).filter(Boolean)
      : existing.subcategories,
  };

  const nextCategories = [...state.categories];
  nextCategories[idx] = updated;

  const renamed = existing.category !== newName;
  const nextProducts = renamed
    ? state.products.map((p) => ({
        ...p,
        category: p.category === existing.category ? newName : p.category,
        categories: p.categories.map((c) => (c === existing.category ? newName : c)),
      }))
    : state.products;

  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'category',
    actorEmail,
    summary: renamed
      ? `Renamed category "${existing.category}" to "${newName}"`
      : `Updated category "${newName}"`,
  };

  saveState({
    ...state,
    categories: nextCategories,
    products: nextProducts,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteCategory(categoryName: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.categories.find(
    (c) => c.category.toLowerCase() === categoryName.trim().toLowerCase()
  );
  if (!target) return false;
  const nextCategories = state.categories.filter((c) => c.category !== target.category);
  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'category',
    actorEmail,
    summary: `Deleted category "${target.category}"`,
  };
  saveState({
    ...state,
    categories: nextCategories,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// --- INVENTORY MANAGEMENT ---
export function updateProductInventory(
  productId: string,
  input: { stockQuantity: number; lowStockThreshold?: number; inStock?: boolean },
  actorEmail: string
): JewelleryProduct | null {
  const state = loadState();
  const idx = state.products.findIndex((p) => p.id === productId);
  if (idx < 0) return null;
  const existing = state.products[idx];
  const qty = Math.max(0, Math.floor(Number(input.stockQuantity) || 0));
  const threshold =
    typeof input.lowStockThreshold === 'number' && Number.isFinite(input.lowStockThreshold)
      ? Math.max(0, Math.floor(input.lowStockThreshold))
      : existing.lowStockThreshold ?? state.websiteSettings.defaultLowStockThreshold;
  const inStock = qty > 0 ? (typeof input.inStock === 'boolean' ? input.inStock : true) : false;

  const updated: JewelleryProduct = {
    ...existing,
    stockQuantity: qty,
    lowStockThreshold: threshold,
    inStock,
  };
  const nextProducts = [...state.products];
  nextProducts[idx] = updated;

  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'inventory',
    actorEmail,
    summary: `Adjusted inventory for "${updated.name}" to ${qty} units (${inStock ? 'In Stock' : 'Out of Stock'})`,
  };
  saveState({
    ...state,
    products: nextProducts,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

// --- DISCOUNTS & OFFERS ---
export function applyProductOrCategoryDiscount(
  input: { scope: 'product' | 'category'; target: string; discountPercent: number },
  actorEmail: string
): JewelleryProduct[] {
  const state = loadState();
  const pct = Math.min(90, Math.max(0, Math.round(Number(input.discountPercent) || 0)));
  let affected = 0;

  const nextProducts = state.products.map((prod) => {
    const matches =
      input.scope === 'product'
        ? prod.id === input.target
        : prod.category.toLowerCase() === input.target.trim().toLowerCase() ||
          prod.categories.some((c) => c.toLowerCase() === input.target.trim().toLowerCase());
    if (!matches) return prod;
    affected += 1;
    if (pct === 0) {
      return { ...prod, compareAtPricePkr: undefined };
    }
    const baseline =
      prod.compareAtPricePkr && prod.compareAtPricePkr > prod.pricePkr
        ? prod.compareAtPricePkr
        : prod.pricePkr;
    const discountedPrice = Math.max(100, Math.round(baseline * (1 - pct / 100)));
    return {
      ...prod,
      pricePkr: discountedPrice,
      compareAtPricePkr: baseline,
    };
  });

  if (affected === 0) {
    throw new Error('No matching product or category found for discount update.');
  }

  const logEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'discount',
    actorEmail,
    summary:
      pct === 0
        ? `Removed active discount badge on ${input.scope} "${input.target}" (${affected} piece${affected === 1 ? '' : 's'})`
        : `Applied ${pct}% offer to ${input.scope} "${input.target}" (${affected} piece${affected === 1 ? '' : 's'})`,
  };
  saveState({
    ...state,
    products: nextProducts,
    activityLogs: [logEntry, ...state.activityLogs].slice(0, 200),
  });
  return nextProducts;
}

// --- CUSTOMERS CRUD ---
export function getCustomersWithMetrics(): CustomerRecord[] {
  const state = loadState();
  return state.customers.map((cust) => {
    const matchingOrders = state.orders.filter(
      (o) =>
        o.customerId === cust.id ||
        (cust.phone && o.customerPhone === cust.phone) ||
        (cust.email && o.customerEmail?.toLowerCase() === cust.email.toLowerCase())
    );
    const totalSpentPkr = matchingOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded')
      .reduce((sum, o) => sum + o.totalPkr, 0);
    return {
      ...cust,
      orderCount: matchingOrders.length,
      totalSpentPkr,
      lastOrderAt: matchingOrders[0]?.createdAt,
    };
  });
}

export function createCustomer(
  input: Partial<CustomerRecord>,
  actorEmail: string
): CustomerRecord {
  const name = String(input.name || '').trim().slice(0, 100);
  if (!name) throw new Error('Customer name is required.');
  const state = loadState();
  const nowIso = new Date().toISOString();
  const created: CustomerRecord = {
    id: `CUST-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    name,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
    city: input.city?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: nowIso,
    type: 'customer',
    actorEmail,
    summary: `Added customer profile "${created.name}"`,
  };
  saveState({
    ...state,
    customers: [created, ...state.customers],
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateCustomer(
  customerId: string,
  input: Partial<CustomerRecord>,
  actorEmail: string
): CustomerRecord | null {
  const state = loadState();
  const idx = state.customers.findIndex((c) => c.id === customerId);
  if (idx < 0) return null;
  const existing = state.customers[idx];
  const name = String(input.name ?? existing.name).trim().slice(0, 100);
  if (!name) throw new Error('Customer name cannot be empty.');
  const nowIso = new Date().toISOString();
  const updated: CustomerRecord = {
    ...existing,
    name,
    phone: input.phone !== undefined ? input.phone.trim() || undefined : existing.phone,
    email: input.email !== undefined ? input.email.trim().toLowerCase() || undefined : existing.email,
    city: input.city !== undefined ? input.city.trim() || undefined : existing.city,
    address: input.address !== undefined ? input.address.trim() || undefined : existing.address,
    notes: input.notes !== undefined ? input.notes.trim() || undefined : existing.notes,
    updatedAt: nowIso,
  };
  const nextCustomers = [...state.customers];
  nextCustomers[idx] = updated;
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: nowIso,
    type: 'customer',
    actorEmail,
    summary: `Updated customer "${updated.name}"`,
  };
  saveState({
    ...state,
    customers: nextCustomers,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteCustomer(customerId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.customers.find((c) => c.id === customerId);
  if (!target) return false;
  const nextCustomers = state.customers.filter((c) => c.id !== customerId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'customer',
    actorEmail,
    summary: `Deleted customer profile "${target.name}"`,
  };
  saveState({
    ...state,
    customers: nextCustomers,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// --- COUPONS CRUD ---
export function getCoupons(): CouponRecord[] {
  return loadState().coupons;
}

export function createCoupon(input: Partial<CouponRecord>, actorEmail: string): CouponRecord {
  const code = String(input.code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
  if (!code) throw new Error('Coupon code (letters/numbers) is required.');
  const state = loadState();
  if (state.coupons.some((c) => c.code === code)) {
    throw new Error(`Coupon code "${code}" already exists.`);
  }
  const discountType = input.discountType === 'fixed' ? 'fixed' : 'percent';
  const rawVal = Number(input.discountValue) || 0;
  const discountValue =
    discountType === 'percent' ? Math.min(90, Math.max(1, Math.round(rawVal))) : Math.max(1, Math.round(rawVal));

  const created: CouponRecord = {
    id: `CPN-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    code,
    description: String(input.description || `${code} promotional privilege`).trim().slice(0, 160),
    discountType,
    discountValue,
    minOrderPkr: Math.max(0, Math.round(Number(input.minOrderPkr) || 0)),
    maxUses:
      typeof input.maxUses === 'number' && input.maxUses > 0 ? Math.floor(input.maxUses) : undefined,
    usedCount: 0,
    active: typeof input.active === 'boolean' ? input.active : true,
    expiresAt: input.expiresAt?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: created.createdAt,
    type: 'coupon',
    actorEmail,
    summary: `Created coupon ${created.code} (${
      created.discountType === 'percent'
        ? `${created.discountValue}% OFF`
        : `Rs. ${created.discountValue.toLocaleString('en-PK')} OFF`
    })`,
  };
  saveState({
    ...state,
    coupons: [created, ...state.coupons],
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateCoupon(
  couponId: string,
  input: Partial<CouponRecord>,
  actorEmail: string
): CouponRecord | null {
  const state = loadState();
  const idx = state.coupons.findIndex((c) => c.id === couponId);
  if (idx < 0) return null;
  const existing = state.coupons[idx];
  const nextCode = input.code
    ? String(input.code)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 32)
    : existing.code;
  if (!nextCode) throw new Error('Coupon code cannot be empty.');
  if (state.coupons.some((c, i) => i !== idx && c.code === nextCode)) {
    throw new Error(`Another coupon already uses code "${nextCode}".`);
  }

  const discountType =
    input.discountType === 'fixed' || input.discountType === 'percent'
      ? input.discountType
      : existing.discountType;
  const rawVal =
    input.discountValue !== undefined ? Number(input.discountValue) : existing.discountValue;
  const discountValue =
    discountType === 'percent'
      ? Math.min(90, Math.max(1, Math.round(rawVal)))
      : Math.max(1, Math.round(rawVal));

  const updated: CouponRecord = {
    ...existing,
    code: nextCode,
    description:
      input.description !== undefined ? input.description.trim().slice(0, 160) : existing.description,
    discountType,
    discountValue,
    minOrderPkr:
      input.minOrderPkr !== undefined
        ? Math.max(0, Math.round(Number(input.minOrderPkr) || 0))
        : existing.minOrderPkr,
    maxUses:
      input.maxUses !== undefined
        ? input.maxUses && input.maxUses > 0
          ? Math.floor(input.maxUses)
          : undefined
        : existing.maxUses,
    active: typeof input.active === 'boolean' ? input.active : existing.active,
    expiresAt:
      input.expiresAt !== undefined ? input.expiresAt?.trim() || undefined : existing.expiresAt,
  };

  const nextCoupons = [...state.coupons];
  nextCoupons[idx] = updated;
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'coupon',
    actorEmail,
    summary: `Updated coupon ${updated.code} (${updated.active ? 'Active' : 'Paused'})`,
  };
  saveState({
    ...state,
    coupons: nextCoupons,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteCoupon(couponId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.coupons.find((c) => c.id === couponId);
  if (!target) return false;
  const nextCoupons = state.coupons.filter((c) => c.id !== couponId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'coupon',
    actorEmail,
    summary: `Deleted coupon ${target.code}`,
  };
  saveState({
    ...state,
    coupons: nextCoupons,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// --- REVIEWS & RATINGS ---
function syncProductRatingsFromReviews(
  products: JewelleryProduct[],
  reviews: ProductReviewRecord[],
  productId: string
): JewelleryProduct[] {
  const approved = reviews.filter((r) => r.productId === productId && r.status === 'Approved');
  if (approved.length === 0) return products;
  const avg = approved.reduce((sum, r) => sum + r.rating, 0) / approved.length;
  return products.map((p) =>
    p.id === productId
      ? {
          ...p,
          rating: Number(avg.toFixed(1)),
          reviewCount: approved.length,
        }
      : p
  );
}

export function getReviews(): ProductReviewRecord[] {
  return loadState().reviews;
}

export function createReview(input: Partial<ProductReviewRecord>, actorEmail: string): ProductReviewRecord {
  const state = loadState();
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) throw new Error('Please choose a valid product for this review.');
  const customerName = String(input.customerName || '').trim().slice(0, 80);
  if (!customerName) throw new Error('Reviewer name is required.');
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const status: ReviewStatus =
    input.status === 'Pending' || input.status === 'Hidden' ? input.status : 'Approved';

  const created: ProductReviewRecord = {
    id: `REV-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    productId: product.id,
    productName: product.name,
    customerName,
    rating,
    title: String(input.title || `${rating}-star Client Review`).trim().slice(0, 120),
    comment: String(input.comment || '').trim().slice(0, 600),
    status,
    verifiedPurchase: Boolean(input.verifiedPurchase),
    createdAt: new Date().toISOString(),
  };

  const nextReviews = [created, ...state.reviews];
  const nextProducts = syncProductRatingsFromReviews(state.products, nextReviews, product.id);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: created.createdAt,
    type: 'review',
    actorEmail,
    summary: `Added ${rating}★ review by ${customerName} on "${product.name}"`,
  };
  saveState({
    ...state,
    products: nextProducts,
    reviews: nextReviews,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateReviewStatus(
  reviewId: string,
  status: ReviewStatus,
  actorEmail: string
): ProductReviewRecord | null {
  if (!['Approved', 'Pending', 'Hidden'].includes(status)) return null;
  const state = loadState();
  const idx = state.reviews.findIndex((r) => r.id === reviewId);
  if (idx < 0) return null;
  const updated: ProductReviewRecord = { ...state.reviews[idx], status };
  const nextReviews = [...state.reviews];
  nextReviews[idx] = updated;
  const nextProducts = syncProductRatingsFromReviews(state.products, nextReviews, updated.productId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'review',
    actorEmail,
    summary: `Marked review by ${updated.customerName} on "${updated.productName}" as ${status}`,
  };
  saveState({
    ...state,
    products: nextProducts,
    reviews: nextReviews,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteReview(reviewId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.reviews.find((r) => r.id === reviewId);
  if (!target) return false;
  const nextReviews = state.reviews.filter((r) => r.id !== reviewId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'review',
    actorEmail,
    summary: `Deleted review by ${target.customerName} on "${target.productName}"`,
  };
  saveState({
    ...state,
    reviews: nextReviews,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// --- SHIPPING ZONES CRUD ---
export function getShippingZones(): ShippingZoneRecord[] {
  return loadState().shippingZones;
}

export function createShippingZone(
  input: Partial<ShippingZoneRecord>,
  actorEmail: string
): ShippingZoneRecord {
  const name = String(input.name || '').trim().slice(0, 80);
  if (!name) throw new Error('Shipping zone name is required.');
  const state = loadState();
  const created: ShippingZoneRecord = {
    id: `zone-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex')}`,
    name,
    regions: String(input.regions || 'Pakistan Nationwide').trim().slice(0, 180),
    courierPartner: String(input.courierPartner || 'TCS Priority Insured').trim().slice(0, 80),
    feePkr: Math.max(0, Math.round(Number(input.feePkr) || 0)),
    freeAbovePkr: Math.max(0, Math.round(Number(input.freeAbovePkr) || 0)),
    estimatedDays: String(input.estimatedDays || '2 – 4 Business Days').trim().slice(0, 60),
    insured: typeof input.insured === 'boolean' ? input.insured : true,
    active: typeof input.active === 'boolean' ? input.active : true,
  };
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'shipping',
    actorEmail,
    summary: `Added shipping zone "${created.name}" (${created.courierPartner})`,
  };
  saveState({
    ...state,
    shippingZones: [...state.shippingZones, created],
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return created;
}

export function updateShippingZone(
  zoneId: string,
  input: Partial<ShippingZoneRecord>,
  actorEmail: string
): ShippingZoneRecord | null {
  const state = loadState();
  const idx = state.shippingZones.findIndex((z) => z.id === zoneId);
  if (idx < 0) return null;
  const existing = state.shippingZones[idx];
  const updated: ShippingZoneRecord = {
    ...existing,
    name: input.name !== undefined ? String(input.name).trim().slice(0, 80) || existing.name : existing.name,
    regions:
      input.regions !== undefined ? String(input.regions).trim().slice(0, 180) : existing.regions,
    courierPartner:
      input.courierPartner !== undefined
        ? String(input.courierPartner).trim().slice(0, 80)
        : existing.courierPartner,
    feePkr:
      input.feePkr !== undefined
        ? Math.max(0, Math.round(Number(input.feePkr) || 0))
        : existing.feePkr,
    freeAbovePkr:
      input.freeAbovePkr !== undefined
        ? Math.max(0, Math.round(Number(input.freeAbovePkr) || 0))
        : existing.freeAbovePkr,
    estimatedDays:
      input.estimatedDays !== undefined
        ? String(input.estimatedDays).trim().slice(0, 60)
        : existing.estimatedDays,
    insured: typeof input.insured === 'boolean' ? input.insured : existing.insured,
    active: typeof input.active === 'boolean' ? input.active : existing.active,
  };
  const nextZones = [...state.shippingZones];
  nextZones[idx] = updated;
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'shipping',
    actorEmail,
    summary: `Updated shipping zone "${updated.name}" (Rs. ${updated.feePkr})`,
  };
  saveState({
    ...state,
    shippingZones: nextZones,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return updated;
}

export function deleteShippingZone(zoneId: string, actorEmail: string): boolean {
  const state = loadState();
  const target = state.shippingZones.find((z) => z.id === zoneId);
  if (!target) return false;
  const nextZones = state.shippingZones.filter((z) => z.id !== zoneId);
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'shipping',
    actorEmail,
    summary: `Deleted shipping zone "${target.name}"`,
  };
  saveState({
    ...state,
    shippingZones: nextZones,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return true;
}

// --- NOTIFICATIONS ---
export function getAllNotifications(): AdminNotificationItem[] {
  const state = loadState();
  const derivedAlerts: AdminNotificationItem[] = [];

  for (const prod of state.products) {
    const qty = prod.stockQuantity ?? (prod.inStock ? 6 : 0);
    const threshold = prod.lowStockThreshold ?? state.websiteSettings.defaultLowStockThreshold;
    if (qty === 0 || !prod.inStock) {
      derivedAlerts.push({
        id: `stock-out-${prod.id}`,
        title: `Out of Stock: ${prod.name}`,
        message: `SKU ${prod.sku} has 0 units available on the storefront.`,
        category: 'inventory',
        severity: 'critical',
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        read: false,
        targetSection: 'inventory',
      });
    }
  }

  for (const ord of state.orders) {
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

  // Merge persisted notifications first, deduping derived IDs already acknowledged
  const persistedIds = new Set(state.notifications.map((n) => n.id));
  const combined = [...state.notifications];
  for (const alert of derivedAlerts) {
    if (!persistedIds.has(alert.id)) {
      combined.push(alert);
    }
  }
  return combined.slice(0, 100);
}

export function markNotificationsRead(targetId: string | 'all'): AdminNotificationItem[] {
  const state = loadState();
  const currentAll = getAllNotifications();
  const nextNotifications = currentAll.map((item) => {
    if (targetId === 'all' || item.id === targetId) {
      return { ...item, read: true };
    }
    return item;
  });
  // Persist explicit read status for stored + dismissed derived stock/order alerts
  saveState({
    ...state,
    notifications: nextNotifications.slice(0, 100),
  });
  return nextNotifications;
}

// --- WEBSITE SETTINGS ---
export function getWebsiteSettings(): WebsiteSettings {
  return loadState().websiteSettings;
}

export function updateWebsiteSettings(
  patch: Partial<WebsiteSettings>,
  actorEmail: string
): WebsiteSettings {
  const state = loadState();
  const prev = state.websiteSettings;
  const next: WebsiteSettings = {
    brandName:
      typeof patch.brandName === 'string' && patch.brandName.trim()
        ? patch.brandName.trim().slice(0, 80)
        : prev.brandName,
    brandTagline:
      typeof patch.brandTagline === 'string' && patch.brandTagline.trim()
        ? patch.brandTagline.trim().slice(0, 140)
        : prev.brandTagline,
    announcementBar:
      typeof patch.announcementBar === 'string'
        ? patch.announcementBar.trim().slice(0, 220)
        : prev.announcementBar,
    whatsappDisplayNumber:
      typeof patch.whatsappDisplayNumber === 'string' && patch.whatsappDisplayNumber.trim()
        ? patch.whatsappDisplayNumber.trim().slice(0, 40)
        : prev.whatsappDisplayNumber,
    whatsappBusinessNumber:
      typeof patch.whatsappBusinessNumber === 'string' && patch.whatsappBusinessNumber.trim()
        ? patch.whatsappBusinessNumber.replace(/[^\d]/g, '').slice(0, 20) || prev.whatsappBusinessNumber
        : prev.whatsappBusinessNumber,
    conciergeEmail:
      typeof patch.conciergeEmail === 'string' && patch.conciergeEmail.trim()
        ? patch.conciergeEmail.trim().slice(0, 120)
        : prev.conciergeEmail,
    freeDeliveryThresholdPkr:
      typeof patch.freeDeliveryThresholdPkr === 'number' &&
      Number.isFinite(patch.freeDeliveryThresholdPkr)
        ? Math.max(0, Math.round(patch.freeDeliveryThresholdPkr))
        : prev.freeDeliveryThresholdPkr,
    standardDeliveryFeePkr:
      typeof patch.standardDeliveryFeePkr === 'number' &&
      Number.isFinite(patch.standardDeliveryFeePkr)
        ? Math.max(0, Math.round(patch.standardDeliveryFeePkr))
        : prev.standardDeliveryFeePkr,
    codEnabled: typeof patch.codEnabled === 'boolean' ? patch.codEnabled : prev.codEnabled,
    bankTransferDetails:
      typeof patch.bankTransferDetails === 'string'
        ? patch.bankTransferDetails.trim().slice(0, 260)
        : prev.bankTransferDetails,
    defaultLowStockThreshold:
      typeof patch.defaultLowStockThreshold === 'number' &&
      Number.isFinite(patch.defaultLowStockThreshold)
        ? Math.max(0, Math.floor(patch.defaultLowStockThreshold))
        : prev.defaultLowStockThreshold,
  };
  const actEntry: AdminActivityEntry = {
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: 'settings',
    actorEmail,
    summary: 'Updated storefront settings & delivery thresholds',
  };
  saveState({
    ...state,
    websiteSettings: next,
    activityLogs: [actEntry, ...state.activityLogs].slice(0, 200),
  });
  return next;
}

// --- COMPREHENSIVE REAL-DATA DASHBOARD AGGREGATOR ---
export function getDashboardSummary(profile: AdminProfileInfo): AdminDashboardPayload {
  const state = loadState();
  const products = state.products;
  const orders = state.orders;
  const customers = getCustomersWithMetrics();
  const notifications = getAllNotifications();

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

  const lowStockList = products
    .filter((p) => {
      const qty = p.stockQuantity ?? (p.inStock ? 6 : 0);
      const threshold = p.lowStockThreshold ?? state.websiteSettings.defaultLowStockThreshold;
      return qty <= threshold || !p.inStock;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stockQuantity ?? (p.inStock ? 6 : 0),
      lowStockThreshold: p.lowStockThreshold ?? state.websiteSettings.defaultLowStockThreshold,
      inStock: p.inStock,
      image: p.images[0] || DEFAULT_STUDIO_IMAGE,
    }));

  const outOfStockCount = products.filter(
    (p) => !p.inStock || (p.stockQuantity ?? 0) === 0
  ).length;
  const lowStockCount = products.filter((p) => {
    const qty = p.stockQuantity ?? (p.inStock ? 6 : 0);
    const threshold = p.lowStockThreshold ?? state.websiteSettings.defaultLowStockThreshold;
    return p.inStock && qty > 0 && qty <= threshold;
  }).length;

  // Compute Best-Selling Products strictly from actual non-cancelled orders
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

  // Build real 7-day revenue series (strictly Rs. 0 on days with zero orders)
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
      totalCategories: state.categories.length,
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
      activeCouponsCount: state.coupons.filter((c) => c.active).length,
      pendingReviewsCount: state.reviews.filter((r) => r.status === 'Pending').length,
      unreadNotificationsCount: notifications.filter((n) => !n.read).length,
      whatsappConfigured: profile.whatsappConfigured,
    },
    orders,
    customers,
    coupons: state.coupons,
    reviews: state.reviews,
    shippingZones: state.shippingZones,
    notifications,
    activityLogs: state.activityLogs,
    settings: state.websiteSettings,
    profile,
    topSellingProducts,
    lowStockProducts: lowStockList,
    revenueByDay,
  };
}

export function saveUploadedImage(dataUrlOrBase64: string, originalMime?: string): string {
  ensureDirectories();
  let mime = (originalMime || '').toLowerCase().trim();
  let base64Payload = dataUrlOrBase64.trim();

  const dataUrlMatch = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(base64Payload);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    base64Payload = dataUrlMatch[2];
  }

  const buffer = Buffer.from(base64Payload.replace(/\s+/g, ''), 'base64');
  if (buffer.length < 16 || buffer.length > 3 * 1024 * 1024) {
    throw new Error('Uploaded image must be between 16 bytes and 3 MB.');
  }

  let ext: '.jpg' | '.png' | '.webp' | null = null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    ext = '.jpg';
  } else if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    ext = '.png';
  } else if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    ext = '.webp';
  }

  if (!ext || (mime && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime))) {
    throw new Error('Only genuine JPEG, PNG, or WebP images are permitted.');
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  const targetPath = path.resolve(UPLOADS_DIR, filename);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid upload target path.');
  }

  fs.writeFileSync(targetPath, buffer);
  return `/uploads/${filename}`;
}

export function restoreWorkspaceState(
  incoming: Partial<{
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
    deletedIds: {
      products?: string[];
      categories?: string[];
      orders?: string[];
      customers?: string[];
      coupons?: string[];
      reviews?: string[];
      shippingZones?: string[];
    };
  }>,
  mode: 'merge' | 'replace',
  actorEmail: string,
  options: { silent?: boolean } = {}
): void {
  const current = loadState();
  const delProds = new Set(Array.isArray(incoming.deletedIds?.products) ? incoming.deletedIds!.products : []);
  const delCats = new Set(
    Array.isArray(incoming.deletedIds?.categories)
      ? incoming.deletedIds!.categories.map((c) => String(c).toLowerCase())
      : []
  );
  const delOrders = new Set(Array.isArray(incoming.deletedIds?.orders) ? incoming.deletedIds!.orders : []);
  const delCustomers = new Set(Array.isArray(incoming.deletedIds?.customers) ? incoming.deletedIds!.customers : []);
  const delCoupons = new Set(Array.isArray(incoming.deletedIds?.coupons) ? incoming.deletedIds!.coupons : []);
  const delReviews = new Set(Array.isArray(incoming.deletedIds?.reviews) ? incoming.deletedIds!.reviews : []);
  const delZones = new Set(Array.isArray(incoming.deletedIds?.shippingZones) ? incoming.deletedIds!.shippingZones : []);

  const safeProducts = Array.isArray(incoming.products)
    ? incoming.products
        .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Number(p.pricePkr) > 0)
        .map((p) => normalizeProductRecord({
          ...p,
          images: Array.isArray(p.images) ? p.images.filter((u) => isSafeImageUrl(u)) : [DEFAULT_STUDIO_IMAGE],
        }))
    : [];
  const safeCategories = Array.isArray(incoming.categories)
    ? incoming.categories
        .filter((c) => c && typeof c.category === 'string' && c.category.trim())
        .map((c) => ({
          ...c,
          category: c.category.trim(),
          image: isSafeImageUrl(c.image) ? c.image : DEFAULT_STUDIO_IMAGE,
        }))
    : [];
  const safeOrders = Array.isArray(incoming.orders)
    ? incoming.orders.map((o) => normalizeOrderRecord(o, safeProducts.length > 0 ? safeProducts : current.products))
    : [];
  const safeCustomers = Array.isArray(incoming.customers)
    ? incoming.customers.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    : [];
  const safeCoupons = Array.isArray(incoming.coupons)
    ? incoming.coupons.filter((c) => c && typeof c.id === 'string' && typeof c.code === 'string')
    : [];
  const safeReviews = Array.isArray(incoming.reviews)
    ? incoming.reviews.filter((r) => r && typeof r.id === 'string' && typeof r.productId === 'string')
    : [];
  const safeShippingZones = Array.isArray(incoming.shippingZones)
    ? incoming.shippingZones.filter((z) => z && typeof z.id === 'string' && typeof z.name === 'string')
    : [];
  const safeNotifications = Array.isArray(incoming.notifications)
    ? incoming.notifications.filter((n) => n && typeof n.id === 'string' && typeof n.title === 'string').slice(0, 100)
    : [];
  const safeLogs = Array.isArray(incoming.activityLogs)
    ? incoming.activityLogs.filter((a) => a && typeof a.id === 'string' && typeof a.summary === 'string').slice(0, 200)
    : [];

  const dedupeId = <T extends { id: string }>(arr: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of arr) map.set(item.id, item);
    return Array.from(map.values());
  };

  if (mode === 'replace') {
    const audit: AdminActivityEntry | null = options.silent
      ? null
      : {
          id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          timestamp: new Date().toISOString(),
          type: 'settings',
          actorEmail,
          summary: `Restored store snapshot (${safeProducts.length} products, ${safeOrders.length} orders)`,
        };
    saveState({
      ...current,
      products: safeProducts.length > 0 || delProds.size > 0 ? dedupeId(safeProducts) : current.products,
      categories: safeCategories.length > 0 || delCats.size > 0 ? safeCategories : current.categories,
      orders: dedupeId(safeOrders),
      customers: dedupeId(safeCustomers),
      coupons: dedupeId(safeCoupons),
      reviews: dedupeId(safeReviews),
      shippingZones:
        safeShippingZones.length > 0 || delZones.size > 0 ? dedupeId(safeShippingZones) : current.shippingZones,
      notifications: safeNotifications,
      websiteSettings: incoming.websiteSettings
        ? { ...createDefaultWebsiteSettings(), ...incoming.websiteSettings }
        : current.websiteSettings,
      activityLogs: (audit ? [audit, ...safeLogs] : dedupeId([...current.activityLogs, ...safeLogs])).slice(0, 200),
    });
    return;
  }

  const filteredCurrentCats = current.categories.filter((c) => !delCats.has(c.category.toLowerCase()));
  const catMap = new Map<string, CategoryCardItem>();
  for (const c of filteredCurrentCats) catMap.set(c.category.toLowerCase(), c);
  for (const c of safeCategories) catMap.set(c.category.toLowerCase(), c);

  saveState({
    ...current,
    products:
      safeProducts.length > 0
        ? dedupeId([
            ...current.products.filter((p) => !delProds.has(p.id)),
            ...safeProducts,
          ])
        : current.products.filter((p) => !delProds.has(p.id)),
    categories: Array.from(catMap.values()),
    orders: dedupeId([...current.orders.filter((o) => !delOrders.has(o.id)), ...safeOrders]),
    customers: dedupeId([...current.customers.filter((c) => !delCustomers.has(c.id)), ...safeCustomers]),
    coupons: dedupeId([...current.coupons.filter((c) => !delCoupons.has(c.id)), ...safeCoupons]),
    reviews: dedupeId([...current.reviews.filter((r) => !delReviews.has(r.id)), ...safeReviews]),
    shippingZones: dedupeId([
      ...current.shippingZones.filter((z) => !delZones.has(z.id)),
      ...safeShippingZones,
    ]),
    notifications: dedupeId([...current.notifications, ...safeNotifications]).slice(0, 100),
    websiteSettings: incoming.websiteSettings
      ? { ...current.websiteSettings, ...incoming.websiteSettings }
      : current.websiteSettings,
    activityLogs: dedupeId([...current.activityLogs, ...safeLogs]).slice(0, 200),
  });
}
