import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./footer.scss";
import api from "../../../api";
import { useSiteConfig } from "../../../context/SiteConfigContext";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaChevronUp } from "react-icons/fa";
import { Mail, MapPin, Phone, ShieldCheck, CreditCard, Smartphone, Landmark } from "lucide-react";
import { toast } from "react-toastify";

export default function Footer() {
  const { config } = useSiteConfig();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [contact, setContact] = useState(null);
  const [newsEmail, setNewsEmail] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    api
      .get("/api/contact")
      .then((res) => {
        if (res.data) setContact(res.data);
      })
      .catch((err) => {
        console.error("Error fetching footer contact:", err);
      });

    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsEmail) return;

    try {
      setNewsLoading(true);
      const res = await api.post("/api/newsletter/subscribe", { email: newsEmail });
      if (res.data?.success) {
        toast.success(res.data.message || "Subscribed successfully");
        setNewsEmail("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to subscribe");
    } finally {
      setNewsLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialLinks = [
    contact?.whatsapp
      ? {
          key: "whatsapp",
          href: `https://wa.me/${String(contact.whatsapp).replace(/\D/g, "")}`,
          label: "WhatsApp",
          icon: <FaWhatsapp />,
        }
      : null,
    contact?.facebook
      ? {
          key: "facebook",
          href: contact.facebook,
          label: "Facebook",
          icon: <FaFacebookF />,
        }
      : null,
    contact?.instagram
      ? {
          key: "instagram",
          href: contact.instagram,
          label: "Instagram",
          icon: <FaInstagram />,
        }
      : null,
    contact?.twitter
      ? {
          key: "twitter",
          href: contact.twitter,
          label: "Twitter",
          icon: <FaTwitter />,
        }
      : null,
  ].filter(Boolean);

  return (
    <footer className="footer-redesign">
      <div className="footer-newsletter">
        <div className="container">
          <div className="newsletter-panel">
            <div className="newsletter-copy">
              <h3>Get Important Updates</h3>
              <p>Receive study tips, offers, and exam-related updates in your inbox.</p>
            </div>

            <form onSubmit={handleSubscribe} className="newsletter-form">
              <div className="newsletter-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsEmail}
                  onChange={(e) => setNewsEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={newsLoading}>
                {newsLoading ? "Submitting..." : "Subscribe"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">

              <p className="footer-description">
                {config.SITE_DESCRIPTION ||
                  "Trusted academic support platform for curated study materials, projects, and exam resources."}
              </p>

              <div className="footer-socials">
                {socialLinks.map((item) => (
                  <a key={item.key} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}>
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-links-group">
              <div className="footer-links-col">
                <h4>Explore</h4>
                <Link to="/">Home</Link>
                <Link to="/best-sellers">Best Sellers</Link>
                <Link to="/combo-books">Combo Books</Link>
                <Link to="/projects">Projects</Link>
              </div>

              <div className="footer-links-col">
                <h4>Company</h4>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/blogs">Blogs</Link>
                <Link to="/careers">Careers</Link>
              </div>

              <div className="footer-links-col">
                <h4>Support</h4>
                <Link to="/track-order">Track Order</Link>
                <Link to="/shipping">Shipping</Link>
                <Link to="/returns">Returns</Link>
                <Link to="/terms">Terms</Link>
              </div>
            </div>

            <div className="footer-contact">
              <h4>Contact</h4>

              {contact?.phone && (
                <a href={`tel:${contact.phone}`} className="contact-item">
                  <span className="icon-box"><Phone size={16} /></span>
                  <span>{contact.phone}</span>
                </a>
              )}

              {contact?.email && (
                <a href={`mailto:${contact.email}`} className="contact-item">
                  <span className="icon-box"><Mail size={16} /></span>
                  <span>{contact.email}</span>
                </a>
              )}

              {contact?.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-item"
                >
                  <span className="icon-box"><MapPin size={16} /></span>
                  <span>{contact.address}</span>
                </a>
              )}
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-left">
              <p>
                &copy; {new Date().getFullYear()} BMSG Learning Innovation Private Limited. All rights reserved.
              </p>
              <p className="footer-reg-info">
                <span>GST: 24AANCB7927R1ZT</span>
                <span className="footer-reg-sep">·</span>
                <span>Startup India: DIPP265616</span>
              </p>
            </div>
            
            <div className="payment-options" aria-label="Accepted payment methods">
              <div className="pay-methods-list">
                <span className="pay-pill"><Smartphone size={14} /> UPI</span>
                <span className="pay-pill"><CreditCard size={14} /> Cards</span>
                <span className="pay-pill"><Landmark size={14} /> Netbanking</span>
              </div>
            </div>

            <div className="trust-note">
              <ShieldCheck size={15} /> 100% Secure Payments via <strong>Razorpay</strong>
            </div>
          </div>
        </div>
      </div>

      {showBackToTop && (
        <button className={`footer-scroll-top ${showBackToTop ? "is-visible" : ""}`} onClick={scrollToTop} aria-label="Back to top">
          <FaChevronUp />
        </button>
      )}
    </footer>
  );
}
