import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api";
import AuthContext from "./logintrue";
import { toast } from "react-toastify";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const [wishlist, setWishlist] = useState([]);
    const { isLoggedIn } = useContext(AuthContext);

    const fetchWishlist = async () => {
        if (!isLoggedIn) {
            setWishlist([]);
            return;
        }
        try {
            const { data } = await api.get("/api/wishlist");
            if (data.success) {
                setWishlist(data.data.products || []);
            }
        } catch (error) {
            console.error("Wishlist fetch error:", error);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, [isLoggedIn]);

    const toggleWishlist = async (product) => {
        if (!isLoggedIn) {
            toast.info("Please login to use wishlist");
            return false;
        }

        const isExist = wishlist.find((p) => p.productId === (product.id || product._id || product.productId));

        try {
            if (isExist) {
                // Remove
                const { data } = await api.delete(`/api/wishlist/remove/${product.id || product._id || product.productId}`);
                if (data.success) {
                    setWishlist(wishlist.filter((p) => p.productId !== (product.id || product._id || product.productId)));
                    toast.success("Removed from wishlist");
                }
            } else {
                // Add
                const payload = {
                    productId: product.id || product._id,
                    name: product.title || product.name,
                    price: product.price,
                    image: product.image || product.images?.[0],
                };
                const { data } = await api.post("/api/wishlist/add", payload);
                if (data.success) {
                    setWishlist([...wishlist, { ...payload, productId: payload.productId }]);
                    toast.success("Added to wishlist");
                }
            }
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
            return false;
        }
    };

    const isInWishlist = (productId) => {
        return wishlist.some((p) => p.productId === productId);
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                wishlistCount: wishlist.length,
                toggleWishlist,
                isInWishlist,
                fetchWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);
