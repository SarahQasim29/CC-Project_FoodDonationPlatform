const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const Feedback = require("../models/feedback");

router.get(
  "/agent/dashboard",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    const agentId = req.user._id;
    const numAssignedDonations = await Donation.countDocuments({
      agent: agentId,
      status: "assigned",
    });
    const numCollectedDonations = await Donation.countDocuments({
      agent: agentId,
      status: "collected",
    });
    res.render("agent/dashboard", {
      title: "Dashboard",
      numAssignedDonations,
      numCollectedDonations,
    });
  }
);

router.get(
  "/agent/collections/pending",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const pendingCollections = await Donation.find({
        agent: req.user._id,
        status: "assigned",
      }).populate("donor");
      res.render("agent/pendingCollections", {
        title: "Pending Collections",
        pendingCollections,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/agent/collections/previous",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const previousCollections = await Donation.find({
        agent: req.user._id,
        status: "collected",
      }).populate("donor");
      res.render("agent/previousCollections", {
        title: "Previous Collections",
        previousCollections,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/agent/collection/view/:collectionId",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const collectionId = req.params.collectionId;
      const collection = await Donation.findById(collectionId).populate(
        "donor"
      );
      res.render("agent/collection", {
        title: "Collection details",
        collection,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/agent/collection/collect/:collectionId",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const collectionId = req.params.collectionId;
      await Donation.findByIdAndUpdate(collectionId, {
        status: "dilevered",
        collectionTime: Date.now(),
      });
      req.flash("success", "Donation collected successfully");
      res.redirect(`/agent/collection/view/${collectionId}`);
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get("/agent/profile", middleware.ensureAgentLoggedIn, (req, res) => {
  res.render("agent/profile", { title: "My Profile" });
});

router.put(
  "/agent/profile",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const id = req.user._id;
      const updateObj = req.body.agent; // updateObj: {firstName, lastName, gender, address, phone}
      await User.findByIdAndUpdate(id, updateObj);

      req.flash("success", "Profile updated successfully");
      res.redirect("/agent/profile");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

// Route to send feedback (message)
router.post(
  "/agent/feedback",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    const { message } = req.body;
    const agentId = req.user._id;

    try {
      // Get all admins
      const admins = await User.find({ role: "admin" });

      if (admins.length === 0) {
        req.flash("error", "No admins found.");
        return res.redirect("back");
      }

      // Send feedback to all admins
      for (let admin of admins) {
        const feedback = new Feedback({
          sender: agentId,
          receiver: admin._id,
          message: message,
        });
        await feedback.save();
      }

      req.flash("success", "Feedback sent successfully.");
      res.redirect("/agent/dashboard");
    } catch (err) {
      console.error("Error sending feedback:", err);
      req.flash("error", "An error occurred while sending your feedback.");
      res.redirect("back");
    }
  }
);

// Route to display received and sent feedback for agent
router.get(
  "/agent/feedback",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const agentId = req.user._id;

      // Fetch received and sent feedback for the agent
      const receivedFeedbacks = await Feedback.find({ receiver: agentId })
        .populate("sender", "firstName lastName role")
        .sort({ createdAt: -1 });

      const sentFeedbacks = await Feedback.find({ sender: agentId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      // Fetch replies for each received feedback
      for (let feedback of receivedFeedbacks) {
        feedback.replies = await Feedback.find({ parent: feedback._id }).sort({
          createdAt: -1,
        });
      }

      res.render("agent/feedbacks", {
        title: "Agent Feedback",
        receivedFeedbacks,
        sentFeedbacks,
      });
    } catch (err) {
      console.error("Error fetching feedback:", err);
      req.flash("error", "Error fetching feedback.");
      res.redirect("back");
    }
  }
);

// Route to display sent feedback for agent
router.get(
  "/agent/feedback/sent",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const agentId = req.user._id;

      // Fetch sent feedback for the agent
      const sentFeedbacks = await Feedback.find({ sender: agentId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      res.render("agent/feedback-sent", {
        title: "My Sent Feedback",
        sentFeedbacks,
      });
    } catch (err) {
      console.error("Error fetching sent feedback:", err);
      req.flash("error", "Error fetching sent feedback.");
      res.redirect("back");
    }
  }
);

module.exports = router;
