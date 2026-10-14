import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

import AdminEventCalendar from "../../components/common/AdminEventCalendar.jsx";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name, className = "" }) {
  return (
    <span
      className={`
        material-symbols-rounded
        leading-none
        ${className}
      `}
    >
      {name}
    </span>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(start, end) {
  if (!start && !end) {
    return "";
  }

  return [start, end].filter(Boolean).join(" - ");
}

function getOrganizationName(organization) {
  if (!organization) {
    return "Organization";
  }

  if (typeof organization === "string") {
    return organization;
  }

  return (
    organization.organizationName ||
    organization.name ||
    organization.acronym ||
    "Organization"
  );
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

export default function AdminDashboard() {
  const [organizations, setOrganizations] = useState([]);

  const [bookings, setBookings] = useState([]);

  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* ===================================================
     LOAD DATA
  =================================================== */

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/organizations"),

        api.get("/bookings"),

        api.get("/announcements/admin"),
      ]);

      /* ORGANIZATIONS */

      if (results[0].status === "fulfilled") {
        setOrganizations(
          Array.isArray(results[0].value.data) ? results[0].value.data : [],
        );
      } else {
        setOrganizations([]);
      }

      /* BOOKINGS */

      if (results[1].status === "fulfilled") {
        setBookings(
          Array.isArray(results[1].value.data) ? results[1].value.data : [],
        );
      } else {
        setBookings([]);
      }

      /* ANNOUNCEMENTS */

      if (results[2].status === "fulfilled") {
        setAnnouncements(
          Array.isArray(results[2].value.data) ? results[2].value.data : [],
        );
      } else {
        setAnnouncements([]);
      }

      const allFailed = results.every((result) => result.status === "rejected");

      if (allFailed) {
        setError("Unable to load dashboard data.");
      }
    } catch (err) {
      console.error("Admin dashboard error:", err);

      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ===================================================
     STATISTICS
  =================================================== */

  const pendingBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => normalizeStatus(booking.status) === "pending",
      ),
    [bookings],
  );

  const approvedPosts = useMemo(
    () =>
      announcements.filter(
        (post) => normalizeStatus(post.status) === "approved",
      ),
    [announcements],
  );

  const statistics = [
    {
      title: "Organizations",

      value: organizations.length,

      icon: "groups",
    },

    {
      title: "Events",

      value: bookings.length,

      icon: "calendar_month",
    },

    {
      title: "Pending Approvals",

      value: pendingBookings.length,

      icon: "pending_actions",
    },

    {
      title: "Published Posts",

      value: approvedPosts.length,

      icon: "campaign",
    },
  ];

  /* ===================================================
     RECENT ACTIVITIES

     Create activity list from actual data.
  =================================================== */

  const recentActivities = useMemo(() => {
    const activities = [];

    organizations.forEach((organization) => {
      activities.push({
        id: `org-${organization._id}`,

        icon: "groups",

        title: `${
          organization.organizationName || organization.name || "Organization"
        } account is registered.`,

        date: organization.createdAt,

        type: "organization",
      });
    });

    bookings.forEach((booking) => {
      const organization = getOrganizationName(booking.organization);

      let title = `${organization} submitted "${booking.eventName || "an event"}".`;

      if (normalizeStatus(booking.status) === "approved") {
        title = `"${booking.eventName || "Event"}" was approved.`;
      }

      if (normalizeStatus(booking.status) === "rejected") {
        title = `"${booking.eventName || "Event"}" was rejected.`;
      }

      activities.push({
        id: `booking-${booking._id}`,

        icon: "event",

        title,

        date: booking.updatedAt || booking.createdAt,

        type: "booking",
      });
    });

    announcements.forEach((post) => {
      const organization = getOrganizationName(post.organization);

      let title = `${organization} submitted "${post.title || "a post"}" for review.`;

      if (normalizeStatus(post.status) === "approved") {
        title = `"${post.title || "Post"}" was published.`;
      }

      if (normalizeStatus(post.status) === "rejected") {
        title = `"${post.title || "Post"}" was rejected.`;
      }

      activities.push({
        id: `post-${post._id}`,

        icon: "campaign",

        title,

        date: post.updatedAt || post.createdAt,

        type: "post",
      });
    });

    return activities
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);
  }, [organizations, bookings, announcements]);

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <div
      className="
        space-y-5
        pb-8
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="
          rounded-[20px]

          bg-gradient-to-r
          from-[#020617]
          via-[#001F3F]
          to-[#064477]

          px-6
          py-5

          text-white

          shadow-sm
        "
      >
        <p
          className="
            text-[9px]
            font-black
            uppercase
            tracking-[0.16em]

            text-yellow-400
          "
        >
          Administrator
        </p>

        <h1
          className="
            mt-1.5

            text-[25px]
            font-black
            leading-tight
          "
        >
          Admin Dashboard
        </h1>

        <p
          className="
            mt-1.5

            text-[11px]

            text-blue-100
          "
        >
          Monitor and manage the NUnified Event Management System.
        </p>
      </motion.div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="
            mx-auto
            w-full
            max-w-[1050px]

            rounded-xl

            border
            border-red-200

            bg-red-50

            px-4
            py-3

            text-xs
            font-bold
            text-red-600
          "
        >
          {error}
        </div>
      )}

      {/* =================================================
          STATISTIC CARDS

          SMALLER THAN BEFORE
      ================================================= */}

      <div
        className="
          mx-auto

          grid
          w-full
          max-w-[1050px]

          grid-cols-1
          gap-3

          sm:grid-cols-2

          lg:grid-cols-4
        "
      >
        {statistics.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: index * 0.05,
            }}
            whileHover={{
              y: -2,
            }}
            className="
                min-h-[108px]

                rounded-2xl

                border
                border-gray-100

                bg-white

                p-3.5

                shadow-[0_4px_14px_rgba(15,23,42,0.07)]

                transition

                hover:shadow-[0_7px_18px_rgba(15,23,42,0.11)]
              "
          >
            <div
              className="
                  flex
                  h-8
                  w-8

                  items-center
                  justify-center

                  rounded-lg

                  bg-[#17285f]

                  text-yellow-400
                "
            >
              <MaterialIcon name={item.icon} className="text-[16px]" />
            </div>

            <p
              className="
                  mt-2.5

                  text-[9px]
                  font-bold

                  text-slate-500
                "
            >
              {item.title}
            </p>

            <p
              className="
                  mt-1

                  text-[23px]
                  font-black
                  leading-none

                  text-[#14285f]
                "
            >
              {loading ? "—" : item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* =================================================
          EVENT CALENDAR

          ONLY WIDTH IS REDUCED.
          CALENDAR FUNCTIONALITY REMAINS.
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.2,
        }}
        className="
          mx-auto

          w-full
          max-w-[1050px]
        "
      >
        <AdminEventCalendar />
      </motion.div>

      {/* =================================================
          PENDING APPROVALS
      ================================================= */}

      <motion.section
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.25,
        }}
        className="
          mx-auto

          w-full
          max-w-[1050px]

          rounded-2xl

          bg-white

          p-5

          shadow-[0_4px_14px_rgba(15,23,42,0.07)]
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h2
              className="
                text-[17px]
                font-black

                text-blue-950
              "
            >
              Pending Approvals
            </h2>

            <p
              className="
                mt-0.5

                text-[10px]

                text-gray-400
              "
            >
              Event requests that require Administrator review.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-1.5

              text-[9px]
              font-black

              text-yellow-600
            "
          >
            <span
              className="
                h-2
                w-2

                rounded-full

                bg-yellow-400
              "
            />
            Requires Action
          </div>
        </div>

        {/* =================================================
            PENDING LIST
        ================================================= */}

        {loading ? (
          <div
            className="
              mt-4

              rounded-xl

              bg-gray-50

              py-7

              text-center

              text-xs
              text-gray-400
            "
          >
            Loading pending approvals...
          </div>
        ) : pendingBookings.length > 0 ? (
          <div
            className="
              mt-4
              space-y-2.5
            "
          >
            {pendingBookings.slice(0, 5).map((booking) => {
              const organization = getOrganizationName(booking.organization);

              return (
                <div
                  key={booking._id}
                  className="
                        flex
                        flex-col
                        gap-3

                        rounded-xl

                        border
                        border-gray-100

                        bg-gray-50/80

                        px-4
                        py-3

                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                >
                  <div
                    className="
                          flex
                          min-w-0
                          items-start
                          gap-3
                        "
                  >
                    <div
                      className="
                            flex
                            h-9
                            w-9
                            shrink-0

                            items-center
                            justify-center

                            rounded-lg

                            bg-yellow-100

                            text-yellow-600
                          "
                    >
                      <MaterialIcon
                        name="pending_actions"
                        className="text-[17px]"
                      />
                    </div>

                    <div
                      className="
                            min-w-0
                          "
                    >
                      <h3
                        className="
                              truncate

                              text-[12px]
                              font-black

                              text-blue-950
                            "
                      >
                        {booking.eventName || "Event Booking"}
                      </h3>

                      <p
                        className="
                              mt-0.5

                              text-[10px]
                              font-bold

                              text-blue-700
                            "
                      >
                        {organization}
                      </p>

                      <div
                        className="
                              mt-1

                              flex
                              flex-wrap
                              gap-x-3
                              gap-y-1

                              text-[9px]

                              text-gray-500
                            "
                      >
                        {booking.eventDate && (
                          <span
                            className="
                                  flex
                                  items-center
                                  gap-1
                                "
                          >
                            <MaterialIcon
                              name="calendar_month"
                              className="text-[13px]"
                            />

                            {formatDate(booking.eventDate)}
                          </span>
                        )}

                        {booking.venue && (
                          <span
                            className="
                                  flex
                                  items-center
                                  gap-1
                                "
                          >
                            <MaterialIcon
                              name="location_on"
                              className="text-[13px]"
                            />

                            {booking.venue}
                          </span>
                        )}

                        {(booking.startTime || booking.endTime) && (
                          <span
                            className="
                                  flex
                                  items-center
                                  gap-1
                                "
                          >
                            <MaterialIcon
                              name="schedule"
                              className="text-[13px]"
                            />

                            {formatTime(booking.startTime, booking.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/admin/events"
                    className="
                          flex
                          h-8
                          shrink-0

                          items-center
                          justify-center
                          gap-1

                          rounded-lg

                          bg-[#17285f]

                          px-3

                          text-[10px]
                          font-black
                          text-white

                          transition

                          hover:bg-blue-900
                        "
                  >
                    Review
                    <MaterialIcon
                      name="arrow_forward"
                      className="text-[13px]"
                    />
                  </Link>
                </div>
              );
            })}

            {pendingBookings.length > 5 && (
              <div
                className="
                  flex
                  justify-center
                  pt-2
                "
              >
                <Link
                  to="/admin/events"
                  className="
                    text-[10px]
                    font-black

                    text-blue-700

                    hover:underline
                  "
                >
                  View all pending approvals
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div
            className="
              mt-4

              flex
              flex-col
              items-center
              justify-center

              rounded-xl

              bg-gray-50

              py-7

              text-center
            "
          >
            <div
              className="
                flex
                h-9
                w-9

                items-center
                justify-center

                rounded-full

                bg-green-100

                text-green-600
              "
            >
              <MaterialIcon name="check_circle" className="text-[18px]" />
            </div>

            <p
              className="
                mt-2

                text-[11px]
                font-bold

                text-gray-500
              "
            >
              No pending approvals.
            </p>
          </div>
        )}
      </motion.section>

      {/* =================================================
          RECENT ACTIVITIES

          THIS WAS ALSO IN THE OLD DASHBOARD
      ================================================= */}

      <motion.section
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.3,
        }}
        className="
          mx-auto

          w-full
          max-w-[1050px]

          rounded-2xl

          bg-white

          p-5

          shadow-[0_4px_14px_rgba(15,23,42,0.07)]
        "
      >
        <div>
          <h2
            className="
              text-[17px]
              font-black

              text-blue-950
            "
          >
            Recent Activities
          </h2>

          <p
            className="
              mt-0.5

              text-[10px]

              text-gray-400
            "
          >
            Latest activity across NUnified.
          </p>
        </div>

        {loading ? (
          <div
            className="
              mt-4

              rounded-xl

              bg-gray-50

              py-7

              text-center

              text-xs
              text-gray-400
            "
          >
            Loading recent activity...
          </div>
        ) : recentActivities.length > 0 ? (
          <div
            className="
              mt-4

              divide-y
              divide-gray-100
            "
          >
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="
                    flex
                    items-center
                    gap-3

                    py-3

                    first:pt-0
                    last:pb-0
                  "
              >
                <div
                  className="
                      flex
                      h-8
                      w-8
                      shrink-0

                      items-center
                      justify-center

                      rounded-lg

                      bg-blue-50

                      text-blue-800
                    "
                >
                  <MaterialIcon name={activity.icon} className="text-[15px]" />
                </div>

                <div
                  className="
                      min-w-0
                      flex-1
                    "
                >
                  <p
                    className="
                        text-[11px]
                        font-semibold

                        text-gray-700
                      "
                  >
                    {activity.title}
                  </p>

                  <p
                    className="
                        mt-0.5

                        text-[9px]

                        text-gray-400
                      "
                  >
                    {activity.date ? formatDate(activity.date) : "Recently"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="
              mt-4

              rounded-xl

              bg-gray-50

              py-7

              text-center

              text-[11px]
              text-gray-400
            "
          >
            No recent activities yet.
          </div>
        )}
      </motion.section>
    </div>
  );
}
