import React from "react";
import { Users, Rocket, Target, Globe, Mail, Briefcase, Heart, Sparkles, ArrowRight } from "lucide-react";
import "./Careers.scss";

export default function Careers() {
  const benefits = [
    { title: "Remote Friendly", icon: <Globe size={24} />, desc: "Work from anywhere in India with our flexible remote-first culture." },
    { title: "Growth Mindset", icon: <Target size={24} />, desc: "Continuous learning and professional development opportunities." },
    { title: "Impactful Work", icon: <Rocket size={24} />, desc: "Help thousands of students achieve their academic dreams every day." },
    { title: "Inclusive Team", icon: <Heart size={24} />, desc: "A diverse space where every voice is heard and every idea counts." },
  ];

  return (
    <div className="careers-page">
      <div className="careers-hero">
        <div className="container">
          <div className="hero-badge">Join Our Mission</div>
          <h1>Let's Build the Future of <span className="gradient-text">Learning Together</span></h1>
          <p>We're looking for passionate educators, creative designers, and tech enthusiasts to join our growing team.</p>
          <div className="hero-actions">
            <button className="primary-btn">View Open Roles</button>
            <button className="secondary-btn">Learn Our Values</button>
          </div>
        </div>
      </div>

      <div className="container">
        <section className="values-section">
          <div className="section-header wow animate__fadeInUp">
            <h2>Why Partner With Us?</h2>
            <p>At BMSG, we're more than just an educational platform—we're a community of innovators dedicated to student success.</p>
          </div>

          <div className="values-grid">
            {benefits.map((benefit, idx) => (
              <div 
                key={idx} 
                className="value-card wow animate__fadeInUp"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="icon-wrapper">{benefit.icon}</div>
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="open-positions-section">
          <div className="section-header wow animate__fadeInUp">
            <h2>Current Openings</h2>
            <p>If you don't see a fit but love what we do, reach out anyway! We're always looking for talent.</p>
          </div>

          <div className="positions-list">
            <div className="position-item wow animate__fadeInUp">
              <div className="pos-info">
                <div className="pos-title-row">
                  <h3>Subject Matter Expert (IGNOU)</h3>
                  <span className="badge">Remote</span>
                </div>
                <p>Help us curate high-quality study guides and bank questions for specialized degrees.</p>
              </div>
              <button className="apply-btn">Apply Now <ArrowRight size={16} /></button>
            </div>

            <div className="position-item wow animate__fadeInUp" style={{ animationDelay: "0.1s" }}>
              <div className="pos-info">
                <div className="pos-title-row">
                  <h3>Content Strategist</h3>
                  <span className="badge">Hybrid</span>
                </div>
                <p>Develop engaging educational content and manage our growing Knowledge Hub.</p>
              </div>
              <button className="apply-btn">Apply Now <ArrowRight size={16} /></button>
            </div>

            <div className="position-item wow animate__fadeInUp" style={{ animationDelay: "0.2s" }}>
              <div className="pos-info">
                <div className="pos-title-row">
                  <h3>UI Designer</h3>
                  <span className="badge">Remote</span>
                </div>
                <p>Design beautiful, intuitive learning experiences for our thousands of weekly users.</p>
              </div>
              <button className="apply-btn">Apply Now <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>

        <div className="careers-footer glass-card wow animate__fadeInUp">
          <div className="footer-content">
            <Sparkles className="spark-icon" size={32} />
            <h3>Don't See a Perfect Fit?</h3>
            <p>We are always open to collaborating with passionate content creators and academic partners.</p>
            <div className="contact-link">
              <Mail size={18} />
              <span>Email your portfolio to: <strong>careers@bookmystudyguide.com</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
