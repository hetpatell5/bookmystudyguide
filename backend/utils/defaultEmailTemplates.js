const TEMPLATE_TYPES = [
  "OTP_VERIFICATION",
  "WELCOME_EMAIL",
  "ORDER_PLACED",
  "ORDER_SHIPPED",
  "ORDER_CANCELLED",
  "PASSWORD_RESET",
  "FORGOT_PASSWORD",
  "CONTACT_MESSAGE",
];

const baseTemplate = ({ title, body }) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
    <div style="background: #123a63; color: #ffffff; padding: 18px 22px; border-radius: 12px 12px 0 0;">
      <h2 style="margin: 0; font-size: 20px;">${title}</h2>
    </div>
    <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 22px; border-radius: 0 0 12px 12px;">
      ${body}
      <p style="margin-top: 24px;">Warm regards,<br><strong>Book My Study Guide</strong></p>
    </div>
  </div>
`;

const DEFAULT_EMAIL_TEMPLATES = {
  OTP_VERIFICATION: {
    name: "Default OTP Verification",
    subject: "Your verification OTP is {{otp}}",
    htmlContent: baseTemplate({
      title: "Verify your email",
      body: `
        <p>Hello {{name}},</p>
        <p>Your one-time password is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; padding: 14px 18px; border-radius: 10px; text-align: center;">{{otp}}</div>
        <p>This OTP is valid for {{minutes}} minutes.</p>
      `,
    }),
  },
  WELCOME_EMAIL: {
    name: "Default Welcome Email",
    subject: "Welcome to Book My Study Guide",
    htmlContent: baseTemplate({
      title: "Welcome aboard",
      body: `
        <p>Hello {{name}},</p>
        <p>Your account is ready. You can now browse study guides, projects, and learning material from your dashboard.</p>
      `,
    }),
  },
  ORDER_PLACED: {
    name: "Default Order Placed",
    subject: "Order {{orderId}} confirmed",
    htmlContent: baseTemplate({
      title: "Order confirmed",
      body: `
        <p>Hello {{name}},</p>
        <p>Thank you for your order. Your order ID is <strong>{{orderId}}</strong>.</p>
        <p><strong>Total:</strong> {{totalAmount}}</p>
        <p><strong>Date:</strong> {{orderDate}}</p>
        <div>{{products}}</div>
        <p><strong>Shipping Address:</strong><br>{{shippingAddress}}</p>
      `,
    }),
  },
  ORDER_SHIPPED: {
    name: "Default Order Shipped",
    subject: "Order {{orderId}} has been shipped",
    htmlContent: baseTemplate({
      title: "Your order is on the way",
      body: `
        <p>Hello {{name}},</p>
        <p>Your order <strong>{{orderId}}</strong> has been shipped.</p>
        <p><strong>Courier:</strong> {{courierName}}</p>
        <p><strong>AWB:</strong> {{awbCode}}</p>
        <p style="margin: 22px 0;">
          <a href="{{trackingUrl}}" style="background: #123a63; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">Track your order</a>
        </p>
        <p>If the button does not work, open this link:<br><a href="{{trackingUrl}}">{{trackingUrl}}</a></p>
      `,
    }),
  },
  ORDER_CANCELLED: {
    name: "Default Order Cancelled",
    subject: "Order {{orderId}} cancelled",
    htmlContent: baseTemplate({
      title: "Order cancelled",
      body: `
        <p>Hello {{name}},</p>
        <p>Your order <strong>{{orderId}}</strong> has been cancelled.</p>
        <p><strong>Order total:</strong> {{totalAmount}}</p>
      `,
    }),
  },
  PASSWORD_RESET: {
    name: "Default Password Reset",
    subject: "Reset your password",
    htmlContent: baseTemplate({
      title: "Password reset",
      body: `
        <p>Hello {{name}},</p>
        <p>Use the link or instructions provided to reset your password.</p>
        <p>{{resetLink}}</p>
      `,
    }),
  },
  FORGOT_PASSWORD: {
    name: "Default Forgot Password OTP",
    subject: "Your password reset OTP is {{otp}}",
    htmlContent: baseTemplate({
      title: "Reset your password",
      body: `
        <p>Hello {{name}},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; padding: 14px 18px; border-radius: 10px; text-align: center;">{{otp}}</div>
        <p>This OTP is valid for 15 minutes.</p>
      `,
    }),
  },
  CONTACT_MESSAGE: {
    name: "Default Contact Message",
    subject: "New contact message from {{name}}",
    htmlContent: baseTemplate({
      title: "New contact message",
      body: `
        <p><strong>Name:</strong> {{name}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Phone:</strong> {{phone}}</p>
        <p><strong>Message:</strong></p>
        <p>{{message}}</p>
      `,
    }),
  },
};

const ensureDefaultEmailTemplates = async (EmailTemplate, options = {}) => {
  const created = [];
  const skipped = [];

  for (const type of TEMPLATE_TYPES) {
    const count = await EmailTemplate.count({ where: { type }, transaction: options.transaction });
    if (count > 0) {
      skipped.push(type);
      continue;
    }

    await EmailTemplate.create({
      type,
      isActive: true,
      ...DEFAULT_EMAIL_TEMPLATES[type],
    }, { transaction: options.transaction });
    created.push(type);
  }

  return { created, skipped };
};

module.exports = {
  TEMPLATE_TYPES,
  DEFAULT_EMAIL_TEMPLATES,
  ensureDefaultEmailTemplates,
};
