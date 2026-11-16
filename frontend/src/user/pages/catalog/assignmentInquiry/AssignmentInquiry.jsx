import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Send, Loader2, User, Phone, Mail, GraduationCap,
  BookOpen, FileText, MapPin, PenLine, Star, Hash, MessageSquare,
  ChevronRight, ArrowLeft, BadgeCheck, Clock, BookMarked, Languages,
  Search, ChevronDown, X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../../api";
import "./AssignmentInquiry.scss";

// ─── Searchable Select ────────────────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled, idKey = "id", labelKey = "name" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const getKey  = (o) => o[idKey]   || o._id  || o;
  const getLabel = (o) => o[labelKey] || o.name || o;

  const selected = options.find(o => getKey(o) === value);
  const filtered = options.filter(o =>
    getLabel(o).toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleSelect = (key) => {
    onChange(key);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div className={`ss-wrap${disabled ? " ss-wrap--disabled" : ""}${open ? " ss-wrap--open" : ""}`} ref={ref}>
      {/* Trigger */}
      <div
        className="ss-trigger"
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`ss-trigger__value${!selected ? " ss-trigger__value--placeholder" : ""}`}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <span className="ss-trigger__icons">
          {selected && !disabled && (
            <span className="ss-clear" onClick={handleClear} title="Clear">
              <X size={13} />
            </span>
          )}
          <ChevronDown size={15} className={`ss-chevron${open ? " ss-chevron--up" : ""}`} />
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="ss-dropdown" role="listbox">
          {/* Search box */}
          <div className="ss-search">
            <Search size={14} />
            <input
              ref={inputRef}
              type="text"
              className="ss-search__input"
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            {query && (
              <button className="ss-search__clear" onClick={() => setQuery("")} type="button">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="ss-list">
            <li
              className={`ss-option ss-option--empty-val${!value ? " ss-option--selected" : ""}`}
              onClick={() => handleSelect("")}
              role="option"
            >
              {placeholder}
            </li>
            {filtered.length === 0 ? (
              <li className="ss-option ss-option--no-result">No results found</li>
            ) : (
              filtered.map(o => (
                <li
                  key={getKey(o)}
                  className={`ss-option${getKey(o) === value ? " ss-option--selected" : ""}`}
                  onClick={() => handleSelect(getKey(o))}
                  role="option"
                  aria-selected={getKey(o) === value}
                >
                  {query ? (
                    <HighlightMatch text={getLabel(o)} query={query} />
                  ) : (
                    getLabel(o)
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Highlights matched query text inside an option label
function HighlightMatch({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="ss-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ["Personal", "Academic", "Assignment"];

const LANGUAGES = ["Hindi", "English"];





export default function AssignmentInquiry() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "", mobileNumber: "", email: "",
    mainDegreeId: "", subDegreeId: "", subject: "",
    enrollmentNumber: "",
    language: "Hindi", numberOfAssignments: 1,
    specialInstructions: "", address: "",
  });

  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get("/api/mainDegrees")
      .then(res => {
        const data = res.data?.data || res.data || [];
        setMainDegrees(Array.isArray(data) ? data : []);
      })
      .catch(() => setMainDegrees([]));
  }, []);

  useEffect(() => {
    if (!formData.mainDegreeId) { setSubDegrees([]); setSubjects([]); return; }
    api.get("/api/subDegrees")
      .then(res => {
        const all = res.data?.data || res.data || [];
        const filtered = Array.isArray(all)
          ? all.filter(s => s.mainDegreeId === formData.mainDegreeId)
          : [];
        setSubDegrees(filtered);
        setSubjects([]);
      })
      .catch(() => setSubDegrees([]));
  }, [formData.mainDegreeId]);

  useEffect(() => {
    if (!formData.subDegreeId) { setSubjects([]); return; }
    api.get(`/api/subjects?subDegreeId=${formData.subDegreeId}&limit=500`)
      .then(res => {
        const all = res.data?.data || res.data || [];
        setSubjects(Array.isArray(all) ? all : []);
      })
      .catch(() => setSubjects([]));
  }, [formData.subDegreeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === "mainDegreeId" && { subDegreeId: "", subject: "" }),
      ...(name === "subDegreeId" && { subject: "" }),
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!formData.name.trim()) { toast.error("Please enter your full name."); return false; }
      if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\s/g, ""))) { toast.error("Please enter a valid 10-digit mobile number."); return false; }
      if (!formData.email.trim()) { toast.error("Please enter your email address."); return false; }
    }
    if (step === 1) {
      if (!formData.mainDegreeId) { toast.error("Please select your main degree."); return false; }
      if (!formData.subDegreeId) { toast.error("Please select your sub degree."); return false; }
    }
    if (step === 2) {
      if (!formData.address.trim()) { toast.error("Please enter your delivery address."); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setIsSubmitting(true);

    try {
      const mDeg = mainDegrees.find(d => d.id === formData.mainDegreeId || d._id === formData.mainDegreeId)?.name || "";
      const sDeg = subDegrees.find(d => d.id === formData.subDegreeId || d._id === formData.subDegreeId)?.name || "";

      await api.post("/api/assignment-inquiries", {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        mainDegree: mDeg,
        subDegree: sDeg,
        subject: formData.subject,
        enrollmentNumber: formData.enrollmentNumber,
        solutionType: "Handwritten",
        language: formData.language,
        numberOfAssignments: formData.numberOfAssignments,
        specialInstructions: formData.specialInstructions,
        address: formData.address,
      });

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to submit. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="ai-page">
        <Helmet>
          <title>Assignment Inquiry Submitted | Book My Study Guide</title>
        </Helmet>
        <div className="ai-success">
          <div className="ai-success__icon"><CheckCircle size={52} /></div>
          <h2>Inquiry Submitted Successfully!</h2>
          <p>Thank you, <strong>{formData.name}</strong>! We have received your handwritten assignment request.</p>
          <p>Our team will contact you at <strong>{formData.mobileNumber}</strong> within 24 hours.</p>
          <div className="ai-success__details">
            <div className="ai-success__row"><BookOpen size={15} /><span>Degree: {mainDegrees.find(d => d.id === formData.mainDegreeId)?.name || "—"}</span></div>
            <div className="ai-success__row"><FileText size={15} /><span>Subject: {formData.subject || "—"}</span></div>
            <div className="ai-success__row"><PenLine size={15} /><span>Solution Type: Handwritten</span></div>
            <div className="ai-success__row"><Hash size={15} /><span>Assignments: {formData.numberOfAssignments}</span></div>
            <div className="ai-success__row"><Languages size={15} /><span>Language: {formData.language}</span></div>
          </div>
          <button className="ai-success__btn" onClick={() => { setSubmitted(false); setStep(0); setFormData({ name: "", mobileNumber: "", email: "", mainDegreeId: "", subDegreeId: "", subject: "", enrollmentNumber: "", language: "Hindi", numberOfAssignments: 1, specialInstructions: "", address: "" }); }}>
            Submit Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <Helmet>
        <title>Assignment Solution Inquiry | Book My Study Guide</title>
        <meta name="description" content="Request handwritten IGNOU assignment solutions. Fill in your academic details and our team will contact you with a customised solution." />
      </Helmet>

      {/* Hero */}
      <section className="ai-hero">
        <div className="ai-hero__inner">
          <span className="ai-hero__badge"><Star size={13} /> Handwritten Solutions</span>
          <h1 className="ai-hero__title">Assignment Solution Request</h1>
          <p className="ai-hero__sub">Tell us your academic details and we'll prepare a <strong>handwritten assignment solution</strong> tailored for you.</p>
          <div className="ai-hero__stats">
            <div className="ai-hero__stat"><PenLine size={15} /><span>100% Handwritten</span></div>
            <div className="ai-hero__stat"><Clock size={15} /><span>Fast Delivery</span></div>
            <div className="ai-hero__stat"><BadgeCheck size={15} /><span>All IGNOU Programs</span></div>
          </div>
        </div>
      </section>

      {/* Layout */}
      <div className="ai-layout container">
        {/* Sidebar */}
        <aside className="ai-sidebar">
          <div className="ai-sidebar__card">
            <BookMarked size={20} className="ai-sidebar__icon" />
            <h4>How it works</h4>
            <ol className="ai-sidebar__steps">
              <li>Fill in your personal details.</li>
              <li>Select your IGNOU program &amp; subjects.</li>
              <li>Choose language &amp; number of assignments.</li>
              <li>Submit — we call you within 24 hours.</li>
            </ol>
          </div>
          <div className="ai-sidebar__card ai-sidebar__card--accent">
            <PenLine size={20} />
            <h4>What you get</h4>
            <p>Neat, handwritten assignment solutions exactly as required by IGNOU — ready to submit.</p>
          </div>
          <div className="ai-sidebar__card ai-sidebar__card--tip">
            <GraduationCap size={20} />
            <h4>Supported Programs</h4>
            <p>BCA, MCA, BA, MA, B.Com, M.Com, B.Ed, MBA, BTS, BLIS &amp; all other IGNOU programs.</p>
          </div>
        </aside>

        {/* Form Card */}
        <div className="ai-form-card">
          {/* Progress Bar */}
          <div className="ai-progress">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className={`ai-progress__step ${i <= step ? "active" : ""} ${i < step ? "done" : ""}`}>
                  <div className="ai-progress__circle">
                    {i < step ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                  </div>
                  <span className="ai-progress__label">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`ai-progress__line${i < step ? " ai-progress__line--done" : ""}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div className="ai-section">
                <div className="ai-section__head"><User size={18} /><h3>Personal Details</h3></div>
                <div className="ai-grid ai-grid--2">
                  <div className="ai-field">
                    <label><User size={14} /> Full Name <span>*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" autoFocus />
                  </div>
                  <div className="ai-field">
                    <label><Phone size={14} /> Mobile Number <span>*</span></label>
                    <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} placeholder="10-digit mobile" />
                  </div>
                </div>
                <div className="ai-grid ai-grid--1">
                  <div className="ai-field">
                    <label><Mail size={14} /> Email Address <span>*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Academic ── */}
            {step === 1 && (
              <div className="ai-section">
                <div className="ai-section__head"><GraduationCap size={18} /><h3>Academic Details</h3></div>
                <div className="ai-grid ai-grid--2">
                  <div className="ai-field">
                    <label><BookOpen size={14} /> Main Degree <span>*</span></label>
                    <SearchableSelect
                      options={mainDegrees}
                      value={formData.mainDegreeId}
                      onChange={(val) => setFormData(prev => ({ ...prev, mainDegreeId: val, subDegreeId: "", subject: "" }))}
                      placeholder="Select Main Degree"
                    />
                  </div>
                  <div className="ai-field">
                    <label><BookOpen size={14} /> Sub Degree / Program <span>*</span></label>
                    <SearchableSelect
                      options={subDegrees}
                      value={formData.subDegreeId}
                      onChange={(val) => setFormData(prev => ({ ...prev, subDegreeId: val, subject: "" }))}
                      placeholder="Select Sub Degree"
                      disabled={!formData.mainDegreeId}
                    />
                  </div>
                </div>
                <div className="ai-grid ai-grid--1">
                  <div className="ai-field">
                    <label><FileText size={14} /> Subject / Course</label>
                    <SearchableSelect
                      options={subjects}
                      value={formData.subject}
                      onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                      placeholder="Select Subject (optional)"
                      disabled={!formData.subDegreeId}
                      idKey="name"
                      labelKey="name"
                    />
                  </div>
                </div>
                <div className="ai-grid ai-grid--1">
                  <div className="ai-field">
                    <label><FileText size={14} /> Enrollment Number</label>
                    <input type="text" name="enrollmentNumber" value={formData.enrollmentNumber} onChange={handleChange} placeholder="Your IGNOU enrollment number" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Assignment Details ── */}
            {step === 2 && (
              <div className="ai-section">
                <div className="ai-section__head"><PenLine size={18} /><h3>Assignment Requirements</h3></div>

                {/* Solution Type — fixed badge */}
                <div className="ai-field">
                  <label><PenLine size={14} /> Solution Type</label>
                  <div className="ai-solution-badge">
                    <PenLine size={16} />
                    <span>Handwritten</span>
                    <CheckCircle size={16} className="ai-solution-badge__check" />
                  </div>
                </div>

                {/* Language */}
                <div className="ai-field">
                  <label><Languages size={14} /> Language Preference <span>*</span></label>
                  <div className="ai-radio-group">
                    {LANGUAGES.map(lang => (
                      <label key={lang} className={`ai-radio ${formData.language === lang ? "ai-radio--active" : ""}`}>
                        <input
                          type="radio"
                          name="language"
                          value={lang}
                          checked={formData.language === lang}
                          onChange={handleChange}
                        />
                        {lang}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Number of Assignments */}
                <div className="ai-field">
                  <label><Hash size={14} /> Number of Assignments</label>
                  <input
                    type="number"
                    name="numberOfAssignments"
                    value={formData.numberOfAssignments}
                    onChange={handleChange}
                    placeholder="e.g. 3"
                    min="1"
                    style={{ maxWidth: 160 }}
                  />
                </div>

                {/* Special Instructions */}
                <div className="ai-field">
                  <label><MessageSquare size={14} /> Special Instructions</label>
                  <textarea
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    placeholder="Any specific requirements, guidelines from your university, formatting preferences, deadline details..."
                    rows={4}
                  />
                </div>

                {/* Address */}
                <div className="ai-field">
                  <label><MapPin size={14} /> Delivery Address <span>*</span></label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full postal address for delivery of handwritten assignments"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="ai-nav">
              {step > 0 && (
                <button type="button" className="ai-btn ai-btn--outline" onClick={prevStep}>
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button type="button" className="ai-btn ai-btn--primary" onClick={nextStep}>
                  Continue <ChevronRight size={16} />
                </button>
              )}
              {step === STEPS.length - 1 && (
                <button type="submit" className="ai-btn ai-btn--submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 size={18} className="ai-spinner" /> Submitting...</>
                    : <><Send size={18} /> Submit Inquiry</>
                  }
                </button>
              )}
            </div>

            {step === STEPS.length - 1 && (
              <p className="ai-note">
                <BadgeCheck size={14} />
                Your details will be saved securely. Our team will call you within 24 hours.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
