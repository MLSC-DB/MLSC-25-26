const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const upload = multer();
const mongoose = require("mongoose");
const Registration = require("./server/src/models/Registration");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const Helmet = require("helmet");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const { error } = require("console");
const Admin = require("./server/src/models/Admin");
const { Parser } = require("json2csv");
require("dotenv").config();
const mailer = require("./server/src/utils/mailer");
const logger = require("./server/src/utils/logger");
const pinoHttp = require("pino-http");

// Startup validation: in production we warn about missing recommended env vars
// but do not abort startup. This keeps the app resilient while still surfacing
// configuration issues via logs.
const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
if (isProd) {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI (recommended)");

  // SESSION_SECRET is critical: abort startup if missing in production
  if (!process.env.SESSION_SECRET) {
    console.error(
      "SESSION_SECRET is required in production. Set SESSION_SECRET environment variable."
    );
    process.exit(1);
  }

  // SMTP is recommended for transactional emails (warn if missing)
  const smtpMissing = [];
  if (!process.env.SMTP_HOST) smtpMissing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) smtpMissing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) smtpMissing.push("SMTP_PASS");
  if (!process.env.MAIL_FROM) smtpMissing.push("MAIL_FROM");
  if (smtpMissing.length) {
    console.warn(
      "Missing SMTP-related environment variables (recommended):",
      smtpMissing.join(", ")
    );
  }

  // Google Sheets: sheet ID and credentials are optional; warn if absent
  if (!process.env.GOOGLE_SHEET_ID)
    console.warn("GOOGLE_SHEET_ID not set (Google Sheets optional)");
  const hasGoogleCreds = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  );
  if (!hasGoogleCreds)
    console.warn(
      "Google service account credentials not provided (set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)"
    );
}

// Helper: append a registration entry to Google Sheets (uses service account)
// Configure via environment variables:
// - GOOGLE_SHEET_ID (required)
// - GOOGLE_SHEET_RANGE (optional, default: 'Sheet1!A1')
// - GOOGLE_SERVICE_ACCOUNT_JSON (preferred: the full JSON string) OR
// - GOOGLE_SERVICE_ACCOUNT_FILE (path to JSON file)

// Buffer and batch flush configuration for Google Sheets
const sheetBuffer = [];
let sheetFlushInProgress = false;
const SHEET_BATCH_SIZE = parseInt(process.env.SHEET_BATCH_SIZE || "20", 10);
const SHEET_FLUSH_INTERVAL_MS = parseInt(
  process.env.SHEET_FLUSH_INTERVAL_MS || "5000",
  10
);

// Ordered columns to write (headers). Keep this in sync with CSV export.
const SHEET_COLUMNS = [
  "Team Number",
  "Team Name",
  "Member Index",
  "Member Role",
  "Name",
  "Email",
  "Roll",
  "Phone",
  "Discord",
  "Year",
  "Primary Pref",
  "Secondary Pref",
  "Tertiary Pref",
  "Join MLSC",
];

// Pretty sheet (one row per member) configuration
const PRETTY_SHEET_NAME = process.env.GOOGLE_SHEET_PRETTY_NAME || "PrettyView";
const PRETTY_SHEET_RANGE =
  process.env.GOOGLE_SHEET_PRETTY_RANGE || `${PRETTY_SHEET_NAME}!A1`;
const prettyBuffer = [];
let prettyFlushInProgress = false;

const PRETTY_COLUMNS = [
  "Reg ID",
  "Created At",
  "Member Index",
  "Member Role",
  "Name",
  "Email",
  "Roll",
  "Phone",
  "Discord",
  "Year",
  "Team Name",
  "Domain Preferences",
  "Primary Pref",
  "Secondary Pref",
  "Tertiary Pref",
  "Join MLSC",
];

// Ensure header for pretty sheet (single-row header)
async function ensurePrettySheetHeader(sheets, spreadsheetId, prettyRange) {
  // Merge core header and member group headers
  const mergeRanges = [];
  // core: columns 0..coreCount
  mergeRanges.push({
    startRowIndex: 0,
    endRowIndex: 1,
    startColumnIndex: 0,
    endColumnIndex: coreCount,
  });
  for (let i = 0; i < 3; i++) {
    const start = coreCount + i * 10;
    const end = Math.min(start + 10, totalCols);
    mergeRanges.push({
      startRowIndex: 0,
      endRowIndex: 1,
      startColumnIndex: start,
      endColumnIndex: end,
    });
  }
  mergeRanges.forEach((r) =>
    requests.push({
      mergeCells: {
        range: Object.assign({ sheetId }, r),
        mergeType: "MERGE_ALL",
      },
    })
  );

  // Style top group row and subheader row
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 2 },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          textFormat: { bold: true },
        },
      },
      fields:
        "userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)",
    },
  });

  // Give the group header a subtle background and subheader a light grey background
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.9, green: 0.95, blue: 1 },
        },
      },
      fields: "userEnteredFormat.backgroundColor",
    },
  });
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
        },
      },
      fields: "userEnteredFormat.backgroundColor",
    },
  });

  // Set reasonable column widths (ID small, others wider)
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 90 },
      fields: "pixelSize",
    },
  });
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 1,
        endIndex: totalCols,
      },
      properties: { pixelSize: 150 },
      fields: "pixelSize",
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
  console.log("Wrote and formatted two-row header to Google Sheet");
}

