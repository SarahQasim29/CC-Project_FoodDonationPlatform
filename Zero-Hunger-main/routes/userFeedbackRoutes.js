const express = require("express");
const Feedback = require("../models/feedback");
const User = require("../models/user");
const router = express.Router();

// Route to render the feedback page for the collector
router.get("/collector/feedback", (req, res) => {
  res.render("collector/feedback", {
    success: req.flash("success"),
    error: req.flash("error"),
  });
});

// Route to submit feedback from the collector
router.post("/collector/submitFeedback", async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user; // Assuming user is logged in and available in req.user

    if (!message) {
      req.flash("error", "Message cannot be empty.");
      return res.redirect("/feedback/collector/feedback"); // Redirect to feedback page
    }

    const feedback = new Feedback({
      sender: user._id,
      senderRole: user.role,
      message: message,
      recipient: "admin",
    });

    await feedback.save();
    req.flash("success", "Feedback submitted successfully.");
    res.redirect("/feedback/collector/feedback"); // Redirect back to feedback page
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while submitting feedback.");
    res.redirect("/feedback/collector/feedback");
  }
});

module.exports = router;
