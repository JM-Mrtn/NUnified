import { Link } from "react-router-dom";

import { motion } from "framer-motion";

import Navbar from "../../components/common/Navbar.jsx";
import Footer from "../../components/common/Footer.jsx";

import numoaImage from "../../assets/numoa.webp";

function MaterialIcon({ name }) {
  return (
    <span
      className="
        material-symbols-rounded
        text-[18px]
      "
    >
      {name}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div
      className="
        flex
        min-h-screen
        flex-col

        bg-[#07152d]
      "
    >
      {/* =================================================
          NAVBAR
      ================================================= */}

      <Navbar />

      {/* =================================================
          MAIN

          flex-1 makes this section use all remaining
          viewport space so the footer stays at the bottom.
      ================================================= */}

      <main
        className="
          flex
          flex-1
          flex-col
        "
      >
        {/* =================================================
            HERO
        ================================================= */}

        <section
          className="
            relative

            flex
            flex-1

            min-h-[500px]

            overflow-hidden

            border-b
            border-yellow-400/80

            sm:min-h-[540px]

            lg:min-h-[580px]
          "
        >
          {/* ===============================================
              BACKGROUND IMAGE
          ================================================ */}

          <img
            src={numoaImage}
            alt="NU MOA Campus"
            className="
              absolute
              inset-0

              h-full
              w-full

              object-cover
              object-center
            "
          />

          {/* ===============================================
              BLUE OVERLAY
          ================================================ */}

          <div
            className="
              absolute
              inset-0

              bg-gradient-to-r

              from-[#071d43]/95

              via-[#0d4a83]/75

              to-[#4eaee0]/45
            "
          />

          {/* ===============================================
              LEFT DARK SHADE
          ================================================ */}

          <div
            className="
              absolute
              inset-0

              bg-gradient-to-r

              from-[#061b3d]/60

              via-transparent

              to-transparent
            "
          />

          {/* ===============================================
              BOTTOM SHADE
          ================================================ */}

          <div
            className="
              absolute
              inset-x-0
              bottom-0

              h-28

              bg-gradient-to-t
              from-[#04152c]/45
              to-transparent
            "
          />

          {/* =================================================
              HERO CONTENT
          ================================================= */}

          <div
            className="
              relative
              z-10

              mx-auto

              flex
              w-full
              max-w-6xl
              flex-1

              items-center
              justify-center

              px-5
              py-12

              sm:px-6
              sm:py-14

              lg:py-16
            "
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
              }}
              className="
                w-full
                max-w-[760px]

                text-center
              "
            >
              {/* =============================================
                  TITLE
              ============================================== */}

              <h1
                className="
                  font-black
                  uppercase

                  leading-[0.86]

                  tracking-[-0.045em]

                  text-white

                  text-[clamp(3.2rem,4.2vw,4.8rem)]
                "
              >
                <span className="block">Your</span>

                <span
                  className="
                    block

                    text-yellow-400

                    drop-shadow-[0_3px_10px_rgba(250,204,21,0.16)]
                  "
                >
                  Campus
                </span>

                <span className="block">Events</span>
              </h1>

              {/* =============================================
                  DESCRIPTION
              ============================================== */}

              <p
                className="
                  mx-auto
                  mt-7

                  max-w-[610px]

                  text-[14px]
                  font-medium
                  leading-6

                  text-white/90

                  sm:text-[15px]
                  sm:leading-7
                "
              >
                A unified platform that helps NU organizations create events,
                manage venue bookings, and connect with the campus community.
              </p>

              {/* =============================================
                  EXPLORE BUTTON
              ============================================== */}

              <Link
                to="/student"
                className="
                  group

                  relative

                  mt-7

                  inline-flex
                  h-12

                  items-center
                  justify-center
                  gap-2

                  overflow-hidden

                  rounded-full

                  border
                  border-yellow-300

                  bg-gradient-to-r
                  from-yellow-300
                  via-yellow-400
                  to-amber-400

                  px-7

                  text-[13px]
                  font-black
                  text-[#111936]

                  shadow-[0_8px_24px_rgba(250,204,21,0.23)]

                  transition-all
                  duration-300

                  hover:-translate-y-1
                  hover:scale-[1.025]

                  hover:shadow-[0_12px_30px_rgba(250,204,21,0.35)]

                  active:translate-y-0
                  active:scale-[0.98]
                "
              >
                {/* SHINE */}

                <span
                  className="
                    pointer-events-none

                    absolute
                    inset-y-0
                    -left-12

                    w-10

                    rotate-12

                    bg-white/45

                    blur-sm

                    transition-all
                    duration-700

                    group-hover:left-[120%]
                  "
                />

                <span className="relative">Explore Events</span>

                <MaterialIcon name="arrow_forward" />
              </Link>
            </motion.div>
          </div>

          {/* =================================================
              BOTTOM GOLD ACCENT
          ================================================= */}

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              z-20

              h-[2px]

              bg-gradient-to-r

              from-transparent
              via-yellow-400
              to-transparent
            "
          />
        </section>
      </main>

      {/* =================================================
          FOOTER

          Because the parent is min-h-screen + flex-col
          and main is flex-1, this stays at the bottom.
      ================================================= */}

      <Footer />
    </div>
  );
}
