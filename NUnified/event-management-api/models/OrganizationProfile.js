import mongoose from "mongoose";

const organizationProfileSchema =
  new mongoose.Schema(
    {
      organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        unique: true,
        index: true,
      },

      profileImage: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

const OrganizationProfile =
  mongoose.model(
    "OrganizationProfile",
    organizationProfileSchema
  );

export default OrganizationProfile;