import mongoose from "mongoose";

/* =====================================================
   PASSWORD CHANGE OTP SCHEMA
===================================================== */

const passwordChangeOtpSchema =
  new mongoose.Schema(
    {
      /* =================================================
         USER

         One active password-change request
         per user.
      ================================================= */

      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "User",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      /* =================================================
         OTP HASH

         Never store the plain OTP.
      ================================================= */

      otpHash: {
        type:
          String,

        required:
          true,
      },

      /* =================================================
         NEW PASSWORD HASH

         The new password is already bcrypt-hashed
         before being stored here.

         The plain new password is NEVER stored.
      ================================================= */

      newPasswordHash: {
        type:
          String,

        required:
          true,
      },

      /* =================================================
         PASSWORD FIELD

         Your existing User collection may use:

         password

         OR

         passwordHash

         We remember which one was successfully used
         to verify the current password.

         Then, after OTP verification, we update the
         same field.
      ================================================= */

      passwordField: {
        type:
          String,

        enum: [
          "password",
          "passwordHash",
        ],

        default:
          "password",

        required:
          true,
      },

      /* =================================================
         ATTEMPTS
      ================================================= */

      attempts: {
        type:
          Number,

        default:
          0,
      },

      /* =================================================
         LAST OTP SENT
      ================================================= */

      lastSentAt: {
        type:
          Date,

        default:
          Date.now,
      },

      /* =================================================
         EXPIRATION

         MongoDB automatically removes expired
         OTP records.
      ================================================= */

      expiresAt: {
        type:
          Date,

        required:
          true,

        index: {
          expires:
            0,
        },
      },
    },

    {
      timestamps:
        true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

const PasswordChangeOtp =
  mongoose.models
    .PasswordChangeOtp ||
  mongoose.model(
    "PasswordChangeOtp",
    passwordChangeOtpSchema
  );

export default PasswordChangeOtp;