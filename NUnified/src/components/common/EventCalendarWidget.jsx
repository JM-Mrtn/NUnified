import { useMemo, useState } from "react";

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
   EVENT DATE
===================================================== */

function getEventDate(event) {
  return (
    event?.eventDate ||
    event?.date ||
    event?.start ||
    event?.extendedProps?.eventDate ||
    ""
  );
}

/* =====================================================
   ORGANIZATION
===================================================== */

function getOrganizationName(event) {
  const organization =
    event?.organization || event?.extendedProps?.organization;

  /* OBJECT */

  if (organization && typeof organization === "object") {
    return (
      organization.organizationName ||
      organization.name ||
      organization.acronym ||
      "Organization"
    );
  }

  /* STRING */

  if (typeof organization === "string" && organization.trim()) {
    return organization.trim();
  }

  return (
    event?.organizationName ||
    event?.organizationAcronym ||
    event?.extendedProps?.organizationName ||
    event?.extendedProps?.organizationAcronym ||
    "Organization"
  );
}

/* =====================================================
   ORGANIZATION ACRONYM
===================================================== */

function getOrganizationAcronym(event) {
  const organization =
    event?.organization || event?.extendedProps?.organization;

  if (organization && typeof organization === "object") {
    return organization.acronym || "";
  }

  return (
    event?.organizationAcronym ||
    event?.extendedProps?.organizationAcronym ||
    ""
  );
}

/* =====================================================
   ORGANIZATION COLOR
===================================================== */

function getOrganizationColor(event) {
  const organization =
    event?.organization || event?.extendedProps?.organization;

  if (organization && typeof organization === "object") {
    return organization.color || "#FACC15";
  }

  return (
    event?.color ||
    event?.organizationColor ||
    event?.extendedProps?.organizationColor ||
    "#FACC15"
  );
}

/* =====================================================
   VENUE
===================================================== */

function getVenue(event) {
  return event?.venue || event?.extendedProps?.venue || "Not specified";
}

