import { useEffect, useState } from "react";

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import api from "../api/axiosClient.js";

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
   NAVIGATION
===================================================== */

const navigationItems = [
  {
    label: "Dashboard",
    icon: "dashboard",
    to: "/organization/dashboard",
  },

  {
    label: "Event Booking",
    icon: "event_available",
    to: "/organization/booking",
  },

  {
    label: "Booking Status",
    icon: "fact_check",
    to: "/organization/status",
  },

  {
    label: "Create Post",
    icon: "campaign",
    to: "/organization/create-post",
  },

  {
    label: "Admin Request",
    icon: "support_agent",
    to: "/organization/admin-request",
  },

  {
    label: "Profile",
    icon: "account_circle",
    to: "/organization/profile",
  },

  {
    label: "Change Password",
    icon: "history",
    to: "/organization/change-password",
  },
];

/* =====================================================
   EMPTY ORGANIZATION
===================================================== */

const EMPTY_ORGANIZATION = {
  organizationName: "Organization",

  acronym: "NU",

  color: "#FACC15",
};

/* =====================================================
   LAYOUT
===================================================== */

export default function OrganizationLayout() {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);

  const [profileImage, setProfileImage] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ===================================================
     INITIALS
  =================================================== */

  const initials =
    organization.acronym?.trim().slice(0, 3).toUpperCase() || "NU";

  /* ===================================================
     LOAD ORGANIZATION
  =================================================== */

  const loadOrganization = async () => {
    try {
      const response = await api.get("/organizations/me");

      const org = response.data?.organization || response.data || {};

      setOrganization({
        ...EMPTY_ORGANIZATION,
        ...org,
      });
    } catch (error) {
      console.error("LOAD ORGANIZATION LAYOUT ERROR:", error);

      /*
          Fallback to localStorage user
          so the layout still displays.
        */

      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");

        const org = stored.organization || {};

        setOrganization((previous) => ({
          ...previous,

          organizationName:
            org.organizationName ||
            stored.organizationName ||
            previous.organizationName,

          acronym: org.acronym || stored.acronym || previous.acronym,
        }));
      } catch {
        // Ignore.
      }
    }
  };

  /* ===================================================
     LOAD PROFILE PICTURE
  =================================================== */

  const loadProfilePicture = async () => {
    try {
      const response = await api.get(
        "/organization-profile/me/profile-picture",
        {
          params: {
            t: Date.now(),
          },
        },
      );

      setProfileImage(response.data?.profileImage || "");
    } catch (error) {
      console.error("LOAD SIDEBAR PROFILE PICTURE ERROR:", error);

      setProfileImage("");
    }
  };

  /* ===================================================
     LOAD LAYOUT DATA
  =================================================== */

  const loadLayoutData = async () => {
    await Promise.allSettled([loadOrganization(), loadProfilePicture()]);
  };

  useEffect(() => {
    loadLayoutData();
  }, []);

  /* ===================================================
     LISTEN FOR PROFILE IMAGE CHANGES

     OrganizationProfile.jsx dispatches this event
     immediately after saving/removing a picture.
  =================================================== */

  useEffect(() => {
    const handleImageUpdated = (event) => {
      setProfileImage(event.detail?.profileImage || "");
    };

    const handleProfileUpdated = () => {
      loadOrganization();
    };

    window.addEventListener(
      "organizationProfileImageUpdated",
      handleImageUpdated,
    );

    window.addEventListener("organizationProfileUpdated", handleProfileUpdated);

    return () => {
      window.removeEventListener(
        "organizationProfileImageUpdated",
        handleImageUpdated,
      );

      window.removeEventListener(
        "organizationProfileUpdated",
        handleProfileUpdated,
      );
    };
  }, []);

  /* ===================================================
     LOGOUT
  =================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");

    localStorage.removeItem("role");

    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  /* ===================================================
     CLOSE MOBILE SIDEBAR
  =================================================== */

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <div
      className="
        min-h-screen

        bg-[#F3F4F6]
      "
    >
      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="
            fixed
            inset-0
            z-[80]

            bg-black/50

            lg:hidden
          "
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          fixed
          bottom-0
          left-0
          top-0

          z-[90]

          flex
          w-[258px]
          flex-col

          bg-gradient-to-b
          from-[#020B21]
          via-[#002A50]
          to-[#004B85]

          px-4
          py-5

          text-white

          transition-transform
          duration-300

          lg:translate-x-0

          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* ===============================================
            LOGO
        =============================================== */}

        <div
          className="
            flex
            items-center
            gap-3

            border-b
            border-white/10

            pb-5
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center

              rounded-[14px]

              border
              border-blue-400/30

              bg-blue-700

              text-[18px]
              font-black
              text-yellow-300
            "
          >
            NU
          </div>

          <div>
            <h1
              className="
                text-[20px]
                font-black
                tracking-tight
              "
            >
              NUnified
            </h1>

            <p
              className="
                text-[9px]
                text-blue-100
              "
            >
              Organization Portal
            </p>
          </div>
        </div>

        {/* ===============================================
            ORGANIZATION CARD

            THIS IS THE AVATAR FROM YOUR SCREENSHOT.
        =============================================== */}

        <div
          className="
            mt-5

            flex
            items-center
            gap-3

            rounded-[15px]

            border
            border-white/15

            bg-white/5

            px-3
            py-3

            shadow-sm
          "
        >
          <Avatar
            image={profileImage}
            initials={initials}
            color={organization.color}
            size="42px"
            textSize="13px"
          />

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                truncate
                text-[12px]
                font-black
                text-white
              "
            >
              {organization.organizationName}
            </p>

            <p
              className="
                mt-0.5
                text-[9px]
                font-medium
                text-blue-200
              "
            >
              {organization.acronym}
            </p>
          </div>
        </div>

        {/* ===============================================
            NAVIGATION
        =============================================== */}

        <div
          className="
            mt-6
          "
        >
          <p
            className="
              px-2

              text-[8px]
              font-black
              uppercase
              tracking-[0.18em]

              text-blue-200
            "
          >
            Navigation
          </p>

          <nav
            className="
              mt-3
              space-y-1.5
            "
          >
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) => `
                    group

                    flex
                    items-center
                    gap-3

                    rounded-[11px]

                    px-3
                    py-3

                    text-[11px]
                    font-bold

                    transition-all
                    duration-200

                    ${
                      isActive
                        ? `
                          bg-yellow-400
                          text-blue-950
                          shadow-md
                        `
                        : `
                          text-white
                          hover:bg-white/10
                        `
                    }
                  `}
              >
                {({ isActive }) => (
                  <>
                    <MaterialIcon
                      name={item.icon}
                      className={`
                          text-[19px]

                          ${isActive ? "text-white" : "text-white"}
                        `}
                    />

                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ===============================================
            BOTTOM
        =============================================== */}

        <div
          className="
            mt-auto

            border-t
            border-white/10

            pt-4
          "
        >
          <button
            type="button"
            onClick={handleLogout}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2

              rounded-full

              bg-yellow-400

              px-4
              py-3

              text-[12px]
              font-bold
              text-blue-950

              shadow-md

              transition

              hover:bg-yellow-300
            "
          >
            <MaterialIcon
              name="logout"
              className="
                text-[18px]
              "
            />
            Logout
          </button>

          <p
            className="
              mt-4

              text-center

              text-[8px]
              text-blue-200
            "
          >
            NUnified Event Management
          </p>
        </div>
      </aside>

      {/* =================================================
          CONTENT AREA
      ================================================= */}

      <div
        className="
          min-h-screen

          lg:pl-[258px]
        "
      >
        {/* ===============================================
            TOP BAR
        =============================================== */}

        <header
          className="
            sticky
            top-0
            z-[60]

            flex
            h-[72px]
            items-center
            justify-between

            border-b
            border-gray-200

            bg-white

            px-4

            sm:px-7
          "
        >
          {/* LEFT */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center

                rounded-lg

                bg-gray-100

                lg:hidden
              "
            >
              <MaterialIcon
                name="menu"
                className="
                  text-[20px]
                  text-blue-950
                "
              />
            </button>

            <div>
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.12em]
                  text-yellow-600
                "
              >
                Organization Portal
              </p>

              <h2
                className="
                  mt-1
                  text-[15px]
                  font-black
                  text-blue-950
                "
              >
                {organization.organizationName}
              </h2>
            </div>
          </div>

          {/* =============================================
              TOP RIGHT ACCOUNT

              Profile image appears here too.
          ============================================== */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                hidden
                text-right

                sm:block
              "
            >
              <p
                className="
                  max-w-[180px]
                  truncate

                  text-[11px]
                  font-black
                  text-blue-950
                "
              >
                {organization.organizationName}
              </p>

              <p
                className="
                  mt-0.5

                  text-[8px]
                  text-gray-400
                "
              >
                {organization.acronym}
              </p>
            </div>

            <Avatar
              image={profileImage}
              initials={initials}
              color={organization.color}
              size="40px"
              textSize="12px"
            />
          </div>
        </header>

        {/* ===============================================
            PAGE CONTENT
        =============================================== */}

        <main
          className="
            min-h-[calc(100vh-72px)]

            p-4

            sm:p-6
            lg:p-7
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* =====================================================
   AVATAR

   Reusable for:
   - sidebar
   - top-right header
===================================================== */

function Avatar({ image, initials, color, size, textSize }) {
  return (
    <div
      className="
        flex
        shrink-0
        items-center
        justify-center

        overflow-hidden

        rounded-full

        font-black
        text-blue-950

        shadow-sm
      "
      style={{
        width: size,

        height: size,

        backgroundColor: color || "#FACC15",

        fontSize: textSize,
      }}
    >
      {image ? (
        <img
          src={image}
          alt="Organization Profile"
          className="
            h-full
            w-full

            object-cover
            object-center
          "
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
