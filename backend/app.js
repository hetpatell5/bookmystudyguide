const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const crypto = require("crypto");

const app = express();

// Trust proxy for production (Nginx)
app.set("trust proxy", 1);

// ── Request ID ─────────────────────────────────────────────────────────
// Attach a unique UUID to every request for production log tracing.
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});


/* =========================
   MIDDLEWARES
========================= */

const envConfig = require("./config/envConfig");
const r2Host = (envConfig.r2?.publicUrl || "").replace(/^https?:\/\//, "").split("/")[0];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google-analytics.com", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Removed wildcard "*" — only allow self, data URIs, and the known R2 CDN host
      imgSrc: ["'self'", "data:", "blob:", "https://www.transparenttextures.com", r2Host ? `https://${r2Host}` : ""].filter(Boolean),
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lrb-api.shiprocket.in"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://tds.razorpay.com"]
    }
  },
  // HSTS: tell browsers to use HTTPS for 1 year
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

if (process.env.NODE_ENV !== 'production') {
  morgan.token('body', (req) => {
    const body = { ...req.body };
    ['password', 'token', 'otp', 'newPassword', 'razorpay_signature', 'email'].forEach(k => { if (body[k]) body[k] = '***'; });
    return JSON.stringify(body);
  });
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));
} else {
  app.use(morgan('combined'));
}


app.use(
  cors({
    origin: [
      "https://www.bookmystudyguide.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://bookmystudyguide.com",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }),
);

// Default body limit is 1MB; upload routes override with 50MB
app.use((req, res, next) => {
  const isUpload = req.path.startsWith('/api/upload') || req.path.startsWith('/api/products') || req.path.startsWith('/api/admin');
  const limit = isUpload ? '50mb' : '1mb';
  express.json({ limit })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Ensure uploads directory exists
const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

const path = require("path");
// Static files with Cache-Control
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  setHeaders: (res, path) => {
    res.set("Access-Control-Allow-Origin", "*"); // Allow cross-origin access
  }
}));

/* =========================
   ROUTES
========================= */
// Catalog
app.use("/api/books", require("./routes/books"));
app.use("/api/mainDegrees", require("./routes/mainDegrees"));
app.use("/api/subDegrees", require("./routes/subDegrees"));
app.use("/api/subjects", require("./routes/subjects"));
app.use("/api/years", require("./routes/yearRoutes"));
app.use("/api/semesters", require("./routes/semesterRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/languages", require("./routes/languageRoutes"));

// Auth & Users
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

// Products & Cart
app.use("/api/products", require("./routes/products"));
app.use("/api/admin/combo-products", require("./routes/comboProductRoutes"));
app.use("/api/synopsis", require("./routes/synopsisRoutes"));

// Admin
app.use("/api/admin/analytics", require("./routes/analyticsRoutes"));
app.use("/api/admin/storage", require("./routes/storageRoutes"));
app.use("/api/admin", require("./routes/softCopyRoutes"));
app.use("/api/admin/backups", require("./routes/backupRoutes"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/admin", require("./routes/orderEmailTemplateRoutes"));

// Cart & others
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/payment", require("./routes/payment"));

// Shipping (Shiprocket Only)
app.use("/api/shipping", require("./routes/shippingRoutes"));

// Other
app.use("/api/config", require("./routes/configRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/advertisements", require("./routes/advertisements"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/blogs", require("./routes/blog.routes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api", require("./routes/chatbotRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/faqs", require("./routes/faqRoutes"));
app.use("/api/newsletter", require("./routes/newsletter"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/ignou-cards", require("./routes/ignouCardRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/featured-sections", require("./routes/featuredSectionRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/excel", require("./routes/excelRoutes"));

// Inquiry Forms (Assignment + Project/Practical)
app.use("/api/assignment-inquiries", require("./routes/assignmentInquiryRoutes"));
app.use("/api/project-inquiries", require("./routes/projectInquiryRoutes"));

// SEO & Public Files (Internal Redirects to SEO Route)
const seoRoutes = require("./routes/seoRoutes");
app.use("/", seoRoutes); // Handles /robots.txt and /sitemap.xml

/* =========================
   HEALTH + ERRORS
========================= */
app.get("/", (_, res) => res.send("🚀 API Running"));

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }),
);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const requestId = req.requestId || "N/A";

  console.error(`[${new Date().toISOString()}] ❌ Error ${statusCode}: ${message} | RequestId: ${requestId}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
