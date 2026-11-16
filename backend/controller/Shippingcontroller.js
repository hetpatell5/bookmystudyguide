const shiprocketService = require("../services/shiprocketService");
const { Order, OrderItem, EmailTemplate } = require("../model/mysql");
const configEnv = require("../config/envConfig");
const sendMail = require("../utils/sendMail");
const { getConfig } = require("../utils/configService");

const shippingController = {
  // ============================================================
  // SHIPROCKET ENDPOINTS
  // ============================================================

  // STEP 1: Push Order to Shiprocket
  createShiprocketOrder: async (req, res) => {
    try {
      const { orderId, length, width, height, weight } = req.body;
      const order = await Order.findByPk(orderId, { include: [OrderItem] });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (order.shiprocketShipmentId) {
        return res.status(400).json({ success: false, message: "Order already sent to Shiprocket" });
      }

      // Update dimensions before pushing
      if (length) order.shippingLength = length;
      if (width) order.shippingWidth = width;
      if (height) order.shippingHeight = height;
      if (weight) order.shippingWeight = weight;
      await order.save();

      const response = await shiprocketService.createOrder(order);

      order.shiprocketOrderId = response.order_id;
      order.shiprocketShipmentId = response.shipment_id;
      order.shippingProvider = "shiprocket";
      order.status = "Processing";
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order pushed to Shiprocket successfully!",
        data: { orderId: response.order_id, shipmentId: response.shipment_id },
      });
    } catch (error) {
      console.error("Create Shiprocket Order Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // STEP 2: Get Available Couriers
  getShiprocketCouriers: async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findByPk(orderId, {
        include: [OrderItem]
      });

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      const validItems = order.OrderItems.filter((p) => p.isHardCopy !== false);
      const totalWeight = validItems.reduce(
        (sum, item) => sum + (item.quantity * (item.weight || 0.4)),
        0,
      ) || 0.5;

      const PICKUP_PINCODE = configEnv.shiprocket.pickupPincode;

      const couriers = await shiprocketService.getCouriersForOrder(
        PICKUP_PINCODE,
        order.pincode,
        totalWeight,
        order.paymentMode === "half_online",
      );

      res.status(200).json({ success: true, couriers });
    } catch (error) {
      console.error("Get Couriers Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // STEP 3: Generate AWB & Schedule Pickup
  scheduleShiprocketPickup: async (req, res) => {
    try {
      const { orderId, courierId } = req.body;
      const order = await Order.findByPk(orderId);

      if (!order || !order.shiprocketShipmentId) {
        return res.status(400).json({
          success: false,
          message: "Order not pushed to Shiprocket yet",
        });
      }

      // Generate AWB
      const awbResponse = await shiprocketService.generateAWB(
        order.shiprocketShipmentId,
        courierId,
      );

      if (awbResponse.awb_assign_status !== 1) {
        throw new Error(awbResponse.response?.data?.message || "AWB generation failed");
      }

      const awbCode = awbResponse.response?.data?.awb_code;
      const courierName = awbResponse.response?.data?.courier_name;

      if (!awbCode) {
        throw new Error("Shiprocket generated AWB but returned no AWB code");
      }

      // Update Order with AWB details FIRST (in case pickup fails/already exists)
      order.awbCode = awbCode;
      order.courierName = courierName || "Shiprocket Courier";
      order.status = "Shipped";
      await order.save();

      // Schedule Pickup (Now handles "Already in Pickup Queue" internally)
      await shiprocketService.schedulePickup(order.shiprocketShipmentId);

      res.status(200).json({
        success: true,
        message: "AWB Generated and Pickup Scheduled!",
        data: {
          awb: order.awbCode,
          courier: order.courierName,
        },
      });

      /* ---------- SEND SHIPPED EMAIL ---------- */
      try {
        const template = await EmailTemplate.findOne({ where: { type: "ORDER_SHIPPED", isActive: true } });
        if (template && order.email) {
          const trackingUrl = `${configEnv.frontendUrl}/track-order?awb=${encodeURIComponent(order.awbCode || "")}&orderId=${encodeURIComponent(order.orderId || "")}`;
          const html = template.htmlContent
            .replace(/{{name}}/g, order.customerName || "Customer")
            .replace(/{{orderId}}/g, order.orderId)
            .replace(/{{awbCode}}/g, order.awbCode)
            .replace(/{{courierName}}/g, order.courierName)
            .replace(/{{trackingUrl}}/g, trackingUrl);
          const subject = template.subject
            .replace(/{{name}}/g, order.customerName || "Customer")
            .replace(/{{orderId}}/g, order.orderId)
            .replace(/{{awbCode}}/g, order.awbCode)
            .replace(/{{courierName}}/g, order.courierName);

          await sendMail({
            to: order.email,
            subject,
            html,
          });
        }
      } catch (mailErr) {
        console.error("❌ Shipped Email Failed:", mailErr.message);
      }
    } catch (error) {
      console.error("Schedule Pickup Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Download Label
  downloadShiprocketLabel: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findByPk(orderId);

      if (!order || !order.shiprocketShipmentId) {
        return res
          .status(400)
          .json({ success: false, message: "Shipment not found" });
      }

      const labelUrl = await shiprocketService.generateLabel(
        order.shiprocketShipmentId,
      );

      res.status(200).json({ success: true, labelUrl });
    } catch (error) {
      console.error("Download Label Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Download Invoice
  downloadShiprocketInvoice: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findByPk(orderId);

      if (!order || !order.shiprocketOrderId) {
        return res
          .status(400)
          .json({ success: false, message: "Order not found" });
      }

      const invoiceUrl = await shiprocketService.generateInvoice(
        order.shiprocketOrderId,
      );

      res.status(200).json({ success: true, invoiceUrl });
    } catch (error) {
      console.error("Download Invoice Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Download Manifest
  downloadShiprocketManifest: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findByPk(orderId);

      if (!order || !order.shiprocketShipmentId) {
        return res
          .status(400)
          .json({ success: false, message: "Shipment not found" });
      }

      const manifestUrl = await shiprocketService.generateManifest(
        order.shiprocketShipmentId,
      );

      res.status(200).json({ success: true, manifestUrl });
    } catch (error) {
      console.error("Download Manifest Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Track Shipment
  trackShiprocketShipment: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findByPk(orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      let tracking;
      if (order.shiprocketShipmentId) {
        tracking = await shiprocketService.trackShipment(order.shiprocketShipmentId);
      } else if (order.awbCode) {
        tracking = await shiprocketService.trackByAWB(order.awbCode);
      } else {
        return res.status(400).json({ success: false, message: "No tracking information available" });
      }

      if (tracking && tracking.tracking_data && tracking.tracking_data.track_status) {
        const newStatus = tracking.tracking_data.track_status;
        if (order.status !== newStatus && newStatus !== "Canceled") {
          order.status = newStatus;
          await order.save();
          console.log(`📊 Order ${order.orderId} status synced to: ${newStatus}`);
        }
      }

      res.status(200).json({ success: true, data: tracking });
    } catch (error) {
      console.error("Track Shipment Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ESTIMATE: Average Shiprocket rate for a pincode (used at checkout before order is placed)
  estimateShipping: async (req, res) => {
    try {
      const { pincode, weight } = req.query;
      if (!pincode || String(pincode).length !== 6) {
        return res.status(400).json({ success: false, message: "Valid 6-digit pincode required" });
      }

      // Use pickup pincode from config, but fall back to primary pickup location from Shiprocket
      let pickupPincode = configEnv.shiprocket.pickupPincode;
      const configuredPincode = await getConfig("SHIPROCKET_PICKUP_PINCODE");
      if (!configuredPincode) {
        const locations = await shiprocketService.getPickupLocations();
        if (locations.length > 0) {
          const primary = locations.find(l => l.is_primary_location === 1) || locations[0];
          pickupPincode = primary.pin_code || primary.pincode || pickupPincode;
        }
      }

      console.log(`📦 Shipping estimate: ${pickupPincode} → ${pincode}`);

      const couriers = await shiprocketService.getCouriersForOrder(
        pickupPincode,
        pincode,
        Number(weight) || 0.5,
        false,
      );

      if (!couriers.length) {
        console.log(`⚠️ No couriers found for ${pickupPincode} → ${pincode}`);
        return res.json({ success: true, avgRate: null, couriers: 0 });
      }

      const total = couriers.reduce((sum, c) => sum + Number(c.rate || 0), 0);
      const avgRate = Math.round(total / couriers.length);

      console.log(`✅ Estimate: ${couriers.length} couriers, avg ₹${avgRate}`);
      res.json({ success: true, avgRate, couriers: couriers.length });
    } catch (error) {
      console.error("Estimate Shipping Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Cancel Shipment
  cancelShiprocketShipment: async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findByPk(orderId);

      if (!order || !order.shiprocketOrderId) {
        return res
          .status(400)
          .json({ success: false, message: "Order not found in Shiprocket" });
      }

      await shiprocketService.cancelShipment(order.shiprocketOrderId);

      order.status = "Pending";
      order.shiprocketOrderId = null;
      order.shiprocketShipmentId = null;
      order.shippingProvider = null;
      order.courierName = null;
      order.awbCode = null;
      await order.save();

      res
        .status(200)
        .json({ success: true, message: "Shipment cancelled successfully" });
    } catch (error) {
      console.error("Cancel Shipment Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

};

module.exports = shippingController;
