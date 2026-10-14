import express from "express";

import bcrypt from "bcryptjs";

import crypto from "crypto";

import User from "../models/User.js";

import Organization from "../models/Organization.js";

import PasswordResetOtp from "../models/PasswordResetOtp.js";

import {
  sendForgotPasswordOtp,
} from "../services/forgotPasswordOtpEmailService.js";

const router =
  express.Router();

/* =====================================================
   SETTINGS
===================================================== */

const OTP_EXPIRATION_MINUTES =
  5;

const OTP_RESEND_SECONDS =
  60;

const MAX_OTP_ATTEMPTS =
  5;

const RESET_TOKEN_MINUTES =
  10;

/* =====================================================
   EMAIL REGEX
===================================================== */

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/* =====================================================
   HASH
===================================================== */

function sha256(
  value
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      String(
        value
      )
    )
    .digest(
      "hex"
    );
}

/* =====================================================
   OTP
===================================================== */

function generateOtp() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}

/* =====================================================
   RESET TOKEN
===================================================== */

function generateResetToken() {
  return crypto
    .randomBytes(
      32
    )
    .toString(
      "hex"
    );
}

/* =====================================================
   TIMING-SAFE HASH COMPARISON
===================================================== */

function safeHashCompare(
  first,
  second
) {
  try {
    const firstBuffer =
      Buffer.from(
        String(
          first
        ),
        "hex"
      );

    const secondBuffer =
      Buffer.from(
        String(
          second
        ),
        "hex"
      );

    if (
      firstBuffer.length !==
      secondBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      firstBuffer,
      secondBuffer
    );
  } catch {
    return false;
  }
}

/* =====================================================
   PASSWORD RULES
===================================================== */

function validatePassword(
  password
) {
  const value =
    String(
      password ||
        ""
    );

  if (!value) {
    return "New password is required.";
  }

  if (
    value.length <
    8
  ) {
    return "New password must contain at least 8 characters.";
  }

  if (
    value.length >
    20
  ) {
    return "New password must not exceed 20 characters.";
  }

  if (
    !/[A-Z]/.test(
      value
    )
  ) {
    return "New password must contain at least one uppercase letter (A-Z).";
  }

  if (
    !/[a-z]/.test(
      value
    )
  ) {
    return "New password must contain at least one lowercase letter (a-z).";
  }

  if (
    !/[^A-Za-z0-9]/.test(
      value
    )
  ) {
    return "New password must contain at least one special character, such as @, #, $, or !.";
  }

  return "";
}

/* =====================================================
   MASK EMAIL
===================================================== */

function maskEmail(
  email
) {
  if (
    !email ||
    !email.includes(
      "@"
    )
  ) {
    return "";
  }

  const [
    local,
    domain,
  ] =
    email.split(
      "@"
    );

  return `${local.slice(
    0,
    2
  )}${"*".repeat(
    Math.max(
      local.length -
        2,
      3
    )
  )}@${domain}`;
}

/* =====================================================
   FIND ACCOUNT USING EMAIL

   ORGANIZATION:
   Organization.email
        ↓
   User.organization

   ADMIN:
   User.email, if your Admin account has one.
===================================================== */

async function findAccountByEmail(
  email
) {
  const normalizedEmail =
    String(
      email ||
        ""
    )
      .trim()
      .toLowerCase();

  /* ===================================================
     ORGANIZATION ACCOUNT
  =================================================== */

  const organization =
    await Organization.findOne(
      {
        email:
          normalizedEmail,
      }
    )
      .select(
        "_id organizationName acronym email active"
      )
      .lean();

  if (
    organization
  ) {
    const rawUser =
      await User.collection.findOne(
        {
          organization:
            organization._id,
        },

        {
          projection: {
            _id: 1,
            username: 1,
            role: 1,
            organization: 1,
            password: 1,
            passwordHash: 1,
          },
        }
      );

    if (
      rawUser
    ) {
      return {
        user:
          rawUser,

        email:
          normalizedEmail,

        displayName:
          organization.organizationName ||
          organization.acronym ||
          rawUser.username ||
          "Organization",

        organization,
      };
    }
  }

  /* ===================================================
     ADMIN / OTHER USER

     Works when User document has an email field.
  =================================================== */

  const rawUser =
    await User.collection.findOne(
      {
        email:
          normalizedEmail,
      },

      {
        projection: {
          _id: 1,
          username: 1,
          role: 1,
          email: 1,
          password: 1,
          passwordHash: 1,
        },
      }
    );

  if (
    rawUser
  ) {
    return {
      user:
        rawUser,

      email:
        normalizedEmail,

      displayName:
        rawUser.username ||
        "NUnified User",

      organization:
        null,
    };
  }

  return null;
}

