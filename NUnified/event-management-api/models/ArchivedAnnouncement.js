import mongoose from "mongoose";

/* =====================================================
   ARCHIVED ANNOUNCEMENT SCHEMA
===================================================== */

const archivedAnnouncementSchema =
  new mongoose.Schema(
    {
      /* =================================================
         ORIGINAL ANNOUNCEMENT ID
      ================================================= */

      originalAnnouncementId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required: true,

        unique: true,

        index: true,
      },

      /* =================================================
         COMPLETE ORIGINAL POST

         We store a complete copy here so:
         - title stays
         - content stays
         - image stays
         - status stays
         - event date stays
         - admin remarks stay
         - organization link stays
      ================================================= */

      snapshot: {
        type:
          mongoose.Schema.Types.Mixed,

        required: true,
      },

      /* =================================================
         ORGANIZATION DISPLAY COPY
      ================================================= */

      organizationSnapshot: {
        organizationName: {
          type: String,
          default:
            "Organization",
        },

        acronym: {
          type: String,
          default: "",
        },

        color: {
          type: String,
          default:
            "#FACC15",
        },
      },

      /* =================================================
         WHO ARCHIVED IT
      ================================================= */

      archivedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      /* =================================================
         ARCHIVED DATE
      ================================================= */

      archivedAt: {
        type: Date,

        default:
          Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

const ArchivedAnnouncement =
  mongoose.models
    .ArchivedAnnouncement ||
  mongoose.model(
    "ArchivedAnnouncement",
    archivedAnnouncementSchema
  );

export default ArchivedAnnouncement;