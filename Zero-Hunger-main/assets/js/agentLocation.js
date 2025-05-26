// Automatically get and send location to the server when the page loads
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;

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
      console.log("Location updated successfully");
    } else {
      console.error("Failed to update location");
    }
  } catch (err) {
    console.error("Error:", err);
  }
});

// Periodically update agent's location (e.g., every 60 seconds)
setInterval(() => {
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;

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
        console.log("Location updated");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });
}, 60000); // Update location every 60 seconds
