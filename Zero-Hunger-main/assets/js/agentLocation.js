// Automatically get and send location to the server when the page loads
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  console.log("Initial location fetched:", latitude, longitude);

  try {
    const response = await fetch("/update-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ Initial location updated successfully");
    } else {
      console.error("❌ Failed to update initial location");
    }
  } catch (err) {
    console.error("🔥 Error during initial location update:", err);
  }
});

// Periodically update agent's location (e.g., every 60 seconds)
setInterval(() => {
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    console.log("📍 Updating location to:", latitude, longitude);

    try {
      const response = await fetch("/update-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await response.json();
      if (data.success) {
        console.log("✅ Location updated in interval");
      } else {
        console.warn("⚠️ Location update failed during interval");
      }
    } catch (err) {
      console.error("🔥 Error during interval location update:", err);
    }
  });
}, 60000); // Update location every 60 seconds
