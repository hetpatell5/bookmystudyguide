import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Slider from "react-slick";
import {
    ChevronRight, Star, ShoppingCart,
    Heart, MessageSquare, Layers, Share2, X, FileText,
    GraduationCap, BookOpen, Truck, BadgeCheck, Globe,
    CheckCircle, Users, Award, Eye
} from "lucide-react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// Use the product page styles instead of SynopsisDetail styles
import "../../../components/productpage/productpage.scss";
import "../../../components/productpage/ProductInfoTabs.scss"; 
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { toast } from "react-toastify";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { trackEvent, trackFormSubmit } from "../../../../utils/analytics";
import { useAuth } from "../../../../context/logintrue";

// --- HELPERS ---
const formatPrice = (price) => {
    const safePrice = Number(price) || 0;
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(safePrice);
    } catch (e) {
        return `₹${safePrice}`;
    }
};

const resolveName = (value, fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return fallback;
  if (typeof value === "string") return value;
  return value.name || fallback;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
};

const normalizeDescriptionHtml = (raw) => {
    if (raw == null) return "";
    let html = raw;
    if (Array.isArray(html)) html = html.join(" ");
    if (typeof html === "object") {
        html = html.html || html.description || html.content || html.text || "";
    }
    if (typeof html !== "string") return "";
    const looksEscaped = html.includes("&lt;") || html.includes("&gt;") || html.includes("&amp;") || html.includes("&#");
    if (looksEscaped && typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = html;
        html = textarea.value;
    }
    html = html
        .replace(/&nbsp;/gi, " ")
        .replace(/\u00A0/g, " ")
        .replace(/(<\/(?:p|h[1-6]|ul|ol|li|div|blockquote)>)\s+(<)/gi, "$1$2");
    html = html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
        .replace(/<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/gi, "<li>$1</li>")
        .replace(/<(h[1-6])((?:\s[^>]*)?)>/gi, '<$1$2 style="margin:10px 0 3px;padding:0;line-height:1.3;">')
        .replace(/<p((?:\s[^>]*)?)>/gi, '<p$1 style="margin:0 0 5px;padding:0;">')
        .replace(/<ul((?:\s[^>]*)?)>/gi, '<ul$1 style="margin:4px 0 6px;padding-left:32px;">')
        .replace(/<ol((?:\s[^>]*)?)>/gi, '<ol$1 style="margin:4px 0 6px;padding-left:32px;">')
        .replace(/<li((?:\s[^>]*)?)>/gi, '<li$1 style="margin:0 0 3px;padding:0 0 0 4px;line-height:1.65;">')
        .replace(/(<\/(?:ul|ol|p)>)(<b(?:\s[^>]*)?>)((?:(?!<\/b>).)+)(<\/b>)(?=<(?:ul|ol|p))/gi,
            '$1<div style="font-weight:700;margin:10px 0 3px;padding:0;line-height:1.3;">$3</div>');

    html = html.replace(/-<\/p>\s*<p[^>]*>/gi, "-");
    html = html.replace(/([a-zA-Z])<\/p>\s*<p[^>]*>([a-z])/g, "$1$2");
    html = html.replace(/[\u200B-\u200D\uFEFF]/g, "");
    html = html.replace(/\u00AD/g, "");
    html = html.replace(/&shy;/gi, "");
    html = html.replace(/&#8203;/gi, "");

    const parts = html.split(/(<[^>]+>)/g);
    for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<')) {
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-\s+([a-zA-Z0-9])/g, "$1&#8209;$2");
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, "$1&#8209;$2");
        }
    }
    html = parts.join('');

    return html;
};

const buildRenderableDescriptionHtml = (raw) => {
    const normalized = normalizeDescriptionHtml(raw);
    if (!normalized) return "";
    const hasHtmlTags = /<[^>]+>/.test(normalized);
    if (hasHtmlTags) return normalized;
    return normalized
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join("");
};

