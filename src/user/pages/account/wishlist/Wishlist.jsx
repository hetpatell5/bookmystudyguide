import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Eye, Heart, ShoppingCart, Sparkles, Trash2, CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import placeholderImg from "../../../../assets/images/1.webp";
import "./Wishlist.scss";

const formatPrice = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const getImageUrl = (item) => item.image || placeholderImg;

const Wishlist = () => {
  const navigate = useNavigate();
  const { addToCart: addToCartContext } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get("/api/wishlist");
      if (data.success) {
        setWishlist(data.data.products || []);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (productId) => {
    try {
      const { data } = await api.delete(`/api/wishlist/remove/${productId}`);
      if (data.success) {
        setWishlist((current) => current.filter((item) => item.productId !== productId));
        toast.success("Removed from wishlist");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing item");
    }
  };

  const addToCart = async (product) => {
    const success = await addToCartContext(product, 1);
    if (success) {
      toast.success("Added to cart");
    } else {
      toast.error("Please log in to add items to cart");
    }
  };

  const moveToCart = async (item) => {
    const success = await addToCartContext({ ...item, type: item.type || "hard" }, 1);
    if (success !== false) {
      await removeFromWishlist(item.productId);
      toast.success("Moved to cart");
    } else {
      toast.error("Please log in to continue");
    }
  };

  const buyAll = async () => {
    if (wishlist.length === 0) return;
    let added = 0;
    for (const item of wishlist) {
      const success = await addToCartContext({ ...item, type: "hard" }, 1);
      if (success) added += 1;
    }
    if (added > 0) {
      toast.success(`${added} item${added > 1 ? "s" : ""} added to cart`);
      navigate("/cart");
    } else {
      toast.error("Please log in to continue");
    }
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-loading">
            <div className="spinner" />
            <p>Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <section className="wishlist-hero">
        <div className="container">
          <button className="wishlist-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="wishlist-hero__content">
            <span className="wishlist-eyebrow">
              <Sparkles size={14} />
              Saved For Later
            </span>
            <h1>
              <Heart size={30} fill="currentColor" />
              My Wishlist
            </h1>
            <p>
              Keep your favorite study materials in one place and move them to cart whenever
              you&apos;re ready.
            </p>
          </div>

          <div className="wishlist-summary">
            <div className="wishlist-summary__card">
              <strong>{wishlist.length}</strong>
              <span>Saved Items</span>
            </div>
            <div className="wishlist-summary__card">
              <strong>{formatPrice(wishlist.reduce((sum, item) => sum + Number(item.price || 0), 0))}</strong>
              <span>Total Value</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wishlist-shell">
        <div className="container">
          {wishlist.length === 0 ? (
            <div className="wishlist-empty">
              <div className="wishlist-empty__icon">
                <Heart size={48} />
              </div>
              <h2>Your wishlist is empty</h2>
              <p>Browse our catalog and save the books or guides you want to revisit later.</p>
              <Link to="/" className="wishlist-primary-link">
                Explore Materials
              </Link>
            </div>
          ) : (
            <>
              <div className="wishlist-toolbar">
                <p>
                  <strong>{wishlist.length}</strong> item{wishlist.length > 1 ? "s" : ""} saved
                </p>
                <div className="wishlist-toolbar__actions">
                  <button className="wishlist-buy-all-btn" onClick={buyAll}>
                    <CreditCard size={16} />
                    Buy All
                  </button>
                  <Link to="/" className="wishlist-secondary-link">
                    Continue Shopping
                  </Link>
                </div>
              </div>

              <div className="wishlist-grid">
                {wishlist.map((item) => (
                  <article key={item.productId} className="wishlist-card">
                    <button
                      className="wishlist-card__remove"
                      onClick={() => removeFromWishlist(item.productId)}
                      title="Remove from wishlist"
                    >
                      <Trash2 size={17} />
                    </button>

                    <div
                      className="wishlist-card__media"
                      onClick={() => navigate(`/productpage/${item.productId}`)}
                    >
                      <div className="wishlist-card__frame">
                        <img
                          src={getOptimizedImageUrl(getImageUrl(item), { width: 420 })}
                          alt={item.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = placeholderImg;
                          }}
                        />
                      </div>
                    </div>

                    <div className="wishlist-card__content">
                      <h3>{item.name}</h3>
                      <p className="wishlist-card__price">{formatPrice(item.price)}</p>

                      <div className="wishlist-card__actions">
                        <button className="wishlist-add-btn" onClick={() => addToCart(item)}>
                          <ShoppingCart size={17} />
                          Add to Cart
                        </button>
                        <button className="wishlist-move-btn" onClick={() => moveToCart(item)} title="Move to cart and remove from wishlist">
                          <ShoppingCart size={15} />
                          Move to Cart
                        </button>
                        <button
                          className="wishlist-view-btn"
                          onClick={() => navigate(`/productpage/${item.productId}`)}
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Wishlist;
