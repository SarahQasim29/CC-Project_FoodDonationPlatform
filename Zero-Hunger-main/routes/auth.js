const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const User = require("../models/user");
const middleware = require("../middleware");

// Helper to get dashboard URL based on role
function getDashboardUrl(user) {
  switch (user.role) {
    case "admin":
      return "/admin/dashboard";
    case "donor":
      return "/donor/dashboard";
    case "agent":
      return "/agent/dashboard";
    case "collector":
      return "/collector/dashboard";
    default:
      return "/";
  }
}

//
// ========== Signup Routes ==========
//
router.get("/auth/signup", middleware.ensureNotLoggedIn, (req, res) => {
  res.render("auth/signup", { title: "User Signup" });
});

router.post("/auth/signup", middleware.ensureNotLoggedIn, async (req, res) => {
  const { firstName, lastName, email, password1, password2, role } = req.body;
  let errors = [];

  if (!firstName || !lastName || !email || !password1 || !password2 || !role) {
    errors.push({ msg: "Please fill in all fields" });
  }
  if (password1 !== password2) {
    errors.push({ msg: "Passwords do not match" });
  }
  if (password1.length < 4) {
    errors.push({ msg: "Password must be at least 4 characters" });
  }

  if (errors.length > 0) {
    return res.render("auth/signup", {
      title: "User Signup",
      errors,
      firstName,
      lastName,
      email,
      password1,
      password2,
      role,
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.push({ msg: "Email is already registered" });
      return res.render("auth/signup", { title: "User Signup", errors });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password1, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      isTwoFAEnabled: false,
    });

    await newUser.save();
    req.flash("success", "Registered successfully. Please log in.");
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error during signup.");
    res.redirect("back");
  }
});

//
// ========== Login Routes ==========
//
router.get("/auth/login", middleware.ensureNotLoggedIn, (req, res) => {
  res.render("auth/login", { title: "User Login" });
});

router.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.render("auth/login", { error: info.message });

    if (user.isTwoFAEnabled) {
      req.session.tempUserId = user._id;
      req.session.isVerified2FA = false;
      return res.redirect("/2fa/verify");
    } else {
      // If 2FA NOT enabled, redirect to setup page
      req.session.tempUserId = user._id; // store temp user to enable 2FA
      req.session.isVerified2FA = false;
      return res.redirect("/2fa/generate");
    }
  })(req, res, next);
});

router.get("/auth/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy();
    req.flash("success", "Logged out successfully");
    res.redirect("/");
  });
});

//
// ========== 2FA Setup + Verification Routes ==========
//
router.get("/2fa/generate", async (req, res) => {
  if (!req.session.tempUserId) return res.redirect("/auth/login");

  const user = await User.findById(req.session.tempUserId);
  if (!user) return res.redirect("/auth/login");

  const secret =
    user.twoFASecret ||
    speakeasy.generateSecret({ name: `ZeroHunger (${user.email})` }).base32;

  if (!user.twoFASecret) {
    user.twoFASecret = secret;
    await user.save();
  }

  const otpauth = `otpauth://totp/ZeroHunger:${user.email}?secret=${user.twoFASecret}&issuer=ZeroHunger`;

  qrcode.toDataURL(otpauth, (err, qrCodeUrl) => {
    if (err) return res.status(500).send("QR code generation failed");
    res.render("auth/2fa-setup", {
      title: "Enable 2FA",
      qrDataUrl: qrCodeUrl,
      secret: user.twoFASecret,
    });
  });
});

router.get("/2fa/verify", (req, res) => {
  if (!req.session.tempUserId) return res.redirect("/auth/login");
  res.render("auth/2fa-verify", {
    title: "2FA Verification",
    messages: req.flash(),
    userId: req.body.userId || req.session.userId,
  });
});

router.post("/2fa/verify", async (req, res, next) => {
  try {
    const userId = req.session.tempUserId;
    const token = req.body.token;
    const user = await User.findById(userId);

    const isValid2FA = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid2FA) {
      req.flash("error", "Invalid 2FA code.");
      return res.redirect("/2fa/verify");
    }

    req.login(user, (err) => {
      if (err) return next(err);

      req.session.isVerified2FA = true;
      delete req.session.tempUserId;
      req.session.userId = user._id;

      res.redirect(getDashboardUrl(user));
    });
  } catch (err) {
    next(err);
  }
});

// Optional: Enable/Disable 2FA after login
router.post(
  "/2fa/enable",
  middleware.ensure2FASetupSession,
  async (req, res) => {
    const user = await User.findById(req.session.tempUserId);
    if (!user) {
      req.flash("error", "User not found. Please login again.");
      return res.redirect("/auth/login");
    }
    user.isTwoFAEnabled = true;
    await user.save();

    // Now login the user fully
    req.login(user, (err) => {
      if (err) {
        req.flash("error", "Error logging in after enabling 2FA.");
        return res.redirect("/auth/login");
      }
      // Clear tempUserId from session since user is now fully logged in
      delete req.session.tempUserId;
      req.session.isVerified2FA = true;
      req.session.userId = user._id;
      req.flash("success", "2FA has been enabled.");
      res.redirect(getDashboardUrl(user));
    });
  }
);

router.post(
  "/2fa/disable",
  middleware.ensureAuthenticated,
  async (req, res) => {
    const user = await User.findById(req.user._id);
    user.isTwoFAEnabled = false;
    user.twoFASecret = undefined;
    await user.save();
    req.flash("success", "2FA has been disabled.");
    res.redirect("/profile");
  }
);

module.exports = router;
