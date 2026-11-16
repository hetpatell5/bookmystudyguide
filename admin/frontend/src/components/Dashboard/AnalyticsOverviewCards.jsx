import { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import { Users, Globe, MapPin, RefreshCw, AlertCircle, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './AnalyticsOverviewCards.module.css';

const AnalyticsOverviewCards = () => {
    const navigate = useNavigate();
    const [gaData, setGaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [setupRequired, setSetupRequired] = useState(false);
    
    // Drill-down State
    const [geoView, setGeoView] = useState({
        level: 'country', // 'country', 'region', 'city'
        country: null,
        region: null
    });

    const fetchData = async () => {
        try {
            const res = await analyticsService.getOverview();
            if (res.data.success) {
                setGaData(res.data.data);
                setError(null);
                setSetupRequired(false);
            } else if (res.data.setupRequired) {
                setSetupRequired(true);
            }
        } catch (err) {
            console.error("Error fetching analytics overview:", err);
            setError(err.response?.data?.message || "Failed to connect to Google Analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const handleGeoClick = (item, level) => {
        if (level === 'country') {
            setGeoView({ level: 'region', country: item.name, region: null });
        } else if (level === 'region') {
            setGeoView({ level: 'city', country: geoView.country, region: item.name });
        }
    };

    const handleBack = () => {
        if (geoView.level === 'city') {
            setGeoView({ level: 'region', country: geoView.country, region: null });
        } else if (geoView.level === 'region') {
            setGeoView({ level: 'country', country: null, region: null });
        }
    };

    if (loading) return (
        <div className={styles.loading}>
            <RefreshCw className={styles.spin} />
            <span>Fetching Google Analytics Insights...</span>
        </div>
    );

    if (setupRequired) return (
        <div className={styles.setup}>
            <AlertCircle size={32} />
            <p>Google Analytics 4 needs configuration in Settings.</p>
            <button onClick={() => navigate('/settings')}>Configure Now</button>
        </div>
    );

    if (error) return (
        <div className={styles.error}>
            <AlertCircle />
            <span>{error}</span>
        </div>
    );

    const getGeoList = () => {
        if (!gaData?.geo) return [];
        if (geoView.level === 'country') return gaData.geo;
        
        const countryData = gaData.geo.find(c => c.name === geoView.country);
        if (geoView.level === 'region') return countryData?.states || [];
        
        const stateData = countryData?.states?.find(s => s.name === geoView.region);
        return stateData?.cities || [];
    };

    const geoList = getGeoList();

    return (
        <div className={styles.analyticsOverviewGrid}>
            {/* CARD 1: LIVE NOW */}
            <div className={`${styles.overviewCard} glass`}>
                <div className={styles.cardHeader}>
                    <div className={styles.liveBadge}>
                        <span className={styles.pulseDot}></span>
                        LIVE NOW
                    </div>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.count}>{gaData?.realtime?.activeUsers || 0}</div>
                    <div className={styles.label}>Active Users Right Now</div>
                </div>
                <div className={styles.cardFooter}>
                    <Users size={16} />
                    Real-time monitoring active
                </div>
            </div>

            {/* CARD 2: TOTAL VISITORS */}
            <div className={`${styles.overviewCard} glass`}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.iconWrap} ${styles.blue}`}>
                        <TrendingUp size={20} />
                    </div>
                    <h3>Total Visitors</h3>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.count}>{(gaData?.historical?.totalVisitors || 0).toLocaleString()}</div>
                    <div className={styles.label}>Unique Visitors (Last 30 Days)</div>
                </div>
                <div className={styles.cardFooter} style={{ cursor: 'pointer' }} onClick={() => navigate('/analytics')}>
                    <ChevronRight size={16} />
                    View Detailed Reports
                </div>
            </div>

            {/* CARD 3: GEOGRAPHIC EXPLORER */}
            <div className={`${styles.overviewCard} glass`}>
                <div className={styles.cardHeader}>
                    <div className={styles.titleArea} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`${styles.iconWrap} ${styles.purple}`}>
                            <Globe size={18} />
                        </div>
                        <h3>Geo Explorer</h3>
                    </div>
                    {geoView.level !== 'country' && (
                        <button className={styles.backBtn} onClick={handleBack}>
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                </div>
                <div className={styles.geoList}>
                    {geoList.length > 0 ? (
                        geoList.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`${styles.geoItem} ${geoView.level !== 'city' ? styles.clickable : ''}`}
                                onClick={() => geoView.level !== 'city' && handleGeoClick(item, geoView.level)}
                            >
                                <div className={styles.info}>
                                    <MapPin size={12} />
                                    <span>{item.name || 'Unknown'}</span>
                                </div>
                                <div className={styles.value}>
                                    {item.total}
                                    {geoView.level !== 'city' && <ChevronRight size={14} />}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.empty} style={{ fontSize: '0.85rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>
                          No location data available.
                        </div>
                    )}
                </div>
                <div className={styles.cardFooter}>
                    Current: {geoView.level === 'country' ? 'Worldwide' : geoView.level === 'region' ? geoView.country : `${geoView.country} > ${geoView.region}`}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsOverviewCards;
