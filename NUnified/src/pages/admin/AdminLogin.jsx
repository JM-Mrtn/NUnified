import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axiosClient";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);

      if (data.user.role !== "admin") {
        setError("This account is not an administrator.");

        return;
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem("role", data.user.role);

      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/admin/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="nu-logo">NU</div>

        <h1>Administrator Login</h1>

        <p>NUnified Event Management System</p>

        {error && <div className="alert-error">{error}</div>}

        <label>Username</label>

        <input
          value={form.username}
          onChange={(e) =>
            setForm({
              ...form,
              username: e.target.value,
            })
          }
          required
        />

        <label>Password</label>

        <input
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          required
        />

        <button
          className="nu-btn nu-btn-primary"
          style={{
            width: "100%",
            marginTop: "20px",
          }}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login as Admin"}
        </button>

        <div className="auth-links">
          <Link to="/">Back to Home</Link>
        </div>
      </form>
    </div>
  );
}
