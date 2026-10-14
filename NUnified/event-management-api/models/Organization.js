import mongoose from "mongoose";

/* =====================================================
   ORGANIZATION SCHEMA
===================================================== */

const organizationSchema =
  new mongoose.Schema(
    {
      /* =================================================
         BASIC ORGANIZATION INFORMATION
      ================================================= */

      organizationName: {
        type: String,
        required: [
          true,
          "Organization name is required.",
        ],
        trim: true,
      },

      acronym: {
        type: String,
        required: [
          true,
          "Organization acronym is required.",
        ],
        trim: true,
        uppercase: true,
      },

      /* =================================================
         CONTACT INFORMATION
      ================================================= */

      email: {
        type: String,
        required: [
          true,
          "Organization email is required.",
        ],
        trim: true,
        lowercase: true,
      },

      contactNumber: {
        type: String,
        default: "",
        trim: true,
      },

      adviser: {
        type: String,
        default: "",
        trim: true,
      },

      /* =================================================
         ORGANIZATION INFORMATION
      ================================================= */

      description: {
        type: String,
        default: "",
        trim: true,
      },

      /*
        Organization color is used for:
        - Admin calendar
        - Event colors
        - Organization identification
      */

      color: {
        type: String,
        default: "#FACC15",
        trim: true,
      },

      /* =================================================
         PROFILE PICTURE

         The organization profile photo can be stored
         here as a compressed base64 data URL.

         Example:
         data:image/jpeg;base64,...
      ================================================= */

      profileImage: {
        type: String,
        default: "",
      },

      /* =================================================
         ACCOUNT STATUS
      ================================================= */

      active: {
        type: Boolean,
        default: true,
      },
    },

    {
      timestamps: true,
    }
  );

/* =====================================================
   NORMALIZE DATA BEFORE SAVE
===================================================== */

organizationSchema.pre(
  "save",
  function () {
    if (
      this.organizationName
    ) {
      this.organizationName =
        this.organizationName.trim();
    }

    if (
      this.acronym
    ) {
      this.acronym =
        this.acronym
          .trim()
          .toUpperCase();
    }

    if (
      this.email
    ) {
      this.email =
        this.email
          .trim()
          .toLowerCase();
    }

    if (
      this.contactNumber
    ) {
      this.contactNumber =
        this.contactNumber.trim();
    }

    if (
      this.adviser
    ) {
      this.adviser =
        this.adviser.trim();
    }

    if (
      this.description
    ) {
      this.description =
        this.description.trim();
    }
  }
);

/* =====================================================
   MODEL
===================================================== */

const Organization =
  mongoose.model(
    "Organization",
    organizationSchema
  );

export default Organization;