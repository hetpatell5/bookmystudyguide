import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const RecentlyViewedContext = createContext();

const STORAGE_KEY = "bmsg_recently_viewed";
const MAX_ITEMS = 10;

export function RecentlyViewedProvider({ children }) {
  const [recentItems, setRecentItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems));
    } catch {}
  }, [recentItems]);

  const pushRecentItem = useCallback((product) => {
    if (!product?.id) return;
    const item = {
      id: product.id,
      title: product.title,
      price: product.price,
      mrp: product.mrp,
      image: Array.isArray(product.images) ? product.images[0] : (product.image || ""),
      viewedAt: Date.now(),
    };
    setRecentItems((prev) => {
      const filtered = prev.filter((p) => String(p.id) !== String(product.id));
      return [item, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentItems, pushRecentItem, clearRecentItems }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
