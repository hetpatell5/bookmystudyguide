import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Send, Loader2, User, Phone, Mail, GraduationCap,
  BookOpen, FileText, MapPin, Lightbulb, Star, Briefcase,
  ChevronRight, ArrowLeft, BadgeCheck, Clock, Calendar,
  BookMarked, FlaskConical, Presentation, Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import api from "../../../../api";
import "./ProjectInquiry.scss";

const STEPS = ["Personal", "Academic", "Project Details"];

const INQUIRY_TYPES = [
  { value: "Project", label: "Project", Icon: Lightbulb },
  { value: "Practical", label: "Practical", Icon: FlaskConical },
  { value: "Synopsis", label: "Synopsis", Icon: Presentation },
  { value: "Internship", label: "Internship", Icon: Building2 },
];

export default function ProjectInquiry() {
  const [searchParams] = useSearchParams();
  const defaultType = INQUIRY_TYPES.find(t => t.value === searchParams.get("type"))?.value || "Project";

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "", mobileNumber: "", email: "",
    mainDegreeId: "", subDegreeId: "", subject: "", enrollmentNumber: "",
    inquiryType: defaultType, projectDescription: "", deadline: "", address: "",
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
      if (!formData.projectDescription.trim()) { toast.error("Please describe your project requirements."); return false; }
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

      await api.post("/api/project-inquiries", {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        mainDegree: mDeg,
        subDegree: sDeg,
        subject: formData.subject,
        enrollmentNumber: formData.enrollmentNumber,
        inquiryType: formData.inquiryType,
        projectDescription: formData.projectDescription,
        deadline: formData.deadline,
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

  const selectedType = INQUIRY_TYPES.find(t => t.value === formData.inquiryType);

  if (submitted) {
    return (
      <div className="pi-page">
        <Helmet>
          <title>Project Inquiry Submitted | Book My Study Guide</title>
        </Helmet>
        <div className="pi-success">
          <div className="pi-success__icon"><CheckCircle size={52} /></div>
          <h2>Inquiry Submitted!</h2>
          <p>Thank you, <strong>{formData.name}</strong>! We received your <strong>{formData.inquiryType}</strong> request.</p>
          <p>Our team will call you at <strong>{formData.mobileNumber}</strong> within 24 hours.</p>
          <div className="pi-success__details">
            <div className="pi-success__row"><BookOpen size={15} /><span>Degree: {mainDegrees.find(d => d.id === formData.mainDegreeId)?.name || "—"}</span></div>
            <div className="pi-success__row"><Briefcase size={15} /><span>Type: {formData.inquiryType}</span></div>
            {formData.subject && <div className="pi-success__row"><FileText size={15} /><span>Subject: {formData.subject}</span></div>}
            {formData.deadline && <div className="pi-success__row"><Calendar size={15} /><span>Deadline: {formData.deadline}</span></div>}
          </div>
          <button className="pi-success__btn" onClick={() => {
            setSubmitted(false); setStep(0);
            setFormData({ name: "", mobileNumber: "", email: "", mainDegreeId: "", subDegreeId: "", subject: "", enrollmentNumber: "", inquiryType: "Project", projectDescription: "", deadline: "", address: "" });
          }}>
            Submit Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pi-page">
      <Helmet>
        <title>{formData.inquiryType === "Internship" ? "Internship Report Request" : "Project & Practical Inquiry"} | Book My Study Guide</title>
        <meta name="description" content={formData.inquiryType === "Internship" ? "Request a custom internship report tailored for your IGNOU program. Fill the form and our team will prepare it for you." : "Request a custom IGNOU project, practical, synopsis or internship. Fill the form and our team will deliver a fully tailored solution."} />
      </Helmet>

      {/* Hero */}
      <section className="pi-hero">
        <div className="pi-hero__inner">
          <span className="pi-hero__badge"><Star size={13} /> {formData.inquiryType === "Internship" ? "Internship Report" : "Project & Practical Solutions"}</span>
          <h1 className="pi-hero__title">{formData.inquiryType === "Internship" ? "Custom Internship Report Request" : "Project / Practical Inquiry"}</h1>
          <p className="pi-hero__sub">
            {formData.inquiryType === "Internship"
              ? "Fill in your details and we'll prepare a <strong>fully customised internship report</strong> for your program."
              : "Need a Project, Practical, Synopsis or Internship? Fill in your details and we'll deliver a <strong>tailored solution</strong>."}
          </p>
          <div className="pi-hero__stats">
            <div className="pi-hero__stat"><Lightbulb size={15} /><span>Custom Projects</span></div>
            <div className="pi-hero__stat"><Clock size={15} /><span>Fast Turnaround</span></div>
            <div className="pi-hero__stat"><BadgeCheck size={15} /><span>100% Original</span></div>
          </div>

          {/* Type selector in hero */}
          <div className="pi-hero__types">
            {INQUIRY_TYPES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`pi-type-pill${formData.inquiryType === value ? " active" : ""}`}
                onClick={() => setFormData(p => ({ ...p, inquiryType: value }))}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Layout */}
      <div className="pi-layout container">
        {/* Sidebar */}
        <aside className="pi-sidebar">
          <div className="pi-sidebar__card">
            <Lightbulb size={20} className="pi-sidebar__icon" />
            <h4>How it works</h4>
            <ol className="pi-sidebar__steps">
              <li>Choose your inquiry type above.</li>
              <li>Fill personal &amp; academic details.</li>
              <li>Describe your project requirements.</li>
              <li>Submit — we deliver a custom solution.</li>
            </ol>
          </div>
          <div className="pi-sidebar__card pi-sidebar__card--accent">
            <Briefcase size={20} />
            <h4>What we offer</h4>
            <ul className="pi-sidebar__list">
              <li>📁 Complete project files</li>
              <li>🔬 Practical records</li>
              <li>📝 Synopsis writing</li>
              <li>🏢 Internship reports</li>
            </ul>
          </div>
          <div className="pi-sidebar__card pi-sidebar__card--tip">
            <GraduationCap size={20} />
            <h4>Supported Programs</h4>
            <p>BCA, MCA, MBA, B.Tech, M.Tech, BA, MA, IGNOU &amp; all other major programs.</p>
          </div>
        </aside>

        {/* Form Card */}
        <div className="pi-form-card">
          {/* Progress Bar */}
          <div className="pi-progress">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className={`pi-progress__step ${i <= step ? "active" : ""} ${i < step ? "done" : ""}`}>
                  <div className="pi-progress__circle">
                    {i < step ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                  </div>
                  <span className="pi-progress__label">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`pi-progress__line${i < step ? " pi-progress__line--done" : ""}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div className="pi-section">
                <div className="pi-section__head"><User size={18} /><h3>Personal Details</h3></div>
                <div className="pi-grid pi-grid--2">
                  <div className="pi-field">
                    <label><User size={14} /> Full Name <span>*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Priya Singh" autoFocus />
                  </div>
                  <div className="pi-field">
                    <label><Phone size={14} /> Mobile Number <span>*</span></label>
                    <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} placeholder="10-digit mobile" />
                  </div>
                </div>
                <div className="pi-grid pi-grid--1">
                  <div className="pi-field">
                    <label><Mail size={14} /> Email Address <span>*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Academic ── */}
            {step === 1 && (
              <div className="pi-section">
                <div className="pi-section__head"><GraduationCap size={18} /><h3>Academic Details</h3></div>
                <div className="pi-grid pi-grid--2">
                  <div className="pi-field">
                    <label><BookOpen size={14} /> Main Degree <span>*</span></label>
                    <select name="mainDegreeId" value={formData.mainDegreeId} onChange={handleChange}>
                      <option value="">Select Main Degree</option>
                      {mainDegrees.map(d => (
                        <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pi-field">
                    <label><BookOpen size={14} /> Sub Degree / Program <span>*</span></label>
                    <select name="subDegreeId" value={formData.subDegreeId} onChange={handleChange} disabled={!formData.mainDegreeId}>
                      <option value="">Select Sub Degree</option>
                      {subDegrees.map(d => (
                        <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pi-grid pi-grid--2">
                  <div className="pi-field">
                    <label><FileText size={14} /> Subject / Course</label>
                    <select name="subject" value={formData.subject} onChange={handleChange} disabled={!formData.subDegreeId}>
                      <option value="">Select Subject (optional)</option>
                      {subjects.map(s => (
                        <option key={s.id || s._id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pi-field">
                    <label><BookMarked size={14} /> Enrollment Number</label>
                    <input type="text" name="enrollmentNumber" value={formData.enrollmentNumber} onChange={handleChange} placeholder="Your enrollment number" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Project Details ── */}
            {step === 2 && (
              <div className="pi-section">
                <div className="pi-section__head">
                  {selectedType && <selectedType.Icon size={18} />}
                  <h3>{formData.inquiryType} Requirements</h3>
                </div>

                {/* Type Selector */}
                <div className="pi-field">
                  <label><Briefcase size={14} /> Inquiry Type <span>*</span></label>
                  <div className="pi-type-group">
                    {INQUIRY_TYPES.map(({ value, label, Icon }) => (
                      <label key={value} className={`pi-type-card${formData.inquiryType === value ? " active" : ""}`}>
                        <input type="radio" name="inquiryType" value={value} checked={formData.inquiryType === value} onChange={handleChange} />
                        <Icon size={18} />
                        <span>{label}</span>
                        {formData.inquiryType === value && <CheckCircle size={14} className="pi-type-check" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="pi-field">
                  <label><FileText size={14} /> {formData.inquiryType} Description <span>*</span></label>
                  <textarea
                    name="projectDescription"
                    value={formData.projectDescription}
                    onChange={handleChange}
                    placeholder={`Describe your ${formData.inquiryType.toLowerCase()} topic, requirements, guidelines from your university, any specific formatting needs...`}
                    rows={5}
                  />
                </div>

                {/* Deadline */}
                <div className="pi-grid pi-grid--2">
                  <div className="pi-field">
                    <label><Calendar size={14} /> Deadline / Submission Date</label>
                    <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} />
                  </div>
                  <div className="pi-field">
                    <label><MapPin size={14} /> Delivery Address <span>*</span></label>
                    <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Full delivery address" rows={2} />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="pi-nav">
              {step > 0 && (
                <button type="button" className="pi-btn pi-btn--outline" onClick={prevStep}>
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button type="button" className="pi-btn pi-btn--primary" onClick={nextStep}>
                  Continue <ChevronRight size={16} />
                </button>
              )}
              {step === STEPS.length - 1 && (
                <button type="submit" className="pi-btn pi-btn--submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 size={18} className="pi-spinner" /> Submitting...</>
                    : <><Send size={18} /> Submit Inquiry</>
                  }
                </button>
              )}
            </div>

            {step === STEPS.length - 1 && (
              <p className="pi-note">
                <BadgeCheck size={14} />
                Your details are saved securely. Our team will contact you within 24 hours with pricing &amp; delivery details.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
