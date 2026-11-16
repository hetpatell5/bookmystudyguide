import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, ArrowLeft, Package, GraduationCap, HelpCircle } from 'lucide-react';
import './404.scss';

const SUGGESTIONS = [
  { label: 'Combo Books', to: '/combo-books', icon: Package },
  { label: 'Projects', to: '/projects', icon: GraduationCap },
  { label: 'FAQs', to: '/faq', icon: HelpCircle },
];

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>404 – Page Not Found | Book My Study Guide</title>
        <meta name="description" content="The page you're looking for doesn't exist. Go back to BMSG home." />
      </Helmet>

      <div className="nf-page">
        <div className="nf-grain" aria-hidden="true" />

        <div className="nf-card" role="group" aria-label="Page not found">
          <div className="nf-card__top">
            <span className="nf-card__brand">BOOK MY STUDY GUIDE</span>
            <span className="nf-card__tag">HALL TICKET</span>
          </div>

          <div className="nf-card__body">
            <div className="nf-card__left">
              <div className="nf-photo" aria-hidden="true">
                <span>?</span>
              </div>
              <dl className="nf-fields">
                <div>
                  <dt>Subject Code</dt>
                  <dd>404&nbsp;&mdash;&nbsp;NF</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd className="nf-fields__status">Route Not Found</dd>
                </div>
              </dl>
            </div>

            <div className="nf-divider" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
            </div>

            <div className="nf-card__right">
              <h1 className="nf-title">This page didn&rsquo;t clear verification.</h1>
              <p className="nf-desc">
                The URL you followed doesn&rsquo;t match any page on record — it may have been moved,
                renamed, or never existed. Nothing to worry about; your account and cart are untouched.
              </p>

              <div className="nf-actions">
                <Link to="/" className="nf-btn nf-btn--primary">
                  <Home size={17} /> Return Home
                </Link>
                <button onClick={() => navigate(-1)} className="nf-btn nf-btn--outline">
                  <ArrowLeft size={17} /> Go Back
                </button>
              </div>

              <div className="nf-suggestions">
                <p className="nf-suggestions__label">Other counters open now</p>
                <div className="nf-suggestions__grid">
                  {SUGGESTIONS.map(({ label, to, icon: Icon }) => (
                    <Link key={to} to={to} className="nf-suggestion">
                      <Icon size={15} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="nf-card__bottom">
            <span className="nf-barcode" aria-hidden="true">
              {Array.from({ length: 46 }).map((_, i) => (
                <span key={i} style={{ width: (i * 7 % 3) + 1 }} />
              ))}
            </span>
            <span className="nf-card__ref">REF&nbsp;NOT-FOUND-404</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