// Flush a batch of rows from the buffer to Google Sheets
async function flushSheetBuffer() {
  if (sheetFlushInProgress) return;
  if (!sheetBuffer.length) return;
  sheetFlushInProgress = true;
  sheetsMetrics.flushAttempts = (sheetsMetrics.flushAttempts || 0) + 1;
  const batch = sheetBuffer.splice(0, SHEET_BATCH_SIZE);
  sheetsMetrics.bufferedRows = sheetBuffer.length;

  try {
    const { google } = require("googleapis");

    // Load credentials from env/file/base64
    let credentials = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        /* ignore */
      }
    }
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      try {
        credentials = JSON.parse(
          Buffer.from(
            process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
            "base64"
          ).toString("utf8")
        );
      } catch (e) {
        /* ignore */
      }
    }
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
      try {
        credentials = require(process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
      } catch (e) {
        /* ignore */
      }
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetRange = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1";
    if (!credentials || !spreadsheetId) {
      throw new Error("Missing Google Sheets credentials or spreadsheet ID");
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    // Ensure header exists - use a safe wrapper that falls back to a single-row header
    await ensureSheetHeaderSafe(sheets, spreadsheetId, sheetRange);

    const values = batch;

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetRange,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    sheetsMetrics.flushSuccesses = (sheetsMetrics.flushSuccesses || 0) + 1;
    sheetsMetrics.totalRowsAppended =
      (sheetsMetrics.totalRowsAppended || 0) + values.length;
    sheetsMetrics.lastSuccess = new Date().toISOString();
    console.log(
      "Flushed",
      values.length,
      "rows to Google Sheets. status:",
      res.status
    );
  } catch (err) {
    sheetsMetrics.flushFailures = (sheetsMetrics.flushFailures || 0) + 1;
    console.warn("flushSheetBuffer error:", err && (err.message || err));
    // Requeue batch at front
    for (let i = batch.length - 1; i >= 0; i--) {
      sheetBuffer.unshift(batch[i]);
    }
  } finally {
    sheetsMetrics.bufferedRows = sheetBuffer.length;
    sheetFlushInProgress = false;
  }
}

// Periodic flush timer
setInterval(() => {
  flushSheetBuffer().catch((e) =>
    console.warn("Periodic flush error:", e && (e.message || e))
  );
}, SHEET_FLUSH_INTERVAL_MS);
async function appendToGoogleSheet(entry) {
  // Simple push-to-buffer implementation. The periodic flusher will handle batch writes and headers.
  try {
    // Team number is incremented per registration (buffered in memory, not persisted)
    if (typeof appendToGoogleSheet.teamCount === "undefined")
      appendToGoogleSheet.teamCount = 0;
    appendToGoogleSheet.teamCount++;
    const teamNumber = appendToGoogleSheet.teamCount;
    const teamName = entry.teamName || "";
    const domains = [
      entry.domainPreference1,
      entry.domainPreference2,
      entry.domainPreference3,
    ]
      .filter(Boolean)
      .join(" | ");
    // Collect all members (primary + up to 3 others, always 4 rows)
    const members = [
      {
        name: entry.name || "",
        email: entry.email || "",
        roll: entry.roll || "",
        phone: entry.phone || "",
        discord: entry.discord || "",
        yearOfStudy: entry.yearOfStudy || "",
        joinmlsc: entry.joinmlsc || "",
        preferences: {
          pref1: entry.domainPreference1 || "",
          pref2: entry.domainPreference2 || "",
          pref3: entry.domainPreference3 || "",
        },
        role: "Primary",
        index: 1,
      },
      ...(Array.isArray(entry.members) ? entry.members : []).map((m, i) => ({
        name: m.name || "",
        email: m.email || "",
        roll: m.roll || "",
        phone: m.phone || "",
        discord: m.discord || "",
        yearOfStudy: m.yearOfStudy || "",
        joinmlsc: m.joinmlsc || "",
        preferences: {
          pref1: (m.preferences && m.preferences.pref1) || "",
          pref2: (m.preferences && m.preferences.pref2) || "",
          pref3: (m.preferences && m.preferences.pref3) || "",
        },
        role: `Member ${i + 2}`,
        index: i + 2,
      })),
    ];
    // Always output 4 member rows (fill with blanks if needed)
    while (members.length < 4) {
      members.push({
        name: "",
        email: "",
        roll: "",
        phone: "",
        discord: "",
        yearOfStudy: "",
        joinmlsc: "",
        preferences: { pref1: "", pref2: "", pref3: "" },
        role: `Member ${members.length + 1}`,
        index: members.length + 1,
      });
    }
    // Write one row per member
    members.forEach((m) => {
      const row = [
        teamNumber,
        teamName,
        m.index,
        m.role,
        m.name,
        m.email,
        m.roll,
        m.phone,
        m.discord,
        m.yearOfStudy,
        m.preferences.pref1 === "" ? "NA" : m.preferences.pref1,
        m.preferences.pref2 === "" ? "NA" : m.preferences.pref2,
        m.preferences.pref3 === "" ? "NA" : m.preferences.pref3,
        m.joinmlsc,
      ];
      sheetBuffer.push(row);
    });
    // Add a visible blank row for spacing after each team
    sheetBuffer.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    sheetsMetrics.bufferedRows = sheetBuffer.length;
    if (sheetBuffer.length >= SHEET_BATCH_SIZE) {
      flushSheetBuffer().catch((e) =>
        console.warn("Immediate flush failed:", e && (e.message || e))
      );
    }
  } catch (err) {
    console.warn(
      "appendToGoogleSheet error (buffering):",
      err && (err.message || err)
    );
  }
}

