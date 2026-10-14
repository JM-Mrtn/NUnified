import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient";

/* =====================================================
   LOGIN PAGE
===================================================== */

export default function Login() {
  const navigate = useNavigate();

  /* ===================================================
     FORM
  =================================================== */

  const [form, setForm] = useState({
    role: "organization",
    username: "",
    password: "",
  });

  /* ===================================================
     PASSWORD VISIBILITY
  =================================================== */

  const [showPassword, setShowPassword] = useState(false);

  /* ===================================================
     STATES
  =================================================== */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* ===================================================
     INPUT CHANGE
  =================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    setError("");
  };

  /* ===================================================
     LOGIN
  =================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    /* ===============================================
         VALIDATION
      =============================================== */

    if (!form.username.trim()) {
      setError("Username is required.");

      return;
    }

    if (!form.password) {
      setError("Password is required.");

      return;
    }

    setLoading(true);

    try {
      /* =============================================
           LOGIN API
        ============================================= */

      const { data } = await api.post(
        "/auth/login",

        {
          role: form.role,

          username: form.username.trim(),

          password: form.password,
        },
      );

      /* =============================================
           SAVE SESSION
        ============================================= */

      localStorage.setItem("token", data.token);

      localStorage.setItem("role", data.user.role);

      localStorage.setItem("user", JSON.stringify(data.user));

      /* =============================================
           ADMIN
        ============================================= */

      if (data.user.role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });

        return;
      }

      /* =============================================
           ORGANIZATION
        ============================================= */

      if (data.user.role === "organization") {
        navigate("/organization/dashboard", {
          replace: true,
        });

        return;
      }

      /* =============================================
           UNKNOWN ROLE
        ============================================= */

      setError("Your account role is not supported.");
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setError(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     PAGE
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
        to-[#003B7A]

        px-6
        py-12
      "
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
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
          max-w-md
        "
      >
        <div
          className="
            rounded-3xl

            bg-white/95

            px-8
            py-10

            shadow-2xl

            backdrop-blur-xl
          "
        >
          {/* =================================================
              LOGO
          ================================================= */}

          <div
            className="
              flex
              justify-center
            "
          >
            <div
              className="
                flex
                h-16
                w-16

                items-center
                justify-center

                rounded-2xl

                bg-[#123B78]

                text-xl
                font-black

                text-yellow-400

                shadow-lg
              "
            >
              NU
            </div>
          </div>

          {/* =================================================
              TITLE
          ================================================= */}

          <h1
            className="
              mt-5

              text-center

              text-3xl
              font-black

              text-blue-950
            "
          >
            Welcome Back
          </h1>

          <p
            className="
              mt-2

              text-center

              text-sm
              text-gray-500
            "
          >
            Sign in to NUnified Event Management System
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

                px-4
                py-3

                text-sm
                text-red-700
              "
            >
              <span
                className="
                  material-symbols-rounded

                  mt-[1px]

                  text-[18px]
                "
              >
                error
              </span>

              <span>{error}</span>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="
              mt-7
            "
          >
            {/* ===============================================
                ROLE
            =============================================== */}

            <label
              className="
                text-sm
                font-bold

                text-gray-700
              "
            >
              Login As
            </label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="
                mt-2

                w-full

                rounded-xl

                border
                border-gray-300

                bg-white

                px-4
                py-3

                outline-none

                transition

                focus:border-blue-700
                focus:ring-2
                focus:ring-blue-100
              "
            >
              <option value="organization">Organization</option>

              <option value="admin">Administrator</option>
            </select>

            {/* ===============================================
                USERNAME
            =============================================== */}

            <label
              className="
                mt-5
                block

                text-sm
                font-bold

                text-gray-700
              "
            >
              Username
              <span
                className="
                  ml-1
                  text-red-500
                "
              >
                *
              </span>
            </label>

            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="Enter your username"
              className="
                mt-2

                w-full

                rounded-xl

                border
                border-gray-300

                px-4
                py-3

                outline-none

                transition

                focus:border-blue-700
                focus:ring-2
                focus:ring-blue-100
              "
            />

            {/* ===============================================
                PASSWORD
            =============================================== */}

            <label
              className="
                mt-5
                block

                text-sm
                font-bold

                text-gray-700
              "
            >
              Password
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
              "
            >
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="
                  mt-2

                  w-full

                  rounded-xl

                  border
                  border-gray-300

                  px-4
                  py-3
                  pr-20

                  outline-none

                  transition

                  focus:border-blue-700
                  focus:ring-2
                  focus:ring-blue-100
                "
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="
                  absolute

                  right-4
                  top-1/2

                  -translate-y-[35%]

                  text-sm
                  font-bold

                  text-blue-800

                  transition

                  hover:text-blue-950
                "
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* ===============================================
                FORGOT PASSWORD
            =============================================== */}

            <div
              className="
                mt-2

                flex
                justify-end
              "
            >
              <Link
                to="/forgot-password"
                className="
                  inline-flex
                  items-center
                  gap-1

                  text-[12px]
                  font-bold

                  text-blue-700

                  transition

                  hover:text-blue-950
                  hover:underline
                "
              >
                <span
                  className="
                    material-symbols-rounded

                    text-[15px]
                  "
                >
                  lock_reset
                </span>
                Forgot Password?
              </Link>
            </div>

            {/* ===============================================
                SIGN IN
            =============================================== */}

            <button
              type="submit"
              disabled={loading}
              className="
                mt-5

                flex
                w-full
                items-center
                justify-center
                gap-2

                rounded-full

                bg-gradient-to-r
                from-yellow-300
                to-yellow-500

                py-4

                font-black

                text-blue-950

                shadow-lg

                transition

                hover:scale-[1.02]

                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading && (
                <span
                  className="
                    material-symbols-rounded

                    animate-spin

                    text-[18px]
                  "
                >
                  progress_activity
                </span>
              )}

              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* =================================================
              STUDENT
          ================================================= */}

          <div
            className="
              mt-6

              text-center
              text-sm
            "
          >
            <Link
              to="/student"
              className="
                font-semibold

                text-blue-800

                transition

                hover:text-blue-950
                hover:underline
              "
            >
              Continue to Student Homepage
            </Link>
          </div>

          <p
            className="
              mt-3

              text-center

              text-xs
              text-gray-400
            "
          >
            Students do not need an account.
          </p>

          {/* =================================================
              HOME
          ================================================= */}

          <div
            className="
              mt-5

              text-center
            "
          >
            <Link
              to="/"
              className="
                text-xs
                text-gray-500

                transition

                hover:text-blue-800
              "
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
