import mongoose from "mongoose";

const imageFileSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        default: "",
      },

      fileName: {
        type: String,
        default: "",
      },

      mimeType: {
        type: String,
        default: "",
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

const announcementSchema =
  new mongoose.Schema(
    {
      organization: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Organization",

        required: true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      type: {
        type: String,

        enum: [
          "Announcement",
          "News",
        ],

        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
      },

      /*
        Optional event date.

        We store YYYY-MM-DD as a
        string so the date does not
        shift because of timezone.
      */

      eventDate: {
        type: String,
        default: "",
      },

      imageFile: {
        type: imageFileSchema,
        default: null,
      },

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default: "pending",
      },

      adminRemarks: {
        type: String,
        default: "",
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      publishedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Announcement",
  announcementSchema
);