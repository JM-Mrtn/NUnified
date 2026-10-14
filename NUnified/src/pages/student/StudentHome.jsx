import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

/* =====================================================
   DATE FORMAT
===================================================== */

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  /*
    Handle YYYY-MM-DD without
    timezone shifting.
  */

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =====================================================
   ORGANIZATION NAME
===================================================== */

function getOrganizationName(organization) {
  if (!organization) {
    return "NUnified";
  }

  if (typeof organization === "string") {
    return organization;
  }

  return (
    organization.organizationName ||
    organization.name ||
    organization.acronym ||
    "NUnified"
  );
}

/* =====================================================
   ORGANIZATION COLOR
===================================================== */

function getOrganizationColor(organization) {
  if (organization && typeof organization === "object" && organization.color) {
    return organization.color;
  }

  return "#FACC15";
}

/* =====================================================
   SHORT DESCRIPTION
===================================================== */

function createDescription(value, length = 155) {
  const text = String(value || "").trim();

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
}

/* =====================================================
   STUDENT HOME
===================================================== */

export default function StudentHome() {
  const [posts, setPosts] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedPost, setSelectedPost] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [visibleCount, setVisibleCount] = useState(4);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* ===================================================
     SETTINGS
  =================================================== */

  const postsPerPage = 10;

  const initialVisibleCount = 4;

  const viewMoreIncrement = 3;

  /* ===================================================
     LOAD PUBLIC CONTENT

     Approved announcements are returned
     by GET /api/announcements.
  =================================================== */

  const loadPosts = async () => {
    setLoading(true);
    setError("");

    try {
      /*
          Use allSettled so StudentHome
          still loads if one public
          endpoint has no data.
        */

      const results = await Promise.allSettled([
        api.get("/announcements"),

        api.get("/events"),
      ]);

      const announcementResponse = results[0];

      const eventResponse = results[1];

      const announcements =
        announcementResponse.status === "fulfilled"
          ? Array.isArray(announcementResponse.value.data)
            ? announcementResponse.value.data
            : []
          : [];

      const events =
        eventResponse.status === "fulfilled"
          ? Array.isArray(eventResponse.value.data)
            ? eventResponse.value.data
            : []
          : [];

      /* =============================================
           ANNOUNCEMENTS
        ============================================== */

      const announcementPosts = announcements.map((announcement) => {
        const organization = announcement.organization;

        const content = announcement.content || announcement.description || "";

        const dateRaw =
          announcement.eventDate ||
          announcement.publishedAt ||
          announcement.createdAt ||
          announcement.date;

        return {
          id: announcement._id,

          source: "announcement",

          title: announcement.title || "Announcement",

          organization: getOrganizationName(organization),

          organizationColor: getOrganizationColor(organization),

          acronym:
            typeof organization === "object" ? organization?.acronym || "" : "",

          type: announcement.type || "Announcement",

          dateRaw,

          date: formatDate(dateRaw),

          image: announcement.image || null,

          description: createDescription(content),

          content,

          venue: "",

          time: "",
        };
      });

      /* =============================================
           EVENTS
        ============================================== */

      const eventPosts = events.map((event) => {
        const organization = event.organization;

        const content = event.description || event.content || "";

        const dateRaw = event.eventDate || event.date || event.createdAt;

        let time = "";

        if (event.startTime && event.endTime) {
          time = `${event.startTime} - ${event.endTime}`;
        } else {
          time = event.time || "";
        }

        return {
          id: event._id,

          source: "event",

          title: event.eventName || event.title || "Campus Event",

          organization: getOrganizationName(organization),

          organizationColor: getOrganizationColor(organization),

          acronym:
            typeof organization === "object" ? organization?.acronym || "" : "",

          type: event.eventType || event.type || "Event",

          dateRaw,

          date: formatDate(dateRaw),

          image: event.image || event.imageUrl || null,

          description: createDescription(content),

          content,

          venue: event.venue || "",

          time,
        };
      });

      /* =============================================
           COMBINE
        ============================================== */

      const combined = [...announcementPosts, ...eventPosts].sort((a, b) => {
        const dateA = new Date(a.dateRaw || 0).getTime();

        const dateB = new Date(b.dateRaw || 0).getTime();

        return dateB - dateA;
      });

      setPosts(combined);
    } catch (err) {
      console.error("Student home error:", err);

      setError("Unable to load campus posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  /* ===================================================
     SEARCH
  =================================================== */

  const filteredPosts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return posts;
    }

    return posts.filter((post) =>
      [post.organization, post.acronym, post.title, post.type].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(value),
      ),
    );
  }, [posts, search]);

  /* ===================================================
     PAGINATION
  =================================================== */

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const currentPagePosts = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;

    return filteredPosts.slice(start, start + postsPerPage);
  }, [filteredPosts, currentPage]);

  /* ===================================================
     FEATURED
  =================================================== */

  const featured = currentPagePosts[0];

  const otherPosts = currentPagePosts.slice(1);

  const visibleGridCount = Math.max(visibleCount - 1, 0);

  const visiblePosts = otherPosts.slice(0, visibleGridCount);

  const canViewMore = visibleCount < currentPagePosts.length;

  /* ===================================================
     SEARCH RESET
  =================================================== */

  useEffect(() => {
    setCurrentPage(1);

    setVisibleCount(initialVisibleCount);
  }, [search]);

  /* ===================================================
     CHANGE PAGE
  =================================================== */

  const changePage = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);

    setVisibleCount(initialVisibleCount);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="
        min-h-screen
        bg-[#f4f5f7]
      "
    >
      {/* =================================================
          COMPACT HERO
      ================================================= */}

      <section
        className="
          border-b
          border-blue-800/30

          bg-gradient-to-r
          from-[#10275f]
          via-[#173a83]
          to-[#244cc4]

          text-white
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-6xl

            px-5
            py-7

            sm:px-6
            sm:py-8
          "
        >
          <p
            className="
              text-xs
              font-black
              uppercase
              tracking-[0.2em]
              text-yellow-300
            "
          >
            Campus Community
          </p>

          <h1
            className="
              mt-2
              text-2xl
              font-black

              sm:text-3xl
            "
          >
            Student Homepage
          </h1>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-blue-100

              sm:text-[15px]
            "
          >
            Discover the latest updates, activities, announcements, and events
            from different NU organizations.
          </p>
        </div>
      </section>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main
        className="
          mx-auto
          w-full
          max-w-6xl

          px-4
          py-8

          sm:px-6
          lg:py-10
        "
      >
        {/* =================================================
            SEARCH
        ================================================= */}

        <div
          className="
            rounded-2xl

            border
            border-gray-200

            bg-white

            p-4

            shadow-sm

            sm:p-5
          "
        >
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Search Campus Posts
          </label>

          <div
            className="
              mt-2

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
              placeholder="Search organization, title, or type..."
              className="
                w-full

                bg-transparent

                py-3

                text-sm

                outline-none
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  text-gray-500

                  hover:bg-white
                "
              >
                <MaterialIcon name="close" />
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div
            className="
              mt-7

              rounded-2xl

              border
              border-gray-200

              bg-white

              py-16

              text-center

              shadow-sm
            "
          >
            <div
              className="
                mx-auto

                flex
                h-12
                w-12

                items-center
                justify-center

                rounded-xl

                bg-blue-950

                text-yellow-400
              "
            >
              <MaterialIcon name="hourglass_top" />
            </div>

            <p
              className="
                mt-4
                font-bold
                text-gray-500
              "
            >
              Loading campus posts...
            </p>
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {!loading && error && (
          <div
            className="
                mt-7

                rounded-2xl

                border
                border-red-200

                bg-red-50

                p-5

                text-red-700
              "
          >
            <div
              className="
                  flex
                  items-center
                  gap-3
                "
            >
              <MaterialIcon name="error" />

              <div>
                <p className="font-black">Unable to load posts</p>

                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* =============================================
                  RESULT COUNT
              ============================================== */}

            <div
              className="
                  mt-5

                  flex
                  items-center
                  justify-between

                  text-xs
                  text-gray-500

                  sm:text-sm
                "
            >
              <p>
                Showing{" "}
                <strong className="text-blue-950">
                  {currentPagePosts.length}
                </strong>{" "}
                of{" "}
                <strong className="text-blue-950">
                  {filteredPosts.length}
                </strong>{" "}
                posts
              </p>

              <p>
                Total results:{" "}
                <strong className="text-blue-950">
                  {filteredPosts.length}
                </strong>
              </p>
            </div>

            {/* =============================================
                  EMPTY
              ============================================== */}

            {filteredPosts.length === 0 && (
              <div
                className="
                    mt-6

                    rounded-2xl

                    border
                    border-gray-200

                    bg-white

                    py-16

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

                      rounded-xl

                      bg-gray-100

                      text-gray-400
                    "
                >
                  <MaterialIcon name="search_off" />
                </div>

                <h3
                  className="
                      mt-4

                      text-lg
                      font-black
                      text-blue-950
                    "
                >
                  No posts found
                </h3>

                <p
                  className="
                      mt-1
                      text-sm
                      text-gray-500
                    "
                >
                  Try another search.
                </p>
              </div>
            )}

            {/* =============================================
                  FEATURED POST

                  SMALLER / PROFESSIONAL
              ============================================== */}

            {featured && (
              <motion.article
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                whileHover={{
                  y: -2,
                }}
                onClick={() => setSelectedPost(featured)}
                className="
                    mt-6

                    cursor-pointer

                    overflow-hidden

                    rounded-2xl

                    border
                    border-gray-200

                    bg-white

                    shadow-sm

                    transition-shadow

                    hover:shadow-lg

                    md:grid
                    md:grid-cols-[300px_minmax(0,1fr)]

                    lg:grid-cols-[340px_minmax(0,1fr)]
                  "
              >
                {/* IMAGE */}

                <div
                  className="
                      relative

                      h-[220px]

                      overflow-hidden

                      bg-gray-100

                      md:h-[280px]
                    "
                >
                  {featured.image ? (
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="
                          h-full
                          w-full
                          object-cover
                        "
                    />
                  ) : (
                    <div
                      className="
                          flex
                          h-full
                          w-full
                          items-center
                          justify-center

                          bg-gradient-to-br
                          from-blue-950
                          to-blue-800

                          text-5xl
                          text-yellow-400
                        "
                    >
                      <MaterialIcon name="campaign" />
                    </div>
                  )}

                  {/* TYPE */}

                  <span
                    className="
                        absolute
                        left-4
                        top-4

                        rounded-full

                        bg-white/95

                        px-3
                        py-1

                        text-xs
                        font-black
                        text-blue-950

                        shadow
                      "
                  >
                    {featured.type}
                  </span>
                </div>

                {/* CONTENT */}

                <div
                  className="
                      flex
                      min-w-0
                      flex-col

                      p-5

                      sm:p-6
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
                    <span
                      className="
                          text-xs
                          font-black
                          uppercase
                          tracking-wider
                          text-yellow-600
                        "
                    >
                      Featured
                    </span>

                    <span
                      className="
                          h-1
                          w-1
                          rounded-full
                          bg-gray-300
                        "
                    />

                    <span
                      className="
                          text-xs
                          font-semibold
                          text-gray-500
                        "
                    >
                      {featured.date}
                    </span>
                  </div>

                  <h2
                    className="
                        mt-3

                        text-xl
                        font-black
                        leading-tight
                        text-blue-950

                        sm:text-2xl
                      "
                  >
                    {featured.title}
                  </h2>

                  {/* ORGANIZATION */}

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
                          shrink-0
                          rounded-full
                        "
                      style={{
                        backgroundColor: featured.organizationColor,
                      }}
                    />

                    <p
                      className="
                          truncate

                          text-sm
                          font-black
                          text-blue-700
                        "
                    >
                      {featured.organization}

                      {featured.acronym ? ` • ${featured.acronym}` : ""}
                    </p>
                  </div>

                  <p
                    className="
                        mt-4

                        text-sm
                        leading-6
                        text-gray-600
                      "
                  >
                    {featured.description ||
                      "Click to view this campus update."}
                  </p>

                  {/* EXTRA EVENT INFO */}

                  {(featured.venue || featured.time) && (
                    <div
                      className="
                          mt-4

                          flex
                          flex-wrap
                          gap-4

                          text-xs
                          text-gray-500
                        "
                    >
                      {featured.venue && (
                        <span
                          className="
                              flex
                              items-center
                              gap-1
                            "
                        >
                          <MaterialIcon name="location_on" />

                          {featured.venue}
                        </span>
                      )}

                      {featured.time && (
                        <span
                          className="
                              flex
                              items-center
                              gap-1
                            "
                        >
                          <MaterialIcon name="schedule" />

                          {featured.time}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="
                        mt-auto
                        pt-5

                        flex
                        items-center
                        gap-2

                        text-sm
                        font-black
                        text-blue-950
                      "
                  >
                    View Details
                    <MaterialIcon name="arrow_forward" />
                  </button>
                </div>
              </motion.article>
            )}

            {/* =============================================
                  OTHER POSTS
              ============================================== */}

            {visiblePosts.length > 0 && (
              <div
                className="
                    mt-6

                    grid
                    gap-5

                    sm:grid-cols-2

                    lg:grid-cols-3
                  "
              >
                {visiblePosts.map((post) => (
                  <motion.article
                    key={post.id}
                    initial={{
                      opacity: 0,
                      y: 15,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    whileHover={{
                      y: -4,
                    }}
                    onClick={() => setSelectedPost(post)}
                    className="
                          cursor-pointer

                          overflow-hidden

                          rounded-2xl

                          border
                          border-gray-200

                          bg-white

                          shadow-sm

                          transition-shadow

                          hover:shadow-lg
                        "
                  >
                    {/* SMALL IMAGE */}

                    <div
                      className="
                            relative

                            h-40

                            overflow-hidden

                            bg-gray-100
                          "
                    >
                      {post.image ? (
                        <img
                          src={post.image}
                          alt={post.title}
                          className="
                                h-full
                                w-full
                                object-cover
                              "
                        />
                      ) : (
                        <div
                          className="
                                flex
                                h-full
                                items-center
                                justify-center

                                bg-blue-950

                                text-4xl
                                text-yellow-400
                              "
                        >
                          <MaterialIcon name="campaign" />
                        </div>
                      )}

                      <span
                        className="
                              absolute
                              left-3
                              top-3

                              rounded-full

                              bg-white/95

                              px-3
                              py-1

                              text-[11px]
                              font-black
                              text-blue-950
                            "
                      >
                        {post.type}
                      </span>
                    </div>

                    {/* CARD CONTENT */}

                    <div className="p-5">
                      <div
                        className="
                              flex
                              items-center
                              gap-2
                            "
                      >
                        <span
                          className="
                                h-2.5
                                w-2.5
                                shrink-0
                                rounded-full
                              "
                          style={{
                            backgroundColor: post.organizationColor,
                          }}
                        />

                        <p
                          className="
                                truncate

                                text-xs
                                font-black
                                text-blue-700
                              "
                        >
                          {post.organization}
                        </p>
                      </div>

                      <h3
                        className="
                              mt-3

                              text-lg
                              font-black
                              leading-snug
                              text-blue-950
                            "
                      >
                        {post.title}
                      </h3>

                      <p
                        className="
                              mt-2

                              text-sm
                              leading-5
                              text-gray-500
                            "
                      >
                        {post.description}
                      </p>

                      <div
                        className="
                              mt-4

                              flex
                              items-center
                              justify-between

                              border-t
                              border-gray-100

                              pt-4
                            "
                      >
                        <span
                          className="
                                text-xs
                                text-gray-400
                              "
                        >
                          {post.date}
                        </span>

                        <span
                          className="
                                flex
                                items-center
                                gap-1

                                text-xs
                                font-black
                                text-blue-950
                              "
                        >
                          View
                          <MaterialIcon name="arrow_forward" />
                        </span>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}

            {/* =============================================
                  VIEW MORE
              ============================================== */}

            {canViewMore && (
              <div
                className="
                    mt-8
                    flex
                    justify-center
                  "
              >
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((previous) =>
                      Math.min(
                        previous + viewMoreIncrement,

                        currentPagePosts.length,

                        postsPerPage,
                      ),
                    )
                  }
                  className="
                      flex
                      items-center
                      gap-2

                      rounded-full

                      bg-blue-950

                      px-6
                      py-3

                      text-sm
                      font-black
                      text-white

                      shadow

                      transition

                      hover:bg-blue-900
                    "
                >
                  View More
                  <MaterialIcon name="expand_more" />
                </button>
              </div>
            )}

            {/* =============================================
                  PAGINATION
              ============================================== */}

            {totalPages > 1 && (
              <div
                className="
                    mt-8

                    flex
                    flex-wrap
                    items-center
                    justify-center
                    gap-2
                  "
              >
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => changePage(currentPage - 1)}
                  className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center

                      rounded-xl

                      bg-white

                      shadow-sm

                      disabled:opacity-40
                    "
                >
                  <MaterialIcon name="chevron_left" />
                </button>

                {Array.from(
                  {
                    length: totalPages,
                  },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => changePage(page)}
                    className={`
                          h-10
                          min-w-10

                          rounded-xl

                          px-3

                          text-sm
                          font-black

                          ${
                            currentPage === page
                              ? `
                                bg-yellow-400
                                text-blue-950
                              `
                              : `
                                bg-white
                                text-gray-600
                                shadow-sm
                              `
                          }
                        `}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => changePage(currentPage + 1)}
                  className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center

                      rounded-xl

                      bg-white

                      shadow-sm

                      disabled:opacity-40
                    "
                >
                  <MaterialIcon name="chevron_right" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* =================================================
          POST DETAILS MODAL
      ================================================= */}

      {selectedPost && (
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
          onClick={() => setSelectedPost(null)}
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
              max-h-[90vh]
              w-full
              max-w-2xl

              overflow-y-auto

              rounded-3xl

              bg-white

              shadow-2xl
            "
          >
            {/* MODAL IMAGE */}

            {selectedPost.image && (
              <div
                className="
                  relative

                  flex
                  max-h-[420px]
                  min-h-[220px]

                  items-center
                  justify-center

                  overflow-hidden

                  bg-gray-100
                "
              >
                <img
                  src={selectedPost.image}
                  alt={selectedPost.title}
                  className="
                    max-h-[420px]
                    w-full
                    object-contain
                  "
                />

                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="
                    absolute
                    right-4
                    top-4

                    flex
                    h-10
                    w-10
                    items-center
                    justify-center

                    rounded-full

                    bg-black/65

                    text-white
                  "
                >
                  <MaterialIcon name="close" />
                </button>
              </div>
            )}

            <div className="p-6 sm:p-7">
              {!selectedPost.image && (
                <div
                  className="
                    flex
                    justify-end
                  "
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      bg-gray-100
                    "
                  >
                    <MaterialIcon name="close" />
                  </button>
                </div>
              )}

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
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
                  {selectedPost.type}
                </span>

                <span
                  className="
                    text-xs
                    text-gray-400
                  "
                >
                  {selectedPost.date}
                </span>
              </div>

              <h2
                className="
                  mt-4

                  text-2xl
                  font-black
                  text-blue-950

                  sm:text-3xl
                "
              >
                {selectedPost.title}
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
                    backgroundColor: selectedPost.organizationColor,
                  }}
                />

                <p
                  className="
                    font-black
                    text-blue-700
                  "
                >
                  {selectedPost.organization}
                </p>
              </div>

              {(selectedPost.venue || selectedPost.time) && (
                <div
                  className="
                    mt-5

                    grid
                    gap-3

                    rounded-2xl

                    bg-gray-100

                    p-4

                    sm:grid-cols-2
                  "
                >
                  {selectedPost.venue && (
                    <Info
                      icon="location_on"
                      label="Venue"
                      value={selectedPost.venue}
                    />
                  )}

                  {selectedPost.time && (
                    <Info
                      icon="schedule"
                      label="Time"
                      value={selectedPost.time}
                    />
                  )}
                </div>
              )}

              <div
                className="
                  mt-6

                  whitespace-pre-line

                  text-[15px]
                  leading-7
                  text-gray-700
                "
              >
                {selectedPost.content || selectedPost.description}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="
                  mt-7
                  w-full

                  rounded-xl

                  bg-blue-950

                  py-3

                  font-black
                  text-white
                "
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MODAL INFO
===================================================== */

function Info({ icon, label, value }) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
      "
    >
      <div
        className="
          text-blue-800
        "
      >
        <MaterialIcon name={icon} />
      </div>

      <div>
        <p
          className="
            text-[10px]
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
            text-sm
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
