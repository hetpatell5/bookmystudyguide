import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, ChevronRight, Star, ShoppingCart, Zap,
  Heart, ShieldCheck, RefreshCcw, Share2, Layers,
  FileText, Award, CheckCircle, Users, ShieldHalf,
  GraduationCap, ClipboardCheck, BookOpen, Globe,
  Truck, BadgeCheck,
} from "lucide-react";
import api from "../../../../api";
import "./PracticalDetail.scss";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { toast } from "react-toastify";

const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const resolveName = (value, fallback = "") => {
  if (!value) return fallback;
  if (isUuid(value)) return fallback;
  if (typeof value === "string") return value;
  return value.name || fallback;
};

export default function PracticalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchItem = async () => {
      try {
        const res = await api.get(`/api/synopsis/${id}`);
        const data = res.data?.data || res.data;
        setItem(data);

        if (data.synopsisLinks && data.synopsisLinks.length > 0) {
          const first = data.synopsisLinks[0];
          setSelectedVariant({
            id: 0,
            language: first.language,
            type: first.type || "Digital",
            category: first.category || "Practical",
            price: first.price || data.price,
            mrp: first.mrp || data.mrp || 0,
            link: first.link,
            images: first.images?.length > 0 ? first.images : null,
            coverImageIndex: first.coverImageIndex || 0,
          });
        } else if (data?.price) {
          setSelectedVariant({ id: "base", language: "Standard", type: "Digital", category: "Practical", price: data.price, mrp: data.mrp || 0, isBase: true });
        }
      } catch (err) {
        console.error("Error fetching practical detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleAddToCart = async (action) => {
    if (!selectedVariant || !item) return;
    const finalProduct = {
      _id: item.id,
      name: `${item.title} (${selectedVariant.category} - ${selectedVariant.language})`,
      price: selectedVariant.price,
      image: (selectedVariant.images && selectedVariant.images[selectedVariant.coverImageIndex || 0]) || item.images?.[0],
      type: `${selectedVariant.category} (${selectedVariant.type})`,
      fileUrl: selectedVariant.link || "",
      language: selectedVariant.language || "",
      isSynopsis: true,
    };
    const success = await addToCart(finalProduct, 1);
    if (success === false) navigate("/auth");
    else if (action === "buy") navigate("/checkout");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: item.title, url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) return null;
  if (!item) return <div className="sd-error">Practical not found.</div>;

  const currentPrice = selectedVariant ? selectedVariant.price : item.price;
  const currentMRP = selectedVariant ? (selectedVariant.mrp || item.mrp || 0) : (item.mrp || 0);
  const hasDiscount = Number(currentMRP) > Number(currentPrice);
  const discountPercent = hasDiscount ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0;
  const displayImages = selectedVariant?.images?.length > 0 ? selectedVariant.images : item.images || [];

  const mainDegree = resolveName(item.mainDegreeId, item.mainDegree || item.mainDegreeName || "");
  const subDegree = resolveName(item.subDegreeId, item.subDegree || item.subDegreeName || "");
  const subject = resolveName(item.subjectId, item.subjectName || item.subject || "");

  return (
    <div className="sd-page">
      <Helmet>
        <title>{item.title} | BMSG Practical Reports</title>
        <meta name="description" content={item.description?.replace(/<[^>]*>/g, "").slice(0, 160)} />
      </Helmet>

      <div className="container">
        <button className="sd-back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      </div>

      <div className="sd-breadcrumb container">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <Link to="/practical">Practical Reports</Link>
        <ChevronRight size={13} />
        <span>{item.title}</span>
      </div>

      <div className="container sd-body">
        <aside className="sd-gallery">
          <div className="sd-gallery__main">
            {displayImages.length > 0 ? (
              <img src={getOptimizedImageUrl(displayImages[activeImageIndex] || displayImages[0])} alt={item.title} />
            ) : (
              <div className="sd-gallery__placeholder"><BookOpen size={48} /></div>
            )}
            {hasDiscount && <span className="sd-gallery__discount">-{discountPercent}% OFF</span>}
          </div>

          {displayImages.length > 1 && (
            <div className="sd-gallery__thumbs">
              {displayImages.map((img, idx) => (
                <button key={idx} className={`sd-gallery__thumb ${idx === activeImageIndex ? "active" : ""}`} onClick={() => setActiveImageIndex(idx)}>
                  <img src={getOptimizedImageUrl(img)} alt={`View ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}

          <div className="sd-delivery-badges">
            <div className="sd-delivery-badge"><Truck size={15} /><span>Instant Digital Delivery</span></div>
            <div className="sd-delivery-badge"><BadgeCheck size={15} /><span>University Approved Format</span></div>
            <div className="sd-delivery-badge"><Globe size={15} /><span>Available in Multiple Languages</span></div>
          </div>
        </aside>

        <div className="sd-info">
          <div className="sd-badges">
            {selectedVariant?.category && <span className="sd-badge sd-badge--type">{selectedVariant.category}</span>}
            <span className="sd-badge sd-badge--verified"><Award size={12} /> Expert Approved</span>
          </div>

          <h1 className="sd-title">{item.title}</h1>

          <div className="sd-rating">
            <div className="sd-stars">{[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#f5b800" color="#f5b800" />)}</div>
            <span>4.9</span>
            <span className="sd-rating__divider">·</span>
            <span>150+ Successful Submissions</span>
            <span className="sd-rating__divider">·</span>
            <Users size={14} />
            <span>2k+ Students</span>
          </div>

          <div className="sd-specs">
            {mainDegree && (
              <div className="sd-spec"><GraduationCap size={14} /><div><span className="sd-spec__label">Degree</span><span className="sd-spec__value">{mainDegree}</span></div></div>
            )}
            {subDegree && (
              <div className="sd-spec"><Layers size={14} /><div><span className="sd-spec__label">Programme</span><span className="sd-spec__value">{subDegree}</span></div></div>
            )}
            {subject && (
              <div className="sd-spec"><BookOpen size={14} /><div><span className="sd-spec__label">Subject</span><span className="sd-spec__value">{subject}</span></div></div>
            )}
            <div className="sd-spec"><FileText size={14} /><div><span className="sd-spec__label">Format</span><span className="sd-spec__value">MS Word / PDF</span></div></div>
            <div className="sd-spec"><Globe size={14} /><div><span className="sd-spec__label">Language</span><span className="sd-spec__value">{selectedVariant?.language || "English"}</span></div></div>
            <div className="sd-spec"><BadgeCheck size={14} /><div><span className="sd-spec__label">Session</span><span className="sd-spec__value">2024–25 (Latest)</span></div></div>
          </div>

          <div className="sd-price-block">
            <span className="sd-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(currentPrice)}</span>
            {hasDiscount && (
              <>
                <span className="sd-mrp">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(currentMRP)}</span>
                <span className="sd-saving">Save {discountPercent}%</span>
              </>
            )}
          </div>
          <p className="sd-price-note">Includes full practical file, observations & submission checklist.</p>

          {((item.synopsisLinks?.length > 0) || selectedVariant?.isBase) && (
            <div className="sd-variants">
              <p className="sd-variants__label"><Layers size={14} /> Select Version</p>
              <div className="sd-variants__grid">
                {(!item.synopsisLinks || item.synopsisLinks.length === 0) && (
                  <button className={`sd-variant ${selectedVariant?.id === "base" ? "active" : ""}`} onClick={() => setSelectedVariant({ id: "base", language: "Standard", type: "Digital", category: "Practical", price: item.price, mrp: item.mrp || 0, isBase: true })}>
                    <div className="sd-variant__top"><span className="sd-variant__lang">Standard</span><span className="sd-variant__type">Digital Copy</span></div>
                    <span className="sd-variant__price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price)}</span>
                  </button>
                )}
                {item.synopsisLinks?.map((link, idx) => (
                  <button key={idx} className={`sd-variant ${selectedVariant?.id === idx ? "active" : ""}`} onClick={() => { setSelectedVariant({ id: idx, language: link.language, type: link.type || "Digital", category: link.category || "Practical", price: link.price || item.price, mrp: link.mrp || item.mrp || 0, link: link.link, images: link.images?.length > 0 ? link.images : null, coverImageIndex: link.coverImageIndex || 0 }); setActiveImageIndex(0); }}>
                    <div className="sd-variant__top">
                      <span className="sd-variant__lang">{link.language}</span>
                      <span className="sd-variant__type">{link.category || "Practical"} · {link.type || "Digital"}</span>
                    </div>
                    <span className="sd-variant__price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(link.price || item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sd-cta">
            <button className="sd-btn sd-btn--cart" onClick={() => handleAddToCart("add")}><ShoppingCart size={18} /> Add to Cart</button>
            <button className="sd-btn sd-btn--buy" onClick={() => handleAddToCart("buy")}><Zap size={18} /> Buy Now</button>
            <div className="sd-cta__secondary">
              <button className={`sd-icon-btn ${isInWishlist(item.id) ? "active" : ""}`} onClick={() => toggleWishlist(item)} title="Wishlist">
                <Heart size={18} fill={isInWishlist(item.id) ? "currentColor" : "none"} />
              </button>
              <button className="sd-icon-btn" onClick={handleShare} title="Share"><Share2 size={18} /></button>
            </div>
          </div>

          <div className="sd-trust">
            <div className="sd-trust__item"><CheckCircle size={16} /><div><strong>100% Approval Rate</strong><p>Follows strict university guidelines</p></div></div>
            <div className="sd-trust__item"><ClipboardCheck size={16} /><div><strong>Plagiarism Free</strong><p>Original, verified content</p></div></div>
            <div className="sd-trust__item"><RefreshCcw size={16} /><div><strong>Submission Support</strong><p>Step-by-step guidance included</p></div></div>
            <div className="sd-trust__item"><ShieldHalf size={16} /><div><strong>Exam Ready</strong><p>Structured for your viva & submission</p></div></div>
          </div>

          {item.description && (
            <div className="sd-desc">
              <div className="sd-desc__head"><FileText size={16} /><h3>Practical Scope &amp; Objectives</h3></div>
              <div className="sd-desc__body" dangerouslySetInnerHTML={{ __html: item.description }} />
            </div>
          )}
        </div>
      </div>

      <div className="sd-mobile-bar">
        <div className="sd-mobile-bar__price">
          <span className="sd-mobile-bar__current">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(currentPrice)}</span>
          {hasDiscount && <span className="sd-mobile-bar__old">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(currentMRP)}</span>}
        </div>
        <div className="sd-mobile-bar__actions">
          <button className="sd-mobile-bar__cart" onClick={() => handleAddToCart("add")}><ShoppingCart size={18} /></button>
          <button className="sd-mobile-bar__buy" onClick={() => handleAddToCart("buy")}><Zap size={16} /> Buy Now</button>
        </div>
      </div>
    </div>
  );
}
