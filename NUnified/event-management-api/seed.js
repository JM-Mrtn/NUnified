import "dotenv/config";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "./models/User.js";

/* =====================================================
   DEFAULT ADMIN
===================================================== */

const ADMIN_USERNAME =
  "admin";

const ADMIN_PASSWORD =
  "Admin123!";

/* =====================================================
   SEED
===================================================== */

async function seedAdmin() {
  try {
    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ MongoDB connected."
    );

    /* =================================================
       CHECK EXISTING ADMIN
    ================================================= */

    const existingAdmin =
      await User.findOne({
        username:
          ADMIN_USERNAME,

        role: "admin",
      });

    if (existingAdmin) {
      console.log(
        "⚠️ Admin account already exists."
      );

      console.log("");
      console.log(
        "Username:",
        ADMIN_USERNAME
      );

      console.log(
        "The existing password was NOT changed."
      );

      await mongoose.disconnect();

      process.exit(0);
    }

    /* =================================================
       HASH DEFAULT PASSWORD
    ================================================= */

    const hashedPassword =
      await bcrypt.hash(
        ADMIN_PASSWORD,
        12
      );

    /* =================================================
       CREATE ADMIN
    ================================================= */

    await User.create({
      username:
        ADMIN_USERNAME,

      password:
        hashedPassword,

      role: "admin",

      active: true,
    });

    console.log("");
    console.log(
      "================================"
    );

    console.log(
      "✅ ADMIN CREATED SUCCESSFULLY"
    );

    console.log(
      "================================"
    );

    console.log("");
    console.log(
      "Username: admin"
    );

    console.log(
      "Password: Admin123!"
    );

    console.log("");
    console.log(
      "You can now log in as Administrator."
    );

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error(
      "❌ SEED ERROR:"
    );

    console.error(
      error
    );

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect error
    }

    process.exit(1);
  }
}

seedAdmin();