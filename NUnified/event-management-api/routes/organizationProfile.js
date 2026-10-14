import express from "express";

import Organization from "../models/Organization.js";
import OrganizationProfile from "../models/OrganizationProfile.js";
import User from "../models/User.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   GET CURRENT ORGANIZATION ID
===================================================== */

async function getOrganizationId(
  req
) {
  const organizationFromRequest =
    req.user?.organization?._id ||
    req.user?.organization;

  if (
    organizationFromRequest
  ) {
    return organizationFromRequest;
  }

  const userId =
    req.user?._id ||
    req.user?.id;

  if (!userId) {
    return null;
  }

  const user =
    await User.findById(
      userId
    ).select(
      "organization role"
    );

  if (!user) {
    return null;
  }

  if (
    user.role !==
    "organization"
  ) {
    return null;
  }

  return (
    user.organization ||
    null
  );
}

/* =====================================================
   ORGANIZATION ONLY
===================================================== */

function organizationOnly(
  req,
  res,
  next
) {
  if (
    req.user?.role !==
    "organization"
  ) {
    return res
      .status(403)
      .json({
        message:
          "Only organization accounts can access this route.",
      });
  }

  next();
}

/* =====================================================
   ADMIN ONLY
===================================================== */

function adminOnly(
  req,
  res,
  next
) {
  if (
    req.user?.role !==
    "admin"
  ) {
    return res
      .status(403)
      .json({
        message:
          "Only administrators can access this route.",
      });
  }

  next();
}

/* =====================================================
   GET MY PROFILE PICTURE

   GET
   /api/organization-profile/me/profile-picture
===================================================== */

router.get(
  "/me/profile-picture",

  protect,

  organizationOnly,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const profile =
        await OrganizationProfile.findOne(
          {
            organization:
              organizationId,
          }
        ).lean();

      if (
        profile?.profileImage
      ) {
        return res.json({
          profileImage:
            profile.profileImage,
        });
      }

      const organization =
        await Organization.findById(
          organizationId
        ).select(
          "profileImage"
        );

      return res.json({
        profileImage:
          organization
            ?.profileImage ||
          "",
      });
    } catch (error) {
      console.error(
        "GET PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load profile picture.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   GET ORGANIZATION PROFILE PICTURE

   GET
   /api/organization-profile/admin/:organizationId/profile-picture
===================================================== */

router.get(
  "/admin/:organizationId/profile-picture",

  protect,

  adminOnly,

  async (
    req,
    res
  ) => {
    try {
      const {
        organizationId,
      } = req.params;

      const organization =
        await Organization.findById(
          organizationId
        ).select(
          "organizationName acronym profileImage"
        );

      if (
        !organization
      ) {
        return res
          .status(404)
          .json({
            message:
              "Organization not found.",
          });
      }

      const profile =
        await OrganizationProfile.findOne(
          {
            organization:
              organizationId,
          }
        ).select(
          "profileImage"
        );

      const profileImage =
        profile?.profileImage ||
        organization.profileImage ||
        "";

      return res.json({
        organizationId:
          organization._id,

        organizationName:
          organization.organizationName,

        acronym:
          organization.acronym,

        profileImage,
      });
    } catch (error) {
      console.error(
        "ADMIN GET ORGANIZATION PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to load organization profile picture.",
        });
    }
  }
);

/* =====================================================
   SAVE / CHANGE MY PROFILE PICTURE

   PUT
   /api/organization-profile/me/profile-picture
===================================================== */

router.put(
  "/me/profile-picture",

  protect,

  organizationOnly,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const {
        profileImage,
      } = req.body || {};

      if (
        !profileImage
      ) {
        return res
          .status(400)
          .json({
            message:
              "Profile picture is required.",
          });
      }

      const image =
        String(
          profileImage
        );

      if (
        !image.startsWith(
          "data:image/"
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid profile picture format.",
          });
      }

      if (
        image.length >
        2_000_000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Profile picture is too large. Please choose a smaller image.",
          });
      }

      const organization =
        await Organization.findById(
          organizationId
        );

      if (
        !organization
      ) {
        return res
          .status(404)
          .json({
            message:
              "Organization not found.",
          });
      }

      await OrganizationProfile.findOneAndUpdate(
        {
          organization:
            organizationId,
        },

        {
          $set: {
            profileImage:
              image,
          },
        },

        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

      await Organization.updateOne(
        {
          _id:
            organizationId,
        },

        {
          $set: {
            profileImage:
              image,
          },
        }
      );

      const verify =
        await OrganizationProfile.findOne(
          {
            organization:
              organizationId,
          }
        ).select(
          "profileImage"
        );

      const savedImage =
        verify?.profileImage ||
        "";

      if (
        !savedImage
      ) {
        return res
          .status(500)
          .json({
            message:
              "The profile picture was received but could not be saved.",
          });
      }

      return res.json({
        message:
          "Profile picture saved successfully.",

        profileImage:
          savedImage,
      });
    } catch (error) {
      console.error(
        "SAVE PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to save profile picture.",
        });
    }
  }
);

/* =====================================================
   REMOVE MY PROFILE PICTURE

   DELETE
   /api/organization-profile/me/profile-picture
===================================================== */

router.delete(
  "/me/profile-picture",

  protect,

  organizationOnly,

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getOrganizationId(
          req
        );

      if (
        !organizationId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      await OrganizationProfile.findOneAndDelete(
        {
          organization:
            organizationId,
        }
      );

      await Organization.updateOne(
        {
          _id:
            organizationId,
        },

        {
          $set: {
            profileImage:
              "",
          },
        }
      );

      return res.json({
        message:
          "Profile picture removed successfully.",

        profileImage:
          "",
      });
    } catch (error) {
      console.error(
        "REMOVE PROFILE PICTURE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to remove profile picture.",
        });
    }
  }
);

export default router;