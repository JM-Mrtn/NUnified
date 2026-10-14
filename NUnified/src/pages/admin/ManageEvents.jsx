import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   ICON
===================================================== */

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
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

function displayStatus(status) {
  const value = normalizeStatus(status);

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const raw = String(value).slice(0, 10);

  const [year, month, day] = raw.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

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
   PAGE
===================================================== */

export default function ManageEvents() {
  const [events, setEvents] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [decision, setDecision] = useState(null);

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     DOCUMENT
  =================================================== */

  const [openingDocument, setOpeningDocument] = useState("");

  const [documentPreview, setDocumentPreview] = useState(null);

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
     LOAD
  =================================================== */

  const loadEvents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bookings");

      setEvents(getBookings(response.data));
    } catch (err) {
      console.error("Load bookings error:", err);

      setError(err.response?.data?.message || "Unable to load event bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* ===================================================
     COUNTS
  =================================================== */

  const counts = useMemo(
    () => ({
      all: events.length,

      pending: events.filter(
        (event) => normalizeStatus(event.status) === "pending",
      ).length,

      approved: events.filter(
        (event) => normalizeStatus(event.status) === "approved",
      ).length,

      rejected: events.filter(
        (event) => normalizeStatus(event.status) === "rejected",
      ).length,

      cancelled: events.filter(
        (event) => normalizeStatus(event.status) === "cancelled",
      ).length,
    }),
    [events],
  );

  /* ===================================================
     FILTERED EVENTS
  =================================================== */

  const filteredEvents = useMemo(() => {
    const value = search.trim().toLowerCase();

    return events.filter((event) => {
      const organization = event.organization?.organizationName || "";

      const matchesSearch =
        !value ||
        String(event.eventName || "")
          .toLowerCase()
          .includes(value) ||
        String(organization).toLowerCase().includes(value) ||
        String(event.venue || "")
          .toLowerCase()
          .includes(value);

      const matchesStatus =
        statusFilter === "all" ||
        normalizeStatus(event.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

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
      icon: "pending_actions",
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

  const statistics = [
    {
      label: "Total",
      value: counts.all,
      icon: "event",
    },

    {
      label: "Pending",
      value: counts.pending,
      icon: "pending_actions",
    },

    {
      label: "Approved",
      value: counts.approved,
      icon: "check_circle",
    },

    {
      label: "Cancelled",
      value: counts.cancelled,
      icon: "event_busy",
    },
  ];

  /* ===================================================
     OPEN RESCHEDULE
  =================================================== */

  const openReschedule = (event) => {
    const status = normalizeStatus(event.status);

    if (!["pending", "approved"].includes(status)) {
      return;
    }

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
        response.data?.message || "Booking schedule updated successfully.",
      );

      setRescheduleEvent(null);

      setSelectedEvent(null);

      await loadEvents();
    } catch (err) {
      console.error("Reschedule error:", err);

      setRescheduleError(
        err.response?.data?.message || "Unable to reschedule booking.",
      );
    } finally {
      setRescheduling(false);
    }
  };

  /* ===================================================
     OPEN CANCEL SCHEDULE
  =================================================== */

  const openCancelSchedule = (event) => {
    if (normalizeStatus(event?.status) !== "approved") {
      return;
    }

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

    setError("");

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

      setRescheduleEvent(null);

      await loadEvents();
    } catch (err) {
      console.error("Cancel schedule error:", err);

      setCancelError(
        err.response?.data?.message || "Unable to cancel event schedule.",
      );
    } finally {
      setCancelling(false);
    }
  };

  /* ===================================================
     APPROVE / REJECT
  =================================================== */

  const updateStatus = async () => {
    if (!decision?.event) {
      return;
    }

    try {
      await api.patch(`/bookings/${decision.event._id}/status`, {
        status: decision.status,

        adminRemarks: remarks.trim(),
      });

      setDecision(null);

      setRemarks("");

      setSelectedEvent(null);

      await loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Unable to update booking.");
    }
  };

  /* ===================================================
     DOCUMENT
  =================================================== */

  const closeDocumentPreview = () => {
    if (documentPreview?.url) {
      URL.revokeObjectURL(documentPreview.url);
    }

    setDocumentPreview(null);
  };

  const openDocument = async (bookingId, documentType, title, file) => {
    const key = `${bookingId}-${documentType}`;

    setOpeningDocument(key);

    try {
      const response = await api.get(
        `/booking-documents/${bookingId}/${documentType}`,
        {
          responseType: "blob",
        },
      );

      const blobUrl = URL.createObjectURL(response.data);

      setDocumentPreview({
        title,

        url: blobUrl,

        fileName: file?.originalName || file?.fileName || "Document.pdf",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Unable to open PDF.");
    } finally {
      setOpeningDocument("");
    }
  };

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}

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
            rounded-[20px]
            bg-gradient-to-r
            from-[#020617]
            via-[#001F3F]
            to-[#064477]
            px-6
            py-5
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
            Administrator
          </p>

          <h1
            className="
              mt-1.5
              text-[26px]
              font-black
            "
          >
            Manage Events
          </h1>

          <p
            className="
              mt-1.5
              text-[11px]
              text-blue-100
            "
          >
            Review bookings, required documents, reschedule approved events, and
            cancel schedules when necessary.
          </p>
        </motion.div>

        {/* SUCCESS */}

        {success && (
          <div
            className="
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
              text-[11px]
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
              <MaterialIcon name="check_circle" />

              {success}
            </div>

            <button type="button" onClick={() => setSuccess("")}>
              <MaterialIcon name="close" />
            </button>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            className="
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
            {error}
          </div>
        )}

        {/* STATISTICS */}

        <div
          className="
            grid
            grid-cols-2
            gap-3
            xl:grid-cols-4
          "
        >
          {statistics.map((item) => (
            <div
              key={item.label}
              className="
                  rounded-2xl
                  bg-white
                  p-4
                  shadow-sm
                "
            >
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
                <MaterialIcon name={item.icon} />
              </div>

              <p
                className="
                    mt-3
                    text-[8px]
                    font-black
                    uppercase
                    tracking-wide
                    text-gray-500
                  "
              >
                {item.label}
              </p>

              <p
                className="
                    mt-1
                    text-[22px]
                    font-black
                    text-blue-950
                  "
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* SEARCH + FILTER */}

        <div
          className="
            rounded-2xl
            bg-white
            p-4
            shadow-sm
          "
        >
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
            <MaterialIcon name="search" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event, organization, or venue..."
              className="
                h-11
                w-full
                bg-transparent
                text-[11px]
                outline-none
              "
            />
          </div>

          <div
            className="
              mt-3
              flex
              flex-wrap
              gap-2
            "
          >
            {filters.map((item) => {
              const active = statusFilter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      px-3
                      py-2
                      text-[10px]
                      font-black
                      transition

                      ${
                        active
                          ? "bg-blue-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }
                    `}
                >
                  <MaterialIcon name={item.icon} />

                  {item.label}

                  <span
                    className={`
                        rounded-full
                        px-2
                        py-0.5
                        text-[9px]

                        ${
                          active
                            ? "bg-yellow-400 text-blue-950"
                            : "bg-white text-gray-500"
                        }
                      `}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOOKINGS */}

        <div
          className="
            rounded-2xl
            bg-white
            p-4
            shadow-sm
          "
        >
          {loading ? (
            <div
              className="
                py-16
                text-center
                text-gray-500
              "
            >
              Loading bookings...
            </div>
          ) : filteredEvents.length > 0 ? (
            <div
              className="
                space-y-3
              "
            >
              {filteredEvents.map((event) => {
                const status = normalizeStatus(event.status);

                return (
                  <div
                    key={event._id}
                    className="
                        rounded-2xl
                        border
                        border-gray-200
                        p-4
                        transition
                        hover:shadow-md
                      "
                  >
                    <div
                      className="
                          flex
                          flex-col
                          gap-4
                          lg:flex-row
                          lg:items-center
                          lg:justify-between
                        "
                    >
                      <div className="min-w-0">
                        <div
                          className="
                              flex
                              flex-wrap
                              items-center
                              gap-2
                            "
                        >
                          <h3
                            className="
                                text-[15px]
                                font-black
                                text-blue-950
                              "
                          >
                            {event.eventName}
                          </h3>

                          <StatusBadge status={event.status} />
                        </div>

                        <p
                          className="
                              mt-1
                              text-[10px]
                              font-bold
                              text-blue-700
                            "
                        >
                          {event.organization?.organizationName ||
                            "Organization"}
                        </p>

                        <div
                          className="
                              mt-3
                              flex
                              flex-wrap
                              gap-x-5
                              gap-y-2
                              text-[9px]
                              text-gray-500
                            "
                        >
                          <Meta
                            icon="event"
                            text={formatDate(event.eventDate)}
                          />

                          <Meta
                            icon="schedule"
                            text={`${formatTime(
                              event.startTime,
                            )} - ${formatTime(event.endTime)}`}
                          />

                          <Meta
                            icon="location_on"
                            text={event.venue || "No venue"}
                          />
                        </div>
                      </div>

                      {/* CARD ACTIONS */}

                      <div
                        className="
                            flex
                            flex-wrap
                            gap-2
                          "
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="
                              flex
                              items-center
                              gap-2
                              rounded-xl
                              bg-gray-100
                              px-4
                              py-2.5
                              text-[10px]
                              font-bold
                              text-blue-950
                              hover:bg-gray-200
                            "
                        >
                          <MaterialIcon name="visibility" />
                          View Details
                        </button>

                        {["pending", "approved"].includes(status) && (
                          <button
                            type="button"
                            onClick={() => openReschedule(event)}
                            className="
                                flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-blue-50
                                px-4
                                py-2.5
                                text-[10px]
                                font-bold
                                text-blue-700
                                hover:bg-blue-100
                              "
                          >
                            <MaterialIcon name="edit_calendar" />
                            Reschedule
                          </button>
                        )}

                        {status === "approved" && (
                          <button
                            type="button"
                            onClick={() => openCancelSchedule(event)}
                            className="
                                flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-red-50
                                px-4
                                py-2.5
                                text-[10px]
                                font-bold
                                text-red-700
                                hover:bg-red-100
                              "
                          >
                            <MaterialIcon name="event_busy" />
                            Cancel Schedule
                          </button>
                        )}

                        {status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setDecision({
                                  event,

                                  status: "approved",
                                })
                              }
                              className="
                                  rounded-xl
                                  bg-green-100
                                  px-4
                                  py-2.5
                                  text-[10px]
                                  font-bold
                                  text-green-700
                                "
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDecision({
                                  event,

                                  status: "rejected",
                                })
                              }
                              className="
                                  rounded-xl
                                  bg-red-100
                                  px-4
                                  py-2.5
                                  text-[10px]
                                  font-bold
                                  text-red-700
                                "
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="
                py-16
                text-center
                text-gray-500
              "
            >
              No bookings found.
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          BOOKING DETAILS
      ================================================= */}

      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-widest
              text-yellow-600
            "
          >
            Booking Details
          </p>

          <h2
            className="
              mt-2
              text-[22px]
              font-black
              text-blue-950
            "
          >
            {selectedEvent.eventName}
          </h2>

          <p
            className="
              mt-2
              text-[10px]
              font-bold
              text-blue-700
            "
          >
            ● {selectedEvent.organization?.organizationName || "Organization"}
          </p>

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
            <Detail label="Event Type" value={selectedEvent.eventType} />

            <Detail label="Venue" value={selectedEvent.venue} />

            <Detail label="Date" value={formatDate(selectedEvent.eventDate)} />

            <Detail
              label="Schedule"
              value={`${formatTime(selectedEvent.startTime)} - ${formatTime(
                selectedEvent.endTime,
              )}`}
            />

            <Detail
              label="Participants"
              value={selectedEvent.participants || "0"}
            />

            <Detail
              label="Status"
              value={displayStatus(selectedEvent.status)}
            />
          </div>

          {/* RESCHEDULE */}

          {["pending", "approved"].includes(
            normalizeStatus(selectedEvent.status),
          ) && (
            <button
              type="button"
              onClick={() => openReschedule(selectedEvent)}
              className="
                mt-4
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#2443A4]
                py-3
                text-[11px]
                font-black
                text-white
                hover:bg-blue-800
              "
            >
              <MaterialIcon name="edit_calendar" />
              Edit Date & Time
            </button>
          )}

          {/* CANCEL SCHEDULE */}

          {normalizeStatus(selectedEvent.status) === "approved" && (
            <button
              type="button"
              onClick={() => openCancelSchedule(selectedEvent)}
              className="
                mt-3
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-red-600
                py-3
                text-[11px]
                font-black
                text-white
                hover:bg-red-700
              "
            >
              <MaterialIcon name="event_busy" />
              Cancel Schedule
            </button>
          )}

          {/* CANCELLATION REASON */}

          {normalizeStatus(selectedEvent.status) === "cancelled" &&
            selectedEvent.adminRemarks && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                "
              >
                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    text-red-600
                  "
                >
                  Cancellation Reason
                </p>

                <p
                  className="
                    mt-2
                    text-[10px]
                    leading-5
                    text-red-700
                  "
                >
                  {selectedEvent.adminRemarks}
                </p>
              </div>
            )}

          {/* DESCRIPTION */}

          <div className="mt-5">
            <h3
              className="
                text-[12px]
                font-black
                text-blue-950
              "
            >
              Event Description
            </h3>

            <p
              className="
                mt-2
                whitespace-pre-line
                text-[10px]
                leading-5
                text-gray-600
              "
            >
              {selectedEvent.description || "No description provided."}
            </p>
          </div>

          {/* SPECIAL REQUEST */}

          {selectedEvent.specialRequest || selectedEvent.request ? (
            <div
              className="
                mt-4
                rounded-xl
                bg-yellow-50
                p-4
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  text-yellow-800
                "
              >
                Special Request
              </p>

              <p
                className="
                  mt-2
                  text-[10px]
                  text-yellow-800
                "
              >
                {selectedEvent.specialRequest || selectedEvent.request}
              </p>
            </div>
          ) : null}

          {/* DOCUMENTS */}

          <div
            className="
              mt-5
              border-t
              border-gray-200
              pt-5
            "
          >
            <h3
              className="
                text-[16px]
                font-black
                text-blue-950
              "
            >
              Required Documents
            </h3>

            <p
              className="
                mt-1
                text-[9px]
                text-gray-500
              "
            >
              Review both approved PDF documents.
            </p>

            <div
              className="
                mt-4
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              <DocumentCard
                title="Approved Project Proposal"
                file={selectedEvent.projectProposalFile}
                loading={
                  openingDocument === `${selectedEvent._id}-project-proposal`
                }
                onOpen={() =>
                  openDocument(
                    selectedEvent._id,
                    "project-proposal",
                    "Approved Project Proposal",
                    selectedEvent.projectProposalFile,
                  )
                }
              />

              <DocumentCard
                title="Approved ARF"
                file={selectedEvent.approvedArfFile}
                loading={
                  openingDocument === `${selectedEvent._id}-approved-arf`
                }
                onOpen={() =>
                  openDocument(
                    selectedEvent._id,
                    "approved-arf",
                    "Approved ARF",
                    selectedEvent.approvedArfFile,
                  )
                }
              />
            </div>
          </div>

          {/* PENDING ACTIONS */}

          {normalizeStatus(selectedEvent.status) === "pending" && (
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
                onClick={() =>
                  setDecision({
                    event: selectedEvent,

                    status: "approved",
                  })
                }
                className="
                  rounded-xl
                  bg-green-600
                  py-3
                  text-[11px]
                  font-black
                  text-white
                  hover:bg-green-700
                "
              >
                Approve Booking
              </button>

              <button
                type="button"
                onClick={() =>
                  setDecision({
                    event: selectedEvent,

                    status: "rejected",
                  })
                }
                className="
                  rounded-xl
                  bg-red-600
                  py-3
                  text-[11px]
                  font-black
                  text-white
                  hover:bg-red-700
                "
              >
                Reject Booking
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* =================================================
          RESCHEDULE
      ================================================= */}

      {rescheduleEvent && (
        <Modal onClose={() => !rescheduling && setRescheduleEvent(null)}>
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-widest
              text-yellow-600
            "
          >
            Administrator
          </p>

          <h2
            className="
              mt-2
              text-[22px]
              font-black
              text-blue-950
            "
          >
            Edit Date & Time
          </h2>

          <p
            className="
              mt-2
              text-[10px]
              text-gray-500
            "
          >
            {rescheduleEvent.eventName}
          </p>

          <div
            className="
              mt-5
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

          <button
            type="button"
            disabled={rescheduling}
            onClick={saveReschedule}
            className="
              mt-5
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-blue-950
              py-3
              text-[11px]
              font-black
              text-white
              disabled:opacity-60
            "
          >
            <MaterialIcon name="save" />

            {rescheduling ? "Saving..." : "Save New Schedule"}
          </button>
        </Modal>
      )}

      {/* =================================================
          CANCEL SCHEDULE
      ================================================= */}

      {cancelEvent && (
        <Modal
          onClose={() => {
            if (cancelling) {
              return;
            }

            setCancelEvent(null);

            setCancelReason("");

            setCancelError("");
          }}
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-red-100
              text-red-600
            "
          >
            <MaterialIcon name="event_busy" />
          </div>

          <h2
            className="
              mt-4
              text-[22px]
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
            You are cancelling the approved schedule for{" "}
            <strong>{cancelEvent.eventName}</strong>.
          </p>

          <div
            className="
              mt-4
              grid
              gap-3
              rounded-2xl
              bg-gray-100
              p-4
              sm:grid-cols-2
            "
          >
            <Detail label="Date" value={formatDate(cancelEvent.eventDate)} />

            <Detail
              label="Schedule"
              value={`${formatTime(cancelEvent.startTime)} - ${formatTime(
                cancelEvent.endTime,
              )}`}
            />

            <Detail label="Venue" value={cancelEvent.venue} />

            <Detail
              label="Organization"
              value={
                cancelEvent.organization?.organizationName || "Organization"
              }
            />
          </div>

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

          <div className="mt-4">
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
              placeholder="Explain why this schedule is being cancelled..."
              className="
                mt-2
                w-full
                resize-none
                rounded-xl
                border
                border-gray-200
                p-4
                text-[11px]
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
                text-[11px]
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
                text-[11px]
                font-black
                text-white
                hover:bg-red-700
                disabled:opacity-50
              "
            >
              <MaterialIcon
                name={cancelling ? "hourglass_top" : "event_busy"}
              />

              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </Modal>
      )}

      {/* =================================================
          APPROVE / REJECT
      ================================================= */}

      {decision && (
        <Modal
          onClose={() => {
            setDecision(null);

            setRemarks("");
          }}
        >
          <h2
            className="
              text-[22px]
              font-black
              text-blue-950
            "
          >
            {decision.status === "approved"
              ? "Approve Booking"
              : "Reject Booking"}
          </h2>

          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows="5"
            placeholder="Admin remarks..."
            className="
              mt-5
              w-full
              resize-none
              rounded-xl
              border
              border-gray-200
              p-4
              text-[11px]
              outline-none
            "
          />

          <button
            type="button"
            onClick={updateStatus}
            className={`
              mt-5
              w-full
              rounded-xl
              py-3
              text-[11px]
              font-black
              text-white

              ${decision.status === "approved" ? "bg-green-600" : "bg-red-600"}
            `}
          >
            Confirm {displayStatus(decision.status)}
          </button>
        </Modal>
      )}

      {/* =================================================
          PDF PREVIEW
      ================================================= */}

      {documentPreview && (
        <div
          className="
            fixed
            inset-0
            z-[6000]
            flex
            items-center
            justify-center
            bg-black/80
            p-4
          "
          onClick={closeDocumentPreview}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="
              flex
              h-[90vh]
              w-full
              max-w-5xl
              flex-col
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-gray-200
                px-5
                py-4
              "
            >
              <div>
                <p
                  className="
                    text-[12px]
                    font-black
                    text-blue-950
                  "
                >
                  {documentPreview.title}
                </p>

                <p
                  className="
                    mt-1
                    text-[9px]
                    text-gray-500
                  "
                >
                  {documentPreview.fileName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDocumentPreview}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-gray-100
                  text-gray-600
                "
              >
                <MaterialIcon name="close" />
              </button>
            </div>

            <iframe
              title={documentPreview.title}
              src={documentPreview.url}
              className="
                min-h-0
                flex-1
                w-full
              "
            />
          </div>
        </div>
      )}
    </>
  );
}

/* =====================================================
   DOCUMENT CARD
===================================================== */

function DocumentCard({ title, file, loading, onOpen }) {
  const exists = Boolean(file?.fileName || file?.originalName);

  return (
    <div
      className={`
        rounded-2xl
        border
        p-4

        ${exists ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
      `}
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg

            ${
              exists ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            }
          `}
        >
          <MaterialIcon name="picture_as_pdf" />
        </div>

        <div className="min-w-0">
          <h4
            className="
              text-[11px]
              font-black
              text-blue-950
            "
          >
            {title}
          </h4>

          {exists && (
            <p
              className="
                mt-1
                truncate
                text-[8px]
                text-gray-500
              "
            >
              {file.originalName || file.fileName}
            </p>
          )}
        </div>
      </div>

      {exists ? (
        <button
          type="button"
          disabled={loading}
          onClick={onOpen}
          className="
            mt-3
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-blue-950
            py-2.5
            text-[10px]
            font-black
            text-white
            disabled:opacity-60
          "
        >
          <MaterialIcon name="visibility" />

          {loading ? "Loading..." : "View PDF"}
        </button>
      ) : (
        <p
          className="
            mt-3
            text-[9px]
            font-bold
            text-red-600
          "
        >
          PDF not uploaded
        </p>
      )}
    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const styles = {
    pending: "bg-yellow-100 text-yellow-700",

    approved: "bg-green-100 text-green-700",

    rejected: "bg-red-100 text-red-700",

    cancelled: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`
        rounded-full
        px-3
        py-1
        text-[9px]
        font-black

        ${styles[normalized] || "bg-gray-100 text-gray-600"}
      `}
    >
      {displayStatus(normalized)}
    </span>
  );
}

/* =====================================================
   META
===================================================== */

function Meta({ icon, text }) {
  return (
    <span
      className="
        flex
        items-center
        gap-1.5
      "
    >
      <MaterialIcon name={icon} />

      {text}
    </span>
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
          text-[8px]
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
          text-[10px]
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
          text-[10px]
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
          text-[11px]
          outline-none
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      />
    </div>
  );
}

/* =====================================================
   MODAL
===================================================== */

function Modal({ children, onClose }) {
  return (
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
      onClick={onClose}
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
          relative
          max-h-[92vh]
          w-full
          max-w-[620px]
          overflow-y-auto
          rounded-2xl
          bg-white
          p-5
          shadow-2xl
        "
      >
        <button
          type="button"
          onClick={onClose}
          className="
            absolute
            right-4
            top-4
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-full
            bg-gray-100
            text-gray-500
            hover:bg-gray-200
          "
        >
          <MaterialIcon name="close" />
        </button>

        {children}
      </motion.div>
    </div>
  );
}
