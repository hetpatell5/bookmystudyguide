import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, MessageCircle, FileText, MapPin, Package, Users, Info, ExternalLink, HelpCircle, Sparkles } from "lucide-react";
import api from "../../../../api";
import "./ignouSection.scss";

const ICON_MAP = {
    Bell,
    MessageCircle,
    FileText,
    MapPin,
    Package,
    Users,
    Info,
    ExternalLink
};

export default function IgnouSection() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const res = await api.get("/api/ignou-cards");
                const cardsData = res.data?.success ? res.data.data : (res.data || []);
                setCards(Array.isArray(cardsData) ? cardsData : []);
            } catch (err) {
                console.error("Failed to fetch IGNOU cards:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCards();
    }, []);

    if (loading) return null; // Or a skeleton loader
    if (cards.length === 0) return null;

    return (
        <section className="ignou-section premium-surface">
            <div className="container">
                <div className="section-header wow animate__fadeInUp">
                    <div className="header-icon-box">
                        <HelpCircle size={28} />
                    </div>
                    <h2 className="section-title">Support for <span>IGNOU Students</span></h2>
                    <p className="section-subtitle">Our most popular Products and Services designed for your success.</p>
                </div>

                <div className="ignou-grid">
                    {cards.map((item, index) => {
                        const IconComponent = ICON_MAP[item.icon] || Info;
                        return (
                            <a
                                href={item.targetUrl}
                                key={item._id}
                                className="ignou-card-modern wow animate__fadeInUp"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-wow-delay={`${index * 0.1}s`}
                            >
                                <div className="card-inner">
                                    <div className="icon-wrapper">
                                        <IconComponent size={28} />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <div className="card-content">
                                        <h3>{item.title}</h3>
                                        <p>{item.subtitle}</p>
                                    </div>
                                    <div className="external-link-icon">
                                        <ExternalLink size={14} />
                                    </div>
                                </div>
                                <div className="hover-line"></div>
                            </a>
                        );
                    })}
                </div>
                
                <div className="support-cta-box wow animate__fadeInUp">
                    <Sparkles size={20} className="sparkle" />
                    <p>Can't find what you're looking for? <strong>Chat with our AI Assistant!</strong></p>
                </div>
            </div>
        </section>
    );
}
