"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaBars, FaArrowLeft } from "react-icons/fa";

// Base URL for your backend API
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://autosatai-backend-r4ol.onrender.com";

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
    if (token) {
      setIsAuthenticated(true);
      axios
        .get("https://autosatai-backend-r4ol.onrender.com/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUserEmail(res.data.email))
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
      localStorage.clear(); // <-- wipes everything first
    } catch (err) {
      console.error("localStorage unavailable:", err);
    }
    setIsAuthenticated(false);
    setShowDropdown(false);
    router.push("/login"); // then navigate to login
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

  // Close popovers when clicking outside
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

  //
  // Inlined Data Filter Panel
  //
  const DataFilterPanel = ({ onBack }) => {
    const [selectedCategory, setSelectedCategory] = useState(
      "Agriculture Hotspot"
    );
    const [location, setLocation] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const router = useRouter();

    const validateDate = (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    };

    const handleGetDatasets = async () => {
      if (!location || !dateFrom || !dateTo) {
        setErrorMessage("Please fill in all required fields.");
        return;
      }
      if (!validateDate(dateFrom) || !validateDate(dateTo)) {
        setErrorMessage("Invalid date format. Please use YYYY-MM-DD.");
        return;
      }
      setErrorMessage("");
      try {
        const res = await fetch(`${API_BASE}/api/agri/datasets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          body: JSON.stringify({
            location,
            category: selectedCategory,
            date_from: dateFrom,
            date_to: dateTo,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setErrorMessage(`Error: ${err.error || "Unknown error"}`);
          return;
        }
        const { datasets } = await res.json();
        localStorage.setItem("datasets", JSON.stringify(datasets));
        localStorage.setItem(
          "agriParams",
          JSON.stringify({
            location,
            date_range: { from: dateFrom, to: dateTo },
          })
        );
        if (selectedCategory === "Night Time Light Data") {
          router.push("/night-lights-dataset-results");
        } else {
          router.push("/agriculture-dataset-results");
        }
      } catch (err) {
        console.error("Dataset fetch failed:", err);
        setErrorMessage("Something went wrong while fetching datasets.");
      }
    };

    return (
      <div
        className="inline-panel"
        style={{
          position: "fixed",
          top: "60px",
          left: 0,
          height: "calc(100vh - 60px)",
          width: "350px",
          backgroundColor: "#f9f9f9",
          zIndex: 999,
          boxShadow: "2px 0 10px rgba(0, 0, 0, 0.1)",
          padding: "1rem",
          overflowY: "auto",
          animation: "slideIn 0.3s ease",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <FaArrowLeft
            onClick={onBack}
            style={{ cursor: "pointer", marginRight: "1rem", color: "#333" }}
          />
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "#333",
              marginLeft: "4px",
            }}
          >
            Filter Datasets
          </h2>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="location"
            style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}
          >
            Location:
          </label>
          <input
            id="location"
            type="text"
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "1rem",
              marginBottom: "0.8rem",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}>
            Category:
          </label>
          {["Agriculture Hotspot", "Night Time Light Data"].map((cat) => (
            <div
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "0.8rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "0.5rem",
                cursor: "pointer",
                fontSize: "1rem",
                backgroundColor:
                  selectedCategory === cat ? "#1890ff" : "transparent",
                color: selectedCategory === cat ? "#fff" : "#333",
              }}
            >
              {cat}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}>
            Date Range:
          </label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <span
                style={{ display: "block", fontSize: "0.9rem", color: "#666" }}
              >
                From
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{ display: "block", fontSize: "0.9rem", color: "#666" }}
              >
                To
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleGetDatasets}
          style={{
            width: "100%",
            padding: "0.8rem",
            backgroundColor: "#1890ff",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Get Datasets
        </button>

        {errorMessage && (
          <div
            style={{
              backgroundColor: "#fddede",
              color: "#d92e2f",
              padding: "1rem",
              borderRadius: "8px",
              marginTop: "1rem",
            }}
          >
            <p>{errorMessage}</p>
          </div>
        )}
      </div>
    );
  };

  //
  // Inlined Natural Resources Panel
  //
  const NaturalResourcesPanel = ({ onBack }) => {
    const [location, setLocation] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleFetchResources = async () => {
      if (!location.trim()) {
        setError("Please enter a location.");
        return;
      }
      setError("");
      setLoading(true);

      try {
        const res = await axios.post(
          "https://autosatai-backend-r4ol.onrender.com/natural-resources/info",
          { location },
          { headers: { "Content-Type": "application/json" } }
        );
        localStorage.setItem(
          "naturalResourcesResult",
          JSON.stringify(res.data)
        );
        router.push("/natural-resources-results");
      } catch (err) {
        console.error("Natural resources fetch failed:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Something went wrong while fetching resources."
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <div
        className="inline-panel"
        style={{
          position: "fixed",
          top: "60px",
          left: 0,
          height: "calc(100vh - 60px)",
          width: "350px",
          backgroundColor: "#f9f9f9",
          zIndex: 999,
          boxShadow: "2px 0 10px rgba(0, 0, 0, 0.1)",
          padding: "1rem",
          overflowY: "auto",
          animation: "slideIn 0.3s ease",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <FaArrowLeft
            onClick={onBack}
            style={{ cursor: "pointer", marginRight: "1rem", color: "#333" }}
          />
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "#333",
              marginLeft: "4px",
            }}
          >
            Natural Resources
          </h2>
        </div>

        {/* Location Input */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="nr-location"
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 600,
            }}
          >
            Location:
          </label>
          <input
            id="nr-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City name or coordinates"
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* Fetch Info Button */}
        <button
          onClick={handleFetchResources}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.8rem",
            backgroundColor: "#1890ff",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          {loading ? "Fetching..." : "Fetch Info"}
        </button>

        {error && (
          <p style={{ color: "#d92e2f", marginTop: "1rem" }}>{error}</p>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-[#161a30] text-white z-50 shadow-md">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Name */}
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

          {/* Navbar Links */}
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
                      Logout
                    </button>
                    <button
                      className="block w-full text-left text-sm hover:bg-gray-200 p-2 rounded-md transition"
                      onClick={() => router.push("/register")}
                    >
                      Explore More
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Menu */}
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

      {/* Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }
        @keyframes slideIn {
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
