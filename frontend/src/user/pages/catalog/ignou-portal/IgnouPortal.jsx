import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExternalLink, Info } from "lucide-react";
import api from "../../../../api";
import "./ignouPortal.scss";

export default function IgnouPortal() {
    const { type } = useParams();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPortalData = React.useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await api.get("/api/ignou-cards");
            const cardsData = res.data?.success ? res.data.data : (res.data || []);
            const card = Array.isArray(cardsData) ? cardsData.find(c => c.slug.toLowerCase() === type.toLowerCase()) : null;

            if (card) {
                setConfig({
                    title: card.title,
                    subtitle: card.subtitle,
                    url: card.targetUrl,
                });
            } else {
                setError(true);
            }
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchPortalData();
    }, [type, fetchPortalData]);

    if (loading) return null;

    if (error || !config) {
        return (
            <div className="ignou-portal error-state">
                <h1>Portal Not Found</h1>
                <p>The requested support portal could not be loaded.</p>
                <Link to="/" className="btn-portal">Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="ignou-portal">
            <div className="portal-header">
                <div className="container">
                    <div className="breadcrumb">
                        <Link to="/">Home</Link>
                        <span>/</span>
                        <span>IGNOU Support</span>
                    </div>
                    <h1>{config.title}</h1>
                    <p>{config.subtitle}</p>
                </div>
            </div>

            <div className="portal-container container">
                <div className="iframe-container">
                    <div className="iframe-fallback">
                        <div className="fallback-icon">
                            <Info size={40} />
                        </div>
                        <h2>Secure Portal Access</h2>
                        <p>
                            IGNOU's official server requires this portal to be opened in a dedicated secure session to protect your personal data.
                            Click the button below to proceed to the official IGNOU {config.title} page.
                        </p>
                        <a
                            href={config.url}
                            className="btn-portal"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open Official Portal <ExternalLink size={18} style={{ marginLeft: "8px" }} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
