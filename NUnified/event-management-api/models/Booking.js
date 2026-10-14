import mongoose from "mongoose";

const bookingDocumentSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        required: true,
      },

      fileName: {
        type: String,
        required: true,
      },

      mimeType: {
        type: String,
        required: true,
      },

      size: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );

const bookingSchema =
  new mongoose.Schema(
    {
      bookingReference: {
        type: String,
        unique: true,
      },

      organization: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Organization",

        required: true,
      },

      eventName: {
        type: String,
        required: true,
        trim: true,
      },

      eventType: {
        type: String,
        default: "",
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      venue: {
        type: String,
        required: true,
        trim: true,
      },

      eventDate: {
        type: Date,
        required: true,
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },

      participants: {
        type: Number,
        default: 0,
      },

      request: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===============================
         REQUIRED DOCUMENTS
      =============================== */

      projectProposalFile: {
        type:
          bookingDocumentSchema,

        required: true,
      },

      approvedArfFile: {
        type:
          bookingDocumentSchema,

        required: true,
      },

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "cancelled",
        ],

        default: "pending",
      },

      adminRemarks: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

bookingSchema.pre(
  "validate",
  function (next) {
    if (!this.bookingReference) {
      this.bookingReference =
        `NU-${Date.now()
          .toString()
          .slice(-8)}-${Math.floor(
            Math.random() *
              900 +
              100
          )}`;
    }

    next();
  }
);

export default mongoose.model(
  "Booking",
  bookingSchema
);