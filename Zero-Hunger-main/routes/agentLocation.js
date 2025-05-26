const express = require("express");
const router = express.Router();
const AgentLocation = require("../models/agentLocation");
const middleware = require("../middleware");

// Update Agent Location
router.post(
  "/update-location",
  middleware.ensureAgentLoggedIn,
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      const agentId = req.user._id;

      // Check if location already exists for this agent
      let agentLocation = await AgentLocation.findOne({ agent: agentId });

      if (agentLocation) {
        // If location exists, update it
        agentLocation.latitude = latitude;
        agentLocation.longitude = longitude;
        agentLocation.lastUpdated = Date.now();
        await agentLocation.save();
      } else {
        // If location doesn't exist, create a new one
        agentLocation = new AgentLocation({
          agent: agentId,
          latitude,
          longitude,
        });
        await agentLocation.save();
      }

      res
        .status(200)
        .json({ success: true, message: "Location updated successfully" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update location" });
    }
  }
);

// Get Agent Location
router.get("/location/:agentId", async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const agentLocation = await AgentLocation.findOne({ agent: agentId });

    if (!agentLocation) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(200).json(agentLocation);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch location" });
  }
});

module.exports = router;
