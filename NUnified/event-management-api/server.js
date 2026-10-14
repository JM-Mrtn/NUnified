import express from "express";

import mongoose from "mongoose";

import cors from "cors";

import dotenv from "dotenv";

import path from "path";

import {
  fileURLToPath,
} from "url";

/* =====================================================
   ROUTES
===================================================== */

import authRouter from "./routes/auth.js";

import organizationsRouter from "./routes/organizations.js";

import eventsRouter from "./routes/events.js";

import bookingsRouter from "./routes/bookings.js";

import bookingDocumentsRouter from "./routes/bookingDocuments.js";

import adminRequestsRouter from "./routes/adminRequests.js";

import adminRequestArchiveRouter from "./routes/adminRequestArchive.js";

import announcementsRouter from "./routes/announcements.js";

import announcementArchiveRouter from "./routes/announcementArchive.js";

import passwordChangeRouter from "./routes/passwordChange.js";

import forgotPasswordRouter from "./routes/forgotPassword.js";

import organizationProfileRouter from "./routes/organizationProfile.js";

/* =====================================================
   MODELS
===================================================== */

import Organization from "./models/Organization.js";

import OrganizationProfile from "./models/OrganizationProfile.js";

import User from "./models/User.js";

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

import {
  protect,
} from "./middleware/authMiddleware.js";

/* =====================================================
   ENVIRONMENT
===================================================== */

dotenv.config();

/* =====================================================
   EXPRESS APP
===================================================== */

const app =
  express();

const PORT =
  process.env.PORT ||
  5000;

/* =====================================================
   DIRECTORY
===================================================== */

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

/* =====================================================
   CORS
===================================================== */

const allowedOrigins = [
  process.env.CLIENT_URL,

  "http://localhost:5173",

  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
        Allow:
        - Postman
        - backend requests
        - frontend localhost
        - production frontend
      */

      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );
    },

    credentials:
      true,
  })
);

/* =====================================================
   BODY PARSERS
===================================================== */

app.use(
  express.json({
    limit:
      "15mb",
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      "15mb",
  })
);

/* =====================================================
   PUBLIC UPLOADS
===================================================== */

app.use(
  "/uploads",

  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);

/* =====================================================
   REQUEST LOGGER
===================================================== */

app.use(
  (
    req,
    res,
    next
  ) => {
    console.log(
      `${req.method} ${req.originalUrl}`
    );

    next();
  }
);

/* =====================================================
   ROOT
===================================================== */

app.get(
  "/",

  (
    req,
    res
  ) => {
    return res.json({
      success:
        true,

      message:
        "NUnified Event Management API is running.",
    });
  }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",

  (
    req,
    res
  ) => {
    return res.json({
      success:
        true,

      message:
        "NUnified API is healthy.",
    });
  }
);

/* =====================================================
   PROFILE PICTURE HELPER
===================================================== */

async function getCurrentOrganizationId(
  req
) {
  /* ===================================================
     CHECK AUTH USER FIRST
  =================================================== */

  const directOrganization =
    req.user
      ?.organization
      ?._id ||
    req.user
      ?.organization;

  if (
    directOrganization
  ) {
    return directOrganization;
  }

  /* ===================================================
     FALLBACK TO USER DATABASE
  =================================================== */

  const userId =
    req.user?._id ||
    req.user?.id;

  if (!userId) {
    return null;
  }

  const user =
    await User.findById(
      userId
    ).select(
      "organization role"
    );

  if (!user) {
    return null;
  }

  if (
    user.role !==
    "organization"
  ) {
    return null;
  }

  return (
    user.organization ||
    null
  );
}

/* =====================================================
   PROFILE PICTURE
   GET

   BOTH URLS:

   /api/organization-profile/me/profile-picture
   /api/organizations/me/profile-picture
===================================================== */

app.get(
  [
    "/api/organization-profile/me/profile-picture",

    "/api/organizations/me/profile-picture",
  ],

  protect,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const organization =
        await Organization.findById(
          organizationId
        ).select(
          "organizationName acronym profileImage"
        );

      if (
        !organization
      ) {
        return res
          .status(404)
          .json({
            message:
              "Organization not found.",
          });
      }

      const profile =
        await OrganizationProfile.findOne(
          {
            organization:
              organizationId,
          }
        ).select(
          "profileImage"
        );

      const image =
        profile?.profileImage ||
        organization.profileImage ||
        "";

      console.log(
        "PROFILE PICTURE LOADED:",
        {
          organization:
            organization.organizationName,

          organizationId:
            String(
              organizationId
            ),

          exists:
            Boolean(
              image
            ),

          length:
            image.length,
        }
      );

      return res.json({
        success:
          true,

        profileImage:
          image,
      });
    } catch (
      error
    ) {
      console.error(
        "GET PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load profile picture.",
        });
    }
  }
);

/* =====================================================
   PROFILE PICTURE
   SAVE / CHANGE
===================================================== */

