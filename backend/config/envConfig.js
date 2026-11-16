/**
 * Centralized Environment Configuration
 * Consolidates all process.env accesses into a single, type-safe config object
 * with sensible fallbacks for robust runtime execution.
 * 
 * Update: Uses JS Getters to fetch real-time values from the DB Config Cache
 * powered by `configService.js` allowing dynamic Admin Panel adjustments.
 */

const { getConfig } = require("../utils/configService");

const baseConfig = {
    // App
    get port() { return getConfig("PORT", process.env.PORT || 5002); },
    get frontendUrl() { return getConfig("FRONTEND_URL", process.env.FRONTEND_URL || "http://localhost:3000"); },
    get nodeEnv() { return getConfig("NODE_ENV", process.env.NODE_ENV || "development"); },


    // Security
    get jwtSecret() { return getConfig("JWT_SECRET", process.env.JWT_SECRET || "your_super_secret_local_key"); },

    // Cloudflare R2
    r2: {
        get accessKeyId() { return getConfig("R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID); },
        get secretAccessKey() { return getConfig("R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY); },
        get endpoint() { return getConfig("R2_ENDPOINT", process.env.R2_ENDPOINT); },
        get bucketName() { return getConfig("R2_BUCKET_NAME", process.env.R2_BUCKET_NAME); },
        get publicUrl() { return getConfig("R2_PUBLIC_URL", process.env.R2_PUBLIC_URL); },
    },

    // Email (NodeMailer)
    email: {
        get user() { return getConfig("EMAIL_USER", process.env.EMAIL_USER); },
        get pass() { return getConfig("EMAIL_PASS", process.env.EMAIL_PASS); }, // App password
        get contactReceiver() { return getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "premkavathiya35@gmail.com"); },
    },

    // Shiprocket
    shiprocket: {
        get email() { return getConfig("SHIPROCKET_EMAIL", process.env.SHIPROCKET_EMAIL); },
        get password() { return getConfig("SHIPROCKET_PASSWORD", process.env.SHIPROCKET_PASSWORD); },
        get pickupPincode() { return getConfig("SHIPROCKET_PICKUP_PINCODE", process.env.SHIPROCKET_PICKUP_PINCODE || "394101"); },
    }
};

// Trap attempts to access undefined properties (e.g. `config.MY_NEW_KEY`) 
// and seamlessly fetch them from the Admin Panel Cache dynamically. 
const configProxy = new Proxy(baseConfig, {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }

        // Handle symbol properties (like console.log inspectors) gracefully
        if (typeof prop === 'symbol' || prop === "then" || prop === "catch" || prop === "finally") {
            return undefined;
        }

        // Auto-fallback mapping for arbitrary custom EnvSettings keys 
        return getConfig(prop, process.env[prop]);
    }
});

module.exports = configProxy;