/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(value) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();

  /*
    Already formatted:
    8:00 AM
    5:00 PM
  */

  if (/AM|PM/i.test(text)) {
    return text;
  }

  const parts = text.split(":");

  const hour = Number(parts[0]);

  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) {
    return text;
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
   TIME RANGE

   Supports:

   startTime + endTime

   OR:

   extendedProps.time
   "8:00 AM - 5:00 PM"
===================================================== */

function getTimeRange(event) {
  const startTime = event?.startTime || event?.extendedProps?.startTime || "";

  const endTime = event?.endTime || event?.extendedProps?.endTime || "";

  if (startTime && endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  const existingTime = event?.time || event?.extendedProps?.time || "";

  if (existingTime) {
    return existingTime;
  }

  if (startTime) {
    return formatTime(startTime);
  }

  return "Not specified";
}

/* =====================================================
   STATUS
===================================================== */

function getStatus(event) {
  return String(event?.status || event?.extendedProps?.status || "")
    .trim()
    .toLowerCase();
}

/* =====================================================
   SHOW IN GENERAL CALENDAR

   Only approved / confirmed schedules should normally
   appear.

   No status is also accepted for compatibility with
   your existing calendar data.
===================================================== */

function canShowEvent(event) {
  const status = getStatus(event);

  if (!status) {
    return true;
  }

  return status === "approved" || status === "confirmed";
}

/* =====================================================
   BUILD CALENDAR DAYS
===================================================== */

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);

  const startDate = new Date(year, month, 1 - firstDay.getDay());

  return Array.from(
    {
      length: 42,
    },

    (_, index) => {
      const date = new Date(startDate);

      date.setDate(startDate.getDate() + index);

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
   EVENT CALENDAR
===================================================== */

export default function EventCalendarWidget({ events = [] }) {
  const now = new Date();

  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  /*
    We store a unique event key here instead of
    hovered date.

    This makes the popup appear when hovering the
    organization pill itself.
  */

  const [hoveredEvent, setHoveredEvent] = useState(null);

  /* ===================================================
     FILTER
  =================================================== */

  const visibleEvents = useMemo(
    () => (Array.isArray(events) ? events.filter(canShowEvent) : []),
    [events],
  );

  /* ===================================================
     GROUP EVENTS BY DATE
  =================================================== */

  const eventsByDate = useMemo(() => {
    const map = {};

    visibleEvents.forEach((event) => {
      const key = dateKey(getEventDate(event));

      if (!key) {
        return;
      }

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(event);
    });

    /*
          Earliest reservation first.
        */

    Object.values(map).forEach((items) => {
      items.sort((first, second) =>
        getTimeRange(first).localeCompare(getTimeRange(second)),
      );
    });

    return map;
  }, [visibleEvents]);

  /* ===================================================
     CALENDAR
  =================================================== */

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  /* ===================================================
     MONTH
  =================================================== */

  const monthTitle = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  /* ===================================================
     PREVIOUS
  =================================================== */

  const previousMonth = () => {
    setHoveredEvent(null);

    setViewDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() - 1, 1),
    );
  };

  /* ===================================================
     NEXT
  =================================================== */

  const nextMonth = () => {
    setHoveredEvent(null);

    setViewDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + 1, 1),
    );
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section
      className="
        relative

        overflow-visible

        rounded-[20px]

        bg-white

        p-5

        shadow-sm
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        {/* PREVIOUS */}

        <button
          type="button"
          onClick={previousMonth}
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center

            rounded-lg

            bg-gray-100

            text-blue-950

            transition

            hover:bg-gray-200
          "
        >
          <MaterialIcon
            name="arrow_back"
            className="
              text-[14px]
            "
          />
        </button>

        {/* TITLE */}

        <div
          className="
            text-center
          "
        >
          <h2
            className="
              text-[16px]
              font-black
              text-blue-950
            "
          >
            {monthTitle}
          </h2>

          <p
            className="
              mt-0.5

              text-[8px]
              text-gray-500
            "
          >
            Venue reservation calendar
          </p>
        </div>

        {/* NEXT */}

        <button
          type="button"
          onClick={nextMonth}
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center

            rounded-lg

            bg-gray-100

            text-blue-950

            transition

            hover:bg-gray-200
          "
        >
          <MaterialIcon
            name="arrow_forward"
            className="
              text-[14px]
            "
          />
        </button>
      </div>

      {/* =================================================
          DAYS HEADER
      ================================================= */}

      <div
        className="
          mt-5

          grid
          grid-cols-7

          gap-1
        "
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="
                pb-2

                text-center

                text-[8px]
                font-black
                text-gray-400
              "
          >
            {day}
          </div>
        ))}

        {/* =================================================
            CALENDAR DAYS
        ================================================= */}

        {calendarDays.map((calendarDay) => {
          const dayEvents = eventsByDate[calendarDay.key] || [];

          return (
            <div
              key={calendarDay.key}
              className={`
                  relative

                  min-h-[68px]

                  rounded-lg

                  border
                  border-gray-100

                  p-2

                  ${calendarDay.currentMonth ? "bg-white" : "bg-gray-50/60"}
                `}
            >
              {/* DATE */}

              <span
                className={`
                    text-[8px]
                    font-black

                    ${
                      calendarDay.currentMonth
                        ? "text-blue-950"
                        : "text-gray-300"
                    }
                  `}
              >
                {calendarDay.date.getDate()}
              </span>

              {/* =========================================
                    ORGANIZATION PILLS
                ========================================= */}

              <div
                className="
                    mt-2

                    space-y-1
                  "
              >
                {dayEvents.slice(0, 2).map((event, index) => {
                  const organizationName = getOrganizationName(event);

                  const organizationColor = getOrganizationColor(event);

                  const eventKey =
                    event?._id || event?.id || `${calendarDay.key}-${index}`;

                  const isHovered = hoveredEvent === eventKey;

                  return (
                    <div
                      key={eventKey}
                      className="
                              relative
                            "
                      onMouseEnter={() => setHoveredEvent(eventKey)}
                      onMouseLeave={() => setHoveredEvent(null)}
                    >
                      {/* =============================
                                ORGANIZATION NAME PILL

                                This stays exactly like the
                                calendar in your screenshot.
                            ============================= */}

                      <div
                        className="
                                w-full

                                cursor-default

                                truncate

                                rounded-md

                                px-1.5
                                py-1

                                text-left

                                text-[6px]
                                font-black

                                shadow-sm

                                transition

                                hover:brightness-95
                              "
                        style={{
                          backgroundColor: organizationColor,

                          color: "#0F172A",
                        }}
                      >
                        {organizationName}
                      </div>

                      {/* =============================
                                HOVER POPUP

                                ONLY:
                                - Organization
                                - Time
                                - Venue
                            ============================= */}

                      {isHovered && (
                        <div
                          className="
                                  absolute

                                  bottom-[calc(100%+8px)]
                                  left-1/2

                                  z-[9999]

                                  w-[220px]

                                  -translate-x-1/2

                                  overflow-hidden

                                  rounded-xl

                                  border
                                  border-gray-200

                                  bg-white

                                  shadow-[0_15px_40px_rgba(15,23,42,0.25)]
                                "
                        >
                          {/* TOP COLOR */}

                          <div
                            className="
                                    h-1.5
                                    w-full
                                  "
                            style={{
                              backgroundColor: organizationColor,
                            }}
                          />

                          <div
                            className="
                                    p-3
                                  "
                          >
                            {/* =======================
                                      ORGANIZATION
                                  ======================= */}

                            <HoverDetail
                              icon="groups"
                              label="Organization"
                              value={organizationName}
                            />

                            {/* =======================
                                      TIME
                                  ======================= */}

                            <HoverDetail
                              icon="schedule"
                              label="Time"
                              value={getTimeRange(event)}
                            />

                            {/* =======================
                                      VENUE
                                  ======================= */}

                            <HoverDetail
                              icon="location_on"
                              label="Venue"
                              value={getVenue(event)}
                              last
                            />
                          </div>

                          {/* CONFIDENTIAL */}

                          <div
                            className="
                                    flex
                                    items-center
                                    gap-1.5

                                    border-t
                                    border-gray-100

                                    bg-gray-50

                                    px-3
                                    py-2
                                  "
                          >
                            <MaterialIcon
                              name="lock"
                              className="
                                      text-[11px]
                                      text-gray-400
                                    "
                            />

                            <span
                              className="
                                      text-[6px]
                                      text-gray-400
                                    "
                            >
                              Other booking details are confidential.
                            </span>
                          </div>

                          {/* TOOLTIP ARROW */}

                          <div
                            className="
                                    absolute

                                    -bottom-1.5
                                    left-1/2

                                    h-3
                                    w-3

                                    -translate-x-1/2
                                    rotate-45

                                    border-b
                                    border-r
                                    border-gray-200

                                    bg-white
                                  "
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* MORE */}

                {dayEvents.length > 2 && (
                  <p
                    className="
                        px-1

                        text-[6px]
                        font-black
                        text-gray-400
                      "
                  >
                    +{dayEvents.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================
          PRIVACY INFORMATION
      ================================================= */}

      <div
        className="
          mt-5

          flex
          items-start
          gap-1.5
        "
      >
        <MaterialIcon
          name="lock"
          className="
            mt-[1px]

            text-[10px]
            text-gray-400
          "
        />

        <p
          className="
            text-[7px]
            leading-3
            text-gray-400
          "
        >
          Hover over an organization to view the organization, reserved time,
          and venue. Other event and booking details remain confidential between
          the administrator and the booking organization.
        </p>
      </div>
    </section>
  );
}

/* =====================================================
   HOVER DETAIL
===================================================== */

function HoverDetail({ icon, label, value, last = false }) {
  return (
    <div
      className={`
        flex
        items-start
        gap-2.5

        ${last ? "" : "mb-3"}
      `}
    >
      {/* ICON */}

      <div
        className="
          flex
          h-7
          w-7
          shrink-0
          items-center
          justify-center

          rounded-lg

          bg-blue-50

          text-blue-700
        "
      >
        <MaterialIcon
          name={icon}
          className="
            text-[14px]
          "
        />
      </div>

      {/* DETAILS */}

      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            text-[6px]
            font-black
            uppercase
            tracking-[0.08em]
            text-gray-400
          "
        >
          {label}
        </p>

        <p
          className="
            mt-0.5

            break-words

            text-[9px]
            font-black
            text-blue-950
          "
        >
          {value}
        </p>
      </div>
    </div>
  );
}
