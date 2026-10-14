import mongoose from "mongoose";

/* =====================================================
   ARCHIVED ADMIN REQUEST SCHEMA
===================================================== */

const archivedAdminRequestSchema =
  new mongoose.Schema(
    {
      /* =================================================
         ORIGINAL REQUEST ID
      ================================================= */

      originalRequestId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      /* =================================================
         ORGANIZATION
      ================================================= */

      organization: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Organization",

        required:
          true,

        index:
          true,
      },

      /* =================================================
         REQUEST TYPE
      ================================================= */

      requestType: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         SUBJECT
      ================================================= */

      subject: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         TITLE
      ================================================= */

      title: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         BOOKING
      ================================================= */

      booking: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      relatedBooking: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         REASON / MESSAGE
      ================================================= */

      reason: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      message: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         STATUS
      ================================================= */

      status: {
        type:
          String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default:
          "pending",

        index:
          true,
      },

      /* =================================================
         ADMIN REMARKS
      ================================================= */

      remarks: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      /* =================================================
         ORIGINAL SUBMITTED DATE
      ================================================= */

      submittedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =================================================
         ORIGINAL CREATED DATE
      ================================================= */

      originalCreatedAt: {
        type:
          Date,

        default:
          null,
      },

      originalUpdatedAt: {
        type:
          Date,

        default:
          null,
      },

      /* =================================================
         COMPLETE ORIGINAL REQUEST SNAPSHOT
      ================================================= */

      snapshot: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          {},
      },

      /* =================================================
         ARCHIVED DATE
      ================================================= */

      archivedAt: {
        type:
          Date,

        default:
          Date.now,

        index:
          true,
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

const ArchivedAdminRequest =
  mongoose.models
    .ArchivedAdminRequest ||
  mongoose.model(
    "ArchivedAdminRequest",

    archivedAdminRequestSchema
  );

export default ArchivedAdminRequest;