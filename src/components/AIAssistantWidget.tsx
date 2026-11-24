import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  GitCompare,
  Globe,
  Heart,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Square,
  Store,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { JewelleryProduct } from '../data/products.ts';
import { formatPKR } from '../config/storeConfig.ts';
import { useStore } from '../context/StoreContext.tsx';
import { safeReadJson } from '../utils/safeFetchJson.ts';
import {
  SUPPORTED_LANGUAGES,
  type AdminProductCostEntry,
  type AssistantChatMessage,
  type AssistantLanguageCode,
  type AssistantResponsePayload,
  type ChatbotCategoryTab,
  type ChatbotWorkspaceTab,
  type PendingConfirmedAction,
  type RobotVisualState,
} from '../types/assistant.ts';
import { RobotAvatar } from './RobotAvatar.tsx';
import {
  AssistantBusinessCard,
  AssistantCompareCard,
  AssistantProductCard,
} from './AssistantProductCard.tsx';
import { AssistantStoreCatalog } from './AssistantStoreCatalog.tsx';
import { AssistantProductDetail } from './AssistantProductDetail.tsx';
import { AssistantBusinessAdvisor } from './AssistantBusinessAdvisor.tsx';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const ADMIN_COSTS_STORAGE_KEY = 'zaveri_admin_costs_v1';

const QUICK_PROMPTS = [
  'Mujhe gold ring dikhao',
  'Show me diamond necklaces',
  'Find jewellery under Rs. 50,000',
  'Mujhe achi jewellery suggest karo',
];

