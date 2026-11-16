import React, { useState, useEffect, useRef } from "react";
import "./CustomizedProject.scss";
import api from "../../../../api";
import { toast } from "react-toastify";
import {
  CheckCircle,
  Send,
  Loader2,
  User,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  FileText,
  MapPin,
  MessageCircle,
  Lightbulb,
  Clock,
  Star,
  Search,
  ChevronDown,
  X,
} from "lucide-react";

// ─── Searchable Select ────────────────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled, idKey = "id", labelKey = "name" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const getKey   = (o) => o[idKey]    || o._id || o;
  const getLabel = (o) => o[labelKey] || o.name || o;

  const selected = options.find(o => getKey(o) === value);
  const filtered  = options.filter(o =>
    getLabel(o).toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleSelect = (key) => { onChange(key); setOpen(false); setQuery(""); };
  const handleClear  = (e)   => { e.stopPropagation(); onChange(""); setQuery(""); };

  return (
    <div className={`ss-wrap${disabled ? " ss-wrap--disabled" : ""}${open ? " ss-wrap--open" : ""}`} ref={ref}>
      <div className="ss-trigger" onClick={() => { if (!disabled) setOpen(o => !o); }} role="combobox" aria-expanded={open} aria-haspopup="listbox">
        <span className={`ss-trigger__value${!selected ? " ss-trigger__value--placeholder" : ""}`}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <span className="ss-trigger__icons">
          {selected && !disabled && (
            <span className="ss-clear" onClick={handleClear} title="Clear"><X size={13} /></span>
          )}
          <ChevronDown size={15} className={`ss-chevron${open ? " ss-chevron--up" : ""}`} />
        </span>
      </div>

      {open && (
        <div className="ss-dropdown" role="listbox">
          <div className="ss-search">
            <Search size={14} />
            <input ref={inputRef} type="text" className="ss-search__input" placeholder="Search..." value={query}
              onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()} />
            {query && (
              <button className="ss-search__clear" onClick={() => setQuery("")} type="button"><X size={12} /></button>
            )}
          </div>
          <ul className="ss-list">
            <li className={`ss-option ss-option--empty-val${!value ? " ss-option--selected" : ""}`} onClick={() => handleSelect("")} role="option">
              {placeholder}
            </li>
            {filtered.length === 0 ? (
              <li className="ss-option ss-option--no-result">No results found</li>
            ) : (
              filtered.map(o => (
                <li key={getKey(o)} className={`ss-option${getKey(o) === value ? " ss-option--selected" : ""}`}
                  onClick={() => handleSelect(getKey(o))} role="option" aria-selected={getKey(o) === value}>
                  {query ? <HighlightMatch text={getLabel(o)} query={query} /> : getLabel(o)}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

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

const STEPS = ["Personal", "Academic", "Project"];

export default function CustomizedProject() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    email: "",
    mainDegreeId: "",
    subDegreeId: "",
    subject: "",
    enrollmentNumber: "",
    projectDetail: "",
    address: "",
  });

  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [mainRes, contactRes] = await Promise.all([
          api.get("/api/mainDegrees"),
          api.get("/api/contact"),
        ]);
        if (mainRes.data?.success || Array.isArray(mainRes.data?.data) || Array.isArray(mainRes.data)) {
          setMainDegrees(
            Array.isArray(mainRes.data?.data)
              ? mainRes.data.data
              : Array.isArray(mainRes.data)
              ? mainRes.data
              : []
          );
        }
        if (contactRes.data) setContactInfo(contactRes.data);
      } catch (err) {
        console.error("Error fetching initial data", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formData.mainDegreeId) {
      setSubDegrees([]);
      setSubjects([]);
      return;
    }
    const fetchSub = async () => {
      try {
        const res = await api.get("/api/subDegrees");
        const all = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setSubDegrees(all.filter((s) => s.mainDegreeId === formData.mainDegreeId));
      } catch (err) {
        console.error("Error fetching sub degrees", err);
      }
    };
    fetchSub();
  }, [formData.mainDegreeId]);

  useEffect(() => {
    if (!formData.subDegreeId) { setSubjects([]); return; }
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/api/subjects?subDegreeId=${formData.subDegreeId}&limit=500`);
        const all = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setSubjects(all);
      } catch (err) {
        console.error("Error fetching subjects", err);
      }
    };
    fetchSubjects();
  }, [formData.subDegreeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "mainDegreeId" && { subDegreeId: "", subject: "" }),
      ...(name === "subDegreeId" && { subject: "" }),
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!formData.name.trim()) { toast.error("Please enter your full name."); return false; }
      if (!formData.mobileNumber.trim()) { toast.error("Please enter your mobile number."); return false; }
      if (!formData.email.trim()) { toast.error("Please enter your email address."); return false; }
    }
    if (step === 1) {
      if (!formData.mainDegreeId) { toast.error("Please select your main degree."); return false; }
      if (!formData.subDegreeId) { toast.error("Please select your sub degree."); return false; }
      if (!formData.subject) { toast.error("Please select your subject."); return false; }
    }
    if (step === 2) {
      if (!formData.projectDetail.trim()) { toast.error("Please describe your project."); return false; }
      if (!formData.address.trim()) { toast.error("Please enter your address."); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setIsSubmitting(true);

    if (!contactInfo?.whatsapp) {
      toast.error("Contact information unavailable. Please try again later.");
      setIsSubmitting(false);
      return;
    }

    const whatsappNumber = contactInfo.whatsapp.replace(/\s+/g, "");
    const mDeg = mainDegrees.find((d) => d.id === formData.mainDegreeId || d._id === formData.mainDegreeId)?.name || "N/A";
    const sDeg = subDegrees.find((d) => d.id === formData.subDegreeId || d._id === formData.subDegreeId)?.name || "N/A";

    const textPayload = `*Customized Project Inquiry*

*Name:* ${formData.name}
*Mobile:* ${formData.mobileNumber}
*Email:* ${formData.email}

*Academic Details:*
*Main Degree:* ${mDeg}
*Sub Degree:* ${sDeg}
*Subject:* ${formData.subject || "N/A"}
*Enrollment No:* ${formData.enrollmentNumber || "N/A"}

*Project Detail:*
${formData.projectDetail}

*Address:*
${formData.address}
`;

    const encodedText = encodeURIComponent(textPayload);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

    setTimeout(() => {
      window.open(whatsappUrl, "_blank");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="cp-page">
      {/* Hero */}
      <section className="cp-hero">
        <div className="cp-hero__inner">
          <span className="cp-hero__badge">
            <Star size={14} /> University Projects
          </span>
          <h1 className="cp-hero__title">Customized Project Inquiry</h1>
          <p className="cp-hero__subtitle">
            Fill in your academic details and get a fully customized project delivered to you.
          </p>
          <div className="cp-hero__stats">
            <div className="cp-hero__stat">
              <Clock size={16} />
              <span>Fast Turnaround</span>
            </div>
            <div className="cp-hero__stat">
              <CheckCircle size={16} />
              <span>100% Original</span>
            </div>
            <div className="cp-hero__stat">
              <MessageCircle size={16} />
              <span>WhatsApp Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main layout */}
      <div className="cp-layout container">
        {/* Sidebar */}
        <aside className="cp-sidebar">
          <div className="cp-sidebar__card">
            <Lightbulb size={20} className="cp-sidebar__icon" />
            <h4>How it works</h4>
            <ol className="cp-sidebar__steps">
              <li>Fill in your personal details.</li>
              <li>Share your academic program.</li>
              <li>Describe your project requirements.</li>
              <li>Submit — we connect via WhatsApp.</li>
            </ol>
          </div>
          <div className="cp-sidebar__card cp-sidebar__card--accent">
            <GraduationCap size={20} />
            <h4>Supported Degrees</h4>
            <p>BCA, MCA, MBA, B.Tech, M.Tech, BA, MA, IGNOU & more.</p>
          </div>
        </aside>

        {/* Form card */}
        <div className="cp-form-card">
          {/* Progress */}
          <div className="cp-progress">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className={`cp-progress__step ${i <= step ? "active" : ""} ${i < step ? "done" : ""}`}>
                  <div className="cp-progress__circle">
                    {i < step ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                  </div>
                  <span className="cp-progress__label">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`cp-progress__line${i < step ? " cp-progress__line--done" : ""}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Step 0 — Personal */}
            {step === 0 && (
              <div className="cp-section">
                <div className="cp-section__head">
                  <User size={18} />
                  <h3>Personal Details</h3>
                </div>
                <div className="cp-grid cp-grid--2">
                  <div className="cp-field">
                    <label><User size={14} /> Full Name <span>*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div className="cp-field">
                    <label><Phone size={14} /> Mobile Number <span>*</span></label>
                    <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} placeholder="+91 9XXXXXXXXX" />
                  </div>
                </div>
                <div className="cp-grid cp-grid--1">
                  <div className="cp-field">
                    <label><Mail size={14} /> Email Address <span>*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@university.edu" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 — Academic */}
            {step === 1 && (
              <div className="cp-section">
                <div className="cp-section__head">
                  <GraduationCap size={18} />
                  <h3>Academic Details</h3>
                </div>
                <div className="cp-grid cp-grid--2">
                  <div className="cp-field">
                    <label><BookOpen size={14} /> Main Degree <span>*</span></label>
                    <SearchableSelect
                      options={mainDegrees}
                      value={formData.mainDegreeId}
                      onChange={(val) => setFormData(prev => ({ ...prev, mainDegreeId: val, subDegreeId: "", subject: "" }))}
                      placeholder="Select Main Degree"
                    />
                  </div>
                  <div className="cp-field">
                    <label><BookOpen size={14} /> Sub Degree <span>*</span></label>
                    <SearchableSelect
                      options={subDegrees}
                      value={formData.subDegreeId}
                      onChange={(val) => setFormData(prev => ({ ...prev, subDegreeId: val, subject: "" }))}
                      placeholder="Select Sub Degree"
                      disabled={!formData.mainDegreeId}
                    />
                  </div>
                </div>
                <div className="cp-grid cp-grid--1">
                  <div className="cp-field">
                    <label><FileText size={14} /> Subject <span>*</span></label>
                    <SearchableSelect
                      options={subjects}
                      value={formData.subject}
                      onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                      placeholder="Select Subject"
                      disabled={!formData.subDegreeId}
                      idKey="name"
                      labelKey="name"
                    />
                  </div>
                </div>
                <div className="cp-grid cp-grid--1">
                  <div className="cp-field">
                    <label><FileText size={14} /> Enrollment Number</label>
                    <input type="text" name="enrollmentNumber" value={formData.enrollmentNumber} onChange={handleChange} placeholder="Your university enrollment number" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Project */}
            {step === 2 && (
              <div className="cp-section">
                <div className="cp-section__head">
                  <Lightbulb size={18} />
                  <h3>Project Requirements</h3>
                </div>
                <div className="cp-grid cp-grid--1">
                  <div className="cp-field">
                    <label><FileText size={14} /> Project Description <span>*</span></label>
                    <textarea name="projectDetail" value={formData.projectDetail} onChange={handleChange} placeholder="Describe your project topic, specific requirements, deadline, any guidelines from your university..." rows={5}></textarea>
                  </div>
                </div>
                <div className="cp-grid cp-grid--1">
                  <div className="cp-field">
                    <label><MapPin size={14} /> Delivery Address <span>*</span></label>
                    <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Full address for project delivery" rows={3}></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="cp-nav">
              {step > 0 && (
                <button type="button" className="cp-btn cp-btn--outline" onClick={prevStep}>
                  Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button type="button" className="cp-btn cp-btn--primary" onClick={nextStep}>
                  Continue
                </button>
              )}
              {step === STEPS.length - 1 && (
                <button type="submit" className="cp-btn cp-btn--whatsapp" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 size={18} className="cp-spinner" /> Sending...</>
                  ) : (
                    <><Send size={18} /> Submit via WhatsApp</>
                  )}
                </button>
              )}
            </div>

            {step === STEPS.length - 1 && (
              <p className="cp-note">
                <CheckCircle size={14} />
                Your details will be formatted and sent directly to our WhatsApp support team.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
