const router = require("express").Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/auth");
const { paymentLimiter } = require("../middleware/rateLimiter");

const { Order, OrderItem, Product, Language, ComboProduct, EmailTemplate, Cart, Coupon, User, Project, SoftCopy, Synopsis, ProductLink, sequelize } = require("../model/mysql");
const { Op } = require("sequelize");
const sendMail = require("../utils/sendMail");
const { generateInvoiceBuffer } = require("../services/invoiceService");

/* ======================================================
   CONFIG SERVICE (SAFE)
====================================================== */
const configService = require("../utils/configService");
const getConfig = configService.getConfig || configService.default?.getConfig;

if (!getConfig) {
  throw new Error("getConfig not found – check configService export");
}

/* Escape user-controlled strings before inserting into HTML email templates */
function escHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ======================================================
   CREATE RAZORPAY INSTANCE
====================================================== */
async function getRazorpayInstance() {
  const key_id = await getConfig("RAZORPAY_KEY_ID");
  const key_secret = await getConfig("RAZORPAY_KEY_SECRET");

  if (!key_id || !key_secret) {
    throw new Error("Razorpay keys missing in backend config");
  }

  return new Razorpay({ key_id, key_secret });
}

/* ======================================================
   1️⃣ CREATE RAZORPAY ORDER
====================================================== */
router.post("/orders", auth, paymentLimiter, async (req, res) => {
  try {
    const { amount } = req.body;

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 500000) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const razorpay = await getRazorpayInstance();

    const options = {
      amount: Math.round(numAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("❌ Create Razorpay Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
  }
});

/* ======================================================
   2️⃣ VERIFY PAYMENT + SAVE ORDER + SEND EMAIL
====================================================== */
router.post("/verify", auth, paymentLimiter, async (req, res) => {
  console.log("🔔 Incoming Payment Verification Request at /api/payment/verify");
  const t = await sequelize.transaction();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      products,
      orderId,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMode,
      serviceFee,
      shippingCost,
      couponCode,
      discountAmount,
      address,
      customerName,
      email,
      phone,
    } = req.body;

    const razorpaySecret = await getConfig("RAZORPAY_KEY_SECRET");

    if (!razorpaySecret) {
      console.error("❌ RAZORPAY_KEY_SECRET is missing from config!");
      await t.rollback();
      return res.status(500).json({ success: false, message: "Payment config error" });
    }

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac("sha256", razorpaySecret).update(sign).digest("hex");

    console.log(`🔐 Signature check — order_id: ${razorpay_order_id}, payment_id: ${razorpay_payment_id}`);
    console.log(`   Secret prefix: ${razorpaySecret?.substring(0, 8)}... (len=${razorpaySecret?.length})`);
    console.log(`   Expected: ${expectedSignature}`);
    console.log(`   Received: ${razorpay_signature}`);

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Signature mismatch! Check RAZORPAY_KEY_SECRET in DB config.");
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    // Re-verify the Razorpay order amount against what was actually charged now
    // (paidAmount for partial/half-online payments, totalAmount for full payments)
    try {
      const razorpay = await getRazorpayInstance();
      const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
      const rzpAmountInRupees = Number(rzpOrder.amount) / 100;
      const clientPaidNow = Number(paidAmount) > 0 ? Number(paidAmount) : Number(totalAmount);
      console.log(`💰 Amount check — Razorpay: ₹${rzpAmountInRupees}, Client paidNow: ₹${clientPaidNow}, totalAmount: ₹${totalAmount}`);
      // Allow 1 rupee tolerance for rounding
      if (Math.abs(rzpAmountInRupees - clientPaidNow) > 1) {
        await t.rollback();
        console.error(`❌ Amount mismatch: Razorpay=${rzpAmountInRupees}, Client=${clientPaidNow}`);
        return res.status(400).json({ success: false, message: "Payment amount mismatch" });
      }
    } catch (rzpErr) {
      console.warn("⚠️ Could not fetch Razorpay order for validation:", rzpErr.message);
    }

    const paymentStatus = dueAmount && Number(dueAmount) > 0 ? "Partial" : "Paid";

    // Flatten address
    let street = "", city = "", state = "", pincode = null;
    if (typeof address === 'object') {
      street = address.street || address.fullAddress || "";
      city = address.city || "";
      state = address.state || "";
      pincode = address.pincode || null;
    }

    const newOrder = await Order.create({
      userId,
      amount: Number(totalAmount),
      paidAmount: Number(paidAmount) || 0,
      dueAmount: Number(dueAmount) || 0,
      paymentMode: paymentMode || "full_online",
      serviceFee: Number(serviceFee) || 0,
      shippingCost: Number(shippingCost) || 0,
      paymentStatus,
      street, city, state, pincode,
      paymentId: razorpay_payment_id,
      orderId: orderId || razorpay_order_id,
      razorpayOrderId: razorpay_order_id,
      status: "Pending",
      customerName,
      email,
      phone,
    }, { transaction: t });

    // Save OrderItems and Update Inventory
    if (products && Array.isArray(products)) {
      for (const item of products) {
        const qty = Number(item.quantity) || 1;
        const resolvedProductId = item.productId || item._id || item.id;

        const incomingSku = item.sku && item.sku !== "NO-SKU" ? item.sku : null;
        let sku = null;
        let dbLanguage = null; // product's own language from DB
        try {
          const dbProduct = await Product.findByPk(resolvedProductId, {
            attributes: ['sku', 'stock', 'isHardCopy', 'language'],
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          // Stock check removed based on request: We operate on unlimited stock / print-on-demand.
          // Orders will NEVER be blocked for stock reasons.
          const isHard = item.isHardCopy !== false && !String(item.type || "").toLowerCase().includes("soft");
          if (dbProduct && isHard && dbProduct.stock !== null && dbProduct.stock !== undefined && Number(dbProduct.stock) > 0) {
            // Just decrement stock for tracking purposes, but never block the order
            await Product.decrement('stock', { by: qty, where: { id: resolvedProductId }, transaction: t });
          }

          sku = dbProduct?.sku || incomingSku || null;
          dbLanguage = dbProduct?.language || null;
        } catch (_) {}
        if (!sku) sku = incomingSku;

        // Client-sent language wins; fall back to the product's own language from DB
        const resolvedLanguage = item.language || dbLanguage || null;

        if (sku && resolvedLanguage) {
          const langSuffix = `-${resolvedLanguage.toUpperCase()}`;
          if (!sku.toUpperCase().endsWith(langSuffix)) {
            sku = `${sku}-${resolvedLanguage.toUpperCase()}`;
          }
        }

        await OrderItem.create({
          orderId: newOrder.id,
          productId: resolvedProductId,
          title: item.title || item.name,
          image: item.image,
          price: item.price,
          quantity: qty,
          type: item.type,
          isHardCopy: item.isHardCopy !== undefined ? item.isHardCopy : (!item.type?.toLowerCase().includes("soft")),
          fileUrl: item.fileUrl,
          language: resolvedLanguage,
          productLinks: item.productLinks,
          sku,
        }, { transaction: t });
      }
    }

    // Clear Cart
    if (userId) {
      await Cart.destroy({ where: { userId }, transaction: t });
    }

    if (couponCode && Number(discountAmount || 0) > 0) {
      const coupon = await Coupon.findOne({ where: { code: String(couponCode).toUpperCase() }, transaction: t });
      if (coupon) {
        await coupon.increment('usedCount', { by: 1, transaction: t });
      }
    }

    await t.commit();

    // After commit: backfill user's phoneno if they haven't set one yet
    if (userId && phone) {
      try {
        await User.update(
          { phoneno: String(phone).trim() },
          { where: { id: userId, [Op.or]: [{ phoneno: null }, { phoneno: '' }] } }
        );
      } catch (phoneErr) {
        console.warn('Could not backfill user phoneno:', phoneErr.message);
      }
    }

    // After commit, generate invoice and send email
    try {
      const orderWithItems = await Order.findByPk(newOrder.id, { include: [OrderItem] });

      if (email) {
        const template = await EmailTemplate.findOne({ where: { type: "ORDER_PLACED", isActive: true } });
        if (template) {
          const items = orderWithItems.OrderItems || [];
          const hardCopyItems = items.filter(p => p.isHardCopy);
          const softCopyItems = items.filter(p => !p.isHardCopy);

          const renderProductRows = (rowItems, sectionTitle) => {
            if (!rowItems.length) return "";
            return `<h3>${sectionTitle}</h3>` + rowItems.map(p => {
              const digitalLink = !p.isHardCopy && p.fileUrl ? `<br/><a href="${p.fileUrl}" style="color: #2563eb; text-decoration: underline; font-weight: bold; margin-top: 4px; display: inline-block;">📥 Download Digital File</a>` : '';
              return `<p style="margin-bottom: 12px;">${p.title} x ${p.quantity} - ₹${p.price}${digitalLink}</p>`;
            }).join("");
          };

          const productHtml = renderProductRows(hardCopyItems, "📚 Hard Copy") + renderProductRows(softCopyItems, "💻 Digital");
          const addressString = `${street}, ${city}, ${state} - ${pincode}`;

          const html = template.htmlContent
            .replace(/{{name}}/g, escHtml(customerName || "Customer"))
            .replace(/{{orderId}}/g, escHtml(newOrder.orderId))
            .replace(/{{totalAmount}}/g, escHtml(newOrder.amount))
            .replace(/{{orderDate}}/g, escHtml(new Date(newOrder.createdAt).toDateString()))
            .replace(/{{products}}/g, productHtml)
            .replace(/{{shippingAddress}}/g, escHtml(addressString));

          const subject = template.subject.replace(/{{orderId}}/g, escHtml(newOrder.orderId));
          await sendMail({ to: email, subject, html });

          // Email delivered — if every item is a soft copy, mark the order Shipped
          // (digital delivery = the email with download links; no physical shipment needed)
          if (hardCopyItems.length === 0 && softCopyItems.length > 0) {
            await Order.update({ status: "Shipped" }, { where: { id: newOrder.id } });
            console.log(`📧 Soft-copy order ${newOrder.id} auto-marked Shipped after email delivery`);
          }
        }
      }
    } catch (postErr) {
      console.error("❌ Post-Order Actions Failed:", postErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified & order placed successfully",
      orderId: newOrder.id,
      customOrderId: newOrder.orderId,
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Verify Payment Error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
  }
});

// 3️⃣ USER – MY ORDERS
router.get("/myorders/:userId", auth, async (req, res) => {
  // Prevent IDOR: logged-in user can only see their own orders
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: { userId: req.params.userId },
      include: [OrderItem],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: orders,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3.4 USER – CANCEL OWN ORDER (only Pending orders)
router.post("/myorders/:orderId/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.userId !== req.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const cancellableStatuses = ["Pending", "Processing"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.status}`,
      });
    }

    await order.update({ status: "Cancelled" });

    // Send cancellation email
    try {
      const template = await EmailTemplate.findOne({ where: { type: "ORDER_CANCELLED", isActive: true } });
      if (template && order.email) {
        const html = template.htmlContent
          .replace(/{{name}}/g, escHtml(order.customerName || "Customer"))
          .replace(/{{orderId}}/g, escHtml(order.orderId))
          .replace(/{{totalAmount}}/g, escHtml(order.amount));
        const subject = template.subject.replace(/{{orderId}}/g, escHtml(order.orderId));
        await sendMail({ to: order.email, subject, html });
      }
    } catch (mailErr) {
      console.error("Cancel email failed:", mailErr.message);
    }

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3.5 USER – GET DOWNLOADS for a specific order (soft copies only)
router.get("/myorders/:orderId/downloads", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId, { include: [OrderItem] });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Ownership check
    if (order.userId !== req.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Only paid orders grant downloads
    if (!['Paid', 'Partial'].includes(order.paymentStatus)) {
      return res.status(403).json({ success: false, message: "Payment not confirmed for this order" });
    }

    const downloads = (order.OrderItems || [])
      .filter(item => !item.isHardCopy && item.fileUrl)
      .map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        language: item.language,
        fileUrl: item.fileUrl,
      }));

    res.json({ success: true, data: downloads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3.6 USER – GET INVOICE for a specific order
router.get("/myorders/:orderId/invoice", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId, { include: [OrderItem] });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Ownership check
    if (order.userId !== req.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const buffer = await generateInvoiceBuffer(order);
    const filename = `invoice_${order.orderId || order.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Invoice Download Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4️⃣ ADMIN – ALL ORDERS
router.get("/admin/all-orders", adminAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;
    if (req.query.search) {
      where[Op.or] = [
        { orderId: { [Op.like]: `%${req.query.search}%` } },
        { customerName: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
        { phone: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [{
        model: OrderItem,
        include: [{
          model: Product,
          as: 'Product',
          attributes: ['language', 'languageId'],
          required: false,
          include: [
            {
              model: Language,
              attributes: ['name'],
              required: false,
            },
            {
              model: ProductLink,
              attributes: ['language'],
              required: false,
            },
          ],
        }],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: orders,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
    });
  } catch (err) {
    console.error("❌ All Orders Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5️⃣ ADMIN – GET SINGLE ORDER
router.post("/admin/offline-order", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      customerName,
      email,
      phone,
      address = {},
      products = [],
      paidAmount = 0,
      shippingCost = 0,
      serviceFee = 0,
      paymentMode = "offline",
      paymentOption = "offline",
      generatePaymentLink = false,
      status = "Pending",
    } = req.body;

    if (!customerName || !phone) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Customer name and phone are required" });
    }
    if (!Array.isArray(products) || products.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Add at least one product" });
    }

    const safeEmail = (email || `offline-${phone}-${Date.now()}@offline.bookmystudyguide.local`).toLowerCase();
    let user = await User.findOne({ where: { email: safeEmail }, transaction: t });
    if (!user) {
      user = await User.create({ name: customerName, email: safeEmail, phoneno: phone, isVerified: true }, { transaction: t });
    }

    const subtotal = products.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const totalAmount = subtotal + Number(shippingCost || 0) + Number(serviceFee || 0);
    const linkMode = generatePaymentLink && paymentOption !== "offline";
    const onlinePayAmount = paymentOption === "half_online" ? Math.ceil(totalAmount / 2) : totalAmount;
    const paid = linkMode ? 0 : Number(paidAmount || 0);
    const dueAmount = Math.max(totalAmount - paid, 0);
    const paymentStatus = linkMode ? "Pending" : dueAmount <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";

    const order = await Order.create({
      userId: user.id,
      orderId: `BMSG-OFF-${Date.now()}`,
      amount: totalAmount,
      paidAmount: paid,
      dueAmount,
      paymentMode: linkMode ? paymentOption : paymentMode,
      paymentStatus,
      onlinePayAmount: linkMode ? onlinePayAmount : 0,
      serviceFee: Number(serviceFee || 0),
      shippingCost: Number(shippingCost || 0),
      status,
      street: address.street || address.fullAddress || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || null,
      customerName,
      email: safeEmail,
      phone,
      paymentId: linkMode ? null : "OFFLINE",
    }, { transaction: t });

    for (const item of products) {
      const resolvedProductId = item.productId || item.id || item._id;
      const dbProduct = resolvedProductId ? await Product.findByPk(resolvedProductId, { transaction: t }) : null;
      const type = item.type || (dbProduct?.isHardCopy === false ? "Soft Copy" : "Hard Copy");

      const language = item.language || dbProduct?.language || "";
      let sku = item.sku || dbProduct?.sku || null;

      if (sku && language) {
        const langSuffix = `-${language.toUpperCase()}`;
        if (!sku.toUpperCase().endsWith(langSuffix)) {
          sku = `${sku}-${language.toUpperCase()}`;
        }
      }

      await OrderItem.create({
        orderId: order.id,
        productId: resolvedProductId,
        title: item.title || item.name || dbProduct?.title || "Offline item",
        image: item.image || (Array.isArray(dbProduct?.images) ? dbProduct.images[0] : ""),
        price: Number(item.price ?? dbProduct?.price ?? 0),
        quantity: Number(item.quantity || 1),
        type,
        isHardCopy: !String(type).toLowerCase().includes("soft"),
        fileUrl: item.fileUrl || "",
        language,
        sku,
      }, { transaction: t });
    }

    await t.commit();

    const saved = await Order.findByPk(order.id, { include: [OrderItem] });
    if (linkMode) {
      const razorpay = await getRazorpayInstance();
      const callbackUrl = `${req.protocol}://${req.get("host")}/api/payment/payment-link-callback`;
      const paymentLink = await razorpay.paymentLink.create({
        amount: Math.round(Number(onlinePayAmount) * 100),
        currency: "INR",
        accept_partial: false,
        description: `Payment for order ${saved.orderId}`,
        customer: {
          name: customerName,
          email: safeEmail.includes("@offline.") ? undefined : safeEmail,
          contact: phone,
        },
        notify: { sms: true, email: !safeEmail.includes("@offline.") },
        reminder_enable: true,
        reference_id: saved.id,
        callback_url: callbackUrl,
        callback_method: "get",
        notes: { orderDbId: saved.id, orderId: saved.orderId, paymentOption },
      });
      await saved.update({
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url,
        paymentLinkStatus: paymentLink.status,
      });
    }
    // No pre-generation needed — invoice is generated on demand when downloaded

    res.status(201).json({ success: true, data: saved, message: "Offline order created" });
  } catch (err) {
    await t.rollback();
    console.error("Offline Order Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/payment-link-callback", async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_signature,
    } = req.query;

    const secret = await getConfig("RAZORPAY_KEY_SECRET");
    const payload = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== razorpay_signature) {
      return res.status(400).send("Invalid payment signature");
    }

    const order = await Order.findByPk(razorpay_payment_link_reference_id);
    if (!order) return res.status(404).send("Order not found");

    if (razorpay_payment_link_status === "paid") {
      const paid = Number(order.onlinePayAmount || order.amount || 0);
      await order.update({
        paymentId: razorpay_payment_id,
        paymentLinkStatus: "paid",
        paidAmount: paid,
        dueAmount: Math.max(Number(order.amount || 0) - paid, 0),
        paymentStatus: Math.max(Number(order.amount || 0) - paid, 0) > 0 ? "Partial" : "Paid",
      });
    } else {
      await order.update({ paymentLinkStatus: razorpay_payment_link_status || "attempted" });
    }

    res.send(`<html><body style="font-family:Arial;padding:32px"><h2>Payment ${razorpay_payment_link_status}</h2><p>Order ${order.orderId} has been updated. You can close this tab.</p></body></html>`);
  } catch (err) {
    console.error("Payment link callback error:", err);
    res.status(500).send("Payment callback failed");
  }
});