const INITIAL_WELCOME_MESSAGE: AssistantChatMessage = {
  id: 'welcome-noor',
  role: 'assistant',
  text: 'Assalam-o-Alaikum. I am Noor, your multilingual Zaveri Atelier shopping concierge. Speak or type in English, Urdu, Roman Urdu, Hindi, Arabic, French, Spanish, or Chinese—or browse our full collection directly in the Shop Store tab.',
  timestamp: Date.now(),
  detectedLanguage: 'en',
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function AIAssistantWidget() {
  const {
    route,
    navigate,
    getProductById,
    adminSession,
    refreshAdminSession,
    logoutAdmin,
    shopFilters,
    applyShopFilters,
    resetShopFilters,
    getSelectedSize,
    setProductSize,
    setProductFinish,
    setAssistantSelectedProductId,
    activeProduct,
    cart,
    cartCount,
    cartTotalPkr,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    wishlistIds,
    toggleWishlist,
    isWishlisted,
    openCart,
    closeCart,
    openSingleWhatsAppOrder,
    openCartWhatsAppOrder,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatbotWorkspaceTab>('store');
  const [activeStoreCategory, setActiveStoreCategory] = useState<ChatbotCategoryTab>('All Products');
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [compareSelectedIds, setCompareSelectedIds] = useState<string[]>([]);

  const [selectedLanguage, setSelectedLanguage] = useState<AssistantLanguageCode>('auto');
  const [conversationLanguage, setConversationLanguage] = useState<AssistantLanguageCode>('en');

  const [messages, setMessages] = useState<AssistantChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [hasErrorState, setHasErrorState] = useState(false);

  const [lastDisplayedProductIds, setLastDisplayedProductIds] = useState<string[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmedAction | null>(
    null
  );

  // Real server-verified Admin Session for Business Advisor
  const isAdminAuthorized = adminSession.authenticated;
  const [adminCosts, setAdminCosts] = useState<AdminProductCostEntry[]>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_COSTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_COSTS_STORAGE_KEY, JSON.stringify(adminCosts));
    } catch {
      // Ignore storage errors gracefully
    }
  }, [adminCosts]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isVoiceMutedRef = useRef(isVoiceMuted);
  const isThinkingRef = useRef(false);

  useEffect(() => {
    isVoiceMutedRef.current = isVoiceMuted;
  }, [isVoiceMuted]);

  const robotState: RobotVisualState = useMemo(() => {
    if (isListening) return 'listening';
    if (isThinking || isTranscribing) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (hasErrorState) return 'error';
    return 'idle';
  }, [isListening, isThinking, isTranscribing, isSpeaking, hasErrorState]);

  const stateLabel =
    robotState === 'listening'
      ? 'Listening — tap Mic to finish'
      : isTranscribing
      ? 'Understanding voice...'
      : robotState === 'thinking'
      ? 'Thinking...'
      : robotState === 'speaking'
      ? 'Speaking...'
      : robotState === 'error'
      ? 'Attention needed'
      : 'Ready';

  const activeLanguageLabel = useMemo(() => {
    const code = selectedLanguage === 'auto' ? conversationLanguage : selectedLanguage;
    return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeLabel || 'English';
  }, [selectedLanguage, conversationLanguage]);

  const detailProduct = detailProductId ? getProductById(detailProductId) || null : null;

  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakWithBrowserFallback = useCallback(
    (text: string, langCode: AssistantLanguageCode) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        return;
      }
      const targetLang =
        SUPPORTED_LANGUAGES.find((l) => l.code === langCode)?.speechLang || 'en-US';
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) =>
        v.lang.toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase())
      );
      if (matched) utterance.voice = matched;
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Multilingual Gemini TTS audio playback (replaces broken English-only speechSynthesis)
  const speakText = useCallback(
    async (rawText: string, langCode: AssistantLanguageCode) => {
      if (isVoiceMutedRef.current) return;
      const cleaned = rawText
        .replace(/[*_`#]/g, '')
        .replace(/Rs\.\s*/g, 'rupees ')
        .trim();
      if (!cleaned) return;

      stopSpeaking();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      try {
        setIsSpeaking(true);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ text: cleaned, language: langCode }),
        });

        if (!res.ok) {
          throw new Error('TTS request failed');
        }

        const data = await safeReadJson<{ audioBase64?: string; mimeType?: string }>(
          res,
          'Voice playback'
        );
        if (controller.signal.aborted || isVoiceMutedRef.current) {
          setIsSpeaking(false);
          return;
        }
        if (!data.audioBase64) {
          throw new Error('Missing audio payload');
        }

        const audio = new Audio(
          `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
        );
        audioRef.current = audio;
        audio.onended = () => {
          if (audioRef.current === audio) audioRef.current = null;
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          if (audioRef.current === audio) audioRef.current = null;
          setIsSpeaking(false);
        };
        await audio.play();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setIsSpeaking(false);
          return;
        }
        // Fallback to locale-matched Web Speech API if browser autoplay or TTS endpoint fails
        speakWithBrowserFallback(cleaned, langCode);
      }
    },
    [speakWithBrowserFallback, stopSpeaking]
  );

  const stopAudioStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  // Cleanup everything on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      ttsAbortRef.current?.abort();
      mediaRecorderRef.current?.stop();
      stopAudioStream();
      recognitionRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopAudioStream]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat' && !detailProductId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen, activeTab, detailProductId]);

  const handleOpenProductInChatbot = useCallback(
    (product: JewelleryProduct) => {
      setAssistantSelectedProductId(product.id);
      setDetailProductId(product.id);
    },
    [setAssistantSelectedProductId]
  );

  const handleToggleCompareId = useCallback((productId: string) => {
    setCompareSelectedIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 2) {
        return [prev[1], productId];
      }
      return [...prev, productId];
    });
  }, []);

  const executeAssistantPayload = useCallback(
    (
      payload: AssistantResponsePayload
    ): {
      finalText: string;
      finalSpoken: string;
      detectedLanguage: AssistantLanguageCode;
      actionBadge?: string;
      displayProductIds?: string[];
      compareProductIds?: string[];
      businessCards?: AssistantResponsePayload['businessCards'];
      pendingAction?: PendingConfirmedAction;
    } => {
      let finalText = payload.reply;
      let finalSpoken = payload.spokenSummary;
      let actionBadge: string | undefined;
      let displayProductIds = payload.displayProductIds;
      const compareProductIds = payload.compareProductIds;
      const businessCards = payload.businessCards;
      let nextPending: PendingConfirmedAction | undefined;

      const resolvedTargetId =
        payload.targetProductId || activeProduct?.id || lastDisplayedProductIds[0];
      const targetProduct = resolvedTargetId ? getProductById(resolvedTargetId) : undefined;

      if (payload.detectedLanguage && payload.detectedLanguage !== 'auto') {
        setConversationLanguage(payload.detectedLanguage);
      }

      switch (payload.actionType) {
        case 'navigate': {
          if (payload.navigateTo) {
            if (payload.navigateTo === 'shop') {
              navigate({
                page: 'shop',
                category: 'All',
                subcategory: 'All',
                collection: 'All',
                onlyNew: false,
              });
            } else {
              navigate({ page: payload.navigateTo });
            }
            const labelMap = {
              home: 'Home',
              shop: 'Shop Catalogue',
              wishlist: 'Wishlist',
              about: 'About Zaveri Atelier',
              contact: 'Contact & Boutiques',
            };
            actionBadge = `Opened ${labelMap[payload.navigateTo]}`;
          }
          break;
        }

        case 'filter_shop': {
          const sf = payload.shopFilter || {};
          applyShopFilters(
            {
              searchQuery: sf.searchQuery ?? '',
              category: sf.category ?? 'All',
              subcategory: sf.subcategory ?? 'All',
              collection: sf.collection ?? 'All',
              onlyNewArrivals: Boolean(sf.onlyNewArrivals),
              priceRange:
                sf.priceRange ||
                (sf.minPricePkr !== undefined || sf.maxPricePkr !== undefined ? 'custom' : 'all'),
              minPricePkr: sf.minPricePkr,
              maxPricePkr: sf.maxPricePkr,
              sortBy: sf.sortBy ?? (sf.onlyNewArrivals ? 'newest' : 'featured'),
            },
            { navigateToShop: true, replace: true }
          );
          actionBadge = 'Updated Shop Catalogue';
          break;
        }

        case 'reset_filters': {
          resetShopFilters(true);
          actionBadge = 'Reset All Filters';
          break;
        }

        case 'open_product': {
          if (targetProduct) {
            setAssistantSelectedProductId(targetProduct.id);
            setDetailProductId(targetProduct.id);
            navigate({ page: 'product', slug: targetProduct.slug });
            displayProductIds = [targetProduct.id];
            actionBadge = `Opened ${targetProduct.name}`;
          }
          break;
        }

        case 'select_product': {
          if (targetProduct) {
            setAssistantSelectedProductId(targetProduct.id);
            if (!displayProductIds || displayProductIds.length === 0) {
              displayProductIds = [targetProduct.id];
            }
            actionBadge = `Selected ${targetProduct.name}`;
          }
          break;
        }

        case 'select_variant': {
          if (targetProduct) {
            setAssistantSelectedProductId(targetProduct.id);
            if (payload.selectedSize) {
              setProductSize(targetProduct.id, payload.selectedSize);
            }
            if (payload.selectedFinish) {
              setProductFinish(targetProduct.id, payload.selectedFinish);
            }
            actionBadge = `Updated ${targetProduct.name}`;
          }
          break;
        }

        case 'add_to_cart': {
          if (!targetProduct) {
            finalText =
              'Please select or mention which jewellery piece you would like to add to your bag.';
            finalSpoken = finalText;
            break;
          }
          const sizeToUse = payload.selectedSize || getSelectedSize(targetProduct);
          const qty = payload.quantity || 1;
          const res = addToCart(targetProduct, sizeToUse, qty, { openDrawer: true });
          if (res.ok) {
            setAssistantSelectedProductId(targetProduct.id);
            actionBadge = `Added to Bag · ${targetProduct.name}`;
          } else if (res.reason === 'made-to-order') {
            displayProductIds = [targetProduct.id];
            finalText = `${targetProduct.name} (${formatPKR(targetProduct.pricePkr)}) is crafted exclusively to order and cannot be added directly to the bag. You can commission it via Buy Now.`;
            finalSpoken = `${targetProduct.name} is crafted exclusively to order. Please use Buy Now to commission it.`;
            actionBadge = 'Made-to-Order Piece';
          }
          break;
        }

        case 'remove_from_cart': {
          if (!targetProduct) break;
          const matchingItems = cart.filter((c) => c.productId === targetProduct.id);
          if (matchingItems.length === 0) {
            finalText = `${targetProduct.name} is not currently in your shopping bag.`;
            finalSpoken = finalText;
          } else {
            matchingItems.forEach((m) => removeFromCart(m.productId, m.size));
            actionBadge = `Removed ${targetProduct.name}`;
          }
          break;
        }

        case 'update_cart_quantity': {
          if (!targetProduct) break;
          const targetEntry =
            (payload.selectedSize
              ? cart.find((c) => c.productId === targetProduct.id && c.size === payload.selectedSize)
              : undefined) || cart.find((c) => c.productId === targetProduct.id);

          if (!targetEntry) {
            finalText = `${targetProduct.name} is not in your shopping bag yet.`;
            finalSpoken = finalText;
          } else {
            const desiredQty = payload.quantity ?? targetEntry.quantity + 1;
            const delta = desiredQty - targetEntry.quantity;
            updateCartQuantity(targetEntry.productId, targetEntry.size, delta);
            actionBadge = `Updated ${targetProduct.name} qty`;
          }
          break;
        }

        case 'toggle_wishlist': {
          if (!targetProduct) break;
          const currentlySaved = isWishlisted(targetProduct.id);
          if (payload.wishlistOperation === 'add' && currentlySaved) {
            finalText = `${targetProduct.name} is already saved in your wishlist.`;
            finalSpoken = finalText;
          } else if (payload.wishlistOperation === 'remove' && !currentlySaved) {
            finalText = `${targetProduct.name} is not in your wishlist.`;
            finalSpoken = finalText;
          } else {
            const nowSaved = toggleWishlist(targetProduct.id);
            actionBadge = nowSaved
              ? `Saved to Wishlist · ${targetProduct.name}`
              : 'Removed from Wishlist';
          }
          break;
        }

        case 'open_cart': {
          openCart();
          actionBadge = 'Opened Shopping Bag';
          break;
        }

        case 'close_cart': {
          closeCart();
          actionBadge = 'Closed Shopping Bag';
          break;
        }

        case 'compare_products': {
          if (compareProductIds && compareProductIds.length === 2) {
            actionBadge = 'Comparing 2 Pieces';
          }
          break;
        }

        case 'request_confirmation': {
          if (payload.pendingActionType === 'clear_cart') {
            if (cart.length === 0) {
              finalText = 'Your shopping bag is already empty.';
              finalSpoken = finalText;
            } else {
              nextPending = { type: 'clear_cart' };
              setPendingConfirmation(nextPending);
            }
          } else if (payload.pendingActionType === 'open_whatsapp_order') {
            if (targetProduct && !cart.some((c) => c.productId === targetProduct.id)) {
              nextPending = {
                type: 'open_whatsapp_order',
                productId: targetProduct.id,
                size: payload.selectedSize || getSelectedSize(targetProduct),
                quantity: payload.quantity || 1,
              };
              setPendingConfirmation(nextPending);
            } else if (cart.length > 0) {
              nextPending = { type: 'open_whatsapp_order' };
              setPendingConfirmation(nextPending);
            }
          }
          break;
        }

        case 'clear_cart': {
          clearCart();
          setPendingConfirmation(null);
          actionBadge = 'Cleared Shopping Bag';
          break;
        }

        case 'open_whatsapp_order': {
          setPendingConfirmation(null);
          if (targetProduct && (cart.length === 0 || payload.targetProductId)) {
            openSingleWhatsAppOrder(
              targetProduct,
              payload.selectedSize || getSelectedSize(targetProduct),
              payload.quantity || 1
            );
            actionBadge = 'Opened Checkout Order';
          } else if (cart.length > 0) {
            openCartWhatsAppOrder();
            actionBadge = 'Opened Bag Checkout';
          }
          break;
        }

        case 'none':
        default:
          break;
      }

      if (compareProductIds && compareProductIds.length > 0) {
        setLastDisplayedProductIds(compareProductIds);
      } else if (displayProductIds && displayProductIds.length > 0) {
        setLastDisplayedProductIds(displayProductIds);
      } else if (targetProduct && payload.actionType !== 'clear_cart') {
        setLastDisplayedProductIds((prev) =>
          prev.includes(targetProduct.id) ? prev : [targetProduct.id, ...prev.slice(0, 4)]
        );
      }

      return {
        finalText,
        finalSpoken,
        detectedLanguage: payload.detectedLanguage,
        actionBadge,
        displayProductIds,
        compareProductIds,
        businessCards,
        pendingAction: nextPending,
      };
    },
    [
      activeProduct?.id,
      addToCart,
      applyShopFilters,
      cart,
      clearCart,
      closeCart,
      getProductById,
      getSelectedSize,
      isWishlisted,
      lastDisplayedProductIds,
      navigate,
      openCart,
      openCartWhatsAppOrder,
      openSingleWhatsAppOrder,
      removeFromCart,
      resetShopFilters,
      setAssistantSelectedProductId,
      setProductFinish,
      setProductSize,
      toggleWishlist,
      updateCartQuantity,
    ]
  );

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const trimmed = rawMessage.trim();
      if (!trimmed || isThinkingRef.current) return;

      isThinkingRef.current = true;
      stopSpeaking();
      setVoiceError(null);
      setHasErrorState(false);

      // Show chat thread automatically when user sends a text/voice query
      setDetailProductId(null);
      setActiveTab('chat');

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsg: AssistantChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      const historySnapshot = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsThinking(true);

      try {
        const cartDetails = cart
          .map((entry) => {
            const p = getProductById(entry.productId);
            if (!p) return null;
            return {
              productId: p.id,
              name: p.name,
              size: entry.size,
              quantity: entry.quantity,
              pricePkr: p.pricePkr,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        const res = await fetch('/api/assistant', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: trimmed,
            selectedLanguage,
            conversationLanguage,
            adminCosts: isAdminAuthorized ? adminCosts : undefined,
            history: historySnapshot,
            context: {
              currentPage: route.page,
              activeProductId: activeProduct?.id || null,
              lastDisplayedProductIds,
              wishlistIds,
              cart: cartDetails,
              shopFilters,
              pendingConfirmation,
            },
          }),
        });

        const data = await safeReadJson<AssistantResponsePayload & { error?: string }>(
          res,
          'Noor AI Concierge'
        );
        if (!res.ok) {
          throw new Error(data.error || `Concierge request failed (${res.status}).`);
        }

        const executed = executeAssistantPayload(data);

        const assistantMsg: AssistantChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: executed.finalText,
          timestamp: Date.now(),
          detectedLanguage: executed.detectedLanguage,
          productIds: executed.displayProductIds,
          compareProductIds: executed.compareProductIds,
          businessCards: executed.businessCards,
          actionBadge: executed.actionBadge,
          pendingConfirmation: executed.pendingAction,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        void speakText(executed.finalSpoken, executed.detectedLanguage);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const errMsg =
          err instanceof Error
            ? err.message
            : 'Unable to reach the AI concierge right now. Please try again.';
        setHasErrorState(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: errMsg,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      } finally {
        if (abortControllerRef.current === controller) {
          isThinkingRef.current = false;
          setIsThinking(false);
        }
      }
    },
    [
      activeProduct?.id,
      adminCosts,
      cart,
      conversationLanguage,
      executeAssistantPayload,
      getProductById,
      isAdminAuthorized,
      lastDisplayedProductIds,
      messages,
      pendingConfirmation,
      route.page,
      selectedLanguage,
      shopFilters,
      speakText,
      stopSpeaking,
      wishlistIds,
    ]
  );

  const handleConfirmAction = useCallback(
    (msgId: string, action: PendingConfirmedAction, accepted: boolean) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmationHandled: true } : m))
      );
      setPendingConfirmation(null);

      if (!accepted) {
        const cancelMsg: AssistantChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: 'Understood, nothing was changed.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, cancelMsg]);
        return;
      }

      if (action.type === 'clear_cart') {
        clearCart();
        const doneMsg: AssistantChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: 'Your shopping bag has been cleared.',
          timestamp: Date.now(),
          actionBadge: 'Cleared Shopping Bag',
        };
        setMessages((prev) => [...prev, doneMsg]);
        void speakText(doneMsg.text, conversationLanguage);
      } else if (action.type === 'open_whatsapp_order') {
        const prod = action.productId ? getProductById(action.productId) : undefined;
        if (prod) {
          openSingleWhatsAppOrder(prod, action.size, action.quantity || 1);
        } else {
          openCartWhatsAppOrder();
        }
        const doneMsg: AssistantChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: 'Your checkout preview has been opened so you can review and confirm your order.',
          timestamp: Date.now(),
          actionBadge: 'Opened Checkout',
        };
        setMessages((prev) => [...prev, doneMsg]);
        void speakText(doneMsg.text, conversationLanguage);
      }
    },
    [clearCart, conversationLanguage, getProductById, openCartWhatsAppOrder, openSingleWhatsAppOrder, speakText]
  );

  // Multilingual Voice Capture via MediaRecorder -> Gemini 3.5 Transcribe (with SpeechRecognition fallback)
  const toggleVoiceInput = useCallback(async () => {
    setVoiceError(null);
    stopSpeaking();

    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Prefer MediaRecorder + Gemini 3.5 Transcribe for accurate Urdu, Roman Urdu, Hindi, Arabic, French, Spanish, Chinese & English
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const preferredMime = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = async () => {
          setIsListening(false);
          stopAudioStream();

          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size < 400) {
            setVoiceError('Recording was too short. Tap Mic, speak clearly, then tap Mic again.');
            return;
          }

          setIsTranscribing(true);
          try {
            const audioBase64 = await blobToBase64(blob);
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64,
                mimeType: blob.type || 'audio/webm',
                selectedLanguage,
              }),
            });
            const data = await safeReadJson<{ transcript?: string; error?: string }>(
              res,
              'Voice transcription'
            );
            if (!res.ok) {
              throw new Error(data.error || 'Voice transcription failed.');
            }
            const transcript = (data.transcript || '').trim();
            if (!transcript) {
              setVoiceError('No clear speech detected. Please speak closer to your microphone.');
              return;
            }
            await sendMessage(transcript);
          } catch (err: unknown) {
            setVoiceError(
              err instanceof Error
                ? err.message
                : 'Could not transcribe voice input. You can continue typing.'
            );
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
        setHasErrorState(false);
        return;
      } catch (err: unknown) {
        stopAudioStream();
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setVoiceError('Microphone access was blocked. Please allow microphone permission in your browser.');
          return;
        }
        // Otherwise fall through to SpeechRecognition fallback
      }
    }

    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      setVoiceError('Voice input is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new RecognitionCtor();
      const langOpt = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
      recognition.lang = langOpt?.speechLang || 'en-PK';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let latestFinal = '';
      recognition.onstart = () => {
        setIsListening(true);
        setHasErrorState(false);
      };
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            latestFinal = `${latestFinal} ${transcript}`.trim();
            setInputValue(latestFinal);
          } else {
            interim += transcript;
            setInputValue(interim.trim());
          }
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission denied. Please enable mic access.');
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice recognition error (${event.error}). Please type your message.`);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        if (latestFinal.trim()) {
          const toSend = latestFinal.trim();
          latestFinal = '';
          void sendMessage(toSend);
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Unable to start voice capture.');
    }
  }, [isListening, selectedLanguage, sendMessage, stopAudioStream, stopSpeaking]);

  const handleResetChat = () => {
    abortControllerRef.current?.abort();
    stopSpeaking();
    isThinkingRef.current = false;
    setIsThinking(false);
    setIsTranscribing(false);
    setHasErrorState(false);
    setVoiceError(null);
    setPendingConfirmation(null);
    setLastDisplayedProductIds([]);
    setMessages([{ ...INITIAL_WELCOME_MESSAGE, timestamp: Date.now() }]);
  };

  const handleUpdateCostEntry = (entry: AdminProductCostEntry) => {
    setAdminCosts((prev) => {
      const idx = prev.findIndex((c) => c.productId === entry.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
  };

  const handleCompareSelected = () => {
    if (compareSelectedIds.length !== 2) return;
    const p1 = getProductById(compareSelectedIds[0]);
    const p2 = getProductById(compareSelectedIds[1]);
    if (!p1 || !p2) return;
    void sendMessage(`Compare ${p1.name} and ${p2.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking || isTranscribing) return;
    void sendMessage(inputValue);
  };

  return (
    <>
      {/* Floating Mini AI Robot Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsOpen(true)}
            aria-label="Open Noor AI Jewellery Store & Concierge"
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 px-3.5 py-2.5 sm:pr-5 rounded-full bg-[#252525] text-[#FFFDF8] border border-[#C6A15B]/60 shadow-[0_14px_34px_rgba(37,37,37,0.3)] hover:bg-[#32302E] hover:border-[#C6A15B] transition-colors cursor-pointer"
          >
            <RobotAvatar state={robotState} size="md" />
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-semibold tracking-wide text-[#FFFDF8] flex items-center gap-1.5 whitespace-nowrap">
                <span>Noor AI Shop</span>
                <Sparkles className="w-3 h-3 text-[#C6A15B]" />
              </span>
              <span className="text-[10px] text-[#E8DDCC]/85 whitespace-nowrap">
                Browse · Voice · Buy
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Complete Multilingual AI Robot Store & Concierge Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Noor AI Jewellery Store and Multilingual Concierge"
            className={`fixed z-40 bg-[#F8F5EF] border border-[#252525]/20 shadow-[0_24px_64px_rgba(37,37,37,0.35)] flex flex-col overflow-hidden ${
              isMaximized
                ? 'inset-2 sm:inset-5'
                : 'inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[560px] md:w-[640px] sm:h-[min(730px,calc(100vh-2.5rem))]'
            }`}
          >
            {/* Header with Animated Robot, Language Selector & Window Controls */}
            <div className="bg-[#252525] text-[#FFFDF8] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#C6A15B]/35 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <RobotAvatar state={robotState} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-base sm:text-lg font-medium text-[#FFFDF8] truncate">
                      Noor AI Boutique
                    </h2>
                    <span className="text-[10px] text-[#E6CC96] uppercase tracking-wider shrink-0">
                      {activeLanguageLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#E8DDCC]/80 truncate">{stateLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Manual Language Selector */}
                <label className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 border border-[#C6A15B]/35 text-[11px] text-[#FFFDF8] cursor-pointer">
                  <Globe className="w-3 h-3 text-[#C6A15B] shrink-0" />
                  <select
                    aria-label="Select conversation language"
                    value={selectedLanguage}
                    onChange={(e) => {
                      const next = e.target.value as AssistantLanguageCode;
                      setSelectedLanguage(next);
                      if (next !== 'auto') setConversationLanguage(next);
                    }}
                    className="bg-transparent text-[11px] text-[#FFFDF8] focus:outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-[#252525] text-[#FFFDF8]">
                        {lang.nativeLabel}
                      </option>
                    ))}
                  </select>
                </label>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    aria-label="Stop speaking"
                    title="Stop speaking"
                    className="w-8 h-8 flex items-center justify-center text-[#E6CC96] hover:bg-white/10 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const next = !isVoiceMuted;
                    setIsVoiceMuted(next);
                    if (next) stopSpeaking();
                  }}
                  aria-label={isVoiceMuted ? 'Unmute assistant voice' : 'Mute assistant voice'}
                  title={isVoiceMuted ? 'Unmute voice' : 'Mute voice'}
                  className="w-8 h-8 flex items-center justify-center text-[#E8DDCC] hover:text-[#FFFDF8] hover:bg-white/10 cursor-pointer"
                >
                  {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized((m) => !m)}
                  aria-label={isMaximized ? 'Restore window size' : 'Maximize window'}
                  title={isMaximized ? 'Restore size' : 'Maximize'}
                  className="hidden sm:flex w-8 h-8 items-center justify-center text-[#E8DDCC] hover:text-[#FFFDF8] hover:bg-white/10 cursor-pointer"
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="Reset conversation"
                  title="New chat"
                  className="w-8 h-8 flex items-center justify-center text-[#E8DDCC] hover:text-[#FFFDF8] hover:bg-white/10 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setIsOpen(false);
                  }}
                  aria-label="Minimize AI assistant"
                  title="Minimize"
                  className="w-8 h-8 flex items-center justify-center text-[#E8DDCC] hover:text-[#FFFDF8] hover:bg-white/10 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setIsMaximized(false);
                    setIsOpen(false);
                  }}
                  aria-label="Close AI assistant"
                  title="Close"
                  className="w-8 h-8 flex items-center justify-center text-[#E8DDCC] hover:text-[#FFFDF8] hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Workspace Switcher Tabs: Shop Store (Default Visual Store) | AI Chat | Business Advisor */}
            <div className="bg-[#FFFDF8] px-3.5 py-2 border-b border-[#252525]/12 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setDetailProductId(null);
                    setActiveTab('store');
                  }}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    activeTab === 'store' && !detailProduct
                      ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                      : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/15 hover:border-[#C6A15B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Shop Store</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDetailProductId(null);
                    setActiveTab('chat');
                  }}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    activeTab === 'chat' && !detailProduct
                      ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                      : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/15 hover:border-[#C6A15B]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>AI Chat ({messages.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDetailProductId(null);
                    setActiveTab('advisor');
                  }}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    activeTab === 'advisor' && !detailProduct
                      ? 'bg-[#252525] text-[#FFFDF8] border-[#252525]'
                      : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/15 hover:border-[#C6A15B]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Business Advisor</span>
                </button>
              </div>

              {compareSelectedIds.length === 2 && (
                <button
                  type="button"
                  onClick={handleCompareSelected}
                  className="px-2.5 py-1.5 min-h-[36px] bg-[#E8DDCC] border border-[#C6A15B] text-xs font-medium text-[#252525] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[#8E6E30]" />
                  <span>Compare (2)</span>
                </button>
              )}
            </div>

            {/* Main Viewport: Product Detail OR Store Catalog OR AI Chat OR Business Advisor */}
            {detailProduct ? (
              <AssistantProductDetail
                product={detailProduct}
                onBack={() => setDetailProductId(null)}
                onAskAboutProduct={(prod) => {
                  setAssistantSelectedProductId(prod.id);
                  setDetailProductId(null);
                  setActiveTab('chat');
                  setInputValue(`Tell me about ${prod.name}`);
                }}
              />
            ) : activeTab === 'store' ? (
              <AssistantStoreCatalog
                isMaximized={isMaximized}
                activeCategory={activeStoreCategory}
                onSelectCategory={setActiveStoreCategory}
                onOpenProductDetail={handleOpenProductInChatbot}
                compareSelectedIds={compareSelectedIds}
                onToggleCompareId={handleToggleCompareId}
              />
            ) : activeTab === 'advisor' ? (
              <AssistantBusinessAdvisor
                isAdminAuthorized={isAdminAuthorized}
                onAuthorizeAdmin={() => {
                  void refreshAdminSession();
                }}
                onLockAdmin={() => {
                  void logoutAdmin();
                }}
                adminCosts={adminCosts}
                onUpdateCostEntry={handleUpdateCostEntry}
                onAskAdvisorPrompt={(q) => void sendMessage(q)}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const cardProducts = (msg.productIds || [])
                    .map((id) => getProductById(id))
                    .filter((p): p is JewelleryProduct => Boolean(p));

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                    >
                      <div
                        className={`max-w-[90%] px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                          isUser
                            ? 'bg-[#252525] text-[#FFFDF8]'
                            : msg.isError
                            ? 'bg-red-50 border border-red-200 text-red-900'
                            : 'bg-[#FFFDF8] border border-[#252525]/12 text-[#252525]'
                        }`}
                      >
                        {msg.actionBadge && (
                          <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-[#E8DDCC] text-[#252525] text-[10px] font-medium">
                            <Check className="w-3 h-3 text-[#8E6E30]" />
                            <span>{msg.actionBadge}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {msg.pendingConfirmation && !msg.confirmationHandled && (
                          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#252525]/10">
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmAction(msg.id, msg.pendingConfirmation!, true)
                              }
                              className="px-3 py-1.5 bg-[#252525] text-[#FFFDF8] text-[11px] font-medium hover:bg-[#363636] cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmAction(msg.id, msg.pendingConfirmation!, false)
                              }
                              className="px-3 py-1.5 border border-[#252525]/20 bg-[#F8F5EF] text-[#252525] text-[11px] font-medium hover:bg-[#E8DDCC] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.compareProductIds && msg.compareProductIds.length >= 2 && (
                        <div className="w-full max-w-[98%]">
                          <AssistantCompareCard
                            productIds={msg.compareProductIds}
                            onOpenDetail={handleOpenProductInChatbot}
                          />
                        </div>
                      )}

                      {msg.businessCards && msg.businessCards.length > 0 && (
                        <div className="w-full max-w-[98%] grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.businessCards.map((bc) => (
                            <AssistantBusinessCard
                              key={bc.productId}
                              card={bc}
                              onOpenDetail={handleOpenProductInChatbot}
                            />
                          ))}
                        </div>
                      )}

                      {cardProducts.length > 0 && (
                        <div className="w-full max-w-[98%] grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cardProducts.map((prod, idx) => (
                            <AssistantProductCard
                              key={prod.id}
                              product={prod}
                              index={idx}
                              onOpenDetail={handleOpenProductInChatbot}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2.5 bg-[#FFFDF8] border border-[#252525]/12 px-3.5 py-2.5 w-fit text-xs text-[#252525]/75">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-bounce [animation-delay:300ms]" />
                      </span>
                      <span>Analyzing catalogue &amp; preparing response...</span>
                    </div>
                  </div>
                )}

                {messages.length <= 1 && !isThinking && (
                  <div className="pt-1 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#252525]/55">
                      Multilingual Examples
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PROMPTS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void sendMessage(q)}
                          className="px-2.5 py-1.5 bg-[#FFFDF8] border border-[#252525]/15 hover:border-[#C6A15B] text-[11px] text-[#252525] transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Persistent Bag & Wishlist Quick Bar */}
            <div className="px-3.5 py-1.5 bg-[#E8DDCC]/75 border-t border-[#252525]/10 flex items-center justify-between gap-2 text-[11px] text-[#252525] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={openCart}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-[#8E6E30] cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#8E6E30]" />
                  <span className="tabular-nums">
                    Bag: {cartCount} ({formatPKR(cartTotalPkr)})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ page: 'wishlist' })}
                  className="inline-flex items-center gap-1 text-[#252525]/80 hover:text-[#252525] cursor-pointer whitespace-nowrap"
                >
                  <Heart className="w-3.5 h-3.5 text-[#8E6E30]" />
                  <span className="tabular-nums">Wishlist ({wishlistIds.length})</span>
                </button>
              </div>

              {cartCount > 0 && (
                <button
                  type="button"
                  onClick={openCartWhatsAppOrder}
                  className="px-2.5 py-1 bg-[#252525] text-[#FFFDF8] text-[10px] font-medium hover:bg-[#363636] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Checkout Bag
                </button>
              )}
            </div>

            {/* Voice Error / Permission Banner */}
            {voiceError && (
              <div className="px-3.5 py-2 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>{voiceError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setVoiceError(null)}
                  className="text-amber-800 hover:text-amber-950 font-medium cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Multilingual Voice & Text Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-2.5 sm:p-3 bg-[#FFFDF8] border-t border-[#252525]/12 flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                onClick={() => void toggleVoiceInput()}
                disabled={isTranscribing}
                aria-label={isListening ? 'Stop recording and send voice' : 'Start voice command'}
                title={isListening ? 'Tap to stop & send' : 'Speak in any language'}
                className={`w-11 h-11 shrink-0 flex items-center justify-center border transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-[#F8F5EF] text-[#252525] border-[#252525]/15 hover:border-[#C6A15B]'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... tap Mic to send'
                    : isTranscribing
                    ? 'Transcribing speech...'
                    : 'Ask in English, Urdu, Roman Urdu, Hindi, Arabic...'
                }
                aria-label="Ask Noor AI in any supported language"
                className="flex-1 min-w-0 px-3 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/15 text-xs sm:text-sm text-[#252525] placeholder:text-[#252525]/45 focus:outline-none focus:border-[#C6A15B]"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking || isTranscribing}
                aria-label="Send message"
                className="w-11 h-11 shrink-0 flex items-center justify-center bg-[#252525] text-[#FFFDF8] hover:bg-[#363636] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#C6A15B]" />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
