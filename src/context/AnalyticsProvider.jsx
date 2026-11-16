import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageView } from "../utils/analytics";
import { useSiteConfig } from "./SiteConfigContext";

/**
 * AnalyticsProvider component to initialize GA4 and track route changes.
 * This should be placed inside the <Router> but outside of <Routing />.
 */
const AnalyticsProvider = ({ children }) => {
  const location = useLocation();
  const { config } = useSiteConfig();
  const measurementId = config.GOOGLE_ANALYTICS_ID;

  useEffect(() => {
    // Initialize GA4 once on mount or when measurementId changes
    if (measurementId) {
      initGA(measurementId);
    }
  }, [measurementId]);

  useEffect(() => {
    // Track page view on every route change
    if (measurementId) {
      trackPageView(location.pathname + location.search);
    }
  }, [location, measurementId]);

  return <>{children}</>;
};

export default AnalyticsProvider;
