import React, { useEffect, useState } from "react";
import {
  MapPin, Mail, Clock, Facebook, Instagram,
  PhoneCall, Send, Headset, CheckCircle,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import api from "../../../../api";
import "./contact.scss";

export default function Contact() {
  const [contact, setContact] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/api/contact").then((res) => {
      const d = res.data?.success ? res.data.data : res.data;
      if (d) setContact(d);
    });
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");
    setSuccess(false);
    try {
      const res = await api.post("/api/contact/message", formData);
      if (res.data.success) {
        setSuccess(true);
        setStatusMsg("Message sent! We'll get back to you soon.");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        setStatusMsg(res.data.message || "Failed to send message.");
      }
    } catch {
      setStatusMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasSocials = contact?.facebook || contact?.instagram || contact?.whatsapp;

  return (
    <div className="ct-page">

      {/* ── Hero ── */}
      <section className="ct-hero">
        <div className="ct-hero__deco" aria-hidden="true">
          <span className="ct-hero__ring ct-hero__ring--1" />
          <span className="ct-hero__ring ct-hero__ring--2" />
        </div>
        <div className="container ct-hero__inner">
          <span className="ct-eyebrow">
            <Headset size={13} /> We're Here to Help
          </span>
          <h1>
            Get in Touch<br />
            <span>with BMSG</span>
          </h1>
          <p>
            Questions about your order, study materials, or a custom project?
            Reach out — our team responds fast.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="ct-body">
        <div className="container ct-body__grid">

          {/* ── Info panel ── */}
          <div className="ct-info">
            <div className="ct-info__cards">

              <div className="ct-info-card">
                <div className="ct-info-card__icon"><MapPin size={19} /></div>
                <div>
                  <h4>Visit Us</h4>
                  <p>{contact?.address || "—"}</p>
                </div>
              </div>

              <div className="ct-info-card">
                <div className="ct-info-card__icon"><PhoneCall size={19} /></div>
                <div>
                  <h4>Call Us</h4>
                  <a href={`tel:${contact?.phone}`}>{contact?.phone || "—"}</a>
                </div>
              </div>

              <div className="ct-info-card">
                <div className="ct-info-card__icon"><Mail size={19} /></div>
                <div>
                  <h4>Email Us</h4>
                  <a href={`mailto:${contact?.email}`}>{contact?.email || "—"}</a>
                </div>
              </div>

              <div className="ct-info-card">
                <div className="ct-info-card__icon"><Clock size={19} /></div>
                <div>
                  <h4>Office Hours</h4>
                  <p>{contact?.officeTime || "—"}</p>
                </div>
              </div>

            </div>

            {/* WhatsApp CTA */}
            {contact?.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\s+/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="ct-whatsapp"
              >
                <div className="ct-whatsapp__icon">
                  <FaWhatsapp size={24} />
                </div>
                <div className="ct-whatsapp__text">
                  <p className="ct-whatsapp__label">Fastest response via</p>
                  <p className="ct-whatsapp__value">WhatsApp Support</p>
                </div>
                <span className="ct-whatsapp__arrow">→</span>
              </a>
            )}

            {/* Social links — only render if any exist */}
            {hasSocials && (
              <div className="ct-socials">
                <span className="ct-socials__label">Follow Us</span>
                <div className="ct-socials__links">
                  {contact?.facebook && (
                    <a href={contact.facebook} target="_blank" rel="noreferrer" className="ct-social ct-social--fb" aria-label="Facebook">
                      <Facebook size={18} />
                    </a>
                  )}
                  {contact?.instagram && (
                    <a href={contact.instagram} target="_blank" rel="noreferrer" className="ct-social ct-social--ig" aria-label="Instagram">
                      <Instagram size={18} />
                    </a>
                  )}
                  {contact?.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp.replace(/\s+/g, "")}`} target="_blank" rel="noreferrer" className="ct-social ct-social--wa" aria-label="WhatsApp">
                      <FaWhatsapp size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Form panel ── */}
          <div className="ct-form-wrap">
            <h3>Send us a Message</h3>
            <form className="ct-form" onSubmit={handleSubmit} noValidate>

              <div className="ct-field">
                <label htmlFor="name">Full Name</label>
                <input id="name" value={formData.name} onChange={handleChange} placeholder="Rahul Sharma" required />
              </div>

              <div className="ct-row">
                <div className="ct-field">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
                </div>
                <div className="ct-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                </div>
              </div>

              <div className="ct-field">
                <label htmlFor="message">Your Message</label>
                <textarea id="message" rows={5} value={formData.message} onChange={handleChange} placeholder="How can we help you?" required />
              </div>

              <button type="submit" className="ct-submit" disabled={loading}>
                {loading ? "Sending…" : <><Send size={16} /> Send Message</>}
              </button>

              {statusMsg && (
                <div className={`ct-status ${success ? "ct-status--ok" : "ct-status--err"}`}>
                  {success && <CheckCircle size={15} />} {statusMsg}
                </div>
              )}

            </form>
          </div>

        </div>
      </section>

      {/* ── Map ── */}
      <section className="ct-map">
        <div className="container">
          <div className="ct-map__frame">
            <iframe
              title="BMSG Office Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3718.847077837271!2d72.8872925754127!3d21.237911780561834!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f5a559031e1%3A0xf206ac84956bbcff!2sSunrise%20Commercial%20Complex!5e0!3m2!1sen!2sin!4v1768565796263!5m2!1sen!2sin"
              width="100%"
              height="420"
              loading="lazy"
            />
          </div>
        </div>
      </section>

    </div>
  );
}
