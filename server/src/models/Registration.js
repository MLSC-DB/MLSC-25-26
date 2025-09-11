const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
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
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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
  domainPreference1: { type: String, required: true },
  domainPreference2: { type: String, required: true },
  domainPreference3: { type: String, required: true },
  projects: { type: String },
  motivation: { type: String, required: true, minlength: 10 },
},
{
  timestamps: true, 
}
);

module.exports = mongoose.model("Registration", registrationSchema);
