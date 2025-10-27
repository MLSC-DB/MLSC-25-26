#!/usr/bin/env node

/**
 * Production Admin Seeder for MongoDB Atlas
 *
 * Creates admin user in production MongoDB Atlas database
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../server/src/models/Admin");
require("dotenv").config();

async function createProductionAdmin() {
  try {
    // Use production MongoDB URI
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error("❌ MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    console.log("🔗 Connecting to production MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB Atlas");

    const username = process.env.ADMIN_USERNAME || "mlscadmin";
    const plainPassword = process.env.ADMIN_PASSWORD;

    if (!plainPassword) {
      console.error(
        "❌ Please provide ADMIN_PASSWORD as environment variable.\n" +
          "Example: ADMIN_PASSWORD=SecurePassword123 node scripts/seed-production-admin.js"
      );
      process.exit(1);
    }

    console.log(`👤 Creating admin user: ${username}`);

    // Check if admin already exists
    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log("⚠️ Admin user already exists in production database");
      console.log("✅ Admin setup complete - you can now login");
      await mongoose.disconnect();
      return;
    }

    // Create admin with hashed password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const admin = new Admin({
      username,
      password: hashedPassword,
      email: `${username}@mlsc.local`, // Optional email field
    });

    await admin.save();

    console.log("🎉 Production admin created successfully!");
    console.log("📋 Login credentials:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${plainPassword}`);
    console.log(
      "🔐 You can now login at: https://mlsc-xyyzo.ondigitalocean.app/admin"
    );
  } catch (error) {
    console.error("❌ Error creating production admin:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔒 Database connection closed");
  }
}

// Run if called directly
if (require.main === module) {
  createProductionAdmin();
}

module.exports = { createProductionAdmin };
// $env:ADMIN_PASSWORD="admin123"; node scripts/seed-production-admin.js