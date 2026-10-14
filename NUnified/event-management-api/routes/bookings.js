import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  fileURLToPath,
} from "url";

import Booking from "../models/Booking.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   CONFIGURATION
===================================================== */

const PREPARATION_BUFFER_MINUTES =
  60;

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

/* =====================================================
   FILE PATHS
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
    "booking-documents"
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
   CLEAN UP FILES
===================================================== */

function cleanupFiles(
  files
) {
  if (!files) {
    return;
  }

  const uploadedFiles =
    Object.values(
      files
    )
      .flat()
      .filter(Boolean);

  for (
    const file
    of uploadedFiles
  ) {
    try {
      if (
        file?.path &&
        fs.existsSync(
          file.path
        )
      ) {
        fs.unlinkSync(
          file.path
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Unable to clean uploaded file:",
        error
      );
    }
  }
}

/* =====================================================
   VERIFY REAL PDF
===================================================== */

function hasPdfSignature(
  filePath
) {
  let descriptor =
    null;

  try {
    descriptor =
      fs.openSync(
        filePath,
        "r"
      );

    const buffer =
      Buffer.alloc(
        5
      );

    fs.readSync(
      descriptor,
      buffer,
      0,
      5,
      0
    );

    return (
      buffer.toString(
        "utf8"
      ) ===
      "%PDF-"
    );
  } catch (
    error
  ) {
    console.error(
      "PDF validation error:",
      error
    );

    return false;
  } finally {
    if (
      descriptor !==
      null
    ) {
      try {
        fs.closeSync(
          descriptor
        );
      } catch {
        // Ignore close error
      }
    }
  }
}

/* =====================================================
   MULTER STORAGE
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

      const rawName =
        path.basename(
          file.originalname,
          path.extname(
            file.originalname
          )
        );

      const safeName =
        rawName
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .slice(
            0,
            80
          );

      callback(
        null,
        `${Date.now()}-${Math.round(
          Math.random() *
            1e9
        )}-${safeName}${extension}`
      );
    },
  });

/* =====================================================
   PDF ONLY
===================================================== */

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_FILE_SIZE,
    },

    fileFilter(
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

      const valid =
        file.mimetype ===
          "application/pdf" &&
        extension ===
          ".pdf";

      if (!valid) {
        return callback(
          new Error(
            "Only PDF files are allowed for the Approved Project Proposal and Approved ARF."
          )
        );
      }

      callback(
        null,
        true
      );
    },
  });

const uploadDocuments =
  upload.fields([
    {
      name:
        "projectProposal",

      maxCount:
        1,
    },

    {
      name:
        "approvedArf",

      maxCount:
        1,
    },
  ]);

/* =====================================================
   TIME HELPERS
===================================================== */

