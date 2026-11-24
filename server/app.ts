import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  COLLECTIONS,
  SUBCATEGORIES,
  type JewelleryProduct,
  type MainCategory,
} from '../src/data/products.ts';
import { STORE_CONFIG } from '../src/config/storeConfig.ts';
import type {
  AdminProductCostEntry,
  AssistantActionType,
  AssistantLanguageCode,
  AssistantResponsePayload,
  BusinessRecommendationCard,
  MetalFinishKey,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PendingConfirmedAction,
  ReviewStatus,
  ShopPriceRangeKey,
  ShopSortKey,
} from '../src/types/assistant.ts';
import {
  UPLOADS_DIR,
  appendActivityLog,
  applyProductOrCategoryDiscount,
  createCategory,
  createCoupon,
  createCustomer,
  createProduct,
  createReview,
  createShippingZone,
  deleteCategory,
  deleteCoupon,
  deleteCustomer,
  deleteOrder,
  deleteProduct,
  deleteReview,
  deleteShippingZone,
  getAllNotifications,
  getCatalogCategories,
  getCatalogProductById,
  getCatalogProducts,
  getCoupons,
  getCustomersWithMetrics,
  getDashboardSummary,
  getOrders,
  getReviews,
  getShippingZones,
  getWebsiteSettings,
  markNotificationsRead,
  recordCustomerOrder,
  restoreWorkspaceState,
  saveUploadedImage,
  updateCategory,
  updateCoupon,
  updateCustomer,
  updateOrderDetails,
  updateProduct,
  updateProductInventory,
  updateReviewStatus,
  updateShippingZone,
  updateWebsiteSettings,
  validateCouponCode,
} from './store.ts';
import {
  changeStoredAdminPassword,
  checkLoginRateLimit,
  claimInitialAdminAccount,
  clearFailedLoginAttempts,
  createAdminSession,
  destroyAdminSession,
  dispatchWhatsAppLoginAlert,
  getAdminAuthConfigStatus,
  getAdminProfileSummary,
  getAuthenticatedAdminSession,
  isAdminSetupRequired,
  recordFailedLoginAttempt,
  requireAdminAuth,
  requireCsrfCheck,
  setNoStoreHeaders,
  verifyAdminCredentials,
} from './adminAuth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function buildCatalogForPrompt(products: JewelleryProduct[]) {
  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    categories: p.categories,
    subcategory: p.subcategory || null,
    collection: p.collection,
    pricePkr: p.pricePkr,
    compareAtPricePkr: p.compareAtPricePkr || null,
    discountPct:
      p.compareAtPricePkr && p.compareAtPricePkr > p.pricePkr
        ? Math.round(((p.compareAtPricePkr - p.pricePkr) / p.compareAtPricePkr) * 100)
        : 0,
    rating: p.rating,
    reviewCount: p.reviewCount,
    popularityScore: p.popularityScore,
    material: p.material,
    weightGrams: p.weightGrams,
    gemstones: p.gemstones,
    availableSizes: p.availableSizes,
    shortDescription: p.shortDescription,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    inStock: p.inStock,
  }));
}

const LANGUAGE_NAME_MAP: Record<AssistantLanguageCode, string> = {
  auto: 'Auto-Detect (Match User Language)',
  en: 'English',
  ur: 'Urdu (اردو script)',
  'roman-ur': 'Roman Urdu (Urdu written in Latin script, e.g., "Ji bilkul, yeh rahi 22K gold rings")',
  hi: 'Hindi (हिन्दी script)',
  ar: 'Arabic (العربية)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  zh: 'Chinese (中文)',
};

const VALID_LANGUAGES = new Set<AssistantLanguageCode>([
  'auto',
  'en',
  'ur',
  'roman-ur',
  'hi',
  'ar',
  'fr',
  'es',
  'zh',
]);

const VALID_FINISHES = new Set<MetalFinishKey>([
  'champagne-gold',
  'white-gold',
  'sterling-silver',
  'rose-gold',
]);

// Small bounded in-memory TTS cache to make repeated phrases instant
const ttsCache = new Map<string, string>();
const MAX_TTS_CACHE = 40;

