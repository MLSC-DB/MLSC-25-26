// Test Google Sheets authentication without exposing credentials
const { google } = require("googleapis");

async function testGoogleAuth() {
  try {
    console.log("🔍 Testing Google Sheets authentication...");

    // Check if environment variables exist
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasSheetId = !!process.env.GOOGLE_SHEET_ID;

    console.log("📋 Environment check:");
    console.log(
      "   GOOGLE_SERVICE_ACCOUNT_KEY:",
      hasServiceAccount ? "Present" : "Missing"
    );
    console.log("   GOOGLE_SHEET_ID:", hasSheetId ? "Present" : "Missing");

    if (!hasServiceAccount) {
      console.log("❌ GOOGLE_SERVICE_ACCOUNT_KEY not found in environment");
      return;
    }

    if (!hasSheetId) {
      console.log("⚠️ GOOGLE_SHEET_ID not found - Sheets integration disabled");
      return;
    }

    // Try to decode the service account key
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
      );
      console.log("✅ Service account key decoded successfully");
      console.log("📝 Service account email:", serviceAccountKey.client_email);
    } catch (decodeError) {
      console.log(
        "❌ Failed to decode service account key:",
        decodeError.message
      );
      return;
    }

    // Try to create auth client
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    console.log("🔐 Creating authenticated client...");
    const authClient = await auth.getClient();
    console.log("✅ Auth client created successfully");

    // Try to get access token
    const accessToken = await authClient.getAccessToken();
    if (accessToken.token) {
      console.log("✅ Access token obtained successfully");
    } else {
      console.log("❌ Failed to obtain access token");
    }

    console.log("🎉 Google authentication test completed successfully");
  } catch (error) {
    console.error("❌ Google authentication test failed:");
    console.error("   Error:", error.message);

    if (error.message.includes("invalid_grant")) {
      console.log(
        "💡 Solution: The service account key appears to be invalid or expired."
      );
      console.log("   1. Go to Google Cloud Console");
      console.log("   2. Navigate to IAM & Admin > Service Accounts");
      console.log("   3. Create a new key for your service account");
      console.log("   4. Download the JSON file");
      console.log(
        "   5. Base64 encode it and update GOOGLE_SERVICE_ACCOUNT_KEY"
      );
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testGoogleAuth();
}

module.exports = { testGoogleAuth };
