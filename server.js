const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const upload = multer();
const mongoose = require("mongoose");
const Registration = require("./server/src/models/Registration");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { error } = require("console");
const Admin = require("./server/src/models/Admin");
const { Parser } = require("json2csv");
require("dotenv").config();
const { sendConfirmationEmail } = require("./server/src/utils/mailer");

app.use(
  session({
    secret: "supersecretkey", // change this
    resave: false,
    saveUninitialized: true,
  })
);

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

mongoose
  .connect("mongodb://127.0.0.1:27017/mlscRegistrationDB", {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middlewares to parse form and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
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

    const entries = await Registration.find(query).sort({ submittedAt: -1 });

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
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { projects: regex },
        { motivation: regex },
      ];
    }

    const entries = await Registration.find(query).lean();

    if (!entries.length) {
      return res.status(404).send("No data to export.");
    }

    const parser = new Parser();
    const csv = parser.parse(entries);

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

app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).render("admin/login", {
        error: "Invalid credentials.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).render("admin/login", {
        error: "Invalid credentials.",
      });
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

app.post("/register", upload.none(), async (req, res) => {
  const {
    name,
    email,
    phone,
    yearOfStudy,
    domainPreference1,
    domainPreference2,
    domainPreference3,
    projects,
    motivation,
  } = req.body;

  const formData = {
    name,
    email,
    phone,
    yearOfStudy,
    domainPreference1,
    domainPreference2,
    domainPreference3,
    projects,
    motivation,
  };

  const errors = [];
  const formErrors = {};

  if (!name || name.trim().length < 3) {
    errors.push("Name must be at least 3 characters.");
    formErrors.name = true;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Valid email is required.");
    formErrors.email = true;
  }
  if (!phone || phone.length < 8) {
    errors.push("Phone number must be at least 8 digits.");
    formErrors.phone = true;
  }
  if (!yearOfStudy) {
    errors.push("Please select year of study.");
    formErrors.yearOfStudy = true;
  }
  if (!domainPreference1) {
    errors.push("At least one domain preference is required.");
    formErrors.domainPreference1 = true;
  }
  if (!motivation || motivation.trim().length < 10) {
    errors.push("Motivation must be more detailed (min 10 chars).");
    formErrors.motivation = true;
  }

  if (errors.length > 0) {
    return res.status(400).render("fragments/register", {
      errors,
      formData,
      formErrors,
    });
  }

  try {
    const newEntry = new Registration(formData);
    await newEntry.save();

    await sendConfirmationEmail(email, name);

    res.render("fragments/thankyou", { name });
  } catch (err) {
    console.error("Error saving to DB:", err);
    res.status(500).render("fragments/error", {
      message: "An error occurred. Try again later.",
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