function getGeminiApiKey(): string | null {
  let apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (
    apiKey.length >= 2 &&
    ((apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'")))
  ) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  if (!apiKey || /^(my_gemini_|mypi_key|your_gemini_|replace_with_)/i.test(apiKey)) {
    return null;
  }
  return apiKey;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(selectedLanguage: AssistantLanguageCode, adminAuthorized: boolean): string {
  const langRule =
    selectedLanguage === 'auto'
      ? `LANGUAGE RULE (CRITICAL):
- Automatically detect the exact language & script of the CURRENT USER MESSAGE:
  * If written in Roman Urdu (e.g., "Mujhe gold ring dikhao", "Rs. 5000 ke andar", "In mein se best konsa hai", "shukriya", "kya haal hai"), reply strictly in natural, polite **Roman Urdu** and set detectedLanguage = "roman-ur".
  * If written in Urdu Perso-Arabic script (اردو), reply in **Urdu script** and set detectedLanguage = "ur".
  * If written in Hindi Devanagari script (हिन्दी), reply in **Hindi** and set detectedLanguage = "hi".
  * If written in Arabic, French, Spanish, Chinese, or English, reply strictly in that matching language and set detectedLanguage accordingly ("ar" | "fr" | "es" | "zh" | "en").
  * If the message is a mixed-language query (e.g. "Mujhe gold rings under 150k dikhao"), match the primary conversational language (Roman Urdu) consistently and never randomly switch languages mid-conversation.
  * If the user says a short continuation ("yes", "second one", "aur dikhao"), preserve context.conversationLanguage unless they explicitly switched languages.`
      : `LANGUAGE RULE (CRITICAL):
- The user has manually selected: **${LANGUAGE_NAME_MAP[selectedLanguage]}**.
- You MUST write both "reply" and "spokenSummary" strictly in **${LANGUAGE_NAME_MAP[selectedLanguage]}** and set detectedLanguage = "${selectedLanguage}". Never randomly switch to another language.`;

  const adminRule = adminAuthorized
    ? `BUSINESS ADVISOR & PROFIT CALCULATOR MODE (AUTHORIZED ADMIN):
- The user is an authorized store administrator. Context includes "adminCostData" (only the real purchase costs, shipping/tax expenses, and unit sales the admin has entered).
- Profit Formula:
  Profit = Selling Price (pricePkr) - Purchase Cost (purchaseCostPkr) - Extra Expenses (extraExpensesPkr, default 0 if not provided)
  Profit Margin = (Profit / Selling Price) * 100
- STRICT INTEGRITY RULES:
  * NEVER invent or guess purchase costs or sales figures!
  * If purchase costs are missing for requested products (or all products), honestly ask the admin to enter their Purchase Cost in the Business Advisor calculator tab and DO NOT fabricate profit figures for unpriced items.
  * Clearly distinguish **Estimated Gross Profit** (per unit based on selling price minus entered cost) from **Actual Realized Profit** (only when unitsSold is provided by the admin).
  * Include discounts, shipping/taxes/expenses when available.
  * Never guarantee future profits; phrase guidance as data-based estimates and recommendations.
  * When profit data exists for relevant pieces, return up to 4 "businessCards" sorted appropriately so visual Profit Cards render inside the chat.`
    : `BUSINESS DATA PRIVACY RULE:
- The user is NOT authorized as an admin (adminAuthorized = false).
- Never reveal or fabricate wholesale purchase costs, profit margins, or private sales figures. If asked about business profit calculations, profit margins, or best-selling internal margins, politely state that wholesale cost & profit analytics are private to authenticated store administrators.`;

  const liveProducts = getCatalogProducts();
  const liveCategoryNames = getCatalogCategories().map((c) => c.category);
  const catalogForPrompt = buildCatalogForPrompt(liveProducts);

  return `You are "Noor", the intelligent multilingual AI Jewellery Concierge & Store Advisor for ${STORE_CONFIG.brandName} (${STORE_CONFIG.tagline}).
All prices are in Pakistani Rupees (PKR, formatted as "Rs. X").
Complimentary insured courier delivery applies above Rs. ${STORE_CONFIG.freeDeliveryThresholdPkr.toLocaleString('en-PK')}; otherwise Rs. ${STORE_CONFIG.standardDeliveryFeePkr}.
Boutiques: Lahore Flagship (Gulberg III) and Karachi Salon (Clifton).

${langRule}

${adminRule}

OFFICIAL CATALOG (ONLY SOURCE OF TRUTH — NEVER INVENT PRODUCTS, PRICES, STOCK, OR SIZES):
${JSON.stringify(catalogForPrompt)}

VALID MAIN CATEGORIES: ${JSON.stringify(liveCategoryNames)}
VALID SUBCATEGORIES: ${JSON.stringify(SUBCATEGORIES)}
VALID COLLECTIONS: ${JSON.stringify(COLLECTIONS)}

CAPABILITIES & ACTION RULES:
1. Search / Filter / Recommend Jewellery ("Mujhe gold ring dikhao", "Show me expensive necklaces", "Rs. 5,000 ke andar best necklace dikhao", "Mujhe achi jewellery suggest karo"):
   - Set actionType = "filter_shop" when the user wants to browse/filter products, AND always populate "displayProductIds" (up to 6 real matching IDs) so visual product cards with real photos appear directly inside the chat.
   - For recommendations ("best", "acha", "suggest"), analyze actual pricePkr, material, gemstones, rating, reviewCount, popularityScore, and inStock status. Explain clearly WHY each recommended piece fits.
   - If NO product matches a strict budget (e.g. under Rs. 5,000 when the lowest-priced piece is Verona 925 Sterling Hoops & Link Set at Rs. 24,500), NEVER invent a Rs. 5,000 product: honestly state in the user's language that no piece is under that amount, state the lowest real price (Rs. 24,500), and optionally show our closest affordable options in displayProductIds!
   - When refining a previous search (e.g., first "Show me gold rings", then "under Rs. 150,000"), combine the previous context/category with the new constraint!

2. Open / Inspect Product ("Open this necklace", "Open the second one", "Ayra ring dikhao"):
   - Resolve ordinals ("first", "second", "pehli", "doosri") using context.lastDisplayedProductIds or context.activeProductId.
   - Set actionType = "open_product", targetProductId = exact product ID, and displayProductIds = [targetProductId].

3. Select Product or Size / Finish Variation ("Select size 14", "White gold finish select karo"):
   - Set actionType = "select_variant" (or "select_product"), targetProductId, selectedSize (from availableSizes), and optional selectedFinish ("champagne-gold" | "white-gold" | "sterling-silver" | "rose-gold").

4. Cart & Wishlist Control ("Add the second one to cart", "Add this to bag", "Open my wishlist", "Show my cart"):
   - If adding to cart and target product has inStock === false (e.g., za-012 Firdous Full Bridal Polki Suite), DO NOT claim it was added. Set actionType = "select_product", displayProductIds = [product.id], and explain honestly that it is made to order and available via WhatsApp commission.
   - If inStock === true, set actionType = "add_to_cart", targetProductId, selectedSize, quantity (default 1).
   - "Open my wishlist" -> actionType = "navigate", navigateTo = "wishlist".
   - "Show my shopping cart" -> actionType = "open_cart".
   - "Save to wishlist" / "Remove from wishlist" -> actionType = "toggle_wishlist", targetProductId, wishlistOperation = "add" | "remove" | "toggle".

5. Compare Products ("Which one is better?", "In mein se best konsa hai?", "Compare these two"):
   - Pick the 2 relevant IDs (from named products, or top 2 in context.lastDisplayedProductIds, or activeProductId + peer).
   - Set actionType = "compare_products" and compareProductIds = [id1, id2]. Give a clear, objective comparison based on real price, material, gemstones, weight, rating, and stock.

6. Irreversible Actions ("Clear my cart", "Order on WhatsApp"):
   - Unless context.pendingConfirmation is active and user confirms ("yes", "confirm", "haan", "kar dein"), set actionType = "request_confirmation", requiresConfirmation = true, pendingActionType = "clear_cart" | "open_whatsapp_order".
   - If pendingConfirmation is active and user confirms, emit actionType = "clear_cart" or "open_whatsapp_order".

7. Natural Spoken Output:
   - Keep "reply" concise (1–4 clear sentences), warm, and directly helpful.
   - Keep "spokenSummary" clean plain speech in the EXACT SAME language as "reply", without markdown symbols (*, #, **).`;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'Concise concierge response in the exact detected or selected language.',
    },
    spokenSummary: {
      type: Type.STRING,
      description: 'Natural plain-spoken summary in the exact same language for text-to-speech.',
    },
    detectedLanguage: {
      type: Type.STRING,
      description: 'One of: en | ur | roman-ur | hi | ar | fr | es | zh',
    },
    actionType: {
      type: Type.STRING,
      description:
        'none | navigate | filter_shop | reset_filters | open_product | select_product | select_variant | add_to_cart | remove_from_cart | update_cart_quantity | toggle_wishlist | open_cart | close_cart | compare_products | request_confirmation | clear_cart | open_whatsapp_order',
    },
    navigateTo: { type: Type.STRING },
    shopFilter: {
      type: Type.OBJECT,
      properties: {
        searchQuery: { type: Type.STRING },
        category: { type: Type.STRING },
        subcategory: { type: Type.STRING },
        collection: { type: Type.STRING },
        onlyNewArrivals: { type: Type.BOOLEAN },
        priceRange: { type: Type.STRING },
        minPricePkr: { type: Type.NUMBER },
        maxPricePkr: { type: Type.NUMBER },
        sortBy: { type: Type.STRING },
      },
    },
    targetProductId: { type: Type.STRING },
    selectedSize: { type: Type.STRING },
    selectedFinish: { type: Type.STRING },
    quantity: { type: Type.NUMBER },
    compareProductIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    displayProductIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    businessCards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          productId: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ['productId', 'recommendation'],
      },
    },
    requiresConfirmation: { type: Type.BOOLEAN },
    pendingActionType: { type: Type.STRING },
    wishlistOperation: { type: Type.STRING },
  },
  required: ['reply', 'spokenSummary', 'detectedLanguage', 'actionType'],
};

