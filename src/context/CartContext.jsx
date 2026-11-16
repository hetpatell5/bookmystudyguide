import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";
import AuthContext from "./logintrue";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { isLoggedIn, userId } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Cart from Backend
  const fetchCart = async () => {
    if (!userId) return; // Safety check
    try {
      setLoading(true);
      const res = await api.get(`/api/cart/${userId}`);

      // Handle standardized { success, data: { products: [] } }
      const cartData = res.data?.data || res.data;
      const products = cartData?.products?.map(item => ({
        ...item,
        productId: item.productId._id || item.productId,
        name: item.name || item.productName || "Unknown Item",
        image: item.image || (item.images && item.images[0]) || "/noimg.png",
        fileUrl: item.fileUrl || "",
        language: item.language || "",
        isSynopsis: item.isSynopsis || false,
        itemKind: item.itemKind || item.Product?.itemKind || "",
        bookId: item.bookId || item.Product?.bookId || null,
        mainDegreeId: item.mainDegreeId || item.Product?.mainDegreeId || null,
        subDegreeId: item.subDegreeId || item.Product?.subDegreeId || null,
        sku: item.sku || item.Product?.sku || null,
      })) || [];

      setCartItems(products);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("Fetch Cart Error:", err);
    }
  };

  // Run on login/logout
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [isLoggedIn, userId]);


  // 2. ADD TO CART FUNCTION (FIXED)
  const addToCart = async (product, qty = 1) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token && !isLoggedIn) return false;
    const effectiveUserId = userId || (await api.get("/api/auth/me").then(r => r.data?.user?._id || r.data?.user?.id).catch(() => null));
    if (!effectiveUserId) return false;

    const normalizedProductId = product.id || product._id || product.productId;
    const itemName = product.name || product.title || "Product";

    const itemImage = product.image
      ? product.image
      : (product.images && product.images.length > 0 ? product.images[0] : "/noimg.png");

    // 🔥 This is the item we store in State + Backend
    const newItem = {
      productId: normalizedProductId,
      name: itemName,
      sku: product.sku || null,
      price: product.price,
      image: itemImage,
      quantity: qty,
      type: product.type || 'hard',
      fileUrl: product.fileUrl || "", // ✅ CRITICAL: Must be here
      language: product.language || "", // ✅ Language variant (English / Hindi / etc.)
      isSynopsis: product.isSynopsis || false,
      itemKind: product.itemKind || (product.isSynopsis ? "synopsis" : product.items ? "combo" : "book"),
      bookId: product.bookId || null,
      mainDegreeId: product.mainDegreeId || null,
      subDegreeId: product.subDegreeId || null,
      // Multiple download links (e.g. a combo's digital bundle — one link
      // per included book) rendered as separate buttons in My Orders.
      productLinks: Array.isArray(product.productLinks) ? product.productLinks : [],
    };

    // A. Update Local State (Optimistic UI)
    setCartItems((prev) => {
      const index = prev.findIndex((p) => p.productId === normalizedProductId && p.type === newItem.type && p.language === newItem.language);
      if (index > -1) {
        const updated = [...prev];
        updated[index].quantity += qty;
        // Fix: If existing item didn't have link, add it now
        if (!updated[index].fileUrl && newItem.fileUrl) updated[index].fileUrl = newItem.fileUrl;
        return updated;
      }
      return [...prev, newItem];
    });

    // B. Send to Backend
    try {
      await api.post("/api/cart", {
        userId: effectiveUserId,
        product: {
          _id: normalizedProductId,
          name: itemName,
          price: product.price,
          image: itemImage,
          sku: newItem.sku,
          type: newItem.type,
          fileUrl: newItem.fileUrl,
          language: newItem.language,
          isSynopsis: newItem.isSynopsis,
          itemKind: newItem.itemKind,
          bookId: newItem.bookId,
          mainDegreeId: newItem.mainDegreeId,
          subDegreeId: newItem.subDegreeId,
        },
        quantity: qty
      });
      return true;
    } catch (err) {
      console.error("Add to Cart API Error:", err);
      fetchCart();
      return false;
    }
  };

  const updateQuantity = (id, type, newQty) => {
    if (newQty < 1) return;
    setCartItems(prev => prev.map(item =>
      (item.productId === id && item.type === type) ? { ...item, quantity: newQty } : item
    ));
    // Optional: Sync with backend via API call if needed
  };

  const removeFromCart = async (id, type) => {
    setCartItems(prev => prev.filter(item => !(item.productId === id && item.type === type)));
    if (isLoggedIn) {
      try {
        await api.delete(`/api/cart/${userId}/${id}/${type}`);
      } catch (err) {
        console.error(err);
        fetchCart();
      }
    }
  };


  const clearCart = async () => {
    setCartItems([]);
    if (isLoggedIn && userId) {
      try {
        await api.delete(`/api/cart/clear/${userId}`);
      } catch (err) {
        console.error("CartContext Clear Error:", err);
      }
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const hasHardCopy = cartItems.some(item => 
    item.type?.toLowerCase().includes("hard") || (item.isHardCopy !== false && !item.type?.toLowerCase().includes("soft"))
  );


  return (
    <CartContext.Provider value={{ 
      cartItems, addToCart, updateQuantity, removeFromCart, clearCart, 
      cartTotal, loading, cartCount, hasHardCopy 
    }}>
      {children}
    </CartContext.Provider>
  );
}
