#!/usr/bin/env node
// Simple CLI to send a test email using server/src/utils/mailer.js
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const mailer = require("../server/src/utils/mailer");

const argv = yargs(hideBin(process.argv))
  .option("to", {
    type: "string",
    desc: "Recipient email address",
    demandOption: false,
  })
  .option("subject", {
    type: "string",
    desc: "Email subject",
    default: "MLSC Test Email",
  })
  .option("html", {
    type: "string",
    desc: "HTML body",
    default: "<p>This is a test email from MLSC app.</p>",
  })
  .help().argv;

async function main() {
  const to = argv.to || process.env.MAIL_TEST_TO;
  if (!to) {
    console.error(
      "No recipient provided. Use --to or set MAIL_TEST_TO in env."
    );
    process.exit(1);
  }

  try {
    if (typeof mailer.verifyTransporter === "function") {
      await mailer.verifyTransporter();
      console.log("Transporter verified");
    }
  } catch (err) {
    console.error(
      "Transporter verification failed:",
      err && (err.message || err)
    );
    process.exit(1);
  }

  try {
    await mailer.sendConfirmationEmail([to], {
      name: "Test",
      email: to,
      members: [],
      teamName: "Test-team",
    });
    console.log("Test email sent to", to);
  } catch (err) {
    console.error("Failed to send test email:", err && (err.message || err));
    process.exit(1);
  }
}

main();
