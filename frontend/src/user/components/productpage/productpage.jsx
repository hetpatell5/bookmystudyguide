import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Slider from "react-slick";
import {
    ChevronLeft, ChevronRight, Star, ShoppingCart,
    Heart,
    MessageSquare,
    Layers, BookMarked, Share2, X, FileText,
    GraduationCap, RotateCcw, Package,
    CheckCircle, Users,
    Award, Eye
} from "lucide-react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./productpage.scss";
import "./ProductInfoTabs.scss"; // High-priority isolated styles for info tabs
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { toast } from "react-toastify";
import api from "../../../api";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { trackEvent, trackFormSubmit } from "../../../utils/analytics";
import { useAuth } from "../../../context/logintrue";
import { useRecentlyViewed } from "../../../context/RecentlyViewedContext";

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

const getAcademicSessionLabel = () => {
    const currentYear = new Date().getFullYear();
    const nextYearShort = String(currentYear + 1).slice(-2);
    return `Academic Session ${currentYear}-${nextYearShort}`;
};

const extractSeriesPrefix = (value) => {
    if (!value) return "";
    const normalized = String(value).trim().toUpperCase();
    const match = normalized.match(/([A-Z]{2,})[\s-]?\d*/);
    return match ? match[1] : "";
};

const getSubjectDedupKey = (item) => {
    if (!item) return "";
    return String(
        item.subjectId ||
        item.subjectName ||
        item.courseCode ||
        item.sku ||
        item.title ||
        item.id
    ).trim().toUpperCase();
};

const dedupeProductsBySubject = (items = []) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = getSubjectDedupKey(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const normalizeProductList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.data)) return payload.data;
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
    // remove &nbsp; (both the string and the actual non-breaking space character \u00A0)
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

    // Fix PDF paste artifacts where words are split across <p> tags
    html = html.replace(/-<\/p>\s*<p[^>]*>/gi, "-");
    html = html.replace(/([a-zA-Z])<\/p>\s*<p[^>]*>([a-z])/g, "$1$2");

    // Remove zero-width spaces, soft hyphens, and other invisible breaking characters pasted from PDFs
    html = html.replace(/[\u200B-\u200D\uFEFF]/g, "");
    html = html.replace(/\u00AD/g, "");
    html = html.replace(/&shy;/gi, "");
    html = html.replace(/&#8203;/gi, "");

    // Replace hyphens with non-breaking hyphens (&#8209;) outside of HTML tags
    // to prevent words like FOUR-YEAR from wrapping at the hyphen
    const parts = html.split(/(<[^>]+>)/g);
    for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<')) {
            // Remove space after hyphen if it's bounded by alphanumeric
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-\s+([a-zA-Z0-9])/g, "$1&#8209;$2");
            // Replace regular hyphens with non-breaking hyphens
            parts[i] = parts[i].replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, "$1&#8209;$2");
        }
    }
    html = parts.join('');

    return html;
};

const applyDescriptionTokens = (raw, product) => {
    if (raw == null) return raw;
    let html = raw;
    if (Array.isArray(html)) html = html.join(" ");
    if (typeof html === "object") {
        html = html.html || html.description || html.content || html.text || "";
    }
    if (typeof html !== "string") return raw;
    const safe = (v) => v == null || (typeof v === "string" && !v.trim()) ? "" : String(v);
    const replacements = {
        "[PRODUCT_NAME]": safe(product?.title),
        "[MAIN_DEGREE]": safe(product?.mainDegree),
        "[SUB_DEGREE]": safe(product?.subDegree),
        "[SUBJECT_NAME]": safe(product?.subjectName),
        "[COURSE]": safe(product?.course),
        "[UNIVERSITY]": safe(product?.university),
        "[YEAR]": safe(product?.year ?? product?.yearName),
        "[SEMESTER]": safe(product?.semester ?? product?.semesterName),
    };
    Object.entries(replacements).forEach(([token, value]) => {
        html = html.split(token).join(value);
    });
    html = html.replace(/\[([A-Z0-9_]+)\]/g, (match, token) => {
        const mappedKey = `[${token}]`;
        return replacements[mappedKey] != null ? replacements[mappedKey] : "";
    });
    return html;
};

