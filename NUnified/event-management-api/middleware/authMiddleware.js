import jwt from "jsonwebtoken";

import User from "../models/User.js";

/* =====================================================
   AUTHENTICATION
===================================================== */

export const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing.",
      });
    }

    /* =========================================
       VERIFY TOKEN
    ========================================= */

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /*
      Supports either:

      jwt.sign({ id: ... })

      or

      jwt.sign({ userId: ... })
    */

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    /* =========================================
       GET USER
    ========================================= */

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "This account is inactive.",
      });
    }

    /* =========================================
       ATTACH USER TO REQUEST
    ========================================= */

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your login session has expired. Please sign in again.",
      });
    }

    return res.status(401).json({
      message: "Invalid authentication token.",
    });
  }
};

/* =====================================================
   ROLE AUTHORIZATION
===================================================== */

export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };

/* =====================================================
   COMPATIBILITY EXPORTS

   These prevent your older route files
   from breaking if they use different names.
===================================================== */

export const authMiddleware = protect;

export const requireAuth = protect;

export const verifyToken = protect;

export const authenticate = protect;

/* ADMIN */

export const adminOnly = authorize("admin");

export const requireAdmin = authorize("admin");

/* ORGANIZATION */

export const organizationOnly = authorize("organization");

export const requireOrganization = authorize("organization");

/* BOTH */

export const adminOrOrganization = authorize("admin", "organization");

/* DEFAULT EXPORT */

export default protect;
