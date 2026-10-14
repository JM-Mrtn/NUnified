import { useEffect, useState } from "react";

import { Navigate, Outlet } from "react-router-dom";

/* =====================================================
   CLEAR LOGIN SESSION
===================================================== */

function clearSession() {
  localStorage.removeItem("token");

  localStorage.removeItem("role");

  localStorage.removeItem("user");
}

/* =====================================================
   DECODE JWT

   Reads the expiration time directly from the token.
===================================================== */

function decodeToken(token) {
  try {
    if (!token) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    while (payload.length % 4 !== 0) {
      payload += "=";
    }

    const decoded = window.atob(payload);

    return JSON.parse(decoded);
  } catch (error) {
    console.error("TOKEN DECODE ERROR:", error);

    return null;
  }
}

/* =====================================================
   GET TOKEN EXPIRATION

   JWT exp = seconds
   Date.now() = milliseconds
===================================================== */

function getExpirationTime(token) {
  const decoded = decodeToken(token);

  if (!decoded?.exp) {
    return null;
  }

  return Number(decoded.exp) * 1000;
}

/* =====================================================
   CHECK IF EXPIRED
===================================================== */

function isExpired(token) {
  const expiration = getExpirationTime(token);

  if (!expiration) {
    return true;
  }

  return Date.now() >= expiration;
}

/* =====================================================
   PROTECTED ROUTE
===================================================== */

export default function ProtectedRoute({ allowedRoles }) {
  const [loggedOut, setLoggedOut] = useState(false);

  const token = localStorage.getItem("token");

  const role = localStorage.getItem("role");

  /* ===================================================
     AUTOMATIC SESSION LOGOUT
  =================================================== */

  useEffect(() => {
    if (!token) {
      return;
    }

    const expiration = getExpirationTime(token);

    /* ===============================================
       INVALID TOKEN
    =============================================== */

    if (!expiration) {
      console.log("❌ Invalid session token.");

      clearSession();

      setLoggedOut(true);

      return;
    }

    const remaining = expiration - Date.now();

    /* ===============================================
       ALREADY EXPIRED
    =============================================== */

    if (remaining <= 0) {
      console.log("⏰ Session expired.");

      clearSession();

      setLoggedOut(true);

      return;
    }

    /* ===============================================
       DEBUG SESSION TIME

       Open browser DevTools Console and you will see:

       🕒 Session expires in 10 seconds
       or
       🕒 Session expires in 1800 seconds
    =============================================== */

    console.log(
      "🕒 Session expires in:",
      `${Math.ceil(remaining / 1000)} seconds`,
    );

    console.log(
      "🕒 Session expiration:",
      new Date(expiration).toLocaleString(),
    );

    /* ===============================================
       AUTOMATIC LOGOUT TIMER
    =============================================== */

    const timeout = window.setTimeout(
      () => {
        console.log("⏰ SESSION EXPIRED — AUTOMATIC LOGOUT");

        clearSession();

        setLoggedOut(true);
      },

      remaining,
    );

    /* ===============================================
       OTHER TAB LOGOUT SUPPORT
    =============================================== */

    const handleStorage = (event) => {
      if (event.key === "token" && !event.newValue) {
        setLoggedOut(true);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(timeout);

      window.removeEventListener("storage", handleStorage);
    };
  }, [token]);

  /* ===================================================
     NOT LOGGED IN
  =================================================== */

  if (!token || loggedOut) {
    return <Navigate to="/login" replace />;
  }

  /* ===================================================
     TOKEN EXPIRED

     Extra safety check.
  =================================================== */

  if (isExpired(token)) {
    clearSession();

    return <Navigate to="/login" replace />;
  }

  /* ===================================================
     WRONG ROLE
  =================================================== */

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    if (role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (role === "organization") {
      return <Navigate to="/organization/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  /* ===================================================
     AUTHORIZED
  =================================================== */

  return <Outlet />;
}
