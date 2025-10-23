const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./server/src/models/Admin");

mongoose.connect("mongodb://127.0.0.1:27017/mlscRegistrationDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!username || !plainPassword) {
    console.error(
      "Please provide ADMIN_USERNAME and ADMIN_PASSWORD as environment variables.\n" +
        "This script should be run interactively for one-time seeding only."
    );
    return mongoose.disconnect();
  }

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log("Admin already exists.");
    return mongoose.disconnect();
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const admin = new Admin({ username, password: hashedPassword });
  await admin.save();

  console.log("Admin created successfully");
  mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("Error seeding admin:", err);
  mongoose.disconnect();
});