function timeToMinutes(
  value
) {
  if (!value) {
    return null;
  }

  const parts =
    String(
      value
    ).split(
      ":"
    );

  if (
    parts.length !==
    2
  ) {
    return null;
  }

  const hours =
    Number(
      parts[0]
    );

  const minutes =
    Number(
      parts[1]
    );

  if (
    !Number.isInteger(
      hours
    ) ||
    !Number.isInteger(
      minutes
    ) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}

/* =====================================================
   DATE RANGE
===================================================== */

function getDayRange(
  value
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const start =
    new Date(
      date
    );

  start.setUTCHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(
      start
    );

  end.setUTCDate(
    end.getUTCDate() +
      1
  );

  return {
    start,
    end,
  };
}

/* =====================================================
   SCHEDULE CONFLICT

   Example:

   Existing:
   7:00 AM - 10:00 AM

   Buffer:
   10:00 AM - 11:00 AM

   Next event:
   11:00 AM ✅
===================================================== */

function schedulesConflict({
  existingStart,
  existingEnd,
  requestedStart,
  requestedEnd,
}) {
  const existingStartMinutes =
    timeToMinutes(
      existingStart
    );

  const existingEndMinutes =
    timeToMinutes(
      existingEnd
    );

  const requestedStartMinutes =
    timeToMinutes(
      requestedStart
    );

  const requestedEndMinutes =
    timeToMinutes(
      requestedEnd
    );

  if (
    existingStartMinutes ===
      null ||
    existingEndMinutes ===
      null ||
    requestedStartMinutes ===
      null ||
    requestedEndMinutes ===
      null
  ) {
    return true;
  }

  const existingBlockedUntil =
    existingEndMinutes +
    PREPARATION_BUFFER_MINUTES;

  const requestedBlockedUntil =
    requestedEndMinutes +
    PREPARATION_BUFFER_MINUTES;

  const safelyAfter =
    requestedStartMinutes >=
    existingBlockedUntil;

  const safelyBefore =
    requestedBlockedUntil <=
    existingStartMinutes;

  return !(
    safelyAfter ||
    safelyBefore
  );
}

/* =====================================================
   FIND CONFLICT
===================================================== */

async function findConflict({
  venue,
  eventDate,
  startTime,
  endTime,
  excludeBookingId = null,
}) {
  const range =
    getDayRange(
      eventDate
    );

  if (!range) {
    return {
      invalidDate:
        true,
    };
  }

  const query = {
    venue,

    status:
      "approved",

    eventDate: {
      $gte:
        range.start,

      $lt:
        range.end,
    },
  };

  if (
    excludeBookingId
  ) {
    query._id = {
      $ne:
        excludeBookingId,
    };
  }

  const bookings =
    await Booking.find(
      query
    ).populate(
      "organization",
      "organizationName acronym color"
    );

  for (
    const booking
    of bookings
  ) {
    if (
      schedulesConflict({
        existingStart:
          booking.startTime,

        existingEnd:
          booking.endTime,

        requestedStart:
          startTime,

        requestedEnd:
          endTime,
      })
    ) {
      return booking;
    }
  }

  return null;
}

/* =====================================================
   VALIDATE SCHEDULE
===================================================== */

function validateSchedule({
  eventDate,
  startTime,
  endTime,
}) {
  const date =
    new Date(
      eventDate
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      valid:
        false,

      message:
        "Please select a valid event date.",
    };
  }

  const start =
    timeToMinutes(
      startTime
    );

  const end =
    timeToMinutes(
      endTime
    );

  if (
    start === null ||
    end === null
  ) {
    return {
      valid:
        false,

      message:
        "Please enter a valid start time and end time.",
    };
  }

  if (
    end <= start
  ) {
    return {
      valid:
        false,

      message:
        "End time must be later than start time.",
    };
  }

  return {
    valid:
      true,
  };
}

/* =====================================================
   CALENDAR

   GET /api/bookings/calendar

   ADMIN:
   Receives complete approved booking objects.

   ORGANIZATION:
   Receives only safe shared-calendar information:

   - Organization
   - Date
   - Start time
   - End time
   - Venue
   - Status
   - Organization color

   Confidential details are not exposed.
===================================================== */

router.get(
  "/calendar",

  protect,

  authorize(
    "organization",
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      /* ===============================================
         APPROVED BOOKINGS ONLY
      =============================================== */

      const query = {
        status:
          "approved",
      };

      /* ===============================================
         OPTIONAL VENUE FILTER
      =============================================== */

      if (
        req.query.venue
      ) {
        query.venue =
          req.query.venue;
      }

      /* ===============================================
         LOAD APPROVED BOOKINGS

         Booking already stores:
         eventDate
         startTime
         endTime
         venue
      =============================================== */

      const bookings =
        await Booking.find(
          query
        )
          .populate(
            "organization",
            "organizationName acronym color"
          )
          .sort({
            eventDate:
              1,

            startTime:
              1,
          });

      /* ===============================================
         ADMIN

         Admin can receive complete approved booking
         information.
      =============================================== */

      if (
        req.user.role ===
        "admin"
      ) {
        return res.json(
          bookings
        );
      }

      /* ===============================================
         ORGANIZATION PRIVACY

         IMPORTANT FIX:

         startTime and endTime are now included.

         Other confidential fields are intentionally
         not copied into this response.
      =============================================== */

      const safeBookings =
        bookings.map(
          (
            booking
          ) => {
            const bookingOrganization =
              booking.organization;

            const currentOrganizationId =
              req.user
                ?.organization
                ?._id ||
              req.user
                ?.organization ||
              "";

            const isMine =
              String(
                bookingOrganization
                  ?._id ||
                  ""
              ) ===
              String(
                currentOrganizationId
              );

            return {
              /* =========================================
                 ID
              ========================================= */

              _id:
                booking._id,

              /* =========================================
                 DATE
              ========================================= */

              eventDate:
                booking.eventDate,

              /* =========================================
                 TIME

                 THIS IS THE MAIN FIX
              ========================================= */

              startTime:
                booking.startTime ||
                "",

              endTime:
                booking.endTime ||
                "",

              /* =========================================
                 VENUE
              ========================================= */

              venue:
                booking.venue ||
                "Venue not specified",

              /* =========================================
                 STATUS
              ========================================= */

              status:
                booking.status,

              /* =========================================
                 ORGANIZATION
              ========================================= */

              organization: {
                _id:
                  bookingOrganization
                    ?._id,

                organizationName:
                  bookingOrganization
                    ?.organizationName ||
                  "Organization",

                acronym:
                  bookingOrganization
                    ?.acronym ||
                  "",

                color:
                  bookingOrganization
                    ?.color ||
                  "#FACC15",
              },

              /* =========================================
                 OWN BOOKING
              ========================================= */

              isMine,
            };
          }
        );

      /* ===============================================
         SAFE DEVELOPMENT LOG

         Does not log confidential event information.
      =============================================== */

      console.log(
        "ORGANIZATION GENERAL CALENDAR:",
        safeBookings.map(
          (
            booking
          ) => ({
            organization:
              booking
                .organization
                ?.organizationName,

            eventDate:
              booking.eventDate,

            startTime:
              booking.startTime,

            endTime:
              booking.endTime,

            venue:
              booking.venue,
          })
        )
      );

      /* ===============================================
         RESPONSE
      =============================================== */

      return res.json(
        safeBookings
      );
    } catch (
      error
    ) {
      console.error(
        "Calendar error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load venue calendar.",
        });
    }
  }
);