router.get("/admin/sellable-items", adminAuth, async (req, res) => {
  try {
    const [products, combos, projects, softCopies, synopses] = await Promise.all([
      Product.findAll({ include: [ProductLink], order: [["createdAt", "DESC"]] }),
      ComboProduct.findAll({ include: [ProductLink], order: [["createdAt", "DESC"]] }),
      Project.findAll({ order: [["createdAt", "DESC"]] }),
      SoftCopy.findAll({ order: [["createdAt", "DESC"]] }),
      Synopsis.findAll({ order: [["createdAt", "DESC"]] }),
    ]);

    const items = [];
    const addVariant = (base, variant) => {
      let finalSku = base.sku || "";
      if (finalSku && variant.language) {
        const langSuffix = `-${variant.language.toLowerCase()}`;
        if (!finalSku.toLowerCase().endsWith(langSuffix)) {
          finalSku = `${finalSku}-${variant.language.toLowerCase()}`;
        }
      }

      items.push({
        id: `${base.kind}:${base.id}:${variant.type}:${variant.language || "default"}`,
        productId: base.id,
        kind: base.kind,
        title: base.title,
        sku: finalSku,
        image: base.image || "",
        type: variant.type,
        price: Number(variant.price || 0),
        language: variant.language || "",
        fileUrl: variant.fileUrl || "",
        isHardCopy: !String(variant.type).toLowerCase().includes("soft"),
      });
    };

    products.forEach(p => {
      const links = p.ProductLinks || [];
      if (p.isHardCopy !== false) addVariant({ kind: "product", id: p.id, title: p.title, sku: p.sku, image: Array.isArray(p.images) ? p.images[0] : "" }, { type: "Hard Copy", price: p.price, language: p.language });
      links.forEach(l => addVariant({ kind: "product", id: p.id, title: p.title, sku: p.sku, image: Array.isArray(p.images) ? p.images[0] : "" }, { type: l.type || "Soft Copy", price: l.price || p.price, language: l.language, fileUrl: l.link }));
    });

    combos.forEach(c => {
      const links = c.ProductLinks || [];
      addVariant({ kind: "combo", id: c.id, title: c.title, image: c.image }, { type: "Hard Copy", price: c.price, language: c.language });
      links.forEach(l => addVariant({ kind: "combo", id: c.id, title: c.title, image: c.image }, { type: l.type || "Soft Copy", price: l.price || c.price, language: l.language, fileUrl: l.link }));
    });

    projects.forEach(p => addVariant({ kind: "project", id: p.id, title: p.title, image: p.image }, { type: "Soft Copy", price: p.price }));
    softCopies.forEach(s => addVariant({ kind: "softcopy", id: s.id, title: s.title }, { type: "Soft Copy", price: s.price, language: s.language, fileUrl: s.resourceLink || s.filePath }));
    synopses.forEach(s => addVariant({ kind: "synopsis", id: s.id, title: s.title, image: Array.isArray(s.images) ? s.images[0] : "" }, { type: "Soft Copy", price: s.price }));

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/order/:id", adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: [OrderItem] });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5️⃣ ADMIN – DOWNLOAD ORDER INVOICE PDF (generated on demand, streamed directly)
router.get("/admin/order/:id/invoice", adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: [OrderItem] });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const buffer = await generateInvoiceBuffer(order);
    const filename = `invoice_${order.orderId || order.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Invoice Download Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5️⃣ ADMIN – UPDATE ORDER
router.put("/admin/order/:id", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const oldStatus = order.status;
    await order.update(req.body);

    if (status === "Cancelled" && oldStatus !== "Cancelled") {
      const template = await EmailTemplate.findOne({ where: { type: "ORDER_CANCELLED", isActive: true } });
      if (template && order.email) {
        const html = template.htmlContent
          .replace(/{{name}}/g, escHtml(order.customerName || "Customer"))
          .replace(/{{orderId}}/g, escHtml(order.orderId))
          .replace(/{{totalAmount}}/g, escHtml(order.amount));
        const subject = template.subject.replace(/{{orderId}}/g, escHtml(order.orderId));
        await sendMail({ to: order.email, subject, html });
      }
    }

    res.json({ success: true, data: order, message: "Order updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6️⃣ ADMIN – MANUAL SHIPPING (offline orders, no Shiprocket)
router.post("/admin/order/:id/manual-ship", adminAuth, async (req, res) => {
  try {
    const { courierName, awbCode } = req.body;
    if (!courierName || !awbCode) {
      return res.status(400).json({ success: false, message: "courierName and awbCode are required" });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.shiprocketOrderId) {
      return res.status(400).json({ success: false, message: "This order is managed by Shiprocket" });
    }

    await order.update({ courierName, awbCode, status: "Shipped" });

    try {
      const template = await EmailTemplate.findOne({ where: { type: "ORDER_SHIPPED", isActive: true } });
      if (template && order.email) {
        const frontendUrl = await getConfig("FRONTEND_URL") || process.env.FRONTEND_URL || "http://localhost:3000";
        const trackingUrl = `${frontendUrl}/track-order?awb=${encodeURIComponent(awbCode || "")}&orderId=${encodeURIComponent(order.orderId || "")}`;
        const html = template.htmlContent
          .replace(/{{name}}/g, escHtml(order.customerName || "Customer"))
          .replace(/{{orderId}}/g, escHtml(order.orderId))
          .replace(/{{awbCode}}/g, escHtml(awbCode))
          .replace(/{{courierName}}/g, escHtml(courierName))
          .replace(/{{trackingUrl}}/g, escHtml(trackingUrl));
        const subject = template.subject
          .replace(/{{name}}/g, escHtml(order.customerName || "Customer"))
          .replace(/{{orderId}}/g, escHtml(order.orderId))
          .replace(/{{awbCode}}/g, escHtml(awbCode))
          .replace(/{{courierName}}/g, escHtml(courierName));
        await sendMail({ to: order.email, subject, html });
      }
    } catch (mailErr) {
      console.error("❌ Manual Ship Email Failed:", mailErr.message);
    }

    res.json({ success: true, data: order, message: "Order marked as shipped and customer notified" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6️⃣ ADMIN – DELETE ORDER
router.delete("/admin/order/:id", adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    await OrderItem.destroy({ where: { orderId: req.params.id } });
    await order.destroy();
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7️⃣ ADMIN – ALL PAYMENTS (PAGINATED)
router.get("/admin/all-payments", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      const search = req.query.search;
      where[Op.or] = [
        { orderId: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { paymentId: { [Op.like]: `%${search}%` } }
      ];
    }

    if (req.query.status) {
      where.paymentStatus = req.query.status;
    }

    const { count, rows: payments } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7️⃣ ADMIN – INITIATE REFUND (RAZORPAY)
router.post("/admin/refund/:id", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, notes } = req.body;
    const order = await Order.findByPk(req.params.id, { transaction: t });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.paymentId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "This order has no payment ID (maybe COD?)" });
    }

    if (order.refundStatus === "Full") {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Order already fully refunded" });
    }

    const razorpay = await getRazorpayInstance();

    const refundOptions = {
      payment_id: order.paymentId,
      amount: amount ? Math.round(Number(amount) * 100) : Math.round(order.paidAmount * 100),
      notes: {
        reason: notes || "Admin initiated refund",
        orderId: order.orderId
      }
    };

    const refund = await razorpay.payments.refund(order.paymentId, refundOptions);

    order.refundId = refund.id;
    order.refundAmount = Number(order.refundAmount || 0) + (refund.amount / 100);
    order.refundStatus = order.refundAmount >= order.paidAmount ? "Full" : "Partial";

    if (order.refundStatus === "Full") {
      order.paymentStatus = "Refunded";
      order.status = "Cancelled";
    }

    await order.save({ transaction: t });
    await t.commit();

    res.json({
      success: true,
      message: `Refund of ₹${refund.amount / 100} initiated successfully`,
      data: refund
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Refund Error:", error);
    res.status(500).json({
      success: false,
      message: error.description || "Failed to initiate refund",
      error: error
    });
  }
});

// 6️⃣ ADMIN – DELETE ORDER
router.delete("/admin/order/:id", adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    await OrderItem.destroy({ where: { orderId: req.params.id } });
    await order.destroy();
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7️⃣ ADMIN – ALL PAYMENTS (PAGINATED)
router.get("/admin/all-payments", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      const search = req.query.search;
      where[Op.or] = [
        { orderId: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { paymentId: { [Op.like]: `%${search}%` } }
      ];
    }

    if (req.query.status) {
      where.paymentStatus = req.query.status;
    }

    const { count, rows: payments } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7️⃣ ADMIN – INITIATE REFUND (RAZORPAY)
router.post("/admin/refund/:id", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, notes } = req.body;
    const order = await Order.findByPk(req.params.id, { transaction: t });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.paymentId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "This order has no payment ID (maybe COD?)" });
    }

    if (order.refundStatus === "Full") {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Order already fully refunded" });
    }

    const razorpay = await getRazorpayInstance();

    const refundOptions = {
      payment_id: order.paymentId,
      amount: amount ? Math.round(Number(amount) * 100) : Math.round(order.paidAmount * 100),
      notes: {
        reason: notes || "Admin initiated refund",
        orderId: order.orderId
      }
    };

    const refund = await razorpay.payments.refund(order.paymentId, refundOptions);

    order.refundId = refund.id;
    order.refundAmount = Number(order.refundAmount || 0) + (refund.amount / 100);
    order.refundStatus = order.refundAmount >= order.paidAmount ? "Full" : "Partial";

    if (order.refundStatus === "Full") {
      order.paymentStatus = "Refunded";
      order.status = "Cancelled";
    }

    await order.save({ transaction: t });
    await t.commit();

    res.json({
      success: true,
      message: `Refund of ₹${refund.amount / 100} initiated successfully`,
      data: refund
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Refund Error:", error);
    res.status(500).json({
      success: false,
      message: error.description || "Failed to initiate refund",
      error: error
    });
  }
});

/* ======================================================
   USER — CANCEL OWN ORDER (Pending only)
====================================================== */
router.patch("/cancel/:orderId", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const order = await Order.findOne({ where: { id: req.params.orderId, userId } });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Cannot cancel an order with status "${order.status}"` });
    }

    await order.update({ status: "Cancelled" });

    try {
      const template = await EmailTemplate.findOne({ where: { type: "ORDER_CANCELLED", isActive: true } });
      if (template && order.email) {
        const html = template.htmlContent
          .replace(/{{name}}/g, escHtml(order.customerName || "Customer"))
          .replace(/{{orderId}}/g, escHtml(order.orderId))
          .replace(/{{totalAmount}}/g, escHtml(order.amount));
        const subject = template.subject.replace(/{{orderId}}/g, escHtml(order.orderId));
        await sendMail({ to: order.email, subject, html });
      }
    } catch (mailErr) {
      console.error("Cancel email failed:", mailErr.message);
    }

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================================================
   USER — PAY REMAINING COD BALANCE ONLINE
