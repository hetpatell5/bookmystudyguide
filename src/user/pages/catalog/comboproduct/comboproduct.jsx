import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  ArrowRight,
  Tag,
  Globe,
  Search,
  Filter,
  Boxes,
  Zap,
} from "lucide-react";
import api from "../../../../api";
import { useCart } from "../../../../context/CartContext";
import { useAuth } from "../../../../context/logintrue";
import { useUserExperience } from "../../../../context/UserExperienceContext";
import { toast } from "react-toastify";
import { getOptimizedImageUrl, getImageSrcSet } from "../../../../utils/imageUtils";
import "./comboproduct.scss";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateDiscount = (mrp, price) => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const getComboId = (item) => item?._id || item?.id || "";
const isSoftType = (type) => /soft|digital/i.test(String(type || ""));
const toPlainText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const LANGUAGE_ALLOWLIST = new Set([
  "english",
  "hindi",
  "urdu",
  "punjabi",
  "bengali",
  "tamil",
  "telugu",
  "marathi",
  "gujarati",
  "odia",
  "kannada",
  "malayalam",
  "sanskrit",
  "hinglish",
  "bilingual",
]);

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

const getItemProduct = (item) => {
  if (!item) return null;
  if (item.product && typeof item.product === "object") return item.product;
  if (item.productId && typeof item.productId === "object") return item.productId;
  return null;
};

const getProductImage = (product) => {
  if (!product) return "";
  const images = parseImages(product.images);
  const idx = Number(product.coverImageIndex || 0);
  return images[idx] || images[0] || product.image || "";
};

const codeFromText = (value) => {
  const text = toPlainText(value);
  if (!text) return "";
  const compact = text.match(/\b([A-Z]{3,}\d{3}[A-Z]?)\b/);
  if (compact) return compact[1];
  const spaced = text.match(/\b([A-Z]{3,}\s\d{3}[A-Z]?)\b/);
  return spaced ? spaced[1].replace(/\s+/g, "") : "";
};

const codeFirstTitle = (title) => {
  const raw = toPlainText(title);
  if (!raw) return "";
  const code = codeFromText(raw);
  if (!code) return raw;
  const rest = raw.replace(code, "").replace(/\s+/g, " ").trim();
  return rest ? `${code} - ${rest}` : code;
};

