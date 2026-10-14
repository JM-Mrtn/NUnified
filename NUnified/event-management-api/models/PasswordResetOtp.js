import mongoose from "mongoose";

/* =====================================================
   PASSWORD RESET OTP
===================================================== */

const passwordResetOtpSchema =
  new mongoose.Schema(
    {
      /* =================================================
         USER
      ================================================= */

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },

      /* =================================================
         EMAIL USED FOR RECOVERY
      ================================================= */

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      /* =================================================
         HASHED OTP

         Never store the plain OTP.
      ================================================= */

      otpHash: {
        type: String,
        required: true,
      },

      /* =================================================
         OTP ATTEMPTS
      ================================================= */

      attempts: {
        type: Number,
        default: 0,
      },

      /* =================================================
         PASSWORD FIELD

         Supports both database formats:

         password
         passwordHash
      ================================================= */

      passwordField: {
        type: String,

        enum: [
          "password",
          "passwordHash",
        ],

        default: "password",
      },

      /* =================================================
         VERIFIED
      ================================================= */

      verifiedAt: {
        type: Date,
        default: null,
      },

      /* =================================================
         RESET TOKEN

         Generated AFTER correct OTP.
      ================================================= */

      resetTokenHash: {
        type: String,
        default: "",
      },

      /* =================================================
         OTP / RESET REQUEST TIME
      ================================================= */

      lastSentAt: {
        type: Date,
        default: Date.now,
      },

      /* =================================================
         EXPIRATION

         MongoDB TTL automatically removes
         expired reset requests.
      ================================================= */

      expiresAt: {
        type: Date,
        required: true,

        index: {
          expires: 0,
        },
      },
    },

    {
      timestamps: true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

const PasswordResetOtp =
  mongoose.models.PasswordResetOtp ||
  mongoose.model(
    "PasswordResetOtp",
    passwordResetOtpSchema
  );

export default PasswordResetOtp;