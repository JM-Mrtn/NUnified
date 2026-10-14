import express from "express";

import bcrypt from "bcryptjs";

import crypto from "crypto";

import User from "../models/User.js";

import Organization from "../models/Organization.js";

import PasswordChangeOtp from "../models/PasswordChangeOtp.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

import {
  sendPasswordChangeOtp,
} from "../services/passwordOtpEmailService.js";

const router =
  express.Router();

/* =====================================================
   CONSTANTS
===================================================== */

const OTP_EXPIRATION_MINUTES =
  5;

const OTP_RESEND_SECONDS =
  60;

const MAX_OTP_ATTEMPTS =
  5;

const PASSWORD_MIN_LENGTH =
  8;

const PASSWORD_MAX_LENGTH =
  20;

/* =====================================================
   OTP HASH
===================================================== */

function hashOtp(
  otp
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      String(
        otp
      )
    )
    .digest(
      "hex"
    );
}

/* =====================================================
   GENERATE OTP
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
   MASK EMAIL

   Example:
   ra********@gmail.com
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

  const visible =
    local.slice(
      0,
      2
    );

  const hidden =
    "*".repeat(
      Math.max(
        local.length -
          2,
        3
      )
    );

  return `${visible}${hidden}@${domain}`;
}

/* =====================================================
   VALIDATE NEW PASSWORD

   Requirements:
   - required
   - minimum 8
   - maximum 20
   - uppercase
   - lowercase
   - special character
===================================================== */

