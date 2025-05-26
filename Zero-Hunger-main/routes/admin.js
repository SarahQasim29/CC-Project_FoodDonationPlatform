const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const Feedback = require("../models/feedback");
const middleware = require("../middleware");

router.get(
  "/admin/dashboard",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    const numAdmins = await User.countDocuments({ role: "admin" });
    const numDonors = await User.countDocuments({ role: "donor" });
    const numAgents = await User.countDocuments({ role: "agent" });
    const numPendingDonations = await Donation.countDocuments({
      status: "pending",
    });
    const numAcceptedDonations = await Donation.countDocuments({
      status: "accepted",
    });
    const numAssignedDonations = await Donation.countDocuments({
      status: "assigned",
    });
    const numCollectedDonations = await Donation.countDocuments({
      status: "collected",
    });
    res.render("admin/dashboard", {
      title: "Dashboard",
      currentUser: req.user,
      numAdmins,
      numDonors,
      numAgents,
      numPendingDonations,
      numAcceptedDonations,
      numAssignedDonations,
      numCollectedDonations,
    });
  }
);

router.get(
  "/admin/donations/pending",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const pendingDonations = await Donation.find({
        status: { $in: ["pending", "accepted", "assigned"] },
      }).populate("donor");
      res.render("admin/pendingDonations", {
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
  "/admin/collected-donations",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const collectedDonations = await Donation.find({
        status: "collected",
      }).populate("donor collector");
      res.render("admin/collectedDonations", {
        title: "Collected Donations",
        collectedDonations,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

// Assuming agentsLocation is the object holding all agent locations
let agentsLocation = {};

router.get("/agents-location", (req, res) => {
  res.json(agentsLocation); // Send the current locations to the frontend
});

// Admin Assign Agent to Collected Donation
router.post(
  "/admin/assign-agent/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      const { agentId } = req.body;

      const donation = await Donation.findById(donationId);

      if (!donation) {
        req.flash("error", "Donation not found.");
        return res.redirect("back");
      }

      // Update donation with agent and change status to "assigned"
      donation.agent = agentId;
      donation.status = "assigned";
      await donation.save();

      req.flash("success", "Agent assigned successfully.");
      res.redirect("/admin/collected-donations");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/admin/donations/previous",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const previousDonations = await Donation.find({
        status: "collected",
      }).populate("donor");
      res.render("admin/previousDonations", {
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
  "/admin/donation/view/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      const donation = await Donation.findById(donationId)
        .populate("donor")
        .populate("agent");
      res.render("admin/donation", { title: "Donation details", donation });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/admin/donation/accept/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      await Donation.findByIdAndUpdate(donationId, { status: "accepted" });
      req.flash("success", "Donation accepted successfully");
      res.redirect(`/admin/donation/view/${donationId}`);
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/admin/donation/reject/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      await Donation.findByIdAndUpdate(donationId, { status: "rejected" });
      req.flash("success", "Donation rejected successfully");
      res.redirect(`/admin/donation/view/${donationId}`);
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/admin/donation/assign/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      const agents = await User.find({ role: "agent" });
      const donation = await Donation.findById(donationId).populate("donor");
      res.render("admin/assignAgent", {
        title: "Assign agent",
        donation,
        agents,
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.post(
  "/admin/donation/assign/:donationId",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const donationId = req.params.donationId;
      const { agent, adminToAgentMsg } = req.body;
      await Donation.findByIdAndUpdate(donationId, {
        status: "assigned",
        agent,
        adminToAgentMsg,
      });
      req.flash("success", "Agent assigned successfully");
      res.redirect(`/admin/donation/view/${donationId}`);
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get(
  "/admin/agents",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const agents = await User.find({ role: "agent" });
      res.render("admin/agents", { title: "List of agents", agents });
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

router.get("/admin/profile", middleware.ensureAdminLoggedIn, (req, res) => {
  res.render("admin/profile", { title: "My profile" });
});

router.put(
  "/admin/profile",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const id = req.user._id;
      const updateObj = req.body.admin; // updateObj: {firstName, lastName, gender, address, phone}
      await User.findByIdAndUpdate(id, updateObj);

      req.flash("success", "Profile updated successfully");
      res.redirect("/admin/profile");
    } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.");
      res.redirect("back");
    }
  }
);

// Route for Admin to view all feedbacks they have received
router.get(
  "/admin/feedbacks",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const adminId = req.user._id; // Get the admin's ID

      // Fetch feedbacks where the admin is the receiver
      const receivedFeedbacks = await Feedback.find({ receiver: adminId })
        .populate("sender", "firstName lastName role") // Populate sender's details
        .sort({ createdAt: -1 }); // Sort feedbacks by creation date

      // Fetch replies for each feedback (if any)
      for (let feedback of receivedFeedbacks) {
        feedback.replies = await Feedback.find({ parent: feedback._id }).sort({
          createdAt: -1,
        });
      }

      // Render the feedback page and pass the data to the view
      res.render("admin/feedbacks", {
        title: "Admin Feedbacks",
        receivedFeedbacks, // Data for the received feedbacks
      });
    } catch (err) {
      console.error("Error fetching feedback data:", err);
      req.flash("error", "Error fetching feedback data.");
      res.redirect("back");
    }
  }
);

// Route to mark feedback as read by the admin
router.post("/admin/mark-read/:feedbackId", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.feedbackId);

    if (!feedback) {
      req.flash("error", "Feedback not found.");
      return res.redirect("/admin/feedbacks");
    }

    feedback.status = "read"; // Mark the feedback as read
    await feedback.save();

    req.flash("success", "Feedback marked as read.");
    res.redirect("/admin/feedbacks");
  } catch (err) {
    console.error(err);
    req.flash("error", "Error marking feedback as read.");
    res.redirect("/admin/feedbacks");
  }
});

// Route for admin to reply to feedback
router.post(
  "/admin/feedbacks",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    const { feedbackId, replyMessage } = req.body;
    const adminId = req.user._id;

    try {
      // Find the original feedback
      const originalFeedback = await Feedback.findById(feedbackId);

      if (!originalFeedback) {
        req.flash("error", "Feedback not found.");
        return res.redirect("back");
      }

      // Create a new reply
      const replyFeedback = new Feedback({
        sender: adminId,
        receiver: originalFeedback.sender, // Original sender
        message: originalFeedback.message, // Original message for reference
        reply: replyMessage, // The reply message
        parent: originalFeedback._id, // Link to the original feedback
        status: "replied",
        repliedAt: new Date(),
      });

      await replyFeedback.save();

      // Update the original feedback's status to "replied"
      originalFeedback.status = "replied";
      await originalFeedback.save();

      req.flash("success", "Reply sent successfully.");
      res.redirect("/admin/feedbacks"); // Redirect to the feedbacks page
    } catch (err) {
      console.error(err);
      req.flash("error", "Error while replying.");
      res.redirect("back");
    }
  }
);

/*// Route to view feedbacks for the admin
router.get(
  "/admin/feedbacks",
  middleware.ensureAdminLoggedIn,
  async (req, res) => {
    try {
      const adminId = req.user._id;

      // Fetch feedbacks where the admin is the receiver
      const receivedFeedbacks = await Feedback.find({ receiver: adminId })
        .populate("sender", "name role")
        .sort({ createdAt: -1 });

      // Fetch replies for each feedback
      for (let feedback of receivedFeedbacks) {
        feedback.replies = await Feedback.find({ parent: feedback._id }).sort({
          createdAt: -1,
        });
      }

      // Render the feedback page and pass the correct variable
      res.render("admin/feedbacks", {
        title: "Admin Feedbacks",
        receivedFeedbacks, // Use the correct variable here
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error fetching feedback.");
      res.redirect("back");
    }
  }
);*/
// Route to fetch pending donations
router.get("/pending-donations", async (req, res) => {
  try {
    // Fetch pending donations from the database
    const pendingDonations = await Donation.find({
      status: "pending",
    }).populate("donor");

    // Send the data as JSON response
    res.json({ pendingDonations });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});
module.exports = router;