// Simple in-memory metrics for sheets
const sheetsMetrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  lastSuccess: null,
  lastError: null,
};

// Safe header writer: try the full grouped header first, but if that fails
// Minimal header writer for Google Sheets
async function ensureSheetHeaderSafe(sheets, spreadsheetId, sheetRange) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange,
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_COLUMNS] },
    });
    console.log("Wrote header row to Google Sheet");
  } catch (err) {
    console.warn("Failed to write header row:", err && (err.message || err));
    throw err;
  }
}
// (merge conflicts or other formatting issues), fall back to a single-row

const SESSION_SECRET = process.env.SESSION_SECRET || "change_me_in_production";
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === "true";

// Trust proxy when running behind a reverse proxy (set via env var in production)
if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Use Helmet with stricter production defaults (CSP + HSTS)
// Content-Security-Policy is enabled in production; in dev we disable CSP to avoid blocking dev workflows.
const helmetOptions = {
  contentSecurityPolicy: isProd
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.tailwindcss.com",
            "https:",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:"],
          connectSrc: ["'self'", "https:"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      }
    : false,
};

app.use(Helmet(helmetOptions));
// Additional hardening in production: HSTS
if (isProd) {
  try {
    app.use(
      Helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true })
    );
  } catch (e) {
    console.warn("HSTS configuration skipped:", e && (e.message || e));
  }
}

app.use(pinoHttp({ logger }));

// Configure session store: use MongoStore in production or when MONGODB_URI is present
const sessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: SESSION_COOKIE_SECURE, // set to true when using HTTPS in production
    httpOnly: true,
    sameSite: "lax",
  },
};

if (process.env.MONGODB_URI) {
  sessionOptions.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: parseInt(process.env.SESSION_TTL || "14", 10) * 24 * 60 * 60, // default 14 days
    crypto: { secret: SESSION_SECRET },
  });
}

app.use(session(sessionOptions));

function requireAdminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}
// Middleware to check if admin is logged in
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin/login");
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mlscRegistrationDB";

mongoose
  .connect(MONGODB_URI, {})
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error({ err }, "MongoDB connection error"));

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Allow only 3 submissions per IP in 5 minutes
  message:
    "Too many registration attempts. Please wait 5 minutes and try again.",
  handler: (req, res) => {
    res.status(429).render("fragments/register", {
      errors: ["Too many attempts. Please wait 5 minutes and try again."],
      formData: req.body || {},
    });
  },
});

// Admin login rate limiter (prevent brute-force)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per 15 minutes per IP
  message: "Too many admin login attempts. Try again later.",
});

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middlewares to parse form and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
// Lightweight health check for load-balancers
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// Readiness probe: ensure MongoDB is connected
app.get("/readyz", async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1 = connected
    if (state === 1) return res.status(200).json({ ready: true });
    return res.status(500).json({ ready: false, state });
  } catch (e) {
    return res.status(500).json({ ready: false, error: e && e.message });
  }
});

