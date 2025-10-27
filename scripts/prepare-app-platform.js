#!/usr/bin/env node

/**
 * Generate Base64 encoded Google Service Account JSON for DigitalOcean App Platform
 *
 * This script reads the GOOGLE_SERVICE_ACCOUNT_JSON from .env and converts it to base64
 * for use in App Platform environment variables.
 */

require("dotenv").config();

function generateBase64ServiceAccount() {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      console.error("❌ GOOGLE_SERVICE_ACCOUNT_JSON not found in .env file");
      console.log("\n💡 Make sure your .env file contains:");
      console.log('GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}');
      process.exit(1);
    }

    // Validate JSON format
    try {
      const parsed = JSON.parse(serviceAccountJson);
      console.log("✅ Service account JSON is valid");
      console.log(`📧 Client email: ${parsed.client_email}`);
      console.log(`🔑 Private key ID: ${parsed.private_key_id}`);
    } catch (parseError) {
      console.error("❌ Invalid JSON format in GOOGLE_SERVICE_ACCOUNT_JSON");
      console.error(parseError.message);
      process.exit(1);
    }

    // Convert to base64
    const base64 = Buffer.from(serviceAccountJson).toString("base64");

    console.log("\n🔐 Base64 encoded service account for App Platform:");
    console.log("━".repeat(80));
    console.log(base64);
    console.log("━".repeat(80));

    console.log("\n📋 Copy the above base64 string and use it as:");
    console.log(
      "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 in your App Platform environment variables"
    );

    console.log("\n⚠️  SECURITY NOTE:");
    console.log("- This base64 string contains your private key");
    console.log("- Keep it secure and never commit it to version control");
    console.log(
      "- Only use it in App Platform's encrypted environment variables"
    );

    return base64;
  } catch (error) {
    console.error("❌ Error generating base64 service account:");
    console.error(error.message);
    process.exit(1);
  }
}

// Generate if run directly
if (require.main === module) {
  generateBase64ServiceAccount();
}

module.exports = { generateBase64ServiceAccount };
