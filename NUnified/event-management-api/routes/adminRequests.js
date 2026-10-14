import express from "express";

import mongoose from "mongoose";

import AdminRequest from "../models/AdminRequest.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

/* =====================================================
   ROUTER
===================================================== */

const router =
  express.Router();

/* =====================================================
   STARTUP CHECK

   When server starts, you should see this in terminal.
===================================================== */

console.log(
  "✅ adminRequests.js loaded - draft routes enabled"
);

/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {
  return String(
    value ?? ""
  ).trim();
}

function validObjectId(value) {
  return mongoose.isValidObjectId(
    value
  );
}

/* =====================================================
   GET ORGANIZATION ID FROM LOGGED-IN USER
===================================================== */

function getOrganizationId(req) {
  const organization =
    req.user
      ?.organization;

  if (!organization) {
    return null;
  }

  /*
    If organization is populated:
    organization._id

    If organization is just ObjectId:
    organization
  */

  return (
    organization?._id ||
    organization
  );
}

/* =====================================================
   POPULATE REQUEST
===================================================== */

async function populateRequest(id) {
  return AdminRequest.findById(
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
   VALIDATE SUBMISSION

   Drafts may be incomplete.

   Submitted requests require:
   - Request Type
   - Reason / Concern
===================================================== */

function validateSubmission({
  requestType,
  reason,
}) {
  const type =
    cleanText(
      requestType
    );

  const concern =
    cleanText(
      reason
    );

  if (!type) {
    return "Request Type is required before submitting.";
  }

  if (!concern) {
    return "Reason / Concern is required before submitting.";
  }

  if (
    concern.length <
    3
  ) {
    return "Reason / Concern must contain at least 3 characters.";
  }

  if (
    concern.length >
    2000
  ) {
    return "Reason / Concern must not exceed 2000 characters.";
  }

  return "";
}

/* =====================================================
   ORGANIZATION ROUTES

   IMPORTANT:
   KEEP /my/drafts ABOVE DYNAMIC /:id ROUTES
===================================================== */

/* =====================================================
   ORGANIZATION
   GET MY DRAFTS

   GET /api/admin-requests/my/drafts
===================================================== */

router.get(
  "/my/drafts",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "✅ GET /api/admin-requests/my/drafts HIT"
      );

      console.log(
        "DRAFT REQUEST USER:",
        {
          id:
            req.user
              ?._id ||
            req.user
              ?.id,

          role:
            req.user
              ?.role,

          organization:
            req.user
              ?.organization,
        }
      );

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const drafts =
        await AdminRequest.find({
          organization:
            organizationId,

          status:
            "draft",
        })
          .populate(
            "organization",
            `
              organizationName
              acronym
              color
            `
          )
          .sort({
            draftUpdatedAt:
              -1,

            updatedAt:
              -1,

            createdAt:
              -1,
          });

      console.log(
        `✅ FOUND ${drafts.length} DRAFT(S)`
      );

      return res.json(
        drafts
      );
    } catch (error) {
      console.error(
        "❌ GET ADMIN REQUEST DRAFTS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load drafts.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   GET MY SUBMITTED REQUESTS

   GET /api/admin-requests/my

   Drafts are NOT included.
===================================================== */

router.get(
  "/my",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "✅ GET /api/admin-requests/my HIT"
      );

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const requests =
        await AdminRequest.find({
          organization:
            organizationId,

          status: {
            $ne:
              "draft",
          },
        })
          .populate(
            "organization",
            `
              organizationName
              acronym
              color
            `
          )
          .sort({
            submittedAt:
              -1,

            createdAt:
              -1,
          });

      return res.json(
        requests
      );
    } catch (error) {
      console.error(
        "❌ GET ORGANIZATION REQUESTS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load your requests.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   CREATE NEW DRAFT

   POST /api/admin-requests/draft

   Draft is allowed to be incomplete.
===================================================== */

router.post(
  "/draft",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "✅ POST /api/admin-requests/draft HIT"
      );

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const requestType =
        cleanText(
          req.body
            ?.requestType
        );

      const booking =
        cleanText(
          req.body
            ?.booking
        );

      const reason =
        cleanText(
          req.body
            ?.reason
        );

      if (
        reason.length >
        2000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Reason / Concern must not exceed 2000 characters.",
          });
      }

      const now =
        new Date();

      const draft =
        await AdminRequest.create({
          organization:
            organizationId,

          requestType,

          subject:
            requestType,

          title:
            requestType,

          booking,

          relatedBooking:
            booking,

          reason,

          message:
            reason,

          status:
            "draft",

          remarks:
            "",

          submittedAt:
            null,

          draftUpdatedAt:
            now,
        });

      const populated =
        await populateRequest(
          draft._id
        );

      console.log(
        "✅ ADMIN REQUEST DRAFT CREATED:",
        String(
          draft._id
        )
      );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Draft saved successfully.",

          request:
            populated,
        });
    } catch (error) {
      console.error(
        "❌ CREATE ADMIN REQUEST DRAFT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to save draft.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   UPDATE EXISTING DRAFT

   PUT /api/admin-requests/:id/draft
===================================================== */

router.put(
  "/:id/draft",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !validObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid draft ID.",
          });
      }

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const draft =
        await AdminRequest.findOne({
          _id:
            id,

          organization:
            organizationId,

          status:
            "draft",
        });

      if (!draft) {
        return res
          .status(404)
          .json({
            message:
              "Draft not found.",
          });
      }

      const requestType =
        cleanText(
          req.body
            ?.requestType
        );

      const booking =
        cleanText(
          req.body
            ?.booking
        );

      const reason =
        cleanText(
          req.body
            ?.reason
        );

      if (
        reason.length >
        2000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Reason / Concern must not exceed 2000 characters.",
          });
      }

      draft.requestType =
        requestType;

      draft.subject =
        requestType;

      draft.title =
        requestType;

      draft.booking =
        booking;

      draft.relatedBooking =
        booking;

      draft.reason =
        reason;

      draft.message =
        reason;

      draft.status =
        "draft";

      draft.submittedAt =
        null;

      draft.draftUpdatedAt =
        new Date();

      await draft.save();

      const populated =
        await populateRequest(
          draft._id
        );

      console.log(
        "✅ ADMIN REQUEST DRAFT UPDATED:",
        String(
          draft._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Draft updated successfully.",

        request:
          populated,
      });
    } catch (error) {
      console.error(
        "❌ UPDATE ADMIN REQUEST DRAFT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to update draft.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   DELETE DRAFT

   DELETE /api/admin-requests/:id/draft
===================================================== */

router.delete(
  "/:id/draft",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !validObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid draft ID.",
          });
      }

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const draft =
        await AdminRequest.findOneAndDelete({
          _id:
            id,

          organization:
            organizationId,

          status:
            "draft",
        });

      if (!draft) {
        return res
          .status(404)
          .json({
            message:
              "Draft not found.",
          });
      }

      console.log(
        "✅ ADMIN REQUEST DRAFT DELETED:",
        String(
          draft._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Draft deleted successfully.",
      });
    } catch (error) {
      console.error(
        "❌ DELETE ADMIN REQUEST DRAFT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to delete draft.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   SUBMIT EXISTING DRAFT

   POST /api/admin-requests/:id/submit
===================================================== */

router.post(
  "/:id/submit",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !validObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid draft ID.",
          });
      }

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const draft =
        await AdminRequest.findOne({
          _id:
            id,

          organization:
            organizationId,

          status:
            "draft",
        });

      if (!draft) {
        return res
          .status(404)
          .json({
            message:
              "Draft not found.",
          });
      }

      /* =================================================
         USE CURRENT FORM VALUES IF SENT

         Otherwise use saved draft values.
      ================================================= */

      const requestType =
        req.body
          ?.requestType !==
        undefined
          ? cleanText(
              req.body
                .requestType
            )
          : cleanText(
              draft.requestType
            );

      const booking =
        req.body
          ?.booking !==
        undefined
          ? cleanText(
              req.body
                .booking
            )
          : cleanText(
              draft.booking
            );

      const reason =
        req.body
          ?.reason !==
        undefined
          ? cleanText(
              req.body
                .reason
            )
          : cleanText(
              draft.reason
            );

      const validationError =
        validateSubmission({
          requestType,
          reason,
        });

      if (validationError) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      draft.requestType =
        requestType;

      draft.subject =
        requestType;

      draft.title =
        requestType;

      draft.booking =
        booking;

      draft.relatedBooking =
        booking;

      draft.reason =
        reason;

      draft.message =
        reason;

      draft.status =
        "pending";

      draft.remarks =
        "";

      draft.submittedAt =
        new Date();

      draft.draftUpdatedAt =
        null;

      await draft.save();

      const populated =
        await populateRequest(
          draft._id
        );

      console.log(
        "✅ ADMIN REQUEST DRAFT SUBMITTED:",
        String(
          draft._id
        )
      );

      return res.json({
        success:
          true,

        message:
          "Request submitted successfully.",

        request:
          populated,
      });
    } catch (error) {
      console.error(
        "❌ SUBMIT ADMIN REQUEST DRAFT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to submit draft.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   CREATE + SUBMIT NEW REQUEST

   POST /api/admin-requests
===================================================== */

router.post(
  "/",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      console.log(
        "CREATE ADMIN REQUEST USER:",
        {
          id:
            req.user
              ?._id ||
            req.user
              ?.id,

          role:
            req.user
              ?.role,

          organization:
            req.user
              ?.organization,
        }
      );

      const organizationId =
        getOrganizationId(
          req
        );

      if (!organizationId) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const requestType =
        cleanText(
          req.body
            ?.requestType
        );

      const booking =
        cleanText(
          req.body
            ?.booking
        );

      const reason =
        cleanText(
          req.body
            ?.reason
        );

      const validationError =
        validateSubmission({
          requestType,
          reason,
        });

      if (validationError) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      const request =
        await AdminRequest.create({
          organization:
            organizationId,

          requestType,

          subject:
            requestType,

          title:
            requestType,

          booking,

          relatedBooking:
            booking,

          reason,

          message:
            reason,

          status:
            "pending",

          remarks:
            "",

          submittedAt:
            new Date(),

          draftUpdatedAt:
            null,
        });

      const populated =
        await populateRequest(
          request._id
        );

      console.log(
        "✅ ADMIN REQUEST CREATED:",
        String(
          request._id
        )
      );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Request submitted successfully.",

          request:
            populated,
        });
    } catch (error) {
      console.error(
        "❌ CREATE ADMIN REQUEST ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to submit request.",
        });
    }
  }
);

