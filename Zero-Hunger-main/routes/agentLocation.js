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

      console.log(`[DEBUG] Update request by agent: ${agentId}`);
      console.log(`[DEBUG] Latitude: ${latitude}, Longitude: ${longitude}`);

      // Check if location already exists for this agent
      let agentLocation = await AgentLocation.findOne({ agent: agentId });

      if (agentLocation) {
        console.log("[DEBUG] Existing location found, updating...");
        agentLocation.latitude = latitude;
        agentLocation.longitude = longitude;
        agentLocation.lastUpdated = Date.now();
        await agentLocation.save();
      } else {
        console.log("[DEBUG] No existing location, creating new one...");
        agentLocation = new AgentLocation({
          agent: agentId,
          latitude,
          longitude,
        });
        await agentLocation.save();
      }

      console.log("[DEBUG] Location saved successfully.");
      res
        .status(200)
        .json({ success: true, message: "Location updated successfully" });
    } catch (err) {
      console.error("[ERROR] Failed to update location:", err);
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
    console.log(`[DEBUG] Fetching location for agent ID: ${agentId}`);

    const agentLocation = await AgentLocation.findOne({ agent: agentId });

    if (!agentLocation) {
      console.warn(`[WARN] Location not found for agent: ${agentId}`);
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    console.log("[DEBUG] Agent location retrieved successfully");
    res.status(200).json(agentLocation);
  } catch (err) {
    console.error("[ERROR] Failed to fetch location:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch location" });
  }
});

module.exports = router;
