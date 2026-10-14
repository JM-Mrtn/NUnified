import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

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
   PASSWORD VALIDATION
===================================================== */

function getPasswordRules(password) {
  const value = String(password || "");

  return {
    required: value.length > 0,

    minimum: value.length >= 8,

    maximum: value.length > 0 && value.length <= 20,

    special: /[^A-Za-z0-9]/.test(value),

    uppercase: /[A-Z]/.test(value),

    lowercase: /[a-z]/.test(value),
  };
}

/* =====================================================
   CHANGE PASSWORD PAGE
===================================================== */

export default function ChangePassword() {
  const navigate = useNavigate();

  /* ===================================================
     PASSWORD VISIBILITY
  =================================================== */

  const [showCurrent, setShowCurrent] = useState(false);

  const [showNew, setShowNew] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  /* ===================================================
     PASSWORD FORM
  =================================================== */

  const [formData, setFormData] = useState({
    currentPassword: "",

    newPassword: "",

    confirmPassword: "",
  });

  /* ===================================================
     OTP
  =================================================== */

  const [otp, setOtp] = useState("");

  const [otpStep, setOtpStep] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  /* ===================================================
     PAGE STATES
  =================================================== */

  const [sending, setSending] = useState(false);

  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     PASSWORD RULES
  =================================================== */

  const passwordRules = useMemo(
    () => getPasswordRules(formData.newPassword),
    [formData.newPassword],
  );

  const passwordValid = Object.values(passwordRules).every(Boolean);

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const currentPasswordValid = formData.currentPassword.trim().length > 0;

  const formValid = currentPasswordValid && passwordValid && passwordsMatch;

  /* ===================================================
     RESEND COUNTDOWN
  =================================================== */

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [cooldown]);

  /* ===================================================
     INPUT CHANGE
  =================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* ===================================================
     VALIDATION MESSAGE
  =================================================== */

  const getValidationError = () => {
    if (!formData.currentPassword.trim()) {
      return "Current password is required.";
    }

    if (!passwordRules.required) {
      return "New password is required.";
    }

    if (!passwordRules.minimum) {
      return "New password must contain at least 8 characters.";
    }

    if (!passwordRules.maximum) {
      return "New password must not exceed 20 characters.";
    }

    if (!passwordRules.special) {
      return "New password must contain at least one special character, such as @, #, $, or !.";
    }

    if (!passwordRules.uppercase) {
      return "New password must contain at least one uppercase letter (A-Z).";
    }

    if (!passwordRules.lowercase) {
      return "New password must contain at least one lowercase letter (a-z).";
    }

    if (!formData.confirmPassword) {
      return "Please confirm your new password.";
    }

    if (!passwordsMatch) {
      return "New password and confirmation do not match.";
    }

    return "";
  };

  /* ===================================================
     SEND OTP REQUEST

     IMPORTANT FIX:

     Backend expects:
     - currentPassword
     - newPassword
     - confirmPassword
  =================================================== */

  const requestOtp = async (event) => {
    if (event) {
      event.preventDefault();
    }

    const validationError = getValidationError();

    if (validationError) {
      setError(validationError);

      return;
    }

    setSending(true);

    setError("");

    setSuccess("");

    try {
      const response = await api.post(
        "/password-change/request-otp",

        {
          currentPassword: formData.currentPassword,

          newPassword: formData.newPassword,

          /* =========================================
                 THIS WAS MISSING BEFORE
              ========================================= */

          confirmPassword: formData.confirmPassword,
        },
      );

      setOtpStep(true);

      setOtp("");

      setCooldown(60);

      setSuccess(
        response.data?.message ||
          "Verification code sent to your registered organization email.",
      );
    } catch (err) {
      console.error("REQUEST PASSWORD OTP ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to send verification code.",
      );
    } finally {
      setSending(false);
    }
  };

  /* ===================================================
     RESEND OTP

     Uses the SAME requestOtp()
     so confirmPassword is also included.
  =================================================== */

  const resendOtp = async () => {
    if (cooldown > 0 || sending) {
      return;
    }

    await requestOtp();
  };

  /* ===================================================
     VERIFY OTP
  =================================================== */

  const verifyOtp = async (event) => {
    event.preventDefault();

    const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);

    if (cleanOtp.length !== 6) {
      setError("Enter the 6-digit verification code.");

      return;
    }

    setVerifying(true);

    setError("");

    setSuccess("");

    try {
      const response = await api.post(
        "/password-change/verify-otp",

        {
          otp: cleanOtp,
        },
      );

      setSuccess(response.data?.message || "Password changed successfully.");

      /* ===============================================
           LOG OUT AFTER SUCCESSFUL PASSWORD CHANGE
        =============================================== */

      setTimeout(() => {
        localStorage.removeItem("token");

        localStorage.removeItem("role");

        localStorage.removeItem("user");

        navigate(
          "/login",

          {
            replace: true,
          },
        );
      }, 1200);
    } catch (err) {
      console.error("VERIFY PASSWORD OTP ERROR:", err);

      setError(
        err.response?.data?.message || "Invalid or expired verification code.",
      );
    } finally {
      setVerifying(false);
    }
  };

  /* ===================================================
     CANCEL OTP
  =================================================== */

  const cancelOtp = async () => {
    try {
      await api.delete("/password-change/cancel");
    } catch (err) {
      console.error("CANCEL PASSWORD OTP ERROR:", err);
    }

    setOtpStep(false);

    setOtp("");

    setCooldown(0);

    setError("");

    setSuccess("");
  };

  /* =====================================================
     PASSWORD FORM
  ===================================================== */

  if (!otpStep) {
    return (
      <div
        className="
          flex
          min-h-[75vh]
          items-center
          justify-center

          px-4
          py-8
        "
      >
        <motion.form
          onSubmit={requestOtp}
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
            max-w-[650px]

            rounded-[22px]

            bg-white

            p-7

            shadow-[0_10px_30px_rgba(15,23,42,0.10)]
          "
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              text-center
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

                rounded-2xl

                bg-blue-950

                text-yellow-400
              "
            >
              <MaterialIcon
                name="lock_reset"
                className="
                  text-[25px]
                "
              />
            </div>

            <h1
              className="
                mt-5

                text-[24px]
                font-black
                text-blue-950
              "
            >
              Change Password
            </h1>

            <p
              className="
                mt-2

                text-[11px]
                text-gray-500
              "
            >
              Update your organization account password securely.
            </p>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <Message
              type="error"
              message={error}
              onClose={() => setError("")}
            />
          )}

          {/* =================================================
              CURRENT PASSWORD
          ================================================= */}

          <div
            className="
              mt-7
            "
          >
            <PasswordField
              label="Current Password"
              name="currentPassword"
              value={formData.currentPassword}
              show={showCurrent}
              setShow={setShowCurrent}
              onChange={handleChange}
              required
            />
          </div>

          {/* =================================================
              NEW PASSWORD
          ================================================= */}

          <div
            className="
              mt-4
            "
          >
            <PasswordField
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              show={showNew}
              setShow={setShowNew}
              onChange={handleChange}
              required
            />
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
                gap-2
              "
            >
              <p
                className="
                  text-[10px]
                  font-black
                  text-blue-950
                "
              >
                Password Requirements
              </p>

              <span
                className={`
                  text-[9px]
                  font-bold

                  ${
                    formData.newPassword.length > 20
                      ? "text-red-600"
                      : "text-gray-400"
                  }
                `}
              >
                {formData.newPassword.length}
                /20
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
              <Requirement
                passed={passwordRules.required}
                text="Password is required"
              />

              <Requirement
                passed={passwordRules.minimum}
                text="At least 8 characters"
              />

              <Requirement
                passed={passwordRules.maximum}
                text="Maximum of 20 characters"
              />

              <Requirement
                passed={passwordRules.special}
                text="At least one special character"
              />

              <Requirement
                passed={passwordRules.uppercase}
                text="At least one uppercase letter"
              />

              <Requirement
                passed={passwordRules.lowercase}
                text="At least one lowercase letter"
              />
            </div>

            <p
              className="
                mt-3

                text-[9px]
                text-gray-500
              "
            >
              Special characters include symbols such as @, #, $, !, %, &, and
              *.
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
            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              show={showConfirm}
              setShow={setShowConfirm}
              onChange={handleChange}
              required
            />

            {formData.confirmPassword && (
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
                <MaterialIcon
                  name={passwordsMatch ? "check_circle" : "cancel"}
                  className="
                    text-[14px]
                  "
                />

                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </div>
            )}
          </div>

          {/* =================================================
              OTP INFORMATION
          ================================================= */}

          <div
            className="
              mt-5

              flex
              items-start
              gap-3

              rounded-xl

              bg-blue-50

              p-4
            "
          >
            <MaterialIcon
              name="verified_user"
              className="
                mt-0.5

                text-[19px]
                text-blue-600
              "
            />

            <p
              className="
                text-[9px]
                leading-5
                text-blue-700
              "
            >
              For security, a verification code will be sent to the email
              registered to your organization before your password is changed.
            </p>
          </div>

          {/* =================================================
              SEND OTP
          ================================================= */}

          <button
            type="submit"
            disabled={sending || !formValid}
            className="
              mt-5

              flex
              w-full
              items-center
              justify-center
              gap-2

              rounded-xl

              bg-yellow-400

              py-3

              text-[11px]
              font-black
              text-blue-950

              transition

              hover:bg-yellow-300

              disabled:cursor-not-allowed
              disabled:bg-gray-200
              disabled:text-gray-400
            "
          >
            <MaterialIcon
              name={sending ? "hourglass_top" : "mail"}
              className="
                text-[18px]
              "
            />

            {sending ? "Sending OTP..." : "Send OTP"}
          </button>

          {/* =================================================
              BACK TO PROFILE
          ================================================= */}

          <Link
            to="/organization/profile"
            className="
              mt-5
              block

              text-center

              text-[9px]
              font-black
              text-blue-950

              hover:text-blue-700
            "
          >
            Back to Profile
          </Link>
        </motion.form>
      </div>
    );
  }

  /* =====================================================
     OTP SCREEN
  ===================================================== */

  return (
    <div
      className="
        flex
        min-h-[75vh]
        items-center
        justify-center

        px-4
        py-8
      "
    >
      <motion.form
        onSubmit={verifyOtp}
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
          max-w-[520px]

          rounded-[22px]

          bg-white

          p-7

          shadow-[0_10px_30px_rgba(15,23,42,0.10)]
        "
      >
        {/* =================================================
            OTP HEADER
        ================================================= */}

        <div
          className="
            text-center
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

              rounded-2xl

              bg-blue-950

              text-yellow-400
            "
          >
            <MaterialIcon
              name="mark_email_read"
              className="
                text-[25px]
              "
            />
          </div>

          <p
            className="
              mt-5

              text-[9px]
              font-black
              uppercase
              tracking-[0.15em]
              text-yellow-600
            "
          >
            Verification
          </p>

          <h1
            className="
              mt-1

              text-[24px]
              font-black
              text-blue-950
            "
          >
            Enter OTP
          </h1>

          <p
            className="
              mt-2

              text-[10px]
              leading-5
              text-gray-500
            "
          >
            Enter the 6-digit verification code sent to your registered
            organization email.
          </p>
        </div>

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <Message
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <Message type="error" message={error} onClose={() => setError("")} />
        )}

        {/* =================================================
            OTP INPUT
        ================================================= */}

        <div
          className="
            mt-7
          "
        >
          <label
            className="
              text-[10px]
              font-black
              text-blue-950
            "
          >
            Verification Code
          </label>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "").slice(0, 6);

              setOtp(value);

              setError("");
            }}
            placeholder="000000"
            className="
              mt-2

              h-14
              w-full

              rounded-xl

              border
              border-gray-200

              px-4

              text-center
              text-[22px]
              font-black
              tracking-[0.35em]
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

              text-center

              text-[9px]
              text-gray-400
            "
          >
            The verification code expires after 5 minutes.
          </p>
        </div>

        {/* =================================================
            VERIFY
        ================================================= */}

        <button
          type="submit"
          disabled={verifying || otp.length !== 6}
          className="
            mt-5

            flex
            w-full
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-yellow-400

            py-3

            text-[11px]
            font-black
            text-blue-950

            hover:bg-yellow-300

            disabled:cursor-not-allowed
            disabled:bg-gray-200
            disabled:text-gray-400
          "
        >
          <MaterialIcon
            name={verifying ? "hourglass_top" : "verified"}
            className="
              text-[18px]
            "
          />

          {verifying ? "Verifying..." : "Verify & Change Password"}
        </button>

        {/* =================================================
            RESEND
        ================================================= */}

        <div
          className="
            mt-4

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
            disabled={sending || cooldown > 0}
            onClick={resendOtp}
            className="
              mt-1

              text-[10px]
              font-black
              text-blue-700

              hover:text-blue-950

              disabled:cursor-not-allowed
              disabled:text-gray-400
            "
          >
            {sending
              ? "Sending..."
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP"}
          </button>
        </div>

        {/* =================================================
            BACK
        ================================================= */}

        <button
          type="button"
          disabled={verifying}
          onClick={cancelOtp}
          className="
            mt-5

            w-full

            rounded-xl

            bg-gray-100

            py-3

            text-[10px]
            font-black
            text-gray-700

            hover:bg-gray-200
          "
        >
          Back to Password Form
        </button>
      </motion.form>
    </div>
  );
}