// Non-blocking health check for email transport. Useful for uptime probes.
app.get("/health/email", async (req, res) => {
  // If mailer doesn't expose verifyTransporter, treat as healthy (non-blocking)
  if (!mailer || typeof mailer.verifyTransporter !== "function") {
    const smtpInfo = {
      host: process.env.SMTP_HOST || null,
      user: maskSensitive(
        process.env.SMTP_USER || process.env.MAIL_USER || null
      ),
    };
    return res
      .status(200)
      .json({ ok: true, note: "no-mailer-verifier", smtp: smtpInfo });
  }

  // Run transporter.verify() with a short timeout to avoid blocking
  const verifyPromise = mailer.verifyTransporter();
  const timeoutMs = parseInt(process.env.EMAIL_HEALTH_TIMEOUT_MS || "3000", 10);

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("verify-timeout")), timeoutMs)
  );

  try {
    await Promise.race([verifyPromise, timeout]);
    return res.status(200).json({
      ok: true,
      smtp: {
        host: process.env.SMTP_HOST || null,
        user: maskSensitive(
          process.env.SMTP_USER || process.env.MAIL_USER || null
        ),
      },
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      error: err && err.message,
      smtp: {
        host: process.env.SMTP_HOST || null,
        user: maskSensitive(
          process.env.SMTP_USER || process.env.MAIL_USER || null
        ),
      },
    });
  }
});

// Mask sensitive strings for display (e.g., email usernames). Keep domain but obfuscate local-part.
function maskSensitive(s) {
  if (!s) return null;
  try {
    if (s.includes("@")) {
      const [local, domain] = s.split("@");
      if (local.length <= 1) return `*@@${domain}`;
      return `${local[0]}***@${domain}`;
    }
    if (s.length <= 4) return "****";
    return `${s.slice(0, 3)}***`;
  } catch (e) {
    return null;
  }
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/fragments/register", (req, res) => {
  res.render("fragments/register", {
    formData: {},
    formErrors: {},
    errors: [],
  });
});

// Full standalone register page
app.get("/register", (req, res) => {
  // render the full-page register view we created
  res.render("register", { discordInvite: process.env.DISCORD_INVITE || "" });
});

app.get("/fragments/about", (req, res) => {
  res.render("fragments/about");
});

app.get("/fragments/thankyou", (req, res) => {
  res.render("fragments/thankyou");
});

app.get("/fragments/team", (req, res) => {
  res.render("fragments/team");
});

app.get("/fragments/lore", (req, res) => {
  res.render("fragments/comingsoon");
});

app.get("/fragments/comingsoon", (req, res) => {
  res.render("fragments/comingsoon");
});

app.get("/timeline", (req, res) => {
  res.render("timeline");
});

app.get("/admin/dashboard", requireAdminAuth, async (req, res) => {
  try {
    const query = {};
    const { year, domain, search } = req.query;

    if (year) query.yearOfStudy = year;
    if (domain) query.domainPreference1 = domain;
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    // Use Mongoose timestamps -> createdAt is provided by the schema
    const entries = await Registration.find(query).sort({ createdAt: -1 });

    res.render("admin/dashboard", {
      entries,
      filters: { year: year || "", domain: domain || "", search: search || "" },
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).send("Failed to load dashboard.");
  }
});

app.get("/admin/export", isAdmin, async (req, res) => {
  try {
    const { year, domain, search } = req.query;
    const query = {};

    if (year) query.yearOfStudy = year;
    if (domain) {
      query.$or = [
        { domainPreference1: domain },
        { domainPreference2: domain },
        { domainPreference3: domain },
      ];
    }
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const entries = await Registration.find(query).lean();

    if (!entries.length) {
      return res.status(404).send("No data to export.");
    }

    // Flatten members into explicit columns (member2_*, member3_*, member4_*)
    const flatRows = entries.map((entry) => {
      const row = {
        id: entry._id ? entry._id.toString() : "",
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : "",
        name: entry.name || "",
        email: entry.email || "",
        roll: entry.roll || "",
        phone: entry.phone || "",
        discord: entry.discord || "",
        yearOfStudy: entry.yearOfStudy || "",
        teamName: entry.teamName || "",
        domainPreference1: entry.domainPreference1 || "",
        domainPreference2: entry.domainPreference2 || "",
        domainPreference3: entry.domainPreference3 || "",
        joinmlsc: entry.joinmlsc || "",
      };

      // Ensure members array exists and map up to 3 additional members (indexes 0..2 => member2..member4)
      const members = Array.isArray(entry.members) ? entry.members : [];
      for (let i = 0; i < 3; i++) {
        const m = members[i] || {};
        const n = i + 2; // member index in label: member2, member3, member4
        row[`member${n}_name`] = m.name || "";
        row[`member${n}_email`] = m.email || "";
        row[`member${n}_roll`] = m.roll || "";
        row[`member${n}_phone`] = m.phone || "";
        row[`member${n}_discord`] = m.discord || "";
        row[`member${n}_yearOfStudy`] = m.yearOfStudy || "";
        row[`member${n}_joinmlsc`] = m.joinmlsc || "";
        // preferences may be an object with pref1/pref2/pref3
        row[`member${n}_pref1`] = (m.preferences && m.preferences.pref1) || "";
        row[`member${n}_pref2`] = (m.preferences && m.preferences.pref2) || "";
        row[`member${n}_pref3`] = (m.preferences && m.preferences.pref3) || "";
      }

      return row;
    });

    // Define ordered CSV fields for consistent column order
    const fields = [
      { label: "ID", value: "id" },
      { label: "Created At", value: "createdAt" },
      { label: "Name", value: "name" },
      { label: "Email", value: "email" },
      { label: "Roll", value: "roll" },
      { label: "Phone", value: "phone" },
      { label: "Discord", value: "discord" },
      { label: "Year", value: "yearOfStudy" },
      { label: "Team Name", value: "teamName" },
      { label: "Domain 1", value: "domainPreference1" },
      { label: "Domain 2", value: "domainPreference2" },
      { label: "Domain 3", value: "domainPreference3" },
      { label: "Join MLSC", value: "joinmlsc" },
    ];

    // Add member columns for member2..member4
    for (let n = 2; n <= 4; n++) {
      fields.push({ label: `Member ${n} Name`, value: `member${n}_name` });
      fields.push({ label: `Member ${n} Email`, value: `member${n}_email` });
      fields.push({ label: `Member ${n} Roll`, value: `member${n}_roll` });
      fields.push({ label: `Member ${n} Phone`, value: `member${n}_phone` });
      fields.push({
        label: `Member ${n} Discord`,
        value: `member${n}_discord`,
      });
      fields.push({
        label: `Member ${n} Year`,
        value: `member${n}_yearOfStudy`,
      });
      fields.push({
        label: `Member ${n} Join MLSC`,
        value: `member${n}_joinmlsc`,
      });
      fields.push({ label: `Member ${n} Pref1`, value: `member${n}_pref1` });
      fields.push({ label: `Member ${n} Pref2`, value: `member${n}_pref2` });
      fields.push({ label: `Member ${n} Pref3`, value: `member${n}_pref3` });
    }

    const parser = new Parser({ fields, withBOM: true });
    const csv = parser.parse(flatRows);

    res.header("Content-Type", "text/csv");
    res.attachment("registrations.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).send("Error exporting data.");
  }
});

app.post("/admin/delete/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Registration.findByIdAndDelete(id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Failed to delete entry.");
  }
});

