const mongoose = require("mongoose");

// Function to establish a connection with MongoDB
const connectDB = async () => {
  try {
    const db = process.env.MONGODB_URI;
    await mongoose.connect(db);
    console.log("MongoDB connected...");
  } catch (err) {
    console.error("❌ MongoDB connection failed. Error details:");
    console.error(err);

    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
