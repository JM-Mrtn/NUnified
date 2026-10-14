import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      className="
        relative
        z-30

        border-t-2
        border-blue-600

        bg-gradient-to-r
        from-[#020617]
        via-[#001F3F]
        to-[#003B7A]

        text-white
      "
    >
      <div
        className="
          mx-auto

          grid
          max-w-7xl

          gap-10

          px-6
          py-10

          md:grid-cols-3

          lg:px-10
        "
      >
        {/* BRAND */}

        <div>
          <h2
            className="
              text-2xl
              font-black
              text-yellow-400
            "
          >
            NUnified
          </h2>

          <p
            className="
              mt-3

              text-sm
              leading-6
              text-gray-200
            "
          >
            NU MOA RSO AND CSC
            <br />
            Event Management System
          </p>
        </div>

        {/* LINKS */}

        <div>
          <h3
            className="
              text-base
              font-black
              text-white
            "
          >
            Quick Links
          </h3>

          <div
            className="
              mt-4

              flex
              flex-col
              gap-3
            "
          >
            <Link
              to="/"
              className="
                text-sm
                text-gray-200

                transition

                hover:text-yellow-400
              "
            >
              Home
            </Link>

            <Link
              to="/student"
              className="
                text-sm
                text-gray-200

                transition

                hover:text-yellow-400
              "
            >
              Student Homepage
            </Link>

            <Link
              to="/login"
              className="
                text-sm
                text-gray-200

                transition

                hover:text-yellow-400
              "
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* SYSTEM */}

        <div>
          <h3
            className="
              text-base
              font-black
              text-white
            "
          >
            NUnified System
          </h3>

          <p
            className="
              mt-4

              max-w-md

              text-sm
              leading-6
              text-gray-200
            "
          >
            A centralized event management platform for NU organizations,
            announcements, venue reservations, and student activities.
          </p>
        </div>
      </div>

      <div
        className="
          border-t
          border-white/10

          px-6
          py-4

          text-center

          text-xs
          text-blue-200
        "
      >
        © 2026 NUnified. All rights reserved.
      </div>
    </footer>
  );
}
