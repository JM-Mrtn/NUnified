import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    date: {
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

    venue: {
      type: String,
      required: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "upcoming",
        "ongoing",
        "completed",
        "cancelled",
      ],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Event", eventSchema);