/* =====================================================
   CHECK AVAILABILITY
===================================================== */

router.post(
  "/check-availability",

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
        venue,
        eventDate,
        startTime,
        endTime,
      } =
        req.body;

      /* ===============================================
         REQUIRED
      =============================================== */

      if (
        !venue ||
        !eventDate ||
        !startTime ||
        !endTime
      ) {
        return res
          .status(
            400
          )
          .json({
            available:
              false,

            message:
              "Venue, event date, start time, and end time are required.",
          });
      }

      /* ===============================================
         VALIDATE SCHEDULE
      =============================================== */

      const validation =
        validateSchedule({
          eventDate,
          startTime,
          endTime,
        });

      if (
        !validation.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            available:
              false,

            message:
              validation.message,
          });
      }

      /* ===============================================
         CHECK CONFLICT
      =============================================== */

      const conflict =
        await findConflict({
          venue,
          eventDate,
          startTime,
          endTime,
        });

      if (
        conflict
      ) {
        return res.json({
          available:
            false,

          message:
            "The selected schedule is unavailable. Please choose another time. A 1-hour cleaning and preparation period is required between events.",
        });
      }

      /* ===============================================
         AVAILABLE
      =============================================== */

      return res.json({
        available:
          true,

        message:
          "The selected schedule is available.",
      });
    } catch (
      error
    ) {
      console.error(
        "Availability error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          available:
            false,

          message:
            "Unable to check venue availability.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION - MY BOOKINGS
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
      const bookings =
        await Booking.find({
          organization:
            req.user
              .organization,
        })
          .populate(
            "organization",
            "organizationName acronym color"
          )
          .sort({
            createdAt:
              -1,
          });

      return res.json(
        bookings
      );
    } catch (
      error
    ) {
      console.error(
        "My bookings error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to load your bookings.",
        });
    }
  }
);

/* =====================================================
   CREATE BOOKING
===================================================== */