const stripHtmlToText = (raw) => {
    if (raw == null) return "";
    let s = raw;
    if (Array.isArray(s)) s = s.join(" ");
    if (typeof s === "object") s = s.html || s.description || s.content || s.text || "";
    if (typeof s !== "string") return "";
    if ((s.includes("&lt;") || s.includes("&gt;") || s.includes("&amp;")) && typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = s;
        s = textarea.value;
    }
    return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

export default function SynopsisDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { requireLogin, userId } = useAuth();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const handleToggleWishlist = (p) => {
        if (!isInWishlist(p.id)) {
            trackEvent("Wishlist", "Add to Wishlist", p.title);
        }
        toggleWishlist(p);
    };

    // --- STATES ---
    const [synopsis, setSynopsis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [infoActiveTab, setInfoActiveTab] = useState(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            return params.get("tab") === "reviews" ? "reviews" : "description";
        }
        return "description";
    });
    const [quantity, setQuantity] = useState(1);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, comment: "" });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [contactInfo, setContactInfo] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const sliderRef = useRef(null);

    useEffect(() => {
        api.get("/api/contact")
            .then((res) => { if (res.data) setContactInfo(res.data); })
            .catch((err) => console.error("Error fetching contact info:", err));
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    const fetchReviews = useCallback(() => {
        // We use productId for synopsis reviews as well if backend doesn't differentiate
        api.get(`/api/reviews?productId=${id}`)
            .then(res => setReviews(res.data))
            .catch(err => console.error("Error fetching reviews:", err));
    }, [id]);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/synopsis/${id}`)
            .then(async res => {
                const raw = res.data?.data || res.data;
                if (!raw) { setLoading(false); return; }
                
                const data = {
                  ...raw,
                  images: toArray(raw.images),
                  synopsisLinks: toArray(raw.synopsisLinks).map((link) => ({
                    ...link,
                    images: toArray(link.images),
                  })),
                };
                
                if (!data.images || data.images.length === 0) {
                    data.images = ["https://via.placeholder.com/600"];
                }

                setActiveImageIndex(data.coverImageIndex || 0);
                setSynopsis(data);
                fetchReviews();
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [id, fetchReviews]);

    useEffect(() => {
        if (synopsis) {
            if (synopsis.synopsisLinks && synopsis.synopsisLinks.length > 0) {
                const first = synopsis.synopsisLinks[0];
                setSelectedVariant({
                    id: 0,
                    language: first.language || "Standard",
                    type: first.type || "Digital",
                    category: first.category || "Synopsis",
                    price: first.price || synopsis.price,
                    mrp: first.mrp || synopsis.mrp || 0,
                    link: first.link || "",
                    images: first.images && first.images.length > 0 ? first.images : null,
                    coverImageIndex: first.coverImageIndex || 0,
                });
            } else if (synopsis.price) {
                setSelectedVariant({
                    id: "base",
                    language: "Standard",
                    type: "Digital Copy",
                    category: "Synopsis",
                    price: synopsis.price,
                    mrp: synopsis.mrp || 0,
                    isBase: true,
                });
            }
            setQuantity(1);
        }
    }, [synopsis]);

    const sliderSettings = {
        dots: true, infinite: true, speed: 800, slidesToShow: 1, slidesToScroll: 1,
        autoplay: true, autoplaySpeed: 3000, fade: true, pauseOnHover: false, arrows: false,
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            await api.post('/api/reviews', { ...reviewForm, productId: id, userId: userId || null });
            setReviewForm({ name: "", rating: 5, comment: "" });
            fetchReviews();
            toast.success("Review submitted! Thank you.");
        } catch (err) { console.error("Error submitting review:", err); toast.error("Failed to submit review"); }
        finally { setSubmittingReview(false); trackFormSubmit("Synopsis Review"); }
    };

    const changeQuantity = (delta) => {
        setQuantity(q => {
            const next = q + delta;
            if (next < 1) return 1;
            // Synopsis is usually digital, maybe we don't allow quantity > 1
            if (next > 1) return 1;
            return next;
        });
    };

    const handleAddToCart = async (action) => {
        if (!selectedVariant || !synopsis) return;
        if (synopsis?.isActive === false) { toast.error("This project is currently unavailable."); return; }
        
        const finalProduct = {
          _id: synopsis.id,
          name: `${synopsis.title} (${selectedVariant.category} - ${selectedVariant.language})`,
          price: selectedVariant.price,
          image:
            (selectedVariant.images && selectedVariant.images[selectedVariant.coverImageIndex || 0]) ||
            synopsis.images?.[0],
          type: `${selectedVariant.category} (${selectedVariant.type})`,
          fileUrl: selectedVariant.link || "",
          language: selectedVariant.language || "",
          isSynopsis: true,
        };

        requireLogin(async () => {
            const success = await addToCart(finalProduct, quantity);
            if (success !== false) {
                if (action === 'buy') { 
                    trackEvent("Cart", "Buy Now Synopsis", synopsis.title, selectedVariant.price); 
                    navigate('/checkout'); 
                } else { 
                    toast.success("Added to cart");
                    trackEvent("Cart", "Add to Cart Synopsis", synopsis.title, selectedVariant.price); 
                }
            }
        });
    };

    const handleContactNow = () => {
        if (!contactInfo?.whatsapp) { toast.error("WhatsApp contact is not available right now."); return; }
        const whatsappNumber = String(contactInfo.whatsapp).replace(/\D/g, "");
        const message = [`Hello BMSG, I want details for:`, `Project: ${synopsis?.title}`, `Language: ${selectedVariant?.language}`, `Page: ${window.location.href}`].join("\n");
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
    };

    const handleShare = () => {
        const shareData = { title: synopsis.title, url: window.location.href };
        if (navigator.share) navigator.share(shareData).catch(console.error);
        else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
        trackEvent("Social", "Share Synopsis", synopsis.title);
    };

    if (loading && !synopsis) {
        return (
            <div className="product-page-loading" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>Loading project details...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }
    if (!synopsis) return <div className="product-not-found">Project Not Found</div>;

    const currentPrice = selectedVariant ? Number(selectedVariant.price) : 0;
    const currentMRP = selectedVariant ? (selectedVariant.mrp || synopsis.mrp || 0) : (synopsis.mrp || 0);
    const discountPercent = currentMRP > currentPrice ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0;

    const mainDegree = resolveName(synopsis.mainDegreeId, synopsis.mainDegree || synopsis.mainDegreeName || "");
    const subDegree = resolveName(synopsis.subDegreeId, synopsis.subDegree || synopsis.subDegreeName || "");
    const subject = resolveName(synopsis.subjectId, synopsis.subjectName || synopsis.subject || "");

    const catalogSpecs = [];
    if (mainDegree) catalogSpecs.push({ key: "degree", label: "Main degree", value: mainDegree });
    if (subDegree) catalogSpecs.push({ key: "sub", label: "Sub degree", value: subDegree });
    if (subject) catalogSpecs.push({ key: "subject", label: "Subject", value: subject });
    catalogSpecs.push({ key: "format", label: "Format", value: "MS Word / PDF" });
    catalogSpecs.push({ key: "session", label: "Session", value: "2024–25 (Latest)" });

    const renderedDescriptionHtml = buildRenderableDescriptionHtml(synopsis.description);
    const isUnavailable = synopsis?.isActive === false;

    const displayImages = (selectedVariant?.images && selectedVariant.images.length > 0) ? selectedVariant.images : synopsis.images;

    return (
        <div className="product-page">
            <Helmet>
                <title>{`${synopsis.title} | BMSG Projects`}</title>
                <meta name="description" content={stripHtmlToText(renderedDescriptionHtml).slice(0, 160)} />
                <meta property="og:image" content={getOptimizedImageUrl(displayImages?.[0])} />
            </Helmet>

            <div className="container">
                <nav className="breadcrumb">
                    <Link to="/">Home</Link>
                    <ChevronRight size={14} /><Link to="/projects">Projects</Link>
                    <ChevronRight size={14} /><span className="current">{synopsis.title}</span>
                </nav>

                <div className="product-layout">
                    <div className="product-gallery">
                        <div className="gallery-main">
                            <Slider ref={sliderRef} dots={false} infinite={displayImages.length > 1} speed={500} slidesToShow={1} slidesToScroll={1} arrows={displayImages.length > 1} autoplay={displayImages.length > 1} autoplaySpeed={3500} beforeChange={(current, next) => setActiveImageIndex(next)}>
                                {displayImages.map((img, idx) => (
                                    <div key={idx} className="slide-item">
                                        <div className="zoom-wrapper" onClick={() => setIsLightboxOpen(true)}><img src={getOptimizedImageUrl(img)} alt={synopsis.title} /></div>
                                    </div>
                                ))}
                            </Slider>
                        </div>
                        {displayImages.length > 1 && (
                            <div className="gallery-thumbs">
                                {displayImages.map((img, idx) => (
                                    <button key={idx} className={`thumb ${idx === activeImageIndex ? 'active' : ''}`} onClick={() => { setActiveImageIndex(idx); sliderRef.current?.slickGoTo(idx); }}>
                                        <img src={getOptimizedImageUrl(img)} alt={`Thumbnail ${idx}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="product-info">
                        <div className="info-header">
                            <h1>{synopsis.title}</h1>
                            <div className="info-meta">
                                {(() => {
                                    const seed = String(synopsis.id || synopsis._id || 1).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                                    const displayRating = reviews.length > 0
                                        ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
                                        : (4.9).toFixed(1);
                                    const studentBase = 2000 + (seed % 12) * 150;
                                    const studentLabel = studentBase >= 1000
                                        ? `${(studentBase / 1000).toFixed(1).replace('.0', '')}k+`
                                        : `${studentBase}+`;
                                    return (<>
                                        <div className="rating"><Star size={16} fill="#f4b316" color="#f4b316" /><span>{displayRating} ({reviews.length > 0 ? reviews.length : "150+"} Reviews)</span></div>
                                        <span className="verified-students"><Users size={14} /> {studentLabel} Students</span>
                                    </>);
                                })()}
                            </div>
                        </div>

                        <div className="academic-specs-card glass-card">
                            <div className="card-title"><GraduationCap size={18} /> Project Specifications</div>
                            <div className="specs-grid">
                                {catalogSpecs.map((row) => (<div key={row.key} className="spec-item"><label>{row.label}</label><p>{row.value}</p></div>))}
                                <div className="spec-item">
                                    <label>Medium</label>
                                    <p>{selectedVariant?.language || "English"}</p>
                                </div>
                            </div>
                        </div>


                        <div className="price-block">
                            <div className="price-info">
                                <div className="current-price">{formatPrice(currentPrice)}{discountPercent > 0 && <span className="price-discount-badge">-{discountPercent}% OFF</span>}</div>
                                {currentMRP > currentPrice && <div className="mrp-info"><span className="old-price">{formatPrice(currentMRP)}</span></div>}
                            </div>
                            <div className="stock-badge-container">
                                {isUnavailable ? <span className="stock-status out">Unavailable</span> : <span className="stock-status in">Digital Delivery</span>}
                            </div>
                        </div>

                        <div className="variants-section elite-variants">
                            {((synopsis.synopsisLinks && synopsis.synopsisLinks.length > 0) || selectedVariant?.isBase) && (
                                <div className="variant-type">
                                    <h3>Select Format &amp; Language</h3>
                                    <div className="variant-lang-list">
                                        <div className="vcb-section">
                                            <div className="variant-copy-row">
                                                {(!synopsis.synopsisLinks || synopsis.synopsisLinks.length === 0) && (
                                                    <label className="vcb-card active" onClick={() => setSelectedVariant({ id: "base", language: "Standard", type: "Digital", category: "Synopsis", price: synopsis.price, mrp: synopsis.mrp || 0, isBase: true })}>
                                                        <input type="radio" name="variant" checked readOnly />
                                                        <div className="vcb-card-check"><CheckCircle size={16} /></div>
                                                        <div className="vcb-card-body">
                                                            <span className="vcb-card-type">Digital Copy</span>
                                                            <span className="vcb-card-lang">Standard</span>
                                                        </div>
                                                        <span className="vcb-card-price">{formatPrice(synopsis.price)}</span>
                                                    </label>
                                                )}
                                                {synopsis.synopsisLinks && synopsis.synopsisLinks.map((link, idx) => (
                                                    <label key={idx} className={`vcb-card ${selectedVariant?.id === idx ? 'active' : ''}`} onClick={() => {
                                                        setSelectedVariant({
                                                            id: idx,
                                                            language: link.language,
                                                            type: link.type || "Digital",
                                                            category: link.category || "Synopsis",
                                                            price: link.price || synopsis.price,
                                                            mrp: link.mrp || synopsis.mrp || 0,
                                                            link: link.link,
                                                            images: link.images?.length > 0 ? link.images : null,
                                                            coverImageIndex: link.coverImageIndex || 0,
                                                        });
                                                        setActiveImageIndex(0);
                                                    }}>
                                                        <input type="radio" name="variant" checked={selectedVariant?.id === idx} onChange={() => {}} />
                                                        <div className="vcb-card-check"><CheckCircle size={16} /></div>
                                                        <div className="vcb-card-body">
                                                            <span className="vcb-card-type">{link.category || "Synopsis"} · {link.type || "Digital"}</span>
                                                            <span className="vcb-card-lang-only">{link.language}</span>
                                                        </div>
                                                        <span className="vcb-card-price">{formatPrice(link.price || synopsis.price)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="cta-block">
                            <div className="qty-picker">
                                <button type="button" onClick={() => changeQuantity(-1)}>-</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => changeQuantity(1)}>+</button>
                            </div>
                            {isUnavailable ? (
                                <button type="button" className="btn-contact-now" onClick={handleContactNow}><MessageSquare /> Contact Now</button>
                            ) : (
                                <><button type="button" className="btn-buy-now" onClick={() => handleAddToCart('buy')}>Buy Now</button><button type="button" className="btn-add-cart" onClick={() => handleAddToCart('add')}>Add to Cart</button></>
                            )}
                            <button type="button" className={`btn-wishlist ${isInWishlist(synopsis.id) ? 'active' : ''}`} onClick={() => handleToggleWishlist(synopsis)}><Heart size={20} fill={isInWishlist(synopsis.id) ? "#ef4444" : "none"} /></button>
                            <button type="button" className="btn-share" onClick={handleShare}><Share2 size={20} /></button>
                        </div>
                    </div>
                </div>

                <div className="consolidated-info-tabs glass-card">
                    <div className="tabs-header">
                        <button className={infoActiveTab === 'description' ? 'active' : ''} onClick={() => setInfoActiveTab('description')}><FileText size={18} /> Description</button>
                        <button className={infoActiveTab === 'reviews' ? 'active' : ''} onClick={() => setInfoActiveTab('reviews')}><MessageSquare size={18} /> Reviews ({reviews.length})</button>
                    </div>
                    <div className="tabs-content">
                        {infoActiveTab === 'description' ? (
                            <div className="description-tab">

                                {/* ── Product Details Table — shown first ── */}
                                <div className="product-details-table">
                                    <h4 className="details-table-title">Project Details</h4>
                                    <table>
                                        <tbody>
                                            {mainDegree && <tr><td>Category</td><td>{mainDegree}</td></tr>}
                                            {subDegree && <tr><td>Programme</td><td>{subDegree}</td></tr>}
                                            {subject && <tr><td>Subject</td><td>{subject}</td></tr>}
                                            <tr><td>Format</td><td>MS Word / PDF</td></tr>
                                            <tr><td>Language</td><td>{selectedVariant?.language || "English"}</td></tr>
                                            <tr><td>Session</td><td>2024–25 (Latest)</td></tr>
                                            <tr><td>Delivery</td><td>Instant Download</td></tr>
                                            <tr><td>Features</td><td>100% Approval Rate, Plagiarism Free, Step-by-step guidance included</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Description below ── */}
                                <div className={`description-view ${isDescExpanded ? 'is-expanded' : 'is-collapsed'}`}>
                                    {renderedDescriptionHtml
                                        ? <div className="story-content" dangerouslySetInnerHTML={{ __html: renderedDescriptionHtml }} />
                                        : <p className="no-desc">No description available.</p>
                                    }
                                </div>
                                {renderedDescriptionHtml && (
                                    <button
                                        type="button"
                                        className={`btn-desc-expand ${isDescExpanded ? "is-expanded" : "is-collapsed"}`}
                                        aria-expanded={isDescExpanded}
                                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    >
                                        {isDescExpanded ? "Show Less" : "Read Full Description"}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="reviews-grid">
                                <div className="quick-review-form">
                                    <h4>Share Your Experience</h4>
                                    <form onSubmit={handleReviewSubmit}>
                                        <input type="text" placeholder="Your Name" required value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} />
                                        <div className="interactive-stars">
                                            <span style={{fontSize:'0.85rem',color:'#64748b',marginRight:8}}>Rating:</span>
                                            {[1, 2, 3, 4, 5].map((star) => (<Star key={star} size={24} fill={reviewForm.rating >= star ? "#f4b316" : "none"} color={reviewForm.rating >= star ? "#f4b316" : "#cbd5e1"} style={{cursor:'pointer'}} onClick={() => setReviewForm({ ...reviewForm, rating: star })} />))}
                                        </div>
                                        <textarea placeholder="What did you think about this project?" required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                                        <button type="submit" disabled={submittingReview} style={{display:'flex',alignItems:'center',gap:8}}>
                                            {submittingReview ? "Submitting..." : <><CheckCircle size={18} /> Submit Review</>}
                                        </button>
                                    </form>
                                </div>
                                <div className="reviews-list">
                                    <h4>Reviews ({reviews.length})</h4>
                                    {reviews.length === 0 && (
                                        <div style={{textAlign:'center',padding:'32px',color:'#94a3b8'}}>
                                            <Star size={32} strokeWidth={1} style={{marginBottom:8}} />
                                            <p>No reviews yet. Be the first to share your experience!</p>
                                        </div>
                                    )}
                                    {reviews.map((r, i) => (
                                        <div key={i} className="review-item">
                                            <div className="review-top">
                                                <div className="u-avatar">{r.name ? r.name[0].toUpperCase() : '?'}</div>
                                                <div className="u-info">
                                                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                                        <span className="u-name">{r.name}</span>
                                                        {r.userId && (
                                                            <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:'0.7rem',padding:'2px 8px',background:'#dcfce7',color:'#15803d',borderRadius:20,fontWeight:700}}>
                                                                <CheckCircle size={10} /> Verified Buyer
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="u-stars">{[...Array(5)].map((_, si) => (<Star key={si} size={13} fill={si < r.rating ? "#f4b316" : "none"} color={si < r.rating ? "#f4b316" : "#cbd5e1"} />))}</div>
                                                </div>
                                            </div>
                                            <p>{r.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mobile-action-bar">
                    <div className="m-price"><span className="p">{formatPrice(currentPrice)}</span>{currentMRP > currentPrice && <span className="o">{formatPrice(currentMRP)}</span>}</div>
                    <div className="m-actions">
                        {isUnavailable ? <button className="btn-m-contact" onClick={handleContactNow}><MessageSquare size={18} /> Contact</button> : <><button className="btn-m-cart" onClick={() => handleAddToCart('add')}><ShoppingCart size={18} /></button><button className="btn-m-buy" onClick={() => handleAddToCart('buy')}>Buy</button></>}
                    </div>
                </div>
            </div>

            {isLightboxOpen && displayImages?.[activeImageIndex] && (
                <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}><div className="lightbox-content" onClick={(e) => e.stopPropagation()}><button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}><X size={32} /></button><img src={getOptimizedImageUrl(displayImages[activeImageIndex])} alt={synopsis.title} className="lightbox-image" /></div></div>
            )}
        </div>
    );
}