const buildRenderableDescriptionHtml = (raw, product) => {
    const tokenApplied = applyDescriptionTokens(raw, product);
    const normalized = normalizeDescriptionHtml(tokenApplied);
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

const getGuideType = (product) => {
    const haystack = [
        product?.sku || "",
        product?.courseCode || "",
        product?.title || "",
    ].join(" ").toUpperCase();
    if (haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION")) return "Important Questions (IMPQS)";
    if (haystack.includes("AINOTES") || haystack.includes("AI NOTES") || haystack.includes("AI-NOTES")) return "AI Notes";
    if (haystack.includes("MASTERY")) return "Mastery Book";
    if (haystack.includes("QUESTIONBANK") || haystack.includes("QUESTION BANK")) return "Question Bank";
    if (haystack.includes("SOLVED") && haystack.includes("PAPER")) return "Solved Papers";
    if (haystack.includes("GUIDE")) return "Study Guide";
    return null;
};

// Related-product carousels always show Important Questions (IMPQS) first,
// then AI Notes, then Mastery Book — everything else keeps its original order after.
const GUIDE_TYPE_PRIORITY = ["Important Questions (IMPQS)", "AI Notes", "Mastery Book"];
const sortByGuideTypePriority = (items = []) => {
    return [...items].sort((a, b) => {
        const ai = GUIDE_TYPE_PRIORITY.indexOf(getGuideType(a));
        const bi = GUIDE_TYPE_PRIORITY.indexOf(getGuideType(b));
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
};

const getPageRange = (product) => {
    const haystack = [
        product?.sku || "",
        product?.courseCode || "",
        product?.title || "",
        product?.subDegree || "",
        product?.mainDegree || "",
    ].join(" ").toUpperCase();
    if (haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION")) return "80–90 Pages";
    if (haystack.includes("AINOTES") || haystack.includes("AI NOTES") || haystack.includes("AI-NOTES")) return "100–130 Pages";
    if (haystack.includes("MASTERY")) return "280–350 Pages";
    return null;
};

const isImpqs = (product) => {
    const haystack = [
        product?.sku || "",
        product?.courseCode || "",
        product?.title || "",
        product?.subDegree || "",
        product?.mainDegree || "",
    ].join(" ").toUpperCase();
    return haystack.includes("IMPQS") || haystack.includes("IMPORTANT QUESTION");
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

// --- UNIFIED PRODUCT CARD (matches home page card exactly) ---
const ProductCard = React.memo(({ rel, onAddToCart }) => {
    const navigate = useNavigate ? undefined : undefined; // navigate available in parent
    let images = rel.images;
    if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch (e) { images = []; }
    }
    const imageUrl = rel.image || (Array.isArray(images) && images.length > 0 ? images[0] : null) || "";
    const discount = rel.mrp > rel.price ? Math.round(((rel.mrp - rel.price) / rel.mrp) * 100) : null;

    return (
        <div
            className="pp-product-card"
            onClick={() => window.location.href = `/productpage/${rel.id}`}
        >
            {/* image */}
            <div className="pp-card-media">
                <div className="pp-media-frame">
                    {imageUrl
                        ? <img src={getOptimizedImageUrl(imageUrl)} alt={rel.title} loading="lazy" />
                        : <div className="pp-no-img" />
                    }
                </div>
                {discount && <span className="pp-discount-tag">{discount}% OFF</span>}
                <div className="pp-card-hover">
                    <Eye size={16} /> Quick View
                </div>
            </div>

            {/* info */}
            <div className="pp-card-info">
                <h3 className="pp-card-title">{rel.title}</h3>
                <div className="pp-card-price">
                    <span className="pp-price">{formatPrice(rel.price)}</span>
                    {rel.mrp > rel.price && <span className="pp-mrp">{formatPrice(rel.mrp)}</span>}
                </div>
                <div className="pp-card-footer">
                    <button
                        className="pp-btn-buy"
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/productpage/${rel.id}`; }}
                    >
                        Buy Now
                    </button>
                    {onAddToCart && (
                        <button
                            className="pp-btn-cart"
                            onClick={(e) => { e.stopPropagation(); onAddToCart(rel); }}
                            title="Add to Cart"
                        >
                            <ShoppingCart size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});


// --- MAIN PAGE ---
export default function ProductPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { requireLogin, userId } = useAuth();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { pushRecentItem } = useRecentlyViewed();

    const handleToggleWishlist = (p) => {
        if (!isInWishlist(p.id)) {
            trackEvent("Wishlist", "Add to Wishlist", p.title);
        }
        toggleWishlist(p);
    };

    // --- STATES ---
    const [product, setProduct] = useState(null);
    const [subjectProducts, setSubjectProducts] = useState([]);
    const [subDegreeProducts, setSubDegreeProducts] = useState([]);
    const [bookProducts, setBookProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [discoverySlidesToShow, setDiscoverySlidesToShow] = useState(4);
    const [infoActiveTab, setInfoActiveTab] = useState(() => {
        // Auto-switch to reviews tab if ?tab=reviews in URL
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            return params.get("tab") === "reviews" ? "reviews" : "description";
        }
        return "description";
    });
    const [quantity, setQuantity] = useState(1);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [currentSeries, setCurrentSeries] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, comment: "" });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [contactInfo, setContactInfo] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
    const sliderRef = useRef(null);
    const bookSliderRef = useRef(null);
    const subjectSliderRef = useRef(null);
    const subDegreeSliderRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const updateViewportWidth = () => setViewportWidth(window.innerWidth);
        window.addEventListener("resize", updateViewportWidth);
        return () => window.removeEventListener("resize", updateViewportWidth);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const updateDiscoverySlides = () => {
            const w = window.innerWidth;
            if (w <= 480) setDiscoverySlidesToShow(1);
            else if (w <= 768) setDiscoverySlidesToShow(2);
            else if (w <= 1024) setDiscoverySlidesToShow(3);
            else setDiscoverySlidesToShow(4);
        };
        updateDiscoverySlides();
        window.addEventListener("resize", updateDiscoverySlides);
        return () => window.removeEventListener("resize", updateDiscoverySlides);
    }, []);

    useEffect(() => {
        // The sticky mobile buy bar (.mobile-action-bar) occupies the full
        // bottom strip on small screens — mark <body> so the globally-mounted
        // WhatsApp/scroll-to-top floating buttons can shift above it instead
        // of overlapping it (see App-level buttons' CSS).
        document.body.classList.add("has-mobile-action-bar");
        return () => document.body.classList.remove("has-mobile-action-bar");
    }, []);

    useEffect(() => {
        api.get("/api/contact")
            .then((res) => { if (res.data) setContactInfo(res.data); })
            .catch((err) => console.error("Error fetching contact info:", err));
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    // --- CALLBACKS ---
    const fetchReviews = useCallback(() => {
        api.get(`/api/reviews?productId=${id}`)
            .then(res => setReviews(res.data))
            .catch(err => console.error("Error fetching reviews:", err));
    }, [id]);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/products/${id}`)
            .then(async res => {
                const data = res.data?.success ? res.data.data : res.data;
                if (!data) { setLoading(false); return; }
                setActiveImageIndex(data.coverImageIndex || 0);
                fetchReviews();

                const fetchExtras = async () => {
                    try {
                        const promiseMap = {};
                        if (data.bookId) promiseMap.book = api.get(`/api/books/${data.bookId}?t=${Date.now()}`);
                        promiseMap.related = api.get(`/api/products/related/${id}?limit=12`);

                        const keys = Object.keys(promiseMap);
                        const results = await Promise.allSettled(Object.values(promiseMap));

                        let bookData = null;
                        let relatedData = { sameSubject: [], sameBook: [], sameProgram: [] };

                        keys.forEach((key, i) => {
                            if (results[i].status !== 'fulfilled') return;
                            const d = results[i].value.data?.success ? results[i].value.data.data : results[i].value.data;
                            if (key === 'book') bookData = d;
                            if (key === 'related' && d) relatedData = d;
                        });

                        const parsePages = (pages) => {
                            if (!pages) return [];
                            if (Array.isArray(pages)) return pages;
                            if (typeof pages === 'string') {
                                if (pages.startsWith('[') || pages.startsWith('{')) {
                                    try { return JSON.parse(pages); } catch (e) { return [pages]; }
                                }
                                return [pages];
                            }
                            return [];
                        };

                        const productImages = parsePages(data.images);
                        const productCP = parsePages(data.commonPages);
                        const bookCP = parsePages(bookData?.commonPages);
                        const combined = [...productImages, ...productCP, ...bookCP].filter((val, idx, self) => val && self.indexOf(val) === idx);
                        const allImages = combined.length > 0 ? combined : ["https://via.placeholder.com/600"];
                        const currentSeries = extractSeriesPrefix(data.sku || data.title || data.subjectName);

                        const productWithImages = { ...data, images: allImages, bookName: bookData?.title || bookData?.name };
                        setProduct(productWithImages);
                        pushRecentItem(productWithImages);
                        setCurrentSeries(currentSeries);
                        setAllProducts([]);
                        setSubjectProducts(sortByGuideTypePriority(relatedData.sameSubject || []));
                        setBookProducts(sortByGuideTypePriority(relatedData.sameBook || []));
                        setSubDegreeProducts(sortByGuideTypePriority(relatedData.sameProgram || []));
                    } catch (err) { console.error("Error fetching extras:", err); }
                };
                await fetchExtras();
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [id, fetchReviews]);

    useEffect(() => {
        if (product) {
            const links = product.ProductLinks || product.productLinks || [];
            const isHardLink = (l) => !l.type || (!l.type.toLowerCase().includes('soft') && !l.type.toLowerCase().includes('digital'));
            const hardLinks = links.map((l, idx) => ({ ...l, _idx: idx })).filter(isHardLink);
            const englishHard = hardLinks.find(l => (l.language || "").toLowerCase() === "english") || hardLinks[0];
            if (englishHard) {
                setSelectedVariant({
                    type: "hard",
                    id: `h_${englishHard._idx}`,
                    price: englishHard.price || product.price,
                    stock: product.stock,
                    language: englishHard.language || "English",
                    link: englishHard.link || ""
                });
            } else if (links[0]) {
                const firstLink = links[0];
                setSelectedVariant({
                    type: (firstLink.type?.toLowerCase().includes('soft') || firstLink.type?.toLowerCase().includes('digital')) ? 'soft' : 'hard',
                    id: `link_0`,
                    price: firstLink.price || product.price,
                    stock: product.stock,
                    language: firstLink.language || "Standard",
                    link: firstLink.link || ""
                });
            } else {
                setSelectedVariant({
                    type: "hard",
                    id: "main_hard",
                    price: product.price,
                    stock: product.stock,
                    details: "Physical Book",
                    language: product.languageName || product.language || "Standard"
                });
            }
            setQuantity(1);
        }
    }, [product]);

    // --- SLIDER SETTINGS ---
    const sliderSettings = {
        dots: true, infinite: true, speed: 800, slidesToShow: 1, slidesToScroll: 1,
        autoplay: true, autoplaySpeed: 3000, fade: true, pauseOnHover: false, arrows: false,
    };

    // Related-products carousel — same JS-driven slidesToShow pattern as the
    // homepage's BookProductSliders, so slide width is computed in React
    // state from the real viewport rather than left to slick's own
    // media-query-based responsive config (which mis-sizes on some mobile loads).
    const discoverySettings = {
        arrows: false, dots: false, infinite: true, speed: 600,
        autoplay: true, autoplaySpeed: 2500, pauseOnHover: true,
        slidesToShow: discoverySlidesToShow, slidesToScroll: 1,
    };


    // --- HANDLERS ---
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            await api.post('/api/reviews', { ...reviewForm, productId: id, userId: userId || null });
            setReviewForm({ name: "", rating: 5, comment: "" });
            fetchReviews();
            toast.success("Review submitted! Thank you.");
        } catch (err) { console.error("Error submitting review:", err); toast.error("Failed to submit review"); }
        finally { setSubmittingReview(false); trackFormSubmit("Product Review"); }
    };

    const changeQuantity = (delta) => {
        setQuantity(q => {
            const next = q + delta;
            if (next < 1) return 1;
            if (selectedVariant?.type === 'soft' && next > 1) return 1;
            if (selectedVariant?.type === 'hard' && product?.stock && next > 99) return 99;
            return next;
        });
    };

    const handleAddToCart = async (action) => {
        if (!selectedVariant) return;
        if (product?.isActive === false) { toast.error("This product is currently unavailable."); return; }
        const finalProduct = {
            _id: product.id,
            name: `${product.title} (${selectedVariant.type === 'soft' ? 'Soft Copy' : 'Hard Copy'} - ${selectedVariant.language})`,
            price: selectedVariant.price,
            image: product.images[0],
            type: selectedVariant.type,
            fileUrl: selectedVariant.link || "",
            language: selectedVariant.language || ""
        };
        requireLogin(async () => {
            const success = await addToCart(finalProduct, quantity);
            if (success !== false) {
                if (action === 'buy') { 
                    trackEvent("Cart", "Buy Now", product.title, selectedVariant.price); 
                    navigate('/checkout'); 
                } else { 
                    toast.success("Added to cart");
                    trackEvent("Cart", "Add to Cart", product.title, selectedVariant.price); 
                }
            }
        });
    };

    const handleContactNow = () => {
        if (!contactInfo?.whatsapp) { toast.error("WhatsApp contact is not available right now."); return; }
        const whatsappNumber = String(contactInfo.whatsapp).replace(/\D/g, "");
        const message = [`Hello BMSG, I want details for:`, `Product: ${product?.title}`, `Variant: ${selectedVariant?.type === 'soft' ? 'Soft' : 'Hard'}`, `Page: ${window.location.href}`].join("\n");
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
    };

    const handleShare = () => {
        const shareData = { title: product.title, url: window.location.href };
        if (navigator.share) navigator.share(shareData).catch(console.error);
        else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
        trackEvent("Social", "Share Product", product.title);
    };

    if (loading && !product) {
        return (
            <div className="product-page-loading" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>Loading product details...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }
    if (!product) return <div className="product-not-found">Product Not Found</div>;

    const currentPrice = selectedVariant ? Number(selectedVariant.price) : 0;
    const currentMRP = Number(product?.mrp || 0);
    const discountPercent = currentMRP > currentPrice ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0;

    const sameSeriesProducts = dedupeProductsBySubject(bookProducts.filter((item) => extractSeriesPrefix(item?.sku || item?.title || item?.subjectName) === currentSeries));
    const uniqueBookProducts = dedupeProductsBySubject(bookProducts);
    const uniqueSubDegreeProducts = dedupeProductsBySubject(subDegreeProducts);

    const catalogSpecs = [];
    if (product.mainDegree) catalogSpecs.push({ key: "degree", label: "Main degree", value: product.mainDegree });
    if (product.subDegree) catalogSpecs.push({ key: "sub", label: "Sub degree", value: product.subDegree });
    if (product.subjectName) catalogSpecs.push({ key: "subject", label: "Subject", value: product.subjectName });
    if (product.year != null) catalogSpecs.push({ key: "year", label: "Year", value: String(product.year) });
    if (product.semester != null) catalogSpecs.push({ key: "sem", label: "Semester", value: String(product.semester) });

    const renderedDescriptionHtml = buildRenderableDescriptionHtml(product.description, product);
    const hardDisabled = false; // Stock logic removed
    const isUnavailable = product?.isActive === false;

    return (
        <div className="product-page">
            <Helmet>
                <title>{`${product.title} | Book My Study Guide`}</title>
                <meta name="description" content={stripHtmlToText(renderedDescriptionHtml).slice(0, 160)} />
                <meta property="og:image" content={getOptimizedImageUrl(product.images?.[0])} />
                <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org/", "@type": "Product", "name": product.title, "image": [getOptimizedImageUrl(product.images?.[0])], "description": stripHtmlToText(renderedDescriptionHtml), "offers": { "@type": "Offer", "priceCurrency": "INR", "price": product.price, "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } })}</script>
            </Helmet>

            <div className="container">
                <nav className="breadcrumb">
                    <Link to="/">Home</Link>
                    {product.mainDegree && <><ChevronRight size={14} /><Link to={product.bookId && product.mainDegreeId ? `/sub-degrees/${product.bookId}/${product.mainDegreeId}` : `/best-sellers`}>{product.mainDegree}</Link></>}
                    <ChevronRight size={14} /><span className="current">{product.title}</span>
                </nav>

                <div className="product-layout">
                    <div className="product-gallery">
                        <div className="gallery-main">
                            <Slider ref={sliderRef} dots={false} infinite={product.images.length > 1} speed={500} slidesToShow={1} slidesToScroll={1} arrows={product.images.length > 1} autoplay={product.images.length > 1} autoplaySpeed={3500} beforeChange={(current, next) => setActiveImageIndex(next)}>
                                {product.images.map((img, idx) => (
                                    <div key={idx} className="slide-item">
                                        <div className="zoom-wrapper" onClick={() => setIsLightboxOpen(true)}><img src={getOptimizedImageUrl(img)} alt={product.title} /></div>
                                    </div>
                                ))}
                            </Slider>
                        </div>
                        {product.images.length > 1 && (
                            <div className="gallery-thumbs">
                                {product.images.map((img, idx) => (
                                    <button key={idx} className={`thumb ${idx === activeImageIndex ? 'active' : ''}`} onClick={() => { setActiveImageIndex(idx); sliderRef.current?.slickGoTo(idx); }}>
                                        <img src={getOptimizedImageUrl(img)} alt={`Thumbnail ${idx}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="product-info">
                        <div className="info-header">
                            <h1>{product.title}</h1>
                            <div className="info-meta">
                                {(() => {
                                    const seed = String(product.id || product._id || 1).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                                    const displayRating = reviews.length > 0
                                        ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
                                        : (4.2 + (seed % 8) * 0.1).toFixed(1);
                                    const studentBase = 800 + (seed % 12) * 150;
                                    const studentLabel = studentBase >= 1000
                                        ? `${(studentBase / 1000).toFixed(1).replace('.0', '')}k+`
                                        : `${studentBase}+`;
                                    return (<>
                                        <div className="rating"><Star size={16} fill="#f4b316" color="#f4b316" /><span>{displayRating} ({reviews.length} Reviews)</span></div>
                                        <span className="author">By Book My Study Guide</span>
                                        <span className="verified-students"><Users size={14} /> {studentLabel} Students</span>
                                    </>);
                                })()}
                            </div>
                        </div>

                        <div className="academic-specs-card glass-card">
                            <div className="card-title"><GraduationCap size={18} /> Course Documentation</div>
                            <div className="specs-grid">
                                {catalogSpecs.map((row) => (<div key={row.key} className="spec-item"><label>{row.label}</label><p>{row.value}</p></div>))}
                                <div className="spec-item">
                                    <label>Medium</label>
                                    <p>{(() => {
                                        const allLinks = product.ProductLinks || product.productLinks || [];
                                        const langs = [...new Set(allLinks.map(l => l.language).filter(Boolean))];
                                        return langs.length > 0 ? langs.join(" / ") : (product.languageName || "English");
                                    })()}</p>
                                </div>
                            </div>
                        </div>


                        <div className="price-block">
                            <div className="price-info">
                                <div className="current-price">{formatPrice(currentPrice)}{discountPercent > 0 && <span className="price-discount-badge">-{discountPercent}% OFF</span>}</div>
                                {currentMRP > currentPrice && <div className="mrp-info"><span className="old-price">{formatPrice(currentMRP)}</span></div>}
                            </div>
                            <div className="stock-badge-container">
                                {isUnavailable ? <span className="stock-status out">Unavailable</span> : <span className="stock-status in">In Stock</span>}
                            </div>
                        </div>

                        <div className="variants-section elite-variants">
                            {(() => {
                                const allLinks = product.ProductLinks || product.productLinks || [];
                                const isHard = (l) => !l.type || l.type.toLowerCase().includes('hard') || (!l.type.toLowerCase().includes('soft') && !l.type.toLowerCase().includes('digital'));
                                const isSoft = (l) => l.type && (l.type.toLowerCase().includes('soft') || l.type.toLowerCase().includes('digital'));

                                // Group by language
                                const langMap = {};
                                allLinks.forEach((link, idx) => {
                                    const lang = link.language || "Standard";
                                    if (!langMap[lang]) langMap[lang] = { hard: null, soft: null };
                                    if (isHard(link)) langMap[lang].hard = { ...link, _idx: idx };
                                    else if (isSoft(link)) langMap[lang].soft = { ...link, _idx: idx };
                                });
                                const normalizeLang = (lang) => String(lang || "").trim().toLowerCase();
                                const langs = Object.keys(langMap).sort((a, b) => {
                                    const aIsEnglish = normalizeLang(a) === "english";
                                    const bIsEnglish = normalizeLang(b) === "english";
                                    if (aIsEnglish && !bIsEnglish) return -1;
                                    if (!aIsEnglish && bIsEnglish) return 1;
                                    return a.localeCompare(b);
                                });

                                // Fallback: product has no links — show a single default card
                                if (langs.length === 0) {
                                    const fallbackLang = product.languageName || product.language || "English";
                                    return (
                                        <div className="variant-type">
                                            <h3>Select Format &amp; Language</h3>
                                            <div className="variant-copy-row">
                                                <label className="vcb-card active">
                                                    <input type="radio" name="variant" checked readOnly />
                                                    <div className="vcb-card-check"><CheckCircle size={16} /></div>
                                                    <div className="vcb-card-body">
                                                        <span className="vcb-card-type">Hard Copy</span>
                                                        <span className="vcb-card-lang">{fallbackLang}</span>
                                                    </div>
                                                    <span className="vcb-card-price">{formatPrice(product.price)}</span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                }

                                const hardCards = langs.filter(l => langMap[l].hard);
                                const softCards = langs.filter(l => langMap[l].soft);
                                return (
                                    <div className="variant-type">
                                        <h3>Select Format &amp; Language</h3>
                                        <div className="variant-lang-list">
                                            {hardCards.length > 0 && (
                                                <div className="vcb-section">
                                                    <div className="vcb-section-label">Hard Copy</div>
                                                    <div className="variant-copy-row">
                                                        {hardCards.map((lang) => {
                                                            const { hard } = langMap[lang];
                                                            return (
                                                                <label key={lang} className={`vcb-card ${selectedVariant?.id === `h_${hard._idx}` ? 'active' : ''}`} onClick={() => setSelectedVariant({ type: "hard", id: `h_${hard._idx}`, price: hard.price || product.price, stock: product.stock, language: lang })}>
                                                                    <input type="radio" name="variant" checked={selectedVariant?.id === `h_${hard._idx}`} onChange={() => {}} />
                                                                    <div className="vcb-card-check"><CheckCircle size={16} /></div>
                                                                    <span className="vcb-card-lang-only">{lang}</span>
                                                                    <span className="vcb-card-price">{formatPrice(hard.price || product.price)}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {softCards.length > 0 && (
                                                <div className="vcb-section">
                                                    <div className="vcb-section-label">Soft Copy</div>
                                                    <div className="variant-copy-row">
                                                        {softCards.map((lang) => {
                                                            const { soft } = langMap[lang];
                                                            return (
                                                                <label key={lang} className={`vcb-card vcb-card--soft ${selectedVariant?.id === `s_${soft._idx}` ? 'active' : ''}`} onClick={() => setSelectedVariant({ type: "soft", id: `s_${soft._idx}`, price: soft.price || product.price, language: lang, link: soft.link })}>
                                                                    <input type="radio" name="variant" checked={selectedVariant?.id === `s_${soft._idx}`} onChange={() => {}} />
                                                                    <div className="vcb-card-check"><CheckCircle size={16} /></div>
                                                                    <span className="vcb-card-lang-only">{lang}</span>
                                                                    <span className="vcb-card-price">{formatPrice(soft.price || product.price)}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
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
                                <><button type="button" className="btn-buy-now" onClick={() => handleAddToCart('buy')} disabled={hardDisabled}>Buy Now</button><button type="button" className="btn-add-cart" onClick={() => handleAddToCart('add')} disabled={hardDisabled}>Add to Cart</button></>
                            )}
                            <button type="button" className={`btn-wishlist ${isInWishlist(product.id) ? 'active' : ''}`} onClick={() => handleToggleWishlist(product)}><Heart size={20} fill={isInWishlist(product.id) ? "#ef4444" : "none"} /></button>
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
                                    <h4 className="details-table-title">Product Details</h4>
                                    <table>
                                        <tbody>
                                            {product.mainDegree && <tr><td>Category</td><td>{product.mainDegree}</td></tr>}
                                            {product.subDegree && <tr><td>Sub Category</td><td>{product.subDegree}</td></tr>}
                                            {product.subjectName && <tr><td>Subject</td><td>{product.subjectName}</td></tr>}
                                            {getGuideType(product) && <tr><td>Guide Type</td><td>{getGuideType(product)}</td></tr>}
                                            {(() => {
                                                const allLinks = product.ProductLinks || product.productLinks || [];
                                                const langs = [...new Set(allLinks.map(l => l.language).filter(Boolean))];
                                                const langDisplay = langs.length > 0 ? langs.join(", ") : product.languageName;
                                                return langDisplay ? <tr><td>Language</td><td>{langDisplay}</td></tr> : null;
                                            })()}
                                            {product.year != null && <tr><td>Year</td><td>{product.year}</td></tr>}
                                            {product.semester != null && <tr><td>Semester</td><td>{product.semester}</td></tr>}
                                            <tr><td>Publisher</td><td>Book My Study Guide</td></tr>
                                            <tr><td>University</td><td>IGNOU (Indira Gandhi National Open University)</td></tr>

                                            {getPageRange(product) && <tr><td>Pages</td><td>{getPageRange(product)}</td></tr>}
                                            {isImpqs(product) && <tr><td>Questions with Solution</td><td>35-40</td></tr>}
                                            {isImpqs(product) && <tr><td>Back Questions</td><td>40+</td></tr>}
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
                                        <textarea placeholder="What did you think about this product?" required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
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

                {bookProducts.length > 0 && (
                    <div className="discovery-section">
                        <div className="discovery-header">
                            <h3>Other Subjects in {product.subDegree || product.bookName || "this Book"}</h3>
                            <div className="discovery-header-right">
                                <span className="series-tag">{(() => { const h = ((product.sku || product.courseCode || product.title) || "").toUpperCase(); if (h.includes("IMPQS") || h.includes("IMPORTANT QUESTION")) return "IMPQS"; if (h.includes("AINOTES") || h.includes("AI NOTES") || h.includes("AI-NOTES")) return "AI Notes"; if (h.includes("MASTERY")) return "Mastery"; if (h.includes("QUESTIONBANK") || h.includes("QUESTION BANK")) return "Question Bank"; if (h.includes("SOLVED")) return "Solved Papers"; return "Study Guide"; })()}</span>
                                <div className="slider-nav-btns">
                                    <button type="button" className="slider-nav-btn" onClick={() => bookSliderRef.current?.slickPrev()} aria-label="Previous"><ChevronLeft size={18} /></button>
                                    <button type="button" className="slider-nav-btn" onClick={() => bookSliderRef.current?.slickNext()} aria-label="Next"><ChevronRight size={18} /></button>
                                </div>
                                {product.bookId && product.mainDegreeId && product.subDegreeId && <Link to={`/categorized-products/${product.bookId}/${product.mainDegreeId}/${product.subDegreeId}`} className="btn-view-all">View All</Link>}
                            </div>
                        </div>
                        <div className="discovery-slider">
                            <Slider ref={bookSliderRef} {...discoverySettings} infinite={bookProducts.length > discoverySlidesToShow}>{bookProducts.map((rel) => (<ProductCard key={rel.id} rel={rel} onAddToCart={addToCart} />))}</Slider>
                        </div>
                    </div>
                )}

                {subjectProducts.length > 0 && (
                    <div className="discovery-section">
                        <div className="discovery-header">
                            <h3>More for {product.subjectName || "this Subject"}</h3>
                            <div className="discovery-header-right">
                                <span className="series-tag">All Formats</span>
                                <div className="slider-nav-btns">
                                    <button type="button" className="slider-nav-btn" onClick={() => subjectSliderRef.current?.slickPrev()} aria-label="Previous"><ChevronLeft size={18} /></button>
                                    <button type="button" className="slider-nav-btn" onClick={() => subjectSliderRef.current?.slickNext()} aria-label="Next"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="discovery-slider">
                            <Slider ref={subjectSliderRef} {...discoverySettings} infinite={subjectProducts.length > discoverySlidesToShow}>{subjectProducts.map((rel) => (<ProductCard key={rel.id} rel={rel} onAddToCart={addToCart} />))}</Slider>
                        </div>
                    </div>
                )}

                {subDegreeProducts.length > 0 && (
                    <div className="discovery-section">
                        <div className="discovery-header">
                            <h3>More in {product.subDegree || "this Program"}</h3>
                            <div className="discovery-header-right">
                                <div className="slider-nav-btns">
                                    <button type="button" className="slider-nav-btn" onClick={() => subDegreeSliderRef.current?.slickPrev()} aria-label="Previous"><ChevronLeft size={18} /></button>
                                    <button type="button" className="slider-nav-btn" onClick={() => subDegreeSliderRef.current?.slickNext()} aria-label="Next"><ChevronRight size={18} /></button>
                                </div>
                                <Link to={`/subjects/${product?.subDegreeId}`} className="btn-view-all">View All</Link>
                            </div>
                        </div>
                        <div className="discovery-slider"><Slider ref={subDegreeSliderRef} {...discoverySettings} infinite={subDegreeProducts.length > discoverySlidesToShow}>{subDegreeProducts.map(rel => (<ProductCard key={rel.id} rel={rel} onAddToCart={addToCart} />))}</Slider></div>
                    </div>
                )}

                <div className="mobile-action-bar">
                    <div className="m-top-row">
                        <div className="m-price"><span className="m-current">{formatPrice(currentPrice)}</span>{currentMRP > currentPrice && <span className="m-old">{formatPrice(currentMRP)}</span>}</div>
                        {!isUnavailable && (
                            <div className="m-qty-picker">
                                <button type="button" onClick={() => changeQuantity(-1)}>-</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => changeQuantity(1)}>+</button>
                            </div>
                        )}
                    </div>
                    <div className="m-actions">
                        {isUnavailable ? <button className="btn-m-contact" onClick={handleContactNow}><MessageSquare size={18} /> Contact Now</button> : <><button className="btn-m-cart" onClick={() => handleAddToCart('add')} disabled={hardDisabled}><ShoppingCart size={18} /> Add to Cart</button><button className="btn-m-buy" onClick={() => handleAddToCart('buy')} disabled={hardDisabled}>Buy Now</button></>}
                    </div>
                </div>
            </div>

            {isLightboxOpen && product.images?.[activeImageIndex] && (
                <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}><div className="lightbox-content" onClick={(e) => e.stopPropagation()}><button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}><X size={32} /></button><img src={getOptimizedImageUrl(product.images[activeImageIndex])} alt={product.title} className="lightbox-image" /></div></div>
            )}
        </div>
    );
}


