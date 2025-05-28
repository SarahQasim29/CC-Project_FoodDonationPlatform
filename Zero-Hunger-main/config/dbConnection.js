const mongoose = require("mongoose");

// Function to establish a connection with MongoDB
const connectDB = async () => {
  try {
    const db =
      "mongodb+srv://sarahqasim024740:SaRaH0123@cluster0.5i2nv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

    console.log("⏳ Attempting to connect to MongoDB...");

    await mongoose.connect(db); // Connect to the database

    console.log("✅ MongoDB connection successful.");
  } catch (err) {
    console.error("❌ MongoDB connection failed. Error details:");
    console.error(err);

    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
