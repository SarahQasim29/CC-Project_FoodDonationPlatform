const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const Feedback = require("../models/feedback");

router.get(
  "/donor/dashboard",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    const donorId = req.user._id;
    const numPendingDonations = await Donation.countDocuments({
      donor: donorId,
      status: "pending",
    });
    const numAcceptedDonations = await Donation.countDocuments({
      donor: donorId,
      status: "accepted",
    });
    const numAssignedDonations = await Donation.countDocuments({
      donor: donorId,
      status: "assigned",
    });
    const numCollectedDonations = await Donation.countDocuments({
      donor: donorId,
      status: "collected",
    });
    res.render("donor/dashboard", {
      title: "Dashboard",
      numPendingDonations,
      numAcceptedDonations,
      numAssignedDonations,
      numCollectedDonations,
    });
  }
);

router.get("/donor/donate", middleware.ensureDonorLoggedIn, (req, res) => {
  res.render("donor/donate", { title: "Donate" });
});

router.post(
  "/donor/donate",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const donation = req.body.donation;
      donation.status = "pending";
      donation.donor = req.user._id;
      const newDonation = new Donation(donation);
      await newDonation.save();
      req.flash("success", "Donation request sent successfully");
      res.redirect("/donor/donations/pending");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/donor/donations/pending",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const pendingDonations = await Donation.find({
        donor: req.user._id,
        status: ["pending", "rejected", "accepted", "assigned"],
      }).populate("agent");
      res.render("donor/pendingDonations", {
        title: "Pending Donations",
        pendingDonations,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/donor/donations/previous",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const previousDonations = await Donation.find({
        donor: req.user._id,
        status: "collected",
      }).populate("agent");
      res.render("donor/previousDonations", {
        title: "Previous Donations",
        previousDonations,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get("/donor/donation/deleteRejected/:donationId", async (req, res) => {
  try {
    const donationId = req.params.donationId;
    await Donation.findByIdAndDelete(donationId);
    res.redirect("/donor/donations/pending");
  } catch (err) {
    console.log(err);
    req.flash("error", "Some error occurred on the server.");
    res.redirect("back");
  }
});

router.get("/donor/profile", middleware.ensureDonorLoggedIn, (req, res) => {
  res.render("donor/profile", { title: "My Profile" });
});

router.put(
  "/donor/profile",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const id = req.user._id;
      const updateObj = req.body.donor; // updateObj: {firstName, lastName, gender, address, phone}
      await User.findByIdAndUpdate(id, updateObj);

      req.flash("success", "Profile updated successfully");
      res.redirect("/donor/profile");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

// Route to send feedback (message)
router.post(
  "/donor/feedback",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    const { message } = req.body;
    const donorId = req.user._id;

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
          sender: donorId,
          receiver: admin._id,
          message: message,
        });
        await feedback.save();
      }

      req.flash("success", "Feedback sent successfully.");
      res.redirect("/donor/dashboard");
    } catch (err) {
      console.error("Error sending feedback:", err);
      req.flash("error", "An error occurred while sending your feedback.");
      res.redirect("back");
    }
  }
);

// Route to display received and sent feedback for donor
router.get(
  "/donor/feedback",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const donorId = req.user._id;

      // Fetch received and sent feedback for the donor
      const receivedFeedbacks = await Feedback.find({ receiver: donorId })
        .populate("sender", "firstName lastName role")
        .sort({ createdAt: -1 });

      const sentFeedbacks = await Feedback.find({ sender: donorId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      // Fetch replies for each received feedback
      for (let feedback of receivedFeedbacks) {
        feedback.replies = await Feedback.find({ parent: feedback._id }).sort({
          createdAt: -1,
        });
      }

      res.render("donor/feedbacks", {
        title: "Donor Feedback",
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

// Route to display sent feedback for donor
router.get(
  "/donor/feedback/sent",
  middleware.ensureDonorLoggedIn,
  async (req, res) => {
    try {
      const donorId = req.user._id;

      // Fetch sent feedback for the donor
      const sentFeedbacks = await Feedback.find({ sender: donorId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      res.render("donor/feedback-sent", {
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
