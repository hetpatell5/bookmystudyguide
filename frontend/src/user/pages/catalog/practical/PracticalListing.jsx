import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, Layers, LayoutGrid, List, FlaskConical, Filter,
  ArrowRight, RefreshCcw, GraduationCap, Tag, ChevronDown, X, Lock, Check,
} from "lucide-react";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { useUserExperience } from "../../../../context/UserExperienceContext";
import "./PracticalListing.scss";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

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

const stripHtml = (text) => String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getCoverImage = (item) => {
  const images = Array.isArray(item.images)
    ? item.images
    : typeof item.images === "string"
      ? (() => { try { const p = JSON.parse(item.images); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : [];
  return images[Number(item.coverImageIndex || 0)] || images[0] || "";
};

function CustomSelect({ label, value, onChange, options, placeholder, disabled, lockedMsg }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (open && searchRef.current) { searchRef.current.focus(); setQuery(""); } }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    if (!value || value === "all") return null;
    return options.find((o) => o.value === value)?.label || null;
  }, [value, options]);

  const handleSelect = useCallback((val) => { onChange(val); setOpen(false); setQuery(""); }, [onChange]);
  const handleClear = useCallback((e) => { e.stopPropagation(); onChange("all"); setQuery(""); }, [onChange]);
  const isAllSelected = !value || value === "all";

  return (
    <div className={`csd-wrap${disabled ? " csd-disabled" : ""}${open ? " csd-open" : ""}`} ref={wrapRef}>
      <div className="csd-header">
        <span className="csd-header-label">{label}</span>
        <div className="csd-header-right">
          {!disabled && options.length > 0 && <span className="csd-count">{options.length}</span>}
          {disabled && lockedMsg && <span className="csd-lock-hint"><Lock size={10} />{lockedMsg}</span>}
          {!disabled && selectedLabel && <button className="csd-clear" onClick={handleClear}><X size={11} /> Clear</button>}
        </div>
      </div>
      <button type="button" className="csd-trigger" onClick={() => !disabled && setOpen((v) => !v)} disabled={disabled} aria-expanded={open}>
        <span className="csd-trigger-text">
          {disabled ? <span className="csd-dim">Select main degree first</span>
            : selectedLabel ? <span className="csd-active-val">{selectedLabel}</span>
            : <span className="csd-ph">{placeholder}</span>}
        </span>
        <ChevronDown size={15} className={`csd-arrow${open ? " up" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="csd-panel" role="listbox">
          <div className="csd-search">
            <Search size={13} className="csd-search-icon" />
            <input ref={searchRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" onKeyDown={(e) => e.key === "Escape" && setOpen(false)} />
            {query && <button className="csd-search-x" onClick={() => setQuery("")}><X size={11} /></button>}
          </div>
          <ul className="csd-list">
            <li className={`csd-opt csd-opt-all${isAllSelected ? " sel" : ""}`} onClick={() => handleSelect("all")}>
              {isAllSelected && <Check size={12} />}<span>All {label}s</span>
            </li>
            {filtered.length === 0 ? <li className="csd-empty">No results for "{query}"</li>
              : filtered.map((o) => (
                <li key={o.value} className={`csd-opt${value === o.value ? " sel" : ""}`} onClick={() => handleSelect(o.value)} role="option" aria-selected={value === o.value}>
                  {value === o.value && <Check size={12} />}<span>{o.label}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PracticalListing() {
  const navigate = useNavigate();
  const { preferences } = useUserExperience();

  const [items, setItems] = useState([]);
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: currentPage, limit: 24, type: "Practical" });
        if (preferences?.subDegree?.id) params.set("subDegreeId", preferences.subDegree.id);
        if (selectedSubDegree !== "all") params.set("subDegreeId", selectedSubDegree);
        if (selectedMainDegree !== "all") params.set("mainDegreeId", selectedMainDegree);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (sortBy === "price_low") params.set("sort", "price-asc");
        else if (sortBy === "price_high") params.set("sort", "price-desc");

        const res = await api.get(`/api/synopsis?${params}`);
        setItems(res.data?.data || []);
        if (res.data?.pagination) setPagination(res.data.pagination);
      } catch (err) {
        console.error("Error fetching practical data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preferences.subDegree, selectedMainDegree, selectedSubDegree, debouncedSearch, sortBy, currentPage]);

  useEffect(() => {
    api.get("/api/mainDegrees")
      .then(res => setMainDegrees(res.data?.success ? res.data.data : (res.data?.data || res.data || [])))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedMainDegree === "all") { setSubDegrees([]); return; }
    api.get(`/api/subDegrees?mainDegreeId=${selectedMainDegree}`)
      .then(res => setSubDegrees(res.data?.success ? res.data.data : (res.data?.data || res.data || [])))
      .catch(console.error);
  }, [selectedMainDegree]);

  const mainDegreeOptions = useMemo(() => mainDegrees.map((md) => ({ value: getEntityId(md), label: md.name })), [mainDegrees]);
  const subDegreeOptions = useMemo(() => subDegrees.map((sd) => ({ value: getEntityId(sd), label: sd.name })), [subDegrees]);

  const handleMainDegreeChange = useCallback((val) => { setSelectedMainDegree(val); setSelectedSubDegree("all"); setCurrentPage(1); }, []);
  const handleSubDegreeChange = useCallback((val) => { setSelectedSubDegree(val); setCurrentPage(1); }, []);

  const resetFilters = () => {
    setSearchTerm(""); setDebouncedSearch(""); setSelectedMainDegree("all");
    setSelectedSubDegree("all"); setSortBy("featured"); setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || selectedMainDegree !== "all" || selectedSubDegree !== "all";

  return (
    <div className="practical-listing-page">
      <Helmet>
        <title>Practical Reports | Book My Study Guide</title>
        <meta name="description" content="Browse and buy practical lab reports for your university degree. Filters by degree, subject, and more." />
      </Helmet>

      <section className="pl-hero">
        <div className="container">
          <div className="hero-copy">
            <p className="eyebrow"><FlaskConical size={14} /> Practical Catalog</p>
            <h1>Find &amp; Buy Practical Reports</h1>
            <p className="lead">Complete lab practical files ready for university submission.</p>
          </div>
          <div className="hero-stats">
            <div className="stat-card"><span className="number">{pagination.total}</span><span className="label">Total Practicals</span></div>
            <div className="stat-card"><span className="number">{mainDegrees.length}</span><span className="label">Degrees</span></div>
            <div className="stat-card"><span className="number">{items.length}</span><span className="label">Showing</span></div>
          </div>
        </div>
      </section>

      <div className="container project-shell">
        <aside className={`filters-panel${filterOpen ? " filters-panel--open" : ""}`}>
          <div className="panel-head">
            <h2><Filter size={16} /> Filter</h2>
            <div className="panel-head-right">
              <button type="button" className={`reset-btn${hasActiveFilters ? " reset-btn--active" : ""}`} onClick={resetFilters}>
                <RefreshCcw size={14} /> Reset
              </button>
              <button type="button" className="filter-toggle-btn" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
                {filterOpen ? <X size={16} /> : <Filter size={16} />}
                {filterOpen ? "Close" : "Filters"}{hasActiveFilters && !filterOpen && <span className="filter-badge" />}
              </button>
            </div>
          </div>

          <div className="field-block">
            <span className="field-label"><Search size={15} /> Search</span>
            <div className="search-field-wrap">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Title, subject, or degree" />
              {searchTerm && <button className="search-clear-btn" onClick={() => setSearchTerm("")}><X size={13} /></button>}
            </div>
          </div>

          <div className="field-block">
            <CustomSelect label="Main Degree" value={selectedMainDegree} onChange={handleMainDegreeChange} options={mainDegreeOptions} placeholder="All Degrees" />
          </div>
          <div className="field-block">
            <CustomSelect label="Sub Degree" value={selectedSubDegree} onChange={handleSubDegreeChange} options={subDegreeOptions} placeholder="All Sub-Degrees" disabled={selectedMainDegree === "all"} lockedMsg="Select main degree first" />
          </div>

          <div className="support-card">
            <h3>Need a Custom Practical?</h3>
            <p>Contact support for a tailored practical file for your specific subject.</p>
            <Link to="/contact" className="support-link">Contact Team <ArrowRight size={14} /></Link>
          </div>
        </aside>

        <main className="projects-content">
          <div className="projects-toolbar">
            <div className="left">
              <p>Showing <strong>{items.length}</strong> of <strong>{pagination.total}</strong> practicals</p>
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
              <div className="view-toggle" role="group">
                <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} title="Grid"><LayoutGrid size={18} /></button>
                <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} title="List"><List size={18} /></button>
              </div>
            </div>
          </div>

          {loading && <div className="pl-loading">Loading...</div>}

          {!loading && items.length > 0 ? (
            <div className={`projects-grid ${viewMode}`}>
              {items.map((s) => {
                const itemId = getEntityId(s);
                const coverImg = getCoverImage(s);
                const mainDegree = getEntityName(s.mainDegreeId, s.mainDegree || "");
                const subDegree = getEntityName(s.subDegreeId, s.subDegree || "");
                const excerpt = stripHtml(s.description).slice(0, 140);
                const discount = Number(s.mrp || 0) > Number(s.price || 0)
                  ? Math.round(((Number(s.mrp) - Number(s.price)) / Number(s.mrp)) * 100) : 0;

                return (
                  <article key={itemId} className="project-card" onClick={() => itemId && navigate(`/practical/${itemId}`)}>
                    <div className="media">
                      {coverImg ? <img src={getOptimizedImageUrl(coverImg)} alt={s.title} loading="lazy" /> : <div className="media-placeholder"><FlaskConical size={32} /></div>}
                      {discount > 0 && <span className="discount-pill">{discount}% OFF</span>}
                    </div>
                    <div className="body">
                      <div className="top-row">
                        <span className="meta-pill"><GraduationCap size={12} /> {mainDegree || "Practical"}</span>
                        {subDegree && <span className="meta-pill"><Tag size={12} /> {subDegree}</span>}
                      </div>
                      <h3>{s.title}</h3>
                      <p className="desc">{excerpt || "Complete practical lab file with structured, exam-ready content."}</p>
                      <div className="footer">
                        <div className="price-wrap">
                          <span className="price">{formatCurrency(s.price)}</span>
                          {Number(s.mrp || 0) > Number(s.price || 0) && <span className="mrp">{formatCurrency(s.mrp)}</span>}
                        </div>
                        <button type="button" className="open-btn" onClick={(e) => { e.stopPropagation(); if (itemId) navigate(`/practical/${itemId}`); }}>
                          View Details <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="empty-state">
                <div className="icon"><Search size={44} /></div>
                <h3>No practical reports found</h3>
                <p>Try a different keyword or clear filters.</p>
                <button type="button" onClick={resetFilters}>Reset Filters</button>
              </div>
            )
          )}

          {pagination.pages > 1 && (
            <div className="pagination-bar">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.pages)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="pg-dots">…</span>}
                    <button onClick={() => setCurrentPage(p)} className={p === currentPage ? "active" : ""}>{p}</button>
                  </React.Fragment>
                ))}
              <button disabled={currentPage >= pagination.pages} onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.pages))}>Next</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
