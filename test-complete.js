const fetch = require("node-fetch");

async function testCompleteRegistration() {
  const url = "https://mlsc-xyyzo.ondigitalocean.app/register";

  // Complete registration with unique email
  const timestamp = Date.now();
  const formData = new URLSearchParams({
    name: "Test User Complete",
    email: `test.complete.${timestamp}@example.com`,
    roll: `TEST${timestamp}`,
    discord: "testcomplete#1234",
    phone: "9876543210",
    year: "2",
    joinmlsc: "yes",
    pref1: "AI/ML",
    pref2: "Web Development",
    pref3: "Mobile Development",
    teamName: "Complete Test Team",
    projectTitle: "Complete Test Project",
    projectIdea:
      "This is a complete test project idea with all functionality enabled.",
    projectLink: "https://github.com/test/complete-project",
    agree1: "on",
    agree2: "on",
    agree3: "on",
  });

  console.log("🧪 Testing complete registration with email...");
  console.log("📧 Email:", `test.complete.${timestamp}@example.com`);

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

    if (response.ok) {
      console.log("✅ Complete registration succeeded!");
      console.log("📝 This should have triggered:");
      console.log("   - Database storage");
      console.log("   - PDF generation");
      console.log("   - Email confirmation");
      console.log("   - Google Sheets sync (if enabled)");
    } else {
      const responseText = await response.text();
      console.log("❌ Registration failed");
      console.log("📄 Response:", responseText);
    }
  } catch (error) {
    console.error("🚨 Request failed:", error.message);
  }
}

testCompleteRegistration();
