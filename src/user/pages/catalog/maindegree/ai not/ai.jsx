import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  Sparkles,
  BookOpen,
  GraduationCap,
  ScrollText,
  Award,
  BookCheck,
  FileBadge,
  ClipboardCheck,
  BadgeCheck,
  ShieldAlert,
  UserCheck,
  Users,
  ChevronRight,
  Zap
} from "lucide-react";
import "./ai.scss";
import { maindegree } from "../../../../dataset/maindegree";

// Icon Map for dynamic rendering
const ICON_MAP = {
  BookOpen,
  GraduationCap,
  ScrollText,
  Award,
  BookCheck,
  FileBadge,
  ClipboardCheck,
  BadgeCheck,
  ShieldAlert,
  UserCheck,
  Users
};

export default function Ai() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDegrees, setFilteredDegrees] = useState(maindegree);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const results = maindegree.filter(degree =>
      degree.titel.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDegrees(results);
  }, [searchTerm]);

  const handleCardClick = (degreeId) => {
    console.log(`Navigating to AI Notes for degree: ${degreeId}`);
  };

  return (
    <div className="degree-page-wrapper ai-notes-page">
      <div className="container">
        {/* Hero Section */}
        <section className="degree-hero">
          <div className="hero-badge wow animate__fadeInUp">
            <Zap size={14} /> AI-Powered Study Efficiency
          </div>
          <h1 className="wow animate__fadeInUp" data-wow-delay="0.1s">
            Simplified Notes <span>By AI Tools</span>
          </h1>
          <p className="hero-desc wow animate__fadeInUp" data-wow-delay="0.2s">
            Revolutionize your learning with our AI-enhanced summaries and notes.
            We distill complex IGNOU syllabi into easy-to-understand, high-impact study materials.
          </p>

          <div className="search-filter-bar wow animate__fadeInUp" data-wow-delay="0.3s">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Find AI notes for your degree..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Degrees Grid */}
        <div className="degree-grid wow animate__fadeInUp" data-wow-delay="0.4s">
          {filteredDegrees.length > 0 ? (
            filteredDegrees.map((degree) => {
              const IconComponent = ICON_MAP[degree.icon] || BookOpen;
              return (
                <div
                  className="degree-card"
                  key={degree.id}
                  style={{ "--card-color": degree.color }}
                  onClick={() => handleCardClick(degree.id)}
                >
                  <div className="card-header">
                    <div className="card-icon">
                      <IconComponent size={28} />
                    </div>
                    <div className="card-badge">AI Enhanced</div>
                  </div>

                  <div className="card-content">
                    <h3>{degree.titel}</h3>
                    <p>{degree.description}</p>
                  </div>

                  <div className="card-footer">
                    <div className="stats">
                      <span><Sparkles size={14} /> High Impact</span>
                    </div>
                    <button className="view-btn">
                      Get Notes <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results-found">
              <h3>No AI notes found for "{searchTerm}"</h3>
              <p>Try searching with another keyword or browse our categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
