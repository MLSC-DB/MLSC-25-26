const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
