#!/usr/bin/env node

/**
 * Test Registration with Direct JSON (bypass multipart)
 */

const fetch = require("node-fetch");

async function testRegistrationJSON() {
  const testData = {
    // Personal details
    name: "Test User",
    email: "test@gmail.com",
    roll: "1024160114",
    year: "1",
    phone: "7973209774",
    discord: "testuser#1234",
    mlsc_member_1: "no",

    // Team
    teamName: "Test Team",

    // Agreements
    agree1: true,
    agree2: true,
    agree3: true,

    // Empty optional fields
    pref1: "",
    pref2: "",
    pref3: "",
    projectTitle: "",
    projectIdea: "",
    projectLink: "",
  };

  try {
    console.log("🧪 Testing registration with JSON...");

    const response = await fetch(
      "https://mlsc-xyyzo.ondigitalocean.app/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(testData),
      }
    );

    console.log("📊 Response Status:", response.status);

    const responseText = await response.text();
    console.log("📄 Response Body:", responseText);

    if (response.ok) {
      console.log("✅ Registration successful!");
    } else {
      console.log("❌ Registration failed");
    }
  } catch (error) {
    console.error("💥 Network Error:", error.message);
  }
}

testRegistrationJSON();
