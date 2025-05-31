const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");

const homeRoutes = require("./routes/home.js");
//const twoFARoutes = require("./routes/2fa.js");

const adminRoutes = require("./routes/admin.js");
const agentRoutes = require("./routes/agent");
const donorRoutes = require("./routes/donor");
const collectorRoutes = require("./routes/collector");
const authRoutes = require("./routes/auth.js");

const LocationRoutes = require("./routes/Location.js");
const feedbackRoutes = require("./routes/feedbackRoutes");
const userFeedbackRoutes = require("./routes/userFeedbackRoutes");

require("dotenv").config();
require("./config/dbConnection.js")();
require("./config/passport.js")(passport);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// View engine setup
app.set("view engine", "ejs");
app.use(expressLayouts);

// Static files
app.use("/assets", express.static(__dirname + "/assets"));
app.use(express.static("public"));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE in forms
app.use(methodOverride("_method"));

// Session middleware (must come before passport.session)
app.use(
  session({
    name: "connect.sid",
    secret: "secret", // Change this to a strong secret in production!
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: { maxAge: 3600000, secure: false, httpOnly: true }, // 1 hour
  })
);

// Passport initialization & session handling
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Make flash messages and current user available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.warning = req.flash("warning");
  next();
});

// Routes
app.use(homeRoutes);
//app.use("/2fa", twoFARoutes);

app.use(authRoutes);
app.use(donorRoutes);
app.use(adminRoutes);
app.use(agentRoutes);
app.use(collectorRoutes);

app.use(LocationRoutes);
app.use("/feedbacks", feedbackRoutes);
app.use(userFeedbackRoutes); // added since you imported it

// 404 fallback
app.use((req, res) => {
  res.status(404).render("404page", { title: "Page not found" });
});

// Socket.io for real-time agent location updates
let agentsLocation = {
  agent1: { latitude: 24.8607, longitude: 67.0011 },
};

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.emit("allAgentsLocation", agentsLocation);

  const updateInterval = setInterval(() => {
    agentsLocation.agent1.latitude += 0.001;
    agentsLocation.agent1.longitude += 0.001;

    socket.emit("locationUpdate", {
      agentId: "agent1",
      ...agentsLocation.agent1,
    });
  }, 5000);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(updateInterval);
  });
});

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
