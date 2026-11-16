import React, { useEffect } from "react";
import { Truck, Calendar, ShieldCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./shipping.scss";
import { useSiteConfig } from "../../../../context/SiteConfigContext";

export default function Shipping() {
    const { config } = useSiteConfig();
    const lastUpdated = "March 03, 2026";

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="shipping-page-premium">
            {/* Background Orbs */}
            <div className="bg-orb orb-1"></div>
            <div className="bg-orb orb-2"></div>
            <div className="bg-orb orb-3"></div>

            <div className="shipping-container-premium wow animate__animated animate__fadeIn">
                
                {/* Breadcrumbs */}
                <div className="breadcrumb">
                    <Link to="/">Home</Link>
                    <ChevronRight size={14} />
                    <span>Shipping & Delivery Policy</span>
                </div>

                {/* Hero Section */}
                <div className="shipping-hero">
                    <div className="hero-icon-wrapper">
                        <div className="hero-icon-glow"></div>
                        <div className="hero-icon">
                            <Truck size={38} strokeWidth={1.5} />
                        </div>
                    </div>
                    <h1 className="hero-title">Shipping & Delivery</h1>
                    <p className="hero-subtitle">
                        We are committed to delivering your digital and physical orders accurately, 
                        in good condition, and always on time.
                    </p>
                    
                    <div className="hero-meta">
                        <div className="meta-badge">
                            <Calendar size={14} />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>
                        <div className="meta-badge">
                            <ShieldCheck size={14} />
                            <span>Transparent Policy</span>
                        </div>
                    </div>
                </div>

                {/* Content Paper */}
                <div className="shipping-paper">
                    {config.POLICY_SHIPPING ? (
                        <div 
                            className="dynamic-legal-content"
                            dangerouslySetInnerHTML={{ __html: config.POLICY_SHIPPING }}
                        />
                    ) : (
                        <div className="dynamic-legal-content">
                            <h2>1. Digital Delivery</h2>
                            <p>
                                The majority of products on <strong>Book My Study Guide</strong> are digital downloads (PDFs, e-books). Upon successful payment confirmation, you will receive immediate access to download your files directly from your dashboard and via the email associated with your purchase.
                            </p>

                            <h2>2. Physical Delivery Timeline</h2>
                            <p>
                                For any physical study materials ordered, standard delivery typically takes <strong>3-7 business days</strong> depending on your location within India. Orders are dispatched from our warehouse within 1-2 business days.
                            </p>

                            <h2>3. Order Tracking</h2>
                            <p>
                                Once your physical package is shipped, you will receive a tracking link via SMS and Email. We partner with reliable couriers like Shiprocket, Delhivery, and BlueDart to ensure safe transit.
                            </p>
                            
                            <h2>4. International Shipping</h2>
                            <p>
                                Currently, we <strong>only ship physical products within India</strong>. Digital products, however, can be purchased and accessed globally.
                            </p>

                            <h2>5. Support Issues</h2>
                            <p>
                                If your physical package is delayed, lost, or damaged during transit, please contact our support team within 24 hours of receiving the shipment or the estimated delivery date.
                            </p>
                            <br/>
                            <p>
                                <a href="/contact" className="support-link">Contact Support Team &rarr;</a>
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
