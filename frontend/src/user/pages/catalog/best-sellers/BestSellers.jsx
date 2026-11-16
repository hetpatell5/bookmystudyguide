import React, { useEffect, useState } from "react";
import { Star, ShoppingCart, Zap, Heart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { toast } from "react-toastify";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../../utils/imageUtils";
import "./BestSellers.scss";

export default function BestSellers() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const res = await api.get("/api/products?limit=20");
        // For now, we mock "best sellers" by taking the first 20 products
        // In a real scenario, you'd have a specific endpoint or filter
        setProducts(res.data?.data || res.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching best sellers:", err);
        setLoading(false);
      }
    };
    fetchBestSellers();
  }, []);

  const goToProduct = (id) => {
    navigate(`/productpage/${id}`);
  };

  if (loading) return null;

  return (
    <div className="best-sellers-page">
      <div className="best-sellers-hero">
        <div className="container">
          <span className="hero-badge">Curated Collection</span>
          <h1><span>Best</span> Sellers</h1>
          <p>The most trusted study guides, chosen by thousands of successful students.</p>
        </div>
      </div>

      <div className="container">
        <div className="products-grid">
          {products.map((item, idx) => {
            let imgs = item.images;
            if (typeof imgs === 'string') {
              try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
            }
            const imgUrl = item.image || (Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null);
            const itemId = item.id || item._id;

            return (
              <div 
                key={itemId} 
                className="grid-item wow animate__fadeInUp" 
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="product-card" onClick={() => goToProduct(itemId)}>
                  <div className="card-media">
                    <img
                      src={getOptimizedImageUrl(imgUrl, { width: 400 })}
                      srcSet={getImageSrcSet(imgUrl)}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="card-actions">
                      <button
                        className={`action-btn wishlist-btn ${isInWishlist(itemId) ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}
                      >
                        <Heart size={18} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => { e.stopPropagation(); goToProduct(itemId); }}
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                    {item.mrp > item.price && (
                      <span className="discount-tag">
                        {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                      </span>
                    )}
                    <span className="bestseller-badge">
                      <Star size={12} fill="currentColor" /> Top Rated
                    </span>
                  </div>

                  <div className="card-info">
                    <h3 className="product-title">{item.title}</h3>
                    <div className="product-price">
                      <span className="current">₹{item.price}</span>
                      {item.mrp > item.price && <span className="mrp">₹{item.mrp}</span>}
                    </div>
                    <div className="card-footer">
                      <button
                        className="buy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          requireLogin(async () => {
                            const success = await addToCart(item);
                            if (success !== false) navigate("/checkout");
                          });
                        }}
                      >
                        <Zap size={14} fill="currentColor" /> Buy Now
                      </button>
                      <button
                        className="cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          requireLogin(async () => {
                            const success = await addToCart(item);
                            if (success !== false) toast.success("Added to cart");
                          });
                        }}
                      >
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
