// Final single mailer implementation
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

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

      const mailOptions = {
        from: process.env.MAIL_USER,
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

      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error(
        `Failed sending mail to ${to}:`,
        err && err.message ? err.message : err
      );
    }
  }
}

module.exports = { sendConfirmationEmail };
