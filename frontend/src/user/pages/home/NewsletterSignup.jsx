import React, { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import api from "../../../api";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      await api.post("/api/newsletter/subscribe", { email: trimmed });
      setStatus("success");
      setMessage("You're subscribed! We'll send you updates and offers.");
      setEmail("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setStatus("error");
      setMessage(msg);
    }
  };

  return (
    <section className="newsletter-section" aria-label="Newsletter signup">
      <div className="container">
        <div className="newsletter-card">
          <div className="newsletter-card__icon" aria-hidden="true">
            <Mail size={28} />
          </div>
          <div className="newsletter-card__copy">
            <h2>Stay Ahead with BMSG Updates</h2>
            <p>Get new study materials, offers, and exam tips delivered to your inbox.</p>
          </div>
          {status === "success" ? (
            <div className="newsletter-success">
              <CheckCircle size={20} />
              <span>{message}</span>
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                placeholder="Enter your email address"
                aria-label="Email address"
                disabled={status === "loading"}
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
              {status === "error" && (
                <p className="newsletter-error" role="alert">{message}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
