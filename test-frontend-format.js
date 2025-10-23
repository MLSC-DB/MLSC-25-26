const fetch = require("node-fetch");

async function testFrontendFormat() {
  const url = "https://mlsc-xyyzo.ondigitalocean.app/register";

  // This mimics exactly what the frontend JavaScript sends
  const formData = new URLSearchParams();

  // Basic info (as frontend sends)
  formData.append("name", "Frontend Test User");
  formData.append("email", "frontend.test@example.com");
  formData.append("phone", "1234567890"); // digits only
  formData.append("yearOfStudy", "Second Year"); // transformed by frontend
  formData.append("pref1", "AI/ML");
  formData.append("pref2", "Web Development");
  formData.append("pref3", "Mobile Development");
  formData.append("teamName", "Frontend Test Team");
  formData.append("roll", "FRONT123");
  formData.append("discord", "frontendtest#1234");
  formData.append("mlsc_member_1", "yes"); // frontend uses mlsc_member_1

  // Project info
  formData.append("projectTitle", "Frontend Test Project");
  formData.append("projectIdea", "This is a test from frontend format");
  formData.append("projectLink", "https://github.com/test/frontend");

  // Agreements
  formData.append("agree1", "on");
  formData.append("agree2", "on");
  formData.append("agree3", "on");

  // Members (empty as frontend would send)
  for (let i = 2; i <= 4; i++) {
    ["name", "email", "roll", "phone", "discord", "year"].forEach((field) => {
      formData.append(`member${i}_${field}`, "");
    });
    ["pref1", "pref2", "pref3"].forEach((pref) => {
      formData.append(`member${i}_${pref}`, "");
    });
    formData.append(`mlsc_member_${i}`, "");
  }

  formData.append("submittedAt", new Date().toISOString());

  console.log("🧪 Testing frontend format...");
  console.log("📤 Form data keys:", Array.from(formData.keys()));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData,
    });

    console.log("📊 Response Status:", response.status);
    console.log(
      "📋 Response Headers Content-Type:",
      response.headers.get("content-type")
    );

    const responseText = await response.text();

    if (response.ok) {
      console.log("✅ Frontend format registration succeeded!");
      if (responseText.includes("Thank you")) {
        console.log("📝 Got thank you page - registration worked!");
      }
    } else {
      console.log("❌ Frontend format registration failed");
      console.log("📄 Response:", responseText.substring(0, 500));
    }
  } catch (error) {
    console.error("🚨 Request failed:", error.message);
  }
}

testFrontendFormat();
