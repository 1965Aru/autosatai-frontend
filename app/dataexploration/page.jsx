"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import DataExplorationNavbar from "@/components/DataExplorationNavbar";
import "@/app/globals.css";

const MapBackground = dynamic(() => import("@/components/MapBackground"), {
  ssr: false,
});

const DataExplorationPage = () => {
  const [, setSearchQuery] = useState("");

  // 🔑 Clear all browser storage every time this page is mounted
  useEffect(() => {
    try {
      localStorage.clear();          // wipe everything
      // If you ever need to keep other data, use removeItem("key") per entry.
    } catch (err) {
      console.error("localStorage not available:", err);
    }
  }, []);  // empty deps ⇒ runs only on mount (i.e. on every visit)

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    console.log("Search Query:", e.target.value);
  };

  return (
    <div className="data-exploration-page">
      <DataExplorationNavbar />
      <div className="map-content relative w-full h-screen">
        <MapBackground />
        <div className="centered-search absolute top-[5%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>
    </div>
  );
};

export default DataExplorationPage;
