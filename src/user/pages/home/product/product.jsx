import React, { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import { ShoppingCart, Eye, Heart, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { toast } from "react-toastify";

import "./product.scss";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../../utils/imageUtils";
import placeholderImg from "../../../../assets/images/1.webp";

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const BookCategoryBlock = React.memo(({
  book,
  bookProducts,
  settings,
  goToProduct,
  addToCart,
  toggleWishlist,
  isInWishlist,
  navigate,
  requireLogin,
}) => {
  const sliderRef = useRef(null);
  const bookId = book.id || book._id;

  return (
    <div className="category-block">
      <div className="block-header">
        <div className="header-info">
          <h2 className="block-title">{book.name}</h2>
        </div>

        {/* Right side: nav arrows + view all */}
        <div className="header-controls">
          <div className="slider-nav-btns">
            <button
              className="slider-nav-btn"
              onClick={() => sliderRef.current?.slickPrev()}
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="slider-nav-btn"
              onClick={() => sliderRef.current?.slickNext()}
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link to={`/books/${bookId}`} className="view-all-link">
            View All <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <Slider ref={sliderRef} {...settings} className="premium-slider">
        {bookProducts.map((item, idx) => {
          let imgs = item.images;
          if (typeof imgs === "string") {
            try {
              imgs = JSON.parse(imgs);
            } catch (e) {
              imgs = [];
            }
          }

          const imgUrl = item.image || (Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null) || placeholderImg;
          const itemId = item.id || item._id;
          const isInactive = item.isActive === false;

          return (
            <div key={itemId} className="slider-item">
              <div
                className={`product-card ${isInactive ? "is-inactive" : "is-active"}`}
                onClick={() => goToProduct(itemId)}
              >
                <div className="card-media">
                  <div className="media-frame">
                    <img
                      src={getOptimizedImageUrl(imgUrl, { width: 520 })}
                      srcSet={getImageSrcSet(imgUrl)}
                      sizes="(max-width: 480px) 88vw, (max-width: 768px) 45vw, (max-width: 1200px) 30vw, 22vw"
                      alt={item.title}
                      loading="lazy"
                      width="520"
                      height="650"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(item);
                      }}
                      title="Add to Wishlist"
                    >
                      <Heart size={18} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToProduct(itemId);
                      }}
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
                  <span className={`availability-tag ${isInactive ? "inactive" : "active"}`}>
                    {isInactive ? "Inactive" : "Active"}
                  </span>
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

const BookProductSliders = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();

  const [books, setBooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [slidesToShow, setSlidesToShow] = useState(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookRes = await api.get("/api/books");
        const bookList = bookRes.data?.data || bookRes.data || [];
        setBooks(bookList);

        // Fetch products per book type (not one global "newest 20" query) —
        // otherwise a book type with fewer/older listings (e.g. AI Notes,
        // Mastery) gets crowded out entirely by whichever type was updated
        // most recently (e.g. IMPQS), and its homepage section never shows.
        const perBookResults = await Promise.all(
          bookList.map((book) => {
            const bookId = book.id || book._id;
            return api.get("/api/products", { params: { bookId, limit: 20 } })
              .then((res) => res.data?.data || res.data || [])
              .catch(() => []);
          })
        );
        setProducts(perBookResults.flat());
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const settings = React.useMemo(
    () => ({
      arrows: false,
      infinite: true,
      speed: 700,
      autoplay: true,
      autoplaySpeed: 2800,
      cssEase: "ease-out",
      pauseOnHover: true,
      pauseOnFocus: true,
      slidesToShow,
      slidesToScroll: 1,
      dots: false,
      responsive: [
        { breakpoint: 1200, settings: { slidesToShow: 3, dots: false } },
        { breakpoint: 768, settings: { slidesToShow: 2, dots: false } },
        { breakpoint: 480, settings: { slidesToShow: 1, dots: false } },
      ],
    }),
    [slidesToShow]
  );

  const goToProduct = React.useCallback((id) => {
    navigate(`/productpage/${id}`);
  }, [navigate]);

  if (loading) return null;

  return (
    <section className="product-showcase">
      <div className="container">
        {books.map((book) => {
          const bookId = book.id || book._id;
          const bookProducts = products.filter((p) => p.bookId === bookId);
          if (!bookProducts.length) return null;

          return (
            <BookCategoryBlock
              key={bookId}
              book={book}
              bookProducts={bookProducts}
              settings={settings}
              goToProduct={goToProduct}
              addToCart={addToCart}
              toggleWishlist={toggleWishlist}
              isInWishlist={isInWishlist}
              navigate={navigate}
              requireLogin={requireLogin}
            />
          );
        })}
      </div>
    </section>
  );
};

export default BookProductSliders;
