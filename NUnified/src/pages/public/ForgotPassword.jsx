import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   EMAIL
===================================================== */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/* =====================================================
   FORGOT PASSWORD
===================================================== */

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* ===================================================
     SEND OTP
  =================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Email address is required.");

      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address.");

      return;
    }

    setLoading(true);

    setError("");

    try {
      await api.post(
        "/forgot-password/request-otp",

        {
          email: cleanEmail,
        },
      );

      /*
          Save only the recovery email.

          The OTP itself is never stored.
        */

      sessionStorage.setItem("passwordResetEmail", cleanEmail);

      sessionStorage.removeItem("passwordResetToken");

      navigate(
        "/verify-otp",

        {
          state: {
            email: cleanEmail,
          },
        },
      );
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to send the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen

        bg-gradient-to-br
        from-[#020617]
        via-[#001F3F]
        to-[#004B85]

        px-4
        py-10

        flex
        items-center
        justify-center
      "
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="
          w-full
          max-w-[405px]

          rounded-[22px]

          bg-[#F8F9FB]

          px-7
          py-8

          shadow-2xl
        "
      >
        {/* LOGO */}

        <div
          className="
            mx-auto

            flex
            h-[58px]
            w-[58px]
            items-center
            justify-center

            rounded-[14px]

            bg-[#174A91]

            text-[19px]
            font-black
            text-yellow-400

            shadow-md
          "
        >
          NU
        </div>

        {/* TITLE */}

        <h1
          className="
            mt-5

            text-center

            text-[27px]
            font-black
            text-[#172554]
          "
        >
          Forgot Password?
        </h1>

        <p
          className="
            mx-auto
            mt-2

            max-w-[320px]

            text-center

            text-[12px]
            leading-5
            text-gray-500
          "
        >
          Enter the email registered to your NUnified account. We'll send you a
          verification code.
        </p>

        {/* ERROR */}

        {error && (
          <div
            className="
              mt-5

              rounded-xl

              border
              border-red-200

              bg-red-50

              px-4
              py-3

              text-[10px]
              font-bold
              text-red-700
            "
          >
            {error}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="
            mt-6
          "
        >
          <label
            className="
              text-[11px]
              font-black
              text-blue-950
            "
          >
            Registered Email
            <span className="text-red-500"> *</span>
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              setError("");
            }}
            autoComplete="email"
            placeholder="Enter your registered email"
            className="
              mt-2

              h-12
              w-full

              rounded-xl

              border
              border-gray-300

              bg-white

              px-4

              text-[12px]
              text-blue-950

              outline-none

              focus:border-yellow-400
              focus:ring-2
              focus:ring-yellow-100
            "
          />

          <p
            className="
              mt-2

              text-[9px]
              leading-4
              text-gray-400
            "
          >
            Use the same email registered by the administrator for your
            organization account.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="
              mt-5

              h-12
              w-full

              rounded-full

              bg-gradient-to-r
              from-yellow-300
              to-yellow-500

              text-[13px]
              font-bold
              text-blue-950

              shadow-md

              transition

              hover:scale-[1.01]

              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        {/* SECURITY */}

        <div
          className="
            mt-5

            rounded-xl

            bg-blue-50

            px-4
            py-3

            text-[9px]
            leading-4
            text-blue-700
          "
        >
          The verification code expires after 5 minutes and can only be used for
          this password reset.
        </div>

        {/* BACK */}

        <Link
          to="/login"
          className="
            mt-6
            block

            text-center

            text-[10px]
            font-bold
            text-blue-950

            hover:text-blue-700
          "
        >
          ← Back to Sign In
        </Link>
      </motion.div>
    </div>
  );
}
