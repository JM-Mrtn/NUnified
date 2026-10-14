import mongoose from "mongoose";

/* =====================================================
   ADMIN REQUEST SCHEMA
===================================================== */

const adminRequestSchema =
  new mongoose.Schema(
    {
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

      requestType: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      subject: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      title: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

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

      reason: {
        type:
          String,

        default:
          "",

        trim:
          true,

        maxlength:
          2000,
      },

      message: {
        type:
          String,

        default:
          "",

        trim:
          true,

        maxlength:
          2000,
      },

      status: {
        type:
          String,

        enum: [
          "draft",
          "pending",
          "approved",
          "rejected",
        ],

        default:
          "pending",

        index:
          true,
      },

      remarks: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      submittedAt: {
        type:
          Date,

        default:
          null,
      },

      draftUpdatedAt: {
        type:
          Date,

        default:
          null,
      },
    },

    {
      timestamps:
        true,
    }
  );

/* =====================================================
   INDEX
===================================================== */

adminRequestSchema.index({
  organization:
    1,

  status:
    1,

  submittedAt:
    -1,
});

/* =====================================================
   MODEL
===================================================== */

const AdminRequest =
  mongoose.models
    .AdminRequest ||
  mongoose.model(
    "AdminRequest",
    adminRequestSchema
  );

export default AdminRequest;