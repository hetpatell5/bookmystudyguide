import React, { useEffect, useState, useRef, useCallback } from "react";
import { Star, ShoppingCart, Zap, Heart, Eye, BookOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { toast } from "react-toastify";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../../utils/imageUtils";
import { Helmet } from "react-helmet-async";
import "./FeaturedSectionPage.scss";

export default function FeaturedSectionPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { addToCart }  = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();
  const tabBarRef      = useRef(null);

  const [section,   setSection]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [tabData,   setTabData]   = useState({}); // cache: bookTypeId → products[]
  const [tabLoading, setTabLoading] = useState(false);

  // Load section metadata + book types (no products yet)
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSection = async () => {
      try {
        const res = await api.get(`/api/featured-sections/${id}`);
        if (res.data?.success) {
          const sec = res.data.data;
          setSection(sec);
          // Auto-load first tab
          if (sec.bookTypes?.length > 0) {
            fetchTabProducts(id, sec.bookTypes[0].id, 0);
          }
        }
      } catch (err) {
        console.error("Error fetching featured section:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSection();
  }, [id]);

  // Fetch products for a tab on demand — cached after first load
  const fetchTabProducts = useCallback(async (sectionId, bookTypeId, tabIdx) => {
    const cacheKey = bookTypeId;
    if (tabData[cacheKey]) {
      setActiveTab(tabIdx);
      return; // already cached
    }
    setTabLoading(true);
    setActiveTab(tabIdx);
    try {
      const res = await api.get(`/api/featured-sections/${sectionId}/tab/${bookTypeId}`);
      const products = res.data?.data || [];
      setTabData(prev => ({ ...prev, [cacheKey]: products }));
    } catch (err) {
      console.error("Tab fetch error:", err);
      setTabData(prev => ({ ...prev, [cacheKey]: [] }));
    } finally {
      setTabLoading(false);
    }
  }, [tabData]);

  const handleTabClick = (idx) => {
    if (!section?.bookTypes) return;
    const bt = section.bookTypes[idx];
    fetchTabProducts(id, bt.id, idx);
    // Scroll tab into view
    const tabEl = tabBarRef.current?.children[idx];
    tabEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const goToItem = (item) => {
    const itemId = item.id || item._id;
    navigate(item.isCombo ? `/combo/${itemId}` : `/productpage/${itemId}`);
  };

  // Get current tab's products
  const currentBookType = section?.bookTypes?.[activeTab];
  const currentProducts = currentBookType ? (tabData[currentBookType.id] || []) : [];

  // Degree display names
  const mainDegreeName = section?.mainDegrees?.[0]?.name || '';
  const subDegreeName  = section?.subDegrees?.[0]?.name  || '';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#1e3a8a' }} />
    </div>
  );

  if (!section) return (
    <div style={{ padding: "100px 20px", textAlign: "center" }}>
      <h2>Section Not Found</h2>
      <button onClick={() => navigate("/")} style={{ padding: "10px 24px", marginTop: 20, background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        Go Home
      </button>
    </div>
  );

  return (
    <div className="featured-section-page">
      <Helmet>
        <title>{section.title} | Book My Study Guide</title>
        <meta name="description" content={section.subtitle || `Browse curated books for ${section.title}`} />
      </Helmet>

      {/* ── Hero ── */}
      <div className="featured-hero">
        <div className="container">
          <span className="hero-badge">Featured Collection</span>
          <h1>{section.title}</h1>
          {/* Degree breadcrumb */}
          <div className="hero-degrees">
            {mainDegreeName && <span className="hero-degree hero-degree--main">{mainDegreeName}</span>}
            {subDegreeName  && <><span className="hero-degree-sep">›</span><span className="hero-degree hero-degree--sub">{subDegreeName}</span></>}
          </div>
          {section.subtitle && <p>{section.subtitle}</p>}
        </div>
      </div>

      <div className="container fsp-container">

        {/* ── Tab Slider Bar ── */}
        {section.bookTypes?.length > 0 && (
          <div className="fsp-tab-wrapper">
            <div className="fsp-tabs" ref={tabBarRef}>
              {section.bookTypes.map((bt, idx) => (
                <button
                  key={bt.id}
                  className={`fsp-tab ${activeTab === idx ? 'fsp-tab--active' : ''}`}
                  onClick={() => handleTabClick(idx)}
                >
                  <BookOpen size={15} />
                  <span>{bt.name}</span>
                </button>
              ))}
            </div>
            {/* Scroll indicators */}
            <div className="fsp-tab-fade fsp-tab-fade--left" />
            <div className="fsp-tab-fade fsp-tab-fade--right" />
          </div>
        )}

        {/* ── Active Tab Label ── */}
        {currentBookType && (
          <div className="fsp-section-heading">
            <div className="fsp-section-heading__line" />
            <h2>{currentBookType.name}</h2>
            <div className="fsp-section-heading__line" />
          </div>
        )}

        {/* ── Products ── */}
        {tabLoading ? (
          <div className="fsp-tab-loading">
            <Loader2 size={28} className="fsp-spin" />
            <span>Loading books…</span>
          </div>
        ) : currentProducts.length > 0 ? (
          <div className="products-grid">
            {currentProducts.map((item, idx) => {
              let imgs = item.images;
              if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
              const imgUrl  = item.image || (Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null);
              const itemId  = item.id || item._id;
              const discount = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;

              return (
                <div key={itemId} className="grid-item" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="product-card" onClick={() => goToItem(item)}>
                    <div className="card-media">
                      {imgUrl
                        ? <img src={getOptimizedImageUrl(imgUrl, { width: 400 })} srcSet={getImageSrcSet(imgUrl)} alt={item.title} loading="lazy" />
                        : <div className="card-media__placeholder" />
                      }
                      <div className="card-actions">
                        <button
                          className={`action-btn wishlist-btn ${isInWishlist(itemId) ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}
                        >
                          <Heart size={18} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                        </button>
                        <button className="action-btn" onClick={(e) => { e.stopPropagation(); goToItem(item); }}>
                          <Eye size={18} />
                        </button>
                      </div>
                      {discount > 0 && <span className="discount-tag">{discount}% OFF</span>}
                      <span className="featured-badge"><Star size={11} fill="currentColor" /> {item.isCombo ? "Combo" : "Featured"}</span>
                    </div>

                    <div className="card-info">
                      <h3 className="product-title">{item.title}</h3>
                      <div className="product-price">
                        <span className="current">₹{Number(item.price).toLocaleString('en-IN')}</span>
                        {item.mrp > item.price && <span className="mrp">₹{Number(item.mrp).toLocaleString('en-IN')}</span>}
                      </div>
                      <div className="card-footer">
                        <button className="buy-btn" onClick={(e) => {
                          e.stopPropagation();
                          requireLogin(async () => {
                            const success = await addToCart(item.isCombo ? { ...item, itemKind: "combo" } : item);
                            if (success !== false) navigate('/checkout');
                          });
                        }}>
                          <Zap size={14} fill="currentColor" /> Buy Now
                        </button>
                        <button className="cart-btn" onClick={(e) => {
                          e.stopPropagation();
                          requireLogin(async () => {
                            const success = await addToCart(item.isCombo ? { ...item, itemKind: "combo" } : item);
                            if (success !== false) toast.success("Added to cart");
                          });
                        }}>
                          <ShoppingCart size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={40} strokeWidth={1} />
            <h3>No books available in this category yet.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
