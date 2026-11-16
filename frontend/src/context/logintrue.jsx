import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Global Login Modal State
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  async function fetchProfile() {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/api/auth/me");

      if (res.data.success && res.data.user) {
        setIsLoggedIn(true);
        setUser(res.data.user);
        setUserId(res.data.user._id || res.data.user.id);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      logout();
      setLoginModalOpen(true);
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  const login = (payload) => {
    if (payload.token) {
      sessionStorage.setItem("token", payload.token);
    }

    const finalUser = payload.user || payload;

    setIsLoggedIn(true);
    setUser(finalUser);
    setUserId(finalUser._id || finalUser.id);
    
    // Execute and clear any pending action after login
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setIsLoggedIn(false);
    setUser(null);
    setUserId(null);
  };

  const requireLogin = (callback) => {
    if (isLoggedIn) {
      callback();
    } else {
      setPendingAction(() => callback);
      setLoginModalOpen(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        isLoggedIn, user, userId, login, logout, loading, fetchProfile,
        isLoginModalOpen, setLoginModalOpen, requireLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
