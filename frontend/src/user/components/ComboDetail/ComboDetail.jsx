import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Globe,
  Layers,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../api";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/logintrue";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import "./ComboDetail.scss";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const isSoftType = (type) => /soft|digital/i.test(String(type || ""));
const getId = (obj) => obj?._id || obj?.id || null;
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
]);

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value ? [value] : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
};

const getComboImages = (combo) => {
  const primary = combo?.image ? [combo.image] : [];
  const gallery = parseImages(combo?.gallery);
  return [...new Set([...primary, ...gallery])].filter(Boolean);
};

const getItemProduct = (item) => {
  if (!item) return null;
  if (item.product && typeof item.product === "object") return item.product;
  if (item.productId && typeof item.productId === "object") return item.productId;
  return null;
};

const getItemImage = (item) => {
  const product = getItemProduct(item);
  const images = parseImages(product?.images);
  const idx = Number(product?.coverImageIndex || 0);
  return images[idx] || images[0] || product?.image || null;
};

const productHaystack = (product) => [
  product?.sku || "",
  product?.courseCode || "",
  product?.title || "",
  product?.subDegree || "",
  product?.mainDegree || "",
].join(" ").toUpperCase();

const getGuideType = (product) => {
  const haystack = productHaystack(product);
  if (haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION")) return "Important Questions (IMPQS)";
  if (haystack.includes("AINOTES") || haystack.includes("AI NOTES") || haystack.includes("AI-NOTES")) return "AI Notes";
  if (haystack.includes("MASTERY")) return "Mastery Book";
  if (haystack.includes("QUESTIONBANK") || haystack.includes("QUESTION BANK")) return "Question Bank";
  if (haystack.includes("SOLVED") && haystack.includes("PAPER")) return "Solved Papers";
  if (haystack.includes("GUIDE")) return "Study Guide";
  return null;
};

const getPageRange = (product) => {
  const haystack = productHaystack(product);
  if (haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION")) return "80–90 Pages";
  if (haystack.includes("AINOTES") || haystack.includes("AI NOTES") || haystack.includes("AI-NOTES")) return "100–130 Pages";
  if (haystack.includes("MASTERY")) return "280–350 Pages";
  return null;
};

const isImpqs = (product) => {
  const haystack = productHaystack(product);
  return haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION");
};

const toPlainText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const normalizeLanguage = (value) => {
  const raw = toPlainText(value);
  if (!raw) return "";
  const parts = raw
    .split(/[/,|&+-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const valid = parts.filter((part) => LANGUAGE_ALLOWLIST.has(part.toLowerCase()));
  return valid.join(" / ");
};

const toCodeFirstTitle = (title) => {
  const raw = toPlainText(title);
  if (!raw) return raw;

  const compactCode = raw.match(/\b([A-Z]{3,}\d{3}[A-Z]?)\b/);
  if (compactCode) {
    const code = compactCode[1];
    const rest = raw.replace(code, "").replace(/\s+/g, " ").trim();
    return rest ? `${code} - ${rest}` : code;
  }

  const spacedCode = raw.match(/\b([A-Z]{3,}\s\d{3}[A-Z]?)\b/);
  if (spacedCode) {
    const code = spacedCode[1].replace(/\s+/g, "");
    const rest = raw.replace(spacedCode[1], "").replace(/\s+/g, " ").trim();
    return rest ? `${code} - ${rest}` : code;
  }

  return raw;
};

const inferLanguagesFromText = (...values) => {
  const text = values.map(toPlainText).join(" ").toLowerCase();
  const found = [];
  if (/\b(eng|english)\b/.test(text)) found.push("English");
  if (/\b(hin|hindi)\b/.test(text)) found.push("Hindi");
  if (/\b(urdu)\b/.test(text)) found.push("Urdu");
  if (/\b(punjabi)\b/.test(text)) found.push("Punjabi");
  if (/\b(bengali)\b/.test(text)) found.push("Bengali");
  if (/\b(tamil)\b/.test(text)) found.push("Tamil");
  if (/\b(telugu)\b/.test(text)) found.push("Telugu");
  if (/\b(marathi)\b/.test(text)) found.push("Marathi");
  if (/\b(gujarati)\b/.test(text)) found.push("Gujarati");
  if (/\b(odia)\b/.test(text)) found.push("Odia");
  if (/\b(kannada)\b/.test(text)) found.push("Kannada");
  if (/\b(malayalam)\b/.test(text)) found.push("Malayalam");
  if (/\b(sanskrit)\b/.test(text)) found.push("Sanskrit");
  return [...new Set(found)];
};

export default function ComboDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { requireLogin } = useAuth();

  const [combo, setCombo] = useState(null);
  const [relatedCombos, setRelatedCombos] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchCombo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/admin/combo-products/${id}`);
        const comboData = res.data?.success ? res.data.data : res.data;
        if (!comboData) throw new Error("Combo not found");

        setCombo(comboData);

        const links = comboData.ProductLinks || comboData.productLinks || [];
        if (Array.isArray(links) && links.length > 0) {
          const first = links[0];
          setSelectedVariant({
            id: `link_0`,
            type: isSoftType(first.type) ? "soft" : "hard",
            price: Number(first.price || comboData.price || 0),
            language: normalizeLanguage(first.language) || normalizeLanguage(comboData.language) || toPlainText(comboData.language) || "",
            link: first.link || "",
          });
        } else {
          const firstLanguage = toPlainText(comboData.language).split(/[/,&+]+/)[0]?.trim() || "";
          setSelectedVariant({
            id: "h_0",
            type: "hard",
            price: Number(comboData.price || 0),
            language: normalizeLanguage(firstLanguage) || firstLanguage || "",
            link: "",
          });
        }

        if (comboData.mainDegreeId) {
          const relRes = await api.get("/api/admin/combo-products");
          const relData = relRes.data?.success ? relRes.data.data : relRes.data;
          const related = Array.isArray(relData)
            ? relData.filter((c) => c.mainDegreeId === comboData.mainDegreeId && String(getId(c)) !== String(id))
            : [];
          setRelatedCombos(related.slice(0, 4));
        }
      } catch (error) {
        console.error("Combo detail fetch error:", error);
        toast.error("Combo not found");
        navigate("/combo-books");
      } finally {
        setLoading(false);
      }
    };

    fetchCombo();
  }, [id, navigate]);

  const groupedVariants = useMemo(() => {
    if (!combo) return [];
    const links = combo.ProductLinks || combo.productLinks || [];

    const map = {};
    if (Array.isArray(links) && links.length > 0) {
      links.forEach((link, idx) => {
        const language = link.language || combo.language || "English";
        if (!map[language]) map[language] = { hard: null, soft: null };
        if (isSoftType(link.type)) map[language].soft = { ...link, _idx: idx };
        else map[language].hard = { ...link, _idx: idx };
      });
    } else {
      // No per-language pricing links exist for this bundle — synthesize
      // one "Hard Copy" option per language listed on the bundle itself,
      // all sharing the bundle's own price.
      const rawLanguages = toPlainText(combo.language)
        .split(/[/,&+]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      const uniqueLanguages = [...new Set(rawLanguages)];
      (uniqueLanguages.length ? uniqueLanguages : ["General"]).forEach((language, idx) => {
        map[language] = { hard: { price: combo.price, _idx: idx }, soft: null };
      });
    }

    return Object.entries(map).sort(([a], [b]) => {
      const an = String(a).toLowerCase();
      const bn = String(b).toLowerCase();
      if (an === "english" && bn !== "english") return -1;
      if (bn === "english" && an !== "english") return 1;
      return a.localeCompare(b);
    });
  }, [combo]);

  if (loading) {
    return (
      <div className="combox-page">
        <div className="container combox-loading-wrap">
          <div className="combox-loading">Loading combo details...</div>
        </div>
      </div>
    );
  }

  if (!combo || !selectedVariant) return null;

  const images = getComboImages(combo);
  const currentPrice = Number(selectedVariant.price || combo.price || 0);
  const currentMrp = Number(combo.cancelPrice || 0);
  const hasDiscount = currentMrp > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) : 0;
  const savedAmount = hasDiscount ? currentMrp - currentPrice : 0;
  const itemCount = Array.isArray(combo.items) ? combo.items.length : 0;
  const includedProducts = (combo.items || [])
    .map((item) => getItemProduct(item))
    .filter(Boolean);
  const includedBookTitles = [...new Set(includedProducts.map((p) => p.title).filter(Boolean))];
  const includedCourses = [...new Set(
    includedProducts
      .map((p) => p.course || p.subjectName || p.courseCode || p.sku)
      .filter(Boolean)
  )];
  const inferredLanguages = [...new Set(
    includedProducts.flatMap((p) => inferLanguagesFromText(
      p.language,
      p.title,
      p.sku,
      p.course,
      p.subjectName,
      p.courseCode
    ))
  )];
  const variantRows = groupedVariants.flatMap(([language, pack]) => {
    const rows = [];
    const normalizedLanguage = normalizeLanguage(language);
    if (!normalizedLanguage) return rows;
    if (pack.hard) rows.push(`Hard Copy | ${normalizedLanguage}`);
    if (pack.soft) rows.push(`Soft Copy | ${normalizedLanguage}`);
    return rows;
  });
  const availableFormats = [...new Set(variantRows.map((v) => v.split("|")[0].trim()))];
  const availableLanguages = [...new Set(variantRows.map((v) => v.split("|")[1]?.trim()).filter(Boolean))];
  const shortDescription = toPlainText((combo.description || "").replace(/<[^>]*>/g, " "));

  const detailRows = [
    { key: "bundle_code", label: "Bundle Code", value: combo.id || "N/A" },
    { key: "category", label: "Category", value: combo.mainDegree?.name || "N/A" },
    { key: "sub_category", label: "Sub Category", value: combo.subDegree?.name || "N/A" },
    {
      key: "course",
      label: "Course",
      value: includedCourses.length ? includedCourses : "N/A",
    },
    {
      key: "language",
      label: "Language",
      value: availableLanguages.length
        ? availableLanguages.join(", ")
        : (normalizeLanguage(combo.language) || toPlainText(combo.language) || (inferredLanguages.length ? inferredLanguages.join(", ") : "N/A")),
    },
    { key: "formats", label: "Available Format", value: availableFormats.length ? availableFormats.join(" / ") : "Hard Copy" },
    { key: "variants", label: "Available Variants", value: variantRows.length ? variantRows.join(", ") : `Hard Copy | ${toPlainText(combo.language) || "General"}` },
    {
      key: "books",
      label: "Included Books",
      value: includedBookTitles.length ? includedBookTitles.map(toCodeFirstTitle) : "N/A",
    },
    { key: "publisher", label: "Publisher", value: "Book My Study Guide" },
    { key: "university", label: "University", value: "IGNOU (Indira Gandhi National Open University)" },
  ];

  // Guide type / page count / question counts are book-specific (same rules
  // as the single-product page) — shown one row per included book since a
  // bundle can mix different guide types.
  const perBookDetails = includedProducts.map((p, idx) => ({
    key: p.id || idx,
    title: toCodeFirstTitle(p.title) || `Book ${idx + 1}`,
    guideType: getGuideType(p),
    pages: getPageRange(p),
    impqs: isImpqs(p),
  })).filter((b) => b.guideType || b.pages);

  const hardOutOfStock = false;
  const canPurchase = true;

  const handleAddToCart = async (action) => {
    if (!canPurchase) {
      toast.error("Out of stock");
      return;
    }

    const variantLabel = selectedVariant.type === "soft_bundle"
      ? "Soft Copy - All Books"
      : selectedVariant.type === "soft" ? "Soft Copy" : "Hard Copy";

    const payload = {
      ...combo,
      name: `${combo.title}${selectedVariant.type === "bundle" ? "" : ` (${variantLabel}${selectedVariant.language ? ` - ${selectedVariant.language}` : ""})`}`,
      price: currentPrice,
      type: selectedVariant.type,
      fileUrl: selectedVariant.link || "",
      language: selectedVariant.language || "",
      isHardCopy: selectedVariant.type !== "soft" && selectedVariant.type !== "soft_bundle",
      productLinks: selectedVariant.productLinks || [],
    };

    requireLogin(async () => {
      const success = await addToCart(payload, 1);
      if (success !== false) {
        if (action === 'buy') {
          navigate("/checkout");
        } else {
          toast.success("Added to cart");
        }
      }
    });
  };

  return (
    <div className="combox-page">
      <Helmet>
        <title>{`${combo.title} | Combo Bundle`}</title>
        <meta name="description" content={(combo.description || "").replace(/<[^>]*>/g, " ").slice(0, 160)} />
      </Helmet>

      <div className="container">
        <nav className="combox-crumbs" aria-label="Breadcrumb">
          <button type="button" className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </button>
          <Link to="/">Home</Link>
          <ChevronRight size={12} />
          <Link to="/combo-books">Combo Books</Link>
          <ChevronRight size={12} />
          <span className="current">{combo.title}</span>
        </nav>

        <section className="combox-hero">
          <div className="combox-gallery">
            <div className="main-image-box">
              {images[activeImageIndex] ? (
                <img src={getOptimizedImageUrl(images[activeImageIndex])} alt={combo.title} />
              ) : (
                <div className="no-image"><BookOpen size={52} /></div>
              )}
              {hasDiscount && <span className="discount-pill">-{discountPercent}%</span>}
            </div>

            {images.length > 1 && (
              <div className="thumb-row">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    className={idx === activeImageIndex ? "thumb active" : "thumb"}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={getOptimizedImageUrl(img)} alt={`Bundle view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

          </div>

          <div className="combox-details">
            <div className="title-wrap">
              <div className="meta-row">
                <span className={canPurchase ? "chip status in" : "chip status out"}>{canPurchase ? "In Stock" : "Out of Stock"}</span>
              </div>
              <h1>{combo.title}</h1>
              {shortDescription && (
                <p className="sub">
                  {shortDescription.slice(0, 140)}
                  {shortDescription.length > 140 ? "..." : ""}
                </p>
              )}
            </div>

            <div className="pricing-wrap">
              <div className="price-main">{formatCurrency(currentPrice)}</div>
              {hasDiscount && <div className="price-mrp">{formatCurrency(currentMrp)}</div>}
              {hasDiscount && <div className="save-box">You save {formatCurrency(savedAmount)}</div>}
            </div>

            <div className="variant-card">
              <p className="variant-head"><Layers size={14} /> Select Format & Language</p>

              {groupedVariants.length === 0 ? (
                <div className="variant-empty">
                  No format/language options are available for this bundle right now.
                </div>
              ) : (
                groupedVariants.map(([language, pack]) => (
                  <div className="variant-line" key={language}>
                    <span className="lang"><Globe size={12} /> {normalizeLanguage(language) || toPlainText(language) || "General"}</span>
                    <div className="option-group">
                      {pack.hard && (
                        <button
                          type="button"
                          className={selectedVariant.id === `h_${pack.hard._idx}` ? "option active" : "option"}
                          onClick={() => setSelectedVariant({
                            id: `h_${pack.hard._idx}`,
                            type: "hard",
                            price: Number(pack.hard.price || combo.price || 0),
                            language: normalizeLanguage(language) || toPlainText(language) || "",
                            link: "",
                          })}
                        >
                          <span>Hard Copy</span>
                          <strong>{formatCurrency(pack.hard.price || combo.price)}</strong>
                        </button>
                      )}

                      {pack.soft && (
                        <button
                          type="button"
                          className={selectedVariant.id === `s_${pack.soft._idx}` ? "option soft active" : "option soft"}
                          onClick={() => setSelectedVariant({
                            id: `s_${pack.soft._idx}`,
                            type: "soft",
                            price: Number(pack.soft.price || combo.price || 0),
                            language: normalizeLanguage(language) || toPlainText(language) || "",
                            link: pack.soft.link || "",
                          })}
                        >
                          <span>Soft Copy</span>
                          <strong>{formatCurrency(pack.soft.price || combo.price)}</strong>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {combo.softCopyBundle?.available && (
              <div className="variant-card">
                <p className="variant-head"><Layers size={14} /> Digital Version</p>
                <div className="variant-line">
                  <span className="lang"><Globe size={12} /> All {combo.softCopyBundle.items.length} books included</span>
                  <div className="option-group">
                    <button
                      type="button"
                      className={selectedVariant.id === "soft_bundle" ? "option soft active" : "option soft"}
                      onClick={() => setSelectedVariant({
                        id: "soft_bundle",
                        type: "soft_bundle",
                        price: Number(combo.softCopyBundle.totalPrice || 0),
                        language: "",
                        link: "",
                        productLinks: combo.softCopyBundle.items.map((sc) => ({
                          language: sc.language || "",
                          link: sc.resourceType === "link" ? sc.resourceLink : `/uploads/softcopies/${sc.fileName}`,
                        })),
                      })}
                    >
                      <span>Soft Copy (all {combo.softCopyBundle.items.length})</span>
                      <strong>{formatCurrency(combo.softCopyBundle.totalPrice)}</strong>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="cta-row">
              <button type="button" className="cta primary" onClick={() => handleAddToCart('add')} disabled={!canPurchase}>
                <ShoppingCart size={17} /> Add to Cart
              </button>
              <button
                type="button"
                className="cta secondary"
                onClick={() => handleAddToCart('buy')}
                disabled={!canPurchase}
              >
                Buy Now
              </button>
            </div>

            <div className="benefit-grid">
              <span><CheckCircle2 size={14} /> Expert-curated package</span>
              <span><ShieldCheck size={14} /> Trusted checkout</span>
              <span><Package size={14} /> {itemCount} bundle item{itemCount === 1 ? "" : "s"}</span>
              <span><Star size={14} /> High success utility</span>
            </div>
          </div>
        </section>
        <section className="combox-section combox-product-details-section">
          <div className="section-title-row">
            <h2>Product Details</h2>
          </div>
          <table>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>
                    {Array.isArray(row.value) ? (
                      <div className="detail-list">
                        {row.value.map((item, idx) => (
                          <span key={`${row.key}_${idx}`}>{item}</span>
                        ))}
                      </div>
                    ) : row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {perBookDetails.length > 0 && (
          <section className="combox-section combox-per-book-section">
            <div className="section-title-row">
              <h2>Per-Book Details</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Guide Type</th>
                  <th>Pages</th>
                  <th>Questions with Solution</th>
                  <th>Back Questions</th>
                </tr>
              </thead>
              <tbody>
                {perBookDetails.map((b) => (
                  <tr key={b.key}>
                    <td>{b.title}</td>
                    <td>{b.guideType || "—"}</td>
                    <td>{b.pages || "—"}</td>
                    <td>{b.impqs ? "35-40" : "—"}</td>
                    <td>{b.impqs ? "40+" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="combox-section">
          <div className="section-title-row">
            <h2>What's Inside This Bundle</h2>
            <span>{itemCount} items</span>
          </div>

          <div className="items-grid">
            {(combo.items || []).map((item, idx) => {
              const product = getItemProduct(item);
              const pid = getId(product) || getId(item.productId);
              const img = getItemImage(item);

              return (
                <button
                  type="button"
                  key={pid || idx}
                  className="item-card"
                  onClick={() => pid && navigate(`/productpage/${pid}`)}
                >
                  <div className="item-thumb">
                    {img ? <img src={getOptimizedImageUrl(img)} alt={product?.title || "Product"} /> : <BookOpen size={22} />}
                    <b>x{item.quantity || 1}</b>
                  </div>
                  <div className="item-info">
                    <h3>{product?.title || "Study Material"}</h3>
                    <p>Included in combo</p>
                  </div>
                  <ArrowRight size={14} className="arrow" />
                </button>
              );
            })}
          </div>
        </section>

        {combo.description && (
          <section className="combox-section">
            <div className="section-title-row">
              <h2>Bundle Description</h2>
            </div>
            <div className="description-html" dangerouslySetInnerHTML={{ __html: combo.description }} />
          </section>
        )}

        {relatedCombos.length > 0 && (
          <section className="combox-section">
            <div className="section-title-row">
              <h2>Similar Bundles</h2>
            </div>
            <div className="related-grid">
              {relatedCombos.map((rel, idx) => {
                const relId = getId(rel);
                return (
                  <article
                    key={relId || idx}
                    className="related-card"
                    onClick={() => relId && navigate(`/combo/${relId}`)}
                  >
                    <div className="rel-image">
                      {rel.image ? <img src={getOptimizedImageUrl(rel.image)} alt={rel.title} /> : <BookOpen size={20} />}
                    </div>
                    <div className="rel-body">
                      <h3>{rel.title}</h3>
                      <div className="rel-foot">
                        <strong>{formatCurrency(rel.price)}</strong>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="combox-sticky-bar">
        <div className="left">
          <span>{combo.title}</span>
          <strong>{formatCurrency(currentPrice)}</strong>
        </div>
        <button type="button" onClick={handleAddToCart} disabled={!canPurchase}>
          <ShoppingCart size={15} />
          {canPurchase ? "Add Bundle" : "Sold Out"}
        </button>
      </div>
    </div>
  );
}
