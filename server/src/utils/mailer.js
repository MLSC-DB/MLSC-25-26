// Final single mailer implementation
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

// Create SMTP transporter from env vars. Prefer explicit SMTP_* settings.
function createTransporter() {
  if (process.env.SMTP_HOST) {
    const opts = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
    };
    if (process.env.SMTP_USER) {
      opts.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
    }
    return nodemailer.createTransport(opts);
  }

  // Fallback: if MAIL_USER/MAIL_PASS present, use default provider (Gmail via service)
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
  }

  // No SMTP configured
  throw new Error(
    "No mailer configuration found. Set SMTP_HOST/SMTP_USER/SMTP_PASS or MAIL_USER/MAIL_PASS in env."
  );
}

let transporter;
try {
  transporter = createTransporter();
} catch (err) {
  // Defer throwing so the app can still start in non-mailing contexts; functions will fail at send time.
  console.warn(
    "Mailer not configured:",
    err && err.message ? err.message : err
  );
  transporter = null;
}

function buildRegistrationPdfBuffer(reg) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const safe = (v) =>
        v !== undefined && v !== null && String(v).trim() ? String(v) : "N/A";

      doc.fontSize(18).text("MLSC Build-a-thon", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).text("Registration Summary", { align: "center" });
      doc.moveDown(0.8);

      doc.fontSize(12).text("Registrant Details:");
      doc.moveDown(0.2);
      doc.fontSize(10).text(`Name: ${safe(reg.name)}`);
      doc.text(`Email: ${safe(reg.email)}`);
      doc.text(`Phone: ${safe(reg.phone)}`);

      doc.moveDown(0.6);
      doc.fontSize(11).text("Preferences:");
      doc.fontSize(10).text(`1) ${safe(reg.domainPreference1)}`);
      doc.text(`2) ${safe(reg.domainPreference2)}`);
      doc.text(`3) ${safe(reg.domainPreference3)}`);

      doc.moveDown(0.6);
      if (Array.isArray(reg.members) && reg.members.length) {
        doc.fontSize(11).text("Team Members:");
        doc.moveDown(0.2);
        reg.members.forEach((m, i) => {
          doc.fontSize(10).text(`${i + 1}. ${safe(m.name)} - ${safe(m.email)}`);
        });
      }

      doc.moveDown(0.6);
      doc
        .fontSize(9)
        .text("Auto-generated summary. Contact MLSC for corrections.", {
          align: "center",
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function sendConfirmationEmail(recipients, registration) {
  const recipientsArr = Array.isArray(recipients)
    ? recipients.slice()
    : [recipients];
  const uniqueRecipients = [...new Set(recipientsArr.filter(Boolean))];

  const leaderEmail = registration.email || "";
  const leaderName = registration.name || "";
  const discordInvite = process.env.DISCORD_INVITE;

  const pdfBuffer = await buildRegistrationPdfBuffer(registration);

  for (const to of uniqueRecipients) {
    try {
      const isLeader = to === leaderEmail;
      let memberName = null;
      if (!isLeader && Array.isArray(registration.members)) {
        const found = registration.members.find((m) => m && m.email === to);
        if (found) memberName = found.name || null;
      }

      const subject = isLeader
        ? "MLSC Build-a-thon — Registration received"
        : `MLSC Build-a-thon — Your team registration by ${leaderName}`;

      const greeting = isLeader
        ? `Hi ${leaderName || "there"},`
        : `Hi ${memberName || "there"},`;
      const memberNote = isLeader
        ? "Thank you for registering your team. A summary is attached."
        : `Your leader ${
            leaderName || "(a team leader)"
          } has registered on your team's behalf.`;

      const html = `<p>${greeting}</p><p>${memberNote}</p><p>Join our Discord: <a href="${discordInvite}">${discordInvite}</a></p><p>Best,<br/>MLSC Team</p>`;

      const from =
        process.env.MAIL_FROM ||
        process.env.SMTP_USER ||
        process.env.MAIL_USER ||
        `no-reply@${process.env.DOMAIN || "example.com"}`;

      const mailOptions = {
        from,
        to,
        subject,
        html,
        attachments: [
          {
            filename: `mlsc-registration-${(
              registration.teamName ||
              registration.name ||
              "registration"
            ).replace(/\s+/g, "-")}.pdf`,
            content: pdfBuffer,
          },
        ],
      };

      if (!transporter) throw new Error("Transporter not configured");
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error(
        `Failed sending mail to ${to}:`,
        err && err.message ? err.message : err
      );
    }
  }
}

async function verifyTransporter() {
  if (!transporter) throw new Error("Transporter not configured");
  // nodemailer.transporter.verify returns a Promise when callback omitted
  return transporter.verify();
}

module.exports = { sendConfirmationEmail, verifyTransporter };
