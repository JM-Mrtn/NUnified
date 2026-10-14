import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name, className = "" }) {
  return (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function normalizeStatus(value) {
  return String(value || "pending")
    .trim()
    .toLowerCase();
}

function displayStatus(value) {
  const status = normalizeStatus(value);

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getRequests(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.requests)) {
    return data.requests;
  }

  return [];
}

function getArchives(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.archives)) {
    return data.archives;
  }

  return [];
}

function getTitle(request) {
  return (
    request?.subject ||
    request?.title ||
    request?.requestType ||
    request?.type ||
    request?.snapshot?.subject ||
    request?.snapshot?.title ||
    request?.snapshot?.requestType ||
    "Admin Request"
  );
}

function getOrganizationName(request) {
  return (
    request?.organization?.organizationName ||
    request?.organization?.name ||
    request?.snapshot?.organizationName ||
    "Organization"
  );
}

function getMessage(request) {
  return (
    request?.message ||
    request?.reason ||
    request?.snapshot?.message ||
    request?.snapshot?.reason ||
    "No message provided."
  );
}

function getBooking(request) {
  return (
    request?.booking ||
    request?.relatedBooking ||
    request?.snapshot?.booking ||
    request?.snapshot?.relatedBooking ||
    ""
  );
}

function getSubmittedDate(request, archived = false) {
  if (archived) {
    return (
      request?.snapshot?.submittedAt ||
      request?.submittedAt ||
      request?.originalCreatedAt ||
      request?.snapshot?.createdAt ||
      request?.createdAt
    );
  }

  return request?.submittedAt || request?.createdAt;
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

/* =====================================================
   MANAGE REQUEST PAGE
===================================================== */

export default function ManageRequest() {
  const [requests, setRequests] = useState([]);

  const [archives, setArchives] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [decision, setDecision] = useState(null);

  const [remarks, setRemarks] = useState("");

  /* ===================================================
     CUSTOM CONFIRM MODAL

     This replaces:
     window.confirm()
     alert()
  =================================================== */

  const [confirmAction, setConfirmAction] = useState(null);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     LOAD REQUESTS
  =================================================== */

  const loadRequests = async () => {
    const response = await api.get("/admin-requests");

    setRequests(getRequests(response.data));
  };

  /* ===================================================
     LOAD ARCHIVES
  =================================================== */

  const loadArchives = async () => {
    const response = await api.get("/admin-request-archive");

    setArchives(getArchives(response.data));
  };

  /* ===================================================
     LOAD EVERYTHING
  =================================================== */

  const loadAll = async () => {
    setLoading(true);

    setError("");

    try {
      await Promise.all([loadRequests(), loadArchives()]);
    } catch (err) {
      console.error("LOAD MANAGE REQUESTS ERROR:", err);

      setError(err.response?.data?.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ===================================================
     REQUEST COUNTS
  =================================================== */

  const pendingCount = requests.filter(
    (request) => normalizeStatus(request.status) === "pending",
  ).length;

  const approvedCount = requests.filter(
    (request) => normalizeStatus(request.status) === "approved",
  ).length;

  const rejectedCount = requests.filter(
    (request) => normalizeStatus(request.status) === "rejected",
  ).length;

  const statistics = [
    {
      label: "Total Requests",

      value: requests.length,

      icon: "assignment",
    },

    {
      label: "Pending",

      value: pendingCount,

      icon: "pending_actions",
    },

    {
      label: "Approved",

      value: approvedCount,

      icon: "check_circle",
    },

    {
      label: "Rejected",

      value: rejectedCount,

      icon: "cancel",
    },
  ];

  const filters = [
    {
      label: "All",

      value: "all",

      icon: "format_list_bulleted",

      count: requests.length,
    },

    {
      label: "Pending",

      value: "pending",

      icon: "pending_actions",

      count: pendingCount,
    },

    {
      label: "Approved",

      value: "approved",

      icon: "check_circle",

      count: approvedCount,
    },

    {
      label: "Rejected",

      value: "rejected",

      icon: "cancel",

      count: rejectedCount,
    },

    {
      label: "Archives",

      value: "archive",

      icon: "inventory_2",

      count: archives.length,
    },
  ];

  const showingArchive = statusFilter === "archive";

  /* ===================================================
     FILTER REQUESTS
  =================================================== */

  const filteredRequests = useMemo(() => {
    const source = showingArchive ? archives : requests;

    const keyword = search.trim().toLowerCase();

    return source.filter((request) => {
      const title = getTitle(request);

      const organization = getOrganizationName(request);

      const message = getMessage(request);

      const booking = getBooking(request);

      const matchesSearch =
        !keyword ||
        String(title).toLowerCase().includes(keyword) ||
        String(organization).toLowerCase().includes(keyword) ||
        String(message).toLowerCase().includes(keyword) ||
        String(booking).toLowerCase().includes(keyword);

      if (!matchesSearch) {
        return false;
      }

      if (showingArchive) {
        return true;
      }

      if (statusFilter === "all") {
        return true;
      }

      return normalizeStatus(request.status) === statusFilter;
    });
  }, [requests, archives, search, statusFilter, showingArchive]);

  /* ===================================================
     APPROVE / REJECT
  =================================================== */

  const updateRequest = async () => {
    if (!decision) {
      return;
    }

    /* ===============================================
         NO MORE alert()
      =============================================== */

    if (!remarks.trim()) {
      setError("Please enter administrator feedback.");

      return;
    }

    const id = String(decision.request._id);

    setActionLoading(id);

    setError("");

    setSuccess("");

    try {
      const response = await api.patch(
        `/admin-requests/${decision.request._id}/status`,
        {
          status: decision.status,

          remarks: remarks.trim(),
        },
      );

      const actionStatus = decision.status;

      setDecision(null);

      setRemarks("");

      setSelectedRequest(null);

      setSuccess(
        response.data?.message ||
          `Request ${displayStatus(actionStatus).toLowerCase()} successfully.`,
      );

      await loadRequests();
    } catch (err) {
      console.error("UPDATE REQUEST ERROR:", err);

      setError(err.response?.data?.message || "Unable to update request.");
    } finally {
      setActionLoading("");
    }
  };

  /* ===================================================
     OPEN CUSTOM CONFIRMATION
  =================================================== */

  const openArchiveConfirmation = (request) => {
    setConfirmAction({
      type: "archive",

      request,
    });
  };

  const openRestoreConfirmation = (request) => {
    setConfirmAction({
      type: "restore",

      request,
    });
  };

  const openDeleteConfirmation = (request) => {
    setConfirmAction({
      type: "delete",

      request,
    });
  };

  /* ===================================================
     ARCHIVE REQUEST

     NO window.confirm()
  =================================================== */

  const archiveRequest = async (request) => {
    const id = String(request._id);

    setActionLoading(id);

    setError("");

    setSuccess("");

    try {
      const response = await api.post(`/admin-request-archive/${request._id}`);

      setConfirmAction(null);

      setSelectedRequest(null);

      setSuccess(response.data?.message || "Request archived successfully.");

      await Promise.all([loadRequests(), loadArchives()]);
    } catch (err) {
      console.error("ARCHIVE REQUEST ERROR:", err);

      setError(err.response?.data?.message || "Unable to archive request.");
    } finally {
      setActionLoading("");
    }
  };

  /* ===================================================
     RESTORE REQUEST

     NO window.confirm()
  =================================================== */

  const restoreRequest = async (archive) => {
    const id = String(archive._id);

    setActionLoading(id);

    setError("");

    setSuccess("");

    try {
      const response = await api.post(
        `/admin-request-archive/${archive._id}/restore`,
      );

      setConfirmAction(null);

      setSelectedRequest(null);

      setSuccess(response.data?.message || "Request restored successfully.");

      await Promise.all([loadRequests(), loadArchives()]);
    } catch (err) {
      console.error("RESTORE REQUEST ERROR:", err);

      setError(err.response?.data?.message || "Unable to restore request.");
    } finally {
      setActionLoading("");
    }
  };

  /* ===================================================
     DELETE ARCHIVE

     NO window.confirm()
  =================================================== */

  const deleteArchive = async (archive) => {
    const id = String(archive._id);

    setActionLoading(id);

    setError("");

    setSuccess("");

    try {
      const response = await api.delete(
        `/admin-request-archive/${archive._id}`,
      );

      setConfirmAction(null);

      setSelectedRequest(null);

      setSuccess(
        response.data?.message || "Archived request deleted permanently.",
      );

      await loadArchives();
    } catch (err) {
      console.error("DELETE ARCHIVE ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to delete archived request.",
      );
    } finally {
      setActionLoading("");
    }
  };

  /* ===================================================
     CONFIRM CUSTOM MODAL ACTION
  =================================================== */

  const confirmCustomAction = async () => {
    if (!confirmAction?.request) {
      return;
    }

    if (confirmAction.type === "archive") {
      await archiveRequest(confirmAction.request);

      return;
    }

    if (confirmAction.type === "restore") {
      await restoreRequest(confirmAction.request);

      return;
    }

    if (confirmAction.type === "delete") {
      await deleteArchive(confirmAction.request);
    }
  };

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <>
      <div
        className="
          space-y-6
        "
      >
        {/* =============================================
            PAGE HEADER
        ============================================= */}

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
            Manage Requests
          </h1>

          <p
            className="
              mt-1.5
              text-[11px]
              text-blue-100
            "
          >
            Review organization requests and send feedback directly to the
            organization.
          </p>
        </motion.div>

        {/* =============================================
            SUCCESS MESSAGE
        ============================================= */}

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

        {/* =============================================
            ERROR MESSAGE
        ============================================= */}

        {error && (
          <div
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
              text-[11px]
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
              <MaterialIcon name="error" />

              {error}
            </div>

            <button type="button" onClick={() => setError("")}>
              <MaterialIcon name="close" />
            </button>
          </div>
        )}

        {/* =============================================
            STATISTICS
        ============================================= */}

        <div
          className="
            grid
            grid-cols-2
            gap-3
            lg:grid-cols-4
          "
        >
          {statistics.map((item) => (
            <motion.div
              key={item.label}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
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
            </motion.div>
          ))}
        </div>

        {/* =============================================
            SEARCH + FILTER
        ============================================= */}

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
              gap-3
              rounded-xl
              bg-gray-100
              px-4
            "
          >
            <MaterialIcon
              name="search"
              className="
                text-blue-950
              "
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                showingArchive
                  ? "Search archived requests..."
                  : "Search requests..."
              }
              className="
                h-11
                w-full
                bg-transparent
                text-[11px]
                outline-none
              "
            />

            <button
              type="button"
              onClick={loadAll}
              className="
                flex
                items-center
                gap-1.5
                rounded-lg
                px-2
                py-1.5
                text-[9px]
                font-black
                text-blue-950
                transition
                hover:bg-white
              "
            >
              <MaterialIcon name="refresh" />
              Refresh
            </button>
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
                  onClick={() => {
                    setStatusFilter(item.value);

                    setSearch("");
                  }}
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

        {/* =============================================
            REQUEST LIST
        ============================================= */}

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
              flex-wrap
              items-center
              justify-between
              gap-3
            "
          >
            <div>
              <h2
                className="
                  text-[15px]
                  font-black
                  text-blue-950
                "
              >
                {showingArchive ? "Archived Requests" : "Organization Requests"}
              </h2>

              <p
                className="
                  mt-1
                  text-[8px]
                  text-gray-400
                "
              >
                {filteredRequests.length} request(s)
              </p>
            </div>

            {showingArchive && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-yellow-50
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  text-yellow-700
                "
              >
                <MaterialIcon name="inventory_2" />
                Archives
              </div>
            )}
          </div>

          {/* ===========================================
              LOADING
          =========================================== */}

          {loading ? (
            <div
              className="
                py-16
                text-center
                text-gray-500
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
                  text-[11px]
                "
              >
                Loading requests...
              </p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div
              className="
                mt-4
                space-y-3
              "
            >
              {filteredRequests.map((request) => {
                const status = normalizeStatus(request.status);

                const busy = actionLoading === String(request._id);

                return (
                  <motion.div
                    key={request._id}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
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
                      {/* =================================
                            REQUEST INFO
                        ================================= */}

                      <div
                        className="
                            min-w-0
                            flex-1
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
                                text-[14px]
                                font-black
                                text-blue-950
                              "
                          >
                            {getTitle(request)}
                          </h3>

                          <StatusBadge status={status} />

                          {showingArchive && (
                            <span
                              className="
                                  rounded-full
                                  bg-gray-200
                                  px-2.5
                                  py-1
                                  text-[8px]
                                  font-black
                                  text-gray-600
                                "
                            >
                              Archived
                            </span>
                          )}
                        </div>

                        <p
                          className="
                              mt-1
                              text-[9px]
                              font-black
                              uppercase
                              text-blue-700
                            "
                        >
                          {getOrganizationName(request)}
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
                            icon="calendar_month"
                            text={formatDate(
                              getSubmittedDate(request, showingArchive),
                            )}
                          />

                          {getBooking(request) && (
                            <Meta icon="event" text={getBooking(request)} />
                          )}

                          {showingArchive && (
                            <Meta
                              icon="inventory_2"
                              text={`Archived ${formatDate(
                                request.archivedAt,
                              )}`}
                            />
                          )}
                        </div>

                        {request.remarks && (
                          <div
                            className={`
                                mt-3
                                inline-flex
                                max-w-full
                                rounded-lg
                                px-3
                                py-2
                                text-[8px]

                                ${
                                  status === "approved"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }
                              `}
                          >
                            <strong>Feedback:</strong>

                            <span
                              className="
                                  ml-1
                                "
                            >
                              {request.remarks}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* =================================
                            ACTION BUTTONS
                        ================================= */}

                      <div
                        className="
                            flex
                            shrink-0
                            flex-wrap
                            gap-2
                          "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRequest({
                              ...request,

                              _archived: showingArchive,
                            })
                          }
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
                              transition
                              hover:bg-gray-200
                            "
                        >
                          <MaterialIcon name="visibility" />
                          View Details
                        </button>

                        {/* ==============================
                              PENDING ACTIONS
                          ============================== */}

                        {!showingArchive && status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setError("");

                                setRemarks("");

                                setDecision({
                                  request,

                                  status: "approved",
                                });
                              }}
                              className="
                                    flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    bg-green-50
                                    px-4
                                    py-2.5
                                    text-[10px]
                                    font-bold
                                    text-green-700
                                    transition
                                    hover:bg-green-100
                                  "
                            >
                              <MaterialIcon name="check_circle" />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setError("");

                                setRemarks("");

                                setDecision({
                                  request,

                                  status: "rejected",
                                });
                              }}
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
                                    transition
                                    hover:bg-red-100
                                  "
                            >
                              <MaterialIcon name="cancel" />
                              Reject
                            </button>
                          </>
                        )}

                        {/* ==============================
                              ARCHIVE BUTTON
                          ============================== */}

                        {!showingArchive &&
                          ["approved", "rejected"].includes(status) && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openArchiveConfirmation(request)}
                              className="
                                  flex
                                  items-center
                                  gap-2
                                  rounded-xl
                                  bg-yellow-50
                                  px-4
                                  py-2.5
                                  text-[10px]
                                  font-bold
                                  text-yellow-700
                                  transition
                                  hover:bg-yellow-100
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                            >
                              <MaterialIcon name="archive" />
                              Archive
                            </button>
                          )}

                        {/* ==============================
                              ARCHIVED ACTIONS
                          ============================== */}

                        {showingArchive && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openRestoreConfirmation(request)}
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
                                  transition
                                  hover:bg-blue-100
                                  disabled:opacity-50
                                "
                            >
                              <MaterialIcon name="restore" />
                              Restore
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openDeleteConfirmation(request)}
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
                                  transition
                                  hover:bg-red-100
                                  disabled:opacity-50
                                "
                            >
                              <MaterialIcon name="delete" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* ===========================================
               EMPTY
            =========================================== */

            <div
              className="
                py-16
                text-center
                text-gray-400
              "
            >
              <MaterialIcon
                name={showingArchive ? "inventory_2" : "inbox"}
                className="
                  text-[36px]
                "
              />

              <p
                className="
                  mt-2
                  text-[11px]
                  font-bold
                "
              >
                {showingArchive
                  ? "No archived requests found."
                  : "No requests found."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          VIEW DETAILS MODAL
      ================================================= */}

      {selectedRequest && (
        <Modal onClose={() => setSelectedRequest(null)}>
          <p
            className="
              text-[8px]
              font-black
              uppercase
              tracking-[0.15em]
              text-yellow-600
            "
          >
            {selectedRequest._archived
              ? "Archived Request"
              : "Organization Request"}
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
              {getTitle(selectedRequest)}
            </h2>

            <StatusBadge status={selectedRequest.status} />
          </div>

          <p
            className="
              mt-1
              text-[10px]
              font-black
              uppercase
              text-blue-700
            "
          >
            {getOrganizationName(selectedRequest)}
          </p>

          <div
            className="
              mt-6
              rounded-2xl
              bg-gray-100
              p-5
            "
          >
            <p
              className="
                text-[8px]
                font-black
                uppercase
                text-gray-400
              "
            >
              Message / Reason
            </p>

            <p
              className="
                mt-3
                whitespace-pre-line
                text-[11px]
                leading-6
                text-gray-700
              "
            >
              {getMessage(selectedRequest)}
            </p>
          </div>

          <div
            className="
              mt-4
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            <InfoBox
              label="Submitted"
              value={formatDate(
                getSubmittedDate(selectedRequest, selectedRequest._archived),
              )}
            />

            <InfoBox
              label="Related Booking"
              value={getBooking(selectedRequest) || "No related booking"}
            />
          </div>

          {selectedRequest.remarks && (
            <div
              className="
                mt-4
                rounded-2xl
                bg-yellow-50
                p-4
              "
            >
              <p
                className="
                  text-[8px]
                  font-black
                  uppercase
                  text-yellow-700
                "
              >
                Administrator Feedback
              </p>

              <p
                className="
                  mt-2
                  whitespace-pre-line
                  text-[11px]
                  text-yellow-800
                "
              >
                {selectedRequest.remarks}
              </p>
            </div>
          )}

          {/* =============================================
              PENDING DETAILS ACTION
          ============================================= */}

          {!selectedRequest._archived &&
            normalizeStatus(selectedRequest.status) === "pending" && (
              <div
                className="
                  mt-5
                  grid
                  gap-2
                  sm:grid-cols-2
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setError("");

                    setRemarks("");

                    setDecision({
                      request: selectedRequest,

                      status: "approved",
                    });
                  }}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-green-600
                    py-3
                    text-[10px]
                    font-black
                    text-white
                  "
                >
                  <MaterialIcon name="check_circle" />
                  Approve Request
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");

                    setRemarks("");

                    setDecision({
                      request: selectedRequest,

                      status: "rejected",
                    });
                  }}
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
                  "
                >
                  <MaterialIcon name="cancel" />
                  Reject Request
                </button>
              </div>
            )}

          {/* =============================================
              ARCHIVE FROM DETAILS
          ============================================= */}

          {!selectedRequest._archived &&
            ["approved", "rejected"].includes(
              normalizeStatus(selectedRequest.status),
            ) && (
              <button
                type="button"
                onClick={() => openArchiveConfirmation(selectedRequest)}
                className="
                  mt-5
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-yellow-400
                  py-3
                  text-[10px]
                  font-black
                  text-blue-950
                  transition
                  hover:bg-yellow-500
                "
              >
                <MaterialIcon name="archive" />
                Archive Request
              </button>
            )}

          {/* =============================================
              ARCHIVED DETAILS ACTIONS
          ============================================= */}

          {selectedRequest._archived && (
            <div
              className="
                mt-5
                grid
                gap-2
                sm:grid-cols-2
              "
            >
              <button
                type="button"
                onClick={() => openRestoreConfirmation(selectedRequest)}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  py-3
                  text-[10px]
                  font-black
                  text-white
                  transition
                  hover:bg-blue-700
                "
              >
                <MaterialIcon name="restore" />
                Restore Request
              </button>

              <button
                type="button"
                onClick={() => openDeleteConfirmation(selectedRequest)}
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
                <MaterialIcon name="delete_forever" />
                Delete Permanently
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* =================================================
          APPROVE / REJECT MODAL
      ================================================= */}

      {decision && (
        <Modal
          onClose={() => {
            if (actionLoading) {
              return;
            }

            setDecision(null);

            setRemarks("");

            setError("");
          }}
        >
          <div
            className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl

              ${
                decision.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }
            `}
          >
            <MaterialIcon
              name={decision.status === "approved" ? "check_circle" : "cancel"}
            />
          </div>

          <h2
            className="
              mt-4
              text-[22px]
              font-black
              text-blue-950
            "
          >
            {decision.status === "approved"
              ? "Approve Request"
              : "Reject Request"}
          </h2>

          <p
            className="
              mt-2
              text-[11px]
              text-gray-500
            "
          >
            {getTitle(decision.request)}
          </p>

          <label
            className="
              mt-5
              block
              text-[9px]
              font-black
              uppercase
              text-blue-950
            "
          >
            Administrator Feedback *
          </label>

          <textarea
            value={remarks}
            onChange={(event) => {
              setRemarks(event.target.value);

              if (error) {
                setError("");
              }
            }}
            rows="5"
            placeholder={
              decision.status === "approved"
                ? "Enter approval feedback..."
                : "Enter rejection reason..."
            }
            className="
              mt-2
              w-full
              resize-none
              rounded-xl
              border
              border-gray-200
              bg-gray-50
              p-4
              text-[11px]
              outline-none
              transition
              focus:border-yellow-400
              focus:ring-2
              focus:ring-yellow-400/30
            "
          />

          {!remarks.trim() &&
            error === "Please enter administrator feedback." && (
              <div
                className="
                  mt-2
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-red-50
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  text-red-600
                "
              >
                <MaterialIcon name="error" />
                Please enter administrator feedback.
              </div>
            )}

          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={updateRequest}
            className={`
              mt-5
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              py-3
              text-[11px]
              font-black
              text-white
              transition
              disabled:cursor-not-allowed
              disabled:opacity-60

              ${
                decision.status === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            `}
          >
            {actionLoading && (
              <MaterialIcon
                name="progress_activity"
                className="
                  animate-spin
                "
              />
            )}
            Confirm {displayStatus(decision.status)}
          </button>
        </Modal>
      )}

      {/* =================================================
          CUSTOM CONFIRMATION MODAL

          THIS REMOVES "LOCALHOST SAYS"
      ================================================= */}

      {confirmAction && (
        <ConfirmModal
          type={confirmAction.type}
          request={confirmAction.request}
          loading={Boolean(actionLoading)}
          onCancel={() => {
            if (actionLoading) {
              return;
            }

            setConfirmAction(null);
          }}
          onConfirm={confirmCustomAction}
        />
      )}
    </>
  );
}

/* =====================================================
   CUSTOM CONFIRM MODAL
===================================================== */

function ConfirmModal({ type, request, loading, onCancel, onConfirm }) {
  let icon = "help";

  let iconStyle = "bg-blue-100 text-blue-700";

  let title = "Confirm Action";

  let description = "";

  let buttonText = "Confirm";

  let buttonStyle = "bg-blue-600 hover:bg-blue-700";

  /* ===================================================
     ARCHIVE
  =================================================== */

  if (type === "archive") {
    icon = "archive";

    iconStyle = "bg-yellow-100 text-yellow-700";

    title = "Archive Request?";

    description =
      "This request will be moved to Archives. You can restore it later.";

    buttonText = "Archive Request";

    buttonStyle = "bg-yellow-400 text-blue-950 hover:bg-yellow-500";
  }

  /* ===================================================
     RESTORE
  =================================================== */

  if (type === "restore") {
    icon = "restore";

    iconStyle = "bg-blue-100 text-blue-700";

    title = "Restore Request?";

    description =
      "This request will be restored and returned to Manage Requests.";

    buttonText = "Restore Request";

    buttonStyle = "bg-blue-600 text-white hover:bg-blue-700";
  }

  /* ===================================================
     DELETE
  =================================================== */

  if (type === "delete") {
    icon = "delete_forever";

    iconStyle = "bg-red-100 text-red-700";

    title = "Delete Permanently?";

    description =
      "This archived request will be permanently deleted. This action cannot be undone.";

    buttonText = "Delete Permanently";

    buttonStyle = "bg-red-600 text-white hover:bg-red-700";
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[6000]
        flex
        items-center
        justify-center
        bg-black/60
        p-4
        backdrop-blur-sm
      "
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.92,
          y: 15,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.18,
        }}
        className="
          w-full
          max-w-[430px]
          rounded-[22px]
          bg-white
          p-6
          shadow-2xl
        "
      >
        {/* =============================================
            ICON
        ============================================= */}

        <div
          className={`
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            ${iconStyle}
          `}
        >
          <MaterialIcon
            name={icon}
            className="
              text-[28px]
            "
          />
        </div>

        {/* =============================================
            TITLE
        ============================================= */}

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

        {/* =============================================
            REQUEST
        ============================================= */}

        <div
          className="
            mt-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50
            p-3
          "
        >
          <p
            className="
              text-[11px]
              font-black
              text-blue-950
            "
          >
            {getTitle(request)}
          </p>

          <p
            className="
              mt-1
              text-[9px]
              font-bold
              uppercase
              text-blue-600
            "
          >
            {getOrganizationName(request)}
          </p>
        </div>

        {/* =============================================
            DESCRIPTION
        ============================================= */}

        <p
          className="
            mt-4
            text-[11px]
            leading-5
            text-gray-500
          "
        >
          {description}
        </p>

        {/* =============================================
            BUTTONS
        ============================================= */}

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
            disabled={loading}
            onClick={onCancel}
            className="
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
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
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
              ${buttonStyle}
            `}
          >
            {loading ? (
              <>
                <MaterialIcon
                  name="progress_activity"
                  className="
                    animate-spin
                  "
                />
                Processing...
              </>
            ) : (
              <>
                <MaterialIcon name={icon} />

                {buttonText}
              </>
            )}
          </button>
        </div>
      </motion.div>
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
  };

  return (
    <span
      className={`
        rounded-full
        px-3
        py-1
        text-[8px]
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
   INFO BOX
===================================================== */

function InfoBox({ label, value }) {
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
          text-gray-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          break-words
          text-[10px]
          font-bold
          text-blue-950
        "
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* =====================================================
   GENERAL MODAL
===================================================== */

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
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
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            bg-gray-100
            text-blue-950
            transition
            hover:bg-gray-200
          "
        >
          <MaterialIcon name="close" />
        </button>

        <div
          className="
            pr-10
          "
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
