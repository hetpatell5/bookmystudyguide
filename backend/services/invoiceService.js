const PDFDocument = require("pdfkit-table");

const NAVY   = "#1a3c6e";
const GOLD   = "#c8a951";
const DARK   = "#1e293b";
const MUTED  = "#64748b";
const LIGHT  = "#f8fafc";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const GREEN  = "#16a34a";
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const COL_R  = 350;

const fmt = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;
const payLabel = (mode) => {
  if (!mode) return "Online";
  if (mode === "half_online") return "Half Online + Half COD";
  return mode.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

/* Returns a Buffer containing the PDF — no file I/O, no R2 upload */
const path = require("path");
const fs = require("fs");
const generateInvoiceBuffer = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc     = new PDFDocument({ margin: 0, size: "A4", bufferPages: true });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const amount       = Number(order.amount       || 0);
      const shippingCost = Number(order.shippingCost || 0);
      const serviceFee   = Number(order.serviceFee   || 0);
      const paidAmount   = Number(order.paidAmount   || 0);
      const dueAmount    = Number(order.dueAmount    || 0);
      const subtotal     = amount - shippingCost - serviceFee;
      const items        = order.OrderItems || order.products || [];
      const date         = new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });

      // 1. HEADER BAR
      doc.rect(0, 0, PAGE_W, 90).fill(NAVY);

      // logo1.png is a 160x60 (8:3) wordmark that already contains
      // "BMSG" + "BOOK MY STUDY GUIDE" + tagline — draw it alone,
      // at its native aspect ratio, without duplicating the text beside it.
      const logoPath = path.join(__dirname, "../../frontend/src/assets/logos/logo1.png");
      const LOGO_W = 168;
      const LOGO_H = 63; // 168 * (60/160), preserves native 8:3 aspect ratio
      let logoDrawn = false;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, MARGIN, (90 - LOGO_H) / 2, { width: LOGO_W, height: LOGO_H });
          logoDrawn = true;
        } catch (e) {
          console.error("Error drawing invoice logo:", e);
        }
      }

      if (!logoDrawn) {
        doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE)
           .text("BOOK MY STUDY GUIDE", MARGIN, 22, { width: 300 });
        doc.font("Helvetica").fontSize(9).fillColor(GOLD)
           .text("Self-Learning Made Smarter", MARGIN, 50);
      }
      doc.font("Helvetica-Bold").fontSize(28).fillColor(WHITE)
         .text("INVOICE", 0, 22, { align: "right", width: PAGE_W - MARGIN });
      doc.font("Helvetica").fontSize(9).fillColor("#94a3b8")
         .text("bookmystudyguide.com", 0, 55, { align: "right", width: PAGE_W - MARGIN });
      doc.rect(0, 90, PAGE_W, 4).fill(GOLD);

      // 2. META ROW
      const metaY = 108;
      doc.rect(0, metaY, PAGE_W, 52).fill(LIGHT);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("ORDER ID", MARGIN, metaY + 10);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text(order.orderId || "—", MARGIN, metaY + 23);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("DATE", 200, metaY + 10);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text(date, 200, metaY + 23);

      const statusColor = order.paymentStatus === "Paid" ? GREEN : "#d97706";
      doc.roundedRect(COL_R, metaY + 12, 90, 22, 4).fill(statusColor);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE)
         .text(order.paymentStatus || "Paid", COL_R, metaY + 18, { width: 90, align: "center" });
      doc.roundedRect(COL_R + 100, metaY + 12, 105, 22, 4).fill("#1e293b");
      doc.font("Helvetica").fontSize(8).fillColor(WHITE)
         .text(payLabel(order.paymentMode), COL_R + 100, metaY + 18, { width: 105, align: "center" });

      // 3. BILL TO / SHIP TO CARDS
      const cardY = 174;
      const cardH = 95;
      doc.roundedRect(MARGIN, cardY, 230, cardH, 6).fill(WHITE).stroke(BORDER);
      doc.rect(MARGIN, cardY, 230, 22).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE).text("BILL TO", MARGIN + 10, cardY + 7);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK)
         .text(order.customerName || "Customer", MARGIN + 10, cardY + 30);
      doc.font("Helvetica").fontSize(9).fillColor(MUTED)
         .text(order.phone || "", MARGIN + 10, cardY + 46)
         .text(order.email || "", MARGIN + 10, cardY + 59, { width: 210 });

      doc.roundedRect(290, cardY, 265, cardH, 6).fill(WHITE).stroke(BORDER);
      doc.rect(290, cardY, 265, 22).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE).text("SHIPPING ADDRESS", 300, cardY + 7);
      const addrParts = [
        order.street,
        order.city && order.state ? `${order.city}, ${order.state}` : (order.city || order.state),
        order.pincode ? `PIN - ${order.pincode}` : null,
      ].filter(Boolean);
      doc.font("Helvetica").fontSize(9).fillColor(DARK)
         .text(addrParts.join("\n") || "—", 300, cardY + 30, { width: 245, lineGap: 2 });

      // 4. ITEMS TABLE
      const tableY = cardY + cardH + 20;
      doc.rect(MARGIN, tableY, PAGE_W - MARGIN * 2, 26).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE);
      doc.text("#",         MARGIN + 8,   tableY + 9);
      doc.text("PRODUCT",   MARGIN + 28,  tableY + 9, { width: 260 });
      doc.text("TYPE",      MARGIN + 298, tableY + 9, { width: 60 });
      doc.text("QTY",       MARGIN + 363, tableY + 9, { width: 30, align: "right" });
      doc.text("PRICE",     MARGIN + 400, tableY + 9, { width: 60, align: "right" });
      doc.text("TOTAL",     MARGIN + 465, tableY + 9, { width: 65, align: "right" });

      let rowY = tableY + 26;
      items.forEach((item, i) => {
        const lineTotal = Number(item.price || 0) * Number(item.quantity || 1);
        const rowH      = 30;
        doc.rect(MARGIN, rowY, PAGE_W - MARGIN * 2, rowH).fill(i % 2 === 0 ? WHITE : "#f8fafc");
        doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(String(i + 1), MARGIN + 8, rowY + 11);
        doc.font("Helvetica").fontSize(9).fillColor(DARK)
           .text(item.title || item.name || "Study Material", MARGIN + 28, rowY + 11, { width: 260, lineBreak: false, ellipsis: true });
        doc.font("Helvetica").fontSize(8).fillColor(MUTED)
           .text(String(item.type || "Hard").replace(/copy/i, "").trim(), MARGIN + 298, rowY + 11, { width: 60 });
        doc.font("Helvetica").fontSize(9).fillColor(DARK)
           .text(String(item.quantity || 1), MARGIN + 363, rowY + 11, { width: 30, align: "right" });
        doc.text(fmt(item.price), MARGIN + 400, rowY + 11, { width: 60, align: "right" });
        doc.font("Helvetica-Bold").fillColor(DARK)
           .text(fmt(lineTotal), MARGIN + 465, rowY + 11, { width: 65, align: "right" });
        doc.moveTo(MARGIN, rowY + rowH).lineTo(PAGE_W - MARGIN, rowY + rowH)
           .strokeColor(BORDER).lineWidth(0.5).stroke();
        rowY += rowH;
      });

      // 5. TOTALS + PAYMENT SUMMARY
      const totalsY = rowY + 20;
      doc.roundedRect(MARGIN, totalsY, 220, 110, 6).fill(LIGHT).stroke(BORDER);
      doc.rect(MARGIN, totalsY, 220, 22).fill("#1e293b");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE).text("PAYMENT SUMMARY", MARGIN + 10, totalsY + 7);
      const payRows = [
        ["Amount Paid (Online)", fmt(paidAmount)],
        dueAmount > 0 ? ["Due (Cash on Delivery)", fmt(dueAmount)] : null,
        ["Payment Method", payLabel(order.paymentMode)],
      ].filter(Boolean);
      payRows.forEach(([label, val], i) => {
        const py = totalsY + 30 + i * 22;
        doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, MARGIN + 10, py);
        doc.font("Helvetica-Bold").fontSize(9)
           .fillColor(label.includes("Due") ? "#dc2626" : DARK)
           .text(val, MARGIN + 10, py, { width: 200, align: "right" });
      });

      const totalsCardX = 290;
      doc.roundedRect(totalsCardX, totalsY, 265, 110, 6).fill(WHITE).stroke(BORDER);
      doc.rect(totalsCardX, totalsY, 265, 22).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE).text("ORDER TOTALS", totalsCardX + 10, totalsY + 7);
      const totalRows = [
        ["Subtotal",  fmt(subtotal)],
        ["Shipping",  shippingCost > 0 ? fmt(shippingCost) : "FREE"],
        serviceFee > 0 ? ["Service Fee", fmt(serviceFee)] : null,
      ].filter(Boolean);
      totalRows.forEach(([label, val], i) => {
        const ty = totalsY + 30 + i * 20;
        doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, totalsCardX + 10, ty);
        doc.font("Helvetica").fontSize(9).fillColor(DARK)
           .text(val, totalsCardX + 10, ty, { width: 245, align: "right" });
      });
      const gtY = totalsY + 80;
      doc.rect(totalsCardX, gtY, 265, 30).fill(NAVY);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE).text("GRAND TOTAL", totalsCardX + 10, gtY + 9);
      doc.font("Helvetica-Bold").fontSize(13).fillColor(GOLD)
         .text(fmt(amount), totalsCardX + 10, gtY + 8, { width: 245, align: "right" });

      // 6. FOOTER
      const footerY = PAGE_H - 55;
      doc.rect(0, footerY, PAGE_W, 1).fill(BORDER);
      doc.font("Helvetica").fontSize(8).fillColor(MUTED)
         .text("This is a computer-generated invoice and does not require a physical signature.",
               MARGIN, footerY + 10, { align: "center", width: PAGE_W - MARGIN * 2 })
         .text("Thank you for choosing Book My Study Guide!  |  bookmystudyguide.com",
               MARGIN, footerY + 24, { align: "center", width: PAGE_W - MARGIN * 2 });
      doc.rect(0, PAGE_H - 18, PAGE_W, 18).fill(NAVY);
      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
         .text("Powered by BMSG  ·  Self-Learning Made Smarter", 0, PAGE_H - 12,
               { align: "center", width: PAGE_W });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoiceBuffer };
