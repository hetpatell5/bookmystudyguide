import React, { useState, useEffect, useRef } from "react";
import Slider from "react-slick";
import { ArrowRight, ShoppingCart, Eye, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { useUserExperience } from "../../../../context/UserExperienceContext";
import { useCart } from "../../../../context/CartContext";
import { useWishlist } from "../../../../context/WishlistContext";
import { useAuth } from "../../../../context/logintrue";
import { toast } from "react-toastify";
import placeholderImg from "../../../../assets/images/1.webp";
import "./SynopsisSlider.scss";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const formatPrice = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export default function SynopsisSlider() {
    const navigate = useNavigate();
    const sliderRef = useRef(null);
    const [synopses, setSynopses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const { preferences } = useUserExperience();
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { requireLogin } = useAuth();

    useEffect(() => {
        const endpoint = preferences?.subDegree?.id
            ? `/api/synopsis?subDegreeId=${preferences.subDegree.id}&limit=10`
            : `/api/synopsis?limit=10`;

        api.get(endpoint)
            .then((res) => {
                const raw = res.data?.data || res.data || [];
                setSynopses(Array.isArray(raw) ? raw : []);
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const resize = () => {
            const w = window.innerWidth;
            if (w <= 480) setSlidesToShow(1);
            else if (w <= 768) setSlidesToShow(2);
            else if (w <= 1200) setSlidesToShow(3);
            else setSlidesToShow(4);
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    const settings = {
        arrows: false,
        infinite: synopses.length > slidesToShow,
        speed: 700,
        autoplay: true,
        autoplaySpeed: 3200,
        cssEase: "ease-out",
        pauseOnHover: true,
        slidesToShow,
        slidesToScroll: 1,
        dots: false,
        responsive: [
            { breakpoint: 1200, settings: { slidesToShow: 3 } },
            { breakpoint: 768, settings: { slidesToShow: 2 } },
            { breakpoint: 480, settings: { slidesToShow: 1 } },
        ],
    };

    if (loading || synopses.length === 0) return null;

    const goToProject = (id) => navigate(`/projects/${id}`);

    return (
        <section className="product-showcase ep-section">
            <div className="container">
                <div className="category-block">
                    <div className="block-header">
                        <div className="header-info">
                            <h2 className="block-title">Essential Projects</h2>
                        </div>

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
                            <Link to="/projects" className="view-all-link">
                                View All <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>

                    <Slider ref={sliderRef} {...settings} className="premium-slider">
                        {synopses.map((s) => {
                            const itemId = s.id || s._id;
                            const img = s.images?.[s.coverImageIndex || 0] || "";
                            const isInactive = s.isActive === false;

                            return (
                                <div key={itemId} className="slider-item">
                                    <div
                                        className={`product-card ${isInactive ? "is-inactive" : "is-active"}`}
                                        onClick={() => goToProject(itemId)}
                                    >
                                        <div className="card-media">
                                            <div className="media-frame">
                                                <img
                                                    src={img ? getOptimizedImageUrl(img, { width: 520 }) : placeholderImg}
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
                                                    className={`action-btn wishlist-btn ${isInWishlist(itemId) ? "active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleWishlist(s);
                                                    }}
                                                    title="Add to Wishlist"
                                                >
                                                    <Heart size={18} fill={isInWishlist(itemId) ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        goToProject(itemId);
                                                    }}
                                                    title="Quick View"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                            {s.mrp > s.price && (
                                                <span className="discount-tag">
                                                    {Math.round(((s.mrp - s.price) / s.mrp) * 100)}% OFF
                                                </span>
                                            )}
                                            {isInactive && (
                                                <div className="inactive-overlay">
                                                    <span>Currently Unavailable</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-info">
                                            <h3 className="product-title">{s.title}</h3>
                                            <div className="product-price">
                                                <span className="current">{formatPrice(s.price)}</span>
                                                {s.mrp > s.price && <span className="mrp">{formatPrice(s.mrp)}</span>}
                                            </div>
                                            <div className="card-footer">
                                                <button
                                                    className={`buy-btn ${isInactive ? "disabled" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isInactive) return;
                                                        requireLogin(async () => {
                                                            const success = await addToCart({ ...s, isSynopsis: true });
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
                                                            const success = await addToCart({ ...s, isSynopsis: true });
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
            </div>
        </section>
    );
}
