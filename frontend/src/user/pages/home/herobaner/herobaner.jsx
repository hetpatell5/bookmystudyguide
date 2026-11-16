import React from "react";
import { ArrowRight, Search, Sparkles, GraduationCap, BookOpenCheck, Download, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import "./herobaner.scss";

export default function Herobaner() {
  return (
    <section className="home-hero-redesign" aria-label="IGNOU Hero Section">
      <div className="hero-backdrop" aria-hidden="true">
        <span className="glow glow-left"></span>
        <span className="glow glow-right"></span>
      </div>

      <div className="container">
        <div className="hero-layout">
          <div className="hero-left">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>Trusted IGNOU Learning Platform</span>
            </div>

            <h1 className="hero-title">
              Crack IGNOU Exams with Structured, <span>Expert-Curated Materials</span>
            </h1>

            <p className="hero-description">
              Access project support, practical notes, question banks, and exam-ready resources
              designed for IGNOU students across major programs.
            </p>

            <div className="hero-search" role="search" aria-label="Hero Search">
              <select aria-label="Category">
                <option>All Categories</option>
                <option>Project Reports</option>
                <option>Study Notes</option>
                <option>Practical Files</option>
              </select>

              <input
                type="text"
                placeholder="Enter course code e.g. MMPC-016, BCA, MCOM..."
                aria-label="Search query"
              />

              <button type="button" aria-label="Search">
                <Search size={16} />
                Search
              </button>
            </div>

            <div className="hero-tags" aria-label="Popular Keywords">
              <span>IGNOU Notes</span>
              <span>MBA Notes</span>
              <span>BCA Projects</span>
            </div>

            <div className="hero-actions">
              <Link to="/combo-books" className="hero-btn-primary">
                Explore Materials
                <ArrowRight size={18} />
              </Link>

              <Link to="/projects" className="hero-btn-secondary">
                View IGNOU Projects
              </Link>
            </div>
          </div>

          <div className="hero-right">
            <div className="stat-row">
              <article className="stat-card">
                <div className="stat-icon"><GraduationCap size={18} /></div>
                <div className="stat-content">
                  <h3>2.8L+</h3>
                  <p>Students Assisted</p>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-icon"><BookOpenCheck size={18} /></div>
                <div className="stat-content">
                  <h3>14K+</h3>
                  <p>Study Materials</p>
                </div>
              </article>
            </div>

            <article className="stat-card full">
              <div className="stat-icon"><ShieldCheck size={18} /></div>
              <div className="stat-content">
                <h3>500+</h3>
                <p>IGNOU Programs Covered</p>
              </div>
            </article>

            <article className="stat-card highlight">
              <div className="stat-icon"><Download size={18} /></div>
              <div className="stat-content">
                <h3>Instant PDF Delivery</h3>
                <p>Download immediately after successful payment.</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