function validateNewPassword(
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
    PASSWORD_MIN_LENGTH
  ) {
    return `New password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (
    value.length >
    PASSWORD_MAX_LENGTH
  ) {
    return `New password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
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
   GET AUTHENTICATED USER

   IMPORTANT:

   We do NOT depend on req.user.password.

   authMiddleware normally should not expose
   the password.
===================================================== */

async function getCurrentUser(
  req
) {
  const userId =
    req.user?._id ||
    req.user?.id;

  if (!userId) {
    return null;
  }

  return User.findById(
    userId
  ).select(
    "_id username role organization"
  );
}

/* =====================================================
   GET ORGANIZATION
===================================================== */

async function getOrganization(
  user
) {
  const organizationId =
    user?.organization
      ?._id ||
    user?.organization;

  if (
    !organizationId
  ) {
    return null;
  }

  return Organization.findById(
    organizationId
  );
}

/* =====================================================
   READ PASSWORD CANDIDATES DIRECTLY FROM MONGODB

   WHY:

   Your current Mongoose query is finding the User,
   but user.password is undefined.

   Reading the raw MongoDB document avoids problems
   caused by:

   select: false
   schema field selection
   legacy password field naming

   Supported fields:

   password
   passwordHash
===================================================== */

async function getPasswordCandidates(
  userId
) {
  const rawUser =
    await User.collection.findOne(
      {
        _id:
          userId,
      },

      {
        projection: {
          password:
            1,

          passwordHash:
            1,
        },
      }
    );

  if (!rawUser) {
    return [];
  }

  const candidates =
    [];

  if (
    typeof rawUser.password ===
      "string" &&
    rawUser.password.trim()
  ) {
    candidates.push({
      field:
        "password",

      hash:
        rawUser.password,
    });
  }

  if (
    typeof rawUser.passwordHash ===
      "string" &&
    rawUser.passwordHash.trim()
  ) {
    candidates.push({
      field:
        "passwordHash",

      hash:
        rawUser.passwordHash,
    });
  }

  return candidates;
}

/* =====================================================
   FIND WHICH STORED PASSWORD MATCHES

   We never log the password or hash.
===================================================== */

async function findMatchingPassword(
  userId,
  currentPassword
) {
  const candidates =
    await getPasswordCandidates(
      userId
    );

  if (
    candidates.length ===
    0
  ) {
    return {
      foundCredential:
        false,

      matched:
        false,

      field:
        null,

      hash:
        null,
    };
  }

  for (
    const candidate
    of candidates
  ) {
    try {
      const matched =
        await bcrypt.compare(
          currentPassword,
          candidate.hash
        );

      if (matched) {
        return {
          foundCredential:
            true,

          matched:
            true,

          field:
            candidate.field,

          hash:
            candidate.hash,
        };
      }
    } catch (
      error
    ) {
      /*
        Do not stop immediately.

        There may be another supported
        password field.
      */

      console.error(
        `PASSWORD COMPARE ERROR FOR ${candidate.field}:`,
        error.message
      );
    }
  }

  return {
    foundCredential:
      true,

    matched:
      false,

    field:
      null,

    hash:
      null,
  };
}

/* =====================================================
   STEP 1
   REQUEST PASSWORD CHANGE OTP

   POST:
   /api/password-change/request-otp
===================================================== */

router.post(
  "/request-otp",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "\n========================================"
      );

      console.log(
        "PASSWORD CHANGE OTP REQUEST"
      );

      console.log(
        "========================================"
      );

      /* ===============================================
         SAFE REQUEST LOG

         NEVER print passwords.
      =============================================== */

      console.log(
        "REQUEST USER:",
        {
          id:
            req.user?._id ||
            req.user?.id,

          role:
            req.user?.role,

          organization:
            req.user
              ?.organization,
        }
      );

      console.log(
        "REQUEST BODY:",
        {
          hasCurrentPassword:
            Boolean(
              req.body
                ?.currentPassword
            ),

          hasNewPassword:
            Boolean(
              req.body
                ?.newPassword
            ),

          hasConfirmPassword:
            Boolean(
              req.body
                ?.confirmPassword
            ),
        }
      );

      /* ===============================================
         BODY
      =============================================== */

      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } =
        req.body ||
        {};

      /* ===============================================
         REQUIRED FIELDS
      =============================================== */

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        console.log(
          "❌ VALIDATION FAILED: Missing fields"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Current password, new password, and confirmation are required.",
          });
      }

      /* ===============================================
         CONFIRMATION
      =============================================== */

      if (
        newPassword !==
        confirmPassword
      ) {
        console.log(
          "❌ VALIDATION FAILED: Password confirmation does not match"
        );

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
         PASSWORD REQUIREMENTS
      =============================================== */

      const passwordValidationMessage =
        validateNewPassword(
          newPassword
        );

      if (
        passwordValidationMessage
      ) {
        console.log(
          "❌ VALIDATION FAILED: New password requirements"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              passwordValidationMessage,
          });
      }

      /* ===============================================
         GET USER
      =============================================== */

      const user =
        await getCurrentUser(
          req
        );

      console.log(
        "USER FOUND:",
        Boolean(
          user
        )
      );

      if (!user) {
        console.log(
          "❌ USER ACCOUNT NOT FOUND"
        );

        return res
          .status(
            404
          )
          .json({
            message:
              "User account not found.",
          });
      }

      console.log(
        "USER INFO:",
        {
          id:
            user._id,

          username:
            user.username,

          role:
            user.role,

          organization:
            user.organization,
        }
      );

      /* ===============================================
         READ + VERIFY CURRENT PASSWORD

         This is the main fix.
      =============================================== */

      const passwordCheck =
        await findMatchingPassword(
          user._id,
          currentPassword
        );

      console.log(
        "PASSWORD DATABASE CHECK:",
        {
          credentialFound:
            passwordCheck
              .foundCredential,

          currentPasswordValid:
            passwordCheck
              .matched,

          /*
            Logging the FIELD NAME is safe.

            Do not log the hash.
          */
          passwordField:
            passwordCheck.field ||
            "none",
        }
      );

      /* ===============================================
         NO PASSWORD FIELD FOUND
      =============================================== */

      if (
        !passwordCheck
          .foundCredential
      ) {
        console.log(
          "❌ NO PASSWORD OR PASSWORDHASH FIELD FOUND IN USER DOCUMENT"
        );

        return res
          .status(
            500
          )
          .json({
            message:
              "The login credential could not be read from the user account. Please contact the administrator.",
          });
      }

      /* ===============================================
         CURRENT PASSWORD INCORRECT
      =============================================== */

      if (
        !passwordCheck
          .matched
      ) {
        console.log(
          "❌ CURRENT PASSWORD INCORRECT"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Current password is incorrect.",
          });
      }

      console.log(
        "✅ CURRENT PASSWORD VERIFIED"
      );

      /* ===============================================
         NEW PASSWORD MUST BE DIFFERENT

         Verify against the actual stored bcrypt hash.
      =============================================== */

      const sameAsCurrent =
        await bcrypt.compare(
          newPassword,
          passwordCheck.hash
        );

      if (
        sameAsCurrent
      ) {
        console.log(
          "❌ NEW PASSWORD IS SAME AS CURRENT PASSWORD"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "New password must be different from your current password.",
          });
      }

      /* ===============================================
         GET ORGANIZATION
      =============================================== */

      const organization =
        await getOrganization(
          user
        );

      console.log(
        "ORGANIZATION FOUND:",
        Boolean(
          organization
        )
      );

      if (
        !organization
      ) {
        console.log(
          "❌ ORGANIZATION NOT FOUND"
        );

        return res
          .status(
            404
          )
          .json({
            message:
              "Your organization account could not be found.",
          });
      }

      /* ===============================================
         EMAIL
      =============================================== */

      const email =
        organization.email
          ?.trim()
          .toLowerCase();

      console.log(
        "REGISTERED EMAIL FOUND:",
        Boolean(
          email
        )
      );

      if (!email) {
        console.log(
          "❌ ORGANIZATION HAS NO REGISTERED EMAIL"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "No registered email address was found for this organization.",
          });
      }

      /* ===============================================
         RESEND COOLDOWN
      =============================================== */

      const existingOtp =
        await PasswordChangeOtp.findOne(
          {
            user:
              user._id,
          }
        );

      if (
        existingOtp
          ?.lastSentAt
      ) {
        const elapsed =
          Math.floor(
            (
              Date.now() -
              new Date(
                existingOtp.lastSentAt
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

          console.log(
            `⚠️ OTP RESEND BLOCKED: ${remaining} seconds remaining`
          );

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
        hashOtp(
          otp
        );

      /* ===============================================
         HASH NEW PASSWORD

         Only the bcrypt hash is stored.
      =============================================== */

      const newPasswordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      /* ===============================================
         EXPIRATION
      =============================================== */

      const expiresAt =
        new Date(
          Date.now() +
            OTP_EXPIRATION_MINUTES *
              60 *
              1000
        );

      console.log(
        "OTP GENERATED: YES"
      );

      console.log(
        "OTP EXPIRATION CREATED: YES"
      );

      /* ===============================================
         SAVE OTP REQUEST

         Store which credential field is used:

         password

         OR

         passwordHash
      =============================================== */

      await PasswordChangeOtp.findOneAndUpdate(
        {
          user:
            user._id,
        },

        {
          $set: {
            user:
              user._id,

            otpHash,

            newPasswordHash,

            passwordField:
              passwordCheck.field,

            attempts:
              0,

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

      console.log(
        "OTP RECORD SAVED: YES"
      );

      /* ===============================================
         SEND EMAIL
      =============================================== */

      console.log(
        "SENDING OTP EMAIL..."
      );

      try {
        await sendPasswordChangeOtp(
          {
            to:
              email,

            organizationName:
              organization
                .organizationName,

            otp,
          }
        );

        console.log(
          "✅ OTP EMAIL SENT SUCCESSFULLY"
        );
      } catch (
        emailError
      ) {
        console.error(
          "❌ PASSWORD OTP EMAIL ERROR:",
          emailError
        );

        /*
          If the email fails, remove the OTP
          so the user can request another.
        */

        await PasswordChangeOtp.deleteOne(
          {
            user:
              user._id,
          }
        );

        return res
          .status(
            500
          )
          .json({
            message:
              "Unable to send the verification email. Please check the backend email settings.",
          });
      }

      /* ===============================================
         SUCCESS
      =============================================== */

      console.log(
        "✅ PASSWORD CHANGE OTP REQUEST COMPLETED"
      );

      console.log(
        "========================================\n"
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
        "\n❌ PASSWORD CHANGE OTP REQUEST ERROR:"
      );

      console.error(
        error
      );

      console.log(
        "========================================\n"
      );

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to send password change OTP.",
        });
    }
  }
);

/* =====================================================
   STEP 2
   VERIFY OTP + CHANGE PASSWORD

   POST:
   /api/password-change/verify-otp
===================================================== */

router.post(
  "/verify-otp",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "\n========================================"
      );

      console.log(
        "VERIFY PASSWORD CHANGE OTP"
      );

      console.log(
        "========================================"
      );

      /* ===============================================
         BODY
      =============================================== */

      const {
        otp,
      } =
        req.body ||
        {};

      /* ===============================================
         OTP FORMAT
      =============================================== */

      if (
        !otp ||
        !/^\d{6}$/.test(
          String(
            otp
          )
        )
      ) {
        console.log(
          "❌ INVALID OTP FORMAT"
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Please enter a valid 6-digit OTP.",
          });
      }

      /* ===============================================
         GET USER
      =============================================== */

      const user =
        await getCurrentUser(
          req
        );

      console.log(
        "USER FOUND:",
        Boolean(
          user
        )
      );

      if (!user) {
        console.log(
          "❌ USER NOT FOUND"
        );

        return res
          .status(
            404
          )
          .json({
            message:
              "User account not found.",
          });
      }

      /* ===============================================
         OTP RECORD
      =============================================== */

      const record =
        await PasswordChangeOtp.findOne(
          {
            user:
              user._id,
          }
        );

      console.log(
        "OTP RECORD FOUND:",
        Boolean(
          record
        )
      );

      if (!record) {
        return res
          .status(
            400
          )
          .json({
            message:
              "No password change verification request was found. Please request a new OTP.",
          });
      }

      /* ===============================================
         EXPIRED
      =============================================== */

      const expired =
        new Date(
          record.expiresAt
        ).getTime() <=
        Date.now();

      console.log(
        "OTP EXPIRED:",
        expired
      );

      if (expired) {
        await PasswordChangeOtp.deleteOne(
          {
            _id:
              record._id,
          }
        );

        console.log(
          "❌ OTP EXPIRED"
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
         ATTEMPTS
      =============================================== */

      console.log(
        "CURRENT OTP ATTEMPTS:",
        record.attempts
      );

      if (
        record.attempts >=
        MAX_OTP_ATTEMPTS
      ) {
        await PasswordChangeOtp.deleteOne(
          {
            _id:
              record._id,
          }
        );

        console.log(
          "❌ MAXIMUM OTP ATTEMPTS REACHED"
        );

        return res
          .status(
            429
          )
          .json({
            message:
              "Too many incorrect OTP attempts. Please request a new verification code.",
          });
      }

      /* ===============================================
         VERIFY OTP
      =============================================== */

      const enteredOtpHash =
        hashOtp(
          otp
        );

      let otpMatches =
        false;

      try {
        const savedBuffer =
          Buffer.from(
            record.otpHash,
            "hex"
          );

        const enteredBuffer =
          Buffer.from(
            enteredOtpHash,
            "hex"
          );

        if (
          savedBuffer.length ===
          enteredBuffer.length
        ) {
          otpMatches =
            crypto.timingSafeEqual(
              savedBuffer,
              enteredBuffer
            );
        }
      } catch (
        compareError
      ) {
        console.error(
          "OTP HASH COMPARE ERROR:",
          compareError
        );

        otpMatches =
          false;
      }

      console.log(
        "OTP VALID:",
        otpMatches
      );

      if (
        !otpMatches
      ) {
        record.attempts +=
          1;

        await record.save();

        const attemptsLeft =
          Math.max(
            MAX_OTP_ATTEMPTS -
              record.attempts,
            0
          );

        console.log(
          `❌ INCORRECT OTP - ${attemptsLeft} attempts remaining`
        );

        return res
          .status(
            400
          )
          .json({
            message:
              `Incorrect verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
          });
      }

      /* ===============================================
         DETERMINE PASSWORD FIELD

         New OTP records contain passwordField.

         "password" is only a fallback for an old
         OTP document created before this update.
      =============================================== */

      const passwordField =
        record.passwordField ===
        "passwordHash"
          ? "passwordHash"
          : "password";

      console.log(
        "UPDATING PASSWORD FIELD:",
        passwordField
      );

      /* ===============================================
         UPDATE PASSWORD DIRECTLY IN MONGODB

         IMPORTANT:

         record.newPasswordHash is ALREADY
         bcrypt-hashed.

         We use the raw collection so:
         - Mongoose does not hide/ignore a field
         - pre-save hashing cannot hash it twice
      =============================================== */

      const updateResult =
        await User.collection.updateOne(
          {
            _id:
              user._id,
          },

          {
            $set: {
              [passwordField]:
                record.newPasswordHash,
            },
          }
        );

      console.log(
        "PASSWORD UPDATE RESULT:",
        {
          matchedCount:
            updateResult.matchedCount,

          modifiedCount:
            updateResult.modifiedCount,
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
              "Unable to find the user account while updating the password.",
          });
      }

      /* ===============================================
         DELETE USED OTP
      =============================================== */

      await PasswordChangeOtp.deleteOne(
        {
          _id:
            record._id,
        }
      );

      console.log(
        "OTP RECORD DELETED: YES"
      );

      console.log(
        "✅ PASSWORD CHANGED SUCCESSFULLY"
      );

      console.log(
        "========================================\n"
      );

      return res.json({
        success:
          true,

        message:
          "Password changed successfully. Please sign in again using your new password.",
      });
    } catch (
      error
    ) {
      console.error(
        "\n❌ VERIFY PASSWORD OTP ERROR:"
      );

      console.error(
        error
      );

      console.log(
        "========================================\n"
      );

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to verify the verification code.",
        });
    }
  }
);

/* =====================================================
   CANCEL PASSWORD CHANGE

   DELETE:
   /api/password-change/cancel
===================================================== */

router.delete(
  "/cancel",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getCurrentUser(
          req
        );

      if (user) {
        await PasswordChangeOtp.deleteOne(
          {
            user:
              user._id,
          }
        );
      }

      console.log(
        "PASSWORD CHANGE CANCELLED"
      );

      return res.json({
        success:
          true,

        message:
          "Password change cancelled.",
      });
    } catch (
      error
    ) {
      console.error(
        "CANCEL PASSWORD CHANGE ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to cancel password change.",
        });
    }
  }
);

export default router;