import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Download, FileCheck2, Headphones, BookOpen, Layers, Trophy, BookMarked, ArrowRight, Clock, X, Heart, Eye, ShoppingCart } from "lucide-react";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { useAuth } from "../../../context/logintrue";
import { toast } from "react-toastify";


import Advertisements from "../../components/advertisements/advertisements";
import Category from "./category/category";
import ServicesPage from "./ServicesPage/ServicesPage";
import BookProductSliders from "./product/product";
import SynopsisSlider from "./synopsis/SynopsisSlider";
import IgnouSection from "./ignou/IgnouSection";
import Testimonials from "./Testimonials/Testimonials";
import BlogList from "./blog/BlogList";
import Faq from "./faq/Faq";
import TailoredProducts from "./TailoredProducts";
import FeaturedDegreeSection from "./FeaturedDegreeSection/FeaturedDegreeSection";
import { useUserExperience } from "../../../context/UserExperienceContext";
import { useRecentlyViewed } from "../../../context/RecentlyViewedContext";
import "./home.scss";


const trustHighlights = [
  { icon: BadgeCheck, value: "Trusted", label: "Authentic Study Resources" },
  { icon: Download, value: "Instant", label: "Digital Delivery" },
  { icon: FileCheck2, value: "Updated", label: "Exam-Focused Content" },
  { icon: Headphones, value: "Support", label: "Quick Student Assistance" },
];