app.get("/admin", (req, res) => {
  res.render("admin/login", { error: null });
});
app.get("/admin/login", (req, res) => {
  const error = req.session.loginError || null;
  delete req.session.loginError;
  res.render("admin/login", { error });
});

app.post("/admin/login", adminLoginLimiter, async (req, res) => {
  // Accept either email or username from the form (some pages use `username` input)
  const { email, username, password } = req.body || {};
  const identifier = (email || username || "").toString().trim();

  if (!identifier || !password) {
    return res
      .status(400)
      .render("admin/login", { error: "Please provide credentials." });
  }

  try {
    // Try to find by email OR username so seeded admin (username field) works
    const admin = await Admin.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!admin) {
      logger.warn({ identifier }, "Admin login failed: user not found");
      return res
        .status(401)
        .render("admin/login", { error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      logger.warn(
        { adminId: admin._id, identifier },
        "Admin login failed: wrong password"
      );
      return res
        .status(401)
        .render("admin/login", { error: "Invalid credentials." });
    }

    // Set session
    req.session.isAdmin = true;
    req.session.adminId = admin._id;

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).render("admin/login", {
      error: "Internal server error. Please try again.",
    });
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Error during logout.");
    }
    res.redirect("/admin/login");
  });
});

// Admin-only test route to verify Google Sheets connectivity
app.get("/admin/test-sheet", isAdmin, async (req, res) => {
  try {
    const testRow = {
      name: "TEST_ROW",
      email: "test@example.com",
      roll: "TEST",
      discord: "tester#0000",
      phone: "0000000000",
      yearOfStudy: "First Year",
      teamName: "Testers",
      domainPreference1: "Tech",
      domainPreference2: "",
      domainPreference3: "",
      joinmlsc: "yes",
      members: [],
    };

    await appendToGoogleSheet(testRow);
    res.json({ ok: true, message: "Test row appended (check sheet)." });
  } catch (err) {
    console.error("Test sheet append failed:", err);
    res.status(500).json({ ok: false, error: err && (err.message || err) });
  }
});

