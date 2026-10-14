import { useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   PASSWORD RULES
===================================================== */

function getPasswordRules(password) {
  const value = String(password || "");

  return {
    required: value.length > 0,

    minimum: value.length >= 8,

    maximum: value.length > 0 && value.length <= 20,

    uppercase: /[A-Z]/.test(value),

    lowercase: /[a-z]/.test(value),

    special: /[^A-Za-z0-9]/.test(value),
  };
}

/* =====================================================
   RESET PASSWORD
===================================================== */

export default function ResetPassword() {
  const navigate = useNavigate();

  /* ===================================================
     IMPORTANT FIX

     Read the reset session ONLY ONCE.

     Do not read sessionStorage again every render,
     otherwise removing it after success makes the
     page think the session expired.
  =================================================== */

  const [resetEmail] = useState(
    () => sessionStorage.getItem("passwordResetEmail") || "",
  );

  const [resetToken] = useState(
    () => sessionStorage.getItem("passwordResetToken") || "",
  );

  /* ===================================================
     FORM
  =================================================== */

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  /* ===================================================
     VISIBILITY
  =================================================== */

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  /* ===================================================
     PAGE STATES
  =================================================== */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [resetComplete, setResetComplete] = useState(false);

  /* ===================================================
     PASSWORD RULES
  =================================================== */

  const rules = useMemo(() => getPasswordRules(newPassword), [newPassword]);

  const passwordValid = Object.values(rules).every(Boolean);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  /* ===================================================
     RESET PASSWORD
  =================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    /* ===============================================
         RESET SESSION
      =============================================== */

    if (!resetEmail || !resetToken) {
      setError(
        "Your password reset session is missing or expired. Please request another OTP.",
      );

      return;
    }

    /* ===============================================
         PASSWORD REQUIREMENTS
      =============================================== */

    if (!passwordValid) {
      setError("Please complete all password requirements.");

      return;
    }

    /* ===============================================
         PASSWORD MATCH
      =============================================== */

    if (!passwordsMatch) {
      setError("New password and confirmation do not match.");

      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/forgot-password/reset-password", {
        email: resetEmail,

        resetToken,

        newPassword,

        confirmPassword,
      });

      /* =============================================
           SUCCESS

           IMPORTANT:
           Keep the session values temporarily so this
           page does not switch to "Session Expired".
        ============================================= */

      setResetComplete(true);

      setSuccess(
        response.data?.message ||
          "Your password has been changed successfully.",
      );

      /* =============================================
           CLEAR PASSWORD FIELDS
        ============================================= */

      setNewPassword("");

      setConfirmPassword("");

      /* =============================================
           WAIT BRIEFLY SO USER SEES SUCCESS MESSAGE

           THEN remove reset session and go to Login.
        ============================================= */

      setTimeout(() => {
        sessionStorage.removeItem("passwordResetEmail");

        sessionStorage.removeItem("passwordResetToken");

        navigate("/login", {
          replace: true,
        });
      }, 1800);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      setError(err.response?.data?.message || "Unable to reset your password.");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SUCCESS SCREEN

     This appears briefly after changing the password.

     It prevents the "session expired" screen from
     appearing after success.
  ===================================================== */

  if (resetComplete) {
    return (
      <div
        className="
          min-h-screen

          flex
          items-center
          justify-center

          bg-gradient-to-br
          from-[#020617]
          via-[#001F3F]
          to-[#004B85]

          px-4
          py-10
        "
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
          className="
            w-full
            max-w-[420px]

            rounded-[22px]

            bg-white

            px-8
            py-9

            text-center

            shadow-2xl
          "
        >
          {/* SUCCESS ICON */}

          <div
            className="
              mx-auto

              flex
              h-16
              w-16
              items-center
              justify-center

              rounded-full

              bg-green-100

              text-green-600
            "
          >
            <span
              className="
                material-symbols-rounded
                text-[34px]
              "
            >
              check_circle
            </span>
          </div>

          {/* TITLE */}

          <h1
            className="
              mt-5

              text-[24px]
              font-black
              text-blue-950
            "
          >
            Password Changed
          </h1>

          {/* MESSAGE */}

          <p
            className="
              mt-3

              text-[11px]
              leading-5
              text-gray-500
            "
          >
            {success || "Your password has been changed successfully."}
          </p>

          <div
            className="
              mt-5

              flex
              items-center
              justify-center
              gap-2

              text-[10px]
              font-bold
              text-blue-700
            "
          >
            <span
              className="
                material-symbols-rounded

                animate-spin

                text-[17px]
              "
            >
              progress_activity
            </span>
            Redirecting to Sign In...
          </div>
        </motion.div>
      </div>
    );
  }

  /* =====================================================
     MISSING / EXPIRED RESET SESSION
  ===================================================== */

  if (!resetEmail || !resetToken) {
    return (
      <div
        className="
          min-h-screen

          flex
          items-center
          justify-center

          bg-gradient-to-br
          from-[#020617]
          via-[#001F3F]
          to-[#004B85]

          px-4
          py-10
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

            bg-white

            p-8

            text-center

            shadow-2xl
          "
        >
          {/* ERROR ICON */}

          <div
            className="
              mx-auto

              flex
              h-14
              w-14
              items-center
              justify-center

              rounded-2xl

              bg-red-100

              text-red-600
            "
          >
            <span
              className="
                material-symbols-rounded
                text-[27px]
              "
            >
              schedule
            </span>
          </div>

          {/* TITLE */}

          <h1
            className="
              mt-5

              text-[22px]
              font-black
              text-blue-950
            "
          >
            Reset Session Expired
          </h1>

          {/* DESCRIPTION */}

          <p
            className="
              mt-2

              text-[11px]
              leading-5
              text-gray-500
            "
          >
            Your password reset verification is no longer available. Please
            request another verification code.
          </p>

          {/* REQUEST AGAIN */}

          <Link
            to="/forgot-password"
            className="
              mt-6

              flex
              h-11
              w-full
              items-center
              justify-center

              rounded-full

              bg-yellow-400

              text-[11px]
              font-black
              text-blue-950

              transition

              hover:bg-yellow-300
            "
          >
            Request New OTP
          </Link>

          {/* LOGIN */}

          <Link
            to="/login"
            className="
              mt-4
              block

              text-[10px]
              font-bold
              text-gray-500

              hover:text-blue-800
            "
          >
            ← Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  /* =====================================================
     RESET PASSWORD FORM
  ===================================================== */

  return (
    <div
      className="
        min-h-screen

        flex
        items-center
        justify-center

        bg-gradient-to-br
        from-[#020617]
        via-[#001F3F]
        to-[#004B85]

        px-4
        py-10
      "
    >
      <motion.form
        onSubmit={handleSubmit}
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
          max-w-[470px]

          rounded-[22px]

          bg-[#F8F9FB]

          px-7
          py-8

          shadow-2xl
        "
      >
        {/* =================================================
            ICON
        ================================================= */}

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
              text-[27px]
            "
          >
            lock_reset
          </span>
        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <h1
          className="
            mt-5

            text-center

            text-[27px]
            font-black
            text-[#172554]
          "
        >
          Create New Password
        </h1>

        <p
          className="
            mt-2

            text-center

            text-[11px]
            text-gray-500
          "
        >
          Create a secure password for your NUnified account.
        </p>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="
              mt-5

              flex
              items-start
              gap-2

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
            <span
              className="
                material-symbols-rounded
                text-[16px]
              "
            >
              error
            </span>

            <span>{error}</span>
          </div>
        )}

        {/* =================================================
            NEW PASSWORD
        ================================================= */}

        <div
          className="
            mt-6
          "
        >
          <label
            className="
              text-[10px]
              font-black
              text-blue-950
            "
          >
            New Password
            <span
              className="
                ml-1
                text-red-500
              "
            >
              *
            </span>
          </label>

          <div
            className="
              relative
              mt-2
            "
          >
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);

                setError("");
              }}
              maxLength={20}
              autoComplete="new-password"
              className="
                h-12
                w-full

                rounded-xl

                border
                border-gray-300

                bg-white

                pl-4
                pr-20

                text-[11px]
                text-blue-950

                outline-none

                transition

                focus:border-yellow-400
                focus:ring-2
                focus:ring-yellow-100
              "
            />

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="
                absolute
                right-4
                top-1/2

                -translate-y-1/2

                text-[10px]
                font-bold
                text-blue-600

                hover:text-blue-900
              "
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* =================================================
            PASSWORD REQUIREMENTS
        ================================================= */}

        <div
          className="
            mt-3

            rounded-xl

            border
            border-gray-200

            bg-gray-50

            p-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <p
              className="
                text-[9px]
                font-black
                text-blue-950
              "
            >
              Password Requirements
            </p>

            <span
              className={`
                text-[8px]

                ${newPassword.length > 20 ? "text-red-600" : "text-gray-400"}
              `}
            >
              {newPassword.length}/20
            </span>
          </div>

          <div
            className="
              mt-3

              grid
              gap-2

              sm:grid-cols-2
            "
          >
            <Requirement passed={rules.required} text="Password is required" />

            <Requirement passed={rules.minimum} text="At least 8 characters" />

            <Requirement passed={rules.maximum} text="Maximum 20 characters" />

            <Requirement passed={rules.uppercase} text="One uppercase letter" />

            <Requirement passed={rules.lowercase} text="One lowercase letter" />

            <Requirement passed={rules.special} text="One special character" />
          </div>

          <p
            className="
              mt-3

              text-[8px]
              leading-4
              text-gray-400
            "
          >
            Special characters include symbols such as @, #, $, !, %, &, and *.
          </p>
        </div>

        {/* =================================================
            CONFIRM PASSWORD
        ================================================= */}

        <div
          className="
            mt-4
          "
        >
          <label
            className="
              text-[10px]
              font-black
              text-blue-950
            "
          >
            Confirm New Password
            <span
              className="
                ml-1
                text-red-500
              "
            >
              *
            </span>
          </label>

          <div
            className="
              relative
              mt-2
            "
          >
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);

                setError("");
              }}
              maxLength={20}
              autoComplete="new-password"
              className="
                h-12
                w-full

                rounded-xl

                border
                border-gray-300

                bg-white

                pl-4
                pr-20

                text-[11px]
                text-blue-950

                outline-none

                transition

                focus:border-yellow-400
                focus:ring-2
                focus:ring-yellow-100
              "
            />

            <button
              type="button"
              onClick={() => setShowConfirm((previous) => !previous)}
              className="
                absolute
                right-4
                top-1/2

                -translate-y-1/2

                text-[10px]
                font-bold
                text-blue-600

                hover:text-blue-900
              "
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>

          {/* ===============================================
              MATCH STATUS
          =============================================== */}

          {confirmPassword && (
            <div
              className={`
                mt-2

                flex
                items-center
                gap-1.5

                text-[9px]
                font-bold

                ${passwordsMatch ? "text-green-600" : "text-red-600"}
              `}
            >
              <span
                className="
                  material-symbols-rounded
                  text-[14px]
                "
              >
                {passwordsMatch ? "check_circle" : "cancel"}
              </span>

              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </div>
          )}
        </div>

        {/* =================================================
            CHANGE PASSWORD
        ================================================= */}

        <button
          type="submit"
          disabled={loading || !passwordValid || !passwordsMatch}
          className="
            mt-5

            flex
            h-12
            w-full
            items-center
            justify-center
            gap-2

            rounded-full

            bg-gradient-to-r
            from-yellow-300
            to-yellow-500

            text-[12px]
            font-black
            text-blue-950

            shadow-md

            transition

            hover:scale-[1.01]

            disabled:cursor-not-allowed
            disabled:bg-gray-200
            disabled:from-gray-200
            disabled:to-gray-200
            disabled:text-gray-400
          "
        >
          {loading && (
            <span
              className="
                material-symbols-rounded

                animate-spin

                text-[17px]
              "
            >
              progress_activity
            </span>
          )}

          {loading ? "Changing Password..." : "Change Password"}
        </button>

        {/* =================================================
            BACK TO LOGIN
        ================================================= */}

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
      </motion.form>
    </div>
  );
}

/* =====================================================
   REQUIREMENT
===================================================== */

function Requirement({ passed, text }) {
  return (
    <div
      className={`
        flex
        items-center
        gap-1.5

        text-[8px]
        font-bold

        ${passed ? "text-green-600" : "text-gray-400"}
      `}
    >
      <span
        className="
          material-symbols-rounded
          text-[13px]
        "
      >
        {passed ? "check_circle" : "radio_button_unchecked"}
      </span>

      <span>{text}</span>
    </div>
  );
}