const journeySteps = [
  {
    icon: BookOpen,
    title: "Choose Your Program",
    description: "Pick your stream and semester to instantly discover targeted study materials.",
  },
  {
    icon: Layers,
    title: "Get Curated Resources",
    description: "Access notes, projects, question banks, and practical files — all in one place.",
  },
  {
    icon: Trophy,
    title: "Prepare With Confidence",
    description: "Use expert-structured content to sharpen exam readiness and score better.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { preferences } = useUserExperience();
  const { recentItems, clearRecentItems } = useRecentlyViewed();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { requireLogin } = useAuth();
  const hasPreferences = Boolean(preferences?.subDegree?.id);
  const showRecentlyViewed = recentItems.length > 0;

  return (
    <div className="home-page-redesign">
      <main>
        <section className="home-ads-banner" aria-label="Promotions">
          <div className="container">
            <Advertisements />
          </div>
        </section>

        {/* ── Featured Degree Products (admin-curated) ── */}
        <FeaturedDegreeSection />

        <section className="home-trust-strip" aria-label="Why choose us">
          <div className="container">
            <div className="trust-strip-header">
              <span className="eyebrow">Built for IGNOU learners</span>
              <h2>Everything You Need for Smarter Preparation</h2>
              <p>
                Structured resources, reliable support, and instant access designed
                to keep your exam preparation consistent.
              </p>
            </div>
            <div className="trust-grid">
              {trustHighlights.map(({ icon: Icon, value, label }) => (
                <article className="trust-card" key={label}>
                  <span className="icon-box" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div className="value">{value}</div>
                  <div className="label">{label}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Important Question Bank CTA Banner ── */}
        <section className="qbank-banner" aria-label="Question Bank navigation">
          <div className="container">
            <div className="qbank-banner__inner">
              <div className="qbank-banner__icon" aria-hidden="true">
                <BookMarked size={26} />
              </div>
              <div className="qbank-banner__text">
                <strong>Important Question Bank with Solutions</strong>
                <span>IGNOU exam-focused questions &amp; detailed answers — updated for current sessions</span>
              </div>
              <Link to="/best-sellers" className="qbank-banner__btn">
                Browse Now <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="home-content-block" aria-label="Programs and categories">
          <Category title="Explore Programs and Study Tracks" />
        </section>

        <section className="home-content-block alt-surface" aria-label="Services">
          <ServicesPage />
        </section>

        {/* ── Tailored Products Section ── */}
        <TailoredProducts />

        {/* ── Recently Viewed Products ── */}
        {showRecentlyViewed && (
          <section className="home-content-block recently-viewed-section" aria-label="Recently viewed products">
            <div className="container">
              <div className="recently-viewed-header">
                <div className="rv-title-group">
                  <span className="rv-icon"><Clock size={18} /></span>
                  <div>
                    <h2>Continue Where You Left Off</h2>
                    <p>Products you recently browsed</p>
                  </div>
                </div>
                <button className="rv-clear-btn" onClick={clearRecentItems} title="Clear history">
                  <X size={14} /> Clear
                </button>
              </div>
              <div className="recently-viewed-grid">
                {recentItems.slice(0, 6).map((item) => {
                  const discount = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
                  return (
                    <div key={item.id} className="slider-item">
                      <div className="product-card is-active" onClick={() => navigate(`/productpage/${item.id}`)}>
                        <div className="card-media">
                          <div className="media-frame">
                            {item.image
                              ? <img src={item.image} alt={item.title} loading="lazy" />
                              : <div className="rv-img-placeholder" />}
                          </div>
                          <div className="card-actions">
                            <button
                              className={`action-btn wishlist-btn ${isInWishlist(item.id) ? "active" : ""}`}
                              onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}
                              title="Add to Wishlist"
                            >
                              <Heart size={18} fill={isInWishlist(item.id) ? "currentColor" : "none"} />
                            </button>
                            <button
                              className="action-btn"
                              onClick={(e) => { e.stopPropagation(); navigate(`/productpage/${item.id}`); }}
                              title="Quick View"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                          {discount > 0 && <span className="discount-tag">{discount}% OFF</span>}
                        </div>
                        <div className="card-info">
                          <h3 className="product-title">{item.title}</h3>
                          <div className="product-price">
                            <span className="current">₹{Number(item.price).toLocaleString('en-IN')}</span>
                            {item.mrp > item.price && <span className="mrp">₹{Number(item.mrp).toLocaleString('en-IN')}</span>}
                          </div>
                          <div className="card-footer">
                            <button
                              className="buy-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                requireLogin(async () => {
                                  const success = await addToCart(item);
                                  if (success !== false) navigate("/checkout");
                                });
                              }}
                            >
                              Buy Now
                            </button>
                            <button
                              className="cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                requireLogin(async () => {
                                  const success = await addToCart(item);
                                  if (success !== false) toast.success("Added to cart");
                                });
                              }}
                              title="Add to cart"
                            >
                              <ShoppingCart size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {!hasPreferences && (
          <section className="home-content-block" aria-label="Top products">
            <BookProductSliders />
          </section>
        )}

        <section className="home-content-block alt-surface" aria-label="Projects and synopsis">
          <SynopsisSlider />
        </section>

        <section className="home-content-block" aria-label="IGNOU support cards">
          <IgnouSection />
        </section>

        <section className="journey-section" aria-label="How it works">
          <div className="container">
            <div className="journey-header">
              <span className="journey-eyebrow">How It Works</span>
              <h2>Your Study Journey in 3 Steps</h2>
              <p>A simple path from finding the right materials to acing your exams.</p>
            </div>
            <div className="journey-grid">
              {journeySteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div className="journey-step-wrap" key={step.title}>
                    <article className="journey-card">
                      <div className="journey-card__num">{String(index + 1).padStart(2, "0")}</div>
                      <div className="journey-card__icon">
                        <Icon size={22} strokeWidth={2} />
                      </div>
                      <h4 className="journey-card__title">{step.title}</h4>
                      <p className="journey-card__desc">{step.description}</p>
                    </article>
                    {index < journeySteps.length - 1 && (
                      <div className="journey-connector" aria-hidden="true">
                        <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                          <path d="M0 8 H32 M28 2 L38 8 L28 14" stroke="rgba(30,58,138,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="home-content-block alt-surface" aria-label="Student testimonials">
          <Testimonials />
        </section>

        <BlogList />

        <Faq />

        <section className="home-final-cta" aria-label="Final call to action">
          <div className="container">
            <div className="cta-panel">
              <div className="cta-panel__deco" aria-hidden="true">
                <span className="cta-panel__blob cta-panel__blob--1" />
                <span className="cta-panel__blob cta-panel__blob--2" />
              </div>
              <div className="cta-panel__badge">
                <BadgeCheck size={14} /> Trusted by IGNOU Students
              </div>
              <h2 className="cta-panel__heading">
                Ready to Boost Your<br />
                <span>IGNOU Performance?</span>
              </h2>
              <p className="cta-panel__sub">
                Curated study materials, practicals, projects &amp; expert support —
                everything you need to prepare smarter and score better.
              </p>
              <div className="cta-actions">
                <Link className="cta-primary" to="/combo-books">
                  Explore Materials
                </Link>
                <Link className="cta-secondary" to="/projects">
                  Browse Projects
                </Link>
                <Link className="cta-secondary" to="/best-sellers">
                  <BookMarked size={15} style={{ marginRight: 6 }} />
                  Question Banks
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
