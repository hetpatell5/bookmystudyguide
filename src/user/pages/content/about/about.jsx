import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./about.scss";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconBook = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconTarget = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconRocket = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { num: 2025, suffix: "", label: "Year Founded" },
  { num: 100, suffix: "+", label: "Study Guides" },
  { num: 5000, suffix: "+", label: "Happy Students" },
];

const FEATURES = [
  { Icon: IconBook,   title: "Exam-Aligned Content",     desc: "Every guide is structured around how exams are actually set, not just how textbooks are written." },
  { Icon: IconShield, title: "Legally Registered",        desc: "Incorporated under MCA with PAN, GST, Certificate of Incorporation and DPIIT Startup India recognition." },
  { Icon: IconTarget, title: "Built for Exam Prep",       desc: "Purpose-built for students preparing for distance and university exams — not a generic note-sharing platform." },
  { Icon: IconUsers,  title: "Student-First Mindset",     desc: "We build BMSG the way a student would want it — practical, clear, and results-focused." },
  { Icon: IconStar,   title: "Quality Over Quantity",     desc: "Each guide is tested against real exam patterns. We release fewer, better guides." },
  { Icon: IconEye,    title: "Transparent Identity",      desc: "Every claim about who we are is backed by public government documents — verifiable by anyone." },
  { Icon: IconRocket, title: "DPIIT Recognised Startup",  desc: "Officially recognised under Startup India in the Education & EdTech sector by the Government of India." },
  { Icon: IconZap,    title: "Delivered to Your Door",    desc: "Physical printed books shipped directly to your address — no printing hassle, just open and study." },
];

const MILESTONES = [
  {
    year: "July 2025",
    title: "Incorporated",
    desc: "BMSG BookMyStudyGuide Research, Publishing House & EdTech Private Limited registered under the Ministry of Corporate Affairs, Gujarat.",
  },
  {
    year: "January 2026",
    title: "Renamed",
    desc: "Company formally renamed to BMSG Learning Innovation Private Limited, reflecting a broader scope of learning-technology work.",
  },
  {
    year: "June 2026",
    title: "DPIIT Recognition",
    desc: "Recognised by the Department for Promotion of Industry and Internal Trade as a Startup India entity in the Education & EdTech sector.",
  },
];

const CREDENTIALS = [
  { title: "Certificate of Incorporation", label: "CIN",      id: "U58110GJ2025PTC165704", badge: "MCA Verified",      file: "/trust/BMSGCOI.pdf" },
  { title: "Permanent Account Number",     label: "PAN",      id: "AANCB7927R",            badge: "IT Dept. Verified", file: "/trust/BMSG NEW PANCARD.pdf" },
  { title: "GST Identification Number",    label: "GSTIN",    id: "24AANCB7927R1ZT",       badge: "GST Registered",    file: null },
  { title: "Startup India Certificate",    label: "DPIIT No.", id: "DIPP265616",            badge: "Valid to 2035",     file: "/trust/BMSG startup india certificate.pdf" },
];

// ─── Animated Counter ─────────────────────────────────────────────────────────