const VALID_ACTIONS = new Set<AssistantActionType>([
  'none',
  'navigate',
  'filter_shop',
  'reset_filters',
  'open_product',
  'select_product',
  'select_variant',
  'add_to_cart',
  'remove_from_cart',
  'update_cart_quantity',
  'toggle_wishlist',
  'open_cart',
  'close_cart',
  'compare_products',
  'request_confirmation',
  'clear_cart',
  'open_whatsapp_order',
]);

const VALID_PRICE_RANGES = new Set<ShopPriceRangeKey>([
  'all',
  'under-50k',
  '50k-150k',
  '150k-250k',
  'above-250k',
  'custom',
]);

const VALID_SORTS = new Set<ShopSortKey>([
  'featured',
  'newest',
  'popular',
  'price-asc',
  'price-desc',
]);

function sanitizePayload(
  raw: Record<string, unknown>,
  selectedLanguage: AssistantLanguageCode,
  adminAuthorized: boolean,
  adminCostMap: Map<string, AdminProductCostEntry>
): AssistantResponsePayload {
  const actionCandidate = String(raw.actionType || 'none') as AssistantActionType;
  const actionType: AssistantActionType = VALID_ACTIONS.has(actionCandidate)
    ? actionCandidate
    : 'none';

  const rawLang = String(raw.detectedLanguage || 'en') as AssistantLanguageCode;
  const detectedLanguage: AssistantLanguageCode =
    selectedLanguage !== 'auto'
      ? selectedLanguage
      : VALID_LANGUAGES.has(rawLang) && rawLang !== 'auto'
      ? rawLang
      : 'en';

  const validId = (id: unknown): string | undefined => {
    if (typeof id !== 'string') return undefined;
    return getCatalogProductById(id) ? id : undefined;
  };

  const uniqueValidIds = (arr: unknown, limit: number): string[] | undefined => {
    if (!Array.isArray(arr)) return undefined;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of arr) {
      const id = validId(entry);
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
      }
    }
    return out.length > 0 ? out : undefined;
  };

  const targetProductId = validId(raw.targetProductId);
  const targetProduct = targetProductId ? getCatalogProductById(targetProductId) : undefined;

  let selectedSize = typeof raw.selectedSize === 'string' ? raw.selectedSize.trim() : undefined;
  if (selectedSize && targetProduct && !targetProduct.availableSizes.includes(selectedSize)) {
    const fuzzy = targetProduct.availableSizes.find(
      (s) =>
        s.toLowerCase() === selectedSize!.toLowerCase() ||
        s.toLowerCase().includes(selectedSize!.toLowerCase())
    );
    selectedSize = fuzzy;
  }

  const selectedFinish =
    typeof raw.selectedFinish === 'string' && VALID_FINISHES.has(raw.selectedFinish as MetalFinishKey)
      ? (raw.selectedFinish as MetalFinishKey)
      : undefined;

  const liveCategories = getCatalogCategories().map((c) => c.category);
  let shopFilter: AssistantResponsePayload['shopFilter'];
  if (raw.shopFilter && typeof raw.shopFilter === 'object') {
    const sf = raw.shopFilter as Record<string, unknown>;
    const cat =
      sf.category === 'All' ||
      (typeof sf.category === 'string' && liveCategories.includes(sf.category))
        ? (sf.category as MainCategory | 'All')
        : undefined;
    const sub =
      sf.subcategory === 'All' || SUBCATEGORIES.includes(sf.subcategory as (typeof SUBCATEGORIES)[number])
        ? (sf.subcategory as (typeof SUBCATEGORIES)[number] | 'All')
        : undefined;
    const col =
      sf.collection === 'All' || COLLECTIONS.includes(sf.collection as (typeof COLLECTIONS)[number])
        ? (sf.collection as (typeof COLLECTIONS)[number] | 'All')
        : undefined;
    const pr = VALID_PRICE_RANGES.has(sf.priceRange as ShopPriceRangeKey)
      ? (sf.priceRange as ShopPriceRangeKey)
      : undefined;
    const sortBy = VALID_SORTS.has(sf.sortBy as ShopSortKey)
      ? (sf.sortBy as ShopSortKey)
      : undefined;

    shopFilter = {
      searchQuery: typeof sf.searchQuery === 'string' ? sf.searchQuery : undefined,
      category: cat,
      subcategory: sub,
      collection: col,
      onlyNewArrivals: typeof sf.onlyNewArrivals === 'boolean' ? sf.onlyNewArrivals : undefined,
      priceRange: pr,
      minPricePkr: typeof sf.minPricePkr === 'number' && Number.isFinite(sf.minPricePkr) ? sf.minPricePkr : undefined,
      maxPricePkr: typeof sf.maxPricePkr === 'number' && Number.isFinite(sf.maxPricePkr) ? sf.maxPricePkr : undefined,
      sortBy,
    };
  }

  const navCandidate = typeof raw.navigateTo === 'string' ? raw.navigateTo : undefined;
  const navigateTo =
    navCandidate === 'home' ||
    navCandidate === 'shop' ||
    navCandidate === 'wishlist' ||
    navCandidate === 'about' ||
    navCandidate === 'contact'
      ? navCandidate
      : undefined;

  const pendingActionType =
    raw.pendingActionType === 'clear_cart' || raw.pendingActionType === 'open_whatsapp_order'
      ? raw.pendingActionType
      : undefined;

  const wishlistOperation =
    raw.wishlistOperation === 'add' ||
    raw.wishlistOperation === 'remove' ||
    raw.wishlistOperation === 'toggle'
      ? raw.wishlistOperation
      : undefined;

  // Compute grounded Business Recommendation Cards deterministically on server ONLY when authorized & cost entered
  let businessCards: BusinessRecommendationCard[] | undefined;
  if (adminAuthorized && Array.isArray(raw.businessCards)) {
    const built: BusinessRecommendationCard[] = [];
    for (const item of raw.businessCards.slice(0, 4)) {
      if (!item || typeof item !== 'object') continue;
      const recObj = item as { productId?: unknown; recommendation?: unknown };
      const pid = validId(recObj.productId);
      if (!pid) continue;
      const product = getCatalogProductById(pid);
      const costEntry = adminCostMap.get(pid);
      if (!product || !costEntry || typeof costEntry.purchaseCostPkr !== 'number' || costEntry.purchaseCostPkr <= 0) {
        continue;
      }
      const extra = typeof costEntry.extraExpensesPkr === 'number' && costEntry.extraExpensesPkr > 0
        ? costEntry.extraExpensesPkr
        : 0;
      const profit = product.pricePkr - costEntry.purchaseCostPkr - extra;
      const margin = product.pricePkr > 0 ? Number(((profit / product.pricePkr) * 100).toFixed(2)) : 0;
      const unitsSold = typeof costEntry.unitsSold === 'number' && costEntry.unitsSold >= 0 ? costEntry.unitsSold : undefined;

      built.push({
        productId: pid,
        purchaseCostPkr: costEntry.purchaseCostPkr,
        extraExpensesPkr: extra,
        sellingPricePkr: product.pricePkr,
        estimatedProfitPkr: profit,
        profitMarginPct: margin,
        unitsSold,
        actualProfitPkr: typeof unitsSold === 'number' ? profit * unitsSold : undefined,
        recommendation:
          typeof recObj.recommendation === 'string' && recObj.recommendation.trim()
            ? recObj.recommendation.trim()
            : `Estimated margin ${margin.toFixed(2)}% on ${product.name}.`,
      });
    }
    if (built.length > 0) businessCards = built;
  }

  const compareProductIds = uniqueValidIds(raw.compareProductIds, 2);
  const displayProductIds = uniqueValidIds(raw.displayProductIds, 6);

  const reply =
    typeof raw.reply === 'string' && raw.reply.trim()
      ? raw.reply.trim()
      : 'How may I assist you with Zaveri Atelier pieces today?';

  const spokenSummary =
    typeof raw.spokenSummary === 'string' && raw.spokenSummary.trim()
      ? raw.spokenSummary.trim()
      : reply.replace(/Rs\./g, 'rupees');

  return {
    reply,
    spokenSummary,
    detectedLanguage,
    actionType,
    navigateTo,
    shopFilter,
    targetProductId,
    selectedSize,
    selectedFinish,
    quantity:
      typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) && raw.quantity >= 1
        ? Math.min(20, Math.floor(raw.quantity))
        : undefined,
    compareProductIds,
    displayProductIds,
    businessCards,
    requiresConfirmation: Boolean(raw.requiresConfirmation),
    pendingActionType,
    wishlistOperation,
  };
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 0;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        status === 429 ||
        status === 502 ||
        status === 503 ||
        /RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|ECONNRESET|ETIMEDOUT/i.test(msg);

      if (attempt < maxRetries && isTransient) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

