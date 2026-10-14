import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

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
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function getBookings(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.bookings)) {
    return data.bookings;
  }

  return [];
}

function normalizeStatus(status) {
  return String(status || "pending")
    .trim()
    .toLowerCase();
}

function prettyStatus(status) {
  const value = normalizeStatus(status);

  if (value === "pending") {
    return "Pending";
  }

  if (value === "approved") {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  if (value === "cancelled" || value === "canceled") {
    return "Cancelled";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function referenceOf(booking) {
  if (booking.reference) {
    return booking.reference;
  }

  if (booking._id) {
    return `NU-${String(booking._id).slice(-6).toUpperCase()}`;
  }

  return "N/A";
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "long",

    day: "numeric",

    year: "numeric",
  });
}

function getStatusMeta(status) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return {
      label: "Approved",

      icon: "check_circle",

      badge: "bg-green-100 text-green-800 border-green-200",
    };
  }

  if (value === "rejected") {
    return {
      label: "Rejected",

      icon: "cancel",

      badge: "bg-red-100 text-red-800 border-red-200",
    };
  }

  if (value === "cancelled" || value === "canceled") {
    return {
      label: "Cancelled",

      icon: "event_busy",

      badge: "bg-orange-100 text-orange-800 border-orange-200",
    };
  }

  return {
    label: "Pending",

    icon: "schedule",

    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
}

/* =====================================================
   BOOKING STATUS PAGE
===================================================== */

