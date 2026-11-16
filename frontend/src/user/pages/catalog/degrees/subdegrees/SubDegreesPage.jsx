import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Search, GraduationCap, ChevronRight } from "lucide-react";
import api from "../../../../api";
import "./SubDegreesPage.scss";

export default function SubDegreesPage() {
    const { bookId, mainDegreeId } = useParams();
    const navigate = useNavigate();
    const [subDegrees, setSubDegrees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [quickAccessLimit, setQuickAccessLimit] = useState(6);
    const quickPanelRef = useRef(null);
    const quickPanelHeadRef = useRef(null);
    const quickGridRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchSubDegrees = async () => {
            try {
                // IMPORTANT: Fetch only sub-degrees for this mainDegreeId from backend
                const res = await api.get(`/api/subDegrees?mainDegreeId=${mainDegreeId}`);
                // Standard Response handling: res.data already contains the body thanks to intercepted axios (optional check)
                const degrees = res.data?.data || [];
                setSubDegrees(degrees);
            } catch (err) {
                console.error("Error fetching sub-degrees:", err);
                setSubDegrees([]);
            } finally {
                setLoading(false);
            }
        };
        fetchSubDegrees();
    }, [mainDegreeId]);

    const filteredList = useMemo(
        () => subDegrees.filter(sd => (sd.name || "").toLowerCase().includes(searchTerm.toLowerCase())),
        [subDegrees, searchTerm]
    );

    const recalculateQuickAccessLimit = useCallback(() => {
        const panel = quickPanelRef.current;
        const panelHead = quickPanelHeadRef.current;
        const grid = quickGridRef.current;

        if (!panel || !panelHead || !grid) return;

        const card = grid.querySelector(".quick-programme-card");
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
        setQuickAccessLimit(Math.max(columns, rowsThatFit * columns));
    }, []);

    useEffect(() => {
        recalculateQuickAccessLimit();
    }, [filteredList, recalculateQuickAccessLimit]);

    useEffect(() => {
        const panel = quickPanelRef.current;
        if (!panel) return undefined;

        const observer = new ResizeObserver(() => recalculateQuickAccessLimit());
        observer.observe(panel);
        window.addEventListener("resize", recalculateQuickAccessLimit);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", recalculateQuickAccessLimit);
        };
    }, [recalculateQuickAccessLimit]);

    const quickAccessProgrammes = useMemo(
        () => filteredList.slice(0, quickAccessLimit),
        [filteredList, quickAccessLimit]
    );

    if (loading) return null;

    return (
        <div className="sub-degrees-page">
            <Helmet>
                <title>Select Programme | Book My Study Guide</title>
                <meta name="description" content="Choose your specific course or programme to find curated study materials and last-minute exam help." />
                <meta property="og:title" content="Select Your Programme | Book My Study Guide" />
                <meta property="og:description" content="Find study materials tailored for your specific course." />
            </Helmet>
            <div className="container">
                <div className="hero-grid">
                    <header className="page-header">
                        <button onClick={() => navigate(-1)} className="btn-back">
                            <ArrowLeft size={20} />
                            <span>Back</span>
                        </button>
                        <div className="header-content">
                            <div className="badge">Programme Selection</div>
                            <h1>Choose Your <span>Programme</span></h1>
                            <p>Select your specific course or programme to see the available study guides and resources.</p>
                        </div>

                        <div className="search-wrapper">
                            <div className="search-bar">
                                <Search size={20} />
                                <input
                                    type="text"
                                    placeholder="Search programmes (e.g. BCA, B.Tech...)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </header>

                    <aside className="quick-panel" ref={quickPanelRef}>
                        <div className="quick-panel-head" ref={quickPanelHeadRef}>
                            <h3>Quick Access Programmes</h3>
                            <span>{filteredList.length} available</span>
                        </div>
                        <div className="quick-programme-grid" ref={quickGridRef}>
                            {quickAccessProgrammes.map((sd) => (
                                <Link
                                    key={`quick_${sd.id}`}
                                    to={`/categorized-products/${bookId}/${mainDegreeId}/${sd.id}`}
                                    className="quick-programme-card"
                                >
                                    <GraduationCap size={16} />
                                    <span>{sd.name}</span>
                                    <ChevronRight size={16} />
                                </Link>
                            ))}
                        </div>
                        {filteredList.length > 0 && (
                            <a href="#all-programmes" className="jump-all-btn">View all programmes</a>
                        )}
                    </aside>
                </div>

                <div className="programme-grid" id="all-programmes">
                    {filteredList.map((sd, index) => (
                        <Link
                            to={`/categorized-products/${bookId}/${mainDegreeId}/${sd.id}`}
                            key={sd.id}
                            className="programme-card animate__fadeInUp"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            title={sd.name}
                            aria-label={`Open ${sd.name} study materials`}
                        >
                            <div className="card-main">
                                <GraduationCap size={18} />
                                <h3>{sd.name}</h3>
                            </div>
                            <span className="arrow-box">
                                <ChevronRight className="arrow" />
                            </span>
                        </Link>
                    ))}
                </div>

                {filteredList.length === 0 && (
                    <div className="empty-state">
                        <h3>No programmes found</h3>
                        <p>We couldn't find any programmes matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
