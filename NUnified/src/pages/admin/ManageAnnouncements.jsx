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

function normalizeStatus(value) {
  return String(value || "pending")
    .trim()
    .toLowerCase();
}

function displayStatus(value) {
  const status = normalizeStatus(value);

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const raw = String(value).slice(0, 10);

  const parts = raw.split("-");

  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getOrganizationName(post) {
  return post?.organization?.organizationName || "Organization";
}

function getOrganizationAcronym(post) {
  return post?.organization?.acronym || "";
}

function getOrganizationColor(post) {
  return post?.organization?.color || "#FACC15";
}

/* =====================================================
   PAGE
===================================================== */

export default function ManageAnnouncements() {
  const [posts, setPosts] = useState([]);

  const [archivedPosts, setArchivedPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [archiveLoading, setArchiveLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("pending");

  const [selectedPost, setSelectedPost] = useState(null);

  const [decision, setDecision] = useState(null);

  const [remarks, setRemarks] = useState("");

  const [updating, setUpdating] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);

  const [restoreTarget, setRestoreTarget] = useState(null);

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);

  /* ===================================================
     LOAD ACTIVE POSTS
  =================================================== */

  const loadPosts = async () => {
    setLoading(true);

    try {
      const response = await api.get("/announcements/admin");

      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Admin post review error:", err);

      setError(
        err.response?.data?.message || "Unable to load post submissions.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================
     LOAD ARCHIVE
  =================================================== */

  const loadArchive = async () => {
    setArchiveLoading(true);

    try {
      const response = await api.get("/announcement-archive");

      setArchivedPosts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Load archive error:", err);

      setError(err.response?.data?.message || "Unable to load archived posts.");
    } finally {
      setArchiveLoading(false);
    }
  };

  const reloadEverything = async () => {
    await Promise.all([loadPosts(), loadArchive()]);
  };

  useEffect(() => {
    reloadEverything();
  }, []);

  /* ===================================================
     COUNTS
  =================================================== */

  const counts = useMemo(
    () => ({
      all: posts.length,

      pending: posts.filter(
        (post) => normalizeStatus(post.status) === "pending",
      ).length,

      approved: posts.filter(
        (post) => normalizeStatus(post.status) === "approved",
      ).length,

      rejected: posts.filter(
        (post) => normalizeStatus(post.status) === "rejected",
      ).length,

      archive: archivedPosts.length,
    }),
    [posts, archivedPosts],
  );

  /* ===================================================
     FILTER POSTS
  =================================================== */

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const source = filter === "archive" ? archivedPosts : posts;

    return source.filter((post) => {
      const organization = getOrganizationName(post);

      const acronym = getOrganizationAcronym(post);

      const matchesSearch =
        !query ||
        String(post.title || "")
          .toLowerCase()
          .includes(query) ||
        String(organization).toLowerCase().includes(query) ||
        String(acronym).toLowerCase().includes(query) ||
        String(post.type || "")
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "archive") {
        return true;
      }

      if (filter === "all") {
        return true;
      }

      return normalizeStatus(post.status) === filter;
    });
  }, [posts, archivedPosts, search, filter]);

  /* ===================================================
     APPROVE / REJECT
  =================================================== */

  const submitDecision = async () => {
    if (!decision?.post) {
      return;
    }

    if (decision.status === "rejected" && !remarks.trim()) {
      setError("Please enter a reason before rejecting the post.");

      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/announcements/${decision.post._id}/status`,
        {
          status: decision.status,

          adminRemarks: remarks.trim(),
        },
      );

      setSuccess(
        response.data?.message || "Post review completed successfully.",
      );

      setDecision(null);
      setRemarks("");
      setSelectedPost(null);

      await loadPosts();
    } catch (err) {
      console.error("Review post error:", err);

      setError(err.response?.data?.message || "Unable to review post.");
    } finally {
      setUpdating(false);
    }
  };

  /* ===================================================
     MOVE TO ARCHIVE
  =================================================== */

  const archivePost = async () => {
    if (!archiveTarget) {
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/announcement-archive/${archiveTarget._id}`,
      );

      setSuccess(
        response.data?.message || "Post moved to Archive successfully.",
      );

      setArchiveTarget(null);
      setSelectedPost(null);

      await reloadEverything();
    } catch (err) {
      console.error("Archive post error:", err);

      setError(
        err.response?.data?.message || "Unable to move post to Archive.",
      );
    } finally {
      setUpdating(false);
    }
  };

  /* ===================================================
     RESTORE
  =================================================== */

  const restorePost = async () => {
    if (!restoreTarget?.archiveId) {
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/announcement-archive/${restoreTarget.archiveId}/restore`,
      );

      setSuccess(response.data?.message || "Post restored successfully.");

      setRestoreTarget(null);
      setSelectedPost(null);

      await reloadEverything();
    } catch (err) {
      console.error("Restore post error:", err);

      setError(
        err.response?.data?.message || "Unable to restore archived post.",
      );
    } finally {
      setUpdating(false);
    }
  };

  /* ===================================================
     PERMANENT DELETE
  =================================================== */

  const permanentlyDeletePost = async () => {
    if (!permanentDeleteTarget?.archiveId) {
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/announcement-archive/${permanentDeleteTarget.archiveId}`,
      );

      setSuccess(
        response.data?.message || "Archived post permanently deleted.",
      );

      setPermanentDeleteTarget(null);

      setSelectedPost(null);

      await loadArchive();
    } catch (err) {
      console.error("Permanent delete error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to permanently delete archived post.",
      );
    } finally {
      setUpdating(false);
    }
  };

  /* ===================================================
     FILTER BUTTONS
  =================================================== */

  const filters = [
    {
      value: "all",
      label: "All Posts",
      count: counts.all,
      icon: "format_list_bulleted",
    },

    {
      value: "pending",
      label: "Pending Review",
      count: counts.pending,
      icon: "pending_actions",
    },

    {
      value: "approved",
      label: "Approved",
      count: counts.approved,
      icon: "check_circle",
    },

    {
      value: "rejected",
      label: "Rejected",
      count: counts.rejected,
      icon: "cancel",
    },

    {
      value: "archive",
      label: "Archive",
      count: counts.archive,
      icon: "archive",
    },
  ];

  const currentLoading = filter === "archive" ? archiveLoading : loading;

  return (
    <>
      <div className="mx-auto w-full max-w-[1050px] space-y-5">
        {/* =================================================
            HEADER
        ================================================= */}

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
            Post Review
          </h1>

          <p
            className="
              mt-1.5
              text-[11px]
              text-blue-100
            "
          >
            Review announcements and news submitted by campus organizations
            before they are published to students.
          </p>
        </motion.div>

        {/* =================================================
            FEEDBACK
        ================================================= */}

        {success && (
          <Feedback
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {error && (
          <Feedback type="error" message={error} onClose={() => setError("")} />
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div
          className="
            mx-auto
            grid
            w-full
            max-w-[1000px]
            grid-cols-2
            gap-3
            xl:grid-cols-4
          "
        >
          <StatCard icon="newspaper" label="Total Posts" value={counts.all} />

          <StatCard
            icon="pending_actions"
            label="Pending Review"
            value={counts.pending}
          />

          <StatCard
            icon="check_circle"
            label="Approved"
            value={counts.approved}
          />

          <StatCard icon="cancel" label="Rejected" value={counts.rejected} />
        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div
          className="
            mx-auto
            w-full
            max-w-[1000px]
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
              placeholder="Search post, organization, or type..."
              className="
                w-full
                bg-transparent
                py-3
                outline-none
              "
            />

            {search && (
              <button type="button" onClick={() => setSearch("")}>
                <MaterialIcon name="close" />
              </button>
            )}
          </div>

          <div
            className="
              mt-3
              flex
              gap-2
              overflow-x-auto
              pb-1
            "
          >
            {filters.map((item) => {
              const active = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`
                      flex
                      shrink-0
                      items-center
                      gap-2

                      rounded-[10px]

                      px-3
                      py-2

                      text-[11px]
                      font-black

                      transition

                      ${
                        active
                          ? `
                            bg-blue-950
                            text-white
                          `
                          : `
                            bg-gray-100
                            text-gray-600

                            hover:bg-blue-50
                            hover:text-blue-950
                          `
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
                        text-[11px]

                        ${
                          active
                            ? `
                              bg-yellow-400
                              text-blue-950
                            `
                            : `
                              bg-white
                              text-gray-600
                            `
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

        {/* =================================================
            POSTS / ARCHIVE
        ================================================= */}

        <div
          className="
            mx-auto
            w-full
            max-w-[1000px]
            rounded-2xl
            bg-white
            p-4
            shadow-sm
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
              {filter === "pending"
                ? "Pending Post Reviews"
                : filter === "approved"
                  ? "Approved Posts"
                  : filter === "rejected"
                    ? "Rejected Posts"
                    : filter === "archive"
                      ? "Archived Posts"
                      : "All Post Submissions"}
            </h2>

            <p
              className="
                mt-1
                text-[10px]
                text-gray-500
              "
            >
              {filteredPosts.length} post
              {filteredPosts.length === 1 ? "" : "s"}
              {filter === "archive" && " stored in Archive"}
            </p>
          </div>

          {filter === "archive" && (
            <div
              className="
                mt-3
                flex
                items-start
                gap-2

                rounded-xl

                border
                border-blue-100

                bg-blue-50

                p-3

                text-[10px]
                text-blue-800
              "
            >
              <MaterialIcon name="info" />

              <p>
                Archived posts are hidden from the normal post list and from
                students. You can restore them or permanently delete them here.
              </p>
            </div>
          )}

          {currentLoading ? (
            <div
              className="
                py-16
                text-center
                text-gray-500
              "
            >
              {filter === "archive"
                ? "Loading Archive..."
                : "Loading post submissions..."}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div
              className="
                mt-4
                space-y-3
              "
            >
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.isArchived ? post.archiveId : post._id}
                  post={post}
                  onView={() => setSelectedPost(post)}
                  onArchive={() => setArchiveTarget(post)}
                  onRestore={() => setRestoreTarget(post)}
                  onPermanentDelete={() => setPermanentDeleteTarget(post)}
                />
              ))}
            </div>
          ) : (
            <EmptyState archived={filter === "archive"} />
          )}
        </div>
      </div>

      {/* =================================================
          POST DETAILS MODAL
      ================================================= */}

      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onApprove={() => {
            setDecision({
              post: selectedPost,

              status: "approved",
            });

            setRemarks("");
          }}
          onReject={() => {
            setDecision({
              post: selectedPost,

              status: "rejected",
            });

            setRemarks("");
          }}
          onArchive={() => setArchiveTarget(selectedPost)}
          onRestore={() => setRestoreTarget(selectedPost)}
          onPermanentDelete={() => setPermanentDeleteTarget(selectedPost)}
        />
      )}

      {/* =================================================
          APPROVE / REJECT
      ================================================= */}

      {decision && (
        <DecisionModal
          decision={decision}
          remarks={remarks}
          setRemarks={setRemarks}
          updating={updating}
          onClose={() => !updating && setDecision(null)}
          onConfirm={submitDecision}
        />
      )}

      {/* =================================================
          MOVE TO ARCHIVE CONFIRMATION
      ================================================= */}

      {archiveTarget && (
        <ConfirmActionModal
          icon="archive"
          iconClass="
            bg-yellow-100
            text-yellow-700
          "
          title="Move Post to Archive?"
          description={`"${archiveTarget.title}" will be removed from the active posts and stored in Archive. It can be restored later.`}
          confirmText="Move to Archive"
          confirmClass="
            bg-yellow-500
            text-blue-950
            hover:bg-yellow-600
          "
          updating={updating}
          onCancel={() => !updating && setArchiveTarget(null)}
          onConfirm={archivePost}
        />
      )}

      {/* =================================================
          RESTORE CONFIRMATION
      ================================================= */}

      {restoreTarget && (
        <ConfirmActionModal
          icon="restore_from_trash"
          iconClass="
            bg-green-100
            text-green-700
          "
          title="Restore Archived Post?"
          description={`"${restoreTarget.title}" will return to its previous status: ${displayStatus(
            restoreTarget.status,
          )}.`}
          confirmText="Restore Post"
          confirmClass="
            bg-green-600
            text-white
            hover:bg-green-700
          "
          updating={updating}
          onCancel={() => !updating && setRestoreTarget(null)}
          onConfirm={restorePost}
        />
      )}

      {/* =================================================
          PERMANENT DELETE CONFIRMATION
      ================================================= */}

      {permanentDeleteTarget && (
        <ConfirmActionModal
          icon="delete_forever"
          iconClass="
            bg-red-100
            text-red-700
          "
          title="Permanently Delete Post?"
          description={`"${permanentDeleteTarget.title}" will be permanently removed from Archive. This action cannot be undone.`}
          confirmText="Delete Permanently"
          confirmClass="
            bg-red-600
            text-white
            hover:bg-red-700
          "
          updating={updating}
          onCancel={() => !updating && setPermanentDeleteTarget(null)}
          onConfirm={permanentlyDeletePost}
        />
      )}
    </>
  );
}

/* =====================================================
   POST CARD
===================================================== */

function PostCard({ post, onView, onArchive, onRestore, onPermanentDelete }) {
  const organization = getOrganizationName(post);

  const acronym = getOrganizationAcronym(post);

  const organizationColor = getOrganizationColor(post);

  const pending = normalizeStatus(post.status) === "pending";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="
        overflow-hidden

        rounded-2xl

        border
        border-gray-200

        transition

        hover:shadow-md
      "
    >
      {/* ORGANIZATION COLOR */}

      <div
        className="h-1.5"
        style={{
          backgroundColor: organizationColor,
        }}
      />

      <div className="p-4">
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
          <div
            className="
              flex
              min-w-0
              items-center
              gap-4
            "
          >
            {/* IMAGE */}

            {post.image ? (
              <img
                src={post.image}
                alt={post.title}
                className="
                  hidden
                  h-16
                  w-16
                  shrink-0
                  rounded-xl
                  object-cover

                  sm:block
                "
              />
            ) : (
              <div
                className="
                  hidden
                  h-16
                  w-16
                  shrink-0
                  items-center
                  justify-center

                  rounded-xl

                  bg-gray-100

                  text-gray-400

                  sm:flex
                "
              >
                <MaterialIcon name="image" />
              </div>
            )}

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
                    truncate
                    text-[13px]
                    font-black
                    text-blue-950
                  "
                >
                  {post.title}
                </h3>

                {post.isArchived ? (
                  <ArchiveBadge />
                ) : (
                  <StatusBadge status={post.status} />
                )}
              </div>

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
                    backgroundColor: organizationColor,
                  }}
                />

                <p
                  className="
                    text-[10px]
                    font-bold
                    text-blue-700
                  "
                >
                  {organization}

                  {acronym ? ` (${acronym})` : ""}
                </p>
              </div>

              <div
                className="
                  mt-3
                  flex
                  flex-wrap
                  gap-3

                  text-[9px]
                  text-gray-500
                "
              >
                <Meta icon="category" text={post.type || "Announcement"} />

                <Meta
                  icon="schedule"
                  text={`Submitted ${formatDate(post.createdAt)}`}
                />

                {post.eventDate && (
                  <Meta
                    icon="event"
                    text={`Event ${formatDate(post.eventDate)}`}
                  />
                )}

                {post.isArchived && (
                  <Meta
                    icon="archive"
                    text={`Archived ${formatDate(post.archivedAt)}`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ACTIONS */}

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
              onClick={onView}
              className={`
                flex
                items-center
                justify-center
                gap-1.5

                rounded-xl

                px-4
                py-2.5

                text-[10px]
                font-black

                transition

                ${
                  pending && !post.isArchived
                    ? `
                      bg-yellow-400
                      text-blue-950

                      hover:bg-yellow-300
                    `
                    : `
                      bg-gray-100
                      text-blue-950

                      hover:bg-gray-200
                    `
                }
              `}
            >
              <MaterialIcon
                name={
                  pending && !post.isArchived ? "rate_review" : "visibility"
                }
              />

              {pending && !post.isArchived ? "Review Post" : "View Details"}
            </button>

            {!post.isArchived ? (
              <button
                type="button"
                onClick={onArchive}
                className="
                  flex
                  items-center
                  justify-center
                  gap-1.5

                  rounded-xl

                  bg-red-50

                  px-4
                  py-2.5

                  text-[10px]
                  font-black
                  text-red-600

                  transition

                  hover:bg-red-100
                "
              >
                <MaterialIcon name="delete" />
                Delete
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onRestore}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-1.5

                    rounded-xl

                    bg-green-50

                    px-4
                    py-2.5

                    text-[10px]
                    font-black
                    text-green-700

                    hover:bg-green-100
                  "
                >
                  <MaterialIcon name="restore" />
                  Restore
                </button>

                <button
                  type="button"
                  onClick={onPermanentDelete}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-1.5

                    rounded-xl

                    bg-red-50

                    px-4
                    py-2.5

                    text-[10px]
                    font-black
                    text-red-600

                    hover:bg-red-100
                  "
                >
                  <MaterialIcon name="delete_forever" />
                  Delete Permanently
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =====================================================
   POST DETAILS MODAL
===================================================== */

function PostDetailsModal({
  post,
  onClose,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  onPermanentDelete,
}) {
  const pending = normalizeStatus(post.status) === "pending";

  return (
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
          max-h-[92vh]
          w-full
          max-w-3xl

          overflow-y-auto

          rounded-3xl

          bg-white

          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4

            bg-gradient-to-r
            from-[#020617]
            via-[#001F3F]
            to-[#003B7A]

            p-6

            text-white
          "
        >
          <div>
            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-widest
                text-yellow-400
              "
            >
              {post.isArchived ? "Archived Post" : "Post Review"}
            </p>

            <h2
              className="
                mt-2
                text-2xl
                font-black
              "
            >
              {post.title}
            </h2>

            <div
              className="
                mt-3
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  h-3
                  w-3
                  rounded-full
                "
                style={{
                  backgroundColor: getOrganizationColor(post),
                }}
              />

              <span
                className="
                  text-sm
                  font-bold
                  text-blue-100
                "
              >
                {getOrganizationName(post)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center

              rounded-full

              bg-white/10

              hover:bg-white/20
            "
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="p-6">
          {/* STATUS */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            {post.isArchived ? (
              <ArchiveBadge />
            ) : (
              <StatusBadge status={post.status} />
            )}

            {post.isArchived && <StatusBadge status={post.status} />}

            <span
              className="
                rounded-full

                bg-blue-50

                px-3
                py-1

                text-xs
                font-black
                text-blue-700
              "
            >
              {post.type}
            </span>
          </div>

          {/* IMAGE */}

          {post.image && (
            <div
              className="
                mt-6

                overflow-hidden

                rounded-2xl

                border
                border-gray-200

                bg-gray-100
              "
            >
              <img
                src={post.image}
                alt={post.title}
                className="
                  max-h-[520px]
                  w-full
                  object-contain
                "
              />
            </div>
          )}

          {/* DETAILS */}

          <div
            className="
              mt-6

              grid
              gap-4

              rounded-2xl

              bg-gray-100

              p-5

              sm:grid-cols-2
            "
          >
            <Detail label="Post Type" value={post.type} />

            <Detail
              label={post.isArchived ? "Previous Status" : "Status"}
              value={displayStatus(post.status)}
            />

            <Detail label="Submitted" value={formatDate(post.createdAt)} />

            <Detail
              label="Event Date"
              value={
                post.eventDate ? formatDate(post.eventDate) : "Not specified"
              }
            />

            {post.isArchived && (
              <Detail label="Archived" value={formatDate(post.archivedAt)} />
            )}
          </div>

          {/* CONTENT */}

          <div className="mt-6">
            <h3
              className="
                text-lg
                font-black
                text-blue-950
              "
            >
              Post Content
            </h3>

            <div
              className="
                mt-3

                whitespace-pre-line

                rounded-2xl

                border
                border-gray-200

                bg-white

                p-5

                leading-7
                text-gray-700
              "
            >
              {post.content}
            </div>
          </div>

          {/* ADMIN REMARKS */}

          {post.adminRemarks && (
            <div
              className="
                mt-5

                rounded-2xl

                bg-yellow-50

                p-5
              "
            >
              <p
                className="
                  font-black
                  text-yellow-800
                "
              >
                Administrator Remarks
              </p>

              <p
                className="
                  mt-2
                  text-yellow-800
                "
              >
                {post.adminRemarks}
              </p>
            </div>
          )}

          {/* PENDING ACTIONS */}

          {!post.isArchived && pending && (
            <div
              className="
                  mt-7

                  grid
                  gap-3

                  sm:grid-cols-2
                "
            >
              <button
                type="button"
                onClick={onApprove}
                className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-green-600

                    py-3.5

                    font-black
                    text-white

                    transition

                    hover:bg-green-700
                  "
              >
                <MaterialIcon name="check_circle" />
                Approve Post
              </button>

              <button
                type="button"
                onClick={onReject}
                className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-red-600

                    py-3.5

                    font-black
                    text-white

                    transition

                    hover:bg-red-700
                  "
              >
                <MaterialIcon name="cancel" />
                Reject Post
              </button>
            </div>
          )}

          {/* DELETE TO ARCHIVE */}

          {!post.isArchived && (
            <div
              className="
                mt-4

                border-t
                border-gray-200

                pt-4
              "
            >
              <button
                type="button"
                onClick={onArchive}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-red-50

                  py-3

                  text-sm
                  font-black
                  text-red-600

                  transition

                  hover:bg-red-100
                "
              >
                <MaterialIcon name="delete" />
                Delete Post
              </button>

              <p
                className="
                  mt-2

                  text-center
                  text-[10px]
                  text-gray-400
                "
              >
                Delete moves the post to Archive first. It is not permanently
                erased.
              </p>
            </div>
          )}

          {/* ARCHIVE ACTIONS */}

          {post.isArchived && (
            <div
              className="
                mt-6

                grid
                gap-3

                sm:grid-cols-2
              "
            >
              <button
                type="button"
                onClick={onRestore}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-green-600

                  py-3

                  font-black
                  text-white

                  hover:bg-green-700
                "
              >
                <MaterialIcon name="restore" />
                Restore Post
              </button>

              <button
                type="button"
                onClick={onPermanentDelete}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-red-600

                  py-3

                  font-black
                  text-white

                  hover:bg-red-700
                "
              >
                <MaterialIcon name="delete_forever" />
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   DECISION MODAL
===================================================== */

function DecisionModal({
  decision,
  remarks,
  setRemarks,
  updating,
  onClose,
  onConfirm,
}) {
  const approved = decision.status === "approved";

  return (
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
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) => event.stopPropagation()}
        className="
          w-full
          max-w-lg

          rounded-3xl

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
              approved
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
          <MaterialIcon name={approved ? "check_circle" : "cancel"} />
        </div>

        <h2
          className="
            mt-5
            text-2xl
            font-black
            text-blue-950
          "
        >
          {approved ? "Approve Post?" : "Reject Post?"}
        </h2>

        <p
          className="
            mt-2
            text-gray-600
          "
        >
          <strong>{decision.post.title}</strong>
        </p>

        {approved && (
          <div
            className="
              mt-5

              flex
              items-start
              gap-3

              rounded-2xl

              bg-green-50

              p-4

              text-sm
              text-green-700
            "
          >
            <MaterialIcon name="public" />
            Once approved, this post will become visible on the Student
            Homepage.
          </div>
        )}

        <div className="mt-5">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            {approved ? "Admin Remarks (Optional)" : "Reason for Rejection *"}
          </label>

          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows="4"
            placeholder={
              approved
                ? "Optional remarks..."
                : "Explain why the post was rejected..."
            }
            className="
              mt-2
              w-full

              resize-none

              rounded-xl

              border
              border-gray-200

              p-4

              outline-none

              focus:ring-2
              focus:ring-yellow-400
            "
          />
        </div>

        <div
          className="
            mt-6

            grid
            gap-3

            sm:grid-cols-2
          "
        >
          <button
            type="button"
            disabled={updating}
            onClick={onClose}
            className="
              rounded-xl

              bg-gray-100

              py-3

              font-black
              text-gray-700
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={onConfirm}
            className={`
              flex
              items-center
              justify-center
              gap-2

              rounded-xl

              py-3

              font-black
              text-white

              disabled:opacity-60

              ${approved ? "bg-green-600" : "bg-red-600"}
            `}
          >
            <MaterialIcon
              name={updating ? "hourglass_top" : approved ? "check" : "close"}
            />

            {updating
              ? "Saving..."
              : approved
                ? "Confirm Approval"
                : "Confirm Rejection"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   CONFIRM ACTION MODAL
===================================================== */

function ConfirmActionModal({
  icon,
  iconClass,
  title,
  description,
  confirmText,
  confirmClass,
  updating,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[6000]

        flex
        items-center
        justify-center

        bg-black/70

        p-4

        backdrop-blur-sm
      "
      onClick={onCancel}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) => event.stopPropagation()}
        className="
          w-full
          max-w-md

          rounded-3xl

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

            ${iconClass}
          `}
        >
          <MaterialIcon name={icon} />
        </div>

        <h2
          className="
            mt-5
            text-xl
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-2

            text-sm
            leading-6
            text-gray-600
          "
        >
          {description}
        </p>

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
            disabled={updating}
            onClick={onCancel}
            className="
              rounded-xl

              bg-gray-100

              py-3

              text-sm
              font-black
              text-gray-700

              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={onConfirm}
            className={`
              rounded-xl

              py-3

              text-sm
              font-black

              disabled:opacity-50

              ${confirmClass}
            `}
          >
            {updating ? "Please wait..." : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({ icon, label, value }) {
  return (
    <div
      className="
        min-h-[108px]

        rounded-2xl

        border
        border-gray-100

        bg-white

        p-3.5

        shadow-[0_4px_14px_rgba(15,23,42,0.07)]
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

          bg-blue-950

          text-[16px]
          text-yellow-400
        "
      >
        <MaterialIcon name={icon} />
      </div>

      <p
        className="
          mt-2.5

          text-[9px]
          font-bold
          uppercase
          tracking-wide
          text-gray-500
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1

          text-[23px]
          font-black
          text-blue-950
        "
      >
        {value}
      </p>
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

        text-xs
        font-black

        ${styles[normalized] || "bg-gray-100 text-gray-600"}
      `}
    >
      {displayStatus(normalized)}
    </span>
  );
}

/* =====================================================
   ARCHIVE BADGE
===================================================== */

function ArchiveBadge() {
  return (
    <span
      className="
        flex
        items-center
        gap-1

        rounded-full

        bg-slate-200

        px-3
        py-1

        text-xs
        font-black
        text-slate-700
      "
    >
      <MaterialIcon name="archive" />
      Archived
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
          text-xs
          font-bold
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
   META
===================================================== */

function Meta({ icon, text }) {
  return (
    <span
      className="
        flex
        items-center
        gap-1
      "
    >
      <MaterialIcon name={icon} />

      {text}
    </span>
  );
}

/* =====================================================
   FEEDBACK
===================================================== */

function Feedback({ type, message, onClose }) {
  const success = type === "success";

  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-4

        rounded-2xl

        border

        p-4

        ${
          success
            ? `
              border-green-200
              bg-green-50
              text-green-700
            `
            : `
              border-red-200
              bg-red-50
              text-red-700
            `
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <MaterialIcon name={success ? "check_circle" : "error"} />

        <span className="font-bold">{message}</span>
      </div>

      <button type="button" onClick={onClose}>
        <MaterialIcon name="close" />
      </button>
    </div>
  );
}

/* =====================================================
   EMPTY STATE
===================================================== */

function EmptyState({ archived }) {
  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-center

        py-16

        text-center
      "
    >
      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center

          rounded-2xl

          bg-gray-100

          text-gray-400
        "
      >
        <MaterialIcon name={archived ? "archive" : "inbox"} />
      </div>

      <h3
        className="
          mt-4

          text-lg
          font-black
          text-blue-950
        "
      >
        {archived ? "Archive is empty" : "No posts found"}
      </h3>

      <p
        className="
          mt-1

          text-sm
          text-gray-500
        "
      >
        {archived
          ? "Deleted posts will be stored here before permanent deletion."
          : "New organization submissions will appear here."}
      </p>
    </div>
  );
}
