// Test what validation errors would occur with minimal data
console.log("🔍 Frontend Validation Test");

// Simulate minimal form data that might cause validation errors
const testCases = [
  {
    name: "Missing Agreements",
    data: {
      name: "Test User",
      email: "test@example.com",
      roll: "TEST123",
      discord: "test#1234",
      phone: "1234567890",
      year: "2",
      teamName: "Test Team",
      joinmlsc: "yes",
      pref1: "AI/ML",
      // Missing: agree1, agree2, agree3
    },
  },
  {
    name: "Missing Team Name",
    data: {
      name: "Test User",
      email: "test@example.com",
      roll: "TEST123",
      discord: "test#1234",
      phone: "1234567890",
      year: "2",
      joinmlsc: "yes",
      pref1: "AI/ML",
      agree1: true,
      agree2: true,
      agree3: true,
      // Missing: teamName
    },
  },
  {
    name: "Missing Preference when Join MLSC=Yes",
    data: {
      name: "Test User",
      email: "test@example.com",
      roll: "TEST123",
      discord: "test#1234",
      phone: "1234567890",
      year: "2",
      teamName: "Test Team",
      joinmlsc: "yes",
      // Missing: pref1 (required when joinmlsc=yes)
      agree1: true,
      agree2: true,
      agree3: true,
    },
  },
  {
    name: "Partial Member Info",
    data: {
      name: "Test User",
      email: "test@example.com",
      roll: "TEST123",
      discord: "test#1234",
      phone: "1234567890",
      year: "2",
      teamName: "Test Team",
      joinmlsc: "yes",
      pref1: "AI/ML",
      agree1: true,
      agree2: true,
      agree3: true,
      // Partial member 2 data (triggers validation for member 2)
      member2_name: "Member 2",
      // Missing: member2_email, member2_roll, etc.
    },
  },
];

testCases.forEach((testCase) => {
  console.log(`\n📋 Testing: ${testCase.name}`);
  const data = testCase.data;
  const errors = [];

  // Simulate frontend validation logic
  if (!data.name) errors.push("Name is required");
  if (!data.email) errors.push("Email is required");
  if (!data.roll) errors.push("Roll number is required");
  if (!data.discord) errors.push("Discord username is required");
  if (!data.year) errors.push("Year is required");
  if (!data.phone || data.phone.length < 8)
    errors.push("Phone number is required (min 8 digits)");

  const joinmlsc = data.joinmlsc || "";
  const pref1 = data.pref1 || "";
  if ((joinmlsc === "yes" || joinmlsc === "not-sure") && !pref1) {
    errors.push("Primary preference is required when joining MLSC");
  }

  if (!data.teamName) errors.push("Team name is required");

  if (!data.agree1 || !data.agree2 || !data.agree3) {
    errors.push("All agreements must be accepted");
  }

  // Check partial member data
  for (let i = 2; i <= 4; i++) {
    const hasAny = !!(
      data[`member${i}_name`] ||
      data[`member${i}_email`] ||
      data[`member${i}_roll`] ||
      data[`member${i}_discord`] ||
      data[`member${i}_phone`] ||
      data[`member${i}_year`]
    );

    if (hasAny) {
      if (!data[`member${i}_name`])
        errors.push(`Member ${i}: name is required`);
      if (!data[`member${i}_email`])
        errors.push(`Member ${i}: valid email required`);
      if (!data[`member${i}_roll`])
        errors.push(`Member ${i}: roll number is required`);
      if (!data[`member${i}_discord`])
        errors.push(`Member ${i}: discord is required`);
      if (!data[`member${i}_phone`])
        errors.push(`Member ${i}: phone is required`);
      if (!data[`member${i}_year`])
        errors.push(`Member ${i}: year is required`);
    }
  }

  if (errors.length > 0) {
    console.log(`❌ Validation would FAIL with errors:`);
    errors.forEach((error) => console.log(`   - ${error}`));
  } else {
    console.log(`✅ Validation would PASS`);
  }
});

console.log("\n💡 Most common issues:");
console.log("   1. Forgetting to check all 3 agreement checkboxes");
console.log('   2. Not filling "Team Name" field');
console.log('   3. Selecting "Join MLSC: Yes" but not choosing a preference');
console.log(
  "   4. Starting to fill member 2/3/4 info but not completing all fields"
);
