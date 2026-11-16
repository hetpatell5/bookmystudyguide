const nodemailer = require("nodemailer");
const configEnv = require("../config/envConfig");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Athva biji koi service
    auth: {
      user: configEnv.email.user, // Tamaru Gmail
      pass: configEnv.email.pass, // Gmail App Password (Not regular password)
    },
  });

  const mailOptions = {
    from: configEnv.email.user,
    to: options.to,
    subject: options.subject,
    html: options.text,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
