import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast, Zoom } from "react-toastify";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../../context/logintrue";
import api from "../../../api";
import { trackEvent } from "../../../utils/analytics";
import "./LoginModal.scss";

export default function LoginModal() {
  const { isLoginModalOpen, setLoginModalOpen, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ loginId: "", loginPassword: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Prevent background scrolling when open
  useEffect(() => {
    if (isLoginModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isLoginModalOpen]);

  if (!isLoginModalOpen) return null;

  const validate = () => {
    const e = {};
    if (!form.loginId.trim()) e.loginId = "Enter email or phone number.";
    if (!form.loginPassword) e.loginPassword = "Enter password.";
    return e;
  };

  const handleClose = () => {
    setLoginModalOpen(false);
    setForm({ loginId: "", loginPassword: "" });
    setErrors({});
  };

  const showToast = (msg, type = "info") => {
    toast[type === "error" ? "error" : "success"](msg, {
      position: "top-right",
      transition: Zoom,
      autoClose: 3000,
    });
  };

  const handleLogin = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", {
        email: form.loginId,
        password: form.loginPassword,
      });

      if (res.data.success) {
        sessionStorage.setItem("token", res.data.token);
        showToast("Login Successful!");
        trackEvent("User", "Login Success (Modal)");
        login(res.data.user); // This will also trigger pendingAction
        handleClose();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Login Failed", "error");
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/google-login", {
        tokenId: credentialResponse.credential,
      });
      if (res.data.success) {
        sessionStorage.setItem("token", res.data.token);
        showToast("Logged in with Google!");
        trackEvent("User", "Google Login Success (Modal)");
        login(res.data.user);
        handleClose();
      }
    } catch (err) {
      showToast("Google Login failed. Please try again.", "error");
    }
    setLoading(false);
  };

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="login-modal-header">
          <h2>Welcome Back</h2>
          <p>Please login to complete your purchase.</p>
        </div>

        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => showToast("Google Login Error", "error")}
            useOneTap
            theme="outline"
            shape="rectangular"
            width="100%"
          />
        </div>

        <div className="social-login-divider compact">
          <span>OR</span>
        </div>

        <form onSubmit={handleLogin} className="login-modal-form">
          <div className="form-group">
            <label>Email or Phone Number</label>
            <input
              type="text"
              placeholder="Enter email or 10-digit phone"
              value={form.loginId}
              onChange={(e) => setForm((p) => ({ ...p, loginId: e.target.value }))}
              className={errors.loginId ? "input-error" : ""}
            />
            {errors.loginId && <span className="error-text">{errors.loginId}</span>}
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Password</label>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.loginPassword}
              onChange={(e) => setForm((p) => ({ ...p, loginPassword: e.target.value }))}
              className={errors.loginPassword ? "input-error" : ""}
            />
            {errors.loginPassword && <span className="error-text">{errors.loginPassword}</span>}
          </div>

          <button className="btn-primary login-submit-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-modal-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/auth" onClick={handleClose}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