/* =====================================================
   ADMIN ROUTES
===================================================== */

/* =====================================================
   ADMIN
   GET ALL SUBMITTED REQUESTS

   GET /api/admin-requests

   Drafts are NEVER shown to Admin.
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
      const requests =
        await AdminRequest.find({
          status: {
            $ne:
              "draft",
          },
        })
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
            submittedAt:
              -1,

            createdAt:
              -1,
          });

      return res.json(
        requests
      );
    } catch (error) {
      console.error(
        "❌ LOAD ADMIN REQUESTS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load admin requests.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   UPDATE REQUEST STATUS

   PATCH /api/admin-requests/:id/status
===================================================== */

router.patch(
  "/:id/status",

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
        id,
      } = req.params;

      if (
        !validObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid request ID.",
          });
      }

      const status =
        cleanText(
          req.body
            ?.status
        ).toLowerCase();

      const remarks =
        cleanText(
          req.body
            ?.remarks
        );

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
              "Status must be approved or rejected.",
          });
      }

      if (!remarks) {
        return res
          .status(400)
          .json({
            message:
              "Administrator feedback is required.",
          });
      }

      const request =
        await AdminRequest.findOne({
          _id:
            id,

          status: {
            $ne:
              "draft",
          },
        });

      if (!request) {
        return res
          .status(404)
          .json({
            message:
              "Request not found.",
          });
      }

      request.status =
        status;

      request.remarks =
        remarks;

      await request.save();

      const populated =
        await populateRequest(
          request._id
        );

      console.log(
        `✅ ADMIN REQUEST ${status.toUpperCase()}:`,
        String(
          request._id
        )
      );

      return res.json({
        success:
          true,

        message:
          `Request ${status} successfully.`,

        request:
          populated,
      });
    } catch (error) {
      console.error(
        "❌ UPDATE ADMIN REQUEST STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to update request.",
        });
    }
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default router;