app.put(
  [
    "/api/organization-profile/me/profile-picture",

    "/api/organizations/me/profile-picture",
  ],

  protect,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const {
        profileImage,
      } =
        req.body ||
        {};

      if (
        !profileImage
      ) {
        return res
          .status(400)
          .json({
            message:
              "Profile picture is required.",
          });
      }

      const image =
        String(
          profileImage
        );

      /* =================================================
         IMAGE FORMAT
      ================================================= */

      if (
        !image.startsWith(
          "data:image/"
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid profile picture format.",
          });
      }

      /* =================================================
         IMAGE SIZE
      ================================================= */

      if (
        image.length >
        2_000_000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Profile picture is too large. Please choose a smaller image.",
          });
      }

      /* =================================================
         ORGANIZATION
      ================================================= */

      const organization =
        await Organization.findById(
          organizationId
        ).select(
          "_id organizationName"
        );

      if (
        !organization
      ) {
        return res
          .status(404)
          .json({
            message:
              "Organization not found.",
          });
      }

      /* =================================================
         SAVE ORGANIZATION PROFILE
      ================================================= */

      await OrganizationProfile.findOneAndUpdate(
        {
          organization:
            organizationId,
        },

        {
          $set: {
            profileImage:
              image,
          },
        },

        {
          new:
            true,

          upsert:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

      /* =================================================
         SYNC ORGANIZATION
      ================================================= */

      await Organization.updateOne(
        {
          _id:
            organizationId,
        },

        {
          $set: {
            profileImage:
              image,
          },
        }
      );

      /* =================================================
         VERIFY
      ================================================= */

      const verifyProfile =
        await OrganizationProfile.findOne(
          {
            organization:
              organizationId,
          }
        ).select(
          "profileImage"
        );

      const verifyOrganization =
        await Organization.findById(
          organizationId
        ).select(
          "profileImage"
        );

      const savedImage =
        verifyProfile
          ?.profileImage ||
        verifyOrganization
          ?.profileImage ||
        "";

      console.log(
        "PROFILE PICTURE SAVE VERIFY:",
        {
          organization:
            organization.organizationName,

          organizationId:
            String(
              organizationId
            ),

          profileCollection:
            Boolean(
              verifyProfile
                ?.profileImage
            ),

          organizationCollection:
            Boolean(
              verifyOrganization
                ?.profileImage
            ),

          exists:
            Boolean(
              savedImage
            ),

          length:
            savedImage.length,
        }
      );

      if (
        !savedImage
      ) {
        return res
          .status(500)
          .json({
            message:
              "The picture was received but could not be saved to MongoDB.",
          });
      }

      return res.json({
        success:
          true,

        message:
          "Profile picture saved successfully.",

        profileImage:
          savedImage,
      });
    } catch (
      error
    ) {
      console.error(
        "SAVE PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to save profile picture.",
        });
    }
  }
);

/* =====================================================
   PROFILE PICTURE
   REMOVE
===================================================== */

app.delete(
  [
    "/api/organization-profile/me/profile-picture",

    "/api/organizations/me/profile-picture",
  ],

  protect,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      /* =================================================
         DELETE ORGANIZATION PROFILE
      ================================================= */

      await OrganizationProfile.findOneAndDelete(
        {
          organization:
            organizationId,
        }
      );

      /* =================================================
         CLEAR ORGANIZATION IMAGE
      ================================================= */

      await Organization.updateOne(
        {
          _id:
            organizationId,
        },

        {
          $set: {
            profileImage:
              "",
          },
        }
      );

      console.log(
        "PROFILE PICTURE REMOVED:",
        String(
          organizationId
        )
      );

      return res.json({
        success:
          true,

        message:
          "Profile picture removed successfully.",

        profileImage:
          "",
      });
    } catch (
      error
    ) {
      console.error(
        "REMOVE PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to remove profile picture.",
        });
    }
  }
);

/* =====================================================
   API ROUTES
===================================================== */

/* =====================================================
   AUTH
===================================================== */

app.use(
  "/api/auth",

  authRouter
);

/* =====================================================
   ORGANIZATIONS
===================================================== */

app.use(
  "/api/organizations",

  organizationsRouter
);

/* =====================================================
   EVENTS
===================================================== */

app.use(
  "/api/events",

  eventsRouter
);

/* =====================================================
   BOOKINGS
===================================================== */

app.use(
  "/api/bookings",

  bookingsRouter
);

/* =====================================================
   BOOKING DOCUMENTS
===================================================== */

app.use(
  "/api/booking-documents",

  bookingDocumentsRouter
);

/* =====================================================
   ADMIN REQUESTS

   IMPORTANT:

   These routes include:
   - normal requests
   - draft requests
   - submit draft
   - update draft
   - delete draft

   Actual endpoint definitions must exist inside:
   routes/adminRequests.js
===================================================== */

app.use(
  "/api/admin-requests",

  adminRequestsRouter
);