const normalizeLanguageLabel = (value) => {
  const raw = toPlainText(value);
  if (!raw) return "";
  const parts = raw
    .split(/[/,|&+-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => LANGUAGE_ALLOWLIST.has(part.toLowerCase()));
  return [...new Set(parts)].join(" / ");
};

const ComboCard = React.memo(({ item, index, onOpen, onAddToCart }) => {
  const discount = calculateDiscount(item.cancelPrice, item.price);
  const itemCount = Array.isArray(item.items) ? item.items.length : 0;
  const links = item?.ProductLinks || item?.productLinks || [];
  const products = (item?.items || []).map(getItemProduct).filter(Boolean);
  const comboImages = parseImages(item?.gallery);
  const productImages = products.map((p) => getProductImage(p) || item?.image || "/noimg.png");
  const mediaImages = productImages.length
    ? [...new Set(productImages.filter(Boolean))]
    : [...new Set([item?.image, ...comboImages].filter(Boolean))];
  const bundleImage = mediaImages[0] || "/noimg.png";
  const mediaImagesKey = mediaImages.join("|");
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [item?.id, item?._id, mediaImagesKey]);

  React.useEffect(() => {
    if (mediaImages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % mediaImages.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [mediaImagesKey, mediaImages.length]);

  const normalizedLanguage = normalizeLanguageLabel(item.language);
  const linkLanguages = links.map((link) => normalizeLanguageLabel(link.language)).filter(Boolean);
  const detectedLangFromTitles = products.flatMap((p) => {
    const txt = `${p?.title || ""} ${p?.course || ""} ${p?.sku || ""}`.toLowerCase();
    const values = [];
    if (/\b(eng|english)\b/.test(txt)) values.push("English");
    if (/\b(hin|hindi)\b/.test(txt)) values.push("Hindi");
    return values;
  });
  const displayLanguages = [...new Set([
    ...linkLanguages,
    ...(normalizedLanguage ? [normalizedLanguage] : []),
    ...detectedLangFromTitles,
  ])]
    .filter(Boolean)
    .slice(0, 2);

  const formatValues = [...new Set(
    links.map((link) => (isSoftType(link.type) ? "Soft Copy" : "Hard Copy"))
  )];
  const titleCodes = [...new Set(
    products
      .map((p) => codeFromText(p?.title || p?.course || p?.sku || ""))
      .filter(Boolean)
  )];
  const rawTitle = toPlainText(item.title || "");
  const displayTitle = titleCodes.length
    ? `${titleCodes.slice(0, 3).join(" + ")} Combo`
    : (rawTitle || "Combo Bundle");
  const showRawSubtitle = rawTitle && rawTitle.toLowerCase() !== displayTitle.toLowerCase();
  const bookPreview = products
    .map((p) => codeFirstTitle(p?.title || ""))
    .filter(Boolean)
    .slice(0, 3);
  const moreBooks = Math.max(products.length - bookPreview.length, 0);

  return (
    <article
      className="combo-card-v2"
      style={{ "--card-index": index }}
      onClick={() => onOpen(getComboId(item))}
      aria-label={item.title}
    >
      <div className="combo-card-media">
        <div className="media-frame">
          <img
            src={getOptimizedImageUrl(mediaImages[activeImageIndex] || bundleImage)}
            alt={item.title}
            loading="lazy"
          />
        </div>

        <div className="media-top-row">
          {discount > 0 && <span className="pill discount">Save {discount}%</span>}
          {mediaImages.length > 1 && (
            <span className="pill stock">{activeImageIndex + 1}/{mediaImages.length}</span>
          )}
        </div>

        <div className="media-bottom-row">
          <button type="button" className="view-details-btn">
            View Bundle <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="combo-card-body">
        <div className="meta-row">
          <span className="meta-badge">
            <Tag size={12} /> {item.mainDegree?.name || "IGNOU Combo"}
          </span>
          {displayLanguages.length > 0 && (
            <span className="meta-badge">
              <Globe size={12} /> {displayLanguages.join(" / ")}
            </span>
          )}
        </div>

        <h3 className="combo-title">{displayTitle}</h3>
        {showRawSubtitle && <p className="combo-subtitle">{rawTitle}</p>}

        <div className="quick-details">
          {formatValues.length > 0 && (
            <p><strong>Format:</strong> {formatValues.join(" / ")}</p>
          )}
          {bookPreview.length > 0 && (
            <div className="books-block" title={[...bookPreview, moreBooks > 0 ? `+${moreBooks} more` : ""].filter(Boolean).join(" | ")}>
              <p><strong>Books:</strong></p>
              <ul>
                {bookPreview.map((book, bookIdx) => (
                  <li key={`${book}-${bookIdx}`}>{book}</li>
                ))}
              </ul>
              {moreBooks > 0 && <span className="books-more">+{moreBooks} more</span>}
            </div>
          )}
        </div>

        <p className="bundle-note">
          <Boxes size={14} /> {itemCount} item{itemCount === 1 ? "" : "s"} included in this bundle.
        </p>

        <div className="price-row">
          <div className="price-stack">
            <span className="price-current">{formatCurrency(item.price)}</span>
            {discount > 0 && <span className="price-old">{formatCurrency(item.cancelPrice)}</span>}
          </div>

          <button
            type="button"
            className="add-btn"
            onClick={(e) => onAddToCart(e, item)}
          >
            <ShoppingCart size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
});

export default function Comboproduct() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [mainDegreeFilter, setMainDegreeFilter] = useState("all");
  const [subDegreeFilter, setSubDegreeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { requireLogin } = useAuth();
  const { preferences } = useUserExperience();

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/admin/combo-products");
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCombos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching combo products:", error);
        setCombos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCombos();
  }, []);

  // Pre-select the Main/Sub Degree filters from the user's saved
  // personalization preference, without hard-filtering the server query.
  useEffect(() => {
    if (preferences?.mainDegree?.id) setMainDegreeFilter(preferences.mainDegree.id);
    if (preferences?.subDegree?.id) setSubDegreeFilter(preferences.subDegree.id);
  }, [preferences.mainDegree, preferences.subDegree]);

  useEffect(() => {
    api.get("/api/mainDegrees").then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setMainDegrees(Array.isArray(data) ? data : []);
    }).catch(() => setMainDegrees([]));
  }, []);

  useEffect(() => {
    if (mainDegreeFilter === "all") {
      setSubDegrees([]);
      setSubDegreeFilter("all");
      return;
    }
    api.get(`/api/subDegrees?mainDegreeId=${mainDegreeFilter}`).then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSubDegrees(Array.isArray(data) ? data : []);
    }).catch(() => setSubDegrees([]));
  }, [mainDegreeFilter]);

  const onOpen = useCallback((id) => {
    if (!id) {
      toast.error("This combo link is invalid. Please try another bundle.");
      return;
    }
    navigate(`/combo/${id}`);
  }, [navigate]);

  const onAddToCart = useCallback(async (e, item) => {
    e.stopPropagation();

    requireLogin(async () => {
      const success = await addToCart(item, 1);
      if (success !== false) toast.success("Added to cart");
    });
  }, [addToCart, requireLogin]);

  const languageOptions = useMemo(() => {
    const values = combos
      .map((c) => c.language)
      .filter((v) => typeof v === "string" && v.trim().length > 0);
    return ["all", ...Array.from(new Set(values))];
  }, [combos]);

  const filteredCombos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const list = combos.filter((item) => {
      const matchesQuery = !normalizedQuery
        || String(item.title || "").toLowerCase().includes(normalizedQuery)
        || String(item.mainDegree?.name || "").toLowerCase().includes(normalizedQuery)
        || String(item.subDegree?.name || "").toLowerCase().includes(normalizedQuery)
        || String(item.language || "").toLowerCase().includes(normalizedQuery);

      const matchesLanguage = languageFilter === "all" || item.language === languageFilter;
      const matchesMainDegree = mainDegreeFilter === "all" || String(item.mainDegreeId) === String(mainDegreeFilter);
      const matchesSubDegree = subDegreeFilter === "all" || String(item.subDegreeId) === String(subDegreeFilter);

      return matchesQuery && matchesLanguage && matchesMainDegree && matchesSubDegree;
    });

    const sortable = [...list];

    if (sortBy === "price_low") {
      sortable.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_high") {
      sortable.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "saving") {
      sortable.sort(
        (a, b) => calculateDiscount(b.cancelPrice, b.price) - calculateDiscount(a.cancelPrice, a.price)
      );
    } else {
      sortable.sort((a, b) => {
        const discountDiff = calculateDiscount(b.cancelPrice, b.price) - calculateDiscount(a.cancelPrice, a.price);
        if (discountDiff !== 0) return discountDiff;
        return Number(a.price || 0) - Number(b.price || 0);
      });
    }

    return sortable;
  }, [combos, query, languageFilter, mainDegreeFilter, subDegreeFilter, sortBy]);

  return (
    <div className="combo-page-v2">
      <section className="combo-content-v2">
        <div className="container">
          <div className="toolbar-panel" aria-label="Combo filters">
            <div className="search-wrap">
              <Search size={16} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search combo title, language, or category"
                aria-label="Search combos"
              />
            </div>

            <div className="toolbar-controls">
              <label className="control">
                <span><Filter size={14} /> Language</span>
                <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang === "all" ? "All Languages" : lang}
                    </option>
                  ))}
                </select>
              </label>

              <label className="control">
                <span><Tag size={14} /> Main Degree</span>
                <select
                  value={mainDegreeFilter}
                  onChange={(e) => setMainDegreeFilter(e.target.value)}
                >
                  <option value="all">All Main Degrees</option>
                  {mainDegrees.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              <label className="control">
                <span><Tag size={14} /> Sub Degree</span>
                <select
                  value={subDegreeFilter}
                  onChange={(e) => setSubDegreeFilter(e.target.value)}
                  disabled={mainDegreeFilter === "all"}
                >
                  <option value="all">All Sub Degrees</option>
                  {subDegrees.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              <label className="control">
                <span><ArrowRight size={14} /> Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="featured">Recommended</option>
                  <option value="saving">Highest Savings</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? null : filteredCombos.length === 0 ? (
            <div className="combo-state empty-state">
              <Zap size={48} />
              <h3>No matching combo bundles</h3>
              <p>Try changing your search or filters to see more options.</p>
            </div>
          ) : (
            <>
              <div className="result-bar">
                <p>
                  Showing <strong>{filteredCombos.length}</strong> combo bundle{filteredCombos.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="combo-grid-v2">
                {filteredCombos.map((item, index) => (
                  <ComboCard
                    key={getComboId(item) || `combo-${index}`}
                    item={item}
                    index={index}
                    onOpen={onOpen}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
