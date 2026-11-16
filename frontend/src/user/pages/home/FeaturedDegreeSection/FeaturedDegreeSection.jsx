import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import api from "../../../../api";
import "./FeaturedDegreeSection.scss";

export default function FeaturedDegreeSection() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get("/api/featured-sections");
        const data = res.data?.data || [];
        setSections(data.filter((s) => s.isActive));
      } catch (err) {
        console.error("Featured sections fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, []);

  if (loading || sections.length === 0) return null;

  return (
    <section className="featured-degree-section home-content-block">
      <div className="container">
        <div className="section-head" style={{ marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 2.6vw, 2.4rem)', margin: '0 0 6px' }}>Featured for You</h2>
            <p style={{ color: '#64748b', margin: 0 }}>Curated study materials for your degree programs.</p>
          </div>
        </div>

        <div className="fds-degree-grid">
          {sections.map((section, index) => (
            <Link
              to={`/featured-section/${section.id}`}
              key={section.id}
              className="fds-degree-card"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className="card-main">
                <div className="card-icon">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="degree-title">{section.title}</h3>
                  {section.subtitle && (
                    <p className="degree-subtitle">{section.subtitle}</p>
                  )}
                </div>
              </div>
              <span className="arrow-box">
                <ChevronRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