/* =====================================================
   PASSWORD FIELD
===================================================== */

function PasswordField({
  label,
  name,
  value,
  show,
  setShow,
  onChange,
  required,
}) {
  return (
    <div>
      <label
        className="
          text-[10px]
          font-black
          text-blue-950
        "
      >
        {label}

        {required && (
          <span
            className="
              ml-1
              text-red-500
            "
          >
            *
          </span>
        )}
      </label>

      <div
        className="
          relative
          mt-2
        "
      >
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          maxLength={name === "currentPassword" ? undefined : 20}
          autoComplete={
            name === "currentPassword" ? "current-password" : "new-password"
          }
          className="
            h-11
            w-full

            rounded-xl

            border
            border-gray-200

            bg-white

            pl-4
            pr-[78px]

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
          onClick={() => setShow((previous) => !previous)}
          className="
            absolute
            right-3
            top-1/2

            flex

            -translate-y-1/2

            items-center
            gap-1

            text-[10px]
            font-bold
            text-blue-600

            hover:text-blue-900
          "
        >
          <MaterialIcon
            name={show ? "visibility_off" : "visibility"}
            className="
              text-[18px]
            "
          />

          {show ? "Hide" : "Show"}
        </button>
      </div>
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
        gap-2

        text-[9px]
        font-bold

        ${passed ? "text-green-600" : "text-gray-500"}
      `}
    >
      <MaterialIcon
        name={passed ? "check_circle" : "radio_button_unchecked"}
        className={`
          text-[14px]

          ${passed ? "text-green-600" : "text-gray-300"}
        `}
      />

      <span>{text}</span>
    </div>
  );
}

/* =====================================================
   MESSAGE
===================================================== */

function Message({ type, message, onClose }) {
  const good = type === "success";

  return (
    <div
      className={`
        mt-5

        flex
        items-center
        justify-between
        gap-3

        rounded-xl

        border

        px-4
        py-3

        text-[10px]
        font-bold

        ${
          good
            ? `
              border-green-200
              bg-green-50
              text-green-700
            `
            : `
              border-red-200
              bg-red-50
              text-red-700
            `
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <MaterialIcon
          name={good ? "check_circle" : "error"}
          className="
            text-[16px]
          "
        />

        <span>{message}</span>
      </div>

      <button type="button" onClick={onClose}>
        <MaterialIcon
          name="close"
          className="
            text-[15px]
          "
        />
      </button>
    </div>
  );
}