function handleGeminiError(res: express.Response, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status)
      : 500;

  if (
    status === 401 ||
    status === 403 ||
    /PERMISSION_DENIED|API_KEY_INVALID|API key not valid/i.test(msg)
  ) {
    res.status(status === 401 ? 401 : 403).json({
      error:
        'Gemini API key permission denied or invalid. Check GEMINI_API_KEY in Settings > Secrets or Vercel Environment Variables and redeploy.',
    });
    return;
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    res.status(429).json({
      error: 'Assistant rate limit reached. Please wait a moment and try again.',
    });
    return;
  }
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(msg)) {
    res.status(503).json({
      error: 'Gemini AI is momentarily busy (503). Please try sending your message again.',
    });
    return;
  }
  if (status === 404 || /NOT_FOUND/i.test(msg)) {
    res.status(404).json({
      error: 'Requested AI model could not be reached. Please verify server configuration.',
    });
    return;
  }
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: msg || 'Failed to contact the AI service.',
  });
}

interface AssistantRequestBody {
  message?: string;
  selectedLanguage?: AssistantLanguageCode;
  conversationLanguage?: AssistantLanguageCode;
  adminAuthorized?: boolean;
  adminCosts?: AdminProductCostEntry[];
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  context?: {
    currentPage?: string;
    activeProductId?: string | null;
    lastDisplayedProductIds?: string[];
    wishlistIds?: string[];
    cart?: Array<{ productId: string; name: string; size: string; quantity: number; pricePkr: number }>;
    shopFilters?: Record<string, unknown>;
    pendingConfirmation?: PendingConfirmedAction | null;
  };
}

