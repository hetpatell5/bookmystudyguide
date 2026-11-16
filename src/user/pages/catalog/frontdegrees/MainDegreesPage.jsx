import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
    BookOpen, GraduationCap, ScrollText, Award,
    BookCheck, FileBadge, ClipboardCheck, BadgeCheck,
    ShieldAlert, UserCheck, Users, ChevronRight, Search, ArrowLeft
} from "lucide-react";
import api from "../../../../api";
import "./MainDegreesPage.scss";

const ICON_MAP = {
    BookOpen, GraduationCap, ScrollText, Award,
    BookCheck, FileBadge, ClipboardCheck, BadgeCheck,
    ShieldAlert, UserCheck, Users
};

export default function MainDegreesPage() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [allDegrees, setAllDegrees] = useState([]);
    const [filteredDegrees, setFilteredDegrees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickAccessLimit, setQuickAccessLimit] = useState(6);
    const quickPanelRef = useRef(null);
    const quickPanelHeadRef = useRef(null);
    const quickGridRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchDegrees = async () => {
            try {
                const res = await api.get("/api/mainDegrees");
                const degrees = res.data.data || res.data || [];
                setAllDegrees(Array.isArray(degrees) ? degrees : []);
                setFilteredDegrees(Array.isArray(degrees) ? degrees : []);
            } catch (err) {
                console.error("Error fetching main degrees:", err);
                setAllDegrees([]);
                setFilteredDegrees([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDegrees();
    }, []);

    useEffect(() => {
        const results = allDegrees.filter(degree =>
            (degree.name || degree.titel || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredDegrees(results);
    }, [searchTerm, allDegrees]);

    const recalculateQuickAccessLimit = useCallback(() => {
        const panel = quickPanelRef.current;
        const panelHead = quickPanelHeadRef.current;
        const grid = quickGridRef.current;

        if (!panel || !panelHead || !grid) return;

        const card = grid.querySelector(".quick-access-card");
        if (!card) {
            setQuickAccessLimit(0);
            return;
        }

        const panelHeight = panel.clientHeight;
        const headHeight = panelHead.offsetHeight;
        const cardHeight = card.offsetHeight;
        const gridStyles = window.getComputedStyle(grid);
        const rowGap = Number.parseFloat(gridStyles.rowGap) || 10;
        const columns = window.matchMedia("(max-width: 700px)").matches ? 1 : 2;
        const viewAllHeight = 34;
        const innerGapReserve = 18;

        const availableHeight = panelHeight - headHeight - viewAllHeight - innerGapReserve;
        if (availableHeight <= 0) {
            setQuickAccessLimit(columns);
            return;
        }

        const rowsThatFit = Math.max(1, Math.floor((availableHeight + rowGap) / (cardHeight + rowGap)));
        const nextLimit = Math.max(columns, rowsThatFit * columns);
        setQuickAccessLimit(nextLimit);
    }, []);

    useEffect(() => {
        recalculateQuickAccessLimit();
    }, [filteredDegrees, recalculateQuickAccessLimit]);

    useEffect(() => {
        const panel = quickPanelRef.current;
        if (!panel) return undefined;

        const observer = new ResizeObserver(() => {
            recalculateQuickAccessLimit();
        });
        observer.observe(panel);
        window.addEventListener("resize", recalculateQuickAccessLimit);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", recalculateQuickAccessLimit);
        };
    }, [recalculateQuickAccessLimit]);

    const quickAccessDegrees = useMemo(
        () => filteredDegrees.slice(0, quickAccessLimit),
        [filteredDegrees, quickAccessLimit]
    );

    if (loading) return null;

    return (
        <div className="main-degrees-page">
            <Helmet>
                <title>Select Main Degree | Book My Study Guide</title>
                <meta name="description" content="Browse our categorized degree sections to find the specific study guides, notes, and materials you need for your course." />
                <meta property="og:title" content="Select Your Degree | Book My Study Guide" />
                <meta property="og:description" content="Explore study materials by degree level and specialization." />
            </Helmet>
            <section className="hero">
                <div className="container">
                    <div className="hero-grid">
                        <div className="hero-copy">
                            <button onClick={() => navigate(-1)} className="btn-back">
                                <ArrowLeft size={18} />
                                <span>Back to Catalog</span>
                            </button>
                            <div className="hero-badge">Academic Path Finder</div>
                            <h1>
                                Choose Your <span>Main Degree</span>
                            </h1>
                            <p>
                                Pick your degree level to unlock curated study materials and university-ready resources.
                                Built for students who want fast access with zero confusion.
                            </p>

                            <div className="search-panel">
                                <div className="search-bar">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search degree type, for example BCA or MBA"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="clear-btn"
                                            onClick={() => setSearchTerm("")}
                                            aria-label="Clear search"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                            </div>

                            <div className="hero-stats">
                                <div className="stat-card">
                                    <span className="stat-label">Available Degrees</span>
                                    <span className="stat-value">{allDegrees.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="hero-panel" ref={quickPanelRef}>
                            <div className="quick-panel-head" ref={quickPanelHeadRef}>
                                <h3>Quick Access Degrees</h3>
                                <span>{filteredDegrees.length} available</span>
                            </div>
                            <div className="quick-access-grid" ref={quickGridRef}>
                                {quickAccessDegrees.map((degree) => (
                                    <Link
                                        key={`quick_${degree.id}`}
                                        to={`/sub-degrees/${bookId}/${degree.id}`}
                                        className="quick-access-card"
                                    >
                                        <GraduationCap size={18} />
                                        <span>{degree.name || degree.titel}</span>
                                        <ChevronRight size={16} />
                                    </Link>
                                ))}
                            </div>
                            {filteredDegrees.length > 0 && (
                                <a href="#all-degrees" className="jump-all-btn">View all degrees</a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="degree-section" id="all-degrees">
                <div className="container">
                    <div className="section-head">
                        <div>
                            <h2>Explore Degree Categories</h2>
                            <p>Tap a degree to move into its program structure and subject list.</p>
                        </div>
                        <div className="results-count">
                            Showing <span>{filteredDegrees.length}</span> degrees
                        </div>
                    </div>

                    <div className="degree-grid">
                        {filteredDegrees.map((degree, index) => {
                            const iconKeys = Object.keys(ICON_MAP);
                            const Icon = ICON_MAP[iconKeys[index % iconKeys.length]] || GraduationCap;
                            return (
                                <Link
                                    to={`/sub-degrees/${bookId}/${degree.id}`}
                                    key={degree.id}
                                    className="degree-card"
                                    style={{ animationDelay: `${index * 0.04}s` }}
                                    title={degree.name || degree.titel}
                                    aria-label={`Open ${(degree.name || degree.titel)} programmes`}
                                >
                                    <div className="card-main">
                                        <div className="card-icon">
                                            <Icon size={18} />
                                        </div>
                                        <h3 className="degree-title">{degree.name || degree.titel}</h3>
                                    </div>
                                    <span className="arrow-box">
                                        <ChevronRight size={20} />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {filteredDegrees.length === 0 && (
                        <div className="empty-state">
                            <h3>No degrees found</h3>
                            <p>Try a different keyword or clear the search.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
