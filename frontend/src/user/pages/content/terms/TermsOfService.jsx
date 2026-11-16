import React, { useEffect } from "react";
import { ShieldCheck, Calendar, Scale, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./terms.scss";
import { useSiteConfig } from "../../../../context/SiteConfigContext";

export default function TermsOfService() {
    const { config } = useSiteConfig();
    const lastUpdated = "March 03, 2026";

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="terms-page-premium">
            {/* Background Orbs */}
            <div className="bg-orb orb-1"></div>
            <div className="bg-orb orb-2"></div>
            <div className="bg-orb orb-3"></div>

            <div className="terms-container-premium wow animate__animated animate__fadeIn">
                
                {/* Breadcrumbs */}
                <div className="breadcrumb">
                    <Link to="/">Home</Link>
                    <ChevronRight size={14} />
                    <span>Terms of Service</span>
                </div>

                {/* Hero Section */}
                <div className="terms-hero">
                    <div className="hero-icon-wrapper">
                        <div className="hero-icon-glow"></div>
                        <div className="hero-icon">
                            <Scale size={38} strokeWidth={1.5} />
                        </div>
                    </div>
                    <h1 className="hero-title">Terms of Service</h1>
                    <p className="hero-subtitle">
                        Please read these terms carefully before using our platform.
                        They govern your access and outline your rights.
                    </p>
                    
                    <div className="hero-meta">
                        <div className="meta-badge">
                            <Calendar size={14} />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>
                        <div className="meta-badge">
                            <ShieldCheck size={14} />
                            <span>Strictly Enforced</span>
                        </div>
                    </div>
                </div>

                {/* Content Paper */}
                <div className="terms-paper">
                    {config.POLICY_TERMS ? (
                        <div 
                            className="dynamic-legal-content"
                            dangerouslySetInnerHTML={{ __html: config.POLICY_TERMS }}
                        />
                    ) : (
                        <div className="dynamic-legal-content">
                            <h2>1. Acceptance of Terms</h2>
                            <p>
                                Welcome to <strong>BMSG (Book My Study Guide)</strong>. These Terms of Service ("Terms") govern your access to and use of our website, mobile applications, and other services. By accessing or using BMSG, you agree to be bound by these Terms.
                            </p>
                            
                            <h2>2. User Accounts</h2>
                            <p>
                                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account details and for all activities that occur under your account. We reserve the right to suspend accounts that violate our policies.
                            </p>

                            <h2>3. Orders & Payments</h2>
                            <p>
                                All orders are subject to acceptance and availability. Prices are inclusive of GST unless stated otherwise. We reserve the right to refuse any order you place with us.
                            </p>

                            <h2>4. Intellectual Property</h2>
                            <p>
                                All content on BMSG, including text, graphics, logos, and study materials, is the property of BMSG or its content suppliers and is protected by copyright laws. Unauthorized reproduction is strictly prohibited.
                            </p>

                            <h2>5. Contact Information</h2>
                            <p>
                                If you have any questions about these Terms, please contact our legal team at support@bmsg.com.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
