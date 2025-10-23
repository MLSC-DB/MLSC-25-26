const fetch = require("node-fetch");

async function checkLastError() {
  const url = "https://mlsc-xyyzo.ondigitalocean.app/debug-error";

  console.log("🔍 Checking last registration error...");

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("📊 Status:", response.status);
    console.log("📄 Error Details:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("🚨 Request failed:", error.message);
  }
}

checkLastError();
