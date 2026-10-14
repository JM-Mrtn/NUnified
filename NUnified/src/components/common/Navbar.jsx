import { Link, NavLink, useNavigate } from "react-router-dom";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name, className = "" }) {
  return (
    <span
      className={`
        material-symbols-rounded
        text-[16px]
        leading-none
        ${className}
      `}
    >
      {name}
    </span>
  );
}

/* =====================================================
   NAVBAR
===================================================== */

export default function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const role = localStorage.getItem("role");

  /* ===================================================
     DASHBOARD ROUTE
  =================================================== */

  const getDashboardRoute = () => {
    if (role === "admin") {
      return "/admin/dashboard";
    }

    if (role === "organization") {
      return "/organization/dashboard";
    }

    return "/";
  };

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
     NAV LINK
  =================================================== */

  const navLinkClass = ({ isActive }) => `
    group
    relative

    flex
    h-8

    items-center
    justify-center
    gap-1.5

    rounded-[10px]

    px-3.5

    text-[12px]
    font-black

    transition-all
    duration-300
    ease-out

    ${
      isActive
        ? `
          bg-[#2A376B]
          text-white

          shadow-[0_4px_14px_rgba(0,0,0,0.16)]

          ring-1
          ring-white/10
        `
        : `
          text-white/90

          hover:-translate-y-[1px]

          hover:bg-white/10
          hover:text-white
        `
    }

    after:absolute
    after:left-1/2
    after:-bottom-[5px]

    after:h-[2px]

    after:-translate-x-1/2

    after:rounded-full
    after:bg-yellow-400

    after:transition-all
    after:duration-300

    ${
      isActive
        ? `
          after:w-5
          after:opacity-100
        `
        : `
          after:w-0
          after:opacity-0

          hover:after:w-4
          hover:after:opacity-100
        `
    }
  `;

  return (
    <header
      className="
        sticky
        top-0
        z-[2000]

        w-full

        border-b
        border-yellow-400/15

        bg-[#1D234E]

        shadow-[0_4px_18px_rgba(3,7,18,0.25)]
      "
    >
      <div
        className="
          mx-auto

          flex
          h-[54px]
          w-full
          max-w-6xl

          items-center
          justify-between

          gap-4

          px-4

          sm:px-6
        "
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <Link
          to="/"
          className="
            group

            flex
            shrink-0
            items-center
            gap-2
          "
        >
          {/* LOGO */}

          <div
            className="
              relative

              flex
              h-8
              w-8

              items-center
              justify-center

              overflow-hidden

              rounded-[9px]

              border
              border-yellow-400/55

              bg-[#16204A]

              text-[12px]
              font-black
              text-yellow-400

              shadow-sm

              transition-all
              duration-300

              group-hover:-translate-y-[1px]
              group-hover:border-yellow-300
            "
          >
            <span
              className="
                pointer-events-none

                absolute
                inset-y-0
                -left-8

                w-6

                rotate-12

                bg-white/20

                transition-all
                duration-700

                group-hover:left-[120%]
              "
            />

            <span className="relative">NU</span>
          </div>

          {/* BRAND TEXT */}

          <div
            className="
              hidden
              leading-none

              min-[440px]:block
            "
          >
            <h1
              className="
                text-[15px]
                font-black
                tracking-tight
                text-white

                transition-colors
                duration-300

                group-hover:text-yellow-300
              "
            >
              NUnified
            </h1>

            <p
              className="
                mt-[3px]

                text-[7px]
                font-bold
                uppercase
                tracking-[0.14em]

                text-blue-100/75
              "
            >
              NU MOA RSO AND CSC
            </p>
          </div>
        </Link>

        {/* =================================================
            DESKTOP NAVIGATION
        ================================================= */}

        <nav
          className="
            hidden

            items-center
            gap-1

            md:flex
          "
        >
          {/* HOME */}

          <NavLink to="/" end className={navLinkClass}>
            {({ isActive }) => (
              <>
                <MaterialIcon
                  name="home"
                  className={
                    isActive
                      ? "text-yellow-400"
                      : "text-white/80 group-hover:text-yellow-400"
                  }
                />

                <span className="text-white">Home</span>
              </>
            )}
          </NavLink>

          {/* STUDENT HOMEPAGE */}

          <NavLink to="/student" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <MaterialIcon
                  name="school"
                  className={
                    isActive
                      ? "text-yellow-400"
                      : "text-white/80 group-hover:text-yellow-400"
                  }
                />

                <span className="text-white">Student Homepage</span>
              </>
            )}
          </NavLink>

          {/* =================================================
              LOGGED IN
          ================================================= */}

          {token ? (
            <>
              <Link
                to={getDashboardRoute()}
                className="
                  group

                  ml-1

                  flex
                  h-8

                  items-center
                  gap-1.5

                  rounded-[10px]

                  border
                  border-white/15

                  bg-white/[0.06]

                  px-3.5

                  text-[12px]
                  font-black
                  text-white

                  transition-all
                  duration-300

                  hover:-translate-y-[1px]
                  hover:bg-[#2A376B]
                "
              >
                <MaterialIcon name="dashboard" className="text-yellow-400" />
                Dashboard
              </Link>

              <button
                type="button"
                onClick={logout}
                className="
                  group

                  relative

                  ml-1

                  flex
                  h-8

                  items-center
                  gap-1.5

                  overflow-hidden

                  rounded-[10px]

                  border
                  border-yellow-300

                  bg-gradient-to-r
                  from-yellow-300
                  via-yellow-400
                  to-amber-400

                  px-4

                  text-[12px]
                  font-black
                  text-[#111936]

                  shadow-[0_4px_14px_rgba(250,204,21,0.20)]

                  transition-all
                  duration-300

                  hover:-translate-y-[1px]
                  hover:scale-[1.02]

                  active:scale-[0.98]
                "
              >
                <MaterialIcon name="logout" />
                Logout
              </button>
            </>
          ) : (
            /* =================================================
                SIGN IN
            ================================================= */

            <Link
              to="/login"
              className="
                group

                relative

                ml-1

                flex
                h-8

                items-center
                gap-1.5

                overflow-hidden

                rounded-[10px]

                border
                border-yellow-300

                bg-gradient-to-r
                from-yellow-300
                via-yellow-400
                to-amber-400

                px-4

                text-[12px]
                font-black
                text-[#111936]

                shadow-[0_4px_14px_rgba(250,204,21,0.22)]

                transition-all
                duration-300

                hover:-translate-y-[1px]
                hover:scale-[1.02]

                hover:shadow-[0_7px_20px_rgba(250,204,21,0.30)]

                active:scale-[0.98]
              "
            >
              <span
                className="
                  pointer-events-none

                  absolute
                  inset-y-0
                  -left-10

                  w-8

                  rotate-12

                  bg-white/40

                  transition-all
                  duration-700

                  group-hover:left-[120%]
                "
              />

              <MaterialIcon name="login" className="relative" />

              <span className="relative">Sign In</span>
            </Link>
          )}
        </nav>

        {/* =================================================
            MOBILE
        ================================================= */}

        <div
          className="
            flex
            items-center
            gap-1.5

            md:hidden
          "
        >
          <Link
            to="/student"
            className="
              flex
              h-8

              items-center
              gap-1

              rounded-[9px]

              border
              border-white/15

              bg-white/[0.08]

              px-2.5

              text-[11px]
              font-black
              text-white
            "
          >
            <MaterialIcon name="school" className="text-yellow-400" />
            Student
          </Link>

          {token ? (
            <Link
              to={getDashboardRoute()}
              className="
                flex
                h-8
                w-8

                items-center
                justify-center

                rounded-[9px]

                bg-yellow-400

                text-[#111936]
              "
            >
              <MaterialIcon name="dashboard" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="
                flex
                h-8
                w-8

                items-center
                justify-center

                rounded-[9px]

                bg-yellow-400

                text-[#111936]
              "
            >
              <MaterialIcon name="login" />
            </Link>
          )}
        </div>
      </div>

      {/* BOTTOM ACCENT */}

      <div
        className="
          h-px
          w-full

          bg-gradient-to-r
          from-transparent
          via-yellow-400/25
          to-transparent
        "
      />
    </header>
  );
}
