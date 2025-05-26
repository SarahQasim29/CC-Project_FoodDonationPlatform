const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Feedback = require("../models/feedback");
const Donation = require("../models/donation.js");

router.get(
  "/collector/dashboard",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    const collectorId = req.user._id;

    const numAssignedDonations = await Donation.countDocuments({
      collector: collectorId,
      status: "assigned",
    });

    const numCollectedDonations = await Donation.countDocuments({
      collector: collectorId,
      status: "collected",
    });

    const numPendingCollections = await Donation.countDocuments({
      collector: collectorId,
      status: "pending",
    });

    res.render("collector/dashboard", {
      title: "Dashboard",
      numAssignedDonations,
      numCollectedDonations,
      numPendingCollections,
    });
  }
);

// Get Accepted Donations for Collector to View
router.get(
  "/collector/donations/accepted",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const acceptedDonations = await Donation.find({
        status: "accepted",
      }).populate("donor");
      res.render("collector/acceptedDonations", {
        title: "Accepted Donations",
        acceptedDonations,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

// Collect a Donation (Create Child Donation)
router.post(
  "/collector/donation/collect/:donationId",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      const { quantity } = req.body; // Quantity entered by collector

      const donation = await Donation.findById(donationId);

      // Check if the donation exists and if the requested quantity is valid
      if (!donation || donation.quantity < quantity) {
        req.flash("error", "Invalid quantity or donation not found.");
        return res.redirect("back");
      }

      // Reduce the quantity in the original (parent) donation
      donation.quantity -= quantity;

      // If all donation quantity is collected, change status to 'collected'
      if (donation.quantity === 0) {
        donation.status = "collected";
      }

      // Save the updated parent donation
      await donation.save();

      // Create a child donation (for the collected part)
      const childDonation = new Donation({
        donor: donation.donor,
        agent: donation.agent,
        foodType: donation.foodType,
        quantity: quantity,
        cookingTime: donation.cookingTime,
        address: donation.address,
        phone: donation.phone,
        donorToAdminMsg: donation.donorToAdminMsg,
        adminToAgentMsg: donation.adminToAgentMsg,
        collectionTime: new Date(),
        status: "collected", // Status of the collected portion
        collector: req.user._id,
        parentDonation: donation._id, // Relate this child donation to the parent donation
      });

      // Save the child donation
      await childDonation.save();

      req.flash("success", "Donation collected successfully.");
      res.redirect("/collector/donations/accepted");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);
// Collector Assigned Donations View
// Collector Assigned Donations View
router.get(
  "/collector/donations/assigned",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const assignedDonations = await Donation.find({
        status: "assigned",
      }).populate("donor agent"); // Populate both donor and agent

      console.log(assignedDonations); // Check the result in console

      res.render("collector/assignedDonations", {
        title: "Assigned Donations",
        assignedDonations,
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Server error occurred.");
      res.redirect("back");
    }
  }
);

router.get(
  "/collector/donations/previous",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      // Fetch previous donations for the logged-in collector with a 'collected' status
      const previousDonations = await Donation.find({
        collector: req.user._id,
        status: "collected",
      })
        .populate("donor") // Populate donor information
        .populate("agent"); // Populate agent information
      console.log("Previous Donations:", previousDonations); //
      res.render("collector/previousCollections", {
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

router.get(
  "/collector/profile",
  middleware.ensureCollectorLoggedIn,
  (req, res) => {
    res.render("collector/profile", { title: "My Profile" });
  }
);

router.put(
  "/collector/profile",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const id = req.user._id;
      const updateObj = req.body.collector;
      await User.findByIdAndUpdate(id, updateObj);

      req.flash("success", "Profile updated successfully.");
      res.redirect("/collector/profile");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/collector/donation/deliver/:donationId",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      await Donation.findByIdAndUpdate(donationId, { status: "delivered" });
      req.flash("success", "Donation marked as delivered.");
      res.redirect("/collector/donations/collected");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

/*router.get(
  "/collector/donations/collected",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const collectedDonations = await Donation.find({
        collector: req.user._id,
        status: "accepted",
      }).populate("donor");
      res.render("collector/collectedDonations", {
        title: "Collected Donations",
        collectedDonations,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);*/

router.get("/collector/available-donations", async (req, res) => {
  const availableDonations = await Donation.find({ status: "accepted" });
  res.render("collector/availableDonations", { availableDonations });
});

// Route to send feedback (message)
router.post(
  "/collector/feedback",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    const { message } = req.body;
    const collectorId = req.user._id;

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
          sender: collectorId,
          receiver: admin._id,
          message: message,
        });

        await feedback.save();
      }

      req.flash("success", "Feedback sent successfully.");
      res.redirect("/collector/dashboard");
    } catch (err) {
      console.error("Error sending feedback:", err);
      req.flash("error", "An error occurred while sending your feedback.");
      res.redirect("back");
    }
  }
);

// Route to display received and sent feedback
router.get(
  "/collector/feedback",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const collectorId = req.user._id;

      // Fetch received and sent feedback
      const receivedFeedbacks = await Feedback.find({ receiver: collectorId })
        .populate("sender", "firstName lastName role")
        .sort({ createdAt: -1 });

      const sentFeedbacks = await Feedback.find({ sender: collectorId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      // Fetch replies for each received feedback
      for (let feedback of receivedFeedbacks) {
        feedback.replies = await Feedback.find({ parent: feedback._id }).sort({
          createdAt: -1,
        });
      }

      res.render("collector/feedbacks", {
        title: "Feedback",
        receivedFeedbacks,
        sentFeedbacks,
      });
    } catch (err) {
      console.error("Error fetching feedback:", err); // Log the error for debugging
      req.flash("error", "Error fetching feedback.");
      res.redirect("back");
    }
  }
);

router.get(
  "/collector/feedback/sent",
  middleware.ensureCollectorLoggedIn,
  async (req, res) => {
    try {
      const collectorId = req.user._id;

      // Fetch sent feedback
      const sentFeedbacks = await Feedback.find({ sender: collectorId })
        .populate("receiver", "firstName lastName role")
        .sort({ createdAt: -1 });

      res.render("collector/feedback-sent", {
        title: "My Sent Feedback",
        sentFeedbacks,
      });
    } catch (err) {
      console.error("Error fetching sent feedback:", err); // Log the error for debugging
      req.flash("error", "Error fetching sent feedback.");
      res.redirect("back");
    }
  }
);

module.exports = router;
