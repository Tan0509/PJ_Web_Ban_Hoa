'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useToast } from '../ToastProvider';

type Product = {
  _id?: string;
  slug?: string;
  name: string;
  price?: number;
  salePrice?: number;
  images?: string[];
};

type CartItem = {
  product: Product;
  quantity: number;
  note?: string;
};

type StoreState = {
  favorites: Product[];
  cart: CartItem[];
  favoritesCount: number;
  cartCount: number;
  toggleFavorite: (product: Product) => void;
  addToCart: (product: Product, note?: string) => void;
  removeFromCart: (product: Product) => void;
  updateCartQuantity: (product: Product, quantity: number) => void;
  clearCart: () => void;
  hydrated: boolean;
};

const StoreContext = createContext<StoreState | null>(null);

const FAVORITES_KEY = 'favorites';
const CART_KEY = 'cart';

function getKey(product: Product) {
  return product._id?.toString?.() || product.slug || product.name;
}

function sanitizeProduct(product: Product): Product {
  return {
    _id: product._id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice,
    images: product.images || [],
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { addToast } = useToast();

  // Load from localStorage
  useEffect(() => {
    try {
      const favRaw = localStorage.getItem(FAVORITES_KEY);
      const cartRaw = localStorage.getItem(CART_KEY);
      if (favRaw) setFavorites(JSON.parse(favRaw));
      if (cartRaw) setCart(JSON.parse(cartRaw));
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, hydrated]);

  const toggleFavorite = (product: Product) => {
    const key = getKey(product);
    if (!key) return;
    
    // BEST PRACTICE: Determine action BEFORE state update (no side-effect in state updater)
    // Check current state synchronously to determine if we're adding or removing
    const currentExists = favorites.some((p) => getKey(p) === key);
    const isAdding = !currentExists;
    
    // Call toast ONCE, BEFORE state update (best practice - no side-effects in state updater)
    if (isAdding) {
      addToast(`✅ Đã thêm “${product.name}” vào danh sách yêu thích`, 'success');
    } else {
      addToast(`❌ Đã bỏ “${product.name}” khỏi danh sách yêu thích`, 'info');
    }
    
    // Update state ONLY (no side-effects here)
    setFavorites((prev) => {
      const exists = prev.some((p) => getKey(p) === key);
      if (exists) {
        return prev.filter((p) => getKey(p) !== key);
      }
      return [...prev, sanitizeProduct(product)];
    });
  };

  const addToCart = (product: Product, note?: string) => {
    const key = getKey(product);
    if (!key) return;
    // BEST PRACTICE: No side-effects inside state updater (React 18 Strict Mode can invoke twice in dev)
    const existsNow = cart.some((c) => getKey(c.product) === key);
    if (existsNow) {
      addToast(`➕ Đã cập nhật số lượng “${product.name}” trong giỏ hàng`, 'success');
    } else {
      addToast(`🛒 Đã thêm “${product.name}” vào giỏ hàng`, 'success');
    }

    setCart((prev) => {
      const idx = prev.findIndex((c) => getKey(c.product) === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1, note: note ?? next[idx].note };
        return next;
      }
      return [...prev, { product: sanitizeProduct(product), quantity: 1, note }];
    });
  };

  const removeFromCart = (product: Product) => {
    const key = getKey(product);
    if (!key) return;
    addToast(`🗑️ Đã xoá “${product.name}” khỏi giỏ hàng`, 'info');
    setCart((prev) => prev.filter((c) => getKey(c.product) !== key));
  };

  const updateCartQuantity = (product: Product, quantity: number) => {
    const key = getKey(product);
    if (!key) return;
    const qty = Math.max(0, Math.floor(quantity || 0));
    setCart((prev) => {
      const idx = prev.findIndex((c) => getKey(c.product) === key);
      if (idx < 0) return prev;
      if (qty <= 0) {
        return prev.filter((c) => getKey(c.product) !== key);
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: qty };
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const value = useMemo<StoreState>(() => {
    const favoritesCount = favorites.length;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return {
      favorites,
      cart,
      favoritesCount,
      cartCount,
      toggleFavorite,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      hydrated,
    };
  }, [favorites, cart]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