/* =====================================================
   DETERMINE PASSWORD FIELD
===================================================== */

function getPasswordField(
  rawUser
) {
  if (
    typeof rawUser
      ?.password ===
      "string" &&
    rawUser.password
  ) {
    return "password";
  }

  if (
    typeof rawUser
      ?.passwordHash ===
      "string" &&
    rawUser.passwordHash
  ) {
    return "passwordHash";
  }

  return null;
}

/* =====================================================
   1. REQUEST OTP

   POST:
   /api/forgot-password/request-otp
===================================================== */

router.post(
  "/request-otp",

  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body
            ?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      /* ===============================================
         EMAIL VALIDATION
      =============================================== */

      if (!email) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Email address is required.",
          });
      }

      if (
        !EMAIL_REGEX.test(
          email
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Please enter a valid email address.",
          });
      }

      /* ===============================================
         FIND ACCOUNT
      =============================================== */

      const account =
        await findAccountByEmail(
          email
        );

      /*
        SECURITY:

        Do not reveal whether an email exists.

        Unknown emails receive the same public
        response, but no OTP is generated.
      */

      if (
        !account
      ) {
        console.log(
          "PASSWORD RESET REQUEST FOR UNKNOWN EMAIL"
        );

        return res.json({
          success: true,

          message:
            "If this email is registered, a verification code has been sent.",

          expiresIn:
            300,
        });
      }

      const passwordField =
        getPasswordField(
          account.user
        );

      if (
        !passwordField
      ) {
        console.error(
          "PASSWORD RESET ERROR: Account has no supported password field."
        );

        return res
          .status(
            500
          )
          .json({
            message:
              "This account cannot currently be reset. Please contact the administrator.",
          });
      }

      /* ===============================================
         RESEND COOLDOWN
      =============================================== */

      const existing =
        await PasswordResetOtp.findOne(
          {
            user:
              account.user._id,
          }
        );

      if (
        existing
          ?.lastSentAt &&
        !existing.verifiedAt
      ) {
        const elapsed =
          Math.floor(
            (
              Date.now() -
              new Date(
                existing.lastSentAt
              ).getTime()
            ) /
              1000
          );

        if (
          elapsed <
          OTP_RESEND_SECONDS
        ) {
          const remaining =
            OTP_RESEND_SECONDS -
            elapsed;

          return res
            .status(
              429
            )
            .json({
              message:
                `Please wait ${remaining} seconds before requesting another OTP.`,

              retryAfter:
                remaining,
            });
        }
      }

      /* ===============================================
         GENERATE OTP
      =============================================== */

      const otp =
        generateOtp();

      const otpHash =
        sha256(
          otp
        );

      const expiresAt =
        new Date(
          Date.now() +
            OTP_EXPIRATION_MINUTES *
              60 *
              1000
        );

      /* ===============================================
         SAVE
      =============================================== */

      await PasswordResetOtp.findOneAndUpdate(
        {
          user:
            account.user._id,
        },

        {
          $set: {
            user:
              account.user._id,

            email,

            otpHash,

            attempts:
              0,

            passwordField,

            verifiedAt:
              null,

            resetTokenHash:
              "",

            lastSentAt:
              new Date(),

            expiresAt,
          },
        },

        {
          upsert:
            true,

          new:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

      /* ===============================================
         EMAIL OTP
      =============================================== */

      try {
        await sendForgotPasswordOtp(
          {
            to:
              email,

            displayName:
              account.displayName,

            otp,
          }
        );
      } catch (
        emailError
      ) {
        console.error(
          "FORGOT PASSWORD EMAIL ERROR:",
          emailError
        );

        await PasswordResetOtp.deleteOne(
          {
            user:
              account.user._id,
          }
        );

        return res
          .status(
            500
          )
          .json({
            message:
              "Unable to send the verification email. Please try again.",
          });
      }

      console.log(
        "✅ FORGOT PASSWORD OTP SENT:",
        {
          userId:
            String(
              account.user._id
            ),

          email:
            maskEmail(
              email
            ),
        }
      );

      return res.json({
        success:
          true,

        message:
          "A 6-digit verification code was sent to your registered email.",

        email:
          maskEmail(
            email
          ),

        expiresIn:
          OTP_EXPIRATION_MINUTES *
          60,

        resendAfter:
          OTP_RESEND_SECONDS,
      });
    } catch (
      error
    ) {
      console.error(
        "REQUEST FORGOT PASSWORD OTP ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to process the password reset request.",
        });
    }
  }
);