====================================================== */
router.post("/pay-due/:orderId", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const order = await Order.findOne({ where: { id: req.params.orderId, userId } });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const due = Number(order.dueAmount || 0);
    if (due <= 0) return res.status(400).json({ success: false, message: "No due amount on this order" });
    if (order.status === "Cancelled") return res.status(400).json({ success: false, message: "Order is cancelled" });

    const razorpay = await getRazorpayInstance();
    const frontendUrl = await getConfig("FRONTEND_URL") || process.env.FRONTEND_URL || "http://localhost:3000";

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(due * 100),
      currency: "INR",
      accept_partial: false,
      description: `Remaining balance for order ${order.orderId}`,
      customer: {
        name: order.customerName || "Customer",
        email: order.email && !order.email.includes("@offline.") ? order.email : undefined,
        contact: order.phone || undefined,
      },
      notify: { sms: true, email: !!(order.email && !order.email.includes("@offline.")) },
      reminder_enable: true,
      reference_id: order.id,
      callback_url: `${frontendUrl}/myorder`,
      callback_method: "get",
      notes: { orderId: order.orderId, orderDbId: order.id, purpose: "cod_due_payment" },
    });

    await order.update({
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkStatus: paymentLink.status,
    });

    res.json({ success: true, paymentLinkUrl: paymentLink.short_url, amount: due });
  } catch (err) {
    console.error("Pay-due error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
