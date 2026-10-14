import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================================
  SESSION TIME
===================================================== */

const SESSION_EXPIRES_IN = "30m";

/* =====================================================
   LOGIN
===================================================== */

router.post(
  "/login",

  async (req, res) => {
    try {
      const { username, password, role } = req.body;

      /* =================================================
         VALIDATE
      ================================================= */

      if (!username || !password || !role) {
        return res.status(400).json({
          message: "Username, password, and role are required.",
        });
      }

      if (!["admin", "organization"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role.",
        });
      }

      /* =================================================
         FIND USER
      ================================================= */

      const user = await User.findOne({
        username: username.toLowerCase().trim(),
      }).populate("organization");

      if (!user) {
        return res.status(401).json({
          message: "Invalid username or password.",
        });
      }

      /* =================================================
         CHECK PASSWORD
      ================================================= */

      const passwordMatches = await bcrypt.compare(password, user.password);

      if (!passwordMatches) {
        return res.status(401).json({
          message: "Invalid username or password.",
        });
      }

      /* =================================================
         CHECK ROLE
      ================================================= */

      if (user.role !== role) {
        return res.status(403).json({
          message: "The selected role does not match this account.",
        });
      }

      /* =================================================
         CHECK ACCOUNT STATUS
      ================================================= */

      if (!user.active) {
        return res.status(403).json({
          message: "This account is inactive.",
        });
      }

      /* =================================================
         CHECK ORGANIZATION STATUS
      ================================================= */

      if (
        user.role === "organization" &&
        user.organization?.status === "inactive"
      ) {
        return res.status(403).json({
          message: "This organization is inactive.",
        });
      }

      /* =================================================
         CREATE JWT

         🔥 Uses SESSION_EXPIRES_IN above.
      ================================================= */

      const token = jwt.sign(
        {
          id: user._id,

          role: user.role,

          organizationId: user.organization?._id || null,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: SESSION_EXPIRES_IN,
        },
      );

      console.log("✅ USER LOGGED IN:", {
        username: user.username,

        role: user.role,

        session: SESSION_EXPIRES_IN,
      });

      /* =================================================
         RESPONSE
      ================================================= */

      return res.json({
        message: "Login successful.",

        token,

        sessionExpiresIn: SESSION_EXPIRES_IN,

        user: {
          id: user._id,

          username: user.username,

          role: user.role,

          organization: user.organization,
        },
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      return res.status(500).json({
        message: "Server error during login.",
      });
    }
  },
);

/* =====================================================
   CURRENT USER

   GET /api/auth/me
===================================================== */

router.get(
  "/me",

  protect,

  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select("-password")
        .populate("organization");

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      return res.json(user);
    } catch (error) {
      console.error("GET CURRENT USER ERROR:", error);

      return res.status(500).json({
        message: "Unable to load user.",
      });
    }
  },
);

/* =====================================================
   CHANGE PASSWORD

   PATCH /api/auth/change-password
===================================================== */

router.patch(
  "/change-password",

  protect,

  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      /* =================================================
         VALIDATE
      ================================================= */

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are required.",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters.",
        });
      }

      /* =================================================
         FIND USER
      ================================================= */

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      /* =================================================
         CHECK CURRENT PASSWORD
      ================================================= */

      const matches = await bcrypt.compare(currentPassword, user.password);

      if (!matches) {
        return res.status(400).json({
          message: "Current password is incorrect.",
        });
      }

      /* =================================================
         SAVE NEW PASSWORD
      ================================================= */

      user.password = await bcrypt.hash(newPassword, 10);

      await user.save();

      return res.json({
        message: "Password changed successfully.",
      });
    } catch (error) {
      console.error("CHANGE PASSWORD ERROR:", error);

      return res.status(500).json({
        message: "Unable to change password.",
      });
    }
  },
);

export default router;
