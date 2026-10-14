import express from "express";

import Event from "../models/Event.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
  PUBLIC
*/
router.get("/", async (req, res) => {
  try {
    const events = await Event.find()
      .populate(
        "organization",
        "organizationName acronym"
      )
      .sort({
        date: 1,
      });

    return res.json(events);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load events.",
    });
  }
});

/*
  PUBLIC
*/
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(
      req.params.id
    ).populate(
      "organization",
      "organizationName acronym"
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    return res.json(event);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load event.",
    });
  }
});

/*
  ADMIN
*/
router.post(
  "/",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        startTime,
        endTime,
        venue,
        organization,
        status,
      } = req.body;

      if (
        !title ||
        !date ||
        !startTime ||
        !endTime ||
        !venue
      ) {
        return res.status(400).json({
          message:
            "Title, date, time and venue are required.",
        });
      }

      const event = await Event.create({
        title,
        description,
        date,
        startTime,
        endTime,
        venue,
        organization: organization || null,
        status: status || "upcoming",
      });

      return res.status(201).json({
        message: "Event created successfully.",
        event,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Unable to create event.",
      });
    }
  }
);

/*
  ADMIN
*/
router.put(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const event = await Event.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!event) {
        return res.status(404).json({
          message: "Event not found.",
        });
      }

      return res.json({
        message: "Event updated successfully.",
        event,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Unable to update event.",
      });
    }
  }
);

/*
  ADMIN
*/
router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const event = await Event.findByIdAndDelete(
        req.params.id
      );

      if (!event) {
        return res.status(404).json({
          message: "Event not found.",
        });
      }

      return res.json({
        message: "Event deleted successfully.",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Unable to delete event.",
      });
    }
  }
);

export default router;