const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female"],
  },
  address: String,
  phone: Number,
  joinedTime: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ["admin", "donor", "agent", "collector"],
    required: true,
  },
  // 2FA fields
  twoFASecret: String, // stores the base32 secret key
  isTwoFAEnabled: { type: Boolean, default: false },
});

const User = mongoose.model("users", userSchema);
module.exports = User;
