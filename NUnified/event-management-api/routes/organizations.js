import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

import Organization from "../models/Organization.js";
import User from "../models/User.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {
  return String(
    value ?? ""
  ).trim();
}

function normalizeEmail(value) {
  return cleanText(
    value
  ).toLowerCase();
}

function normalizeColor(value) {
  const color =
    cleanText(value);

  if (
    /^#[0-9A-F]{6}$/i.test(
      color
    )
  ) {
    return color.toUpperCase();
  }

  return "#FACC15";
}

function escapeRegex(value) {
  return String(
    value || ""
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/* =====================================================
   USERNAME GENERATOR

   Example:
   NUK -> nuk_eventmanagement
===================================================== */

function getBaseUsername(
  acronym
) {
  const clean =
    String(
      acronym || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  if (!clean) {
    return "organization_eventmanagement";
  }

  return `${clean}_eventmanagement`;
}

async function generateUniqueUsername(
  acronym
) {
  const base =
    getBaseUsername(
      acronym
    );

  let username =
    base;

  let number = 2;

  while (
    await User.exists({
      username,
    })
  ) {
    username =
      `${base}${number}`;

    number += 1;
  }

  return username;
}

/* =====================================================
   TEMP PASSWORD
===================================================== */

function generateTemporaryPassword() {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lower =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers =
    "23456789";

  const symbols =
    "!@#$%";

  const all =
    upper +
    lower +
    numbers +
    symbols;

  const result = [
    upper[
      crypto.randomInt(
        upper.length
      )
    ],

    lower[
      crypto.randomInt(
        lower.length
      )
    ],

    numbers[
      crypto.randomInt(
        numbers.length
      )
    ],

    symbols[
      crypto.randomInt(
        symbols.length
      )
    ],
  ];

  while (
    result.length < 12
  ) {
    result.push(
      all[
        crypto.randomInt(
          all.length
        )
      ]
    );
  }

  for (
    let i =
      result.length - 1;

    i > 0;

    i--
  ) {
    const j =
      crypto.randomInt(
        i + 1
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result.join(
    ""
  );
}

/* =====================================================
   EMAIL
===================================================== */

function createEmailTransporter() {
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing from .env."
    );
  }

  const port =
    Number(
      process.env.EMAIL_PORT
    ) || 465;

  const secure =
    String(
      process.env.EMAIL_SECURE
    ).toLowerCase() ===
    "true";

  return nodemailer.createTransport(
    {
      host:
        process.env.EMAIL_HOST ||
        "smtp.gmail.com",

      port,

      secure,

      auth: {
        user:
          process.env.EMAIL_USER,

        pass:
          String(
            process.env.EMAIL_PASS
          ).replace(
            /\s/g,
            ""
          ),
      },
    }
  );
}

/* =====================================================
   SEND LOGIN CREDENTIALS
===================================================== */

async function sendOrganizationCredentials({
  email,
  organizationName,
  username,
  temporaryPassword,
}) {
  const transporter =
    createEmailTransporter();

  const fromName =
    process.env
      .EMAIL_FROM_NAME ||
    "NUnified Event Management";

  const fromAddress =
    process.env
      .EMAIL_FROM_ADDRESS ||
    process.env.EMAIL_USER;

  await transporter.sendMail({
    from:
      `"${fromName}" <${fromAddress}>`,

    to: email,

    subject:
      "Your NUnified Organization Account",

    text: `
NUnified Event Management

Hello ${organizationName},

Your organization account has been created.

Username:
${username}

Temporary Password:
${temporaryPassword}

Please sign in and change your temporary password.

NUnified Event Management
    `.trim(),

    html: `
      <div
        style="
          max-width:600px;
          margin:0 auto;
          padding:30px;
          background:#f1f5f9;
          font-family:Arial,sans-serif;
        "
      >
        <div
          style="
            background:#071c47;
            padding:25px;
            text-align:center;
            border-radius:16px 16px 0 0;
          "
        >
          <div
            style="
              display:inline-block;
              background:#ffcc00;
              color:#071c47;
              padding:12px 14px;
              border-radius:10px;
              font-size:20px;
              font-weight:900;
            "
          >
            NU
          </div>

          <h1
            style="
              color:#ffffff;
              margin:15px 0 5px;
            "
          >
            Welcome to NUnified
          </h1>

          <p
            style="
              color:#cbd5e1;
              margin:0;
              font-size:13px;
            "
          >
            Organization Account
          </p>
        </div>

        <div
          style="
            background:#ffffff;
            padding:30px;
            border-radius:0 0 16px 16px;
          "
        >
          <p style="color:#334155;">
            Hello
            <strong>
              ${organizationName}
            </strong>,
          </p>

          <p style="color:#475569;">
            Your organization account has
            been created by the NUnified
            administrator.
          </p>

          <div
            style="
              margin:25px 0;
              padding:20px;
              background:#f8fafc;
              border-radius:12px;
              border-left:4px solid #ffcc00;
            "
          >
            <p
              style="
                margin:0 0 8px;
                color:#64748b;
                font-size:12px;
              "
            >
              USERNAME
            </p>

            <p
              style="
                margin:0 0 20px;
                color:#071c47;
                font-size:17px;
                font-weight:700;
              "
            >
              ${username}
            </p>

            <p
              style="
                margin:0 0 8px;
                color:#64748b;
                font-size:12px;
              "
            >
              TEMPORARY PASSWORD
            </p>

            <p
              style="
                margin:0;
                color:#071c47;
                font-size:17px;
                font-weight:700;
              "
            >
              ${temporaryPassword}
            </p>
          </div>

          <p
            style="
              color:#dc2626;
              font-size:13px;
              font-weight:bold;
            "
          >
            Please change your temporary
            password after signing in.
          </p>

          <p
            style="
              color:#64748b;
              font-size:12px;
            "
          >
            Do not share these credentials
            with anyone.
          </p>
        </div>
      </div>
    `,
  });
}

/* =====================================================
   CURRENT ORGANIZATION ID
===================================================== */

async function getCurrentOrganizationId(
  req
) {
  const organizationFromRequest =
    req.user
      ?.organization?._id ||
    req.user
      ?.organization;

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
      "organization"
    );

  return (
    user?.organization ||
    null
  );
}

/* =====================================================
   ORGANIZATION USER
===================================================== */

async function getOrganizationUser(
  organizationId
) {
  return User.findOne({
    organization:
      organizationId,

    role:
      "organization",
  });
}

/* =====================================================
   SAFE ORGANIZATION OBJECT

   Prevent giant base64 images from being returned
   to admin organization lists.
===================================================== */

function safeOrganization(
  organization
) {
  if (!organization) {
    return null;
  }

  const data =
    typeof organization.toObject ===
    "function"
      ? organization.toObject()
      : {
          ...organization,
        };

  delete data.profileImage;

  return data;
}

/* =====================================================
   ADMIN
   GET ALL ORGANIZATIONS

   GET /api/organizations
===================================================== */

router.get(
  "/",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const organizations =
        await Organization.find()
          .select(
            "-profileImage"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const results =
        await Promise.all(
          organizations.map(
            async (
              organization
            ) => {
              const user =
                await User.findOne(
                  {
                    organization:
                      organization._id,

                    role:
                      "organization",
                  }
                )
                  .select(
                    "_id username role active"
                  )
                  .lean();

              return {
                ...organization,

                username:
                  user?.username ||
                  "",

                user:
                  user || null,
              };
            }
          )
        );

      return res.json(
        results
      );
    } catch (error) {
      console.error(
        "GET ORGANIZATIONS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load organizations.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   CREATE ORGANIZATION

   POST /api/organizations
===================================================== */

router.post(
  "/",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    let organization =
      null;

    let organizationUser =
      null;

    try {
      console.log(
        "CREATE ORGANIZATION BODY:",
        req.body
      );

      const {
        organizationName,
        acronym,
        email,
        contactNumber,
        adviser,
        description,
        color,
      } = req.body || {};

      /* ===============================================
         REQUIRED FIELDS
      =============================================== */

      if (
        !cleanText(
          organizationName
        ) ||
        !cleanText(
          acronym
        ) ||
        !normalizeEmail(
          email
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Organization Name, Acronym, and Email are required.",
          });
      }

      /* ===============================================
         DUPLICATE ORGANIZATION NAME
      =============================================== */

      const duplicateName =
        await Organization.findOne(
          {
            organizationName: {
              $regex:
                `^${escapeRegex(
                  cleanText(
                    organizationName
                  )
                )}$`,

              $options:
                "i",
            },
          }
        );

      if (
        duplicateName
      ) {
        return res
          .status(409)
          .json({
            message:
              "An organization with this name already exists.",
          });
      }

      /* ===============================================
         DUPLICATE EMAIL
      =============================================== */

      const duplicateEmail =
        await Organization.findOne(
          {
            email:
              normalizeEmail(
                email
              ),
          }
        );

      if (
        duplicateEmail
      ) {
        return res
          .status(409)
          .json({
            message:
              "This email address is already assigned to another organization.",
          });
      }

      /* ===============================================
         LOGIN CREDENTIALS
      =============================================== */

      const username =
        await generateUniqueUsername(
          acronym
        );

      const temporaryPassword =
        generateTemporaryPassword();

      console.log(
        "GENERATED USERNAME:",
        username
      );

      /* ===============================================
         CREATE ORGANIZATION
      =============================================== */

      organization =
        await Organization.create({
          organizationName:
            cleanText(
              organizationName
            ),

          acronym:
            cleanText(
              acronym
            ).toUpperCase(),

          email:
            normalizeEmail(
              email
            ),

          contactNumber:
            cleanText(
              contactNumber
            ),

          adviser:
            cleanText(
              adviser
            ),

          description:
            cleanText(
              description
            ),

          color:
            normalizeColor(
              color
            ),

          profileImage:
            "",

          active:
            true,
        });

      /* ===============================================
         HASH TEMP PASSWORD
      =============================================== */

      const hashedPassword =
        await bcrypt.hash(
          temporaryPassword,
          12
        );

      /* ===============================================
         CREATE ORGANIZATION USER
      =============================================== */

      organizationUser =
        await User.create({
          username,

          password:
            hashedPassword,

          role:
            "organization",

          organization:
            organization._id,

          active:
            true,
        });

      /* ===============================================
         SEND CREDENTIAL EMAIL
      =============================================== */

      try {
        await sendOrganizationCredentials(
          {
            email:
              organization.email,

            organizationName:
              organization.organizationName,

            username,

            temporaryPassword,
          }
        );
      } catch (
        emailError
      ) {
        console.error(
          "CREDENTIAL EMAIL ERROR:",
          emailError
        );

        /*
          Roll back account creation.
        */

        if (
          organizationUser?._id
        ) {
          await User.deleteOne(
            {
              _id:
                organizationUser._id,
            }
          );
        }

        if (
          organization?._id
        ) {
          await Organization.deleteOne(
            {
              _id:
                organization._id,
            }
          );
        }

        return res
          .status(500)
          .json({
            message:
              "The organization was not created because the credentials email could not be sent. Check the organization's email address and the backend email settings.",
          });
      }

      return res
        .status(201)
        .json({
          message:
            "Organization created successfully. Login credentials were generated and emailed.",

          organization: {
            ...safeOrganization(
              organization
            ),

            username:
              organizationUser.username,

            user: {
              _id:
                organizationUser._id,

              username:
                organizationUser.username,

              role:
                organizationUser.role,

              active:
                organizationUser.active,
            },
          },
        });
    } catch (error) {
      console.error(
        "CREATE ORGANIZATION ERROR:",
        error
      );

      /*
        Roll back if one document was created.
      */

      try {
        if (
          organizationUser?._id
        ) {
          await User.deleteOne(
            {
              _id:
                organizationUser._id,
            }
          );
        }

        if (
          organization?._id
        ) {
          await Organization.deleteOne(
            {
              _id:
                organization._id,
            }
          );
        }
      } catch (
        rollbackError
      ) {
        console.error(
          "ORGANIZATION ROLLBACK ERROR:",
          rollbackError
        );
      }

      if (
        error?.code ===
        11000
      ) {
        return res
          .status(409)
          .json({
            message:
              "An organization or username with the same information already exists.",
          });
      }

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to create organization.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   GET PROFILE PICTURE

   GET /api/organizations/me/profile-picture

   KEEP THIS BEFORE /:id
===================================================== */

router.get(
  "/me/profile-picture",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
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

      const image =
        organization.profileImage ||
        "";

      console.log(
        "PROFILE PICTURE LOADED:",
        {
          organization:
            organization.organizationName,

          exists:
            Boolean(
              image
            ),

          length:
            image.length,
        }
      );

      return res.json({
        profileImage:
          image,
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
            "Unable to load profile picture.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   SAVE / CHANGE PROFILE PICTURE

   PUT /api/organizations/me/profile-picture
===================================================== */

router.put(
  "/me/profile-picture",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
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

      /* ===============================================
         MUST BE AN IMAGE DATA URL
      =============================================== */

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

      /* ===============================================
         SIZE LIMIT

         The frontend compresses the image
         before sending.
      =============================================== */

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

      /* ===============================================
         SAVE DIRECTLY INTO ORGANIZATION DOCUMENT
      =============================================== */

      const organization =
        await Organization.findByIdAndUpdate(
          organizationId,

          {
            $set: {
              profileImage:
                image,
            },
          },

          {
            new: true,
            runValidators:
              true,
          }
        ).select(
          "organizationName profileImage"
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

      /* ===============================================
         READ IT BACK FROM MONGODB
      =============================================== */

      const verify =
        await Organization.findById(
          organizationId
        ).select(
          "organizationName profileImage"
        );

      console.log(
        "PROFILE PICTURE SAVE VERIFY:",
        {
          organization:
            verify?.organizationName,

          exists:
            Boolean(
              verify?.profileImage
            ),

          length:
            verify?.profileImage
              ?.length ||
            0,
        }
      );

      if (
        !verify?.profileImage
      ) {
        return res
          .status(500)
          .json({
            message:
              "The profile picture was received but could not be saved to MongoDB.",
          });
      }

      return res.json({
        message:
          "Profile picture saved successfully.",

        profileImage:
          verify.profileImage,
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
   ORGANIZATION
   REMOVE PROFILE PICTURE

   DELETE /api/organizations/me/profile-picture
===================================================== */

router.delete(
  "/me/profile-picture",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
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

      const organization =
        await Organization.findByIdAndUpdate(
          organizationId,

          {
            $set: {
              profileImage:
                "",
            },
          },

          {
            new: true,
          }
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

      console.log(
        "PROFILE PICTURE REMOVED:",
        organization.organizationName
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
            "Unable to remove profile picture.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   GET MY PROFILE

   GET /api/organizations/me
===================================================== */

router.get(
  "/me",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
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

      /*
        Profile image is loaded separately so
        this request stays small.
      */

      const organization =
        await Organization.findById(
          organizationId
        ).select(
          "-profileImage"
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

      return res.json({
        organization,
      });
    } catch (error) {
      console.error(
        "GET MY ORGANIZATION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load organization profile.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   UPDATE MY PROFILE

   PUT /api/organizations/me
===================================================== */

router.put(
  "/me",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      const organizationId =
        await getCurrentOrganizationId(
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

      const {
        adviser,
        contactNumber,
        description,
      } = req.body || {};

      if (
        adviser !==
        undefined
      ) {
        organization.adviser =
          cleanText(
            adviser
          );
      }

      if (
        contactNumber !==
        undefined
      ) {
        organization.contactNumber =
          cleanText(
            contactNumber
          );
      }

      if (
        description !==
        undefined
      ) {
        organization.description =
          cleanText(
            description
          );
      }

      await organization.save();

      const updated =
        await Organization.findById(
          organizationId
        ).select(
          "-profileImage"
        );

      return res.json({
        message:
          "Organization profile updated successfully.",

        organization:
          updated,
      });
    } catch (error) {
      console.error(
        "UPDATE MY ORGANIZATION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to update organization profile.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   GET ONE ORGANIZATION

   GET /api/organizations/:id
===================================================== */

router.get(
  "/:id",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const organization =
        await Organization.findById(
          req.params.id
        )
          .select(
            "-profileImage"
          )
          .lean();

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

      const user =
        await getOrganizationUser(
          organization._id
        );

      return res.json({
        ...organization,

        username:
          user?.username ||
          "",

        user:
          user
            ? {
                _id:
                  user._id,

                username:
                  user.username,

                role:
                  user.role,

                active:
                  user.active,
              }
            : null,
      });
    } catch (error) {
      console.error(
        "GET ORGANIZATION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load organization.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   UPDATE ORGANIZATION

   PUT /api/organizations/:id
===================================================== */

router.put(
  "/:id",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const organization =
        await Organization.findById(
          req.params.id
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

      const {
        organizationName,
        acronym,
        email,
        contactNumber,
        adviser,
        description,
        color,
        password,
        newPassword,
        username,
      } = req.body || {};

      /* ===============================================
         NAME
      =============================================== */

      if (
        organizationName !==
        undefined
      ) {
        organization.organizationName =
          cleanText(
            organizationName
          );
      }

      /* ===============================================
         ACRONYM
      =============================================== */

      if (
        acronym !==
        undefined
      ) {
        organization.acronym =
          cleanText(
            acronym
          ).toUpperCase();
      }

      /* ===============================================
         EMAIL
      =============================================== */

      if (
        email !==
        undefined
      ) {
        const cleanEmail =
          normalizeEmail(
            email
          );

        const duplicate =
          await Organization.findOne(
            {
              _id: {
                $ne:
                  organization._id,
              },

              email:
                cleanEmail,
            }
          );

        if (
          duplicate
        ) {
          return res
            .status(409)
            .json({
              message:
                "That email address is already assigned to another organization.",
            });
        }

        organization.email =
          cleanEmail;
      }

      /* ===============================================
         CONTACT
      =============================================== */

      if (
        contactNumber !==
        undefined
      ) {
        organization.contactNumber =
          cleanText(
            contactNumber
          );
      }

      /* ===============================================
         ADVISER
      =============================================== */

      if (
        adviser !==
        undefined
      ) {
        organization.adviser =
          cleanText(
            adviser
          );
      }

      /* ===============================================
         DESCRIPTION
      =============================================== */

      if (
        description !==
        undefined
      ) {
        organization.description =
          cleanText(
            description
          );
      }

      /* ===============================================
         COLOR
      =============================================== */

      if (
        color !==
        undefined
      ) {
        organization.color =
          normalizeColor(
            color
          );
      }

      await organization.save();

      /* ===============================================
         LOGIN ACCOUNT
      =============================================== */

      const user =
        await getOrganizationUser(
          organization._id
        );

      if (user) {
        /* =============================================
           OPTIONAL USERNAME
        ============================================= */

        if (
          username !==
            undefined &&
          cleanText(
            username
          )
        ) {
          const cleanUsername =
            cleanText(
              username
            ).toLowerCase();

          const duplicateUsername =
            await User.findOne(
              {
                _id: {
                  $ne:
                    user._id,
                },

                username:
                  cleanUsername,
              }
            );

          if (
            duplicateUsername
          ) {
            return res
              .status(409)
              .json({
                message:
                  "That username is already being used.",
              });
          }

          user.username =
            cleanUsername;
        }

        /* =============================================
           OPTIONAL ADMIN PASSWORD CHANGE
        ============================================= */

        const requestedPassword =
          cleanText(
            newPassword ||
              password
          );

        if (
          requestedPassword
        ) {
          if (
            requestedPassword.length <
            8
          ) {
            return res
              .status(400)
              .json({
                message:
                  "New password must contain at least 8 characters.",
              });
          }

          user.password =
            await bcrypt.hash(
              requestedPassword,
              12
            );
        }

        await user.save();
      }

      const updatedUser =
        await getOrganizationUser(
          organization._id
        );

      return res.json({
        message:
          "Organization updated successfully.",

        organization: {
          ...safeOrganization(
            organization
          ),

          username:
            updatedUser
              ?.username ||
            "",

          user:
            updatedUser
              ? {
                  _id:
                    updatedUser._id,

                  username:
                    updatedUser.username,

                  role:
                    updatedUser.role,

                  active:
                    updatedUser.active,
                }
              : null,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE ORGANIZATION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to update organization.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   RESET ORGANIZATION LOGIN CREDENTIALS

   POST /api/organizations/:id/reset-credentials
===================================================== */

router.post(
  "/:id/reset-credentials",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const organization =
        await Organization.findById(
          req.params.id
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

      const user =
        await getOrganizationUser(
          organization._id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "Organization login account not found.",
          });
      }

      let username =
        cleanText(
          req.body?.username
        );

      if (!username) {
        username =
          user.username;
      }

      username =
        username.toLowerCase();

      const duplicate =
        await User.findOne(
          {
            _id: {
              $ne:
                user._id,
            },

            username,
          }
        );

      if (
        duplicate
      ) {
        return res
          .status(409)
          .json({
            message:
              "That username is already being used.",
          });
      }

      const temporaryPassword =
        generateTemporaryPassword();

      const passwordHash =
        await bcrypt.hash(
          temporaryPassword,
          12
        );

      /* ===============================================
         EMAIL FIRST
      =============================================== */

      try {
        await sendOrganizationCredentials(
          {
            email:
              organization.email,

            organizationName:
              organization.organizationName,

            username,

            temporaryPassword,
          }
        );
      } catch (
        emailError
      ) {
        console.error(
          "RESET CREDENTIAL EMAIL ERROR:",
          emailError
        );

        return res
          .status(500)
          .json({
            message:
              "Credentials were not changed because the credentials email could not be sent.",
          });
      }

      /* ===============================================
         SAVE AFTER EMAIL SUCCEEDS
      =============================================== */

      user.username =
        username;

      user.password =
        passwordHash;

      await user.save();

      return res.json({
        message:
          "New credentials were generated and emailed successfully.",

        username,
      });
    } catch (error) {
      console.error(
        "RESET CREDENTIALS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to reset organization credentials.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   ACTIVATE / DEACTIVATE ORGANIZATION

   PATCH /api/organizations/:id/status

   Body:
   {
     active: true
   }
===================================================== */

router.patch(
  "/:id/status",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const {
        active,
      } = req.body || {};

      if (
        typeof active !==
        "boolean"
      ) {
        return res
          .status(400)
          .json({
            message:
              "active must be true or false.",
          });
      }

      const organization =
        await Organization.findById(
          req.params.id
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

      organization.active =
        active;

      await organization.save();

      await User.updateOne(
        {
          organization:
            organization._id,

          role:
            "organization",
        },

        {
          $set: {
            active,
          },
        }
      );

      return res.json({
        message:
          active
            ? "Organization account activated successfully."
            : "Organization account deactivated successfully.",

        organization:
          safeOrganization(
            organization
          ),
      });
    } catch (error) {
      console.error(
        "ORGANIZATION STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to update organization status.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   DELETE ORGANIZATION

   DELETE /api/organizations/:id
===================================================== */

router.delete(
  "/:id",

  protect,

  authorize("admin"),

  async (
    req,
    res
  ) => {
    try {
      const organization =
        await Organization.findById(
          req.params.id
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

      /* ===============================================
         DELETE LOGIN ACCOUNT
      =============================================== */

      await User.deleteMany(
        {
          organization:
            organization._id,
        }
      );

      /* ===============================================
         DELETE ORGANIZATION
      =============================================== */

      await Organization.deleteOne(
        {
          _id:
            organization._id,
        }
      );

      return res.json({
        message:
          "Organization removed successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE ORGANIZATION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to remove organization.",
        });
    }
  }
);

export default router;