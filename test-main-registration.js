const fetch = require("node-fetch");

async function testMainRegistration() {
  const url = "https://mlsc-xyyzo.ondigitalocean.app/register";

  // This is the exact same data that works for debug endpoint
  // but formatted as form data for main endpoint
  const formData = new URLSearchParams({
    name: "Test User",
    email: "test@example.com",
    roll: "TEST123",
    discord: "testuser#1234",
    phone: "1234567890",
    year: "2",
    joinmlsc: "yes",
    pref1: "AI/ML",
    pref2: "Web Development",
    pref3: "Mobile Development",
    teamName: "Test Team",
    projectTitle: "Test Project",
    projectIdea: "This is a test project idea for debugging purposes.",
    projectLink: "https://github.com/test/project",
    agree1: "on",
    agree2: "on",
    agree3: "on",
    // No members for this test - just main person
  });

  console.log("🧪 Testing main registration endpoint...");
  console.log("📤 Sending form data:", formData.toString());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData,
    });

    console.log("📊 Response Status:", response.status);
    console.log("📋 Response Headers:", Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log("📄 Response Body:", responseText);

    if (response.ok) {
      console.log("✅ Main registration succeeded");
    } else {
      console.log("❌ Main registration failed");
      console.log("🔍 Error Details:", responseText);
    }
  } catch (error) {
    console.error("🚨 Request failed:", error.message);
  }
}

testMainRegistration();
