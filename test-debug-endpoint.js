#!/usr/bin/env node

/**
 * Test Debug Registration Endpoint
 */

const fetch = require("node-fetch");

async function testDebugEndpoint() {
  try {
    console.log("🔍 Testing debug registration endpoint...");

    const response = await fetch(
      "https://mlsc-xyyzo.ondigitalocean.app/debug-register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}), // Empty body, endpoint uses hardcoded test data
      }
    );

    console.log("📊 Response Status:", response.status);

    const responseText = await response.text();
    console.log("📄 Response Body:", responseText);

    if (response.ok) {
      console.log("✅ Debug test successful!");
      const data = JSON.parse(responseText);
      console.log("🎯 Created registration ID:", data.id);
      console.log("🗄️ Database state:", data.dbState);
    } else {
      console.log("❌ Debug test failed");
      try {
        const errorData = JSON.parse(responseText);
        console.log("🔍 Error details:", errorData);
      } catch (e) {
        console.log("📄 Raw error:", responseText);
      }
    }
  } catch (error) {
    console.error("💥 Network Error:", error.message);
  }
}

testDebugEndpoint();
