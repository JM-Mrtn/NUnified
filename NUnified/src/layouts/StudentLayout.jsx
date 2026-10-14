import { Outlet } from "react-router-dom";

import Navbar from "../components/common/Navbar.jsx";
import Footer from "../components/common/Footer.jsx";

export default function StudentLayout() {
  return (
    <div
      className="
        flex
        min-h-screen
        flex-col
        bg-gray-100
      "
    >
      {/* NAVBAR */}

      <Navbar />

      {/* STUDENT PAGE CONTENT */}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}

      <Footer />
    </div>
  );
}
