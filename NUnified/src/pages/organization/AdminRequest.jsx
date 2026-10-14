import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   REQUEST TYPES
===================================================== */

const REQUEST_TYPES = [
  "Urgent Response",
  "Inquiry",
  "General Concern",
  "Reschedule Request",
  "Cancel Request",
];

/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
  requestType: "",
  otherRequestType: "",
  booking: "",
  reason: "",
};

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({
  name,
  className = "",
}) {
  return (
    <span
      className={`material-symbols-rounded leading-none ${className}`}
    >
      {name}
    </span>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function getArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.requests
    )
  ) {
    return data.requests;
  }

  if (
    Array.isArray(
      data?.drafts
    )
  ) {
    return data.drafts;
  }

  return [];
}

function normalizeStatus(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function prettyStatus(value) {
  const status =
    normalizeStatus(value);

  if (!status) {
    return "Pending";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true,
    }
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminRequest() {
  const [
    formData,
    setFormData,
  ] = useState(
    EMPTY_FORM
  );

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    drafts,
    setDrafts,
  ] = useState([]);

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "submitted"
  );

  const [
    editingDraftId,
    setEditingDraftId,
  ] = useState("");

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState(null);

  const [
    draftConfirm,
    setDraftConfirm,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingDraft,
    setSavingDraft,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    deletingDraft,
    setDeletingDraft,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState(null);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData =
    async () => {
      setLoading(true);

      try {
        const [
          submittedResult,
          draftResult,
        ] =
          await Promise.all([
            api.get(
              "/admin-requests/my"
            ),

            api.get(
              "/admin-requests/my/drafts"
            ),
          ]);

        setRequests(
          getArray(
            submittedResult.data
          )
        );

        setDrafts(
          getArray(
            draftResult.data
          )
        );
      } catch (
        error
      ) {
        console.error(
          "LOAD ADMIN REQUEST PAGE ERROR:",
          error
        );

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to load admin requests.",
        });
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setFormData(
        (
          previous
        ) => {
          /* =============================================
             REQUEST TYPE
          ============================================= */

          if (
            name ===
            "requestType"
          ) {
            return {
              ...previous,

              requestType:
                value,

              otherRequestType:
                value ===
                "Other"
                  ? previous.otherRequestType
                  : "",
            };
          }

          /* =============================================
             OTHER FIELDS
          ============================================= */

          return {
            ...previous,

            [name]:
              value,
          };
        }
      );

      setMessage(
        null
      );
    };

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm =
    () => {
      setFormData({
        ...EMPTY_FORM,
      });

      setEditingDraftId(
        ""
      );
    };

  /* =====================================================
     GET FINAL REQUEST TYPE
  ===================================================== */

  const getFinalRequestType =
    () => {
      if (
        formData.requestType ===
        "Other"
      ) {
        return formData
          .otherRequestType
          .trim();
      }

      return formData
        .requestType
        .trim();
    };

  /* =====================================================
     SAVE DRAFT
  ===================================================== */

  const handleSaveDraft =
    async () => {
      setSavingDraft(
        true
      );

      setMessage(
        null
      );

      try {
        /*
          Drafts may be incomplete.

          If Other is selected but
          custom text is still empty,
          save "Other" so it can be
          continued later.
        */

        const finalRequestType =
          formData.requestType ===
          "Other"
            ? (
                formData
                  .otherRequestType
                  .trim() ||
                "Other"
              )
            : formData
                .requestType
                .trim();

        const payload = {
          requestType:
            finalRequestType,

          booking:
            formData.booking
              .trim(),

          reason:
            formData.reason
              .trim(),
        };

        let response;

        if (
          editingDraftId
        ) {
          response =
            await api.put(
              `/admin-requests/${editingDraftId}/draft`,

              payload
            );
        } else {
          response =
            await api.post(
              "/admin-requests/draft",

              payload
            );
        }

        setMessage({
          type:
            "success",

          text:
            response.data
              ?.message ||
            "Draft saved successfully.",
        });

        resetForm();

        setActiveTab(
          "drafts"
        );

        await loadData();
      } catch (
        error
      ) {
        console.error(
          "SAVE ADMIN REQUEST DRAFT ERROR:",
          error
        );

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to save draft.",
        });
      } finally {
        setSavingDraft(
          false
        );
      }
    };

  /* =====================================================
     SUBMIT NEW REQUEST / EDITED DRAFT
  ===================================================== */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setMessage(
        null
      );

      /* ===============================================
         REQUEST TYPE
      =============================================== */

      if (
        !formData
          .requestType
          .trim()
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please select a Request Type.",
        });

        return;
      }

      /* ===============================================
         OTHER REQUEST TYPE
      =============================================== */

      if (
        formData.requestType ===
          "Other" &&
        !formData
          .otherRequestType
          .trim()
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please specify the Other Request Type.",
        });

        return;
      }

      /* ===============================================
         REASON
      =============================================== */

      if (
        !formData
          .reason
          .trim()
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please enter your Reason / Concern.",
        });

        return;
      }

      const finalRequestType =
        getFinalRequestType();

      const payload = {
        requestType:
          finalRequestType,

        booking:
          formData.booking
            .trim(),

        reason:
          formData.reason
            .trim(),
      };

      setSubmitting(
        true
      );

      try {
        let response;

        /* =============================================
           SUBMIT EDITED DRAFT
        ============================================= */

        if (
          editingDraftId
        ) {
          response =
            await api.post(
              `/admin-requests/${editingDraftId}/submit`,

              payload
            );
        }

        /* =============================================
           SUBMIT NEW REQUEST
        ============================================= */

        else {
          response =
            await api.post(
              "/admin-requests",

              payload
            );
        }

        setMessage({
          type:
            "success",

          text:
            response.data
              ?.message ||
            "Request submitted successfully.",
        });

        resetForm();

        setActiveTab(
          "submitted"
        );

        await loadData();
      } catch (
        error
      ) {
        console.error(
          "SUBMIT ADMIN REQUEST ERROR:",
          error
        );

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to submit request.",
        });
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =====================================================
     CONTINUE EDITING DRAFT
  ===================================================== */

  const continueEditingDraft =
    (
      draft
    ) => {
      const savedRequestType =
        draft.requestType ||
        draft.subject ||
        "";

      const isNormalType =
        REQUEST_TYPES.includes(
          savedRequestType
        );

      setEditingDraftId(
        draft._id
      );

      setFormData({
        requestType:
          isNormalType
            ? savedRequestType
            : "Other",

        otherRequestType:
          isNormalType
            ? ""
            : savedRequestType ===
                "Other"
              ? ""
              : savedRequestType,

        booking:
          draft.booking ||
          "",

        reason:
          draft.reason ||
          draft.message ||
          "",
      });

      setMessage({
        type:
          "info",

        text:
          "Draft loaded. Continue editing the form and save or submit when ready.",
      });

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    };

  /* =====================================================
     SUBMIT DRAFT FROM CARD
  ===================================================== */

  const submitDraft =
    async (
      draft,
      confirmed = false
    ) => {
      const requestType =
        String(
          draft.requestType ||
          draft.subject ||
          ""
        ).trim();

      const reason =
        String(
          draft.reason ||
          draft.message ||
          ""
        ).trim();

      /*
        If the saved value is exactly
        "Other", the custom field was
        never completed.
      */

      if (
        !requestType ||
        requestType ===
          "Other" ||
        !reason
      ) {
        continueEditingDraft(
          draft
        );

        setMessage({
          type:
            "error",

          text:
            requestType ===
            "Other"
              ? "Please specify the Other Request Type before submitting this draft."
              : "This draft is incomplete. Complete the required fields before submitting.",
        });

        return;
      }

      /* ===============================================
         OPEN CUSTOM CONFIRM MODAL
      =============================================== */

      if (!confirmed) {
        setDraftConfirm({
          type:
            "submit",

          draft,
        });

        return;
      }

      setSubmitting(
        true
      );

      setMessage(
        null
      );

      try {
        const response =
          await api.post(
            `/admin-requests/${draft._id}/submit`
          );

        setDraftConfirm(
          null
        );

        setMessage({
          type:
            "success",

          text:
            response.data
              ?.message ||
            "Draft submitted successfully.",
        });

        setActiveTab(
          "submitted"
        );

        await loadData();
      } catch (
        error
      ) {
        console.error(
          "SUBMIT DRAFT ERROR:",
          error
        );

        setDraftConfirm(
          null
        );

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to submit draft.",
        });
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =====================================================
     DELETE DRAFT
  ===================================================== */

  const deleteDraft =
    async (
      draft,
      confirmed = false
    ) => {
      if (!confirmed) {
        setDraftConfirm({
          type:
            "delete",

          draft,
        });

        return;
      }

      setDeletingDraft(
        draft._id
      );

      setMessage(
        null
      );

      try {
        const response =
          await api.delete(
            `/admin-requests/${draft._id}/draft`
          );

        if (
          editingDraftId ===
          draft._id
        ) {
          resetForm();
        }

        setDraftConfirm(
          null
        );

        setMessage({
          type:
            "success",

          text:
            response.data
              ?.message ||
            "Draft deleted successfully.",
        });

        await loadData();
      } catch (
        error
      ) {
        console.error(
          "DELETE ADMIN REQUEST DRAFT ERROR:",
          error
        );

        setDraftConfirm(
          null
        );

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to delete draft.",
        });
      } finally {
        setDeletingDraft(
          ""
        );
      }
    };

  /* =====================================================
     STATISTICS
  ===================================================== */

  const stats =
    useMemo(
      () => ({
        submitted:
          requests.length,

        pending:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "pending"
          ).length,

        approved:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "approved"
          ).length,

        rejected:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "rejected"
          ).length,

        drafts:
          drafts.length,
      }),

      [
        requests,
        drafts,
      ]
    );

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <div
        className="
          mx-auto
          w-full
          max-w-[1200px]
          space-y-5
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <motion.div
          initial={{
            opacity:
              0,

            y:
              20,
          }}
          animate={{
            opacity:
              1,

            y:
              0,
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
            Organization Support
          </p>

          <h1
            className="
              mt-1.5

              text-[26px]
              font-black
            "
          >
            Admin Request
          </h1>

          <p
            className="
              mt-1.5

              max-w-[720px]

              text-[11px]
              leading-5
              text-blue-100
            "
          >
            Submit concerns,
            inquiries, and requests
            to the administrator.
            You can also save
            unfinished forms as
            drafts and submit them
            later.
          </p>
        </motion.div>

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
          <StatusCard
            icon="send"
            title="Submitted"
            value={
              stats.submitted
            }
          />

          <StatusCard
            icon="schedule"
            title="Pending"
            value={
              stats.pending
            }
          />

          <StatusCard
            icon="check_circle"
            title="Approved"
            value={
              stats.approved
            }
          />

          <StatusCard
            icon="cancel"
            title="Rejected"
            value={
              stats.rejected
            }
          />

          <StatusCard
            icon="draft"
            title="Drafts"
            value={
              stats.drafts
            }
          />
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <MessageBox
            type={
              message.type
            }
            text={
              message.text
            }
            onClose={() =>
              setMessage(
                null
              )
            }
          />
        )}

        {/* =================================================
            MAIN
        ================================================= */}

        <div
          className="
            grid
            gap-5

            lg:grid-cols-[390px_1fr]
          "
        >
          {/* ===============================================
              FORM
          =============================================== */}

          <motion.form
            onSubmit={
              handleSubmit
            }
            className="
              rounded-[20px]

              bg-white

              p-5

              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.15em]

                    text-yellow-600
                  "
                >
                  {editingDraftId
                    ? "Editing Draft"
                    : "New Request"}
                </p>

                <h2
                  className="
                    mt-1

                    text-[20px]
                    font-black
                    text-blue-950
                  "
                >
                  {editingDraftId
                    ? "Continue Draft"
                    : "New Admin Request"}
                </h2>

                <p
                  className="
                    mt-1

                    text-[9px]
                    leading-4
                    text-gray-500
                  "
                >
                  Drafts do not
                  appear to the
                  administrator
                  until you submit
                  them.
                </p>
              </div>

              {editingDraftId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center

                    rounded-lg

                    bg-gray-100

                    text-gray-500

                    transition

                    hover:bg-gray-200
                  "
                >
                  <MaterialIcon
                    name="close"
                    className="
                      text-[16px]
                    "
                  />
                </button>
              )}
            </div>

            {/* =============================================
                REQUEST TYPE
            ============================================= */}

            <div
              className="
                mt-5
              "
            >
              <label
                htmlFor="requestType"
                className="
                  text-[9px]
                  font-black
                  text-blue-950
                "
              >
                Request Type

                <span
                  className="
                    ml-1
                    text-red-500
                  "
                >
                  *
                </span>
              </label>

              <select
                id="requestType"
                name="requestType"
                value={
                  formData
                    .requestType
                }
                onChange={
                  handleChange
                }
                className="
                  mt-2

                  h-11
                  w-full

                  rounded-xl

                  border
                  border-gray-200

                  bg-white

                  px-3

                  text-[10px]
                  text-blue-950

                  outline-none

                  transition

                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              >
                <option value="">
                  Select Request Type
                </option>

                {REQUEST_TYPES.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {
                        type
                      }
                    </option>
                  )
                )}

                <option value="Other">
                  Other
                </option>
              </select>

              {/* ===========================================
                  OTHER REQUEST TYPE
              =========================================== */}

              {formData.requestType ===
                "Other" && (
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      -5,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,
                  }}
                  className="
                    mt-3
                  "
                >
                  <label
                    htmlFor="otherRequestType"
                    className="
                      text-[9px]
                      font-black
                      text-blue-950
                    "
                  >
                    Specify Other
                    Request Type

                    <span
                      className="
                        ml-1
                        text-red-500
                      "
                    >
                      *
                    </span>
                  </label>

                  <div
                    className="
                      relative
                      mt-2
                    "
                  >
                    <MaterialIcon
                      name="edit_note"
                      className="
                        pointer-events-none

                        absolute
                        left-3
                        top-1/2

                        -translate-y-1/2

                        text-[18px]
                        text-gray-400
                      "
                    />

                    <input
                      id="otherRequestType"
                      type="text"
                      name="otherRequestType"
                      value={
                        formData
                          .otherRequestType
                      }
                      onChange={
                        handleChange
                      }
                      maxLength={
                        100
                      }
                      autoFocus
                      placeholder="Example: Equipment Request"
                      className="
                        h-11
                        w-full

                        rounded-xl

                        border
                        border-yellow-300

                        bg-yellow-50/40

                        pl-10
                        pr-3

                        text-[10px]
                        text-blue-950

                        outline-none

                        transition

                        placeholder:text-gray-400

                        focus:border-yellow-500
                        focus:bg-white
                        focus:ring-2
                        focus:ring-yellow-100
                      "
                    />
                  </div>

                  <div
                    className="
                      mt-1.5

                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >
                    <p
                      className="
                        text-[7px]
                        text-gray-400
                      "
                    >
                      Enter a request
                      type that is not
                      listed above.
                    </p>

                    <span
                      className="
                        shrink-0

                        text-[7px]
                        text-gray-400
                      "
                    >
                      {
                        formData
                          .otherRequestType
                          .length
                      }
                      /100
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* =============================================
                RELATED BOOKING
            ============================================= */}

            <div
              className="
                mt-4
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <label
                  htmlFor="booking"
                  className="
                    text-[9px]
                    font-black
                    text-blue-950
                  "
                >
                  Related Booking
                </label>

                <span
                  className="
                    text-[7px]
                    text-gray-400
                  "
                >
                  Optional
                </span>
              </div>

              <input
                id="booking"
                name="booking"
                value={
                  formData
                    .booking
                }
                onChange={
                  handleChange
                }
                maxLength={
                  200
                }
                placeholder="Booking reference or event name"
                className="
                  mt-2

                  h-11
                  w-full

                  rounded-xl

                  border
                  border-gray-200

                  px-3

                  text-[10px]
                  text-blue-950

                  outline-none

                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              />
            </div>

            {/* =============================================
                REASON
            ============================================= */}

            <div
              className="
                mt-4
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <label
                  htmlFor="reason"
                  className="
                    text-[9px]
                    font-black
                    text-blue-950
                  "
                >
                  Reason /
                  Concern

                  <span
                    className="
                      ml-1
                      text-red-500
                    "
                  >
                    *
                  </span>
                </label>

                <span
                  className="
                    text-[7px]
                    text-gray-400
                  "
                >
                  {
                    formData
                      .reason
                      .length
                  }
                  /2000
                </span>
              </div>

              <textarea
                id="reason"
                name="reason"
                value={
                  formData
                    .reason
                }
                onChange={
                  handleChange
                }
                rows={
                  7
                }
                maxLength={
                  2000
                }
                placeholder="Explain your request, concern, or inquiry..."
                className="
                  mt-2

                  w-full

                  resize-none

                  rounded-xl

                  border
                  border-gray-200

                  px-3
                  py-3

                  text-[10px]
                  leading-5
                  text-blue-950

                  outline-none

                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              />
            </div>

            {/* =============================================
                NOTICE
            ============================================= */}

            <div
              className="
                mt-4

                flex
                items-start
                gap-2

                rounded-xl

                bg-blue-50

                px-3
                py-2.5
              "
            >
              <MaterialIcon
                name="info"
                className="
                  mt-[1px]

                  text-[14px]
                  text-blue-600
                "
              />

              <p
                className="
                  text-[7px]
                  leading-3.5
                  text-blue-700
                "
              >
                You may save an
                incomplete form as
                a draft. The Admin
                cannot see it until
                you press Submit
                Request.
              </p>
            </div>

            {/* =============================================
                FORM BUTTONS
            ============================================= */}

            <div
              className="
                mt-5

                grid
                grid-cols-2
                gap-2
              "
            >
              <button
                type="button"
                disabled={
                  savingDraft ||
                  submitting
                }
                onClick={
                  handleSaveDraft
                }
                className="
                  flex
                  h-11
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  border
                  border-blue-950

                  bg-white

                  text-[10px]
                  font-black
                  text-blue-950

                  transition

                  hover:bg-blue-50

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <MaterialIcon
                  name="draft"
                  className="
                    text-[16px]
                  "
                />

                {savingDraft
                  ? "Saving..."
                  : editingDraftId
                    ? "Update Draft"
                    : "Save as Draft"}
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  savingDraft
                }
                className="
                  flex
                  h-11
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-yellow-400

                  text-[10px]
                  font-black
                  text-blue-950

                  transition

                  hover:bg-yellow-500

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {submitting ? (
                  <MaterialIcon
                    name="progress_activity"
                    className="
                      animate-spin
                      text-[16px]
                    "
                  />
                ) : (
                  <MaterialIcon
                    name="send"
                    className="
                      text-[16px]
                    "
                  />
                )}

                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </motion.form>

          {/* ===============================================
              MY REQUESTS
          =============================================== */}

          <motion.section
            initial={{
              opacity:
                0,

              y:
                10,
            }}
            animate={{
              opacity:
                1,

              y:
                0,
            }}
            className="
              min-h-[530px]

              rounded-[20px]

              bg-white

              p-5

              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <h2
                  className="
                    text-[18px]
                    font-black
                    text-blue-950
                  "
                >
                  My Requests
                </h2>

                <p
                  className="
                    mt-1

                    text-[8px]
                    text-gray-400
                  "
                >
                  Track submitted
                  requests and
                  continue unfinished
                  drafts.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  loadData
                }
                disabled={
                  loading
                }
                className="
                  flex
                  items-center
                  gap-2

                  rounded-lg

                  bg-gray-100

                  px-3
                  py-2

                  text-[9px]
                  font-bold
                  text-blue-950

                  transition

                  hover:bg-gray-200

                  disabled:opacity-50
                "
              >
                <MaterialIcon
                  name="refresh"
                  className={
                    loading
                      ? "animate-spin text-[15px]"
                      : "text-[15px]"
                  }
                />

                Refresh
              </button>
            </div>

            {/* =============================================
                TABS
            ============================================= */}

            <div
              className="
                mt-4

                grid
                grid-cols-2

                rounded-xl

                bg-gray-100

                p-1
              "
            >
              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "submitted"
                  )
                }
                className={`
                  flex
                  h-9
                  items-center
                  justify-center
                  gap-2

                  rounded-lg

                  text-[10px]
                  font-black

                  transition

                  ${
                    activeTab ===
                    "submitted"
                      ? "bg-white text-blue-950 shadow-sm"
                      : "text-gray-500"
                  }
                `}
              >
                <MaterialIcon
                  name="send"
                  className="
                    text-[16px]
                  "
                />

                Submitted (
                {
                  requests.length
                }
                )
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "drafts"
                  )
                }
                className={`
                  flex
                  h-9
                  items-center
                  justify-center
                  gap-2

                  rounded-lg

                  text-[10px]
                  font-black

                  transition

                  ${
                    activeTab ===
                    "drafts"
                      ? "bg-white text-blue-950 shadow-sm"
                      : "text-gray-500"
                  }
                `}
              >
                <MaterialIcon
                  name="draft"
                  className="
                    text-[16px]
                  "
                />

                Drafts (
                {
                  drafts.length
                }
                )
              </button>
            </div>

            {/* =============================================
                LOADING
            ============================================= */}

            {loading ? (
              <div
                className="
                  flex
                  min-h-[360px]
                  flex-col
                  items-center
                  justify-center

                  text-gray-400
                "
              >
                <MaterialIcon
                  name="progress_activity"
                  className="
                    animate-spin
                    text-[28px]
                  "
                />

                <p
                  className="
                    mt-2

                    text-[9px]
                    font-bold
                  "
                >
                  Loading
                  requests...
                </p>
              </div>
            ) : (
              <>
                {/* =======================================
                    SUBMITTED
                ======================================= */}

                {activeTab ===
                  "submitted" && (
                  <div
                    className="
                      mt-4
                      space-y-3
                    "
                  >
                    {requests.length >
                    0 ? (
                      requests.map(
                        (
                          request
                        ) => (
                          <SubmittedCard
                            key={
                              request._id
                            }
                            request={
                              request
                            }
                            onView={() =>
                              setSelectedRequest(
                                request
                              )
                            }
                          />
                        )
                      )
                    ) : (
                      <EmptyState
                        icon="inbox"
                        title="No submitted requests"
                        text="Requests you submit to the administrator will appear here."
                      />
                    )}
                  </div>
                )}

                {/* =======================================
                    DRAFTS
                ======================================= */}

                {activeTab ===
                  "drafts" && (
                  <div
                    className="
                      mt-4
                      space-y-3
                    "
                  >
                    {drafts.length >
                    0 ? (
                      drafts.map(
                        (
                          draft
                        ) => (
                          <DraftCard
                            key={
                              draft._id
                            }
                            draft={
                              draft
                            }
                            submitting={
                              submitting
                            }
                            deleting={
                              deletingDraft ===
                              draft._id
                            }
                            onEdit={() =>
                              continueEditingDraft(
                                draft
                              )
                            }
                            onSubmit={() =>
                              submitDraft(
                                draft
                              )
                            }
                            onDelete={() =>
                              deleteDraft(
                                draft
                              )
                            }
                          />
                        )
                      )
                    ) : (
                      <EmptyState
                        icon="draft"
                        title="No saved drafts"
                        text="Save an unfinished request and it will appear here."
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </motion.section>
        </div>
      </div>

      {/* =================================================
          DRAFT CONFIRMATION
      ================================================= */}

      {draftConfirm && (
        <DraftConfirmModal
          type={
            draftConfirm.type
          }
          draft={
            draftConfirm.draft
          }
          loading={
            draftConfirm.type ===
            "submit"
              ? submitting
              : deletingDraft ===
                draftConfirm
                  .draft
                  ._id
          }
          onClose={() => {
            if (
              submitting ||
              deletingDraft
            ) {
              return;
            }

            setDraftConfirm(
              null
            );
          }}
          onConfirm={() => {
            if (
              draftConfirm.type ===
              "submit"
            ) {
              submitDraft(
                draftConfirm.draft,
                true
              );

              return;
            }

            deleteDraft(
              draftConfirm.draft,
              true
            );
          }}
        />
      )}

      {/* =================================================
          REQUEST DETAILS
      ================================================= */}

      {selectedRequest && (
        <Modal
          onClose={() =>
            setSelectedRequest(
              null
            )
          }
        >
          <p
            className="
              text-[8px]
              font-black
              uppercase
              tracking-[0.15em]

              text-yellow-600
            "
          >
            Admin Request
          </p>

          <div
            className="
              mt-2

              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <h2
              className="
                text-[22px]
                font-black
                text-blue-950
              "
            >
              {selectedRequest
                .requestType ||
                selectedRequest
                  .subject ||
                "Admin Request"}
            </h2>

            <StatusBadge
              status={
                selectedRequest
                  .status
              }
            />
          </div>

          <div
            className="
              mt-5

              grid
              gap-3

              sm:grid-cols-2
            "
          >
            <InfoBox
              title="Related Booking"
              value={
                selectedRequest
                  .booking ||
                selectedRequest
                  .relatedBooking ||
                "No related booking"
              }
            />

            <InfoBox
              title="Submitted"
              value={formatDate(
                selectedRequest
                  .submittedAt ||
                  selectedRequest
                    .createdAt
              )}
            />
          </div>

          <div
            className="
              mt-4

              rounded-xl

              bg-gray-50

              p-4
            "
          >
            <p
              className="
                text-[8px]
                font-black
                uppercase
                tracking-wide

                text-gray-400
              "
            >
              Reason / Concern
            </p>

            <p
              className="
                mt-2

                whitespace-pre-line
                break-words

                text-[10px]
                leading-5
                text-gray-700
              "
            >
              {selectedRequest
                .reason ||
                selectedRequest
                  .message ||
                "No reason provided."}
            </p>
          </div>

          {selectedRequest
            .remarks && (
            <div
              className="
                mt-4

                rounded-xl

                bg-blue-50

                p-4
              "
            >
              <p
                className="
                  text-[8px]
                  font-black
                  uppercase
                  tracking-wide

                  text-blue-600
                "
              >
                Administrator
                Feedback
              </p>

              <p
                className="
                  mt-2

                  whitespace-pre-line
                  break-words

                  text-[10px]
                  leading-5
                  text-blue-900
                "
              >
                {
                  selectedRequest
                    .remarks
                }
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

/* =====================================================
   STATUS CARD
===================================================== */

function StatusCard({
  icon,
  title,
  value,
}) {
  return (
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
          justify-between
        "
      >
        <div>
          <p
            className="
              text-[7px]
              font-black
              uppercase
              tracking-[0.12em]

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

        <MaterialIcon
          name={
            icon
          }
          className="
            text-[22px]
            text-yellow-500
          "
        />
      </div>
    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({
  status,
}) {
  const normalized =
    normalizeStatus(
      status
    );

  const styles = {
    pending:
      "bg-yellow-100 text-yellow-700",

    approved:
      "bg-green-100 text-green-700",

    rejected:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`
        rounded-full

        px-2.5
        py-1

        text-[7px]
        font-black
        uppercase

        ${
          styles[
            normalized
          ] ||
          "bg-gray-100 text-gray-600"
        }
      `}
    >
      {prettyStatus(
        normalized
      )}
    </span>
  );
}

/* =====================================================
   SUBMITTED REQUEST CARD
===================================================== */

function SubmittedCard({
  request,
  onView,
}) {
  return (
    <div
      className="
        rounded-2xl

        border
        border-gray-200

        p-4
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3

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
                text-[11px]
                font-black
                text-blue-950
              "
            >
              {request
                .requestType ||
                request.subject ||
                "Admin Request"}
            </h3>

            <StatusBadge
              status={
                request.status
              }
            />
          </div>

          {request.booking && (
            <p
              className="
                mt-1

                text-[8px]
                font-bold
                text-blue-600
              "
            >
              {
                request.booking
              }
            </p>
          )}

          <p
            className="
              mt-2

              line-clamp-2

              text-[8px]
              leading-4
              text-gray-500
            "
          >
            {request.reason ||
              request.message ||
              "No reason provided."}
          </p>

          <p
            className="
              mt-2

              text-[7px]
              text-gray-400
            "
          >
            {formatDate(
              request
                .submittedAt ||
                request
                  .createdAt
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onView
          }
          className="
            flex
            shrink-0
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-gray-100

            px-4
            py-2.5

            text-[9px]
            font-black
            text-blue-950

            transition

            hover:bg-gray-200
          "
        >
          <MaterialIcon
            name="visibility"
            className="
              text-[16px]
            "
          />

          View Details
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   DRAFT CARD
===================================================== */

function DraftCard({
  draft,
  submitting,
  deleting,
  onEdit,
  onSubmit,
  onDelete,
}) {
  return (
    <div
      className="
        rounded-2xl

        border
        border-dashed
        border-gray-300

        bg-gray-50

        p-4
      "
    >
      <div
        className="
          flex
          items-center
          gap-2

          text-gray-500
        "
      >
        <MaterialIcon
          name="draft"
          className="
            text-[16px]
          "
        />

        <span
          className="
            text-[7px]
            font-black
            uppercase
            tracking-wide
          "
        >
          Draft
        </span>
      </div>

      <h3
        className="
          mt-2

          text-[11px]
          font-black
          text-blue-950
        "
      >
        {draft.requestType ||
          draft.subject ||
          "Untitled Draft"}
      </h3>

      {draft.booking && (
        <p
          className="
            mt-1

            text-[8px]
            font-bold
            text-blue-600
          "
        >
          {
            draft.booking
          }
        </p>
      )}

      <p
        className="
          mt-2

          line-clamp-2

          text-[8px]
          leading-4
          text-gray-500
        "
      >
        {draft.reason ||
          draft.message ||
          "No reason added yet."}
      </p>

      <p
        className="
          mt-3

          text-[7px]
          text-gray-400
        "
      >
        Last updated:{" "}
        {formatDate(
          draft
            .draftUpdatedAt ||
            draft.updatedAt ||
            draft.createdAt
        )}
      </p>

      <div
        className="
          mt-4

          grid
          gap-2

          sm:grid-cols-3
        "
      >
        <button
          type="button"
          onClick={
            onEdit
          }
          disabled={
            submitting ||
            deleting
          }
          className="
            flex
            h-10
            items-center
            justify-center
            gap-2

            rounded-xl

            border
            border-blue-200

            bg-blue-50

            text-[9px]
            font-black
            text-blue-700

            transition

            hover:bg-blue-100

            disabled:opacity-50
          "
        >
          <MaterialIcon
            name="edit"
            className="
              text-[16px]
            "
          />

          Edit
        </button>

        <button
          type="button"
          onClick={
            onSubmit
          }
          disabled={
            submitting ||
            deleting
          }
          className="
            flex
            h-10
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-yellow-400

            text-[9px]
            font-black
            text-blue-950

            transition

            hover:bg-yellow-500

            disabled:opacity-50
          "
        >
          <MaterialIcon
            name={
              submitting
                ? "progress_activity"
                : "send"
            }
            className={
              submitting
                ? "animate-spin text-[16px]"
                : "text-[16px]"
            }
          />

          {submitting
            ? "Submitting..."
            : "Submit"}
        </button>

        <button
          type="button"
          onClick={
            onDelete
          }
          disabled={
            submitting ||
            deleting
          }
          className="
            flex
            h-10
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-red-50

            text-[9px]
            font-black
            text-red-600

            transition

            hover:bg-red-100

            disabled:opacity-50
          "
        >
          <MaterialIcon
            name={
              deleting
                ? "progress_activity"
                : "delete"
            }
            className={
              deleting
                ? "animate-spin text-[16px]"
                : "text-[16px]"
            }
          />

          {deleting
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   EMPTY STATE
===================================================== */

function EmptyState({
  icon,
  title,
  text,
}) {
  return (
    <div
      className="
        flex
        min-h-[350px]
        flex-col
        items-center
        justify-center

        text-center
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center

          rounded-xl

          bg-gray-100

          text-gray-400
        "
      >
        <MaterialIcon
          name={
            icon
          }
          className="
            text-[22px]
          "
        />
      </div>

      <h3
        className="
          mt-3

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

          max-w-[280px]

          text-[7px]
          leading-4
          text-gray-400
        "
      >
        {text}
      </p>
    </div>
  );
}

/* =====================================================
   MESSAGE
===================================================== */

function MessageBox({
  type,
  text,
  onClose,
}) {
  const styles = {
    success:
      "border-green-200 bg-green-50 text-green-700",

    error:
      "border-red-200 bg-red-50 text-red-700",

    info:
      "border-blue-200 bg-blue-50 text-blue-700",
  };

  const icon =
    type ===
    "success"
      ? "check_circle"
      : type ===
          "error"
        ? "error"
        : "info";

  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-3

        rounded-xl

        border

        px-4
        py-3

        ${
          styles[type] ||
          styles.info
        }
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-2
        "
      >
        <MaterialIcon
          name={
            icon
          }
          className="
            shrink-0
            text-[17px]
          "
        />

        <p
          className="
            text-[8px]
            font-bold
          "
        >
          {text}
        </p>
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        className="
          shrink-0
        "
      >
        <MaterialIcon
          name="close"
          className="
            text-[17px]
          "
        />
      </button>
    </div>
  );
}

/* =====================================================
   INFO BOX
===================================================== */

function InfoBox({
  title,
  value,
}) {
  return (
    <div
      className="
        rounded-xl

        bg-gray-50

        p-4
      "
    >
      <p
        className="
          text-[7px]
          font-black
          uppercase
          tracking-wide

          text-gray-400
        "
      >
        {title}
      </p>

      <p
        className="
          mt-2

          whitespace-pre-line
          break-words

          text-[10px]
          leading-5
          text-gray-700
        "
      >
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   DRAFT CONFIRMATION MODAL
===================================================== */

function DraftConfirmModal({
  type,
  draft,
  loading,
  onClose,
  onConfirm,
}) {
  const isDelete =
    type ===
    "delete";

  const title =
    isDelete
      ? "Delete Draft?"
      : "Submit Draft?";

  const description =
    isDelete
      ? "This draft will be permanently deleted. This action cannot be undone."
      : "This draft will be submitted to the administrator for review. After submitting, it will no longer appear in your drafts.";

  const icon =
    isDelete
      ? "delete_forever"
      : "send";

  const buttonText =
    isDelete
      ? "Delete Draft"
      : "Submit Request";

  const requestType =
    draft?.requestType ||
    draft?.subject ||
    "Untitled Draft";

  return (
    <div
      className="
        fixed
        inset-0
        z-[12000]

        flex
        items-center
        justify-center

        bg-slate-950/65

        p-4

        backdrop-blur-sm
      "
      onMouseDown={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{
          opacity:
            0,

          scale:
            0.94,

          y:
            12,
        }}
        animate={{
          opacity:
            1,

          scale:
            1,

          y:
            0,
        }}
        transition={{
          duration:
            0.18,
        }}
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        className="
          w-full
          max-w-[430px]

          rounded-[22px]

          bg-white

          p-6

          shadow-2xl
        "
      >
        <div
          className={`
            flex
            h-14
            w-14
            items-center
            justify-center

            rounded-2xl

            ${
              isDelete
                ? "bg-red-100 text-red-600"
                : "bg-yellow-100 text-yellow-600"
            }
          `}
        >
          <MaterialIcon
            name={
              icon
            }
            className="
              text-[27px]
            "
          />
        </div>

        <h2
          className="
            mt-5

            text-[21px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-2

            text-[10px]
            leading-5
            text-gray-500
          "
        >
          {description}
        </p>

        <div
          className="
            mt-5

            rounded-xl

            border
            border-gray-200

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
              name="draft"
              className="
                text-[17px]
                text-blue-700
              "
            />

            <p
              className="
                text-[7px]
                font-black
                uppercase
                tracking-[0.12em]

                text-gray-400
              "
            >
              Draft
            </p>
          </div>

          <h3
            className="
              mt-2

              text-[12px]
              font-black
              text-blue-950
            "
          >
            {
              requestType
            }
          </h3>

          {draft?.booking && (
            <p
              className="
                mt-1

                text-[9px]
                text-blue-600
              "
            >
              {
                draft.booking
              }
            </p>
          )}

          {(draft?.reason ||
            draft?.message) && (
            <p
              className="
                mt-2

                line-clamp-2

                text-[9px]
                leading-4
                text-gray-500
              "
            >
              {draft.reason ||
                draft.message}
            </p>
          )}
        </div>

        {isDelete && (
          <div
            className="
              mt-4

              flex
              items-start
              gap-2

              rounded-xl

              border
              border-red-100

              bg-red-50

              px-3
              py-3

              text-[8px]
              font-bold
              leading-4
              text-red-600
            "
          >
            <MaterialIcon
              name="warning"
              className="
                mt-[1px]
                text-[16px]
              "
            />

            <span>
              Once deleted,
              this draft cannot
              be restored.
            </span>
          </div>
        )}

        <div
          className="
            mt-6

            grid
            grid-cols-2
            gap-3
          "
        >
          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onClose
            }
            className="
              flex
              items-center
              justify-center
              gap-2

              rounded-xl

              border
              border-gray-200

              bg-white

              py-3

              text-[10px]
              font-black
              text-gray-600

              transition

              hover:bg-gray-100

              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <MaterialIcon
              name="close"
              className="
                text-[17px]
              "
            />

            Cancel
          </button>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onConfirm
            }
            className={`
              flex
              items-center
              justify-center
              gap-2

              rounded-xl

              py-3

              text-[10px]
              font-black

              transition

              disabled:cursor-not-allowed
              disabled:opacity-60

              ${
                isDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-yellow-400 text-blue-950 hover:bg-yellow-500"
              }
            `}
          >
            {loading ? (
              <>
                <MaterialIcon
                  name="progress_activity"
                  className="
                    animate-spin
                    text-[17px]
                  "
                />

                {isDelete
                  ? "Deleting..."
                  : "Submitting..."}
              </>
            ) : (
              <>
                <MaterialIcon
                  name={
                    icon
                  }
                  className="
                    text-[17px]
                  "
                />

                {
                  buttonText
                }
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   MODAL
===================================================== */

function Modal({
  children,
  onClose,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[10000]

        flex
        items-center
        justify-center

        bg-slate-950/65

        p-4

        backdrop-blur-sm
      "
      onMouseDown={
        onClose
      }
    >
      <motion.div
        initial={{
          opacity:
            0,

          scale:
            0.96,

          y:
            10,
        }}
        animate={{
          opacity:
            1,

          scale:
            1,

          y:
            0,
        }}
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        className="
          relative

          max-h-[90vh]

          w-full
          max-w-[620px]

          overflow-y-auto

          rounded-[22px]

          bg-white

          p-6

          shadow-2xl
        "
      >
        <button
          type="button"
          onClick={
            onClose
          }
          className="
            absolute
            right-4
            top-4

            flex
            h-9
            w-9
            items-center
            justify-center

            rounded-full

            bg-gray-100

            text-gray-500

            transition

            hover:bg-gray-200
          "
        >
          <MaterialIcon
            name="close"
            className="
              text-[18px]
            "
          />
        </button>

        <div
          className="
            pr-8
          "
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}