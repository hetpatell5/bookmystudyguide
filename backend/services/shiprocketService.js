// services/shiprocketService.js
const axios = require("axios");
const configEnv = require("../config/envConfig");
const { redis, isRedisAvailable } = require("../utils/redis");

const SHIPROCKET_TOKEN_KEY = "shiprocket:token";
const TOKEN_TTL_SECONDS = 8 * 24 * 60 * 60; // 8 days (safe buffer before 10-day Shiprocket expiry)

// In-memory fallback for when Redis is unavailable
let memToken = null;
let memTokenExpiry = null;

const shiprocketService = {
  // ============================================================
  // 1. SMART AUTHENTICATION (Redis-backed, cluster-safe)
  // ============================================================
  getToken: async () => {
    try {
      // 1a. Try Redis first (shared across all PM2 workers)
      if (isRedisAvailable()) {
        const cached = await redis.get(SHIPROCKET_TOKEN_KEY);
        if (cached) {
          return cached;
        }
      } else {
        // 1b. Fall back to in-memory if Redis is down
        const now = new Date();
        if (memToken && memTokenExpiry && memTokenExpiry - now > 30 * 60 * 1000) {
          return memToken;
        }
      }

      console.log("🔄 Generating new Shiprocket Token...");

      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/auth/login",
        {
          email: configEnv.shiprocket.email,
          password: configEnv.shiprocket.password,
        },
      );

      const token = response.data.token;

      // Store in Redis (shared, cluster-safe)
      if (isRedisAvailable()) {
        await redis.set(SHIPROCKET_TOKEN_KEY, token, "EX", TOKEN_TTL_SECONDS);
      } else {
        // Fallback: store in memory
        memToken = token;
        memTokenExpiry = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
      }

      console.log("✅ Shiprocket token generated and cached.");
      return token;
    } catch (error) {
      console.error(
        "❌ Shiprocket Auth Error:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to authenticate with Shiprocket");
    }
  },

  /**
   * Invalidates the cached token (call this on 401 from Shiprocket API).
   */
  invalidateToken: async () => {
    if (isRedisAvailable()) {
      await redis.del(SHIPROCKET_TOKEN_KEY);
    }
    memToken = null;
    memTokenExpiry = null;
    console.log("🔄 Shiprocket token invalidated — will re-auth on next call.");
  },

  // ============================================================
  // 2. CREATE ORDER (Push to Shiprocket)
  // ============================================================
  // ============================================================
  // HELPER: Get pickup locations from Shiprocket
  // ============================================================
  getPickupLocations: async () => {
    try {
      const token = await shiprocketService.getToken();
      const response = await axios.get(
        "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const locations = response.data?.data?.shipping_address || [];
      console.log("📍 Available Pickup Locations:", locations.map(l => l.pickup_location).join(", "));
      return locations;
    } catch (err) {
      console.error("❌ Failed to fetch pickup locations:", err.message);
      return [];
    }
  },

  createOrder: async (dbOrder) => {
    try {
      const token = await shiprocketService.getToken();

      const orderDate = new Date(dbOrder.createdAt).toISOString().split("T")[0];

      // Filter physical items only
      const allItems = dbOrder.OrderItems || dbOrder.products || [];
      const validItems = allItems.filter((p) => p.isHardCopy !== false);
      if (!validItems.length) throw new Error("No physical items to ship.");

      // Calculate total weight and dimensions
      const totalWeight = dbOrder.shippingWeight || validItems.reduce(
        (sum, item) => sum + (item.quantity * (item.weight || 0.4)),
        0,
      );

      // Full item total (actual product cost)
      const fullItemTotal = validItems.reduce(
        (sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0
      ) || Number(dbOrder.amount || 0);

      // For half_online: sub_total = only the COD due half.
      // Sending the full amount makes Shiprocket's courier try to collect the ENTIRE bill.
      // For offline/prepaid: send the real item total.
      const isHalfOnline = dbOrder.paymentMode === "half_online";
      const isCOD = isHalfOnline || dbOrder.paymentMode === "offline";
      const collectibleAmount = isCOD ? Number(dbOrder.dueAmount || 0) : 0;
      const shiprocketSubTotal = isHalfOnline ? collectibleAmount : fullItemTotal;

      // Use admin-configured pickup location, fall back to auto-detect from Shiprocket
      const { getConfig } = require("../utils/configService");
      const configuredLocation = getConfig("SHIPROCKET_PICKUP_LOCATION");
      let pickupLocationName = configuredLocation || "Primary";

      if (!configuredLocation) {
        const pickupLocations = await shiprocketService.getPickupLocations();
        if (pickupLocations.length > 0) {
          const primaryLoc = pickupLocations.find(l => l.is_primary_location === 1) || pickupLocations[0];
          pickupLocationName = primaryLoc.pickup_location;
        }
      }
      console.log("✅ Using pickup location:", pickupLocationName);

      // Use a unique order_id (append short timestamp to prevent duplicates on retry)
      const uniqueOrderId = `${dbOrder.orderId || dbOrder._id.toString()}-${Date.now().toString().slice(-4)}`;

      const payload = {
        order_id: uniqueOrderId,
        order_date: orderDate,
        pickup_location: pickupLocationName,
        channel_id: "",
        comment: `Order from Website - ${dbOrder.orderId}`,
        billing_customer_name: dbOrder.customerName.split(" ")[0] || "Customer",
        billing_last_name:
          dbOrder.customerName.split(" ").slice(1).join(" ") || "Name",
        billing_address: dbOrder.street || dbOrder.address?.street || dbOrder.address?.fullAddress || "",
        billing_city: dbOrder.city || dbOrder.address?.city || "",
        billing_pincode: dbOrder.pincode || dbOrder.address?.pincode || "",
        billing_state: dbOrder.state || dbOrder.address?.state || "",
        billing_country: "India",
        billing_email: dbOrder.email,
        billing_phone: dbOrder.phone,
        shipping_is_billing: true,
        order_items: validItems.map((item, idx) => ({
          name: item.title || item.name || `Product ${idx + 1}`,
          sku: item.sku || `BMSG-${item.productId || Date.now()}-${idx}`,
          units: item.quantity || 1,
          selling_price: item.price || 0,
          discount: 0,
          tax: 0,
          hsn: 490199,
        })),
        payment_method: isCOD ? "COD" : "Prepaid",
        collectible_amount: collectibleAmount,  // courier collects ONLY the due half for half_online
        sub_total: shiprocketSubTotal,           // = dueAmount for half_online, full total for others
        shipping_charges: 0,                     // we already collected shipping from buyer — do not add again
        length: dbOrder.shippingLength || 25,
        breadth: dbOrder.shippingWidth || 20,
        height: dbOrder.shippingHeight || 5,
        weight: totalWeight,
      };

      console.log("📦 Creating Shiprocket Order:", payload.order_id);
      console.log(`📋 Pickup: ${pickupLocationName} | mode: ${dbOrder.paymentMode} | sub_total: ₹${shiprocketSubTotal} | collectible: ₹${collectibleAmount} | weight: ${totalWeight}kg`);

      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Validate response — Shiprocket can return 200 with error message
      if (!response.data?.order_id && !response.data?.shipment_id) {
        console.error("⚠️ Shiprocket returned 200 but no order_id/shipment_id:", response.data?.message);
        throw new Error(response.data?.message || "Shiprocket order creation failed — no order_id returned");
      }

      console.log("✅ Order created:", response.data.order_id, "| Shipment:", response.data.shipment_id);
      return response.data;
    } catch (err) {
      // Log the ACTUAL Shiprocket validation errors
      if (err.response?.data) {
        console.error("❌ Shiprocket API Error:", JSON.stringify(err.response.data, null, 2));
      } else {
        console.error("❌ Shiprocket Error:", err.message);
      }
      throw new Error(
        err.response?.data?.message ||
        (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : err.message)
      );
    }
  },


  // ============================================================
  // 3. FETCH COURIERS (For Selection)
  // ============================================================
  getCouriersForOrder: async (pickupPincode, deliveryPincode, weight, cod) => {
    const token = await shiprocketService.getToken();

    console.log("🔍 Fetching couriers for:", {
      pickupPincode,
      deliveryPincode,
      weight,
      cod,
    });

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
      {
        params: {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          weight: weight,
          cod: cod ? 1 : 0,
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const available = response.data?.data?.available_courier_companies || [];
    const couriers = available.map((c) => ({
      courier_id: c.courier_company_id,
      name: c.courier_name,
      rate: c.rate,
      rating: c.rating,
      etd: c.etd,
      estimated_delivery_days: c.estimated_delivery_days,
      mode: c.mode,
      is_surface: c.is_surface,
      is_hyperlocal: c.is_hyperlocal,
    }));

    console.log(`✅ Found ${couriers.length} available couriers`);
    return couriers;
  },

  // ============================================================
  // 4. GENERATE AWB & SCHEDULE PICKUP
  // ============================================================
  generateAWB: async (shipmentId, courierId) => {
    try {
      const token = await shiprocketService.getToken();

      console.log("🎫 Generating AWB for shipment:", shipmentId);

      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
        { shipment_id: shipmentId, courier_id: courierId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ AWB Generated:", response.data);
      return response.data;
    } catch (err) {
      console.error("❌ AWB Generation Error:", err.response?.data || err.message);
      throw new Error(err.response?.data?.message || "AWB generation failed");
    }
  },

  // ============================================================
  // 5. SCHEDULE PICKUP
  // ============================================================
  schedulePickup: async (shipmentId) => {
    try {
      const token = await shiprocketService.getToken();

      console.log("🚚 Scheduling pickup for shipment:", shipmentId);

      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
        {
          shipment_id: [shipmentId],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("✅ Pickup Scheduled:", response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.toLowerCase().includes("already in pickup queue")) {
        console.log("⚠️ Pickup already scheduled for:", shipmentId);
        return { success: true, message: "Already in Pickup Queue" };
      }
      console.error("❌ Schedule Pickup Error:", err.response?.data || err.message);
      throw new Error(msg || err.message);
    }
  },

  // ============================================================
  // 6. DOWNLOAD LABEL/INVOICE
  // ============================================================
  generateLabel: async (shipmentIds) => {
    const token = await shiprocketService.getToken();

    console.log("🏷️ Generating label for:", shipmentIds);

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/generate/label",
      {
        shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data.label_url;
  },

  generateInvoice: async (orderIds) => {
    const token = await shiprocketService.getToken();

    console.log("📄 Generating invoice for:", orderIds);

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/print/invoice",
      {
        ids: Array.isArray(orderIds) ? orderIds : [orderIds],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data.invoice_url;
  },

  generateManifest: async (shipmentIds) => {
    const token = await shiprocketService.getToken();

    console.log("📋 Generating manifest for:", shipmentIds);

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/manifests/generate",
      {
        shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data.manifest_url;
  },

  // ============================================================
  // 7. TRACK SHIPMENT
  // ============================================================
  trackShipment: async (shipmentId) => {
    const token = await shiprocketService.getToken();

    console.log("📍 Tracking shipment:", shipmentId);

    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data;
  },

  trackByAWB: async (awbCode) => {
    const token = await shiprocketService.getToken();

    console.log("📍 Tracking by AWB:", awbCode);

    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awbCode}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data;
  },

  // ============================================================
  // 8. CANCEL SHIPMENT
  // ============================================================
  cancelShipment: async (orderIds) => {
    const token = await shiprocketService.getToken();

    console.log("❌ Cancelling shipment:", orderIds);

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/cancel",
      {
        ids: Array.isArray(orderIds) ? orderIds : [orderIds],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data;
  },
};

module.exports = shiprocketService;
