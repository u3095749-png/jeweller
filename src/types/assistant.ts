import type { JewelleryCollection, MainCategory, Subcategory } from '../data/products.ts';

export type ShopPriceRangeKey =
  | 'all'
  | 'under-50k'
  | '50k-150k'
  | '150k-250k'
  | 'above-250k'
  | 'custom';

export type ShopSortKey = 'featured' | 'newest' | 'popular' | 'price-asc' | 'price-desc';

export type MetalFinishKey = 'champagne-gold' | 'white-gold' | 'sterling-silver' | 'rose-gold';

export interface ShopFilterState {
  searchQuery: string;
  category: MainCategory | 'All';
  subcategory: Subcategory | 'All';
  collection: JewelleryCollection | 'All';
  onlyNewArrivals: boolean;
  priceRange: ShopPriceRangeKey;
  minPricePkr?: number;
  maxPricePkr?: number;
  sortBy: ShopSortKey;
}

export type RobotVisualState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type AssistantLanguageCode =
  | 'auto'
  | 'en'
  | 'ur'
  | 'roman-ur'
  | 'hi'
  | 'ar'
  | 'fr'
  | 'es'
  | 'zh';

export interface LanguageOption {
  code: AssistantLanguageCode;
  label: string;
  nativeLabel: string;
  speechLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Auto Detect', nativeLabel: 'Auto', speechLang: 'en-PK' },
  { code: 'en', label: 'English', nativeLabel: 'English', speechLang: 'en-US' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', speechLang: 'ur-PK' },
  { code: 'roman-ur', label: 'Roman Urdu', nativeLabel: 'Roman Urdu', speechLang: 'ur-PK' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechLang: 'hi-IN' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', speechLang: 'ar-SA' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', speechLang: 'fr-FR' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', speechLang: 'es-ES' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', speechLang: 'zh-CN' },
];

export type ChatbotCategoryTab = string;

export const CHATBOT_CATEGORIES: ChatbotCategoryTab[] = [
  'All Products',
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Bangles',
  'Gold Jewellery',
  'Diamond Jewellery',
  'New Arrivals',
  'Best Sellers',
  'Sale',
];

export type ChatbotWorkspaceTab = 'store' | 'chat' | 'advisor';

export interface AdminProductCostEntry {
  productId: string;
  purchaseCostPkr?: number;
  extraExpensesPkr?: number;
  unitsSold?: number;
}

export interface BusinessRecommendationCard {
  productId: string;
  purchaseCostPkr: number;
  extraExpensesPkr: number;
  sellingPricePkr: number;
  estimatedProfitPkr: number;
  profitMarginPct: number;
  unitsSold?: number;
  actualProfitPkr?: number;
  recommendation: string;
}

export type OrderStatus =
  | 'New'
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'New',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

export type PaymentStatus = 'Unpaid' | 'Paid' | 'Partial' | 'Refunded';

export type PaymentMethod =
  | 'Cash on Delivery'
  | 'Bank Transfer'
  | 'JazzCash / EasyPaisa'
  | 'Card / Online';

export interface StoreOrderItem {
  productId?: string;
  name: string;
  sku?: string;
  image?: string;
  category?: string;
  size: string;
  quantity: number;
  unitPricePkr: number;
}

export interface StoreOrder {
  id: string;
  createdAt: string;
  updatedAt?: string;
  type: 'single' | 'cart' | 'manual';
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  city?: string;
  items: StoreOrderItem[];
  subtotalPkr: number;
  discountPkr: number;
  couponCode?: string;
  shippingPkr: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  courierName?: string;
  trackingNumber?: string;
  customerNote?: string;
  internalNotes?: string;
  status: OrderStatus;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderCount?: number;
  totalSpentPkr?: number;
  lastOrderAt?: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderPkr: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

export type ReviewStatus = 'Approved' | 'Pending' | 'Hidden';

export interface ProductReviewRecord {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ShippingZoneRecord {
  id: string;
  name: string;
  regions: string;
  courierPartner: string;
  feePkr: number;
  freeAbovePkr: number;
  estimatedDays: string;
  insured: boolean;
  active: boolean;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'order' | 'inventory' | 'security' | 'system';
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  read: boolean;
  targetSection?: string;
}

export interface WebsiteSettings {
  brandName: string;
  brandTagline: string;
  announcementBar: string;
  whatsappDisplayNumber: string;
  whatsappBusinessNumber: string;
  conciergeEmail: string;
  freeDeliveryThresholdPkr: number;
  standardDeliveryFeePkr: number;
  codEnabled: boolean;
  bankTransferDetails: string;
  defaultLowStockThreshold: number;
}

export interface AdminActivityEntry {
  id: string;
  timestamp: string;
  type:
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'setup'
    | 'product'
    | 'category'
    | 'order'
    | 'customer'
    | 'inventory'
    | 'discount'
    | 'coupon'
    | 'review'
    | 'payment'
    | 'shipping'
    | 'settings'
    | 'security';
  actorEmail: string;
  summary: string;
  whatsappAlertStatus?: string;
}

export interface AdminSessionStatus {
  authenticated: boolean;
  email?: string;
  expiresAt?: string;
  setupRequired: boolean;
  configError?: string;
}

export interface AdminProfileInfo {
  email: string;
  source: 'env' | 'store' | 'unconfigured';
  sessionCreatedAt?: string;
  sessionExpiresAt?: string;
  canChangePassword: boolean;
  whatsappConfigured: boolean;
}

export interface DashboardOverviewStats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  newOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  refundedOrders: number;
  totalCustomers: number;
  totalRevenuePkr: number;
  todaysSalesPkr: number;
  monthlySalesPkr: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  featuredCount: number;
  activeCouponsCount: number;
  pendingReviewsCount: number;
  unreadNotificationsCount: number;
  whatsappConfigured: boolean;
}

export interface TopSellingProductStat {
  productId: string;
  name: string;
  sku: string;
  category: string;
  image: string;
  unitsSold: number;
  revenuePkr: number;
  stockQuantity: number;
  inStock: boolean;
}

export interface AdminDashboardPayload {
  stats: DashboardOverviewStats;
  orders: StoreOrder[];
  customers: CustomerRecord[];
  coupons: CouponRecord[];
  reviews: ProductReviewRecord[];
  shippingZones: ShippingZoneRecord[];
  notifications: AdminNotificationItem[];
  activityLogs: AdminActivityEntry[];
  settings: WebsiteSettings;
  profile: AdminProfileInfo;
  topSellingProducts: TopSellingProductStat[];
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    stockQuantity: number;
    lowStockThreshold: number;
    inStock: boolean;
    image: string;
  }>;
  revenueByDay: Array<{ date: string; label: string; revenuePkr: number; ordersCount: number }>;
}

export type AssistantActionType =
  | 'none'
  | 'navigate'
  | 'filter_shop'
  | 'reset_filters'
  | 'open_product'
  | 'select_product'
  | 'select_variant'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'update_cart_quantity'
  | 'toggle_wishlist'
  | 'open_cart'
  | 'close_cart'
  | 'compare_products'
  | 'request_confirmation'
  | 'clear_cart'
  | 'open_whatsapp_order';

export type PendingConfirmedAction =
  | { type: 'clear_cart' }
  | { type: 'open_whatsapp_order'; productId?: string; size?: string; quantity?: number };

export interface AssistantShopFilterCommand {
  searchQuery?: string;
  category?: MainCategory | 'All';
  subcategory?: Subcategory | 'All';
  collection?: JewelleryCollection | 'All';
  onlyNewArrivals?: boolean;
  priceRange?: ShopPriceRangeKey;
  minPricePkr?: number;
  maxPricePkr?: number;
  sortBy?: ShopSortKey;
}

export interface AssistantResponsePayload {
  reply: string;
  spokenSummary: string;
  detectedLanguage: AssistantLanguageCode;
  actionType: AssistantActionType;
  navigateTo?: 'home' | 'shop' | 'wishlist' | 'about' | 'contact';
  shopFilter?: AssistantShopFilterCommand;
  targetProductId?: string;
  selectedSize?: string;
  selectedFinish?: MetalFinishKey;
  quantity?: number;
  compareProductIds?: string[];
  displayProductIds?: string[];
  businessCards?: BusinessRecommendationCard[];
  requiresConfirmation?: boolean;
  pendingActionType?: 'clear_cart' | 'open_whatsapp_order';
  wishlistOperation?: 'add' | 'remove' | 'toggle';
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  detectedLanguage?: AssistantLanguageCode;
  productIds?: string[];
  compareProductIds?: string[];
  businessCards?: BusinessRecommendationCard[];
  actionBadge?: string;
  pendingConfirmation?: PendingConfirmedAction;
  confirmationHandled?: boolean;
  isError?: boolean;
}

