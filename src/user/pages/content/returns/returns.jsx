import React, { useEffect } from "react";
import { ShieldAlert, Calendar, RotateCcw, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./returns.scss";
import { useSiteConfig } from "../../../../context/SiteConfigContext";

export default function Returns() {
    const { config } = useSiteConfig();
    const lastUpdated = "March 03, 2026";

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="returns-page-premium">
            {/* Background Orbs */}
            <div className="bg-orb orb-1"></div>    
            <div className="bg-orb orb-2"></div>
            <div className="bg-orb orb-3"></div>

            <div className="returns-container-premium wow animate__animated animate__fadeIn">
                
                {/* Breadcrumbs */}
                <div className="breadcrumb">
                    <Link to="/">Home</Link>
                    <ChevronRight size={14} />
                    <span>Return & Refund Policy</span>
                </div>

                {/* Hero Section */}
                <div className="returns-hero">
                    <div className="hero-icon-wrapper">
                        <div className="hero-icon-glow"></div>
                        <div className="hero-icon">
                            <RotateCcw size={38} strokeWidth={1.5} />
                        </div>
                    </div>
                    <h1 className="hero-title">Return & Refund</h1>
                    <p className="hero-subtitle">
                        Please review our policy carefully before making a purchase. 
                        We aim for transparency in all our digital product sales.
                    </p>
                    
                    <div className="hero-meta">
                        <div className="meta-badge">
                            <Calendar size={14} />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>
                        <div className="meta-badge">
                            <ShieldAlert size={14} />
                            <span>Strictly Enforced</span>
                        </div>
                    </div>
                </div>

                {/* Content Paper */}
                <div className="returns-paper">
                    {config.POLICY_RETURNS ? (
                        <div 
                            className="dynamic-legal-content"
                            dangerouslySetInnerHTML={{ __html: config.POLICY_RETURNS }}
                        />
                    ) : (
                        <div className="dynamic-legal-content">
                            <h2>1. Digital Products</h2>
                            <p>
                                All products sold on <strong>Book My Study Guide</strong> are digital downloads (PDFs, e-books, etc.).
                                Due to the immediate and intangible nature of digital content, once a file is downloaded or accessed, it cannot be "returned" in the traditional sense.
                            </p>

                            <h2>2. All Sales Are Final</h2>
                            <p>
                                We <strong>do not</strong> offer refunds or exchanges once a purchase is completed.
                                Please review the sample pages, project outlines, and product descriptions very carefully before completing your payment.
                            </p>

                            <h2>3. Corrupted or Defective Files</h2>
                            <p>
                                In the rare event that you receive a corrupted file, or a file that cannot be opened despite using standard PDF software, we will replace the file at no additional cost. You must notify us within 3 days of purchase with proof of the defect.
                            </p>

                            <h2>4. Duplicate Purchases</h2>
                            <p>
                                If you accidentally purchase the exact same item twice, please contact our support team within 24 hours. We will review your purchase history and issue a refund for the duplicate charge.
                            </p>

                            <h2>5. Contact & Support</h2>
                            <p>
                                If you have trouble downloading your file, please contact our support team immediately. We will ensure you get a working copy.
                                <br/><br/>
                                <a href="/contact" className="support-link">Contact Support Team &rarr;</a>
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
