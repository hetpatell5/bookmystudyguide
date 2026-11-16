import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Eye, Heart, Search, ShoppingCart,
} from "lucide-react";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { useUserExperience } from "../../../../context/UserExperienceContext";
import { toast } from "react-toastify";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../../utils/imageUtils";
import placeholderImg from "../../../../assets/images/1.webp";
import "./BookProducts.scss";

const PAGE_SIZE = 20;

const formatPrice = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const getImageUrl = (item) => {
  let imgs = item.images;

  if (typeof imgs === "string") {
    try {
      imgs = JSON.parse(imgs);
    } catch {
      imgs = [];
    }
  }

  return item.image || (Array.isArray(imgs) && imgs[0]) || placeholderImg;
};

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
};

export default function BookProducts() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { requireLogin } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { preferences } = useUserExperience();

  const [book, setBook] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [bookId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, bookId, preferences?.subDegree?.id]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await api.get(`/api/books/${bookId}`);
        setBook(response.data?.data || response.data || null);
      } catch (err) {
        console.error("Error fetching book:", err);
        setBook(null);
      }
    };

    fetchBook();
  }, [bookId]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      try {
        const params = {
          bookId,
          page,
          limit: PAGE_SIZE,
          search: searchTerm || undefined,
          sort: sortBy === "latest" ? undefined : sortBy,
        };

        if (preferences?.subDegree?.id) {
          params.subDegreeId = preferences.subDegree.id;
        }

        const response = await api.get("/api/products", { params });

        setProducts(response.data?.data || []);
        setPagination(response.data?.pagination || { total: 0, page: 1, pages: 1, limit: PAGE_SIZE });
      } catch (err) {
        console.error("Error fetching paginated book products:", err);
        setProducts([]);
        setPagination({ total: 0, page: 1, pages: 1, limit: PAGE_SIZE });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [bookId, page, searchTerm, sortBy, preferences?.subDegree?.id]);

  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page || page, pagination.pages || 1),
    [page, pagination.page, pagination.pages]
  );

  const pageStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const pageEnd = pagination.total === 0
    ? 0
    : Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="bp-page">
      <section className="bp-hero">
        <div className="container bp-hero__inner">
          <button className="bp-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="bp-hero__content">
            <span className="bp-eyebrow">Important Question Bank with Solutions</span>
            <h1>{book?.name || "Book Collection"}</h1>
            <p>
              Explore exam-focused study material with a cleaner catalog view, quick purchase
              actions, and backend-powered pagination.
            </p>
          </div>
        </div>
      </section>

      <section className="bp-shell">
        <div className="container">
          <div className="bp-toolbar">
            <div className="bp-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search by book title"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <div className="bp-toolbar__actions">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="latest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title-asc">Title: A to Z</option>
                <option value="title-desc">Title: Z to A</option>
              </select>
            </div>
          </div>

          <div className="bp-results">
            <p>
              Showing <strong>{pageStart}-{pageEnd}</strong> of <strong>{pagination.total}</strong> items
            </p>
            {searchTerm && <span className="bp-results__search">Search: {searchTerm}</span>}
          </div>

          {loading ? (
            <div className="bp-state">
              <h3>Loading books...</h3>
              <p>We&apos;re fetching the next set of study material for this book.</p>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="bp-grid">
                {products.map((item) => {
                  const itemId = item.id || item._id;
                  const isInactive = item.isActive === false;
                  const imageUrl = getImageUrl(item);
                  const discount = item.mrp > item.price
                    ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
                    : 0;

                  return (
                    <article
                      key={itemId}
                      className={`bp-card ${isInactive ? "is-inactive" : ""}`}
                      onClick={() => !isInactive && navigate(`/productpage/${itemId}`)}
                    >
                      <div className="bp-card__media">
                        <div className="bp-card__frame">
                          <img
                            src={getOptimizedImageUrl(imageUrl, { width: 520 })}
                            srcSet={getImageSrcSet(imageUrl)}
                            sizes="(max-width: 480px) 92vw, (max-width: 768px) 44vw, (max-width: 1200px) 30vw, 22vw"
                            alt={item.title}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = placeholderImg;
                              event.currentTarget.srcset = "";
                            }}
                          />
                        </div>

                        {discount > 0 && <span className="bp-card__discount">{discount}% OFF</span>}

                        <div className="bp-card__actions">
                          <button
                            className={`bp-icon-btn ${isInWishlist(itemId) ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleWishlist(item);
                            }}
                            title="Add to wishlist"
                          >
                            <Heart size={17} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                          </button>
                          <button
                            className="bp-icon-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/productpage/${itemId}`);
                            }}
                            title="View details"
                          >
                            <Eye size={17} />
                          </button>
                        </div>

                        {isInactive && (
                          <div className="bp-card__overlay">
                            <span>Currently Unavailable</span>
                          </div>
                        )}
                      </div>

                      <div className="bp-card__info">
                        <h3>{item.title}</h3>

                        <div className="bp-card__price">
                          <span className="bp-card__current">{formatPrice(item.price)}</span>
                          {item.mrp > item.price && (
                            <span className="bp-card__mrp">{formatPrice(item.mrp)}</span>
                          )}
                        </div>

                        <div className="bp-card__footer">
                          <button
                            className="bp-buy-btn"
                            disabled={isInactive}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isInactive) return;
                              requireLogin(async () => {
                                const success = await addToCart(item);
                                if (success !== false) navigate("/checkout");
                              });
                            }}
                          >
                            {isInactive ? "Unavailable" : "Buy Now"}
                          </button>
                          <button
                            className="bp-cart-btn"
                            disabled={isInactive}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isInactive) return;
                              requireLogin(async () => {
                                const success = await addToCart(item);
                                if (success !== false) toast.success("Added to cart");
                              });
                            }}
                            title="Add to cart"
                          >
                            <ShoppingCart size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {(pagination.pages || 1) > 1 && (
                <div className="bp-pagination">
                  <button
                    className="bp-page-btn bp-page-btn--nav"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  <div className="bp-pagination__numbers">
                    {pageNumbers.map((pageNumber, index) => {
                      const previous = pageNumbers[index - 1];
                      const shouldShowDots = previous && pageNumber - previous > 1;

                      return (
                        <React.Fragment key={pageNumber}>
                          {shouldShowDots && <span className="bp-page-dots">...</span>}
                          <button
                            className={`bp-page-btn ${pagination.page === pageNumber ? "active" : ""}`}
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <button
                    className="bp-page-btn bp-page-btn--nav"
                    onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bp-state">
              <h3>No books found</h3>
              <p>Try a different search term or move back to the previous page.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
