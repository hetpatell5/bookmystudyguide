import React, { useEffect, useState } from "react";
import { ShieldCheck, Zap, Laptop, BookOpenCheck, ChevronRight, Award, Headphones, Rocket } from "lucide-react";
import api from "../../../../api";
import "./servicesPage.scss";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";

// Fallback icons if API icons are missing
const ICON_FALLBACKS = {
  "Fast Delivery": Rocket,
  "Secure Payment": ShieldCheck,
  "Easy Returns": Zap,
  "Expert Support": Headphones,
  "Premium Content": Award
};

export default function ServicesPage() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get("/api/services")
      .then(res => {
        const servicesData = res.data?.success ? res.data.data : (res.data || []);
        setServices(Array.isArray(servicesData) ? servicesData : []);
      })
      .catch(err => console.error("Error loading services:", err));
  }, []);

  if (services.length === 0) return null;

  return (
    <section className="services-section" id="services">
      <div className="container">

        <div className="section-header wow animate__fadeInUp">
          <div className="header-badge">
            <ShieldCheck size={16} /> The BMSG Difference
          </div>
          <h2 className="section-title">Elevate Your <span>Academic Journey</span></h2>
          <p className="section-desc">
            We're not just a bookstore. We are your academic partner, providing the
            tools and resources necessary for world-class learning and exam success.
          </p>
        </div>

        <div className="services-grid">
          {services.map((item, index) => {
            const FallbackIcon = ICON_FALLBACKS[item.title] || Rocket;
            return (
              <div
                key={item._id}
                className="service-card wow animate__fadeInUp"
                data-wow-delay={`${index * 0.15}s`}
              >
                <div className="service-icon">
                  <div className="icon-wrapper">
                    {item.icon ? (
                      <img src={getOptimizedImageUrl(item.icon)} alt={item.title} loading="lazy" />
                    ) : (
                      <FallbackIcon size={32} />
                    )}
                    <div className="icon-glow"></div>
                  </div>
                </div>

                <div className="service-info">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                <div className="service-footer">
                  <span className="learn-more">Benefit #{index + 1}</span>
                  <div className="footer-line"></div>
                </div>

                <div className="card-ornament"></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
