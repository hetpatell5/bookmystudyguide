import { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import { Users, Globe, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './LiveTrafficCard.module.css';

const LiveTrafficCard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [setupRequired, setSetupRequired] = useState(false);

    const fetchData = async () => {
        try {
            const res = await analyticsService.getRealtimeData();
            if (res.data.success) {
                setData(res.data.data);
                setError(null);
                setSetupRequired(false);
            } else if (res.data.setupRequired) {
                setSetupRequired(true);
            }
        } catch (err) {
            console.error("Error fetching live traffic:", err);
            setError(err.response?.data?.message || "Failed to connect to Google Analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className={styles.loading}>
            <RefreshCw className={styles.spin} />
            <span>Connecting to Live Stream...</span>
        </div>
    );

    if (setupRequired) return (
        <div className={styles.setupNeeded}>
            <div className={styles.cardHeader}>
                <Users size={20} />
                <h3>Real-time Traffic</h3>
            </div>
            <div className={styles.cardBody}>
                <AlertCircle size={32} className={styles.warningIcon} />
                <p>Live data requires GA4 Property ID and Service Account JSON in settings.</p>
                <button onClick={() => navigate('/analytics')}>Configure Now</button>
            </div>
        </div>
    );

    if (error) return (
        <div className={styles.error}>
            <AlertCircle />
            <span>{error}</span>
        </div>
    );

    return (
        <div className={styles.liveTrafficCard}>
            <div className={styles.cardHeader}>
                <div className={styles.titleArea}>
                    <div className={styles.liveIndicator}>
                        <span className={styles.dot}></span>
                        LIVE
                    </div>
                    <h3>Real-time Traffic</h3>
                </div>
                <Users size={20} className={styles.headerIcon} />
            </div>

            <div className={styles.mainStat}>
                <div className={styles.activeCount}>
                    {data?.activeUsers || 0}
                </div>
                <div className={styles.statLabel}>Active Users Right Now</div>
            </div>

            <div className={styles.locationsList}>
                <div className={styles.listHeader}>
                    <Globe size={14} />
                    Top Locations
                </div>
                {data?.locations && data.locations.length > 0 ? (
                    data.locations.map((loc, idx) => {
                        const country = loc.country && loc.country !== '(not set)' && loc.country !== 'Unknown' ? loc.country : '';
                        const region = loc.region && loc.region !== '(not set)' ? loc.region : '';
                        const city = loc.city && loc.city !== '(not set)' ? loc.city : '';
                        
                        const locationStr = [city, region, country].filter(v => v !== '').join(', ');
                        
                        return (
                            <div key={idx} className={styles.locationRow}>
                                <div className={styles.locInfo}>
                                    <MapPin size={12} className={styles.locIcon} />
                                    <span className={styles.locationText}>{locationStr || 'Unknown Location'}</span>
                                </div>
                                <div className={styles.userCount}>{loc.users}</div>
                            </div>
                        );
                    })
                ) : (
                    <div className={styles.emptyLocations}>Waiting for incoming traffic...</div>
                )}
            </div>
            
            <div className={styles.footerNote}>
                Last updated at {new Date(data?.lastUpdated).toLocaleTimeString()}
            </div>
        </div>
    );
};

export default LiveTrafficCard;
