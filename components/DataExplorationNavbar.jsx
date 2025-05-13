// app/components/DataExplorationNavbar.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaBars, FaArrowLeft } from "react-icons/fa";

// Base URL for your backend API (in case you ever need it directly)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://autosatai-backend.onrender.com";

const DataExplorationNavbar = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);
  const hamburgerRef = useRef(null);
  const router = useRouter();

  // ── Load user info if token present ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      axios
        // ← changed to relative URL; Next.js will rewrite /api/v1/auth/me → your real backend
        .get("/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setUserEmail(res.data.email);
        })
        .catch(() => {
          setIsAuthenticated(false);
          localStorage.removeItem("token");
        });
    }
  }, []);

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
    setShowFilterPanel(false);
    setShowResourcesPanel(false);
  };
  const toggleDropdown = () => setShowDropdown((prev) => !prev);

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error("localStorage unavailable:", err);
    }
    setIsAuthenticated(false);
    setShowDropdown(false);
    router.push("/login");
  };

  const handleSidebarItemClick = (item) => {
    setShowSidebar(false);
    if (item === "datahub") {
      setShowFilterPanel(true);
      setShowResourcesPanel(false);
    } else if (item === "resources") {
      setShowResourcesPanel(true);
      setShowFilterPanel(false);
    }
  };

  // ── Close popovers when clicking outside ─────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        hamburgerRef.current?.contains(event.target) ||
        dropdownRef.current?.contains(event.target)
      ) {
        return;
      }
      if (!sidebarRef.current?.contains(event.target)) setShowSidebar(false);
      setShowDropdown(false);
      if (showFilterPanel || showResourcesPanel) {
        if (!event.target.closest(".inline-panel")) {
          setShowFilterPanel(false);
          setShowResourcesPanel(false);
        }
      }
    };
    if (showSidebar || showDropdown || showFilterPanel || showResourcesPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSidebar, showDropdown, showFilterPanel, showResourcesPanel]);

  // ── Filter & Resources panels inlined here (unchanged) ─────────
  const DataFilterPanel = ({ onBack }) => {
    /* … your existing DataFilterPanel code … */
  };
  const NaturalResourcesPanel = ({ onBack }) => {
    /* … your existing NaturalResourcesPanel code … */
  };

  return (
    <>
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-[#161a30] text-white z-50 shadow-md">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo & Hamburger */}
          <div className="flex items-center gap-x-3">
            <div
              className="text-xl cursor-pointer text-white mr-4"
              ref={hamburgerRef}
              onClick={toggleSidebar}
            >
              <FaBars />
            </div>
            <div
              className="flex items-center cursor-pointer font-semibold text-lg"
              onClick={() => router.push("/")}
            >
              <img
                src="/assets/logo.png"
                alt="AutoSat AI Logo"
                className="w-9 h-9 mr-3"
              />
              <span>AutoSat AI</span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex gap-6 ml-auto">
            {["Home", "Services", "About us", "Contact"].map((label) => (
              <span
                key={label}
                className="cursor-pointer hover:text-[#7fdbff] transition"
                onClick={() =>
                  router.push(
                    label === "Home"
                      ? "/"
                      : `/${label.toLowerCase().replace(/\s/g, "")}`
                  )
                }
              >
                {label}
              </span>
            ))}
          </div>

          {/* Profile Dropdown */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <img
              src="/assets/profile-icon.png"
              alt="Profile"
              className="w-10 h-10 rounded-full cursor-pointer ml-6"
              onClick={toggleDropdown}
            />
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black p-4 rounded-lg shadow-xl z-50">
                {isAuthenticated ? (
                  <>
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {userEmail}
                    </p>
                    <button
                      className="block w-full text-left text-sm mb-1 hover:bg-gray-200 p-2 rounded-md transition"
                      onClick={() => router.push("/dashboard")}
                    >
                      Dashboard
                    </button>
                    <button
                      className="block w-full text-left text-sm text-red-600 hover:bg-red-50 p-2 rounded-md transition"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="block w-full text-left text-sm mb-1 hover:bg-gray-200 p-2 rounded-md transition"
                      onClick={() => router.push("/login")}
                    >
                      Login
                    </button>
                    <button
                      className="block w-full text-left text-sm hover:bg-gray-200 p-2 rounded-md transition"
                      onClick={() => router.push("/signup")}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div
          ref={sidebarRef}
          className="fixed top-16 left-0 bg-gray-900 text-white w-64 p-6 shadow-2xl z-40 animate-slide-in h-full"
        >
          <div className="flex flex-col gap-6">
            <div
              className="cursor-pointer hover:text-pink-400"
              onClick={() => handleSidebarItemClick("datahub")}
            >
              Data Hub & Analytics
            </div>
            <div
              className="cursor-pointer hover:text-pink-400"
              onClick={() => handleSidebarItemClick("resources")}
            >
              Natural Resources
            </div>
          </div>
        </div>
      )}

      {/* Inline Panels */}
      {showFilterPanel && (
        <DataFilterPanel onBack={() => setShowFilterPanel(false)} />
      )}
      {showResourcesPanel && (
        <NaturalResourcesPanel onBack={() => setShowResourcesPanel(false)} />
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default DataExplorationNavbar;
