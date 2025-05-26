const express = require("express");
const Feedback = require("../models/feedback");
const User = require("../models/user");
const router = express.Router();

// Send feedback to admin (collector, agent, donor)
router.post("/feedback", async (req, res) => {
  const { senderId, message } = req.body;

  try {
    const sender = await User.findById(senderId);
    const admin = await User.findOne({ role: "admin" });

    if (!sender) {
      return res.status(400).send("Sender not found.");
    }
    if (!admin) {
      return res.status(400).send("Admin not found.");
    }

    const feedback = new Feedback({
      sender: senderId,
      receiver: admin._id,
      message,
    });

    await feedback.save();
    res.status(200).json({ message: "Feedback sent successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting feedback.");
  }
});

// Admin sends feedback to other users
router.post("/feedback/admin", async (req, res) => {
  const { adminId, receiverId, message } = req.body;

  try {
    const admin = await User.findById(adminId);
    const receiver = await User.findById(receiverId);

    if (!admin || admin.role !== "admin") {
      return res.status(400).send("Only admin can send feedback.");
    }
    if (!receiver || !["collector", "agent", "donor"].includes(receiver.role)) {
      return res
        .status(400)
        .send("Receiver must be a valid user (collector, agent, or donor).");
    }

    const feedback = new Feedback({
      sender: adminId,
      receiver: receiverId,
      message,
    });

    await feedback.save();
    res
      .status(200)
      .json({ message: "Feedback sent successfully to the user." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting feedback.");
  }
});

// Fetch feedback messages for admin
router.get("/feedbacks/admin", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ receiver: req.user._id })
      .populate("sender", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching feedbacks.");
  }
});

// Fetch feedback for individual users
router.get("/feedbacks/user", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ sender: req.user._id })
      .populate("receiver", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching feedbacks.");
  }
});

module.exports = router;
