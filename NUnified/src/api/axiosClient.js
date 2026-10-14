import axios from "axios";

/* =====================================================
   API
===================================================== */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
      ? "https://eventmanagement-api-z0m1.onrender.com/api"
      : "http://localhost:5000/api"),
});

/* =====================================================
   CLEAR SESSION
===================================================== */

function clearSession() {
  localStorage.removeItem("token");

  localStorage.removeItem("role");

  localStorage.removeItem("user");
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error.response?.status;

    const requestUrl = String(error.config?.url || "");

    const token = localStorage.getItem("token");

    /* ===============================================
       DON'T REDIRECT FAILED LOGIN REQUESTS
    =============================================== */

    const isLoginRequest = requestUrl.includes("/auth/login");

    /* ===============================================
       EXPIRED / INVALID SESSION
    =============================================== */

    if (status === 401 && token && !isLoginRequest) {
      console.log("⏰ Backend detected expired session.");

      clearSession();

      /*
        Full redirect immediately removes
        Dashboard/Admin/Organization page.
      */

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