app.post("/register", upload.none(), async (req, res) => {
  const body = req.body || {};

  // Basic personal required fields
  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim();
  const roll = (body.roll || "").toString().trim();
  const discord = (body.discord || "").toString().trim();
  const phoneRaw = (body.phone || "").toString();
  const phone = phoneRaw.replace(/\D/g, "");
  const year = (body.year || body.yearOfStudy || "").toString();
  const joinmlsc = (body.mlsc_member_1 || body.joinmlsc || "").toString();

  // Preferences
  const pref1 = (body.pref1 || "").toString();
  const pref2 = (body.pref2 || "").toString();
  const pref3 = (body.pref3 || "").toString();

  // Team / members
  const teamName = (body.teamName || "").toString();

  // Project/motivation
  const projectTitle = (body.projectTitle || "").toString();
  const projectIdea = (body.projectIdea || "").toString();
  const projectLink = (body.projectLink || "").toString();

  // Agreements
  const agree1 = !!body.agree1;
  const agree2 = !!body.agree2;
  const agree3 = !!body.agree3;

  const errors = [];
  const formErrors = {};

  // Personal validation
  if (!name || name.length < 3) {
    errors.push("Name is required and must be at least 3 characters.");
    formErrors.name = true;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("A valid email is required.");
    formErrors.email = true;
  }
  if (!roll || roll.length < 2) {
    errors.push("Roll number is required.");
    formErrors.roll = true;
  }
  if (!discord || discord.length < 3) {
    errors.push("Discord username is required.");
    formErrors.discord = true;
  }
  if (!phone || phone.length < 8) {
    errors.push("Phone number is required (at least 8 digits).");
    formErrors.phone = true;
  }
  if (!year) {
    errors.push("Please select your year.");
    formErrors.year = true;
  }

  // Preferences: pref1 required only if joinmlsc is yes/not-sure
  const joinVal = (joinmlsc || "").toLowerCase();
  if (joinVal === "yes" || joinVal === "not-sure") {
    if (!pref1) {
      errors.push(
        "Primary preference is required when you indicate you want to join MLSC."
      );
      formErrors.pref1 = true;
    }
  }

  // Members: if any field of a member is provided, validate that member's personal fields (same as personal rules)
  // Members 2..4: optional. If any field for a member is provided, validate that member and include it in the saved members array.
  const members = [];
  for (let i = 2; i <= 4; i++) {
    const mname = (body[`member${i}_name`] || "").toString().trim();
    const memail = (body[`member${i}_email`] || "").toString().trim();
    const mroll = (body[`member${i}_roll`] || "").toString().trim();
    const mdiscord = (body[`member${i}_discord`] || "").toString().trim();
    const mphone = (body[`member${i}_phone`] || "")
      .toString()
      .replace(/\D/g, "");
    const myear = (body[`member${i}_year`] || "").toString();
    const mjoin = (body[`mlsc_member_${i}`] || "").toString();
    const mpref1 = (body[`member${i}_pref1`] || "").toString();

    const hasAny = !!(
      mname ||
      memail ||
      mroll ||
      mdiscord ||
      mphone ||
      myear ||
      mjoin ||
      mpref1 ||
      body[`member${i}_pref2`] ||
      body[`member${i}_pref3`]
    );

    if (!hasAny) {
      // skip this member entirely — user didn't provide any fields for member i
      continue;
    }

    // Validate provided member fields
    if (!mname || mname.length < 2) {
      errors.push(`Member ${i}: name is required.`);
      formErrors[`member${i}_name`] = true;
    }
    if (!memail || !/^\S+@\S+\.\S+$/.test(memail)) {
      errors.push(`Member ${i}: valid email is required.`);
      formErrors[`member${i}_email`] = true;
    }
    if (!mroll) {
      errors.push(`Member ${i}: roll number is required.`);
      formErrors[`member${i}_roll`] = true;
    }
    if (!mdiscord) {
      errors.push(`Member ${i}: discord is required.`);
      formErrors[`member${i}_discord`] = true;
    }
    if (!mphone || mphone.length < 8) {
      errors.push(`Member ${i}: phone is required (min 8 digits).`);
      formErrors[`member${i}_phone`] = true;
    }
    if (!myear) {
      errors.push(`Member ${i}: year is required.`);
      formErrors[`member${i}_year`] = true;
    }

    // member preference primary required only when the member indicated joining MLSC
    const mjoinVal = (mjoin || "").toLowerCase();
    if ((mjoinVal === "yes" || mjoinVal === "not-sure") && !mpref1) {
      errors.push(`Member ${i}: primary preference (pref1) is required.`);
      formErrors[`member${i}_pref1`] = true;
    }

    members.push({
      name: mname,
      email: memail,
      roll: mroll,
      phone: mphone,
      discord: mdiscord,
      yearOfStudy:
        myear === "1" ? "First Year" : myear === "2" ? "Second Year" : myear,
      joinmlsc: mjoin,
      preferences: {
        pref1: mpref1,
        pref2: body[`member${i}_pref2`] || "",
        pref3: body[`member${i}_pref3`] || "",
      },
    });
  }

  // Agreements required
  if (!agree1 || !agree2 || !agree3) {
    errors.push("All agreements must be accepted to submit registration.");
    formErrors.agreements = true;
  }

  // Team name required
  if (!teamName || teamName.trim().length === 0) {
    errors.push("Team name is required.");
    formErrors.teamName = true;
  }

  // project idea optional per your request; but if present, enforce min length 5 (soft)
  if (
    projectIdea &&
    projectIdea.trim().length > 0 &&
    projectIdea.trim().length < 5
  ) {
    errors.push("Short idea should be at least 5 characters if provided.");
    formErrors.projectIdea = true;
  }

  const formData = Object.assign({}, body, { members });

  if (errors.length > 0) {
    // If the client prefers JSON (fetch/XHR), return structured JSON so the frontend can display per-field errors.
    const accept = (req.get && req.get("Accept")) || "";
    const wantsJson =
      req.xhr ||
      (accept && accept.indexOf("application/json") !== -1) ||
      req.get("X-Requested-With") === "XMLHttpRequest";
    if (wantsJson) {
      return res.status(400).json({ errors, formErrors, formData });
    }

    // Otherwise render the register view for regular browser form submits
    return res.status(400).render("register", {
      errors,
      formData,
      formErrors,
    });
  }

  try {
    // DEBUG: Log the incoming data
    console.log("🔍 DEBUG - Registration data:", {
      name,
      email,
      roll,
      discord,
      phone,
      year,
      joinmlsc,
      teamName,
      agree1,
      agree2,
      agree3,
    });

    // Always store 4 member objects per team, blank fields except preferences as 'NA' if blank
    const allMembers = [
      {
        name: name || "",
        email: email || "",
        roll: roll || "",
        phone: phone || "",
        discord: discord || "",
        yearOfStudy,
        joinmlsc: joinmlsc || "",
        preferences: {
          pref1: pref1 === "" ? "NA" : pref1,
          pref2: pref2 === "" ? "NA" : pref2,
          pref3: pref3 === "" ? "NA" : pref3,
        },
      },
      ...(Array.isArray(members) ? members : []).map((m) => ({
        name: m.name || "",
        email: m.email || "",
        roll: m.roll || "",
        phone: m.phone || "",
        discord: m.discord || "",
        yearOfStudy:
          m.yearOfStudy &&
          (m.yearOfStudy === "First Year" || m.yearOfStudy === "Second Year")
            ? m.yearOfStudy
            : undefined,
        joinmlsc: m.joinmlsc || "",
        preferences: {
          pref1:
            m.preferences && m.preferences.pref1 === ""
              ? "NA"
              : (m.preferences && m.preferences.pref1) || "NA",
          pref2:
            m.preferences && m.preferences.pref2 === ""
              ? "NA"
              : (m.preferences && m.preferences.pref2) || "NA",
          pref3:
            m.preferences && m.preferences.pref3 === ""
              ? "NA"
              : (m.preferences && m.preferences.pref3) || "NA",
        },
      })),
    ];
    console.log(
      "🔍 DEBUG - allMembers before filtering:",
      allMembers.length,
      allMembers.map((m) => ({
        name: m.name,
        hasData: !!(m.name || m.email || m.roll),
      }))
    );

    // Filter out completely empty members to avoid schema validation issues
    const nonEmptyMembers = allMembers.filter(
      (m) => !!(m.name || m.email || m.roll)
    );
    console.log(
      "🔍 DEBUG - nonEmptyMembers after filtering:",
      nonEmptyMembers.length
    );
    const yearOfStudy =
      year === "1" ? "First Year" : year === "2" ? "Second Year" : year;
    console.log("🔍 DEBUG - Transformed year:", {
      originalYear: year,
      yearOfStudy,
    });

    const toSave = {
      name,
      email,
      roll,
      discord,
      phone,
      yearOfStudy,
      domainPreference1: pref1 || "",
      domainPreference2: pref2 || "",
      domainPreference3: pref3 || "",
      joinmlsc: joinmlsc || "",
      teamName: teamName || "",
      members: nonEmptyMembers,
      projects: (projectTitle || "") + (projectLink ? " | " + projectLink : ""),
      motivation: projectIdea || "",
      agreements: { agree1: !!agree1, agree2: !!agree2, agree3: !!agree3 },
    };

    console.log("🔍 DEBUG - Data to save:", JSON.stringify(toSave, null, 2));

    const newEntry = new Registration(toSave);
    console.log("🔍 DEBUG - Created registration document");

    await newEntry.save();
    console.log("🔍 DEBUG - Successfully saved to database");

    // Best-effort: append to Google Sheets (won't block the response on failure)
    try {
      appendToGoogleSheet(
        Object.assign({}, toSave, {
          _id: newEntry._id,
          createdAt: newEntry.createdAt,
        })
      );
    } catch (e) {
      console.warn("Google Sheets append failed:", e && (e.message || e));
    }

    // TEMP: Disable email sending to isolate the issue
    console.log("🔍 DEBUG - Skipping email sending for now");
    /*
    try {
      // build recipients: primary email + member emails
      const recipients = [email];
      if (Array.isArray(members) && members.length) {
        members.forEach((m) => {
          if (m && m.email) recipients.push(m.email);
        });
      }

      // send confirmation email with attached PDF summary
      await mailer.sendConfirmationEmail(recipients, toSave);
    } catch (mailErr) {
      console.warn(
        "Failed to send confirmation email:",
        mailErr && (mailErr.message || mailErr)
      );
    }
    */

    // Render thank you (full page)
    return res.render("fragments/thankyou", { name });
  } catch (err) {
    console.error("🚨 Error saving to DB:", err);
    console.error("🚨 Full error details:", JSON.stringify(err, null, 2));
    if (err.errors) {
      console.error("🚨 Validation errors:", err.errors);
    }
    // detect duplicate key (usually email unique index)
    let userMessage = "An error occurred. Try again later.";
    let statusCode = 500;
    if (err && (err.code === 11000 || err.code === 11001)) {
      // duplicate key
      statusCode = 409;
      userMessage = "A registration with the provided email already exists.";
    }

    const accept = (req.get && req.get("Accept")) || "";
    const wantsJson =
      req.xhr ||
      (accept && accept.indexOf("application/json") !== -1) ||
      req.get("X-Requested-With") === "XMLHttpRequest";
    if (wantsJson) {
      // include formErrors when possible (e.g., duplicate key contains keyValue)
      const formErrors = {};
      try {
        const kv =
          err &&
          (err.keyValue || (err.errorResponse && err.errorResponse.keyValue));
        if (kv && typeof kv === "object") {
          Object.keys(kv).forEach((k) => (formErrors[k] = true));
        }
      } catch (e) {}

      return res.status(statusCode).json({
        errors: [userMessage],
        code: err && err.code ? err.code : undefined,
        formErrors: Object.keys(formErrors).length ? formErrors : undefined,
      });
    }

    return res.status(statusCode).render("fragments/error", {
      title: "⚠️ Server error",
      message: userMessage,
    });
  }
});