/* =====================================================
   ADMIN REQUEST ARCHIVE
===================================================== */

app.use(
  "/api/admin-request-archive",

  adminRequestArchiveRouter
);

/* =====================================================
   ANNOUNCEMENTS
===================================================== */

app.use(
  "/api/announcements",

  announcementsRouter
);

/* =====================================================
   ANNOUNCEMENT ARCHIVE
===================================================== */

app.use(
  "/api/announcement-archive",

  announcementArchiveRouter
);

/* =====================================================
   PASSWORD CHANGE
===================================================== */

app.use(
  "/api/password-change",

  passwordChangeRouter
);

/* =====================================================
   FORGOT PASSWORD
===================================================== */

app.use(
  "/api/forgot-password",

  forgotPasswordRouter
);

/* =====================================================
   ORGANIZATION PROFILE
===================================================== */

app.use(
  "/api/organization-profile",

  organizationProfileRouter
);

/* =====================================================
   API 404

   IMPORTANT:
   NOTHING SHOULD BE REGISTERED BELOW THIS
   EXCEPT ERROR HANDLERS.
===================================================== */

app.use(
  (
    req,
    res
  ) => {
    console.log(
      "❌ API ROUTE NOT FOUND:",
      {
        method:
          req.method,

        url:
          req.originalUrl,
      }
    );

    return res
      .status(404)
      .json({
        message:
          "API route not found.",
      });
  }
);

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    return res
      .status(
        error.status ||
        500
      )
      .json({
        message:
          error.message ||
          "Internal server error.",
      });
  }
);

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {
  try {
    /* =================================================
       ENV CHECK
    ================================================= */

    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "MONGO_URI is missing from the .env file."
      );
    }

    if (
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET is missing from the .env file."
      );
    }

    /* =================================================
       MONGODB
    ================================================= */

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected successfully."
    );

    /* =================================================
       SERVER
    ================================================= */

    app.listen(
      PORT,

      () => {
        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          `Uploads available at http://localhost:${PORT}/uploads`
        );

        console.log("");

        /* =============================================
           PROFILE PICTURE
        ============================================= */

        console.log(
          "PROFILE PICTURE ROUTES READY:"
        );

        console.log(
          "GET    /api/organization-profile/me/profile-picture"
        );

        console.log(
          "PUT    /api/organization-profile/me/profile-picture"
        );

        console.log(
          "DELETE /api/organization-profile/me/profile-picture"
        );

        console.log("");

        /* =============================================
           ADMIN REQUESTS
        ============================================= */

        console.log(
          "ADMIN REQUEST ROUTER READY:"
        );

        console.log(
          "BASE    /api/admin-requests"
        );

        console.log(
          "Draft endpoints must exist in routes/adminRequests.js"
        );

        console.log("");

        /* =============================================
           ADMIN REQUEST ARCHIVES
        ============================================= */

        console.log(
          "ADMIN REQUEST ARCHIVE ROUTES READY:"
        );

        console.log(
          "GET    /api/admin-request-archive"
        );

        console.log(
          "POST   /api/admin-request-archive/:requestId"
        );

        console.log(
          "POST   /api/admin-request-archive/:archiveId/restore"
        );

        console.log(
          "DELETE /api/admin-request-archive/:archiveId"
        );

        console.log("");

        /* =============================================
           ANNOUNCEMENT ARCHIVE
        ============================================= */

        console.log(
          "ANNOUNCEMENT ARCHIVE ROUTES READY:"
        );

        console.log(
          "GET    /api/announcement-archive"
        );

        console.log(
          "GET    /api/announcement-archive/test"
        );

        console.log(
          "POST   /api/announcement-archive/:announcementId"
        );

        console.log(
          "POST   /api/announcement-archive/:archiveId/restore"
        );

        console.log(
          "DELETE /api/announcement-archive/:archiveId"
        );

        console.log("");

        /* =============================================
           PASSWORD CHANGE
        ============================================= */

        console.log(
          "PASSWORD CHANGE ROUTES READY:"
        );

        console.log(
          "POST   /api/password-change/request-otp"
        );

        console.log(
          "POST   /api/password-change/verify-otp"
        );

        console.log(
          "DELETE /api/password-change/cancel"
        );

        console.log("");

        /* =============================================
           FORGOT PASSWORD
        ============================================= */

        console.log(
          "FORGOT PASSWORD ROUTES READY:"
        );

        console.log(
          "POST   /api/forgot-password/request-otp"
        );

        console.log(
          "POST   /api/forgot-password/verify-otp"
        );

        console.log(
          "POST   /api/forgot-password/reset-password"
        );

        console.log(
          "DELETE /api/forgot-password/cancel"
        );

        console.log("");
      }
    );
  } catch (
    error
  ) {
    console.error(
      "SERVER START ERROR:",
      error
    );

    process.exit(
      1
    );
  }
}

startServer();