export async function createApiApp() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      brand: STORE_CONFIG.brandName,
      geminiConfigured: Boolean(getGeminiApiKey()),
    });
  });

  // Public Storefront Catalog & Non-Sensitive Storefront Settings (read-only)
  app.get('/api/catalog', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      products: getCatalogProducts(),
      categories: getCatalogCategories(),
      settings: getWebsiteSettings(),
    });
  });

  app.get('/api/storefront-settings', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      settings: getWebsiteSettings(),
      shippingZones: getShippingZones().filter((z) => z.active),
    });
  });

  // Public Coupon Validation (single-code validation only; never lists coupons publicly)
  app.post('/api/coupons/validate', requireCsrfCheck, (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    const subtotalPkr = Number(req.body?.subtotalPkr) || 0;
    const result = validateCouponCode(code, subtotalPkr);
    if (!result.valid || !result.coupon) {
      res.status(400).json({ valid: false, discountPkr: 0, error: result.error });
      return;
    }
    res.json({
      valid: true,
      code: result.coupon.code,
      discountPkr: result.discountPkr,
      description: result.coupon.description,
    });
  });

  // Public Order Intent Logging (write-only; never exposes existing orders publicly)
  app.post('/api/orders', requireCsrfCheck, (req, res) => {
    const body = req.body || {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      res.status(400).json({ error: 'Order items are required.' });
      return;
    }
    const order = recordCustomerOrder({
      id: typeof body.id === 'string' ? body.id : undefined,
      type: body.type === 'cart' ? 'cart' : 'single',
      customerName: typeof body.customerName === 'string' ? body.customerName : undefined,
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone : undefined,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
      deliveryAddress: typeof body.deliveryAddress === 'string' ? body.deliveryAddress : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
      paymentMethod: typeof body.paymentMethod === 'string' ? (body.paymentMethod as PaymentMethod) : undefined,
      couponCode: typeof body.couponCode === 'string' ? body.couponCode : undefined,
      shippingPkr: typeof body.shippingPkr === 'number' ? body.shippingPkr : undefined,
      items: rawItems,
      totalPkr: Number(body.totalPkr) || 0,
      customerNote: typeof body.customerNote === 'string' ? body.customerNote : undefined,
    });
    res.status(201).json({ ok: true, orderId: order.id });
  });

  // Admin Session Check
  app.get('/api/admin/session', (req, res) => {
    setNoStoreHeaders(res);
    const session = getAuthenticatedAdminSession(req);
    const setupRequired = isAdminSetupRequired();
    const configStatus = getAdminAuthConfigStatus();
    if (!session) {
      res.json({
        authenticated: false,
        setupRequired,
        ...(configStatus.configError ? { configError: configStatus.configError } : {}),
      });
      return;
    }
    res.json({
      authenticated: true,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
      setupRequired: false,
    });
  });

  // One-time Initial Owner Setup (only active when no ADMIN_EMAIL/ADMIN_PASSWORD or stored credential exists)
  app.post('/api/admin/setup', requireCsrfCheck, (req, res) => {
    setNoStoreHeaders(res);
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const result = claimInitialAdminAccount(email, password);
    if (!result.ok || !result.email) {
      res.status(result.error?.includes('already configured') ? 403 : 400).json({
        ok: false,
        error: result.error || 'Unable to configure administrator credentials.',
      });
      return;
    }
    const session = createAdminSession(result.email, req, res);
    const logEntry = appendActivityLog({
      type: 'setup',
      actorEmail: result.email,
      summary: `Initial administrator account claimed for ${result.email}`,
    });
    void dispatchWhatsAppLoginAlert({
      activityLogId: logEntry.id,
      email: result.email,
      status: 'Successful',
      timestampIso: logEntry.timestamp,
    });
    res.json({
      ok: true,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  // Admin Login + WhatsApp Security Notification
  app.post('/api/admin/login', requireCsrfCheck, (req, res) => {
    setNoStoreHeaders(res);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const configStatus = getAdminAuthConfigStatus();
    if (configStatus.configError) {
      console.error(`[AdminAuth] Configuration error: ${configStatus.configError}`);
      res.status(500).json({
        ok: false,
        error: configStatus.configError,
      });
      return;
    }

    if (isAdminSetupRequired()) {
      res.status(409).json({
        ok: false,
        setupRequired: true,
        error: 'Initial administrator account setup is required before logging in.',
      });
      return;
    }

    const rate = checkLoginRateLimit(req, email);
    if (!rate.allowed) {
      const logEntry = appendActivityLog({
        type: 'login_failed',
        actorEmail: email || '(unknown)',
        summary: `Rate-limited login attempt for ${email || '(empty email)'}`,
      });
      void dispatchWhatsAppLoginAlert({
        activityLogId: logEntry.id,
        email: email || '(empty)',
        status: 'Failed Login Attempt',
        timestampIso: logEntry.timestamp,
      });
      res.status(429).json({
        ok: false,
        error: `Too many failed login attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
      });
      return;
    }

    const verified = verifyAdminCredentials(email, password);
    const nowIso = new Date().toISOString();

    if (!verified.ok) {
      console.warn(
        `[AdminAuth] Login rejected (${verified.reason || 'mismatch'}, source=${configStatus.source})`
      );
      recordFailedLoginAttempt(req, email);
      const logEntry = appendActivityLog({
        type: 'login_failed',
        actorEmail: email || '(empty)',
        timestamp: nowIso,
        summary: `Failed login attempt for ${email || '(empty email)'}`,
      });
      // Notify asynchronously so login response remains fast while alert is dispatched cleanly
      void dispatchWhatsAppLoginAlert({
        activityLogId: logEntry.id,
        email: email || '(empty)',
        status: 'Failed Login Attempt',
        timestampIso: nowIso,
      });
      res.status(401).json({
        ok: false,
        error: 'Invalid administrator email or password.',
      });
      return;
    }

    clearFailedLoginAttempts(req, email);
    const session = createAdminSession(verified.normalizedEmail, req, res);
    const logEntry = appendActivityLog({
      type: 'login_success',
      actorEmail: session.email,
      timestamp: nowIso,
      summary: `Successful admin login for ${session.email}`,
    });
    void dispatchWhatsAppLoginAlert({
      activityLogId: logEntry.id,
      email: session.email,
      status: 'Successful',
      timestampIso: nowIso,
    });

    res.json({
      ok: true,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  app.post('/api/admin/logout', requireCsrfCheck, (req, res) => {
    setNoStoreHeaders(res);
    const email = destroyAdminSession(req, res);
    if (email) {
      appendActivityLog({
        type: 'logout',
        actorEmail: email,
        summary: `Administrator logged out (${email})`,
      });
    }
    res.json({ ok: true });
  });

  // Protected Comprehensive Admin Dashboard
  app.get('/api/admin/dashboard', requireAdminAuth, (req, res) => {
    const session = (
      req as express.Request & {
        adminSession: { email: string; createdAt: number; expiresAt: number };
      }
    ).adminSession;
    const profile = getAdminProfileSummary(session);
    res.json(getDashboardSummary(profile));
  });

  // Protected Product CRUD
  app.get('/api/admin/products', requireAdminAuth, (_req, res) => {
    res.json({ products: getCatalogProducts() });
  });

  app.post('/api/admin/products', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createProduct(req.body || {}, admin?.email || 'admin');
      res.status(201).json({
        product: created,
        products: getCatalogProducts(),
        categories: getCatalogCategories(),
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid product payload.' });
    }
  });

  app.put('/api/admin/products/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const updated = updateProduct(req.params.id, req.body || {}, admin?.email || 'admin');
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({
        product: updated,
        products: getCatalogProducts(),
        categories: getCatalogCategories(),
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid product update.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const deleted = deleteProduct(req.params.id, admin?.email || 'admin');
    if (!deleted) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({
      ok: true,
      products: getCatalogProducts(),
      categories: getCatalogCategories(),
    });
  });

  // Protected Category CRUD
  app.get('/api/admin/categories', requireAdminAuth, (_req, res) => {
    res.json({ categories: getCatalogCategories() });
  });

  app.post('/api/admin/categories', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createCategory(req.body || {}, admin?.email || 'admin');
      res.status(201).json({
        category: created,
        categories: getCatalogCategories(),
        products: getCatalogProducts(),
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid category payload.' });
    }
  });

  app.put('/api/admin/categories/:name', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const currentName = decodeURIComponent(req.params.name);
      const updated = updateCategory(currentName, req.body || {}, admin?.email || 'admin');
      if (!updated) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.json({
        category: updated,
        categories: getCatalogCategories(),
        products: getCatalogProducts(),
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid category update.' });
    }
  });

  app.delete('/api/admin/categories/:name', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const targetName = decodeURIComponent(req.params.name);
    const deleted = deleteCategory(targetName, admin?.email || 'admin');
    if (!deleted) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    res.json({
      ok: true,
      categories: getCatalogCategories(),
      products: getCatalogProducts(),
    });
  });

  // Protected Complete Order Management
  app.get('/api/admin/orders', requireAdminAuth, (_req, res) => {
    res.json({ orders: getOrders() });
  });

  app.post('/api/admin/orders', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const body = req.body || {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      res.status(400).json({ error: 'At least one order item is required.' });
      return;
    }
    const created = recordCustomerOrder({
      id: typeof body.id === 'string' ? body.id : undefined,
      type: 'manual',
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      deliveryAddress: body.deliveryAddress,
      city: body.city,
      paymentMethod: body.paymentMethod as PaymentMethod | undefined,
      paymentStatus: body.paymentStatus as PaymentStatus | undefined,
      status: body.status as OrderStatus | undefined,
      couponCode: body.couponCode,
      shippingPkr: typeof body.shippingPkr === 'number' ? body.shippingPkr : undefined,
      items: rawItems,
      totalPkr: typeof body.totalPkr === 'number' ? body.totalPkr : undefined,
      customerNote: body.customerNote,
      internalNotes: body.internalNotes,
      actorEmail: admin?.email || 'admin',
    });
    res.status(201).json({
      order: created,
      orders: getOrders(),
      customers: getCustomersWithMetrics(),
      products: getCatalogProducts(),
    });
  });

  app.patch('/api/admin/orders/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const body = req.body || {};
    const updated = updateOrderDetails(
      req.params.id,
      {
        status: typeof body.status === 'string' ? (body.status as OrderStatus) : undefined,
        paymentStatus:
          typeof body.paymentStatus === 'string'
            ? (body.paymentStatus as PaymentStatus)
            : undefined,
        paymentMethod:
          typeof body.paymentMethod === 'string'
            ? (body.paymentMethod as PaymentMethod)
            : undefined,
        courierName: typeof body.courierName === 'string' ? body.courierName : undefined,
        trackingNumber: typeof body.trackingNumber === 'string' ? body.trackingNumber : undefined,
        internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes : undefined,
        deliveryAddress: typeof body.deliveryAddress === 'string' ? body.deliveryAddress : undefined,
        city: typeof body.city === 'string' ? body.city : undefined,
      },
      admin?.email || 'admin'
    );
    if (!updated) {
      res.status(400).json({ error: 'Order not found or invalid status update.' });
      return;
    }
    res.json({ order: updated, orders: getOrders() });
  });

  app.delete('/api/admin/orders/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const ok = deleteOrder(req.params.id, admin?.email || 'admin');
    if (!ok) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ ok: true, orders: getOrders() });
  });

  // Protected Customers CRUD
  app.get('/api/admin/customers', requireAdminAuth, (_req, res) => {
    res.json({ customers: getCustomersWithMetrics() });
  });

  app.post('/api/admin/customers', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createCustomer(req.body || {}, admin?.email || 'admin');
      res.status(201).json({ customer: created, customers: getCustomersWithMetrics() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid customer data.' });
    }
  });

  app.put('/api/admin/customers/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const updated = updateCustomer(req.params.id, req.body || {}, admin?.email || 'admin');
      if (!updated) {
        res.status(404).json({ error: 'Customer not found.' });
        return;
      }
      res.json({ customer: updated, customers: getCustomersWithMetrics() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid customer update.' });
    }
  });

  app.delete('/api/admin/customers/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const ok = deleteCustomer(req.params.id, admin?.email || 'admin');
    if (!ok) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    res.json({ ok: true, customers: getCustomersWithMetrics() });
  });

  // Protected Inventory Management
  app.patch('/api/admin/inventory/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const updated = updateProductInventory(
      req.params.id,
      {
        stockQuantity: Number(req.body?.stockQuantity ?? 0),
        lowStockThreshold:
          typeof req.body?.lowStockThreshold === 'number'
            ? req.body.lowStockThreshold
            : undefined,
        inStock: typeof req.body?.inStock === 'boolean' ? req.body.inStock : undefined,
      },
      admin?.email || 'admin'
    );
    if (!updated) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product: updated, products: getCatalogProducts() });
  });

  // Protected Discounts & Offers
  app.post('/api/admin/discounts/apply', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const scope = req.body?.scope === 'category' ? 'category' : 'product';
      const target = String(req.body?.target || '');
      const discountPercent = Number(req.body?.discountPercent || 0);
      const products = applyProductOrCategoryDiscount(
        { scope, target, discountPercent },
        admin?.email || 'admin'
      );
      res.json({ ok: true, products });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to apply discount.' });
    }
  });

  // Protected Coupons CRUD
  app.get('/api/admin/coupons', requireAdminAuth, (_req, res) => {
    res.json({ coupons: getCoupons() });
  });

  app.post('/api/admin/coupons', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createCoupon(req.body || {}, admin?.email || 'admin');
      res.status(201).json({ coupon: created, coupons: getCoupons() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid coupon payload.' });
    }
  });

  app.put('/api/admin/coupons/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const updated = updateCoupon(req.params.id, req.body || {}, admin?.email || 'admin');
      if (!updated) {
        res.status(404).json({ error: 'Coupon not found.' });
        return;
      }
      res.json({ coupon: updated, coupons: getCoupons() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid coupon update.' });
    }
  });

  app.delete('/api/admin/coupons/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const ok = deleteCoupon(req.params.id, admin?.email || 'admin');
    if (!ok) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    res.json({ ok: true, coupons: getCoupons() });
  });

  // Protected Reviews & Ratings
  app.get('/api/admin/reviews', requireAdminAuth, (_req, res) => {
    res.json({ reviews: getReviews() });
  });

  app.post('/api/admin/reviews', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createReview(req.body || {}, admin?.email || 'admin');
      res.status(201).json({ review: created, reviews: getReviews(), products: getCatalogProducts() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid review payload.' });
    }
  });

  app.patch('/api/admin/reviews/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const status = String(req.body?.status || '') as ReviewStatus;
    const updated = updateReviewStatus(req.params.id, status, admin?.email || 'admin');
    if (!updated) {
      res.status(400).json({ error: 'Review not found or invalid status.' });
      return;
    }
    res.json({ review: updated, reviews: getReviews(), products: getCatalogProducts() });
  });

  app.delete('/api/admin/reviews/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const ok = deleteReview(req.params.id, admin?.email || 'admin');
    if (!ok) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    res.json({ ok: true, reviews: getReviews(), products: getCatalogProducts() });
  });

  // Protected Shipping & Delivery Zones
  app.get('/api/admin/shipping', requireAdminAuth, (_req, res) => {
    res.json({ shippingZones: getShippingZones() });
  });

  app.post('/api/admin/shipping', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    try {
      const created = createShippingZone(req.body || {}, admin?.email || 'admin');
      res.status(201).json({ zone: created, shippingZones: getShippingZones() });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid shipping zone.' });
    }
  });

  app.put('/api/admin/shipping/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const updated = updateShippingZone(req.params.id, req.body || {}, admin?.email || 'admin');
    if (!updated) {
      res.status(404).json({ error: 'Shipping zone not found.' });
      return;
    }
    res.json({ zone: updated, shippingZones: getShippingZones() });
  });

  app.delete('/api/admin/shipping/:id', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const ok = deleteShippingZone(req.params.id, admin?.email || 'admin');
    if (!ok) {
      res.status(404).json({ error: 'Shipping zone not found.' });
      return;
    }
    res.json({ ok: true, shippingZones: getShippingZones() });
  });

  // Protected Notifications
  app.get('/api/admin/notifications', requireAdminAuth, (_req, res) => {
    res.json({ notifications: getAllNotifications() });
  });

  app.post('/api/admin/notifications/read', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const id = typeof req.body?.id === 'string' ? req.body.id : 'all';
    const notifications = markNotificationsRead(id);
    res.json({ notifications });
  });

  // Protected Website Settings
  app.get('/api/admin/settings', requireAdminAuth, (_req, res) => {
    res.json({ settings: getWebsiteSettings() });
  });

  app.put('/api/admin/settings', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const admin = (req as express.Request & { adminSession?: { email: string } }).adminSession;
    const settings = updateWebsiteSettings(req.body || {}, admin?.email || 'admin');
    res.json({ settings });
  });

  // Protected Admin Profile & Password Update
  app.get('/api/admin/profile', requireAdminAuth, (req, res) => {
    const session = (
      req as express.Request & {
        adminSession: { email: string; createdAt: number; expiresAt: number };
      }
    ).adminSession;
    res.json({ profile: getAdminProfileSummary(session) });
  });

  app.post('/api/admin/profile/password', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const session = (
      req as express.Request & {
        adminSession: { email: string; createdAt: number; expiresAt: number };
      }
    ).adminSession;
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const result = changeStoredAdminPassword(session.email, currentPassword, newPassword);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    appendActivityLog({
      type: 'security',
      actorEmail: session.email,
      summary: `Administrator password updated for ${session.email}`,
    });
    res.json({ ok: true });
  });

  // Protected Image Upload (PNG / JPEG / WebP validated by magic bytes)
  app.post('/api/admin/upload', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const imageBase64 = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;
    if (!imageBase64) {
      res.status(400).json({ error: 'No image data provided.' });
      return;
    }
    try {
      const url = saveUploadedImage(imageBase64, mimeType);
      res.status(201).json({ url });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Image upload failed.' });
    }
  });

  // Protected Snapshot Sync / Restore (syncs Chrome LocalStorage / JSON backup cleanly with server)
  app.post('/api/admin/restore', requireAdminAuth, requireCsrfCheck, (req, res) => {
    const session = (
      req as express.Request & {
        adminSession: { email: string; createdAt: number; expiresAt: number };
      }
    ).adminSession;
    const mode = req.body?.mode === 'replace' ? 'replace' : 'merge';
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Invalid restore snapshot payload.' });
      return;
    }
    try {
      restoreWorkspaceState(data, mode, session.email, { silent: Boolean(req.body?.silent) });
      const profile = getAdminProfileSummary(session);
      res.json({
        ok: true,
        dashboard: getDashboardSummary(profile),
        products: getCatalogProducts(),
        categories: getCatalogCategories(),
      });
    } catch (err: unknown) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to restore snapshot.',
      });
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/webm';
    const selectedLanguage = VALID_LANGUAGES.has(req.body?.selectedLanguage)
      ? (req.body.selectedLanguage as AssistantLanguageCode)
      : 'auto';

    if (!audioBase64) {
      res.status(400).json({ error: 'No audio recording was received.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const languageHint =
      selectedLanguage === 'auto'
        ? 'The speaker may speak English, Urdu, Roman Urdu, Hindi, Arabic, French, Spanish, Chinese, or mixed Urdu/English jewellery terms (e.g., Polki, Kundan, Jhumka, Kara, Rs.). Transcribe faithfully in the natural language spoken (use Roman Urdu Latin letters if conversational Urdu+English mixed speech, or Urdu/Hindi/Arabic/Chinese script if purely spoken in that language). Return ONLY the transcribed words, no extra commentary.'
        : `The speaker selected ${LANGUAGE_NAME_MAP[selectedLanguage]}. Transcribe accurately in ${LANGUAGE_NAME_MAP[selectedLanguage]}. Return ONLY the transcribed text, no extra commentary.`;

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType.split(';')[0] || 'audio/webm',
                  data: audioBase64,
                },
              },
              { text: languageHint },
            ],
          },
        })
      );

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (err: unknown) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/tts', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language = VALID_LANGUAGES.has(req.body?.language)
      ? (req.body.language as AssistantLanguageCode)
      : 'en';

    if (!text) {
      res.status(400).json({ error: 'No text provided for speech synthesis.' });
      return;
    }

    const trimmed = text.slice(0, 600);
    const cacheKey = `${language}::${trimmed}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ audioBase64: cached, mimeType: 'audio/wav' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const stylePrompt =
      language === 'ur' || language === 'roman-ur'
        ? 'Warm, articulate Pakistani luxury jewellery concierge speaking clearly at a natural conversational pace'
        : 'Warm, articulate international luxury jewellery concierge speaking clearly at a natural conversational pace';

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: trimmed,
                  speechMetadata: {
                    style: stylePrompt,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        })
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'TTS model returned empty audio.' });
        return;
      }

      if (ttsCache.size >= MAX_TTS_CACHE) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err: unknown) {
      handleGeminiError(res, err);
    }
  });

  app.post('/api/assistant', async (req, res) => {
    const body = (req.body || {}) as AssistantRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Please enter a message or voice command.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(500).json({
        error:
          'Gemini API key is not configured. Please add GEMINI_API_KEY in the Settings > Secrets panel.',
      });
      return;
    }

    const selectedLanguage = VALID_LANGUAGES.has(body.selectedLanguage as AssistantLanguageCode)
      ? (body.selectedLanguage as AssistantLanguageCode)
      : 'auto';

    const conversationLanguage = VALID_LANGUAGES.has(body.conversationLanguage as AssistantLanguageCode)
      ? (body.conversationLanguage as AssistantLanguageCode)
      : 'en';

    // Enforce real server-side admin cookie verification; never trust client booleans
    const adminAuthorized = Boolean(getAuthenticatedAdminSession(req));
    const liveProducts = getCatalogProducts();
    const adminCostMap = new Map<string, AdminProductCostEntry>();
    if (adminAuthorized && Array.isArray(body.adminCosts)) {
      for (const entry of body.adminCosts) {
        if (entry && typeof entry.productId === 'string' && getCatalogProductById(entry.productId)) {
          adminCostMap.set(entry.productId, entry);
        }
      }
    }

    const adminCostContext = adminAuthorized
      ? liveProducts.map((p) => {
          const entry = adminCostMap.get(p.id);
          const purchaseCost = entry?.purchaseCostPkr;
          const extra = entry?.extraExpensesPkr ?? 0;
          const unitsSold = entry?.unitsSold;
          const profit =
            typeof purchaseCost === 'number' && purchaseCost > 0
              ? p.pricePkr - purchaseCost - extra
              : null;
          return {
            productId: p.id,
            name: p.name,
            sellingPricePkr: p.pricePkr,
            discountPct:
              p.compareAtPricePkr && p.compareAtPricePkr > p.pricePkr
                ? Math.round(((p.compareAtPricePkr - p.pricePkr) / p.compareAtPricePkr) * 100)
                : 0,
            purchaseCostPkr: typeof purchaseCost === 'number' && purchaseCost > 0 ? purchaseCost : null,
            extraExpensesPkr: extra,
            estimatedProfitPerUnitPkr: profit,
            profitMarginPct:
              profit !== null && p.pricePkr > 0 ? Number(((profit / p.pricePkr) * 100).toFixed(2)) : null,
            unitsSold: typeof unitsSold === 'number' ? unitsSold : null,
            actualProfitPkr:
              profit !== null && typeof unitsSold === 'number' ? profit * unitsSold : null,
            inStock: p.inStock,
          };
        })
      : undefined;

    const historyLines = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .map((h) => `${h.role === 'user' ? 'User' : 'Noor'}: ${String(h.text || '').slice(0, 400)}`)
      : [];

    const contextPayload = {
      currentPage: body.context?.currentPage || 'home',
      conversationLanguage,
      activeProductId: body.context?.activeProductId || null,
      lastDisplayedProductIds: Array.isArray(body.context?.lastDisplayedProductIds)
        ? body.context!.lastDisplayedProductIds.slice(0, 8)
        : [],
      wishlistIds: Array.isArray(body.context?.wishlistIds) ? body.context!.wishlistIds : [],
      cart: Array.isArray(body.context?.cart) ? body.context!.cart : [],
      shopFilters: body.context?.shopFilters || {},
      pendingConfirmation: body.context?.pendingConfirmation || null,
      adminAuthorized,
      adminCostData: adminCostContext,
    };

    const prompt = [
      'LIVE STOREFRONT CONTEXT:',
      JSON.stringify(contextPayload),
      '',
      historyLines.length > 0 ? 'RECENT CONVERSATION:\n' + historyLines.join('\n') : '',
      '',
      `CURRENT USER MESSAGE: ${message}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: buildSystemInstruction(selectedLanguage, adminAuthorized),
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'The AI concierge returned an empty response. Please try again.',
        });
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        parsed = {
          reply: rawText,
          spokenSummary: rawText.replace(/Rs\./g, 'rupees'),
          detectedLanguage: selectedLanguage === 'auto' ? conversationLanguage : selectedLanguage,
          actionType: 'none',
        };
      }

      const sanitized = sanitizePayload(parsed, selectedLanguage, adminAuthorized, adminCostMap);
      res.json(sanitized);
    } catch (err: unknown) {
      handleGeminiError(res, err);
    }
  });


  // Ensure unknown /api/* routes always return valid JSON instead of HTML 404 pages
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Requested API endpoint does not exist.' });
  });

  // Ensure JSON parse errors or uncaught Express errors on /api/* always respond with JSON
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!req.path.startsWith('/api')) {
        next(err);
        return;
      }
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 500;
      const message =
        err instanceof SyntaxError
          ? 'Invalid JSON request payload.'
          : err instanceof Error && err.message
          ? err.message
          : 'Internal server error.';
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  );

  return app;
}