export default function BookingStatus() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  /* ===================================================
     LOAD BOOKINGS
  =================================================== */

  const loadBookings = async () => {
    setLoading(true);

    setError("");

    try {
      const response = await api.get("/bookings/my");

      setBookings(getBookings(response.data));
    } catch (err) {
      console.error("LOAD BOOKING STATUS ERROR:", err);

      setError(err.response?.data?.message || "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  /* ===================================================
     COUNTS
  =================================================== */

  const counts = useMemo(
    () => ({
      all: bookings.length,

      pending: bookings.filter(
        (booking) => normalizeStatus(booking.status) === "pending",
      ).length,

      approved: bookings.filter(
        (booking) => normalizeStatus(booking.status) === "approved",
      ).length,

      rejected: bookings.filter(
        (booking) => normalizeStatus(booking.status) === "rejected",
      ).length,

      cancelled: bookings.filter((booking) =>
        ["cancelled", "canceled"].includes(normalizeStatus(booking.status)),
      ).length,
    }),

    [bookings],
  );

  /* ===================================================
     SEARCH + FILTER
  =================================================== */

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        (statusFilter === "cancelled" && status === "canceled");

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        booking.eventName,
        referenceOf(booking),
        booking.venue,
        booking.eventType,
        prettyStatus(booking.status),
        formatDate(booking.eventDate),
        booking.startTime,
        booking.endTime,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [bookings, search, statusFilter]);

  /* ===================================================
     FILTERS
  =================================================== */

  const filters = [
    {
      value: "all",

      label: "All",

      icon: "format_list_bulleted",

      count: counts.all,
    },

    {
      value: "pending",

      label: "Pending",

      icon: "schedule",

      count: counts.pending,
    },

    {
      value: "approved",

      label: "Approved",

      icon: "check_circle",

      count: counts.approved,
    },

    {
      value: "rejected",

      label: "Rejected",

      icon: "cancel",

      count: counts.rejected,
    },

    {
      value: "cancelled",

      label: "Cancelled",

      icon: "event_busy",

      count: counts.cancelled,
    },
  ];

  return (
    <div
      className="
        space-y-5
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <motion.section
        initial={{
          opacity: 0,

          y: 20,
        }}
        animate={{
          opacity: 1,

          y: 0,
        }}
        className="
          rounded-[22px]

          bg-gradient-to-r
          from-[#020617]
          via-[#00254d]
          to-[#064477]

          px-6
          py-6

          text-white
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
          Organization Portal
        </p>

        <h1
          className="
            mt-2

            text-[26px]
            font-black
          "
        >
          Booking Status
        </h1>

        <p
          className="
            mt-2

            max-w-2xl

            text-[11px]
            leading-5
            text-blue-100
          "
        >
          Track your venue reservations, search your bookings, and quickly check
          their current status.
        </p>
      </motion.section>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          role="alert"
          className="
            flex
            items-center
            justify-between
            gap-3

            rounded-xl

            border
            border-red-200

            bg-red-50

            px-4
            py-3

            text-[10px]
            font-bold
            text-red-700
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <MaterialIcon
              name="error"
              className="
                text-[18px]
              "
            />

            {error}
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error"
            className="
              rounded-lg
              p-1

              hover:bg-red-100
            "
          >
            <MaterialIcon name="close" />
          </button>
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-2
          gap-3

          lg:grid-cols-5
        "
      >
        <StatCard title="Total" value={counts.all} icon="event_note" />

        <StatCard title="Pending" value={counts.pending} icon="schedule" />

        <StatCard
          title="Approved"
          value={counts.approved}
          icon="check_circle"
        />

        <StatCard title="Rejected" value={counts.rejected} icon="cancel" />

        <StatCard
          title="Cancelled"
          value={counts.cancelled}
          icon="event_busy"
        />
      </div>

      {/* =================================================
          SEARCH + FILTERS
      ================================================= */}

      <div
        className="
          rounded-2xl

          border
          border-gray-200

          bg-white

          p-4

          shadow-sm
        "
      >
        {/* ===============================================
            SEARCH
        =============================================== */}

        <div
          className="
            flex
            items-center
            gap-3

            rounded-xl

            bg-gray-100

            px-4
          "
        >
          <MaterialIcon
            name="search"
            className="
              text-[20px]
              text-blue-950
            "
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search event, booking reference, venue..."
            aria-label="Search bookings"
            className="
              h-11
              min-w-0
              flex-1

              bg-transparent

              text-[10px]
              text-blue-950

              outline-none
            "
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="
                flex
                h-8
                w-8
                items-center
                justify-center

                rounded-lg

                text-gray-500

                transition

                hover:bg-white
              "
            >
              <MaterialIcon
                name="close"
                className="
                  text-[18px]
                "
              />
            </button>
          )}

          <button
            type="button"
            onClick={loadBookings}
            disabled={loading}
            className="
              hidden
              items-center
              gap-2

              rounded-lg

              px-3
              py-2

              text-[9px]
              font-black
              text-blue-950

              transition

              hover:bg-white

              disabled:opacity-50

              sm:flex
            "
          >
            <MaterialIcon
              name="refresh"
              className={loading ? "animate-spin text-[17px]" : "text-[17px]"}
            />
            Refresh
          </button>
        </div>

        {/* ===============================================
            STATUS FILTERS
        =============================================== */}

        <div
          className="
            mt-3

            flex
            flex-wrap
            gap-2
          "
        >
          {filters.map((filter) => {
            const active = statusFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.value)}
                className={`
                    flex
                    items-center
                    gap-2

                    rounded-xl

                    px-3
                    py-2

                    text-[9px]
                    font-black

                    transition

                    ${
                      active
                        ? "bg-blue-950 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
              >
                <MaterialIcon
                  name={filter.icon}
                  className="
                      text-[17px]
                    "
                />

                {filter.label}

                <span
                  className={`
                      rounded-full

                      px-2
                      py-0.5

                      text-[8px]

                      ${
                        active
                          ? "bg-yellow-400 text-blue-950"
                          : "bg-white text-gray-500"
                      }
                    `}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================
          RESULT TITLE
      ================================================= */}

      <div
        className="
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
        "
      >
        <div>
          <h2
            className="
              text-[16px]
              font-black
              text-blue-950
            "
          >
            {statusFilter === "all"
              ? "Your Bookings"
              : `${prettyStatus(statusFilter)} Bookings`}
          </h2>

          <p
            className="
              mt-1

              text-[9px]
              text-gray-500
            "
          >
            Showing <strong>{filteredBookings.length}</strong> of{" "}
            <strong>{bookings.length}</strong> booking(s)
          </p>
        </div>

        {(search || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");

              setStatusFilter("all");
            }}
            className="
              flex
              items-center
              gap-2

              rounded-xl

              border
              border-gray-200

              bg-white

              px-4
              py-2

              text-[9px]
              font-black
              text-blue-950

              transition

              hover:bg-gray-50
            "
          >
            <MaterialIcon
              name="filter_alt_off"
              className="
                text-[17px]
              "
            />
            Clear Filters
          </button>
        )}
      </div>

      {/* =================================================
          BOOKINGS
      ================================================= */}

      {loading ? (
        <div
          className="
            flex
            min-h-[250px]
            flex-col
            items-center
            justify-center

            rounded-2xl

            border
            border-gray-200

            bg-white

            text-gray-400

            shadow-sm
          "
        >
          <MaterialIcon
            name="progress_activity"
            className="
              animate-spin

              text-[30px]
              text-blue-950
            "
          />

          <p
            className="
              mt-3

              text-[10px]
              font-bold
            "
          >
            Loading bookings...
          </p>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div
          className="
            space-y-4
          "
        >
          {filteredBookings.map((booking, index) => (
            <BookingCard
              key={booking._id || index}
              booking={booking}
              index={index}
            />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <EmptyState
          icon="search_off"
          title="No matching bookings"
          text="Try another search term or choose a different booking status."
          buttonText="Show All Bookings"
          onClick={() => {
            setSearch("");

            setStatusFilter("all");
          }}
        />
      ) : (
        <EmptyState
          icon="event_busy"
          title="No Bookings Yet"
          text="Once you submit a venue reservation, you can monitor its status here."
          buttonText="Create Booking"
          onClick={() => navigate("/organization/booking")}
        />
      )}
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({ title, value, icon }) {
  return (
    <div
      className="
        rounded-2xl

        border
        border-gray-200

        bg-white

        p-4

        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div>
          <p
            className="
              text-[7px]
              font-black
              uppercase
              tracking-wide

              text-gray-500
            "
          >
            {title}
          </p>

          <p
            className="
              mt-2

              text-[20px]
              font-black
              text-blue-950
            "
          >
            {value}
          </p>
        </div>

        <div
          className="
            flex
            h-9
            w-9
            items-center
            justify-center

            rounded-xl

            bg-blue-950

            text-yellow-400
          "
        >
          <MaterialIcon
            name={icon}
            className="
              text-[19px]
            "
          />
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   BOOKING CARD
===================================================== */

function BookingCard({ booking, index }) {
  const statusValue = normalizeStatus(booking.status);

  const status = getStatusMeta(statusValue);

  return (
    <motion.article
      initial={{
        opacity: 0,

        y: 10,
      }}
      animate={{
        opacity: 1,

        y: 0,
      }}
      transition={{
        delay: Math.min(index * 0.04, 0.2),
      }}
      className="
        overflow-hidden

        rounded-2xl

        border
        border-gray-200

        bg-white

        shadow-sm

        transition

        hover:shadow-md
      "
    >
      {/* =================================================
          TOP
      ================================================= */}

      <div
        className="
          flex
          flex-col
          gap-4

          border-b
          border-gray-100

          p-5

          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <h2
            className="
              break-words

              text-[18px]
              font-black
              text-blue-950
            "
          >
            {booking.eventName || "Event Booking"}
          </h2>

          <p
            className="
              mt-1

              text-[10px]
              text-gray-500
            "
          >
            Booking Reference:{" "}
            <span
              className="
                font-black
                text-blue-700
              "
            >
              {referenceOf(booking)}
            </span>
          </p>
        </div>

        <div
          className={`
            flex
            w-fit
            shrink-0
            items-center
            gap-2

            rounded-full

            border

            px-4
            py-2

            text-[9px]
            font-black

            ${status.badge}
          `}
        >
          <MaterialIcon
            name={status.icon}
            className="
              text-[17px]
            "
          />

          {status.label}
        </div>
      </div>

      {/* =================================================
          INFORMATION
      ================================================= */}

      <div
        className="
          p-5
        "
      >
        <div
          className="
            grid
            gap-3

            sm:grid-cols-2

            xl:grid-cols-4
          "
        >
          <InfoCard icon="location_on" label="Venue" value={booking.venue} />

          <InfoCard
            icon="calendar_month"
            label="Event Date"
            value={formatDate(booking.eventDate)}
          />

          <InfoCard
            icon="schedule"
            label="Time"
            value={`${booking.startTime || "--"} - ${booking.endTime || "--"}`}
          />

          <InfoCard
            icon="category"
            label="Event Type"
            value={booking.eventType}
          />
        </div>

        {/* ===============================================
            ADMIN REMARKS
        =============================================== */}

        {booking.adminRemarks && (
          <div
            className="
              mt-4

              rounded-xl

              border
              border-yellow-200

              bg-yellow-50

              p-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <MaterialIcon
                name="feedback"
                className="
                  text-[17px]
                  text-yellow-700
                "
              />

              <p
                className="
                  text-[9px]
                  font-black
                  text-yellow-900
                "
              >
                Administrator Remarks
              </p>
            </div>

            <p
              className="
                mt-2

                whitespace-pre-line

                text-[9px]
                leading-5
                text-yellow-800
              "
            >
              {booking.adminRemarks}
            </p>
          </div>
        )}

        {/* ===============================================
            COLLAPSIBLE TIMELINE
        =============================================== */}

        <details
          className="
            group

            mt-4

            overflow-hidden

            rounded-xl

            border
            border-gray-200

            bg-gray-50
          "
        >
          <summary
            className="
              flex
              cursor-pointer
              list-none
              items-center
              justify-between
              gap-3

              px-4
              py-3

              text-[10px]
              font-black
              text-blue-950

              transition

              hover:bg-gray-100
            "
          >
            <span
              className="
                flex
                items-center
                gap-2
              "
            >
              <MaterialIcon
                name="timeline"
                className="
                  text-[18px]
                "
              />
              Booking Progress
            </span>

            <MaterialIcon
              name="expand_more"
              className="
                text-[20px]

                transition-transform

                group-open:rotate-180
              "
            />
          </summary>

          <div
            className="
              border-t
              border-gray-200

              px-4
              py-5
            "
          >
            <div
              className="
                space-y-5
              "
            >
              <TimelineItem
                title="Request Submitted"
                description="Your booking request has been submitted."
                state="completed"
              />

              <TimelineItem
                title="Administrator Review"
                description={
                  statusValue === "pending"
                    ? "Your request is currently waiting for administrator review."
                    : "The administrator has completed the review."
                }
                state={statusValue === "pending" ? "active" : "completed"}
              />

              <TimelineItem
                title="Final Decision"
                description={
                  statusValue === "approved"
                    ? "Your booking has been approved."
                    : statusValue === "rejected"
                      ? "Your booking request has been rejected."
                      : ["cancelled", "canceled"].includes(statusValue)
                        ? "This booking has been cancelled."
                        : "The final decision will appear here after administrator review."
                }
                state={
                  statusValue === "approved"
                    ? "approved"
                    : statusValue === "rejected"
                      ? "rejected"
                      : ["cancelled", "canceled"].includes(statusValue)
                        ? "cancelled"
                        : "waiting"
                }
              />
            </div>
          </div>
        </details>
      </div>
    </motion.article>
  );
}

/* =====================================================
   INFO CARD
===================================================== */

function InfoCard({ icon, label, value }) {
  return (
    <div
      className="
        rounded-xl

        bg-gray-50

        p-4
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <MaterialIcon
          name={icon}
          className="
            text-[16px]
            text-gray-500
          "
        />

        <p
          className="
            text-[7px]
            font-black
            uppercase
            tracking-wide

            text-gray-500
          "
        >
          {label}
        </p>
      </div>

      <p
        className="
          mt-2

          break-words

          text-[10px]
          font-bold
          text-blue-950
        "
      >
        {value || "Not Provided"}
      </p>
    </div>
  );
}

/* =====================================================
   TIMELINE ITEM
===================================================== */

function TimelineItem({ title, description, state }) {
  const states = {
    completed: {
      icon: "check",

      style: "bg-green-500 text-white",
    },

    active: {
      icon: "schedule",

      style: "bg-yellow-400 text-blue-950",
    },

    approved: {
      icon: "check",

      style: "bg-green-500 text-white",
    },

    rejected: {
      icon: "close",

      style: "bg-red-500 text-white",
    },

    cancelled: {
      icon: "event_busy",

      style: "bg-orange-500 text-white",
    },

    waiting: {
      icon: "more_horiz",

      style: "bg-gray-300 text-gray-600",
    },
  };

  const current = states[state] || states.waiting;

  return (
    <div
      className="
        flex
        gap-3
      "
    >
      <div
        className={`
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center

          rounded-full

          ${current.style}
        `}
      >
        <MaterialIcon
          name={current.icon}
          className="
            text-[16px]
          "
        />
      </div>

      <div
        className="
          min-w-0
        "
      >
        <h3
          className="
            text-[10px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-1

            text-[9px]
            leading-5
            text-gray-500
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* =====================================================
   EMPTY STATE
===================================================== */

function EmptyState({ icon, title, text, buttonText, onClick }) {
  return (
    <div
      className="
        rounded-2xl

        border
        border-gray-200

        bg-white

        px-6
        py-14

        text-center

        shadow-sm
      "
    >
      <div
        className="
          mx-auto

          flex
          h-14
          w-14
          items-center
          justify-center

          rounded-2xl

          bg-gray-100

          text-blue-950
        "
      >
        <MaterialIcon
          name={icon}
          className="
            text-[28px]
          "
        />
      </div>

      <h2
        className="
          mt-4

          text-[16px]
          font-black
          text-blue-950
        "
      >
        {title}
      </h2>

      <p
        className="
          mx-auto
          mt-2

          max-w-md

          text-[9px]
          leading-5
          text-gray-500
        "
      >
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="
          mt-5

          inline-flex
          items-center
          justify-center
          gap-2

          rounded-xl

          bg-yellow-400

          px-5
          py-3

          text-[10px]
          font-black
          text-blue-950

          transition

          hover:bg-yellow-500
        "
      >
        {buttonText}
      </button>
    </div>
  );
}
