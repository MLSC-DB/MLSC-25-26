const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, 
    pass: process.env.MAIL_PASS, 
  },
});

async function sendConfirmationEmail(to, name) {
  const mailOptions = {
    from: `"MLSC Team" <${process.env.MAIL_USER}>`,
    to,
    subject: "Registration Received ✔",
    html: `
      <h2>Hi ${name},</h2>
      <p>Thanks for registering for MLSC!</p>
      <p>We've received your form and will get back to you shortly.</p>
      <br>
      <p>Best regards,<br>MLSC Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${to}`);
  } catch (err) {
    console.error("Email sending failed:", err);
  }
}

module.exports = { sendConfirmationEmail };
