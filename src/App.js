import React, { useEffect } from "react";
import { ToastContainer, Zoom } from "react-toastify";
import { WOW } from "wowjs";
import "react-toastify/dist/ReactToastify.css";
import "./App.scss";
import { BrowserRouter as Router } from "react-router-dom";
import AppProviders from "./context/AppProviders";
import Routing from "./routing/routing";
import ScrollToTop from "./components/utils/ScrollToTop";
import ScrollToTopButton from "./components/top/ScrollToTopButton";
import WhatsAppButton from "./user/components/utils/WhatsAppButton";
import LoginModal from "./user/components/LoginModal/LoginModal";
import CustomizeExperienceModal from "./user/components/customize/CustomizeExperienceModal";
import { setupGlobalValidation } from "./utils/inputValidation";

export default function App() {

  useEffect(() => {
    new WOW({
      live: true,
      offset: 100,
    }).init();
  }, []);

  // Global Validation Setup
  useEffect(() => {
    const cleanupValidation = setupGlobalValidation();
    return () => { cleanupValidation(); };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <AppProviders>
        <Routing />
        <ScrollToTopButton />
        <WhatsAppButton />
        <LoginModal />
        <CustomizeExperienceModal />
      </AppProviders>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        limit={3}
        hideProgressBar={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Zoom}
      />
    </Router>
  );
}

