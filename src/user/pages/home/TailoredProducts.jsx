import React, { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import { ShoppingCart, Eye, Heart, ArrowRight, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../api";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { useAuth } from "../../../context/logintrue";
import { useUserExperience } from "../../../context/UserExperienceContext";
import { toast } from "react-toastify";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./TailoredProducts.scss";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../utils/imageUtils";
import placeholderImg from "../../../assets/images/1.webp";

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const TailoredCategoryBlock = React.memo(({
  title,
  products,
  settings,
  goToProduct,
  addToCart,
  toggleWishlist,
  isInWishlist,
  navigate,
  requireLogin,
  bookId,
  mainDegreeId,
  subDegreeId
}) => {
  const sliderRef = useRef(null);

  if (!products || products.length === 0) return null;

  return (
    <div className="tailored-category-block category-block">
      <div className="block-header">
        <div className="header-info">
          <h2 className="block-title">{title}</h2>
        </div>
        <div className="header-controls">
          {bookId && mainDegreeId && subDegreeId && (
            <Link to={`/categorized-products/${bookId}/${mainDegreeId}/${subDegreeId}`} className="view-all-link">
              View All <ArrowRight size={16} />
            </Link>
          )}
          <div className="slider-nav-btns">
            <button className="slider-nav-btn" onClick={() => sliderRef.current?.slickPrev()} aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <button className="slider-nav-btn" onClick={() => sliderRef.current?.slickNext()} aria-label="Next">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <Slider ref={sliderRef} {...settings} className="premium-slider">
        {products.map((item) => {
          let imgs = item.images;
          if (typeof imgs === "string") {
            try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
          }
          const imgUrl = item.image || (Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null) || placeholderImg;
          const itemId = item.id || item._id;
          const isInactive = item.isActive === false;

          return (
            <div key={itemId} className="slider-item">
              <div className={`product-card ${isInactive ? "is-inactive" : "is-active"}`} onClick={() => goToProduct(itemId)}>
                <div className="card-media">
                  <div className="media-frame">
                    <img
                      src={getOptimizedImageUrl(imgUrl, { width: 520 })}
                      srcSet={getImageSrcSet(imgUrl)}
                      sizes="(max-width: 480px) 88vw, (max-width: 768px) 45vw, (max-width: 1200px) 30vw, 22vw"
                      alt={item.title}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = placeholderImg;
                        e.currentTarget.srcset = "";
                      }}
                    />
                  </div>
                  <div className="card-actions">
                    <button
                      className={`action-btn wishlist-btn ${isInWishlist(itemId) ? "active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}
                      title="Add to Wishlist"
                    >
                      <Heart size={18} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) => { e.stopPropagation(); goToProduct(itemId); }}
                      title="Quick View"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                  {item.mrp > item.price && (
                    <span className="discount-tag">
                      {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                    </span>
                  )}
                  {isInactive && (
                    <div className="inactive-overlay">
                      <span>Currently Unavailable</span>
                    </div>
                  )}
                </div>

                <div className="card-info">
                  <h3 className="product-title">{item.title}</h3>
                  <div className="product-price">
                    <span className="current">{formatPrice(item.price)}</span>
                    {item.mrp && <span className="mrp">{formatPrice(item.mrp)}</span>}
                  </div>
                  <div className="card-footer">
                    <button
                      className={`buy-btn ${isInactive ? "disabled" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInactive) return;
                        requireLogin(async () => {
                          const success = await addToCart(item);
                          if (success !== false) navigate("/checkout");
                        });
                      }}
                      disabled={isInactive}
                    >
                      {isInactive ? "Unavailable" : "Buy Now"}
                    </button>
                    <button
                      className={`cart-btn ${isInactive ? "disabled" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInactive) return;
                        requireLogin(async () => {
                          const success = await addToCart(item);
                          if (success !== false) toast.success("Added to cart");
                        });
                      }}
                      disabled={isInactive}
                      title={isInactive ? "Currently unavailable" : "Add to cart"}
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
});

export default function TailoredProducts() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();
  const { preferences, openCustomizeModal, clearPreferences } = useUserExperience();

  const [bookGroups, setBookGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slidesToShow, setSlidesToShow] = useState(4);

  useEffect(() => {
    if (preferences.subDegree && preferences.subDegree.id) {
      setLoading(true);
      api.get(`/api/products/tailored?subDegreeId=${preferences.subDegree.id}&perBookLimit=8`)
        .then((res) => {
          const data = res.data?.success ? res.data.data : (res.data?.data || res.data || []);
          setBookGroups(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setBookGroups([]);
    }
  }, [preferences.subDegree]);

  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth;
      if (w <= 480) setSlidesToShow(1);
      else if (w <= 768) setSlidesToShow(2);
      else if (w <= 1024) setSlidesToShow(3);
      else setSlidesToShow(4);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const settings = React.useMemo(() => ({
    arrows: false,
    infinite: false,
    speed: 500,
    autoplay: false,
    cssEase: "ease-out",
    slidesToShow,
    slidesToScroll: 1,
    dots: false,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  }), [slidesToShow]);

  const goToProduct = React.useCallback((id) => navigate(`/productpage/${id}`), [navigate]);

  if (!preferences.subDegree) {
      return (
          <section className="tailored-prompt-section">
              <div className="container">
                  <div className="tp-prompt-card">
                      <div className="tp-prompt-icon"><Settings size={32} /></div>
                      <div className="tp-prompt-content">
                          <h3>Personalize Your Experience</h3>
                          <p>Select your course and stream to instantly see AI Notes, IMPQS, and Mastery Guides tailored exactly for you.</p>
                      </div>
                      <button className="tp-prompt-btn" onClick={openCustomizeModal}>
                          Personalize Now
                      </button>
                  </div>
              </div>
          </section>
      );
  }

  if (loading) return null;

  if (!bookGroups.length) {
      return (
          <section className="tailored-prompt-section">
              <div className="container">
                  <div className="tp-prompt-card">
                      <div className="tp-prompt-content">
                          <h3>No tailored products found</h3>
                          <p>We couldn't find specific products for {preferences.subDegree.name} right now.</p>
                      </div>
                      <button className="tp-prompt-btn" onClick={openCustomizeModal}>
                          Change Preferences
                      </button>
                  </div>
              </div>
          </section>
      );
  }

  return (
    <section className="product-showcase tailored-showcase">
      <div className="container">
        <div className="tailored-header">
            <h2>Your Study Materials: <span className="degree-name">{preferences.subDegree.name}</span></h2>
            <button onClick={openCustomizeModal} className="tp-change-btn">Change Course</button>
        </div>

        {bookGroups.map((group) => (
          <TailoredCategoryBlock
            key={group.bookId}
            title={group.bookName}
            products={group.products}
            settings={settings}
            goToProduct={goToProduct}
            addToCart={addToCart}
            toggleWishlist={toggleWishlist}
            isInWishlist={isInWishlist}
            navigate={navigate}
            requireLogin={requireLogin}
            bookId={group.bookId}
            mainDegreeId={preferences.mainDegree?.id}
            subDegreeId={preferences.subDegree?.id}
          />
        ))}
      </div>
    </section>
  );
}
