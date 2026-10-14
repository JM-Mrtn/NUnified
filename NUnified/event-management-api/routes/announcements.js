import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  fileURLToPath,
} from "url";

import Announcement from "../models/Announcement.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   SETTINGS
===================================================== */

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* =====================================================
   UPLOAD DIRECTORY
===================================================== */

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

const uploadDirectory =
  path.join(
    __dirname,
    "..",
    "uploads",
    "announcement-images"
  );

if (
  !fs.existsSync(
    uploadDirectory
  )
) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    }
  );
}

/* =====================================================
   MULTER
===================================================== */

const storage =
  multer.diskStorage({
    destination(
      req,
      file,
      callback
    ) {
      callback(
        null,
        uploadDirectory
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const cleanName =
        path
          .basename(
            file.originalname,
            extension
          )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .slice(0, 80);

      callback(
        null,
        `${Date.now()}-${Math.round(
          Math.random() *
            1e9
        )}-${cleanName}${extension}`
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_IMAGE_SIZE,
    },

    fileFilter(
      req,
      file,
      callback
    ) {
      if (
        !allowedImageTypes.includes(
          file.mimetype
        )
      ) {
        return callback(
          new Error(
            "Only JPG, PNG, and WEBP images are allowed."
          )
        );
      }

      callback(
        null,
        true
      );
    },
  });

/* =====================================================
   DELETE FILE HELPER
===================================================== */

function removeUploadedFile(
  file
) {
  if (!file?.path) {
    return;
  }

  try {
    if (
      fs.existsSync(
        file.path
      )
    ) {
      fs.unlinkSync(
        file.path
      );
    }
  } catch (error) {
    console.error(
      "Unable to remove uploaded image:",
      error
    );
  }
}

/* =====================================================
   SERIALIZE POST

   Adds a full image URL so React can
   directly display the uploaded image.
===================================================== */

function serializeAnnouncement(
  req,
  announcement
) {
  const item =
    typeof announcement.toObject ===
    "function"
      ? announcement.toObject()
      : announcement;

  const image =
    item.imageFile?.fileName
      ? `${req.protocol}://${req.get(
          "host"
        )}/api/announcements/${item._id}/image`
      : null;

  return {
    ...item,

    /*
      StudentHome can use this.
    */

    image,

    /*
      Compatibility field for
      StudentHome sorting/display.
    */

    date:
      item.eventDate ||
      item.publishedAt ||
      item.createdAt,
  };
}

/* =====================================================
   PUBLIC — APPROVED POSTS ONLY

   GET /api/announcements

   Student homepage uses this route.
===================================================== */

router.get(
  "/",
  async (req, res) => {
    try {
      const announcements =
        await Announcement.find({
          status: "approved",
        })
          .populate(
            "organization",
            "organizationName acronym color"
          )
          .sort({
            publishedAt: -1,
            createdAt: -1,
          });

      return res.json(
        announcements.map(
          (announcement) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (error) {
      console.error(
        "Public announcements error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load announcements.",
        });
    }
  }
);

/* =====================================================
   ADMIN — ALL POSTS

   GET /api/announcements/admin
===================================================== */

router.get(
  "/admin",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const announcements =
        await Announcement.find()
          .populate(
            "organization",
            "organizationName acronym color email"
          )
          .populate(
            "reviewedBy",
            "username"
          )
          .sort({
            createdAt: -1,
          });

      return res.json(
        announcements.map(
          (announcement) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (error) {
      console.error(
        "Admin announcements error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load post submissions.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION — OWN SUBMISSIONS

   GET /api/announcements/my
===================================================== */

router.get(
  "/my",
  protect,
  authorize(
    "organization"
  ),
  async (req, res) => {
    try {
      const announcements =
        await Announcement.find({
          organization:
            req.user.organization,
        })
          .populate(
            "organization",
            "organizationName acronym color"
          )
          .sort({
            createdAt: -1,
          });

      return res.json(
        announcements.map(
          (announcement) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (error) {
      console.error(
        "Organization posts error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load your post submissions.",
        });
    }
  }
);

/* =====================================================
   IMAGE

   GET /api/announcements/:id/image
===================================================== */

router.get(
  "/:id/image",
  async (req, res) => {
    try {
      const announcement =
        await Announcement.findById(
          req.params.id
        ).select(
          "imageFile"
        );

      if (
        !announcement ||
        !announcement
          .imageFile
          ?.fileName
      ) {
        return res
          .status(404)
          .json({
            message:
              "Image not found.",
          });
      }

      const filePath =
        path.join(
          uploadDirectory,
          announcement
            .imageFile
            .fileName
        );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return res
          .status(404)
          .json({
            message:
              "Image file not found.",
          });
      }

      res.setHeader(
        "Content-Type",
        announcement
          .imageFile
          .mimeType ||
          "application/octet-stream"
      );

      return res.sendFile(
        filePath
      );
    } catch (error) {
      console.error(
        "Announcement image error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load image.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION — SUBMIT POST

   POST /api/announcements

   Status is ALWAYS pending.
===================================================== */

router.post(
  "/",
  protect,
  authorize(
    "organization"
  ),
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        type,
        title,
        content,
        eventDate,
      } = req.body;

      /* =====================================
         ORGANIZATION LINK
      ====================================== */

      if (
        !req.user.organization
      ) {
        removeUploadedFile(
          req.file
        );

        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      /* =====================================
         REQUIRED
      ====================================== */

      if (
        !type ||
        !title?.trim() ||
        !content?.trim()
      ) {
        removeUploadedFile(
          req.file
        );

        return res
          .status(400)
          .json({
            message:
              "Post Type, Title, and Content are required.",
          });
      }

      if (
        ![
          "Announcement",
          "News",
        ].includes(type)
      ) {
        removeUploadedFile(
          req.file
        );

        return res
          .status(400)
          .json({
            message:
              "Invalid post type.",
          });
      }

      /* =====================================
         IMAGE INFO
      ====================================== */

      let imageFile =
        null;

      if (req.file) {
        imageFile = {
          originalName:
            req.file
              .originalname,

          fileName:
            req.file.filename,

          mimeType:
            req.file.mimetype,

          size:
            req.file.size,
        };
      }

      /* =====================================
         CREATE PENDING POST
      ====================================== */

      const announcement =
        await Announcement.create({
          organization:
            req.user.organization,

          createdBy:
            req.user._id ||
            req.user.id ||
            null,

          type,

          title:
            title.trim(),

          content:
            content.trim(),

          eventDate:
            eventDate ||
            "",

          imageFile,

          status:
            "pending",

          adminRemarks: "",

          reviewedAt: null,

          publishedAt: null,
        });

      const populated =
        await Announcement.findById(
          announcement._id
        ).populate(
          "organization",
          "organizationName acronym color"
        );

      return res
        .status(201)
        .json({
          message:
            "Post submitted successfully. It is now waiting for Administrator review.",

          announcement:
            serializeAnnouncement(
              req,
              populated
            ),
        });
    } catch (error) {
      removeUploadedFile(
        req.file
      );

      console.error(
        "Create announcement error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to submit post.",
        });
    }
  }
);

/* =====================================================
   ADMIN — APPROVE / REJECT

   PATCH /api/announcements/:id/status
===================================================== */

router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const status =
        String(
          req.body.status ||
            ""
        )
          .trim()
          .toLowerCase();

      const adminRemarks =
        String(
          req.body
            .adminRemarks ||
            ""
        ).trim();

      if (
        ![
          "approved",
          "rejected",
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Status must be approved or rejected.",
          });
      }

      /*
        A rejection should explain
        why it was rejected.
      */

      if (
        status ===
          "rejected" &&
        !adminRemarks
      ) {
        return res
          .status(400)
          .json({
            message:
              "Please enter a reason for rejecting the post.",
          });
      }

      const announcement =
        await Announcement.findById(
          req.params.id
        );

      if (!announcement) {
        return res
          .status(404)
          .json({
            message:
              "Post not found.",
          });
      }

      announcement.status =
        status;

      announcement.adminRemarks =
        adminRemarks;

      announcement.reviewedBy =
        req.user._id ||
        req.user.id ||
        null;

      announcement.reviewedAt =
        new Date();

      announcement.publishedAt =
        status === "approved"
          ? new Date()
          : null;

      await announcement.save();

      const populated =
        await Announcement.findById(
          announcement._id
        )
          .populate(
            "organization",
            "organizationName acronym color email"
          )
          .populate(
            "reviewedBy",
            "username"
          );

      return res.json({
        message:
          status === "approved"
            ? "Post approved successfully. It is now visible on the Student Homepage."
            : "Post rejected successfully.",

        announcement:
          serializeAnnouncement(
            req,
            populated
          ),
      });
    } catch (error) {
      console.error(
        "Announcement review error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to review post.",
        });
    }
  }
);

/* =====================================================
   MULTER ERRORS
===================================================== */

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    removeUploadedFile(
      req.file
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Image must be 5 MB or smaller.",
          });
      }

      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    if (error) {
      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    next();
  }
);

export default router;