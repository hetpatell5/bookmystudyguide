import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Layers, Bookmark, X,
  Lightbulb, FolderKanban, Building2, Wrench, ClipboardList,
} from "lucide-react";
import api from '../../../../api';
import "./category.scss";

import placeholderImg from "../../../../assets/images/1.webp";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";

/** Determines if a book card is the "Project/Practical" card */
function isProjectCard(book) {
  const name = (book.name || "").toLowerCase();
  return (
    name.includes("project") ||
    name.includes("practical") ||
    name.includes("synopsis") ||
    name.includes("internship")
  );
}

/** Determines if a book card is the "Assignment Solution" card */
function isAssignmentCard(book) {
  return (book.name || "").toLowerCase().includes("assignment");
}

const PROJECT_OPTIONS = [
  {
    icon: Lightbulb,
    label: "Custom Project",
    desc: "Get a fully customised project, practical or synopsis — tailored to your topic and university guidelines.",
    to: "/customized-project",
    variant: "primary",
  },
  {
    icon: FolderKanban,
    label: "Browse Projects",
    desc: "Explore our ready-made collection of IGNOU projects and practicals — instant download.",
    to: "/projects",
    variant: "outline",
  },
  {
    icon: Building2,
    label: "Browse Internship Reports",
    desc: "Browse our ready-made internship reports for various IGNOU programs.",
    to: "/internship",
    variant: "outline",
  },
  {
    icon: ClipboardList,
    label: "Request Custom Internship Report",
    desc: "Need a customised internship report? Fill a quick form and our team will prepare one for you.",
    to: "/project-inquiry?type=Internship",
    variant: "outline",
  },
];

export default function Category({ title }) {
  const [books, setBooks] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/books')
      .then(res => {
        const booksData = res.data?.data || res.data || [];
        setBooks(Array.isArray(booksData) ? booksData : []);
      })
      .catch(() => setBooks([]));
  }, []);

  // Close modal on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowProjectModal(false);
      }
    };
    if (showProjectModal) {
      document.addEventListener("mousedown", handleOutside);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.body.style.overflow = "";
    };
  }, [showProjectModal]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setShowProjectModal(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const getBookDescription = (name) => {
    if (name.includes("Assignment")) return "";
    if (name.includes("Project") || name.includes("Practical") || name.includes("Synopsis") || name.includes("Internship"))
      return "Custom projects, practicals, synopsis & internship reports — browse ready-made or order tailored.";
    if (name.includes("Question Bank")) return "Master your exams with our curated list of important questions and detailed solutions.";
    if (name.includes("NotesByAI")) return "Simplify complex concepts with AI-generated notes tailored for quick learning.";
    if (name.includes("Mastery Guide")) return "Comprehensive guides to master your curriculum and gain in-depth subject knowledge.";
    if (name.includes("Exam Capsule")) return "Focused materials for last-minute preparations when time is short and success is critical.";
    return "Comprehensive study material designed for academic excellence and deep understanding.";
  };

  const handleCardClick = (e, book) => {
    if (isProjectCard(book)) {
      e.preventDefault();
      setShowProjectModal(true);
    }
  };

  const getCardLink = (book) => {
    if (isAssignmentCard(book)) return "/assignment-inquiry";
    return `/main-degrees/${book.id}`;
  };

  return (
    <>
      <section className="category-section" aria-label="Product categories">
        <div className="container">
          {title && <h3 className="cat-section-title">{title}</h3>}
          <div className="cat-grid">
            {books.filter(book => !isAssignmentCard(book)).map((book, index) => (
              <Link
                to={getCardLink(book)}
                key={book.id || index}
                className="cat-card"
                onClick={(e) => handleCardClick(e, book)}
              >
                <div className="cat-media">
                  <img
                    src={getOptimizedImageUrl(book.image || placeholderImg)}
                    alt={book.name}
                    loading="lazy"
                  />
                  <div className="cat-overlay-premium">
                    <div className="content-box">
                      <p className="hover-desc">{book.description || getBookDescription(book.name)}</p>
                      <span className="premium-btn">
                        View Details <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                  <div className="bookmark-icon">
                    <Bookmark size={18} fill="rgba(255,255,255,0.2)" />
                  </div>
                </div>
                <div className="cat-footer">
                  <h3 className="cat-title">{book.name}</h3>
                </div>
                <div className="card-shine"></div>
              </Link>
            ))}
          </div>

          {books.length === 0 && (
            <div className="no-results-premium">
              <Layers size={48} />
              <p>Our shelves are currently being restocked. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Project Choice Modal ─────────────────────────────────── */}
      {showProjectModal && (
        <div className="cat-modal-overlay">
          <div className="cat-modal" ref={modalRef}>
            {/* Close */}
            <button
              className="cat-modal__close"
              onClick={() => setShowProjectModal(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="cat-modal__head">
              <div className="cat-modal__icon-wrap">
                <Wrench size={22} />
              </div>
              <h2>What do you need?</h2>
              <p>Choose from custom orders, ready-made projects, or internship reports.</p>
            </div>

            {/* Options */}
            <div className="cat-modal__options">
              {PROJECT_OPTIONS.map(({ icon: Icon, label, desc, to, variant }) => (
                <button
                  key={to}
                  className={`cat-modal__option cat-modal__option--${variant}`}
                  onClick={() => { setShowProjectModal(false); navigate(to); }}
                >
                  <div className="cat-modal__option-icon">
                    <Icon size={20} />
                  </div>
                  <div className="cat-modal__option-body">
                    <span className="cat-modal__option-label">{label}</span>
                    <span className="cat-modal__option-desc">{desc}</span>
                  </div>
                  <ArrowRight size={16} className="cat-modal__option-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
