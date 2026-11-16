import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  School,
  MapPin,
  CheckCircle,
  Package,
  ShoppingCart,
  Home,
  LogOut,
  ChevronRight,
  Edit2,
  Lock,
  Save,
  X,
  ShieldCheck,
  KeyRound
} from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../../context/logintrue";
import api from "../../../../api";
import "./profile.scss";

export default function Profile() {
  const { user, logout, loading, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    phoneno: "",
    course: "",
    university: "",
    address: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        phoneno: user.phoneno || "",
        course: user.course || "",
        university: user.university || "",
        address: user.address || ""
      });
    }
  }, [user]);

  if (loading) return null;

  if (!user) return <Navigate to="/auth" replace />;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "N/A";

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setBtnLoading(true);
    try {
      const res = await api.put("/api/auth/profile", editForm);
      if (res.data.success) {
        toast.success("Profile updated successfully!");
        await fetchProfile();
        setIsEditing(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setBtnLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    setBtnLoading(true);
    try {
      const res = await api.put("/api/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.data.success) {
        toast.success("Password changed successfully!");
        setIsChangingPassword(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container wow animate__animated animate__fadeIn">

        {/* Profile Card */}
        <div className="profile-main-card">
          <div className="profile-header">
            <div className="avatar-section">
              <div className="avatar">
                {user.name?.charAt(0)?.toUpperCase() || <User size={32} />}
              </div>
              <div className="profile-basic">
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-name-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Your Name"
                  />
                ) : (
                  <h2>{user.name}</h2>
                )}
                <div className="member-badge">
                  <CheckCircle size={12} />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <div className="header-actions">
              {!isEditing ? (
                <button type="button" className="edit-toggle-btn" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="edit-actions">
                  <button type="button" className="save-btn" onClick={handleUpdateProfile} disabled={btnLoading}>
                    <Save size={16} />
                    <span>{btnLoading ? "Saving..." : "Save"}</span>
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <button type="button" className="logout-btn" onClick={logout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="profile-info-grid">
            <Detail icon={<Mail size={20} />} label="Email Address" value={user.email} />

            {isEditing ? (
              <>
                <EditField
                  icon={<Phone size={20} />}
                  label="Phone Number"
                  value={editForm.phoneno}
                  onChange={(v) => setEditForm({ ...editForm, phoneno: v })}
                />
                <EditField
                  icon={<BookOpen size={20} />}
                  label="Enrollment/Course"
                  value={editForm.course}
                  onChange={(v) => setEditForm({ ...editForm, course: v })}
                />
                <EditField
                  icon={<School size={20} />}
                  label="University"
                  value={editForm.university}
                  onChange={(v) => setEditForm({ ...editForm, university: v })}
                />
                <EditField
                  icon={<MapPin size={20} />}
                  label="Shipping Address"
                  value={editForm.address}
                  onChange={(v) => setEditForm({ ...editForm, address: v })}
                />
              </>
            ) : (
              <>
                <Detail icon={<Phone size={20} />} label="Phone Number" value={user.phoneno} />
                <Detail icon={<BookOpen size={20} />} label="Enrollment/Course" value={user.course} />
                <Detail icon={<School size={20} />} label="University" value={user.university} />
                <Detail icon={<MapPin size={20} />} label="Shipping Address" value={user.address} />
              </>
            )}

            <Detail icon={<ShieldCheck size={20} />} label="Account Status" value={user.isVerified ? "Verified User" : "Pending Verification"} isStatus />
          </div>
        </div>

        {/* Password Section */}
        <div className="password-update-card">
          <div className="card-header" onClick={() => setIsChangingPassword(!isChangingPassword)}>
            <div className="header-left">
              <KeyRound size={22} className="header-icon" />
              <div>
                <h4>Security & Password</h4>
                <p>Ensure your account stays protected</p>
              </div>
            </div>
            <button className={`toggle-btn ${isChangingPassword ? 'active' : ''}`}>
              <ChevronRight size={20} />
            </button>
          </div>

          {isChangingPassword && (
            <form onSubmit={handleChangePassword} className="password-form-content animate__animated animate__fadeIn">
              <div className="form-grid">
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} />
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} />
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} />
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save-pwd" disabled={btnLoading}>
                  {btnLoading ? "Processing..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Actions */}
        <div className="profile-actions-section">
          <h3 className="section-title">Account Shortcuts</h3>
          <div className="actions-grid">
            <ActionCard
              title="My Orders"
              subtitle="Track your shipments"
              icon={<Package size={24} />}
              onClick={() => navigate("/myorder")}
            />
            <ActionCard
              title="My Cart"
              subtitle="View your selections"
              icon={<ShoppingCart size={24} />}
              onClick={() => navigate("/cart")}
            />
            <ActionCard
              title="Return Home"
              subtitle="Back to main dashboard"
              icon={<Home size={24} />}
              onClick={() => navigate("/")}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function Detail({ icon, label, value, isStatus }) {
  return (
    <div className={`info-item ${isStatus ? 'status-item' : ''}`}>
      <div className="info-icon">{icon}</div>
      <div className="info-content">
        <span className="info-label">{label}</span>
        <strong className="info-value">{value || "Not Provided"}</strong>
      </div>
    </div>
  );
}

function EditField({ icon, label, value, onChange }) {
  return (
    <div className="info-item editing">
      <div className="info-icon">{icon}</div>
      <div className="info-content">
        <span className="info-label">{label}</span>
        <input
          type="text"
          className="info-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ActionCard({ icon, title, subtitle, onClick }) {
  return (
    <button type="button" className="action-card-modern" onClick={onClick}>
      <div className="action-icon-wrapper">{icon}</div>
      <div className="action-details">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
      <div className="action-arrow">
        <ChevronRight size={18} />
      </div>
    </button>
  );
}
