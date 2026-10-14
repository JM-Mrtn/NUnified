import { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   VERIFY OTP
===================================================== */

export default function VerifyOTP() {
  const navigate = useNavigate();

  const location = useLocation();

  const email =
    location.state?.email || sessionStorage.getItem("passwordResetEmail") || "";

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [cooldown, setCooldown] = useState(60);

  /* ===================================================
     COUNTDOWN
  =================================================== */

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  /* ===================================================
     VERIFY
  =================================================== */

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!email) {
      setError(
        "Your password reset session is missing. Please request another OTP.",
      );

      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit verification code.");

      return;
    }

    setLoading(true);

    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/forgot-password/verify-otp",

        {
          email,
          otp,
        },
      );

      const resetToken = response.data?.resetToken;

      if (!resetToken) {
        throw new Error("Reset token was not returned.");
      }

      sessionStorage.setItem("passwordResetEmail", email);

      sessionStorage.setItem("passwordResetToken", resetToken);

      setSuccess("Verification successful.");

      setTimeout(() => {
        navigate("/reset-password", {
          replace: true,
        });
      }, 650);
    } catch (err) {
      console.error("VERIFY RESET OTP ERROR:", err);

      setError(
        err.response?.data?.message || "Invalid or expired verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================
     RESEND
  =================================================== */

  const resendOtp = async () => {
    if (!email || cooldown > 0 || resending) {
      return;
    }

    setResending(true);

    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/forgot-password/request-otp",

        {
          email,
        },
      );

      setOtp("");

      setCooldown(60);

      setSuccess(response.data?.message || "A new verification code was sent.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend the verification code.",
      );
    } finally {
      setResending(false);
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
      <motion.form
        onSubmit={handleVerify}
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

            text-yellow-400

            shadow-md
          "
        >
          <span
            className="
              material-symbols-rounded
              text-[26px]
            "
          >
            mark_email_read
          </span>
        </div>

        <h1
          className="
            mt-5

            text-center

            text-[27px]
            font-black
            text-[#172554]
          "
        >
          Verify OTP
        </h1>

        <p
          className="
            mt-2

            text-center

            text-[11px]
            leading-5
            text-gray-500
          "
        >
          Enter the 6-digit code sent to
        </p>

        <p
          className="
            text-center

            text-[11px]
            font-black
            text-blue-950
          "
        >
          {email || "your registered email"}
        </p>

        {error && (
          <div
            className="
              mt-5

              rounded-xl

              border
              border-red-200

              bg-red-50

              p-3

              text-[10px]
              font-bold
              text-red-700
            "
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="
              mt-5

              rounded-xl

              border
              border-green-200

              bg-green-50

              p-3

              text-[10px]
              font-bold
              text-green-700
            "
          >
            {success}
          </div>
        )}

        <div
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
            Verification Code
          </label>

          <input
            type="text"
            value={otp}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "").slice(0, 6);

              setOtp(value);

              setError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="
              mt-2

              h-14
              w-full

              rounded-xl

              border
              border-gray-300

              bg-white

              px-4

              text-center

              text-[22px]
              font-black
              tracking-[0.3em]
              text-blue-950

              outline-none

              focus:border-yellow-400
              focus:ring-2
              focus:ring-yellow-100
            "
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
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

            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div
          className="
            mt-5

            text-center
          "
        >
          <p
            className="
              text-[9px]
              text-gray-500
            "
          >
            Didn't receive the code?
          </p>

          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={resendOtp}
            className="
              mt-1

              text-[10px]
              font-black
              text-blue-700

              disabled:cursor-not-allowed
              disabled:text-gray-400
            "
          >
            {resending
              ? "Sending..."
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP"}
          </button>
        </div>

        <Link
          to="/forgot-password"
          className="
            mt-6
            block

            text-center

            text-[10px]
            font-bold
            text-blue-950
          "
        >
          ← Change Email
        </Link>
      </motion.form>
    </div>
  );
}
