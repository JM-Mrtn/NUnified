import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useState } from "react";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

/* =====================================================
   ADMIN LAYOUT
===================================================== */

export default function AdminLayout() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  /* ===================================================
     LOGOUT
  =================================================== */

  const logout = () => {
    localStorage.removeItem("token");

    localStorage.removeItem("role");

    localStorage.removeItem("user");

    navigate("/login");
  };

  /* ===================================================
     NAVIGATION ITEMS
  =================================================== */

  const navigation = [
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    },

    {
      to: "/admin/organizations",
      label: "Manage Organizations",
      icon: "groups",
    },

    {
      to: "/admin/events",
      label: "Manage Events",
      icon: "event",
    },

    {
      to: "/admin/requests",
      label: "Manage Requests",
      icon: "assignment",
    },

    {
      to: "/admin/announcements",
      label: "Announcements",
      icon: "campaign",
    },
  ];

  return (
    <div
      className="
        min-h-screen

        bg-gray-100
      "
    >
      {/* =================================================
          MOBILE TOPBAR
      ================================================= */}

      <header
        className="
          sticky
          top-0
          z-40

          flex
          h-16

          items-center
          justify-between

          bg-gradient-to-r
          from-[#020617]
          via-[#001F3F]
          to-[#003B7A]

          px-5

          text-white

          shadow-lg

          lg:hidden
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
              h-10
              w-10

              items-center
              justify-center

              rounded-xl

              bg-blue-800

              font-black
              text-yellow-400
            "
          >
            NU
          </div>

          <div>
            <h1
              className="
                font-black
              "
            >
              NUnified
            </h1>

            <p
              className="
                text-[10px]
                text-blue-200
              "
            >
              Administrator
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="
            flex
            h-10
            w-10

            items-center
            justify-center

            rounded-xl

            bg-white/10

            text-xl
          "
        >
          <MaterialIcon name={sidebarOpen ? "close" : "menu"} />
        </button>
      </header>

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="
            fixed
            inset-0
            z-40

            bg-black/50

            backdrop-blur-sm

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
          inset-y-0
          left-0
          z-50

          flex
          w-72
          flex-col

          bg-gradient-to-b
          from-[#020617]
          via-[#001F3F]
          to-[#003B7A]

          px-5
          py-6

          text-white

          shadow-2xl

          transition-transform
          duration-300

          lg:translate-x-0

          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* BRAND */}

        <div
          className="
            flex
            items-center
            gap-3

            border-b
            border-white/10

            pb-6
          "
        >
          <div
            className="
              flex
              h-14
              w-14

              shrink-0

              items-center
              justify-center

              rounded-2xl

              border
              border-yellow-400/20

              bg-blue-800

              text-xl
              font-black
              text-yellow-400

              shadow-lg
            "
          >
            NU
          </div>

          <div>
            <h2
              className="
                text-xl
                font-black
              "
            >
              NUnified
            </h2>

            <p
              className="
                mt-0.5

                text-xs
                text-blue-200
              "
            >
              Administrator Portal
            </p>
          </div>
        </div>

        {/* ADMIN INFO */}

        <div
          className="
            mt-6

            rounded-2xl

            border
            border-white/10

            bg-white/5

            p-4
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

                rounded-full

                bg-yellow-400

                text-blue-950
              "
            >
              <MaterialIcon name="admin_panel_settings" />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <p
                className="
                  truncate

                  text-sm
                  font-bold
                "
              >
                {user.username || "Administrator"}
              </p>

              <p
                className="
                  text-xs
                  capitalize
                  text-blue-200
                "
              >
                {user.role || "admin"}
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}

        <nav
          className="
            mt-7

            flex
            flex-col
            gap-2
          "
        >
          <p
            className="
              mb-1
              px-3

              text-[10px]
              font-bold
              uppercase
              tracking-[0.2em]
              text-blue-300
            "
          >
            Navigation
          </p>

          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `
                    group

                    flex
                    items-center
                    gap-3

                    rounded-xl

                    px-4
                    py-3

                    text-sm
                    font-semibold

                    transition
                    duration-200

                    ${
                      isActive
                        ? `
                          bg-yellow-400
                          text-blue-950
                          shadow-lg
                        `
                        : `
                          text-blue-100

                          hover:bg-white/10
                          hover:text-white
                        `
                    }
                  `
              }
            >
              <span
                className="
                    flex
                    h-8
                    w-8

                    items-center
                    justify-center

                    rounded-lg
                  "
              >
                <MaterialIcon name={item.icon} />
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* BOTTOM */}

        <div
          className="
            mt-auto

            border-t
            border-white/10

            pt-5
          "
        >
          <button
            type="button"
            onClick={logout}
            className="
              flex
              w-full

              items-center
              justify-center
              gap-2

              rounded-full

              bg-gradient-to-r
              from-yellow-300
              to-yellow-500

              px-5
              py-3

              font-black
              text-blue-950

              shadow-lg

              transition
              duration-200

              hover:scale-[1.02]
              hover:from-yellow-400
              hover:to-yellow-500
            "
          >
            <MaterialIcon name="logout" />
            Logout
          </button>

          <p
            className="
              mt-4

              text-center

              text-[10px]
              text-blue-300
            "
          >
            NUnified Event Management
          </p>
        </div>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main
        className="
          min-h-screen

          transition-all
          duration-300

          lg:ml-72
        "
      >
        {/* DESKTOP TOPBAR */}

        <div
          className="
            sticky
            top-0
            z-30

            hidden

            h-20

            items-center
            justify-between

            border-b
            border-gray-200

            bg-white/90

            px-8

            backdrop-blur-xl

            lg:flex
          "
        >
          <div>
            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-widest
                text-yellow-600
              "
            >
              Administrator Portal
            </p>

            <h2
              className="
                mt-1

                text-lg
                font-black
                text-blue-950
              "
            >
              NUnified Event Management
            </h2>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                text-right
              "
            >
              <p
                className="
                  text-sm
                  font-bold
                  text-blue-950
                "
              >
                {user.username || "Administrator"}
              </p>

              <p
                className="
                  text-xs
                  text-gray-500
                "
              >
                System Administrator
              </p>
            </div>

            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-full

                bg-blue-950

                text-yellow-400
              "
            >
              <MaterialIcon name="person" />
            </div>
          </div>
        </div>

        {/* PAGE */}

        <div
          className="
            p-5

            sm:p-6
            lg:p-8
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
