import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Search,
  ShoppingCart,
  LogInIcon,
  User,
  MenuIcon,
  X,
  Heart,
  Home,
  Info,
  Phone,
  BookCopy,
  Layers,
  Sparkles,
  FileText,
  ChevronDown,
  MessageSquare,
  CheckCircle
} from "lucide-react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api";

// --- Assets & Context ---
import logo from "../../../assets/logos/logo1.png";
import "./header.scss";
import AuthContext from "../../../context/logintrue";

import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { useSiteConfig } from "../../../context/SiteConfigContext";
import { useUserExperience } from "../../../context/UserExperienceContext";

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function Header() {
  // --- State Management ---
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchInputRef = useRef(null);

  // --- Context Hooks ---
  const { isLoggedIn, requireLogin } = useContext(AuthContext);
  const { cartCount, addToCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { config } = useSiteConfig();
  const { preferences, openCustomizeModal } = useUserExperience();
  const navigate = useNavigate();
  const location = useLocation();

  const logoUrl = config.SITE_LOGO;

  const [contact, setContact] = useState(null);


  useEffect(() => {
    api.get("/api/contact").then((res) => {
      if (res.data) setContact(res.data);
    }).catch(err => console.error("Contact fetch error:", err));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setFilteredProducts([]); return; }

    const debounceTimer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/api/products/suggest?q=${encodeURIComponent(q)}&limit=10`);
        const data = res.data?.success ? res.data.data : (res.data?.data || res.data || []);
        setFilteredProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search suggest error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const openSearch = () => {
    setSearchOpen(true);
    setQuery("");
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const toggleMobile = () => setMobileOpen((s) => !s);
  const closeMobile = () => setMobileOpen(false);

  const handleSearchResultClick = (id) => {
    if (!id) return;
    closeSearch();
    navigate(`/productpage/${id}`);
  };

  const normalizeSearchProduct = (product) => ({
    ...product,
    id: product?.id || product?._id,
    _id: product?._id || product?.id,
    type: product?.type || "hard",
  });

  const handleSearchAddToCart = async (product) => {
    const normalized = normalizeSearchProduct(product);
    requireLogin(async () => {
      const success = await addToCart(normalized, 1);
      if (success !== false) toast.success("Added to cart");
    });
  };

  const handleSearchBuyNow = async (product) => {
    const normalized = normalizeSearchProduct(product);
    requireLogin(async () => {
      const success = await addToCart(normalized, 1);
      if (success !== false) {
        closeSearch();
        navigate("/checkout");
      }
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (searchOpen) closeSearch();
        if (mobileOpen) closeMobile();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = searchOpen || mobileOpen ? "hidden" : "";
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen, mobileOpen]);

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/", icon: <Home size={18} /> },
    { name: "Combo Books", path: "/combo-books", icon: <BookCopy size={18} /> },
    { name: "Projects", path: "/projects", icon: <Layers size={18} /> },

    { name: "About", path: "/about", icon: <Info size={18} /> },
    { name: "Contact", path: "/contact", icon: <Phone size={18} /> },
  ];

  return (
    <>
      <header className={`site-header-premium ${isScrolled ? "is-scrolled" : ""}`}>
        {/* Top utility bar */}
        <div className="header-topbar">
          <div className="topbar-inner">
            <span className="topbar-tagline" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookCopy size={13} /> Premium Study Materials for University Students
              </span>
              <span className="topbar-gstin" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <CheckCircle size={12} /> GSTIN: 24AANCB7927R1ZT
              </span>
            </span>
            <div className="topbar-actions">
              {isLoggedIn ? (
                <Link to="/profile" className="topbar-account-btn">
                  <User size={13} /> My Account
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="topbar-login-btn">
                    <LogInIcon size={13} /> Login
                  </Link>
                  <Link to="/auth" className="topbar-register-btn">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="header-main">
          <div className="container">
            <div className="header-inner">

              {/* Logo */}
              <div className="logo-area">
                <NavLink to="/" onClick={closeMobile}>
                  <img src={logoUrl || logo} alt="BMSG Logo" className="header-logo" />
                </NavLink>
              </div>

              {/* Desktop Nav */}
              <nav className="desktop-nav">
                <ul className="nav-list">
                  {navLinks.map((link) => (
                    <li key={link.name} className={link.name === "Projects" ? "nav-item-dropdown" : ""}>
                      {link.name === "Projects" ? (
                        <>
                          <span className={`nav-link ${location.pathname.startsWith("/projects") ? "active" : ""}`}>
                            {link.name} <ChevronDown size={13} className="dropdown-icon" />
                          </span>
                          <div className="dropdown-menu">
                            <NavLink to="/projects" className="dropdown-item">
                              <Layers size={15} /> Ready Product
                            </NavLink>
                            <NavLink to="/customized-project" className="dropdown-item">
                              <FileText size={15} /> Customised Project
                            </NavLink>
                          </div>
                        </>
                      ) : (
                        <NavLink to={link.path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                          {link.name}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Actions */}
              <div className="action-area">
                <button className="personalize-btn" onClick={openCustomizeModal} title="Personalize">
                  🎓 {preferences.subDegree ? preferences.subDegree.name : "Personalize"}
                </button>

                <button className="icon-btn search-trigger" onClick={openSearch} title="Search">
                  <Search size={18} />
                </button>

                <Link to="/wishlist" className="icon-btn wishlist-trigger" title="Wishlist">
                  <Heart size={18} />
                  {wishlistCount > 0 && <span className="count-badge">{wishlistCount}</span>}
                </Link>

                <Link to="/cart" className="icon-btn cart-trigger" title="Cart">
                  <ShoppingCart size={18} />
                  {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
                </Link>



                <button className="mobile-toggle-btn" onClick={toggleMobile}>
                  {mobileOpen ? <X size={22} /> : <MenuIcon size={22} />}
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer-premium ${mobileOpen ? "is-open" : ""}`}>
        <div className="drawer-header">
          <img src={logoUrl || logo} alt="Logo" className="drawer-logo" />
          <button className="close-drawer" onClick={closeMobile}><X size={22} /></button>
        </div>
        <div className="drawer-body">
          <ul className="mobile-nav">
            {navLinks.map((link) => (
              <li key={link.name}>
                {link.name === "Projects" ? (
                  <div className="mobile-dropdown-wrapper">
                    <div className="mobile-link-header">
                      {link.icon} <span>{link.name}</span>
                    </div>
                    <div className="mobile-dropdown-menu">
                      <NavLink to="/projects" onClick={closeMobile} className="mobile-sub-link">
                        <Layers size={14} /> Ready Product
                      </NavLink>
                      <NavLink to="/customized-project" onClick={closeMobile} className="mobile-sub-link">
                        <FileText size={14} /> Customised Project
                      </NavLink>
                    </div>
                  </div>
                ) : (
                  <NavLink to={link.path} onClick={closeMobile} className="mobile-link">
                    {link.icon} <span>{link.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="drawer-footer">
          {isLoggedIn ? (
            <Link to="/profile" onClick={closeMobile} className="mobile-auth-btn">
              <User size={18} /> My Account
            </Link>
          ) : (
            <Link to="/auth" onClick={closeMobile} className="mobile-auth-btn">
              <LogInIcon size={18} /> Sign In
            </Link>
          )}
        </div>
      </div>
      <div className={`drawer-overlay ${mobileOpen ? "is-active" : ""}`} onClick={closeMobile} />

      {/* Search Overlay */}
      <div className={`search-overlay-premium ${searchOpen ? "is-active" : ""}`}>
        <div className="search-overlay-header">
          <div className="search-box-wrapper">
            <Search size={22} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search study materials, books, projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="close-search" onClick={closeSearch}><X size={22} /></button>
          </div>
        </div>

        <div className="search-results-container">
          {query.trim().length >= 2 && (
            <div className="results-wrapper">
              {searchLoading ? (
                <div className="not-found"><p>Searching…</p></div>
              ) : filteredProducts.length > 0 ? (
                <div className="results-grid">
                  {filteredProducts.map((p) => {
                    const productId = p.id || p._id;
                    const price = Number(p.price || 0);
                    const mrp = Number(p.mrp || 0);
                    const showDiscount = mrp > price && price > 0;
                    const discountPct = showDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

                    return (
                      <div key={productId} className="search-result-card" onClick={() => handleSearchResultClick(productId)}>
                        <div className="card-media">
                          <div className="media-frame">
                            <img src={p.image || p.images?.[0] || logo} alt={p.title || p.name} />
                          </div>
                          {showDiscount && (
                            <span className="discount-tag">{discountPct}% OFF</span>
                          )}
                        </div>

                        <div className="card-info">
                          <h4 className="product-title">{p.title || p.name}</h4>
                          <p className="product-type">{p.bookName || p.category || "Study Material"}</p>
                          <div className="product-price">
                            <span className="current">{formatPrice(price)}</span>
                            {showDiscount && <span className="mrp">{formatPrice(mrp)}</span>}
                          </div>
                          <div className="card-footer">
                            <button
                              type="button"
                              className="buy-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSearchBuyNow(p);
                              }}
                            >
                              Buy Now
                            </button>
                            <button
                              type="button"
                              className="cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSearchAddToCart(p);
                              }}
                              aria-label="Add to cart"
                            >
                              <ShoppingCart size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="not-found">
                  <Sparkles size={42} />
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>
          )}
          {query.trim().length > 0 && query.trim().length < 2 && (
            <div className="results-wrapper">
              <div className="not-found"><p>Type at least 2 characters to search…</p></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
