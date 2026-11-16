import React, { useRef, useState, useEffect } from "react";
import "./auth.scss";
import { toast, Zoom } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import Stepper from "../../../../components/Stepper/Stepper"; // Ensure path is correct
import { useAuth } from "../../../../context/logintrue";
import { GoogleLogin } from '@react-oauth/google';
import api from "../../../../api";
import { trackEvent } from "../../../../utils/analytics";

const initialForm = {
  fullName: "",
  phoneNumber: "",
  course: "",
  university: "",
  address: "",
  termsAccepted: false,
  email: "",
  password: "",
  confirmPassword: "",
  loginId: "",
  loginPassword: "",
};

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendCountdown, setResendCountdown] = useState(0);

  // OTP State (Better than Ref for Paste support)
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpBoxReference = useRef([]);

  const [form, setForm] = useState(initialForm);
  const { login } = useAuth();
  const navigate = useNavigate();

  // --- Toast helper ---
  const showToast = (msg, type = "info") => {
    toast[type === "error" ? "error" : "success"](msg, {
      position: "top-right",
      transition: Zoom,
      autoClose: 3000,
    });
  };

  // --- Validation Helpers ---
  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.phoneNumber.match(/^\d{10}$/)) e.phoneNumber = "Phone must be 10 digits.";
    if (!form.course.trim()) e.course = "Course is required.";
    if (!form.university.trim()) e.university = "University required.";
    if (!form.address.trim()) e.address = "Address required.";
    if (!form.termsAccepted) e.termsAccepted = "Accept Terms & Conditions.";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) e.email = "Valid email required.";
    if (form.password.length < 6) e.password = "Password min 6 chars.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const validateLogin = () => {
    const e = {};
    if (!form.loginId.trim()) e.loginId = "Enter email or phone number.";
    if (!form.loginPassword) e.loginPassword = "Enter password.";
    return e;
  };

  // --- HANDLERS ---

  const handleStep1Submit = (ev) => {
    ev.preventDefault();
    const e = validateStep1();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleStep2Submit = async (ev) => {
    ev.preventDefault();
    const e = validateStep2();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", {
        name: form.fullName,
        email: form.email,
        phoneno: form.phoneNumber,
        password: form.password,
        course: form.course,
        university: form.university,
        address: form.address,
      });

      if (res.data.success) {
        setStep(3);
        setErrors({});
        showToast("OTP sent to your email.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration Failed";
      setErrors({ email: msg }); // Show error under email field if duplicate
      showToast(msg, "error");
    }
    setLoading(false);
  };

  // --- OTP Logic (Improved) ---
  const handleOtpChange = (value, index) => {
    const digit = String(value).replace(/\D/g, "").slice(0, 1);
    let newArr = [...otp];
    newArr[index] = digit;
    setOtp(newArr);

    if (digit && index < 5) {
      otpBoxReference.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      otpBoxReference.current[index - 1]?.focus();
    }
  };

  // Handle paste into any OTP input (support pasting full OTP)
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData?.getData("Text") || "";
    const digits = paste.replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const newArr = [...otp];
    for (let i = 0; i < digits.length; i++) {
      newArr[i] = digits[i];
    }
    setOtp(newArr);
    const focusIndex = Math.min(digits.length, 5);
    setTimeout(() => otpBoxReference.current[focusIndex]?.focus(), 0);
    e.preventDefault();
  };

  const handleVerifyOtp = async (ev) => {
    ev.preventDefault();
    const otpVal = otp.join("");
    if (otpVal.length !== 6) {
      showToast("Enter complete 6-digit OTP", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", {
        email: form.email,
        otp: otpVal
      });

      if (res.data.success) {
        showToast("Email verified! Registration complete.");
        trackEvent("User", "Sign Up Success");
        setMode("login");
        setStep(1);
        setForm(initialForm);
        setErrors({});
        setOtp(new Array(6).fill(""));
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Verification Failed";
      showToast(msg, "error");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const res = await api.post("/api/auth/resend-otp", { email: form.email });
      if (res.data.success) {
        setResendCountdown(30);
        showToast("OTP resent successfully.");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Resend failed", "error");
    }
    setLoading(false);
  };

  const handleLogin = async (ev) => {
    ev.preventDefault();
    const e = validateLogin();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", {
        email: form.loginId,
        password: form.loginPassword
      });

      if (res.data.success) {
        sessionStorage.setItem("token", res.data.token);
        login(res.data.user); // Update Context
        showToast("Login Successful!");
        trackEvent("User", "Login Success");
        navigate("/");
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
        tokenId: credentialResponse.credential
      });
      if (res.data.success) {
        sessionStorage.setItem("token", res.data.token);
        login(res.data.user);
        showToast("Logged in with Google!");
        trackEvent("User", "Google Login Success");
        navigate("/");
      }
    } catch (err) {
      showToast("Google Login failed. Please try again.", "error");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (ev) => {
    ev.preventDefault();
    if (!form.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email: form.email });
      if (res.data.success) {
        showToast("OTP sent to your email!");
        setMode("reset-password");
        setErrors({});
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send OTP", "error");
    }
    setLoading(false);
  };

  const handleResetPassword = async (ev) => {
    ev.preventDefault();
    const otpVal = otp.join("");
    if (otpVal.length !== 6) {
      showToast("Enter 6-digit OTP", "error");
      return;
    }
    if (form.password.length < 6) {
      setErrors({ password: "Password min 6 chars." });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password", {
        email: form.email,
        otp: otpVal,
        newPassword: form.password
      });
      if (res.data.success) {
        showToast("Password updated! Please login.");
        setMode("login");
        setOtp(new Array(6).fill(""));
        setForm(p => ({ ...p, password: "", confirmPassword: "" }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Reset failed", "error");
    }
    setLoading(false);
  };

  // --- Countdown Timer ---
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // autofocus first OTP input when entering OTP step
  useEffect(() => {
    if ((mode === "register" && step === 3) || mode === "reset-password") {
      setTimeout(() => otpBoxReference.current[0]?.focus(), 50);
    }
  }, [mode, step]);

  return (
    <div className="auth-root">
      <div className="container">
        <div className="flex-auth">
          {/* LEFT SIDE */}
          <div className="auth-left wow animate__animated animate__fadeInLeft">
            <h1 className="left-heading">Book My <span>Study Guide</span></h1>
            <p className="left-sub">Curated study guides, project templates and exam-focused notes.</p>
            <div className="left-actions">
              <button className={`pill ${mode === "login" ? "pill-active" : ""}`} onClick={() => { setMode("login"); setErrors({}); }}>Login</button>
              <button className={`pill ${mode === "register" ? "pill-active" : ""}`} onClick={() => { setMode("register"); setStep(1); setErrors({}); }}>Register</button>
              <Link to="/"><button className="btn-home">Go to Home</button></Link>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="auth-right wow animate__animated animate__fadeInRight">
            <div className="auth-box">
              <h2 className="auth-title">
                {mode === "login" ? "Login" :
                  mode === "register" ? "Register" :
                    mode === "forgot-password" ? "Forgot Password" :
                      "Reset Password"}
              </h2>

              {mode === "register" && <Stepper currentStep={step} totalSteps={3} />}

              {/* LOGIN FORM */}
              {mode === "login" && (
                <form onSubmit={handleLogin}>
                  <div className="google-btn-wrapper login-google-top">
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

                  <div className="form-group">
                    <label>Email or Phone Number</label>
                    <input
                      type="text"
                      placeholder="Enter email or 10-digit phone"
                      value={form.loginId}
                      onChange={e => setForm(p => ({ ...p, loginId: e.target.value }))}
                      className={errors.loginId ? "input-error" : ""}
                    />
                    {errors.loginId && <span className="error-text">{errors.loginId}</span>}
                  </div>

                  <div className="form-group">
                    <div className="label-row">
                      <label>Password</label>
                      <button type="button" onClick={() => setMode("forgot-password")} className="forgot-link">Forgot Password?</button>
                    </div>
                    <input
                      type="password"
                      value={form.loginPassword}
                      onChange={e => setForm(p => ({ ...p, loginPassword: e.target.value }))}
                      className={errors.loginPassword ? "input-error" : ""}
                    />
                    {errors.loginPassword && <span className="error-text">{errors.loginPassword}</span>}
                  </div>

                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === "forgot-password" && (
                <form onSubmit={handleForgotPassword}>
                  <p className="forgot-info">Enter your registered email address to receive a 6-digit OTP.</p>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className={errors.email ? "input-error" : ""}
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                  <div className="actions">
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                    <button type="button" onClick={() => setMode("login")} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              )}

              {/* RESET PASSWORD FORM */}
              {mode === "reset-password" && (
                <form onSubmit={handleResetPassword}>
                  <p className="reset-info">Enter the OTP sent to <b>{form.email}</b> and your new password.</p>

                  <div className="form-group">
                    <label>Enter OTP</label>
                    <div className="otp-row" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(reference) => (otpBoxReference.current[index] = reference)}
                          className="otp-input"
                          value={digit}
                          maxLength={1}
                          onChange={(e) => handleOtpChange(e.target.value, index)}
                          onKeyDown={(e) => handleOtpBackspace(e, index)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className={errors.password ? "input-error" : ""}
                    />
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      className={errors.confirmPassword ? "input-error" : ""}
                    />
                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                  </div>

                  <div className="actions">
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? "Updating..." : "Update Password"}
                    </button>
                    <button type="button" onClick={() => setMode("forgot-password")} className="btn-secondary">Change Email</button>
                  </div>
                </form>
              )}

              {/* REGISTER STEP 1 */}
              {mode === "register" && step === 1 && (
                <form onSubmit={handleStep1Submit}>
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      aria-invalid={errors.fullName ? "true" : "false"}
                    />
                    {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone</label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      inputMode="numeric"
                      value={form.phoneNumber}
                      maxLength={10}
                      onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      aria-invalid={errors.phoneNumber ? "true" : "false"}
                    />
                    {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
                  </div>

                  <div className="row-group">
                    <div className="form-group half">
                      <label htmlFor="course">Course</label>
                      <input id="course" name="course" type="text" value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))} />
                      {errors.course && <span className="error-text">{errors.course}</span>}
                    </div>
                    <div className="form-group half">
                      <label htmlFor="university">University</label>
                      <input id="university" name="university" type="text" value={form.university} onChange={e => setForm(p => ({ ...p, university: e.target.value }))} />
                      {errors.university && <span className="error-text">{errors.university}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input id="address" name="address" type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    {errors.address && <span className="error-text">{errors.address}</span>}
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" checked={form.termsAccepted} onChange={e => setForm(p => ({ ...p, termsAccepted: e.target.checked }))} />
                      I accept Terms & Conditions
                    </label>
                    {errors.termsAccepted && <span className="error-text d-block">{errors.termsAccepted}</span>}
                  </div>

                  <button className="btn-primary" type="submit">Next</button>
                </form>
              )}

              {/* REGISTER STEP 2 */}
              {mode === "register" && step === 2 && (
                <form onSubmit={handleStep2Submit}>
                  <div className="form-group">
                    <label htmlFor="regEmail">Email</label>
                    <input id="regEmail" name="regEmail" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} aria-invalid={errors.email ? "true" : "false"} />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="regPassword">Password</label>
                    <input id="regPassword" name="regPassword" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                  </div>

                  <div className="actions">
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </button>
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                  </div>
                </form>
              )}

              {/* REGISTER STEP 3 (OTP) */}
              {mode === "register" && step === 3 && (
                <form onSubmit={handleVerifyOtp}>
                  <label htmlFor="otp">Enter 6-Digit OTP</label>
                  <p className="otp-info">Sent to {form.email}</p>

                  <div className="otp-row" onPaste={handleOtpPaste} aria-label="OTP input">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        value={digit}
                        maxLength={1}
                        className="otp-input"
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpBackspace(e, index)}
                        ref={(reference) => (otpBoxReference.current[index] = reference)}
                        type="text"
                        inputMode="numeric"
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="actions">
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? "Verifying..." : "Verify & Finish"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCountdown > 0 || loading}
                      className="btn-secondary"
                    >
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
