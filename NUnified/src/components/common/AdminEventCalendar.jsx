import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   ICON
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

function pad(value) {
  return String(value).padStart(2, "0");
}

/* =====================================================
   DATE KEY
===================================================== */

function dateKey(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(value) {
  const key = dateKey(value);

  if (!key) {
    return "Not provided";
  }

  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",

    month: "long",

    day: "numeric",

    year: "numeric",
  });
}

/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(value) {
  if (!value) {
    return "Not provided";
  }

  const [hour, minute] = String(value).split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",

    minute: "2-digit",

    hour12: true,
  });
}

/* =====================================================
   DATE INPUT
===================================================== */

function toDateInputValue(value) {
  return dateKey(value);
}

/* =====================================================
   ORGANIZATION
===================================================== */

function getOrganization(event) {
  return event?.organization || {};
}

function getOrganizationName(event) {
  return getOrganization(event)?.organizationName || "Organization";
}

function getOrganizationAcronym(event) {
  return getOrganization(event)?.acronym || "";
}

function getOrganizationColor(event) {
  return getOrganization(event)?.color || "#FACC15";
}

/* =====================================================
   BOOKINGS ARRAY
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

/* =====================================================
   FINISHED EVENT
===================================================== */

function isFinished(event) {
  const key = dateKey(event?.eventDate);

  if (!key) {
    return false;
  }

  const endTime = event?.endTime || "23:59";

  const value = new Date(`${key}T${endTime}:00`);

  if (Number.isNaN(value.getTime())) {
    return false;
  }

  return value.getTime() < Date.now();
}