// DEBUG: Simple registration test endpoint
app.post("/debug-register", async (req, res) => {
  try {
    console.log("🔍 DEBUG ENDPOINT - Testing registration components...");

    // Test 1: Database connection
    console.log("Test 1: Database connection");
    const dbState = mongoose.connection.readyState;
    console.log("Database state:", dbState); // 1 = connected

    // Test 2: Create minimal registration
    console.log("Test 2: Creating minimal registration");
    const testData = {
      name: "vasnhaj",  // From your actual form
      email: "vsahram@gmail.com", // Fixed email 
      roll: "1024160114",
      discord: "vsharm",
      phone: "7973209774",
      yearOfStudy: "First Year", // Transformed from year: "1"
      domainPreference1: "", // Empty like form
      domainPreference2: "",
      domainPreference3: "",
      joinmlsc: "no",
      teamName: "vgavsh",
      members: [], // Empty members array like the filtered result
      projects: "",
      motivation: "",
      agreements: { agree1: true, agree2: true, agree3: true },
    };

    console.log("Creating registration with data:", testData);
    const newEntry = new Registration(testData);
    console.log("Registration document created");

    await newEntry.save();
    console.log("Registration saved successfully!");

    res.json({
      success: true,
      message: "Debug registration successful",
      id: newEntry._id,
      dbState: dbState,
    });
  } catch (error) {
    console.error("🚨 DEBUG ENDPOINT ERROR:", error);
    console.error("🚨 Error name:", error.name);
    console.error("🚨 Error message:", error.message);
    if (error.errors) {
      console.error("🚨 Validation errors:", error.errors);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      name: error.name,
      validationErrors: error.errors,
    });
  }
});

// Start server with pre-start checks (verify SMTP in production)
const PORT = process.env.PORT || 3000;

async function start() {
  if (isProd) {
    // Try to verify transporter but don't abort startup on failure. Mail sending
    // is best-effort; failing verification should not bring down the entire app.
    (async () => {
      try {
        if (typeof mailer.verifyTransporter === "function") {
          await mailer.verifyTransporter();
          console.log("SMTP transporter verified");
        } else {
          console.warn(
            "Mailer verifyTransporter not available; skipping SMTP verification"
          );
        }
      } catch (err) {
        console.warn(
          "SMTP verification failed (continuing startup):",
          err && (err.message || err)
        );
      }
    })();
  }

  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
}

start().catch((err) => {
  console.error("Failed to start server:", err && (err.message || err));
  process.exit(1);
});
