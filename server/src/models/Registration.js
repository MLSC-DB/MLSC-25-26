const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    roll: {
      type: String,
      trim: true,
      required: true,
    },
    discord: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10,15}$/,
    },
    yearOfStudy: {
      type: String,
      enum: ["First Year", "Second Year"],
      required: true,
    },
    domainPreference1: { type: String, required: false },
    domainPreference2: { type: String },
    domainPreference3: { type: String },
    joinmlsc: { type: String, required: true },
    teamName: { type: String, required: true },
    // members array is optional; if provided, member fields are validated at application level
    members: {
      type: [
        {
          name: { type: String, trim: true },
          email: { type: String, trim: true },
          roll: { type: String, trim: true },
          phone: { type: String, trim: true },
          discord: { type: String, trim: true },
          yearOfStudy: { type: String, enum: ["First Year", "Second Year"] },
          joinmlsc: { type: String },
          preferences: { type: Object },
        },
      ],
      required: false,
    },
    projects: { type: String },
    // project/motivation is optional; client-side enforces a soft minimum when present
    motivation: { type: String, required: false },
    agreements: {
      agree1: { type: Boolean, default: false },
      agree2: { type: Boolean, default: false },
      agree3: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
registrationSchema.index({ createdAt: -1 });
// Text index to support simple search across name, email, roll and teamName
registrationSchema.index({
  name: "text",
  email: "text",
  roll: "text",
  teamName: "text",
});

module.exports = mongoose.model("Registration", registrationSchema);
