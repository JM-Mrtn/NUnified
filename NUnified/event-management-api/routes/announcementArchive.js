import express from "express";

import mongoose from "mongoose";

import AdminRequest from "../models/AdminRequest.js";

import ArchivedAdminRequest from "../models/ArchivedAdminRequest.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   HELPERS
===================================================== */

function validObjectId(
  value
) {
  return mongoose.isValidObjectId(
    value
  );
}

function cleanSnapshot(
  request
) {
  const snapshot =
    request.toObject({
      depopulate: true,
    });

  delete snapshot.__v;

  return snapshot;
}

async function getPopulatedArchive(
  id
) {
  return ArchivedAdminRequest.findById(
    id
  ).populate(
    "organization",
    `
      organizationName
      acronym
      color
      email
      adviser
    `
  );
}

/* =====================================================
   ADMIN
   GET ARCHIVED REQUESTS

   GET /api/admin-request-archive
===================================================== */

router.get(
  "/",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const archives =
        await ArchivedAdminRequest.find()
          .populate(
            "organization",
            `
              organizationName
              acronym
              color
              email
              adviser
            `
          )
          .sort({
            archivedAt: -1,

            createdAt: -1,
          });

      return res.json({
        success: true,

        archives,
      });
    } catch (
      error
    ) {
      console.error(
        "LOAD ADMIN REQUEST ARCHIVE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load archived requests.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   ARCHIVE REQUEST

   POST /api/admin-request-archive/:requestId
===================================================== */

router.post(
  "/:requestId",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        requestId,
      } = req.params;

      /* ===============================================
         VALIDATE ID
      =============================================== */

      if (
        !validObjectId(
          requestId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid request ID.",
          });
      }

      /* ===============================================
         FIND REQUEST
      =============================================== */

      const request =
        await AdminRequest.findOne(
          {
            _id:
              requestId,

            status: {
              $ne:
                "draft",
            },
          }
        );

      if (!request) {
        return res
          .status(404)
          .json({
            message:
              "Request not found.",
          });
      }

      /* ===============================================
         ONLY COMPLETED REQUESTS CAN BE ARCHIVED
      =============================================== */

      const status =
        String(
          request.status ||
            ""
        ).toLowerCase();

      if (
        ![
          "approved",
          "rejected",
        ].includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Only approved or rejected requests can be archived.",
          });
      }

      /* ===============================================
         CHECK DUPLICATE
      =============================================== */

      const existingArchive =
        await ArchivedAdminRequest.findOne(
          {
            originalRequestId:
              request._id,
          }
        );

      if (
        existingArchive
      ) {
        return res
          .status(409)
          .json({
            message:
              "This request is already archived.",
          });
      }

      /* ===============================================
         SAVE ORIGINAL DOCUMENT
      =============================================== */

      const snapshot =
        cleanSnapshot(
          request
        );

      /* ===============================================
         CREATE ARCHIVE
      =============================================== */

      const archive =
        await ArchivedAdminRequest.create(
          {
            originalRequestId:
              request._id,

            organization:
              request.organization,

            subject:
              request.subject ||
              request.requestType ||
              "Admin Request",

            title:
              request.title ||
              request.subject ||
              request.requestType ||
              "Admin Request",

            requestType:
              request.requestType ||
              "",

            type:
              request.requestType ||
              "",

            booking:
              request.booking ||
              request.relatedBooking ||
              "",

            message:
              request.message ||
              request.reason ||
              "",

            reason:
              request.reason ||
              request.message ||
              "",

            status:
              request.status ||
              "",

            remarks:
              request.remarks ||
              "",

            snapshot,

            originalCreatedAt:
              request.createdAt ||
              null,

            originalUpdatedAt:
              request.updatedAt ||
              null,

            archivedAt:
              new Date(),
          }
        );

      /* ===============================================
         REMOVE FROM ACTIVE REQUESTS
      =============================================== */

      const deleteResult =
        await AdminRequest.deleteOne(
          {
            _id:
              request._id,
          }
        );

      if (
        deleteResult.deletedCount !==
        1
      ) {
        await ArchivedAdminRequest.findByIdAndDelete(
          archive._id
        );

        return res
          .status(409)
          .json({
            message:
              "Unable to archive request. Please refresh and try again.",
          });
      }

      const populated =
        await getPopulatedArchive(
          archive._id
        );

      return res.json({
        success: true,

        message:
          "Request archived successfully.",

        archive:
          populated,
      });
    } catch (
      error
    ) {
      console.error(
        "ARCHIVE ADMIN REQUEST ERROR:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return res
          .status(409)
          .json({
            message:
              "This request is already archived.",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Unable to archive request.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   RESTORE ARCHIVED REQUEST

   POST /api/admin-request-archive/:archiveId/restore
===================================================== */

router.post(
  "/:archiveId/restore",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        archiveId,
      } = req.params;

      /* ===============================================
         VALIDATE ID
      =============================================== */

      if (
        !validObjectId(
          archiveId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid archive ID.",
          });
      }

      /* ===============================================
         FIND ARCHIVE
      =============================================== */

      const archive =
        await ArchivedAdminRequest.findById(
          archiveId
        );

      if (!archive) {
        return res
          .status(404)
          .json({
            message:
              "Archived request not found.",
          });
      }

      /* ===============================================
         CHECK IF ORIGINAL ALREADY EXISTS
      =============================================== */

      const existing =
        await AdminRequest.findById(
          archive.originalRequestId
        );

      if (existing) {
        return res
          .status(409)
          .json({
            message:
              "The original request already exists.",
          });
      }

      /* ===============================================
         RESTORE SNAPSHOT
      =============================================== */

      const snapshot = {
        ...(
          archive.snapshot ||
          {}
        ),
      };

      delete snapshot.__v;

      delete snapshot._id;

      delete snapshot.id;

      delete snapshot.createdAt;

      delete snapshot.updatedAt;

      /* ===============================================
         CREATE ORIGINAL REQUEST AGAIN
      =============================================== */

      const restored =
        await AdminRequest.create(
          {
            ...snapshot,

            _id:
              archive.originalRequestId,

            organization:
              archive.organization ||
              snapshot.organization,

            requestType:
              snapshot.requestType ||
              archive.requestType ||
              archive.type ||
              "",

            subject:
              snapshot.subject ||
              archive.subject ||
              archive.title ||
              "Admin Request",

            title:
              snapshot.title ||
              archive.title ||
              archive.subject ||
              "Admin Request",

            booking:
              snapshot.booking ||
              archive.booking ||
              "",

            relatedBooking:
              snapshot.relatedBooking ||
              snapshot.booking ||
              archive.booking ||
              "",

            message:
              snapshot.message ||
              archive.message ||
              archive.reason ||
              "",

            reason:
              snapshot.reason ||
              archive.reason ||
              archive.message ||
              "",

            status:
              snapshot.status ||
              archive.status ||
              "approved",

            remarks:
              snapshot.remarks ||
              archive.remarks ||
              "",

            submittedAt:
              snapshot.submittedAt ||
              archive.originalCreatedAt ||
              new Date(),
          }
        );

      /* ===============================================
         REMOVE ARCHIVE AFTER RESTORE
      =============================================== */

      const deleteResult =
        await ArchivedAdminRequest.deleteOne(
          {
            _id:
              archive._id,
          }
        );

      if (
        deleteResult.deletedCount !==
        1
      ) {
        await AdminRequest.findByIdAndDelete(
          restored._id
        );

        return res
          .status(409)
          .json({
            message:
              "Unable to restore request. Please try again.",
          });
      }

      /* ===============================================
         POPULATE ORGANIZATION
      =============================================== */

      const populated =
        await AdminRequest.findById(
          restored._id
        ).populate(
          "organization",
          `
            organizationName
            acronym
            color
            email
            adviser
          `
        );

      return res.json({
        success: true,

        message:
          "Request restored successfully.",

        request:
          populated,
      });
    } catch (
      error
    ) {
      console.error(
        "RESTORE ADMIN REQUEST ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to restore archived request.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   DELETE ARCHIVE PERMANENTLY

   DELETE /api/admin-request-archive/:archiveId
===================================================== */

router.delete(
  "/:archiveId",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        archiveId,
      } = req.params;

      if (
        !validObjectId(
          archiveId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid archive ID.",
          });
      }

      const archive =
        await ArchivedAdminRequest.findById(
          archiveId
        );

      if (!archive) {
        return res
          .status(404)
          .json({
            message:
              "Archived request not found.",
          });
      }

      await ArchivedAdminRequest.deleteOne(
        {
          _id:
            archive._id,
        }
      );

      return res.json({
        success: true,

        message:
          "Archived request permanently deleted.",
      });
    } catch (
      error
    ) {
      console.error(
        "DELETE ADMIN REQUEST ARCHIVE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to permanently delete archived request.",
        });
    }
  }
);

export default router;