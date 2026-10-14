import { useMemo, useState } from "react";

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).slice(0, 10);

  const [year, month, day] = raw.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function createDateValue(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

export default function VenueBookingCalendar({
  bookings = [],
  selectedDate = "",
  onSelectDate,
}) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = currentMonth.getFullYear();

  const month = currentMonth.getMonth();

  const normalizedBookings = useMemo(() => {
    if (!Array.isArray(bookings)) {
      return [];
    }

    return bookings
      .filter(Boolean)
      .map((booking) => ({
        ...booking,

        parsedDate: parseDate(booking.eventDate),
      }))
      .filter((booking) => booking.parsedDate);
  }, [bookings]);

  const firstDay = new Date(year, month, 1).getDay();

  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    cells.push(day);
  }

  const getBookingsForDay = (day) =>
    normalizedBookings.filter(
      (booking) =>
        booking.parsedDate.getFullYear() === year &&
        booking.parsedDate.getMonth() === month &&
        booking.parsedDate.getDate() === day,
    );

  const isPast = (day) => {
    const date = new Date(year, month, day);

    date.setHours(23, 59, 59, 999);

    return date < today;
  };

  return (
    <div
      className="
        rounded-3xl
        border
        border-gray-200
        bg-white
        p-5
      "
    >
      {/* MONTH HEADER */}

      <div
        className="
          flex
          items-center
          justify-between
        "
      >
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            hover:bg-gray-100
          "
        >
          <MaterialIcon name="chevron_left" />
        </button>

        <h3
          className="
            text-lg
            font-black
            text-blue-950
          "
        >
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",

            year: "numeric",
          })}
        </h3>

        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            hover:bg-gray-100
          "
        >
          <MaterialIcon name="chevron_right" />
        </button>
      </div>

      {/* CALENDAR */}

      <div
        className="
          mt-5
          grid
          grid-cols-7
          gap-1
        "
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
          <div
            key={index}
            className="
                py-2
                text-center
                text-xs
                font-bold
                text-gray-400
              "
          >
            {weekday}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-20" />;
          }

          const dayBookings = getBookingsForDay(day);

          const value = createDateValue(year, month, day);

          const selected = selectedDate === value;

          const past = isPast(day);

          return (
            <button
              key={day}
              type="button"
              disabled={past}
              onClick={() => onSelectDate(value)}
              className={`
                  relative
                  flex
                  min-h-20
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  p-1
                  transition

                  ${
                    selected
                      ? `
                        border-blue-950
                        bg-blue-950
                        text-white
                      `
                      : `
                        border-transparent
                        bg-white
                        text-blue-950
                        hover:bg-yellow-50
                      `
                  }

                  ${
                    past
                      ? `
                        cursor-not-allowed
                        opacity-30
                      `
                      : ""
                  }
                `}
            >
              <span
                className="
                    font-bold
                  "
              >
                {day}
              </span>

              {/* ORGANIZATIONS ONLY */}

              {dayBookings.length > 0 && (
                <div
                  className="
                      mt-1
                      flex
                      max-w-full
                      flex-col
                      items-center
                      gap-1
                    "
                >
                  {dayBookings.slice(0, 2).map((booking) => {
                    const org = booking.organization || {};

                    const label = org.acronym || org.organizationName || "ORG";

                    return (
                      <span
                        key={booking._id}
                        className="
                                max-w-[58px]
                                truncate
                                rounded-full
                                px-2
                                py-0.5
                                text-[8px]
                                font-black
                                text-white
                              "
                        style={{
                          backgroundColor: org.color || "#FACC15",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}

                  {dayBookings.length > 2 && (
                    <span
                      className="
                          text-[8px]
                          font-bold
                          text-gray-400
                        "
                    >
                      +{dayBookings.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* PRIVACY MESSAGE */}

      <div
        className="
          mt-5
          rounded-xl
          bg-blue-50
          p-4
        "
      >
        <div
          className="
            flex
            gap-3
          "
        >
          <MaterialIcon name="lock" />

          <div>
            <p
              className="
                text-sm
                font-black
                text-blue-950
              "
            >
              Private Schedules
            </p>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-gray-600
              "
            >
              Existing reservations show only the organization name. Event
              details and booking times are private.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