/* =====================================================
   CALENDAR DAYS

   Always 6 rows x 7 columns.
===================================================== */

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);

  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      return {
        date,

        key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
          date.getDate(),
        )}`,

        currentMonth: date.getMonth() === month,
      };
    },
  );
}

/* =====================================================
   ADMIN EVENT CALENDAR
===================================================== */

export default function AdminEventCalendar() {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [hoveredDate, setHoveredDate] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);

  /* ===================================================
     RESCHEDULE
  =================================================== */

  const [rescheduleEvent, setRescheduleEvent] = useState(null);

  const [rescheduleForm, setRescheduleForm] = useState({
    eventDate: "",
    startTime: "",
    endTime: "",
  });

  const [rescheduling, setRescheduling] = useState(false);

  const [rescheduleError, setRescheduleError] = useState("");

  /* ===================================================
     CANCEL SCHEDULE
  =================================================== */

  const [cancelEvent, setCancelEvent] = useState(null);

  const [cancelReason, setCancelReason] = useState("");

  const [cancelling, setCancelling] = useState(false);

  const [cancelError, setCancelError] = useState("");

  /* ===================================================
     LOAD APPROVED EVENTS
  =================================================== */

  const loadEvents = async () => {
    setLoading(true);

    setError("");

    try {
      const response = await api.get("/bookings");

      const approved = getBookings(response.data).filter(
        (event) => normalizeStatus(event.status) === "approved",
      );

      setEvents(approved);
    } catch (err) {
      console.error("Calendar load error:", err);

      setError(
        err.response?.data?.message || "Unable to load approved events.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* ===================================================
     EVENTS GROUPED BY DATE
  =================================================== */

  const eventsByDate = useMemo(() => {
    const map = {};

    events.forEach((event) => {
      const key = dateKey(event.eventDate);

      if (!key) {
        return;
      }

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(event);
    });

    /*
          Internally still sort by time.

          We simply do not SHOW the time
          on the calendar block.
        */

    Object.values(map).forEach((items) => {
      items.sort((a, b) =>
        String(a.startTime || "").localeCompare(String(b.startTime || "")),
      );
    });

    return map;
  }, [events]);

  /* ===================================================
     CALENDAR DAYS
  =================================================== */

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const monthTitle = viewDate.toLocaleDateString("en-US", {
    month: "long",

    year: "numeric",
  });

  /* ===================================================
     PREVIOUS MONTH
  =================================================== */

  const previousMonth = () => {
    setHoveredDate(null);

    setViewDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() - 1, 1),
    );
  };

  /* ===================================================
     NEXT MONTH
  =================================================== */

  const nextMonth = () => {
    setHoveredDate(null);

    setViewDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + 1, 1),
    );
  };

  /* ===================================================
     TODAY
  =================================================== */

  const goToday = () => {
    const now = new Date();

    setHoveredDate(null);

    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  /* ===================================================
     OPEN RESCHEDULE
  =================================================== */

  const openReschedule = (event) => {
    setRescheduleEvent(event);

    setRescheduleForm({
      eventDate: toDateInputValue(event.eventDate),

      startTime: event.startTime || "",

      endTime: event.endTime || "",
    });

    setRescheduleError("");

    setSuccess("");
  };

  /* ===================================================
     SAVE RESCHEDULE
  =================================================== */

  const saveReschedule = async () => {
    if (!rescheduleEvent) {
      return;
    }

    setRescheduleError("");

    if (
      !rescheduleForm.eventDate ||
      !rescheduleForm.startTime ||
      !rescheduleForm.endTime
    ) {
      setRescheduleError("Date, start time, and end time are required.");

      return;
    }

    if (rescheduleForm.startTime >= rescheduleForm.endTime) {
      setRescheduleError("End time must be later than start time.");

      return;
    }

    setRescheduling(true);

    try {
      const response = await api.patch(
        `/bookings/${rescheduleEvent._id}/reschedule`,
        {
          eventDate: rescheduleForm.eventDate,

          startTime: rescheduleForm.startTime,

          endTime: rescheduleForm.endTime,
        },
      );

      setSuccess(
        response.data?.message || "Event schedule updated successfully.",
      );

      setRescheduleEvent(null);

      setSelectedEvent(null);

      setHoveredDate(null);

      await loadEvents();
    } catch (err) {
      console.error("Calendar reschedule error:", err);

      setRescheduleError(
        err.response?.data?.message || "Unable to reschedule event.",
      );
    } finally {
      setRescheduling(false);
    }
  };

  /* ===================================================
     OPEN CANCEL SCHEDULE
  =================================================== */

  const openCancel = (event) => {
    setCancelEvent(event);

    setCancelReason("");

    setCancelError("");

    setSuccess("");
  };

  /* ===================================================
     CANCEL SCHEDULE
  =================================================== */

  const cancelSchedule = async () => {
    if (!cancelEvent) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      setCancelError("Please enter a cancellation reason.");

      return;
    }

    setCancelling(true);

    setCancelError("");

    try {
      const response = await api.patch(`/bookings/${cancelEvent._id}/status`, {
        status: "cancelled",

        adminRemarks: reason,
      });

      setSuccess(
        response.data?.message || "Event schedule cancelled successfully.",
      );

      setCancelEvent(null);

      setCancelReason("");

      setSelectedEvent(null);

      setHoveredDate(null);

      await loadEvents();
    } catch (err) {
      console.error("Calendar cancellation error:", err);

      setCancelError(
        err.response?.data?.message || "Unable to cancel event schedule.",
      );
    } finally {
      setCancelling(false);
    }
  };

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <>
      <section
        className="
          overflow-visible

          rounded-[20px]

          border
          border-gray-100

          bg-white

          shadow-[0_4px_18px_rgba(15,23,42,0.06)]
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            flex-col
            gap-4

            border-b
            border-gray-200

            px-5
            py-4

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[0.17em]

                text-yellow-600
              "
            >
              Calendar
            </p>

            <h2
              className="
                mt-1

                text-[18px]
                font-black
                text-blue-950
              "
            >
              Event Calendar
            </h2>

            <p
              className="
                mt-1

                text-[9px]
                text-gray-500
              "
            >
              Hover a date to view scheduled events. Click an organization to
              view or manage its event.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={previousMonth}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center

                rounded-lg

                bg-gray-100

                text-blue-950

                transition

                hover:bg-gray-200
              "
            >
              <MaterialIcon name="chevron_left" className="text-[18px]" />
            </button>

            <button
              type="button"
              onClick={goToday}
              className="
                h-9

                rounded-lg

                bg-blue-950

                px-4

                text-[10px]
                font-black
                text-white

                transition

                hover:bg-blue-900
              "
            >
              Today
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center

                rounded-lg

                bg-gray-100

                text-blue-950

                transition

                hover:bg-gray-200
              "
            >
              <MaterialIcon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div
          className="
            p-5
          "
        >
          {/* MONTH / LEGEND */}

          <div
            className="
              mb-4

              flex
              flex-col
              gap-3

              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <h3
              className="
                text-[14px]
                font-black
                text-blue-950
              "
            >
              {monthTitle}
            </h3>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-4

                text-[8px]
                font-bold
                text-gray-500
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-1.5
                "
              >
                <span
                  className="
                    h-2.5
                    w-2.5
                    rounded-full

                    bg-yellow-400
                  "
                />
                Organization Color
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-1.5
                "
              >
                <span
                  className="
                    h-2.5
                    w-2.5
                    rounded-full

                    bg-slate-400
                  "
                />
                Finished Event
              </div>
            </div>
          </div>

          {/* SUCCESS */}

          {success && (
            <div
              className="
                mb-4

                flex
                items-center
                justify-between
                gap-3

                rounded-xl

                border
                border-green-200

                bg-green-50

                px-4
                py-3

                text-[10px]
                font-bold
                text-green-700
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <MaterialIcon name="check_circle" className="text-[16px]" />

                {success}
              </div>

              <button type="button" onClick={() => setSuccess("")}>
                <MaterialIcon name="close" className="text-[15px]" />
              </button>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div
              className="
                mb-4

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
              {error}
            </div>
          )}

          {/* =================================================
              CALENDAR
          ================================================= */}

          <div
            className="
              relative

              overflow-visible

              rounded-2xl

              border
              border-gray-200
            "
          >
            {/* ===============================================
                WEEK HEADER
            =============================================== */}

            <div
              className="
                grid
                grid-cols-7

                overflow-hidden

                rounded-t-2xl

                bg-[#1E3476]
              "
            >
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div
                  key={day}
                  className="
                      py-3

                      text-center

                      text-[8px]
                      font-black
                      text-white
                    "
                >
                  {day}
                </div>
              ))}
            </div>

            {/* ===============================================
                CALENDAR GRID
            =============================================== */}

            {loading ? (
              <div
                className="
                  flex
                  h-[430px]
                  items-center
                  justify-center

                  text-[11px]
                  font-bold
                  text-gray-400
                "
              >
                Loading calendar...
              </div>
            ) : (
              <div
                className="
                  grid
                  grid-cols-7
                "
              >
                {calendarDays.map((calendarDay) => {
                  const dayEvents = eventsByDate[calendarDay.key] || [];

                  const isToday = calendarDay.key === dateKey(new Date());

                  return (
                    <div
                      key={calendarDay.key}
                      onMouseEnter={() => setHoveredDate(calendarDay.key)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`
                          relative

                          min-h-[118px]

                          border-b
                          border-r
                          border-gray-200

                          p-2

                          ${
                            calendarDay.currentMonth
                              ? "bg-white"
                              : "bg-gray-50/80"
                          }
                        `}
                    >
                      {/* =================================
                            DATE
                        ================================== */}

                      <div
                        className="
                            flex
                            items-center
                            justify-between
                          "
                      >
                        <span
                          className={`
                              flex
                              h-6
                              w-6
                              items-center
                              justify-center

                              rounded-full

                              text-[8px]
                              font-black

                              ${
                                isToday
                                  ? `
                                    bg-yellow-400
                                    text-blue-950
                                  `
                                  : calendarDay.currentMonth
                                    ? `
                                      text-blue-950
                                    `
                                    : `
                                      text-gray-300
                                    `
                              }
                            `}
                        >
                          {calendarDay.date.getDate()}
                        </span>

                        {dayEvents.length > 0 && (
                          <span
                            className="
                                flex
                                h-5
                                min-w-5
                                items-center
                                justify-center

                                rounded-full

                                bg-blue-100

                                px-1.5

                                text-[7px]
                                font-black
                                text-blue-700
                              "
                          >
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* =================================
                            EVENT LABELS

                            IMPORTANT CHANGE:
                            NO TIME.
                            ONLY ORGANIZATION NAME.
                        ================================== */}

                      <div
                        className="
                            mt-2
                            space-y-1.5
                          "
                      >
                        {dayEvents.slice(0, 3).map((event) => {
                          const finished = isFinished(event);

                          return (
                            <button
                              key={event._id}
                              type="button"
                              title={`${getOrganizationName(
                                event,
                              )} — ${event.eventName}`}
                              onClick={() => setSelectedEvent(event)}
                              className="
                                      group

                                      flex
                                      w-full
                                      items-center
                                      gap-1.5

                                      overflow-hidden

                                      rounded-lg

                                      px-2
                                      py-2

                                      text-left

                                      shadow-sm

                                      transition-all
                                      duration-200

                                      hover:-translate-y-[1px]
                                      hover:shadow-md
                                    "
                              style={{
                                backgroundColor: finished
                                  ? "#94A3B8"
                                  : getOrganizationColor(event),

                                color: finished ? "#FFFFFF" : "#0F172A",
                              }}
                            >
                              <span
                                className="
                                        h-1.5
                                        w-1.5
                                        shrink-0

                                        rounded-full

                                        bg-current

                                        opacity-70
                                      "
                              />

                              <span
                                className="
                                        block
                                        min-w-0
                                        flex-1
                                        truncate

                                        text-[9px]
                                        font-black
                                      "
                              >
                                {getOrganizationName(event)}
                              </span>
                            </button>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <p
                            className="
                                px-1

                                text-[8px]
                                font-black
                                text-blue-600
                              "
                          >
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>

                      {/* =================================
                            HOVER DETAILS
                        ================================== */}

                      {hoveredDate === calendarDay.key &&
                        dayEvents.length > 0 && (
                          <div
                            className="
                                absolute
                                left-1/2
                                top-[96px]
                                z-[500]

                                w-[290px]

                                -translate-x-1/2

                                overflow-hidden

                                rounded-2xl

                                border
                                border-gray-200

                                bg-white

                                shadow-[0_18px_50px_rgba(15,23,42,0.22)]
                              "
                          >
                            <div
                              className="
                                  bg-blue-950

                                  px-4
                                  py-3

                                  text-white
                                "
                            >
                              <p
                                className="
                                    text-[8px]
                                    font-black
                                    uppercase
                                    tracking-widest
                                    text-yellow-400
                                  "
                              >
                                Event Schedule
                              </p>

                              <p
                                className="
                                    mt-1

                                    text-[11px]
                                    font-black
                                  "
                              >
                                {formatDate(calendarDay.key)}
                              </p>
                            </div>

                            <div
                              className="
                                  max-h-[270px]

                                  space-y-2

                                  overflow-y-auto

                                  p-3
                                "
                            >
                              {dayEvents.map((event) => {
                                const finished = isFinished(event);

                                return (
                                  <button
                                    key={event._id}
                                    type="button"
                                    onClick={() => setSelectedEvent(event)}
                                    className="
                                          w-full

                                          rounded-xl

                                          border
                                          border-gray-100

                                          bg-gray-50

                                          p-3

                                          text-left

                                          transition

                                          hover:border-blue-200
                                          hover:bg-blue-50
                                        "
                                  >
                                    <div
                                      className="
                                            flex
                                            items-start
                                            gap-3
                                          "
                                    >
                                      <span
                                        className="
                                              mt-1

                                              h-3
                                              w-3

                                              shrink-0

                                              rounded-full
                                            "
                                        style={{
                                          backgroundColor: finished
                                            ? "#94A3B8"
                                            : getOrganizationColor(event),
                                        }}
                                      />

                                      <div
                                        className="
                                              min-w-0
                                              flex-1
                                            "
                                      >
                                        {/* ORG FIRST */}

                                        <p
                                          className="
                                                truncate

                                                text-[10px]
                                                font-black
                                                text-blue-950
                                              "
                                        >
                                          {getOrganizationName(event)}

                                          {getOrganizationAcronym(event)
                                            ? ` (${getOrganizationAcronym(
                                                event,
                                              )})`
                                            : ""}
                                        </p>

                                        {/* EVENT NAME */}

                                        <p
                                          className="
                                                mt-1

                                                truncate

                                                text-[9px]
                                                font-bold
                                                text-gray-600
                                              "
                                        >
                                          {event.eventName}
                                        </p>

                                        {/* TIME IS ONLY INSIDE HOVER DETAILS */}

                                        <div
                                          className="
                                                mt-2

                                                flex
                                                flex-wrap
                                                gap-x-3
                                                gap-y-1

                                                text-[8px]
                                                text-gray-500
                                              "
                                        >
                                          <span
                                            className="
                                                  flex
                                                  items-center
                                                  gap-1
                                                "
                                          >
                                            <MaterialIcon
                                              name="schedule"
                                              className="text-[12px]"
                                            />

                                            {formatTime(event.startTime)}

                                            {" - "}

                                            {formatTime(event.endTime)}
                                          </span>

                                          <span
                                            className="
                                                  flex
                                                  items-center
                                                  gap-1
                                                "
                                          >
                                            <MaterialIcon
                                              name="location_on"
                                              className="text-[12px]"
                                            />

                                            {event.venue || "No venue"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =================================================
          EVENT DETAILS MODAL
      ================================================= */}

      {selectedEvent && (
        <div
          className="
            fixed
            inset-0
            z-[3000]

            flex
            items-center
            justify-center

            bg-black/70

            p-4

            backdrop-blur-sm
          "
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            onClick={(event) => event.stopPropagation()}
            className="
              w-full
              max-w-[500px]

              overflow-hidden

              rounded-3xl

              border-t-4
              border-yellow-400

              bg-white

              shadow-2xl
            "
          >
            <div
              className="
                p-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[0.16em]

                      text-yellow-600
                    "
                  >
                    Event Details
                  </p>

                  <h2
                    className="
                      mt-2

                      text-[20px]
                      font-black
                      text-blue-950
                    "
                  >
                    {selectedEvent.eventName}
                  </h2>

                  <div
                    className="
                      mt-2

                      flex
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        h-2.5
                        w-2.5
                        rounded-full
                      "
                      style={{
                        backgroundColor: getOrganizationColor(selectedEvent),
                      }}
                    />

                    <p
                      className="
                        text-[9px]
                        font-black
                        text-blue-700
                      "
                    >
                      {getOrganizationName(selectedEvent)}

                      {getOrganizationAcronym(selectedEvent)
                        ? ` - ${getOrganizationAcronym(selectedEvent)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center

                    rounded-full

                    bg-gray-100

                    text-gray-500

                    transition

                    hover:bg-gray-200
                  "
                >
                  <MaterialIcon name="close" className="text-[17px]" />
                </button>
              </div>

              {/* DETAILS */}

              <div
                className="
                  mt-5

                  grid
                  gap-4

                  rounded-2xl

                  bg-gray-100

                  p-4

                  sm:grid-cols-2
                "
              >
                <Detail
                  label="Date"
                  value={formatDate(selectedEvent.eventDate)}
                />

                <Detail
                  label="Time"
                  value={`${formatTime(selectedEvent.startTime)} - ${formatTime(
                    selectedEvent.endTime,
                  )}`}
                />

                <Detail label="Venue" value={selectedEvent.venue} />

                <Detail
                  label="Participants"
                  value={selectedEvent.participants || "0"}
                />
              </div>

              {/* STATUS */}

              <div
                className="
                  mt-4

                  flex
                  items-center
                  gap-2

                  text-[10px]
                  font-black
                  text-green-700
                "
              >
                <MaterialIcon name="event_available" className="text-[18px]" />
                Approved Event
              </div>

              {/* ACTIONS */}

              <div
                className="
                  mt-5

                  grid
                  gap-3

                  sm:grid-cols-2
                "
              >
                <button
                  type="button"
                  onClick={() => openReschedule(selectedEvent)}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-blue-950

                    py-3

                    text-[10px]
                    font-black
                    text-white

                    transition

                    hover:bg-blue-900
                  "
                >
                  <MaterialIcon name="edit_calendar" className="text-[17px]" />
                  Reschedule Event
                </button>

                <button
                  type="button"
                  onClick={() => openCancel(selectedEvent)}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-red-600

                    py-3

                    text-[10px]
                    font-black
                    text-white

                    transition

                    hover:bg-red-700
                  "
                >
                  <MaterialIcon name="event_busy" className="text-[17px]" />
                  Cancel Schedule
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* =================================================
          RESCHEDULE MODAL
      ================================================= */}

      {rescheduleEvent && (
        <div
          className="
            fixed
            inset-0
            z-[4000]

            flex
            items-center
            justify-center

            bg-black/70

            p-4

            backdrop-blur-sm
          "
          onClick={() => !rescheduling && setRescheduleEvent(null)}
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            onClick={(event) => event.stopPropagation()}
            className="
              w-full
              max-w-[500px]

              overflow-hidden

              rounded-3xl

              bg-white

              shadow-2xl
            "
          >
            <div
              className="
                bg-gradient-to-r
                from-[#020617]
                via-[#001F3F]
                to-[#003B7A]

                p-5

                text-white
              "
            >
              <p
                className="
                  text-[8px]
                  font-black
                  uppercase
                  tracking-widest
                  text-yellow-400
                "
              >
                Administrator
              </p>

              <h2
                className="
                  mt-1

                  text-[20px]
                  font-black
                "
              >
                Reschedule Event
              </h2>

              <p
                className="
                  mt-1

                  text-[10px]
                  text-blue-200
                "
              >
                {rescheduleEvent.eventName}
              </p>
            </div>

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
                "
              >
                <Field
                  label="Event Date"
                  type="date"
                  value={rescheduleForm.eventDate}
                  onChange={(event) =>
                    setRescheduleForm((previous) => ({
                      ...previous,

                      eventDate: event.target.value,
                    }))
                  }
                />

                <div />

                <Field
                  label="Start Time"
                  type="time"
                  value={rescheduleForm.startTime}
                  onChange={(event) =>
                    setRescheduleForm((previous) => ({
                      ...previous,

                      startTime: event.target.value,
                    }))
                  }
                />

                <Field
                  label="End Time"
                  type="time"
                  value={rescheduleForm.endTime}
                  onChange={(event) =>
                    setRescheduleForm((previous) => ({
                      ...previous,

                      endTime: event.target.value,
                    }))
                  }
                />
              </div>

              {rescheduleError && (
                <div
                  className="
                    mt-4

                    rounded-xl

                    border
                    border-red-200

                    bg-red-50

                    p-3

                    text-[10px]
                    font-bold
                    text-red-700
                  "
                >
                  {rescheduleError}
                </div>
              )}

              <div
                className="
                  mt-5

                  grid
                  grid-cols-2
                  gap-3
                "
              >
                <button
                  type="button"
                  disabled={rescheduling}
                  onClick={() => setRescheduleEvent(null)}
                  className="
                    rounded-xl

                    bg-gray-100

                    py-3

                    text-[10px]
                    font-black
                    text-gray-700

                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={rescheduling}
                  onClick={saveReschedule}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-blue-950

                    py-3

                    text-[10px]
                    font-black
                    text-white

                    disabled:opacity-50
                  "
                >
                  <MaterialIcon
                    name={rescheduling ? "hourglass_top" : "save"}
                  />

                  {rescheduling ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* =================================================
          CANCEL SCHEDULE MODAL
      ================================================= */}

      {cancelEvent && (
        <div
          className="
            fixed
            inset-0
            z-[5000]

            flex
            items-center
            justify-center

            bg-black/70

            p-4

            backdrop-blur-sm
          "
          onClick={() => {
            if (cancelling) {
              return;
            }

            setCancelEvent(null);

            setCancelReason("");

            setCancelError("");
          }}
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            onClick={(event) => event.stopPropagation()}
            className="
              w-full
              max-w-[480px]

              rounded-3xl

              bg-white

              p-6

              shadow-2xl
            "
          >
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center

                rounded-2xl

                bg-red-100

                text-red-600
              "
            >
              <MaterialIcon name="event_busy" className="text-[22px]" />
            </div>

            <h2
              className="
                mt-4

                text-[21px]
                font-black
                text-blue-950
              "
            >
              Cancel Schedule
            </h2>

            <p
              className="
                mt-2

                text-[10px]
                leading-5
                text-gray-600
              "
            >
              Cancel the approved schedule for{" "}
              <strong>{cancelEvent.eventName}</strong>.
            </p>

            {cancelError && (
              <div
                className="
                  mt-4

                  rounded-xl

                  border
                  border-red-200

                  bg-red-50

                  p-3

                  text-[10px]
                  font-bold
                  text-red-700
                "
              >
                {cancelError}
              </div>
            )}

            <div
              className="
                mt-4
              "
            >
              <label
                className="
                  text-[10px]
                  font-black
                  text-blue-950
                "
              >
                Cancellation Reason *
              </label>

              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows="5"
                placeholder="Enter cancellation reason..."
                className="
                  mt-2

                  w-full

                  resize-none

                  rounded-xl

                  border
                  border-gray-200

                  p-3

                  text-[10px]

                  outline-none

                  focus:border-red-400
                  focus:ring-2
                  focus:ring-red-100
                "
              />
            </div>

            <div
              className="
                mt-5

                grid
                grid-cols-2
                gap-3
              "
            >
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  setCancelEvent(null);

                  setCancelReason("");

                  setCancelError("");
                }}
                className="
                  rounded-xl

                  bg-gray-100

                  py-3

                  text-[10px]
                  font-black
                  text-gray-700
                "
              >
                Keep Schedule
              </button>

              <button
                type="button"
                disabled={cancelling}
                onClick={cancelSchedule}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-red-600

                  py-3

                  text-[10px]
                  font-black
                  text-white

                  hover:bg-red-700

                  disabled:opacity-50
                "
              >
                <MaterialIcon
                  name={cancelling ? "hourglass_top" : "event_busy"}
                />

                {cancelling ? "Cancelling..." : "Cancel Schedule"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

/* =====================================================
   DETAIL
===================================================== */

function Detail({ label, value }) {
  return (
    <div>
      <p
        className="
          text-[7px]
          font-black
          uppercase
          tracking-wide
          text-gray-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1

          text-[9px]
          font-black
          text-blue-950
        "
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* =====================================================
   FIELD
===================================================== */

function Field({ label, ...props }) {
  return (
    <div>
      <label
        className="
          text-[9px]
          font-black
          text-blue-950
        "
      >
        {label}
      </label>

      <input
        {...props}
        className="
          mt-1.5

          h-10
          w-full

          rounded-xl

          border
          border-gray-200

          px-3

          text-[10px]

          outline-none

          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      />
    </div>
  );
}
