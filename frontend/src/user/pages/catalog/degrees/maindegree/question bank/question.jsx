import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  ArrowRight,
  HelpCircle,
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
  ChevronRight
} from "lucide-react";
import "./question.scss";
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

export default function QuestionBank() {
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
    // Navigate to specific degree questions or handle logic
    console.log(`Navigating to degree: ${degreeId}`);
  };

  return (
    <div className="degree-page-wrapper question-bank-page">
      <div className="container">
        {/* Hero Section */}
        <section className="degree-hero">
          <div className="hero-badge wow animate__fadeInUp">
            <HelpCircle size={14} /> IGNOU Academic Resources
          </div>
          <h1 className="wow animate__fadeInUp" data-wow-delay="0.1s">
            IMP Questions <span>With Solutions</span>
          </h1>
          <p className="hero-desc wow animate__fadeInUp" data-wow-delay="0.2s">
            Master your exams with our expert-curated question banks and detailed solutions,
            tailored specifically for IGNOU degree programmes.
          </p>

          <div className="search-filter-bar wow animate__fadeInUp" data-wow-delay="0.3s">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search your degree programme..."
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
                    <div className="card-badge">Resource</div>
                  </div>

                  <div className="card-content">
                    <h3>{degree.titel}</h3>
                    <p>{degree.description}</p>
                  </div>

                  <div className="card-footer">
                    <div className="stats">
                      <span><BookOpen size={14} /> 20+ Subjects</span>
                    </div>
                    <button className="view-btn">
                      Explore <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results-found">
              <h3>No programmes found matching "{searchTerm}"</h3>
              <p>Try refining your search or browse our full list.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
