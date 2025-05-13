"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaBars, FaArrowLeft } from "react-icons/fa";

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

  // Load user info if token present
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsAuthenticated(true);

    axios
      .get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUserEmail(res.data.email))
      .catch(() => {
        setIsAuthenticated(false);
        localStorage.removeItem("token");
      });
  }, []);

  const toggleSidebar = () => {
    setShowSidebar((p) => !p);
    setShowFilterPanel(false);
    setShowResourcesPanel(false);
  };
  const toggleDropdown = () => setShowDropdown((p) => !p);
  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setShowDropdown(false);
    router.push("/login");
  };
  const handleSidebarItemClick = (item) => {
    setShowSidebar(false);
    if (item === "datahub") {
      setShowFilterPanel(true);
      setShowResourcesPanel(false);
    } else {
      setShowResourcesPanel(true);
      setShowFilterPanel(false);
    }
  };

  // Click-outside to close panels/dropdowns
  useEffect(() => {
    const onClick = (e) => {
      if (
        hamburgerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) return;
      if (!sidebarRef.current?.contains(e.target)) setShowSidebar(false);
      setShowDropdown(false);
      if (!e.target.closest(".inline-panel")) {
        setShowFilterPanel(false);
        setShowResourcesPanel(false);
      }
    };
    if (showSidebar || showDropdown || showFilterPanel || showResourcesPanel) {
      document.addEventListener("mousedown", onClick);
    }
    return () => document.removeEventListener("mousedown", onClick);
  }, [showSidebar, showDropdown, showFilterPanel, showResourcesPanel]);

  // Inline panels (DataFilterPanel, NaturalResourcesPanel) omitted for brevity—
  // keep your existing implementations here.

  return (
    <>
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-[#161a30] text-white z-50 shadow-md">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <div
              ref={hamburgerRef}
              onClick={toggleSidebar}
              className="text-xl cursor-pointer"
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

          {/* Nav links */}
          <div className="hidden md:flex gap-6 ml-auto">
            {["Home", "Services", "About us", "Contact"].map((label) => (
              <span
                key={label}
                onClick={() =>
                  router.push(
                    label === "Home"
                      ? "/"
                      : `/${label.toLowerCase().replace(/\s/g, "")}`
                  )
                }
                className="cursor-pointer hover:text-[#7fdbff] transition"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Profile */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <img
              src="/assets/profile-icon.png"
              alt="Profile"
              className="w-10 h-10 rounded-full cursor-pointer ml-6"
              onClick={toggleDropdown}
            />
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-black p-4 rounded-lg shadow-xl z-50">
                {isAuthenticated ? (
                  <>
                    <p className="mb-2 font-semibold">{userEmail}</p>
                    <button
                      className="w-full text-left mb-1 p-2 hover:bg-gray-200 rounded"
                      onClick={() => router.push("/dashboard")}
                    >
                      Dashboard
                    </button>
                    <button
                      className="w-full text-left text-red-600 p-2 hover:bg-red-50 rounded"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full text-left mb-1 p-2 hover:bg-gray-200 rounded"
                      onClick={() => router.push("/login")}
                    >
                      Log In
                    </button>
                    <button
                      className="w-full text-left p-2 hover:bg-gray-200 rounded"
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

      {/* Inline panels */}
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
