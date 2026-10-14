import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute.jsx";

/* LAYOUTS */

import AdminLayout from "../layouts/AdminLayout.jsx";
import OrganizationLayout from "../layouts/OrganizationLayout.jsx";
import StudentLayout from "../layouts/StudentLayout.jsx";

/* PUBLIC */

import LandingPage from "../pages/public/LandingPage.jsx";
import Login from "../pages/public/Login.jsx";
import ForgotPassword from "../pages/public/ForgotPassword.jsx";
import ResetPassword from "../pages/public/ResetPassword.jsx";
import VerifyOTP from "../pages/public/VerifyOTP.jsx";

/* STUDENT */

import StudentHome from "../pages/student/StudentHome.jsx";

/* ADMIN */

import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import ManageOrganizations from "../pages/admin/ManageOrganizations.jsx";
import ManageEvents from "../pages/admin/ManageEvents.jsx";
import ManageRequest from "../pages/admin/ManageRequest.jsx";
import ManageAnnouncements from "../pages/admin/ManageAnnouncements.jsx";

/* ORGANIZATION */

import OrganizationDashboard from "../pages/organization/OrganizationDashboard.jsx";
import EventBooking from "../pages/organization/EventBooking.jsx";
import BookingSummary from "../pages/organization/BookingSummary.jsx";
import BookingConfirmation from "../pages/organization/BookingConfirmation.jsx";
import BookingStatus from "../pages/organization/BookingStatus.jsx";
import OrganizationProfile from "../pages/organization/OrganizationProfile.jsx";
import ChangePassword from "../pages/organization/ChangePassword.jsx";
import AdminRequest from "../pages/organization/AdminRequest.jsx";
import CreatePost from "../pages/organization/CreatePost.jsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            PUBLIC
        ========================== */}

        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/verify-otp" element={<VerifyOTP />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* =========================
            STUDENT
            PUBLIC / NO ACCOUNT
        ========================== */}

        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
        </Route>

        {/* =========================
            ADMIN
        ========================== */}

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />

            <Route path="dashboard" element={<AdminDashboard />} />

            <Route path="organizations" element={<ManageOrganizations />} />

            <Route path="events" element={<ManageEvents />} />

            <Route path="requests" element={<ManageRequest />} />

            <Route path="announcements" element={<ManageAnnouncements />} />
          </Route>
        </Route>

        {/* =========================
            ORGANIZATION
        ========================== */}

        <Route element={<ProtectedRoute allowedRoles={["organization"]} />}>
          <Route path="/organization" element={<OrganizationLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />

            <Route path="dashboard" element={<OrganizationDashboard />} />

            <Route path="booking" element={<EventBooking />} />

            <Route path="booking-summary" element={<BookingSummary />} />

            <Route
              path="booking-confirmation"
              element={<BookingConfirmation />}
            />

            <Route path="status" element={<BookingStatus />} />

            <Route path="profile" element={<OrganizationProfile />} />

            <Route path="change-password" element={<ChangePassword />} />

            <Route path="admin-request" element={<AdminRequest />} />

            <Route path="create-post" element={<CreatePost />} />
          </Route>
        </Route>

        {/* NOT FOUND */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
