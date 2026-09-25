require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  host: "smtp.gmail.com",
  port: process.env.PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.messageId);

    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
};

module.exports = sendEmail;