router.post(
  "/",

  protect,

  authorize(
    "organization"
  ),

  uploadDocuments,

  async (
    req,
    res
  ) => {
    let bookingSaved =
      false;

    try {
      /* ===============================================
         FILES
      =============================================== */

      const proposal =
        req.files
          ?.projectProposal
          ?.[0];

      const arf =
        req.files
          ?.approvedArf
          ?.[0];

      /* ===============================================
         PROJECT PROPOSAL REQUIRED
      =============================================== */

      if (
        !proposal
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Approved Project Proposal PDF is required.",
          });
      }

      /* ===============================================
         ARF REQUIRED
      =============================================== */

      if (
        !arf
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Approved ARF PDF is required.",
          });
      }

      /* ===============================================
         VERIFY PROJECT PROPOSAL PDF
      =============================================== */

      if (
        !hasPdfSignature(
          proposal.path
        )
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Approved Project Proposal is not a valid PDF file.",
          });
      }

      /* ===============================================
         VERIFY ARF PDF
      =============================================== */

      if (
        !hasPdfSignature(
          arf.path
        )
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Approved ARF is not a valid PDF file.",
          });
      }

      /* ===============================================
         BOOKING DATA
      =============================================== */

      const {
        eventName,
        eventType,
        description,
        venue,
        eventDate,
        startTime,
        endTime,
        participants,
        request,
      } =
        req.body;

      /* ===============================================
         REQUIRED BOOKING INFORMATION
      =============================================== */

      if (
        !eventName
          ?.trim() ||
        !eventType
          ?.trim() ||
        !venue
          ?.trim() ||
        !eventDate ||
        !startTime ||
        !endTime
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              "Required booking information is missing.",
          });
      }

      /* ===============================================
         VALIDATE DATE + TIME
      =============================================== */

      const validation =
        validateSchedule({
          eventDate,
          startTime,
          endTime,
        });

      if (
        !validation.valid
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            400
          )
          .json({
            message:
              validation.message,
          });
      }

      /* ===============================================
         CHECK EXISTING APPROVED SCHEDULE
      =============================================== */

      const conflict =
        await findConflict({
          venue:
            venue.trim(),

          eventDate,

          startTime,

          endTime,
        });

      if (
        conflict
      ) {
        cleanupFiles(
          req.files
        );

        return res
          .status(
            409
          )
          .json({
            message:
              "The selected schedule is no longer available. A 1-hour cleaning and preparation period is required between events.",
          });
      }

      /* ===============================================
         PARTICIPANTS
      =============================================== */

      let participantCount =
        Number(
          participants ||
            0
        );

      if (
        Number.isNaN(
          participantCount
        ) ||
        participantCount <
          0
      ) {
        participantCount =
          0;
      }

      /* ===============================================
         CREATE
      =============================================== */

      const booking =
        await Booking.create({
          organization:
            req.user
              .organization,

          eventName:
            eventName.trim(),

          eventType:
            eventType.trim(),

          description:
            description
              ?.trim() ||
            "",

          venue:
            venue.trim(),

          eventDate,

          startTime,

          endTime,

          participants:
            participantCount,

          request:
            request
              ?.trim() ||
            "",

          projectProposalFile: {
            originalName:
              proposal
                .originalname,

            fileName:
              proposal
                .filename,

            mimeType:
              proposal
                .mimetype,

            size:
              proposal
                .size,
          },

          approvedArfFile: {
            originalName:
              arf
                .originalname,

            fileName:
              arf
                .filename,

            mimeType:
              arf
                .mimetype,

            size:
              arf
                .size,
          },

          status:
            "pending",
        });

      bookingSaved =
        true;

      /* ===============================================
         POPULATE ORGANIZATION
      =============================================== */

      const populated =
        await Booking.findById(
          booking._id
        ).populate(
          "organization",
          "organizationName acronym color"
        );

      return res
        .status(
          201
        )
        .json(
          populated
        );
    } catch (
      error
    ) {
      /* ===============================================
         REMOVE FILES IF DATABASE SAVE FAILED
      =============================================== */

      if (
        !bookingSaved
      ) {
        cleanupFiles(
          req.files
        );
      }

      console.error(
        "Create booking error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to submit booking.",
        });
    }
  }
);

/* =====================================================
   ADMIN - GET ALL BOOKINGS
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
      const bookings =
        await Booking.find()
          .populate(
            "organization",
            "organizationName acronym color email adviser"
          )
          .sort({
            createdAt:
              -1,
          });

      return res.json(
        bookings
      );
    } catch (
      error
    ) {
      console.error(
        "Admin bookings error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to load booking submissions.",
        });
    }
  }
);

/* =====================================================
   ADMIN - RESCHEDULE BOOKING

   PATCH
   /api/bookings/:id/reschedule

   BODY EXAMPLE:

   {
     "eventDate": "2026-10-15",
     "startTime": "11:00",
     "endTime": "13:00"
   }
===================================================== */

