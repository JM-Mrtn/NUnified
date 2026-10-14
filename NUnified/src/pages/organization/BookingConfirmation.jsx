import { useLocation, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

function getReference(booking) {
  if (booking.reference) {
    return booking.reference;
  }

  if (booking._id) {
    return `NU-${String(booking._id).slice(-6).toUpperCase()}`;
  }

  return "Pending";
}

export default function BookingConfirmation() {
  const location = useLocation();

  const navigate = useNavigate();

  const booking = location.state || {};

  const bookingReference = getReference(booking);

  return (
    <div className="space-y-8">
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
          p-10
          text-center
          text-white
        "
      >
        <div
          className="
            mx-auto
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-full
            bg-yellow-400
          "
        >
          <span
            className="
              material-symbols-rounded
              text-5xl
              text-blue-950
            "
          >
            check
          </span>
        </div>

        <h1
          className="
            mt-6
            text-4xl
            font-black
          "
        >
          Booking Submitted!
        </h1>

        <p
          className="
            mt-3
            text-gray-200
          "
        >
          Your venue reservation request has been submitted for administrator
          approval.
        </p>
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        className="
          rounded-3xl
          bg-white
          p-8
          shadow-lg
        "
      >
        <h2
          className="
            text-2xl
            font-black
            text-blue-950
          "
        >
          Booking Details
        </h2>

        <div
          className="
            mt-6
            grid
            gap-5
            md:grid-cols-2
          "
        >
          <InfoCard label="Booking Reference" value={bookingReference} />

          <InfoCard label="Status" value="Pending Approval" status />

          <InfoCard label="Event Name" value={booking.eventName} />

          <InfoCard label="Event Type" value={booking.eventType} />

          <InfoCard label="Venue" value={booking.venue} />

          <InfoCard label="Event Date" value={booking.eventDate} />

          <InfoCard
            label="Time"
            value={`${booking.startTime || ""} - ${booking.endTime || ""}`}
          />

          <InfoCard label="Participants" value={booking.participants} />
        </div>

        {booking.request && (
          <div
            className="
              mt-5
              rounded-2xl
              bg-gray-100
              p-4
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
              Special Request
            </p>

            <p
              className="
                mt-2
                text-blue-950
              "
            >
              {booking.request}
            </p>
          </div>
        )}

        <div
          className="
            mt-8
            flex
            flex-col
            gap-4
            md:flex-row
          "
        >
          <button
            onClick={() => navigate("/organization/status")}
            className="
              flex-1
              rounded-xl
              bg-blue-950
              py-3
              font-bold
              text-white
            "
          >
            View Booking Status
          </button>

          <button
            onClick={() => navigate("/organization/dashboard")}
            className="
              flex-1
              rounded-xl
              bg-gradient-to-r
              from-yellow-300
              to-yellow-500
              py-3
              font-black
              text-blue-950
            "
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoCard({ label, value, status = false }) {
  return (
    <div
      className="
        rounded-2xl
        bg-gray-100
        p-4
      "
    >
      <p
        className="
          text-xs
          font-bold
          uppercase
          tracking-wide
          text-gray-500
        "
      >
        {label}
      </p>

      {status ? (
        <span
          className="
            mt-2
            inline-block
            rounded-full
            bg-yellow-100
            px-4
            py-2
            text-sm
            font-bold
            text-yellow-700
          "
        >
          {value}
        </span>
      ) : (
        <p
          className="
            mt-2
            font-semibold
            text-blue-950
          "
        >
          {value || "Not Provided"}
        </p>
      )}
    </div>
  );
}
