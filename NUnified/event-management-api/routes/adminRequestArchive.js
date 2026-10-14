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
   VALID OBJECT ID
===================================================== */

function validObjectId(
  value
) {
  return mongoose.isValidObjectId(
    value
  );
}

/* =====================================================
   POPULATE ARCHIVE
===================================================== */

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
   GET ALL ARCHIVED REQUESTS

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
            archivedAt:
              -1,

            createdAt:
              -1,
          });

      return res.json({
        success:
          true,

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
      } =
        req.params;

      /* =================================================
         VALIDATE ID
      ================================================= */

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

      /* =================================================
         FIND REQUEST
      ================================================= */

      const request =
        await AdminRequest.findOne({
          _id:
            requestId,

          status: {
            $ne:
              "draft",
          },
        });

      if (
        !request
      ) {
        return res
          .status(404)
          .json({
            message:
              "Request not found.",
          });
      }

      /* =================================================
         ONLY APPROVED / REJECTED
      ================================================= */

      if (
        ![
          "approved",
          "rejected",
        ].includes(
          request.status
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Only approved or rejected requests can be archived.",
          });
      }

      /* =================================================
         CHECK IF ALREADY ARCHIVED
      ================================================= */

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

      /* =================================================
         CREATE SNAPSHOT
      ================================================= */

      const snapshot =
        request.toObject({
          depopulate:
            true,
        });

      delete snapshot.__v;

      /* =================================================
         CREATE ARCHIVE
      ================================================= */

      const archive =
        await ArchivedAdminRequest.create(
          {
            originalRequestId:
              request._id,

            organization:
              request.organization,

            requestType:
              request.requestType ||
              "",

            subject:
              request.subject ||
              request.requestType ||
              "",

            title:
              request.title ||
              request.subject ||
              request.requestType ||
              "",

            booking:
              request.booking ||
              "",

            relatedBooking:
              request.relatedBooking ||
              request.booking ||
              "",

            reason:
              request.reason ||
              "",

            message:
              request.message ||
              request.reason ||
              "",

            status:
              request.status,

            remarks:
              request.remarks ||
              "",

            submittedAt:
              request.submittedAt ||
              null,

            originalCreatedAt:
              request.createdAt ||
              null,

            originalUpdatedAt:
              request.updatedAt ||
              null,

            snapshot,

            archivedAt:
              new Date(),
          }
        );

      /* =================================================
         DELETE FROM ACTIVE REQUESTS
      ================================================= */

      await AdminRequest.deleteOne(
        {
          _id:
            request._id,
        }
      );

      const populatedArchive =
        await getPopulatedArchive(
          archive._id
        );

      console.log(
        "✅ ADMIN REQUEST ARCHIVED:",
        String(
          request._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Request archived successfully.",

        archive:
          populatedArchive,
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
            error.message ||
            "Unable to archive request.",
        });
    }
  }
);

/* =====================================================
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
      } =
        req.params;

      /* =================================================
         VALIDATE ID
      ================================================= */

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

      /* =================================================
         FIND ARCHIVE
      ================================================= */

      const archive =
        await ArchivedAdminRequest.findById(
          archiveId
        );

      if (
        !archive
      ) {
        return res
          .status(404)
          .json({
            message:
              "Archived request not found.",
          });
      }

      /* =================================================
         CHECK ORIGINAL REQUEST
      ================================================= */

      const existingRequest =
        await AdminRequest.findById(
          archive.originalRequestId
        );

      if (
        existingRequest
      ) {
        return res
          .status(409)
          .json({
            message:
              "This request already exists in Manage Requests.",
          });
      }

      /* =================================================
         ORIGINAL SNAPSHOT
      ================================================= */

      const snapshot = {
        ...(
          archive.snapshot ||
          {}
        ),
      };

      delete snapshot._id;

      delete snapshot.__v;

      delete snapshot.createdAt;

      delete snapshot.updatedAt;

      /* =================================================
         RESTORE REQUEST
      ================================================= */

      const restoredRequest =
        new AdminRequest({
          _id:
            archive.originalRequestId,

          organization:
            archive.organization,

          requestType:
            snapshot.requestType ||
            archive.requestType ||
            "",

          subject:
            snapshot.subject ||
            archive.subject ||
            archive.requestType ||
            "",

          title:
            snapshot.title ||
            archive.title ||
            archive.subject ||
            "",

          booking:
            snapshot.booking ||
            archive.booking ||
            "",

          relatedBooking:
            snapshot.relatedBooking ||
            archive.relatedBooking ||
            archive.booking ||
            "",

          reason:
            snapshot.reason ||
            archive.reason ||
            "",

          message:
            snapshot.message ||
            archive.message ||
            archive.reason ||
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
            archive.submittedAt ||
            archive.originalCreatedAt ||
            new Date(),

          draftUpdatedAt:
            snapshot.draftUpdatedAt ||
            null,
        });

      await restoredRequest.save();

      /* =================================================
         DELETE ARCHIVE
      ================================================= */

      await ArchivedAdminRequest.deleteOne(
        {
          _id:
            archive._id,
        }
      );

      const populatedRequest =
        await AdminRequest.findById(
          restoredRequest._id
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

      console.log(
        "✅ ADMIN REQUEST RESTORED:",
        String(
          restoredRequest._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Request restored successfully.",

        request:
          populatedRequest,
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
            error.message ||
            "Unable to restore archived request.",
        });
    }
  }
);

/* =====================================================
   PERMANENTLY DELETE ARCHIVED REQUEST

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
      } =
        req.params;

      /* =================================================
         VALIDATE ID
      ================================================= */

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

      /* =================================================
         DELETE ARCHIVE
      ================================================= */

      const archive =
        await ArchivedAdminRequest.findByIdAndDelete(
          archiveId
        );

      if (
        !archive
      ) {
        return res
          .status(404)
          .json({
            message:
              "Archived request not found.",
          });
      }

      console.log(
        "✅ ADMIN REQUEST ARCHIVE DELETED:",
        String(
          archive._id
        )
      );

      return res.json({
        success:
          true,

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
            error.message ||
            "Unable to delete archived request.",
        });
    }
  }
);

export default router;