router.patch(
  "/:id/reschedule",

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
        eventDate,
        startTime,
        endTime,
      } =
        req.body;

      /* ===============================================
         REQUIRED
      =============================================== */

      if (
        !eventDate ||
        !startTime ||
        !endTime
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "New date, start time, and end time are required.",
          });
      }

      /* ===============================================
         VALIDATE
      =============================================== */

      const validation =
        validateSchedule({
          eventDate,
          startTime,
          endTime,
        });

      if (
        !validation.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              validation.message,
          });
      }

      /* ===============================================
         FIND BOOKING
      =============================================== */

      const booking =
        await Booking.findById(
          req.params.id
        );

      if (
        !booking
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Booking not found.",
          });
      }

      /* ===============================================
         CHECK CONFLICT

         Current booking is excluded.
      =============================================== */

      const conflict =
        await findConflict({
          venue:
            booking.venue,

          eventDate,

          startTime,

          endTime,

          excludeBookingId:
            booking._id,
        });

      if (
        conflict
          ?.invalidDate
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid event date.",
          });
      }

      if (
        conflict
      ) {
        return res
          .status(
            409
          )
          .json({
            message:
              "This event cannot be moved to that schedule because it conflicts with another approved booking, including the required 1-hour cleaning and preparation period.",
          });
      }

      /* ===============================================
         UPDATE DATE + TIME
      =============================================== */

      booking.eventDate =
        eventDate;

      booking.startTime =
        startTime;

      booking.endTime =
        endTime;

      await booking.save();

      /* ===============================================
         POPULATED RESULT
      =============================================== */

      const populated =
        await Booking.findById(
          booking._id
        ).populate(
          "organization",
          "organizationName acronym color"
        );

      return res.json({
        message:
          "Booking schedule updated successfully.",

        booking:
          populated,
      });
    } catch (
      error
    ) {
      console.error(
        "Reschedule booking error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to reschedule booking.",
        });
    }
  }
);

/* =====================================================
   ADMIN - UPDATE STATUS

   Supports:

   pending
   approved
   rejected
   cancelled
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
        status,
        adminRemarks,
      } =
        req.body;

      /* ===============================================
         ALLOWED STATUS
      =============================================== */

      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid booking status.",
          });
      }

      /* ===============================================
         FIND BOOKING
      =============================================== */

      const booking =
        await Booking.findById(
          req.params.id
        );

      if (
        !booking
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Booking not found.",
          });
      }

      /* ===============================================
         APPROVAL REQUIREMENTS
      =============================================== */

      if (
        status ===
        "approved"
      ) {
        /* =============================================
           PROJECT PROPOSAL
        ============================================= */

        if (
          !booking
            .projectProposalFile
            ?.fileName
        ) {
          return res
            .status(
              400
            )
            .json({
              message:
                "Approved Project Proposal PDF is missing.",
            });
        }

        /* =============================================
           ARF
        ============================================= */

        if (
          !booking
            .approvedArfFile
            ?.fileName
        ) {
          return res
            .status(
              400
            )
            .json({
              message:
                "Approved ARF PDF is missing.",
            });
        }

        /* =============================================
           CHECK SCHEDULE CONFLICT

           Ignore the current booking itself.
        ============================================= */

        const conflict =
          await findConflict({
            venue:
              booking.venue,

            eventDate:
              booking.eventDate,

            startTime:
              booking.startTime,

            endTime:
              booking.endTime,

            excludeBookingId:
              booking._id,
          });

        if (
          conflict
        ) {
          return res
            .status(
              409
            )
            .json({
              message:
                "This booking conflicts with another approved event, including the required 1-hour preparation period.",
            });
        }
      }

      /* ===============================================
         UPDATE STATUS
      =============================================== */

      booking.status =
        status;

      booking.adminRemarks =
        adminRemarks
          ?.trim() ||
        "";

      await booking.save();

      /* ===============================================
         RETURN UPDATED BOOKING
      =============================================== */

      const populated =
        await Booking.findById(
          booking._id
        ).populate(
          "organization",
          "organizationName acronym color"
        );

      return res.json(
        populated
      );
    } catch (
      error
    ) {
      console.error(
        "Booking status error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to update booking status.",
        });
    }
  }
);

/* =====================================================
   UPLOAD ERROR
===================================================== */

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    /* ===============================================
       REMOVE PARTIALLY UPLOADED FILES
    =============================================== */

    cleanupFiles(
      req.files
    );

    console.error(
      "Booking upload error:",
      error
    );

    /* ===============================================
       MULTER ERROR
    =============================================== */

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Each PDF document must be 5 MB or smaller.",
          });
      }

      return res
        .status(
          400
        )
        .json({
          message:
            error.message,
        });
    }

    /* ===============================================
       OTHER UPLOAD ERROR
    =============================================== */

    if (
      error
    ) {
      return res
        .status(
          400
        )
        .json({
          message:
            error.message,
        });
    }

    next();
  }
);

export default router;