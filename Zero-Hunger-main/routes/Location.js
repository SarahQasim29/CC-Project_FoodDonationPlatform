const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Function to generate the path between two coordinates
function generatePath(start, end, numPoints) {
  const path = [];
  for (let i = 0; i < numPoints; i++) {
    const lat = start[0] + (end[0] - start[0]) * (i / (numPoints - 1));
    const lng = start[1] + (end[1] - start[1]) * (i / (numPoints - 1));
    path.push({ latitude: lat, longitude: lng });
  }
  return path;
}

router.get("/admin/location", async (req, res) => {
  try {
    // Fetch all agents from the database
    const agents = await User.find({ role: "agent" }).select(
      "firstName lastName _id"
    );

    const agentsLocation = {};

    // Donor location (example)
    const donorLocation = [24.875, 67.015]; // Example donor location

    // Collector location (example)
    const collectorLocation = [24.88, 67.02]; // Example collector location

    // Generate paths for each agent towards the donor, then to the collector
    agents.forEach((agent) => {
      agentsLocation[agent._id] = {
        donorPath: generatePath(
          [24.8607, 67.0011], // Starting location of the agent
          donorLocation, // Donor location
          20 // Number of intermediate points
        ),
        collectorPath: generatePath(
          donorLocation, // Donor location
          collectorLocation, // Collector location
          20 // Number of intermediate points
        ),
      };
    });

    // Pass agents and agentsLocation (stringified) to the view
    res.render("admin/location", {
      agents,
      agentsLocation: JSON.stringify(agentsLocation),
      donorLocation: JSON.stringify(donorLocation),
      collectorLocation: JSON.stringify(collectorLocation),
    });
  } catch (error) {
    res.status(500).send("Error fetching agents.");
  }
});

module.exports = router;
