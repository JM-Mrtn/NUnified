import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

import EventCalendarWidget from "../../components/common/EventCalendarWidget.jsx";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

/* =====================================================
   STATUS
===================================================== */

function statusOf(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/* =====================================================
   NORMALIZE SHARED CALENDAR EVENT

   This makes the calendar compatible with different
   backend response formats.

   IMPORTANT:
   Organization side only needs:

   - organization
   - date
   - start time
   - end time
   - venue
   - status
   - organization color

   Confidential information is NOT passed to the
   calendar.
===================================================== */

function normalizeCalendarEvent(item) {
  if (!item) {
    return null;
  }

  /* ===================================================
     ORGANIZATION
  =================================================== */

  const organization = item.organization ||
    item.organizationData ||
    item.extendedProps?.organization || {
      organizationName: item.organizationName || "Organization",

      acronym: item.organizationAcronym || "",

      color: item.organizationColor || item.color || "#FACC15",
    };

  /* ===================================================
     DATE
  =================================================== */

  const eventDate =
    item.eventDate ||
    item.date ||
    item.start ||
    item.schedule?.date ||
    item.currentSchedule?.date ||
    item.approvedSchedule?.date ||
    item.extendedProps?.eventDate ||
    "";

  /* ===================================================
     START TIME

     Supports several possible formats from the API.
  =================================================== */

  const startTime =
    item.startTime ||
    item.schedule?.startTime ||
    item.currentSchedule?.startTime ||
    item.approvedSchedule?.startTime ||
    item.extendedProps?.startTime ||
    "";

  /* ===================================================
     END TIME
  =================================================== */

  const endTime =
    item.endTime ||
    item.schedule?.endTime ||
    item.currentSchedule?.endTime ||
    item.approvedSchedule?.endTime ||
    item.extendedProps?.endTime ||
    "";

  /* ===================================================
     ALREADY FORMATTED TIME

     Example:
     "8:00 AM - 5:00 PM"
  =================================================== */

  const time = item.time || item.timeRange || item.extendedProps?.time || "";

  /* ===================================================
     VENUE
  =================================================== */

  const venue =
    item.venue ||
    item.location ||
    item.schedule?.venue ||
    item.currentSchedule?.venue ||
    item.approvedSchedule?.venue ||
    item.extendedProps?.venue ||
    "Venue not specified";

  /* ===================================================
     STATUS
  =================================================== */

  const status = item.status || item.extendedProps?.status || "approved";

  /* ===================================================
     COLOR
  =================================================== */

  let organizationColor = "#FACC15";

  if (organization && typeof organization === "object") {
    organizationColor =
      organization.color || item.organizationColor || item.color || "#FACC15";
  } else {
    organizationColor = item.organizationColor || item.color || "#FACC15";
  }

  /* ===================================================
     RETURN SAFE CALENDAR OBJECT

     Notice that confidential fields such as:
     description, participants, documents, adminRemarks,
     special requests, etc. are NOT copied.
  =================================================== */

  return {
    _id: item._id || item.id || `${eventDate}-${String(organization)}`,

    eventDate,

    start: eventDate,

    organization,

    startTime,

    endTime,

    time,

    venue,

    status,

    color: organizationColor,

    organizationColor,

    extendedProps: {
      organization,

      eventDate,

      startTime,

      endTime,

      time,

      venue,

      status,

      organizationColor,
    },
  };
}

/* =====================================================
   PAGE
===================================================== */

export default function OrganizationDashboard() {
  /* ===================================================
     ORGANIZATION
  =================================================== */

  const [organization, setOrganization] = useState(null);

  /* ===================================================
     MY BOOKINGS
  =================================================== */

  const [myBookings, setMyBookings] = useState([]);

  /* ===================================================
     GENERAL CALENDAR
  =================================================== */

  const [sharedCalendar, setSharedCalendar] = useState([]);

  /* ===================================================
     LOADING
  =================================================== */

  const [loading, setLoading] = useState(true);

  /* ===================================================
     ERROR

     Dashboard stays usable if one request fails.
  =================================================== */

  const [error, setError] = useState("");

  /* ===================================================
     LOAD DASHBOARD
  =================================================== */

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      setError("");

      try {
        const [profileResult, myResult, calendarResult] = await Promise.all([
          /* =========================================
                 ORGANIZATION PROFILE
              ========================================= */

          api.get("/organizations/me"),

          /* =========================================
                 CURRENT ORGANIZATION BOOKINGS
              ========================================= */

          api.get("/bookings/my"),

          /* =========================================
                 GENERAL ORGANIZATION CALENDAR
              ========================================= */

          api.get("/bookings/calendar"),
        ]);

        /* =============================================
             ORGANIZATION
          ============================================= */

        setOrganization(
          profileResult.data?.organization || profileResult.data || null,
        );

        /* =============================================
             MY BOOKINGS
          ============================================= */

        const myBookingData = Array.isArray(myResult.data)
          ? myResult.data
          : Array.isArray(myResult.data?.bookings)
            ? myResult.data.bookings
            : [];

        setMyBookings(myBookingData);

        /* =============================================
             SHARED CALENDAR RAW DATA
          ============================================= */

        const rawCalendar = Array.isArray(calendarResult.data)
          ? calendarResult.data
          : Array.isArray(calendarResult.data?.bookings)
            ? calendarResult.data.bookings
            : Array.isArray(calendarResult.data?.events)
              ? calendarResult.data.events
              : [];

        /* =============================================
             NORMALIZE CALENDAR

             This is the important part for:
             START TIME
             END TIME
             VENUE
             ORGANIZATION
          ============================================= */

        const normalizedCalendar = rawCalendar
          .map(normalizeCalendarEvent)
          .filter(Boolean);

        setSharedCalendar(normalizedCalendar);

        /* =============================================
             TEMPORARY DEVELOPMENT CHECK

             Open browser console if you want to see
             exactly what the calendar receives.

             Safe to keep during development.
          ============================================= */

        console.log(
          "GENERAL CALENDAR DATA:",
          normalizedCalendar.map((event) => ({
            organization: event.organization,

            eventDate: event.eventDate,

            startTime: event.startTime,

            endTime: event.endTime,

            time: event.time,

            venue: event.venue,

            status: event.status,
          })),
        );
      } catch (error) {
        console.error("ORGANIZATION DASHBOARD ERROR:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load some dashboard information.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===================================================
     ORGANIZATION NAME
  =================================================== */

  const name =
    organization?.organizationName || organization?.acronym || "Organization";

  /* ===================================================
     TOTAL
  =================================================== */

  const total = myBookings.length;

  /* ===================================================
     APPROVED
  =================================================== */

  const approved = useMemo(
    () =>
      myBookings.filter((item) => statusOf(item.status) === "approved").length,
    [myBookings],
  );

  /* ===================================================
     PENDING
  =================================================== */

  const pending = useMemo(
    () =>
      myBookings.filter((item) => statusOf(item.status) === "pending").length,
    [myBookings],
  );

  /* ===================================================
     REJECTED
  =================================================== */

  const rejected = useMemo(
    () =>
      myBookings.filter((item) => statusOf(item.status) === "rejected").length,
    [myBookings],
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      className="
        space-y-8
      "
    >
      {/* =================================================
          WELCOME
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="
          rounded-3xl

          bg-gradient-to-r
          from-[#020617]
          via-[#001F3F]
          to-[#003B7A]

          p-8

          text-white
        "
      >
        <p
          className="
            text-sm
            font-bold
            uppercase
            tracking-widest
            text-yellow-400
          "
        >
          Organization Portal
        </p>

        <h1
          className="
            mt-3

            text-4xl
            font-black
          "
        >
          Welcome, {name}
        </h1>

        <p
          className="
            mt-3

            text-gray-200
          "
        >
          Manage your organization's events, reservations and student updates.
        </p>
      </motion.div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="
            flex
            items-center
            gap-2

            rounded-xl

            border
            border-red-200

            bg-red-50

            px-4
            py-3

            text-[11px]
            font-bold
            text-red-700
          "
        >
          <MaterialIcon name="error" />

          {error}
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-2
          gap-4

          lg:grid-cols-4
        "
      >
        <Stat title="Total Bookings" value={total} />

        <Stat title="Pending" value={pending} />

        <Stat title="Approved" value={approved} />

        <Stat title="Rejected" value={rejected} />
      </div>

      {/* =================================================
          ACTIONS + GENERAL CALENDAR
      ================================================= */}

      <div
        className="
          grid
          gap-6

          lg:grid-cols-3
        "
      >
        {/* ===============================================
            LEFT ACTIONS
        =============================================== */}

        <div
          className="
            space-y-6
          "
        >
          {/* EVENT BOOKING */}

          <Action
            icon="event_available"
            title="Event Venue Booking"
            text="Submit a request for event venue reservation."
            path="/organization/booking"
            action="Book Venue"
          />

          {/* CREATE POST */}

          <Action
            icon="campaign"
            title="Create Post"
            text="Share announcements, news and updates."
            path="/organization/create-post"
            action="Create Post"
          />

          {/* ADMIN REQUEST */}

          <Action
            icon="support_agent"
            title="Admin Request"
            text="Send concerns and requests to the administrator."
            path="/organization/admin-request"
            action="Send Request"
          />
        </div>

        {/* ===============================================
            GENERAL CALENDAR
        =============================================== */}

        <div
          className="
            lg:col-span-2
          "
        >
          {loading ? (
            <div
              className="
                flex
                min-h-[420px]
                items-center
                justify-center

                rounded-3xl

                bg-white

                p-16

                text-center
                text-gray-500

                shadow-lg
              "
            >
              <div>
                <MaterialIcon name="calendar_month" />

                <p
                  className="
                    mt-2

                    text-sm
                    font-bold
                  "
                >
                  Loading calendar...
                </p>
              </div>
            </div>
          ) : (
            <EventCalendarWidget events={sharedCalendar} />
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function Stat({ title, value }) {
  return (
    <div
      className="
        rounded-2xl

        bg-white

        p-5

        shadow
      "
    >
      <p
        className="
          text-xs
          font-bold
          uppercase
          text-gray-500
        "
      >
        {title}
      </p>

      <p
        className="
          mt-3

          text-3xl
          font-black
          text-blue-950
        "
      >
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   ACTION CARD
===================================================== */

function Action({ icon, title, text, path, action }) {
  return (
    <div
      className="
        rounded-3xl

        bg-white

        p-7

        shadow-lg
      "
    >
      {/* ICON */}

      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center

          rounded-xl

          bg-blue-950

          text-yellow-400
        "
      >
        <MaterialIcon name={icon} />
      </div>

      {/* TITLE */}

      <h2
        className="
          mt-5

          text-xl
          font-black
          text-blue-950
        "
      >
        {title}
      </h2>

      {/* DESCRIPTION */}

      <p
        className="
          mt-2

          text-sm
          text-gray-600
        "
      >
        {text}
      </p>

      {/* LINK */}

      <Link
        to={path}
        className="
          mt-5

          inline-block

          font-bold
          text-yellow-600

          transition

          hover:text-yellow-500
        "
      >
        {action} →
      </Link>
    </div>
  );
}
