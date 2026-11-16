import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
    ArrowLeft, BookOpen, Search, CalendarDays, Layers3, FolderKanban,
    CircleCheck, CircleDashed, ShoppingCart, Filter, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "../../../../context/CartContext";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import api from "../../../../api";
import "./CategorizedProductsPage.scss";

function normalize(value) {
    return (value || "").toString().trim().toLowerCase();
}

export default function CategorizedProductsPage() {
    const { bookId, subDegreeId } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeYear, setActiveYear] = useState(null);
    const [subDegreeName, setSubDegreeName] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [activeSemester, setActiveSemester] = useState("all");
    const [activeCategory, setActiveCategory] = useState("all");
    const [showAvailableOnly, setShowAvailableOnly] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/products/categorized?bookId=${bookId}&subDegreeId=${subDegreeId}`);
                const payload = res.data?.success ? res.data.data : res.data?.data;

                if (payload?.subDegree?.name) setSubDegreeName(payload.subDegree.name);

                const rawGroups = payload?.groups || {};
                const grouped = {};
                Object.keys(rawGroups).forEach((year) => {
                    grouped[year] = {};
                    Object.keys(rawGroups[year]).forEach((sem) => {
                        grouped[year][sem] = {};
                        Object.keys(rawGroups[year][sem]).forEach((cat) => {
                            grouped[year][sem][cat] = rawGroups[year][sem][cat].map((entry) => ({
                                ...entry.subject,
                                product: entry.product || null,
                            }));
                        });
                    });
                });

                setData(grouped);
                const yearsList = Object.keys(grouped).sort();
                if (yearsList.length > 0) setActiveYear(yearsList[0]);
            } catch (err) {
                console.error("Error fetching categorized products:", err);
                setData({});
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [bookId, subDegreeId]);

    const handleBuyNow = async (e, product) => {
        e.preventDefault();
        e.stopPropagation();

        const success = await addToCart(product, 1);
        if (success) {
            toast.success("Added to cart!");
            navigate("/cart");
            return;
        }
        toast.error("Please login to add to cart");
        navigate("/auth");
    };

    const years = useMemo(() => Object.keys(data).sort(), [data]);

    const activeYearItems = useMemo(() => {
        if (!activeYear || !data[activeYear]) return [];
        const items = [];

        Object.keys(data[activeYear]).forEach((semester) => {
            Object.keys(data[activeYear][semester]).forEach((category) => {
                data[activeYear][semester][category].forEach((item) => {
                    items.push({ ...item, semester, category, year: activeYear });
                });
            });
        });

        return items;
    }, [activeYear, data]);

    const semesterOptions = useMemo(() => {
        const unique = Array.from(new Set(activeYearItems.map((item) => item.semester)));
        return unique.sort();
    }, [activeYearItems]);

    const categoryOptions = useMemo(() => {
        const unique = Array.from(new Set(activeYearItems.map((item) => item.category)));
        return unique.sort();
    }, [activeYearItems]);

    const filteredItems = useMemo(() => {
        const search = normalize(searchTerm);

        return activeYearItems.filter((item) => {
            if (activeSemester !== "all" && item.semester !== activeSemester) return false;
            if (activeCategory !== "all" && item.category !== activeCategory) return false;
            if (showAvailableOnly && !item.product) return false;

            if (!search) return true;
            const haystack = [
                item.name,
                item.course,
                item.courseCode,
                item.category,
                item.semester,
                item.year
            ].map(normalize).join(" ");

            return haystack.includes(search);
        });
    }, [activeYearItems, activeSemester, activeCategory, showAvailableOnly, searchTerm]);

    const stats = useMemo(() => {
        const availableCount = activeYearItems.filter((item) => item.product).length;
        return {
            total: activeYearItems.length,
            available: availableCount,
            pending: Math.max(0, activeYearItems.length - availableCount),
            semesters: semesterOptions.length
        };
    }, [activeYearItems, semesterOptions.length]);

    const clearFilters = () => {
        setSearchTerm("");
        setActiveSemester("all");
        setActiveCategory("all");
        setShowAvailableOnly(false);
    };

    if (loading) return null;

    return (
        <div className="categorized-products-page">
            <Helmet>
                <title>{subDegreeName || "Study Materials"} | Book My Study Guide</title>
                <meta
                    name="description"
                    content={`Access specialized study materials for ${subDegreeName}. Organized by academic year and semester.`}
                />
            </Helmet>

            <div className="container">
                <header className="page-header">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div className="header-content">
                        <div className="badge">Student Material Hub</div>
                        <h1>{subDegreeName || "Your"} <span>Study Materials</span></h1>
                        <p>Find the right material faster with year, semester, and category filters.</p>
                    </div>
                </header>

                {years.length > 0 && (
                    <>
                        <div className="year-selector">
                            {years.map((year) => (
                                <button
                                    key={year}
                                    className={`year-tab ${activeYear === year ? "active" : ""}`}
                                    onClick={() => {
                                        setActiveYear(year);
                                        setActiveSemester("all");
                                        setActiveCategory("all");
                                    }}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>

                        <section className="quick-stats">
                            <div className="stat-card">
                                <BookOpen size={18} />
                                <div>
                                    <span className="label">Total Subjects</span>
                                    <strong>{stats.total}</strong>
                                </div>
                            </div>
                            <div className="stat-card">
                                <CircleCheck size={18} />
                                <div>
                                    <span className="label">Available Now</span>
                                    <strong>{stats.available}</strong>
                                </div>
                            </div>
                            <div className="stat-card">
                                <CircleDashed size={18} />
                                <div>
                                    <span className="label">Coming Soon</span>
                                    <strong>{stats.pending}</strong>
                                </div>
                            </div>
                            <div className="stat-card">
                                <CalendarDays size={18} />
                                <div>
                                    <span className="label">Semesters</span>
                                    <strong>{stats.semesters}</strong>
                                </div>
                            </div>
                        </section>

                        <section className="filters-panel">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by subject, code, category..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="filter-row">
                                <div className="filter-group">
                                    <span className="filter-label">
                                        <Layers3 size={14} />
                                        Semester
                                    </span>
                                    <div className="chips">
                                        <button
                                            className={`chip ${activeSemester === "all" ? "active" : ""}`}
                                            onClick={() => setActiveSemester("all")}
                                        >
                                            All
                                        </button>
                                        {semesterOptions.map((semester) => (
                                            <button
                                                key={semester}
                                                className={`chip ${activeSemester === semester ? "active" : ""}`}
                                                onClick={() => setActiveSemester(semester)}
                                            >
                                                {semester}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-group">
                                    <span className="filter-label">
                                        <FolderKanban size={14} />
                                        Category
                                    </span>
                                    <div className="chips">
                                        <button
                                            className={`chip ${activeCategory === "all" ? "active" : ""}`}
                                            onClick={() => setActiveCategory("all")}
                                        >
                                            All
                                        </button>
                                        {categoryOptions.map((category) => (
                                            <button
                                                key={category}
                                                className={`chip ${activeCategory === category ? "active" : ""}`}
                                                onClick={() => setActiveCategory(category)}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="toolbar">
                                <button
                                    className={`toggle-btn ${showAvailableOnly ? "active" : ""}`}
                                    onClick={() => setShowAvailableOnly((prev) => !prev)}
                                >
                                    <Filter size={14} />
                                    {showAvailableOnly ? "Showing Available Only" : "Show Available Only"}
                                </button>
                                <button className="clear-btn" onClick={clearFilters}>
                                    <X size={14} />
                                    Clear Filters
                                </button>
                                <span className="result-count">
                                    Showing <strong>{filteredItems.length}</strong> of {activeYearItems.length}
                                </span>
                            </div>
                        </section>

                        <section className="materials-list">
                            {filteredItems.map((item) => {
                                const product = item.product || null;
                                const mrpValue = Number(
                                    product?.mrp ||
                                    product?.originalPrice ||
                                    product?.regularPrice ||
                                    product?.strikePrice ||
                                    0
                                );
                                const priceValue = Number(product?.price || 0);
                                const discountPercent =
                                    mrpValue > priceValue
                                        ? Math.round(((mrpValue - priceValue) / mrpValue) * 100)
                                        : 0;

                                return (
                                <article key={item.id} className={`material-card ${product ? "ready" : "pending"}`}>
                                    {product ? (
                                        <Link to={`/productpage/${product.id}`} className="cover">
                                            <div className="media-frame">
                                                {product?.image || product?.images?.[0] ? (
                                                    <img
                                                        src={getOptimizedImageUrl(product.image || product.images?.[0])}
                                                        alt={item.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="cover-placeholder">
                                                        <BookOpen size={28} />
                                                    </div>
                                                )}
                                            </div>
                                            {discountPercent > 0 && (
                                                <span className="discount-tag">{discountPercent}% OFF</span>
                                            )}
                                        </Link>
                                    ) : (
                                        <div className="cover">
                                            <div className="media-frame">
                                                <div className="cover-placeholder">
                                                    <BookOpen size={28} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="details">
                                        {product ? (
                                            <Link to={`/productpage/${product.id}`} className="title-link">
                                                <h3>{item.name}</h3>
                                            </Link>
                                        ) : (
                                            <h3>{item.name}</h3>
                                        )}

                                        {product ? (
                                            <div className="price-row">
                                                <span className="price">₹{priceValue.toFixed(2)}</span>
                                                {mrpValue > 0 && (
                                                    <span className="old-price">
                                                        ₹{mrpValue.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="pending-pill">Coming Soon</div>
                                        )}
                                    </div>

                                    <div className="actions">
                                        {product ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn-buy-main"
                                                    onClick={(e) => handleBuyNow(e, product)}
                                                >
                                                    Buy Now
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-cart-mini"
                                                    onClick={(e) => handleBuyNow(e, product)}
                                                    aria-label="Add to cart"
                                                >
                                                    <ShoppingCart size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button type="button" className="btn-disabled" disabled>
                                                Not Available Yet
                                            </button>
                                        )}
                                    </div>
                                </article>
                                );
                            })}
                        </section>
                    </>
                )}

                {years.length === 0 && (
                    <div className="empty-state">
                        <BookOpen size={48} />
                        <h3>Coming Soon</h3>
                        <p>Study materials for this programme are being curated and will be available shortly.</p>
                    </div>
                )}

                {years.length > 0 && filteredItems.length === 0 && (
                    <div className="empty-state compact">
                        <BookOpen size={34} />
                        <h3>No materials match your filters</h3>
                        <p>Try changing semester/category filters or clear search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
