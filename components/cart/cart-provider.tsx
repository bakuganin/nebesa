"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";

import { cartStore, createCartLine, createCartStore, type CartState } from "@/lib/cart/cart-store";

const storageKey = "nebesa-cart-v1";
const CartStoreContext = createContext<typeof cartStore | null>(null);

function readStoredItems() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => createCartLine(item));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof createCartStore>>();

  if (!storeRef.current) {
    storeRef.current = createCartStore();
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    store.getState().hydrate(readStoredItems());

    return store.subscribe((state) => {
      window.localStorage.setItem(storageKey, JSON.stringify(state.items));
    });
  }, []);

  return <CartStoreContext.Provider value={storeRef.current}>{children}</CartStoreContext.Provider>;
}

export function useCart<T>(selector: (state: CartState) => T): T {
  const store = useContext(CartStoreContext);

  if (!store) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return useStore(store, selector);
}
