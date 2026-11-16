import ReactGA from "react-ga4";

/**
 * Initialize GA4 with your Measurement ID
 * @param {string} measurementId - Your Google Analytics Measurement ID (e.g., G-XXXXXXX)
 */
export const initGA = (measurementId) => {
  if (measurementId) {
    ReactGA.initialize(measurementId);
    console.log("📊 GA4 Initialized");
  } else {
    console.warn("⚠️ GA4 Measurement ID missing. Tracking disabled.");
  }
};

/**
 * Track a page view
 * @param {string} path - The page path
 */
export const trackPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

/**
 * Track a custom event
 * @param {string} category - Event category (e.g., 'User', 'Cart')
 * @param {string} action - Event action (e.g., 'Clicked Search', 'Added to Cart')
 * @param {string} label - Optional label (e.g., 'Search Query', 'Product ID')
 * @param {number} value - Optional numeric value
 */
export const trackEvent = (category, action, label = "", value = 0) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

/**
 * Track a button click specifically
 * @param {string} buttonName - Name of the button clicked
 * @param {string} location - Where the button is located (e.g., 'Header', 'Footer', 'PDP')
 */
export const trackButtonClick = (buttonName, location) => {
  trackEvent("Interaction", "Button Click", `${buttonName} in ${location}`);
};

/**
 * Track a form submission
 * @param {string} formName - Name of the form (e.g., 'Contact', 'Checkout')
 */
export const trackFormSubmit = (formName) => {
  trackEvent("Form", "Submission", formName);
};

/**
 * Track a file download
 * @param {string} fileName - Name of the file being downloaded
 */
export const trackDownload = (fileName) => {
  trackEvent("Download", "File Download", fileName);
};