function Counter({ target, suffix }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const steps = 50;
        const inc = target / steps;
        let cur = 0;
        const t = setInterval(() => {
          cur += inc;
          if (cur >= target) { setVal(target); clearInterval(t); }
          else setVal(Math.floor(cur));
        }, 1600 / steps);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function About() {
  const revealRefs = useRef([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const r = (el) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  return (
    <main className="ab">

      {/* ── Page Header ── */}
      <div className="ab__header">
        <div className="ab__wrap">
          <nav className="ab__breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>About Us</span>
          </nav>
          <h1>About Us</h1>
        </div>
      </div>

      {/* ── Intro ── */}
      <section className="ab__section">
        <div className="ab__wrap">
          <div className="ab__intro" ref={r}>
            <p className="ab__intro-lead">
              <strong>Book My Study Guide</strong> is an India-based publishing company dedicated to IGNOU
              and other distance-learning students established in 2025 in India. It is recognised as an
              empathy firm from different discussion points on the IGNOU students.
            </p>
            <p>
              We started as a small publishing effort focused on solving a real problem: students spending
              hours hunting for reliable study material — only to find incomplete guides, outdated notes,
              or content that didn't match what was actually asked in exams. Our exam-first approach means
              every guide is structured around how examinations are set, not just how textbooks are written.
            </p>
            <p>
              Today, BMSG Learning Innovation Private Limited is a DPIIT-recognised EdTech startup serving
              students across India through digital-first, affordable, and verifiable study material.
            </p>
          </div>
        </div>
      </section>


      {/* ── Vision & Mission ── */}
      <section className="ab__section ab__section--gray">
        <div className="ab__wrap">
          <div className="ab__section-hd reveal" ref={r}>
            <h2>Our Vision &amp; Mission</h2>
          </div>
          <div className="ab__vm-grid reveal" ref={r}>
            <div className="ab__vm-card">
              <h3>Vision</h3>
              <p>
                To become India's most trusted digital study material platform — where every student,
                regardless of location or background, has access to high-quality, exam-aligned learning
                resources that genuinely improve their results.
              </p>
            </div>
            <div className="ab__vm-card ab__vm-card--accent">
              <h3>Mission</h3>
              <p>
                To build a learning technology company that structures study material around how
                examinations are actually set — delivering clarity, confidence, and exam readiness
                to every student through digital-first, affordable, and verifiable products.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="ab__section">
        <div className="ab__wrap">
          <div className="ab__section-hd reveal" ref={r}>
            <h2>Features of Book My Study Guide</h2>
            <p>What sets our study material apart from every other resource available.</p>
          </div>
          <div className="ab__features reveal" ref={r}>
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <div className="ab__feature" key={i}>
                <div className="ab__feature-icon"><Icon /></div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Process ── */}
      <section className="ab__section ab__section--gray">
        <div className="ab__wrap">
          <div className="ab__section-hd reveal" ref={r}>
            <h2>The process is as easy as 1-2-3</h2>
          </div>
          <div className="ab__steps reveal" ref={r}>
            <div className="ab__step">
              <div className="ab__step-num">1</div>
              <h4>Select your course</h4>
              <p>Browse by programme, subject, or exam type and pick exactly what you need.</p>
            </div>
            <div className="ab__step-arrow">→</div>
            <div className="ab__step">
              <div className="ab__step-num">2</div>
              <h4>Place your order</h4>
              <p>Quick, secure checkout. We dispatch your printed book within 1–2 business days.</p>
            </div>
            <div className="ab__step-arrow">→</div>
            <div className="ab__step">
              <div className="ab__step-num">3</div>
              <h4>Receive &amp; study</h4>
              <p>Your printed book is shipped to your address. Open it and start studying.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why BMSG ── */}
      <section className="ab__section">
        <div className="ab__wrap ab__reason-grid">
          <div className="ab__reason-text reveal" ref={r}>
            <h2>The Reason of Our Existence</h2>
            <p>
              In the world of distance learning, the biggest challenge students face is not the
              syllabus — it's finding study material that actually prepares them for the exam.
              Most guides simply reproduce textbook content without considering how questions are
              framed, what examiners look for, or how marks are distributed.
            </p>
            <p>
              We exist to make sure every student — whether in a metro or a small town — has a
              physical, exam-ready book in their hands before their exam. Our printed guides are
              built around actual exam patterns, not textbook chapter order. That one difference
              changes how students study and how well they perform.
            </p>
            <p>
              Our goal is to be more than a store. Every book we print and ship is a commitment — that
              a student somewhere will open it, study from it, and perform better in their exam. That
              is what drives every decision we make at BMSG.
            </p>
          </div>
          <div className="ab__reason-side reveal" ref={r}>
            <div className="ab__reason-box">
              <div className="ab__reason-icon"><IconBook /></div>
              <h3>BMSG Learning Innovation<br />Private Limited</h3>
              <ul>
                <li><IconCheck /> Printed IGNOU Study Guides</li>
                <li><IconCheck /> Curated Study Guides</li>
                <li><IconCheck /> Question Banks</li>
                <li><IconCheck /> Synopsis &amp; Project Books</li>
                <li><IconCheck /> Practical Files</li>
                <li><IconCheck /> Shipped Pan-India</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Journey ── */}
      <section className="ab__section ab__section--gray">
        <div className="ab__wrap">
          <div className="ab__section-hd reveal" ref={r}>
            <h2>Our Journey</h2>
          </div>
          <div className="ab__timeline reveal" ref={r}>
            {MILESTONES.map((m, i) => (
              <div className="ab__tl-item" key={i}>
                <div className="ab__tl-year">{m.year}</div>
                <div className="ab__tl-marker">
                  <div className="ab__tl-dot" />
                  {i < MILESTONES.length - 1 && <div className="ab__tl-line" />}
                </div>
                <div className="ab__tl-body">
                  <h4>{m.title}</h4>
                  <p>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Certificates ── */}
      <section className="ab__section ab__section--gray">
        <div className="ab__wrap">
          <div className="ab__section-hd reveal" ref={r}>
            <h2>Certificates — Seal of Trust</h2>
            <p>
              Every credential listed here is publicly verifiable through the respective government
              portals. We publish these so students can trust who they are buying from.
            </p>
          </div>
          <div className="ab__creds reveal" ref={r}>
            {CREDENTIALS.map((c, i) => (
              <div className="ab__cred" key={i}>
                <div className="ab__cred-top">
                  <div className="ab__cred-icon"><IconFile /></div>
                  <span className="ab__cred-badge">{c.badge}</span>
                </div>
                <h4>{c.title}</h4>
                <div className="ab__cred-id">
                  <span>{c.label}</span>
                  <strong>{c.id}</strong>
                </div>
                {c.file
                  ? <a href={c.file} target="_blank" rel="noreferrer" className="ab__cred-link">View Document →</a>
                  : <span className="ab__cred-link ab__cred-link--muted">Available on GST Portal</span>
                }
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
