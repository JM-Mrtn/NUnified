import { motion } from "framer-motion";

export default function LoadingScreen({ progress = 0 }) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[99999]

        flex
        min-h-screen
        items-center
        justify-center

        overflow-hidden

        bg-gradient-to-br
        from-[#020617]
        via-[#001F3F]
        to-[#003B7A]

        px-6
      "
    >
      {/* BACKGROUND DECORATION */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -left-40
            -top-40

            h-[420px]
            w-[420px]

            rounded-full

            bg-blue-500/10

            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-40
            -right-40

            h-[500px]
            w-[500px]

            rounded-full

            bg-yellow-400/5

            blur-3xl
          "
        />
      </div>

      {/* CONTENT */}

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.5,
        }}
        className="
          relative
          z-10

          flex
          w-full
          max-w-md

          flex-col
          items-center

          text-center
        "
      >
        {/* NU LOGO */}

        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.55,
          }}
          className="
            flex
            h-28
            w-28

            items-center
            justify-center

            rounded-[28px]

            bg-white

            text-5xl
            font-black
            tracking-tight
            text-[#16265A]

            shadow-2xl

            sm:h-32
            sm:w-32
            sm:text-6xl
          "
        >
          NU
        </motion.div>

        {/* BRAND */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
            duration: 0.55,
          }}
          className="
            mt-8
          "
        >
          <h1
            className="
              text-4xl
              font-black
              tracking-tight
              text-white

              sm:text-5xl
            "
          >
            NUnified
          </h1>

          <p
            className="
              mt-2

              text-xs
              font-black
              uppercase
              tracking-[0.38em]
              text-yellow-400

              sm:text-sm
            "
          >
            NU MOA RSO AND CSC
          </p>
        </motion.div>

        {/* PROGRESS */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
            duration: 0.55,
          }}
          className="
            mt-12
            w-full
            max-w-[270px]

            sm:max-w-[300px]
          "
        >
          {/* BAR */}

          <div
            className="
              h-2
              w-full

              overflow-hidden

              rounded-full

              bg-white/15
            "
          >
            <motion.div
              className="
                h-full
                rounded-full

                bg-gradient-to-r
                from-yellow-300
                to-yellow-500
              "
              animate={{
                width: `${progress}%`,
              }}
              transition={{
                duration: 0.15,
                ease: "easeOut",
              }}
            />
          </div>

          {/* LOADING TEXT */}

          <div
            className="
              mt-5

              flex
              items-center
              justify-center
              gap-1

              text-sm
              font-medium
              text-white

              sm:text-base
            "
          >
            <span>Loading</span>

            <span
              className="
                min-w-[45px]
                font-semibold
              "
            >
              {progress}%
            </span>
          </div>
        </motion.div>

        {/* SMALL LOADING DOTS */}

        <div
          className="
            mt-8

            flex
            items-center
            gap-2
          "
        >
          {[0, 1, 2].map((item) => (
            <motion.span
              key={item}
              animate={{
                opacity: [0.25, 1, 0.25],

                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: item * 0.2,
              }}
              className="
                  h-2
                  w-2

                  rounded-full

                  bg-yellow-400
                "
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
