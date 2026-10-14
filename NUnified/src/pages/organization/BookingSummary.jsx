import { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

/* =========================================
   DATE
========================================= */

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================
   TIME
========================================= */

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

/* =========================================
   SIZE
========================================= */

function formatFileSize(size) {
  if (!size) {
    return "";
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

/* =========================================
   PAGE
========================================= */

export default function BookingSummary() {
  const location = useLocation();

  const navigate = useNavigate();

  const booking = location.state;

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [previewDocument, setPreviewDocument] = useState(null);

  const [proposalUrl, setProposalUrl] = useState("");

  const [arfUrl, setArfUrl] = useState("");

  /* =========================================
     LOCAL FILE PREVIEWS
  ========================================= */

  useEffect(() => {
    if (!booking) {
      return;
    }

    let newProposalUrl = "";
    let newArfUrl = "";

    if (booking.projectProposal instanceof File) {
      newProposalUrl = URL.createObjectURL(booking.projectProposal);

      setProposalUrl(newProposalUrl);
    }

    if (booking.approvedArf instanceof File) {
      newArfUrl = URL.createObjectURL(booking.approvedArf);

      setArfUrl(newArfUrl);
    }

    return () => {
      if (newProposalUrl) {
        URL.revokeObjectURL(newProposalUrl);
      }

      if (newArfUrl) {
        URL.revokeObjectURL(newArfUrl);
      }
    };
  }, [booking]);

  /* =========================================
     NO BOOKING
  ========================================= */

  if (!booking) {
    return (
      <div
        className="
          rounded-3xl
          bg-white
          p-10
          text-center
          shadow-lg
        "
      >
        <MaterialIcon name="warning" />

        <h1
          className="
            mt-4
            text-2xl
            font-black
            text-blue-950
          "
        >
          No Booking Information
        </h1>

        <Link
          to="/organization/booking"
          className="
            mt-6
            inline-block
            rounded-xl
            bg-yellow-400
            px-6
            py-3
            font-black
            text-blue-950
          "
        >
          Return to Booking
        </Link>
      </div>
    );
  }

  /* =========================================
     REVIEW FILE
  ========================================= */

  const reviewDocument = ({ title, file, url }) => {
    if (!(file instanceof File) || !url) {
      setError(
        `${title} is no longer available. Please return to the booking form and upload it again.`,
      );

      return;
    }

    setPreviewDocument({
      title,
      file,
      url,
    });
  };

  /* =========================================
     CONFIRM
  ========================================= */

  const confirmBooking = async () => {
    setError("");

    /*
        IMPORTANT:

        Verify these are REAL File
        objects before creating FormData.
      */

    if (!(booking.projectProposal instanceof File)) {
      setError(
        "Approved Project Proposal is not a valid uploaded file. Please go back and upload it again.",
      );

      return;
    }

    if (!(booking.approvedArf instanceof File)) {
      setError(
        "Approved ARF is not a valid uploaded file. Please go back and upload it again.",
      );

      return;
    }

    setSubmitting(true);

    try {
      /* =================================
           REAL MULTIPART FORM DATA
        ================================== */

      const uploadData = new FormData();

      uploadData.append("eventName", booking.eventName || "");

      uploadData.append("eventType", booking.eventType || "");

      uploadData.append("description", booking.description || "");

      uploadData.append("venue", booking.venue || "");

      uploadData.append("eventDate", booking.eventDate || "");

      uploadData.append("startTime", booking.startTime || "");

      uploadData.append("endTime", booking.endTime || "");

      uploadData.append("participants", String(booking.participants || 0));

      uploadData.append("request", booking.request || "");

      /* =================================
           ACTUAL FILE OBJECTS
        ================================== */

      uploadData.append(
        "projectProposal",
        booking.projectProposal,
        booking.projectProposal.name,
      );

      uploadData.append(
        "approvedArf",
        booking.approvedArf,
        booking.approvedArf.name,
      );

      /* =================================
           DEBUG

           You should see:
           projectProposal -> File
           approvedArf -> File
        ================================== */

      console.log("PROJECT FILE:", booking.projectProposal);

      console.log("PROJECT IS FILE:", booking.projectProposal instanceof File);

      console.log("ARF FILE:", booking.approvedArf);

      console.log("ARF IS FILE:", booking.approvedArf instanceof File);

      for (const [key, value] of uploadData.entries()) {
        console.log("FORM DATA:", key, value);
      }

      /*
          IMPORTANT:

          No Content-Type header here.

          Axios will automatically send:

          multipart/form-data;
          boundary=...
        */

      const response = await api.post("/bookings", uploadData);

      const savedBooking = response.data;

      navigate("/organization/booking-confirmation", {
        replace: true,

        state: {
          booking: savedBooking,

          ...savedBooking,
        },
      });
    } catch (err) {
      console.error("BOOKING SUBMISSION ERROR:", err);

      setError(err.response?.data?.message || "Unable to submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* =====================================
            HEADER
        ====================================== */}

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
            Final Review
          </p>

          <h1
            className="
              mt-3
              text-4xl
              font-black
            "
          >
            Booking Summary
          </h1>

          <p
            className="
              mt-3
              text-gray-200
            "
          >
            Review your booking and required documents before submitting it to
            the administrator.
          </p>
        </motion.div>

        {/* ERROR */}

        {error && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-4
              font-semibold
              text-red-700
            "
          >
            <MaterialIcon name="error" />

            {error}
          </div>
        )}

        {/* =====================================
            DETAILS
        ====================================== */}

        <div
          className="
            grid
            gap-6
            lg:grid-cols-2
          "
        >
          <SummaryCard icon="event" title="Event Information">
            <SummaryRow label="Event Name" value={booking.eventName} />

            <SummaryRow label="Event Type" value={booking.eventType} />

            <SummaryRow
              label="Description"
              value={booking.description || "Not provided"}
            />
          </SummaryCard>

          <SummaryCard icon="calendar_month" title="Venue & Schedule">
            <SummaryRow label="Venue" value={booking.venue} />

            <SummaryRow label="Date" value={formatDate(booking.eventDate)} />

            <SummaryRow
              label="Time"
              value={`${formatTime(booking.startTime)} – ${formatTime(
                booking.endTime,
              )}`}
            />

            <SummaryRow
              label="Participants"
              value={booking.participants || "0"}
            />
          </SummaryCard>
        </div>

        {/* =====================================
            DOCUMENTS
        ====================================== */}

        <div
          className="
            rounded-3xl
            bg-white
            p-7
            shadow-lg
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-blue-950
                text-yellow-400
              "
            >
              <MaterialIcon name="verified" />
            </div>

            <div>
              <h2
                className="
                  text-xl
                  font-black
                  text-blue-950
                "
              >
                Required Approved Documents
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-gray-500
                "
              >
                Review both documents before confirming.
              </p>
            </div>
          </div>

          <div
            className="
              mt-6
              grid
              gap-5
              md:grid-cols-2
            "
          >
            <ReviewDocumentCard
              title="Approved Project Proposal"
              file={booking.projectProposal}
              onReview={() =>
                reviewDocument({
                  title: "Approved Project Proposal",

                  file: booking.projectProposal,

                  url: proposalUrl,
                })
              }
            />

            <ReviewDocumentCard
              title="Approved ARF"
              file={booking.approvedArf}
              onReview={() =>
                reviewDocument({
                  title: "Approved ARF",

                  file: booking.approvedArf,

                  url: arfUrl,
                })
              }
            />
          </div>
        </div>

        {/* =====================================
            REQUEST
        ====================================== */}

        {booking.request && (
          <SummaryCard icon="notes" title="Special Request">
            <p
              className="
                whitespace-pre-line
                text-gray-700
              "
            >
              {booking.request}
            </p>
          </SummaryCard>
        )}

        {/* =====================================
            BUTTONS
        ====================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            pb-8
            sm:flex-row
          "
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate(-1)}
            className="
              flex
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-gray-200
              py-4
              font-black
              text-blue-950
            "
          >
            <MaterialIcon name="arrow_back" />
            Back
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={confirmBooking}
            className="
              flex
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-gradient-to-r
              from-yellow-300
              to-yellow-500
              py-4
              font-black
              text-blue-950
              shadow-lg
              disabled:opacity-60
            "
          >
            <MaterialIcon name={submitting ? "hourglass_top" : "send"} />

            {submitting ? "Submitting..." : "Confirm Booking"}
          </button>
        </div>
      </div>

      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </>
  );
}

/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({ icon, title, children }) {
  return (
    <div
      className="
        rounded-3xl
        bg-white
        p-7
        shadow-lg
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-blue-950
            text-yellow-400
          "
        >
          <MaterialIcon name={icon} />
        </div>

        <h2
          className="
            text-xl
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>
      </div>

      <div
        className="
          mt-6
          space-y-5
        "
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================
   ROW
========================================= */

function SummaryRow({ label, value }) {
  return (
    <div>
      <p
        className="
          text-xs
          font-bold
          uppercase
          text-gray-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          font-semibold
          text-blue-950
        "
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* =========================================
   DOCUMENT CARD
========================================= */

function ReviewDocumentCard({ title, file, onReview }) {
  const validFile = file instanceof File;

  return (
    <div
      className={`
        rounded-2xl
        border-2
        p-5

        ${
          validFile
            ? `
              border-green-200
              bg-green-50
            `
            : `
              border-red-200
              bg-red-50
            `
        }
      `}
    >
      <div
        className="
          flex
          items-start
          gap-4
        "
      >
        <div
          className={`
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-xl

            ${
              validFile
                ? `
                  bg-green-100
                  text-green-600
                `
                : `
                  bg-red-100
                  text-red-600
                `
            }
          `}
        >
          <MaterialIcon name={validFile ? "description" : "error"} />
        </div>

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <h3
            className="
              font-black
              text-blue-950
            "
          >
            {title}
          </h3>

          {validFile ? (
            <>
              <p
                className="
                  mt-2
                  truncate
                  text-sm
                  font-bold
                  text-gray-700
                "
              >
                {file.name}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                "
              >
                {formatFileSize(file.size)}
              </p>

              <button
                type="button"
                onClick={onReview}
                className="
                  mt-4
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-950
                  py-3
                  font-black
                  text-white
                "
              >
                <MaterialIcon name="visibility" />
                Review Document
              </button>
            </>
          ) : (
            <p
              className="
                mt-2
                text-sm
                font-bold
                text-red-600
              "
            >
              File needs to be uploaded again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   PREVIEW MODAL
========================================= */

function DocumentPreviewModal({ document, onClose }) {
  const { title, file, url } = document;

  const isPdf = file?.type === "application/pdf";

  const isImage = file?.type?.startsWith("image/");

  return (
    <div
      className="
        fixed
        inset-0
        z-[3000]
        flex
        items-center
        justify-center
        bg-black/75
        p-4
        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) => event.stopPropagation()}
        className="
          flex
          max-h-[94vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            bg-blue-950
            p-5
            text-white
          "
        >
          <div>
            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-widest
                text-yellow-400
              "
            >
              Document Review
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-black
              "
            >
              {title}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-blue-200
              "
            >
              {file?.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white/10
            "
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div
          className="
            flex
            min-h-[400px]
            flex-1
            items-center
            justify-center
            overflow-auto
            bg-gray-100
            p-5
          "
        >
          {isImage && (
            <img
              src={url}
              alt={title}
              className="
                max-h-[70vh]
                max-w-full
                rounded-xl
                object-contain
                shadow-lg
              "
            />
          )}

          {isPdf && (
            <iframe
              src={url}
              title={title}
              className="
                h-[70vh]
                w-full
                rounded-xl
                bg-white
              "
            />
          )}
        </div>

        <div
          className="
            flex
            justify-end
            border-t
            p-4
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl
              bg-yellow-400
              px-7
              py-3
              font-black
              text-blue-950
            "
          >
            Looks Correct
          </button>
        </div>
      </motion.div>
    </div>
  );
}
