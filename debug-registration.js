#!/usr/bin/env node

/**
 * Debug Registration Submission
 * Test the registration with valid data to isolate the issue
 */

const fetch = require("node-fetch");

async function testRegistration() {
  const testData = new URLSearchParams({
    // Personal details
    name: "Test User",
    email: "test@gmail.com", // Fixed email
    roll: "1024160114",
    year: "1",
    phone: "7973209774",
    discord: "testuser#1234",
    mlsc_member_1: "no",

    // Preferences (not required if mlsc_member_1 is 'no')
    pref1: "",
    pref2: "",
    pref3: "",

    // Team details
    teamName: "Test Team",

    // Agreements (required)
    agree1: "on",
    agree2: "on",
    agree3: "on",

    // Optional project fields
    projectTitle: "",
    projectIdea: "",
    projectLink: "",

    // Member fields (optional - leave empty)
    member2_name: "",
    member2_email: "",
    member2_roll: "",
    member2_phone: "",
    member2_discord: "",
    member2_year: "",
    mlsc_member_2: "",

    member3_name: "",
    member3_email: "",
    member3_roll: "",
    member3_phone: "",
    member3_discord: "",
    member3_year: "",
    mlsc_member_3: "",

    member4_name: "",
    member4_email: "",
    member4_roll: "",
    member4_phone: "",
    member4_discord: "",
    member4_year: "",
    mlsc_member_4: "",
  });

  try {
    console.log("🧪 Testing registration submission...");

    const response = await fetch(
      "https://mlsc-xyyzo.ondigitalocean.app/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: testData.toString(),
      }
    );

    console.log("📊 Response Status:", response.status);
    console.log(
      "📋 Response Headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("📄 Response Body:", responseText);

    if (response.ok) {
      console.log("✅ Registration successful!");
    } else {
      console.log("❌ Registration failed");
      try {
        const jsonData = JSON.parse(responseText);
        console.log("🔍 Error Details:", jsonData);
      } catch (e) {
        console.log("📄 Raw Error Response:", responseText);
      }
    }
  } catch (error) {
    console.error("💥 Network Error:", error.message);
  }
}

testRegistration();
