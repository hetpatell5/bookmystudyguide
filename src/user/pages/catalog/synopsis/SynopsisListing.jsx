import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  Layers,
  LayoutGrid,
  List,
  FileText,
  Filter,
  ArrowRight,
  RefreshCcw,
  GraduationCap,
  Tag,
  ChevronDown,
  X,
  Lock,
  Check,
  ShoppingCart,
  Eye,
  Heart,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { useUserExperience } from "../../../../context/UserExperienceContext";
import placeholderImg from "../../../../assets/images/1.webp";
import "./SynopsisListing.scss";

/* ─── Helpers ─────────────────────────────────────────────── */
const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value._id || "");
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const getEntityName = (value, fallback = "") => {
  if (!value) return fallback;
  if (isUuid(value)) return fallback;
  if (typeof value === "string") return value;
  return value.name || fallback;
};

const stripHtml = (text) => {
  let str = String(text || "").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const getCoverImage = (synopsis) => {
  const images = Array.isArray(synopsis.images)
    ? synopsis.images
    : typeof synopsis.images === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(synopsis.images);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  const index = Number(synopsis.coverImageIndex || 0);
  return images[index] || images[0] || "https://via.placeholder.com/320x420?text=Project";
};

const getVariantSummary = (synopsis) => {
  const links = Array.isArray(synopsis.synopsisLinks) ? synopsis.synopsisLinks : [];
  const categories = [...new Set(links.map((l) => l.category).filter(Boolean))];
  const languages = [...new Set(links.map((l) => l.language).filter(Boolean))];
  return {
    categories: categories.length ? categories : ["Project"],
    languages: languages.length ? languages : ["English"],
  };
};

/* ─── Custom Searchable Dropdown ──────────────────────────── */
function CustomSelect({ label, value, onChange, options, placeholder, disabled, lockedMsg }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    if (!value || value === "all") return null;
    const match = options.find((o) => o.value === value);
    return match ? match.label : null;
  }, [value, options]);

  const handleSelect = useCallback((val) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange("all");
    setQuery("");
  }, [onChange]);

  const isAllSelected = !value || value === "all";

  return (
    <div className={`csd-wrap${disabled ? " csd-disabled" : ""}${open ? " csd-open" : ""}`} ref={wrapRef}>
      {/* ── Top row: label + count + clear ── */}
      <div className="csd-header">
        <span className="csd-header-label">{label}</span>
        <div className="csd-header-right">
          {!disabled && options.length > 0 && (
            <span className="csd-count">{options.length}</span>
          )}
          {disabled && lockedMsg && (
            <span className="csd-lock-hint"><Lock size={10} />{lockedMsg}</span>
          )}
          {!disabled && selectedLabel && (
            <button className="csd-clear" onClick={handleClear} title="Clear">
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Trigger ── */}
      <button
        type="button"
        className="csd-trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="csd-trigger-text">
          {disabled
            ? <span className="csd-dim">Select main degree first</span>
            : selectedLabel
              ? <span className="csd-active-val">{selectedLabel}</span>
              : <span className="csd-ph">{placeholder}</span>
          }
        </span>
        <ChevronDown size={15} className={`csd-arrow${open ? " up" : ""}`} />
      </button>

      {/* ── Dropdown panel ── */}
      {open && !disabled && (
        <div className="csd-panel" role="listbox">
          {/* Search */}
          <div className="csd-search">
            <Search size={13} className="csd-search-icon" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search…`}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />
            {query && (
              <button className="csd-search-x" onClick={() => setQuery("")}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* Options */}
          <ul className="csd-list">
            <li
              className={`csd-opt csd-opt-all${isAllSelected ? " sel" : ""}`}
              onClick={() => handleSelect("all")}
            >
              {isAllSelected && <Check size={12} />}
              <span>All {label}s</span>
            </li>

            {filtered.length === 0 ? (
              <li className="csd-empty">No results for "{query}"</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  className={`csd-opt${value === o.value ? " sel" : ""}`}
                  onClick={() => handleSelect(o.value)}
                  role="option"
                  aria-selected={value === o.value}
                >
                  {value === o.value && <Check size={12} />}
                  <span>{o.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function SynopsisListing() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();
  const { preferences } = useUserExperience();

  const [synopses, setSynopses] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 24 });
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMainDegree, setSelectedMainDegree] = useState("all");
  const [selectedSubDegree, setSelectedSubDegree] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch synopsis list from backend with all filters applied
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: currentPage, limit: 24 });
        if (preferences?.subDegree?.id) params.set("subDegreeId", preferences.subDegree.id);
        if (selectedSubDegree !== "all") params.set("subDegreeId", selectedSubDegree);
        if (selectedMainDegree !== "all") params.set("mainDegreeId", selectedMainDegree);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (sortBy === "latest") params.set("sort", "latest");
        else if (sortBy === "price_low") params.set("sort", "price-asc");
        else if (sortBy === "price_high") params.set("sort", "price-desc");

        const synRes = await api.get(`/api/synopsis?${params}`);
        setSynopses(synRes.data?.data || []);
        if (synRes.data?.pagination) setPagination(synRes.data.pagination);
      } catch (err) {
        console.error("Error fetching synopsis data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preferences.subDegree, selectedMainDegree, selectedSubDegree, debouncedSearch, sortBy, currentPage]);

  // Fetch degree lists once for filter dropdowns
  useEffect(() => {
    api.get("/api/mainDegrees")
      .then(res => setMainDegrees(res.data?.success ? res.data.data : (res.data?.data || res.data || [])))
      .catch(err => console.error("Error fetching main degrees:", err));
  }, []);

  // Load sub degrees only when a main degree is selected
  useEffect(() => {
    if (selectedMainDegree === "all") { setSubDegrees([]); return; }
    api.get(`/api/subDegrees?mainDegreeId=${selectedMainDegree}`)
      .then(res => setSubDegrees(res.data?.success ? res.data.data : (res.data?.data || res.data || [])))
      .catch(err => console.error("Error fetching sub degrees:", err));
  }, [selectedMainDegree]);

  /* Build option arrays for CustomSelect */
  const mainDegreeOptions = useMemo(
    () => mainDegrees.map((md) => ({ value: getEntityId(md), label: md.name })),
    [mainDegrees]
  );

  const subDegreeOptions = useMemo(
    () => subDegrees.map((sd) => ({ value: getEntityId(sd), label: sd.name })),
    [subDegrees]
  );

  const subDegreeDisabled = selectedMainDegree === "all";

  const handleMainDegreeChange = useCallback((val) => {
    setSelectedMainDegree(val);
    setSelectedSubDegree("all");
    setCurrentPage(1);
  }, []);

  const handleSubDegreeChange = useCallback((val) => {
    setSelectedSubDegree(val);
    setCurrentPage(1);
  }, []);

  const processedSynopses = synopses;
  const totalProjects = pagination.total;
  const visibleProjects = synopses.length;

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedMainDegree("all");
    setSelectedSubDegree("all");
    setSortBy("featured");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || selectedMainDegree !== "all" || selectedSubDegree !== "all";

  return (
    <div className="synopsis-listing-page">
      <Helmet>
        <title>Projects &amp; Guides | Book My Study Guide</title>
        <meta
          name="description"
          content="Browse project files and implementation guides with complete details, pricing, and category filters."
        />
      </Helmet>

      <section className="projects-hero">
        <div className="container">
          <div className="hero-copy">
            <p className="eyebrow"><FileText size={14} /> Project Catalog</p>
            <h1>Find &amp; Buy Projects Easily</h1>
            <p className="lead">
              Practical filters and full details on every card.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="number">{totalProjects}</span>
              <span className="label">Total Projects</span>
            </div>
            <div className="stat-card">
              <span className="number">{mainDegrees.length}</span>
              <span className="label">Main Degrees</span>
            </div>
            <div className="stat-card">
              <span className="number">{visibleProjects}</span>
              <span className="label">Showing</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container project-shell">
        <aside className={`filters-panel${filterOpen ? " filters-panel--open" : ""}`}>
          <div className="panel-head">
            <h2><Filter size={16} /> Filter Projects</h2>
            <div className="panel-head-right">
              <button
                type="button"
                className={`reset-btn${hasActiveFilters ? " reset-btn--active" : ""}`}
                onClick={resetFilters}
              >
                <RefreshCcw size={14} /> Reset
              </button>
              <button
                type="button"
                className="filter-toggle-btn"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
              >
                {filterOpen ? <X size={16} /> : <Filter size={16} />}
                {filterOpen ? "Close" : "Filters"}{hasActiveFilters && !filterOpen && <span className="filter-badge" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="field-block">
            <span className="field-label"><Search size={15} /> Search</span>
            <div className="search-field-wrap">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Title, subject, or degree"
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Main Degree */}
          <div className="field-block">
            <CustomSelect
              label="Main Degree"
              value={selectedMainDegree}
              onChange={handleMainDegreeChange}
              options={mainDegreeOptions}
              placeholder="All Degrees"
            />
          </div>

          {/* Sub Degree — cascades from main */}
          <div className="field-block">
            <CustomSelect
              label="Sub Degree"
              value={selectedSubDegree}
              onChange={handleSubDegreeChange}
              options={subDegreeOptions}
              placeholder="All Sub-Degrees"
              disabled={subDegreeDisabled}
              lockedMsg="Select main degree first"
            />
          </div>

          <div className="support-card">
            <h3>Need a Custom Project?</h3>
            <p>Talk to support for tailored topic-level customization and urgent delivery guidance.</p>
            <Link to="/contact" className="support-link">Contact Team <ArrowRight size={14} /></Link>
          </div>
        </aside>

        <main className="projects-content">
          <div className="projects-toolbar">
            <div className="left">
              <p>Showing <strong>{visibleProjects}</strong> of <strong>{totalProjects}</strong> projects</p>
            </div>
            <div className="right">
              <label className="sort-wrap">
                <span>Sort</span>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                  <option value="featured">Featured</option>
                  <option value="latest">Latest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </label>
              <div className="view-toggle" role="group" aria-label="Change view mode">
                <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} title="Grid view">
                  <LayoutGrid size={18} />
                </button>
                <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} title="List view">
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {loading && <div style={{textAlign:'center',padding:'32px',color:'#94a3b8'}}>Loading...</div>}
          {!loading && processedSynopses.length > 0 ? (
            <div className={`projects-grid ${viewMode}`}>
              {processedSynopses.map((s) => {
                const coverImg = getCoverImage(s);
                const mainDegree = getEntityName(s.mainDegreeId, s.mainDegree || s.mainDegreeName || "");
                const subDegree = getEntityName(s.subDegreeId, s.subDegree || s.subDegreeName || "");
                const subject = getEntityName(s.subjectId, s.subjectName || s.subject || "");
                const excerpt = stripHtml(s.description).slice(0, 140);
                const { categories, languages } = getVariantSummary(s);
                const discount =
                  Number(s.mrp || 0) > Number(s.price || 0)
                    ? Math.round(((Number(s.mrp) - Number(s.price)) / Number(s.mrp)) * 100)
                    : 0;
                const synopsisId = getEntityId(s);
                const isInactive = s.isActive === false;

                return (
                  <React.Fragment key={synopsisId || s.title}>
                    <article className="project-card desktop-only" onClick={() => synopsisId && navigate(`/projects/${synopsisId}`)}>
                      <div className="media">
                        <img src={getOptimizedImageUrl(coverImg)} alt={s.title} loading="lazy" />
                        {discount > 0 && <span className="discount-pill">{discount}% OFF</span>}
                      </div>
                      <div className="body">
                        <div className="top-row">
                          <span className="meta-pill"><GraduationCap size={12} /> {mainDegree}</span>
                          <span className="meta-pill"><Tag size={12} /> {subDegree}</span>
                        </div>
                        <h3>{s.title}</h3>
                        <p className="desc">{excerpt || "Complete project material with structured, exam-oriented content."}</p>
                        <div className="detail-grid">
                          <div><strong>Subject:</strong> {subject}</div>
                          <div><strong>Delivery:</strong> Instant</div>
                          <div><strong>Formats:</strong> {categories.join(" / ")}</div>
                          <div><strong>Language:</strong> {languages.join(" / ")}</div>
                        </div>
                        <div className="footer">
                          <div className="price-wrap">
                            <span className="price">{formatCurrency(s.price)}</span>
                            {Number(s.mrp || 0) > Number(s.price || 0) && <span className="mrp">{formatCurrency(s.mrp)}</span>}
                          </div>
                          <button type="button" className="open-btn" onClick={(e) => { e.stopPropagation(); if (synopsisId) navigate(`/projects/${synopsisId}`); }}>
                            View Details <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </article>

                    <div className="product-card mobile-only" onClick={() => synopsisId && navigate(`/projects/${synopsisId}`)}>
                      <div className="card-media">
                        <div className="media-frame">
                          <img
                            src={getOptimizedImageUrl(coverImg, { width: 520 })}
                            alt={s.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = placeholderImg;
                            }}
                          />
                        </div>
                        <div className="card-actions">
                          <button
                            className={`action-btn wishlist-btn ${isInWishlist(synopsisId) ? "active" : ""}`}
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(s); }}
                            title="Add to Wishlist"
                          >
                            <Heart size={18} fill={isInWishlist(synopsisId) ? "currentColor" : "none"} />
                          </button>
                          <button
                            className="action-btn"
                            onClick={(e) => { e.stopPropagation(); if (synopsisId) navigate(`/projects/${synopsisId}`); }}
                            title="Quick View"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                        {discount > 0 && <span className="discount-tag">{discount}% OFF</span>}
                      </div>

                      <div className="card-info">
                        <h3 className="product-title">{s.title}</h3>
                        <div className="product-price">
                          <span className="current">{formatCurrency(s.price)}</span>
                          {Number(s.mrp || 0) > Number(s.price || 0) && <span className="mrp">{formatCurrency(s.mrp)}</span>}
                        </div>
                        <div className="card-footer">
                          <button
                            className="buy-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              requireLogin(async () => {
                                const success = await addToCart({ ...s, isSynopsis: true });
                                if (success !== false) navigate("/checkout");
                              });
                            }}
                          >
                            Buy Now
                          </button>
                          <button
                            className="cart-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              requireLogin(async () => {
                                const success = await addToCart({ ...s, isSynopsis: true });
                                if (success !== false) toast.success("Added to cart");
                              });
                            }}
                            title="Add to cart"
                          >
                            <ShoppingCart size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="empty-state">
                <div className="icon"><Search size={44} /></div>
                <h3>No matching projects found</h3>
                <p>Try a different keyword or clear filters to explore all available projects.</p>
                <button type="button" onClick={resetFilters}>Reset Filters</button>
              </div>
            )
          )}

          {pagination.pages > 1 && (
            <div className="pagination-bar" style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'32px',flexWrap:'wrap'}}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',cursor:'pointer',background: currentPage <= 1 ? '#f8fafc' : '#fff'}}
              >
                Prev
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.pages)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{padding:'6px 4px',color:'#94a3b8'}}>…</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',cursor:'pointer',background: p === currentPage ? '#1e3a5f' : '#fff',color: p === currentPage ? '#fff' : '#374151',fontWeight: p === currentPage ? 700 : 400}}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))
              }
              <button
                disabled={currentPage >= pagination.pages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.pages))}
                style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',cursor:'pointer',background: currentPage >= pagination.pages ? '#f8fafc' : '#fff'}}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
