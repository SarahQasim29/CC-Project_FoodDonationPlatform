const User = require("../models/user"); // Adjust path if needed

const middleware = {
  // Ensure user is logged in AND 2FA verified
  ensureLoggedInAnd2FA: (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash("error", "Please login first");
      return res.redirect("/auth/login");
    }
    if (!req.session.isVerified2FA) {
      req.flash("error", "Please verify your 2FA code");
      return res.redirect("/2fa/verify");
    }
    next();
  },

  // Ensure user is logged in, optionally 2FA verified if enabled
  ensureAuthenticated: (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash("error", "Please login first");
      return res.redirect("/auth/login");
    }

    if (req.user.isTwoFAEnabled && !req.session.isVerified2FA) {
      req.flash("error", "Please verify your 2FA code");
      return res.redirect("/2fa/verify");
    }

    next();
  },

  // Redirect authenticated & 2FA verified users away from login/signup pages
  ensureNotLoggedIn: async (req, res, next) => {
    if (req.session.userId && req.session.isVerified2FA) {
      try {
        const user = await User.findById(req.session.userId);
        if (!user) return next();

        switch (user.role) {
          case "admin":
            return res.redirect("/admin/dashboard");
          case "donor":
            return res.redirect("/donor/dashboard");
          case "agent":
            return res.redirect("/agent/dashboard");
          case "collector":
            return res.redirect("/collector/dashboard");
          default:
            return res.redirect("/");
        }
      } catch (err) {
        console.error("Error fetching user in ensureNotLoggedIn:", err);
        return next();
      }
    } else {
      next();
    }
  },

  // Check role with 2FA verification (generic middleware)
  ensureRole: (role) => {
    return async (req, res, next) => {
      if (!req.isAuthenticated() || !req.session.isVerified2FA) {
        req.flash("error", "Please login and verify 2FA first");
        return res.redirect("/auth/login");
      }

      try {
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== role) {
          req.flash("error", `You must be a ${role} to access this page`);
          return res.redirect("/");
        }
        req.user = user;
        next();
      } catch (err) {
        console.error(`Error fetching user in ensureRole(${role}):`, err);
        req.flash("error", "Something went wrong");
        return res.redirect("/auth/login");
      }
    };
  },

  // Convenience wrappers for specific roles:
  ensureAdminLoggedIn: function (req, res, next) {
    // Reuse ensureRole for admin role
    return middleware.ensureRole("admin")(req, res, next);
  },

  ensureAgentLoggedIn: function (req, res, next) {
    return middleware.ensureRole("agent")(req, res, next);
  },

  ensureDonorLoggedIn: function (req, res, next) {
    return middleware.ensureRole("donor")(req, res, next);
  },

  ensureCollectorLoggedIn: function (req, res, next) {
    return middleware.ensureRole("collector")(req, res, next);
  },

  // Just check if logged in (does not check 2FA)
  ensureUserLoggedIn: (req, res, next) => {
    if (!req.session.userId) {
      req.flash("error", "You must be logged in to access this page");
      return res.redirect("/auth/login");
    }
    next();
  },

  // Check that 2FA is verified for logged-in user
  ensure2FAVerified: (req, res, next) => {
    if (req.session.userId && req.session.isVerified2FA) {
      return next();
    }
    req.flash("error", "Please complete two-factor authentication.");
    return res.redirect("/2fa/verify");
  },
  ensure2FASetupSession,
};

function ensure2FASetupSession(req, res, next) {
  if (req.session.tempUserId) {
    return next();
  }
  req.flash("error", "Please login first.");
  res.redirect("/auth/login");
}

module.exports = middleware;