/* =====================================================
   2. VERIFY OTP

   POST:
   /api/forgot-password/verify-otp
===================================================== */

router.post(
  "/verify-otp",

  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body
            ?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const otp =
        String(
          req.body
            ?.otp ||
            ""
        ).trim();

      if (
        !email ||
        !otp
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Email and verification code are required.",
          });
      }

      if (
        !/^\d{6}$/.test(
          otp
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Please enter a valid 6-digit verification code.",
          });
      }

      /* ===============================================
         FIND ACCOUNT
      =============================================== */

      const account =
        await findAccountByEmail(
          email
        );

      if (
        !account
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid or expired verification code.",
          });
      }

      /* ===============================================
         FIND RESET RECORD
      =============================================== */

      const record =
        await PasswordResetOtp.findOne(
          {
            user:
              account.user._id,

            email,
          }
        );

      if (
        !record
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid or expired verification code.",
          });
      }

      /* ===============================================
         EXPIRATION
      =============================================== */

      if (
        new Date(
          record.expiresAt
        ).getTime() <=
        Date.now()
      ) {
        await PasswordResetOtp.deleteOne(
          {
            _id:
              record._id,
          }
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "The verification code has expired. Please request a new OTP.",
          });
      }

      /* ===============================================
         MAX ATTEMPTS
      =============================================== */

      if (
        record.attempts >=
        MAX_OTP_ATTEMPTS
      ) {
        await PasswordResetOtp.deleteOne(
          {
            _id:
              record._id,
          }
        );

        return res
          .status(
            429
          )
          .json({
            message:
              "Too many incorrect attempts. Please request a new OTP.",
          });
      }

      /* ===============================================
         CHECK OTP
      =============================================== */

      const enteredHash =
        sha256(
          otp
        );

      const correct =
        safeHashCompare(
          enteredHash,
          record.otpHash
        );

      if (
        !correct
      ) {
        record.attempts +=
          1;

        await record.save();

        const remaining =
          Math.max(
            MAX_OTP_ATTEMPTS -
              record.attempts,
            0
          );

        return res
          .status(
            400
          )
          .json({
            message:
              `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
          });
      }

      /* ===============================================
         GENERATE RESET TOKEN
      =============================================== */

      const resetToken =
        generateResetToken();

      const resetTokenHash =
        sha256(
          resetToken
        );

      const tokenExpiresAt =
        new Date(
          Date.now() +
            RESET_TOKEN_MINUTES *
              60 *
              1000
        );

      record.verifiedAt =
        new Date();

      record.resetTokenHash =
        resetTokenHash;

      /*
        Extend TTL so record remains available
        while user creates new password.
      */

      record.expiresAt =
        tokenExpiresAt;

      record.attempts =
        0;

      await record.save();

      console.log(
        "✅ FORGOT PASSWORD OTP VERIFIED"
      );

      return res.json({
        success:
          true,

        message:
          "Verification successful. You may now create a new password.",

        resetToken,

        expiresIn:
          RESET_TOKEN_MINUTES *
          60,
      });
    } catch (
      error
    ) {
      console.error(
        "VERIFY FORGOT PASSWORD OTP ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to verify the verification code.",
        });
    }
  }
);

/* =====================================================
   3. RESET PASSWORD

   POST:
   /api/forgot-password/reset-password
===================================================== */

router.post(
  "/reset-password",

  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body
            ?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const resetToken =
        String(
          req.body
            ?.resetToken ||
            ""
        ).trim();

      const newPassword =
        String(
          req.body
            ?.newPassword ||
            ""
        );

      const confirmPassword =
        String(
          req.body
            ?.confirmPassword ||
            ""
        );

      /* ===============================================
         REQUIRED
      =============================================== */

      if (
        !email ||
        !resetToken ||
        !newPassword ||
        !confirmPassword
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Email, reset verification, new password, and confirmation are required.",
          });
      }

      /* ===============================================
         MATCHING PASSWORDS
      =============================================== */

      if (
        newPassword !==
        confirmPassword
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "New password and confirmation do not match.",
          });
      }

      /* ===============================================
         PASSWORD RULES
      =============================================== */

      const validationError =
        validatePassword(
          newPassword
        );

      if (
        validationError
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              validationError,
          });
      }

      /* ===============================================
         ACCOUNT
      =============================================== */

      const account =
        await findAccountByEmail(
          email
        );

      if (
        !account
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Password reset session is invalid or expired.",
          });
      }

      /* ===============================================
         RECORD
      =============================================== */

      const record =
        await PasswordResetOtp.findOne(
          {
            user:
              account.user._id,

            email,
          }
        );

      if (
        !record ||
        !record.verifiedAt ||
        !record.resetTokenHash
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Please verify your OTP before resetting the password.",
          });
      }

      /* ===============================================
         TOKEN EXPIRATION
      =============================================== */

      if (
        new Date(
          record.expiresAt
        ).getTime() <=
        Date.now()
      ) {
        await PasswordResetOtp.deleteOne(
          {
            _id:
              record._id,
          }
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Your password reset session has expired. Please request another OTP.",
          });
      }

      /* ===============================================
         VERIFY RESET TOKEN
      =============================================== */

      const enteredTokenHash =
        sha256(
          resetToken
        );

      if (
        !safeHashCompare(
          enteredTokenHash,
          record.resetTokenHash
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Password reset verification is invalid.",
          });
      }

      /* ===============================================
         PASSWORD FIELD
      =============================================== */

      const passwordField =
        record.passwordField ===
        "passwordHash"
          ? "passwordHash"
          : "password";

      /* ===============================================
         DO NOT ALLOW SAME PASSWORD
      =============================================== */

      const existingHash =
        account.user[
          passwordField
        ];

      if (
        typeof existingHash ===
          "string" &&
        existingHash
      ) {
        try {
          const samePassword =
            await bcrypt.compare(
              newPassword,
              existingHash
            );

          if (
            samePassword
          ) {
            return res
              .status(
                400
              )
              .json({
                message:
                  "New password must be different from your current password.",
              });
          }
        } catch (
          compareError
        ) {
          console.error(
            "OLD PASSWORD COMPARE ERROR:",
            compareError.message
          );
        }
      }

      /* ===============================================
         HASH NEW PASSWORD
      =============================================== */

      const newPasswordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      /* ===============================================
         UPDATE USER

         Raw MongoDB update prevents double hashing.
      =============================================== */

      const updateResult =
        await User.collection.updateOne(
          {
            _id:
              account.user._id,
          },

          {
            $set: {
              [passwordField]:
                newPasswordHash,
            },
          }
        );

      if (
        updateResult.matchedCount ===
        0
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "User account could not be found.",
          });
      }

      /* ===============================================
         DESTROY RESET SESSION
      =============================================== */

      await PasswordResetOtp.deleteOne(
        {
          _id:
            record._id,
        }
      );

      console.log(
        "✅ FORGOT PASSWORD RESET SUCCESSFUL:",
        String(
          account.user._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Your password has been reset successfully. You can now sign in using your new password.",
      });
    } catch (
      error
    ) {
      console.error(
        "RESET FORGOT PASSWORD ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to reset the password.",
        });
    }
  }
);

/* =====================================================
   CANCEL RESET

   DELETE:
   /api/forgot-password/cancel
===================================================== */

router.delete(
  "/cancel",

  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body
            ?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      if (email) {
        const account =
          await findAccountByEmail(
            email
          );

        if (
          account
        ) {
          await PasswordResetOtp.deleteOne(
            {
              user:
                account.user._id,
            }
          );
        }
      }

      return res.json({
        success:
          true,

        message:
          "Password reset cancelled.",
      });
    } catch (
      error
    ) {
      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to cancel password reset.",
        });
    }
  }
);

export default router;