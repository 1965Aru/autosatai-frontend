"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import DeckGL from "@deck.gl/react";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import {
  FaSun,
  FaMapMarkerAlt,
  FaBolt,
  FaChartLine,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { format } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://autosatai-backend-r4ol.onrender.com";

// Only load plotly on the client
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Mapbox token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Constants
const PIXEL_M = 463.83;
const KM_PER_DEGREE = 111;

// Theme colors
const THEME = {
  primary: "#8b5cf6",
  primaryLight: "#a78bfa",
  secondary: "#10b981",
  tertiary: "#f97316",
  quaternary: "#3b82f6",
  background: "#111827",
  cardBg: "#1f2937",
  darkCardBg: "#111827",
  text: "#f9fafb",
  textMuted: "#9ca3af",
  border: "#374151",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
};

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const slideUp = {
  hidden: { y: 50, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function DashboardPage() {
  const router = useRouter();
  // ── STATE MANAGEMENT ───────────────────────────────────────────────
  const [datasets, setDatasets] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hexIdx, setHexIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [hoverInfo, setHoverInfo] = useState(null);
  const [animatedValue, setAnimatedValue] = useState(0);
  const [filterView, setFilterView] = useState("all");

  // Effects
  useEffect(() => {
    // Load datasets
    const raw = localStorage.getItem("datasets");
    if (raw) setDatasets(JSON.parse(raw));
  }, []);

  // Run analysis if needed
  useEffect(() => {
    if (
      datasets.length > 0 &&
      !localStorage.getItem("analysisResults") &&
      !loading
    ) {
      setLoading(true);
      const jobs = datasets.map((ds) => ({
        dataset_id: ds.id,
        analysis: "night_lights",
        assets: { data: ds.assets.data },
      }));

      fetch("/api/analyse-all-nights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      })
        .then((r) => r.json())
        .then((payload) => {
          const arr = Array.isArray(payload.results) ? payload.results : [];
          localStorage.setItem("analysisResults", JSON.stringify(arr));
          setResults(arr);
        })
        .catch((e) => {
          console.error("Analysis failed", e);
        })
        .finally(() => setLoading(false));
    }
  }, [datasets, loading]);

  // Load existing results
  useEffect(() => {
    const raw = localStorage.getItem("analysisResults");
    if (raw) setResults(JSON.parse(raw));
  }, []);

  // Animation effect for counters
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [results]);

  // ── DATA PROCESSING ────────────────────────────────────────────────
  // Extract first result or use defaults
  const first = results[0] || { series: {} };
  const S = first.series;
  const dates = Array.isArray(S.dates) ? S.dates : [];
  const avg = Array.isArray(S.avg_radiance) ? S.avg_radiance : [];
  const litArea = Array.isArray(S.lit_area_km2) ? S.lit_area_km2 : [];
  const pctBright = Array.isArray(S.pct_bright) ? S.pct_bright : [];
  const newLit = Array.isArray(S.new_lit_km2) ? S.new_lit_km2 : [];
  const histCounts = Array.isArray(S.hist_counts) ? S.hist_counts : [];
  const trend = Array.isArray(S.trend) ? S.trend : [];
  const forecast = S.forecast?.dates?.length
    ? S.forecast
    : { dates: [], avg_radiance: [] };
  const residual = Array.isArray(S.residual) ? S.residual : [];
  const pcaCoords = Array.isArray(S.pca?.coords) ? S.pca.coords : [];
  const pcaX = Array.isArray(S.pca?.x) ? S.pca.x : [];
  const pcaY = Array.isArray(S.pca?.y) ? S.pca.y : [];

  // Derived data
  const unlit = dates.map((_, i) =>
    pctBright[i] >= 100 ? 0 : 100 - (pctBright[i] || 0)
  );
  const histBins = histCounts.length ? histCounts[0].map((_, i) => i) : [];

  // Calculate trends and changes for KPIs
  const avgChange =
    avg.length > 1
      ? (((avg[avg.length - 1] - avg[0]) / avg[0]) * 100).toFixed(1)
      : "0";
  const litAreaChange =
    litArea.length > 1
      ? (
          ((litArea[litArea.length - 1] - litArea[0]) / litArea[0]) *
          100
        ).toFixed(1)
      : "0";
  const pctBrightChange =
    pctBright.length > 1
      ? (pctBright[pctBright.length - 1] - pctBright[0]).toFixed(1)
      : "0";

  // Find anomalies (high residuals)
  const anomalies = residual
    .map((r, i) => ({ value: Math.abs(r), date: dates[i], original: r }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // Map center
  const centerLat = datasets[0]?.lat || 0;
  const centerLon = datasets[0]?.lon || 0;

  // Prepare hex data
  const hexData = useMemo(() => {
    const i = Math.min(Math.max(hexIdx, 0), dates.length - 1);
    return pcaCoords.map(([y, x]) => {
      const dy_km = (y * PIXEL_M) / 1000;
      const dx_km = (x * PIXEL_M) / 1000;
      const dLat = dy_km / KM_PER_DEGREE;
      const dLon =
        dx_km / (KM_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180));
      return {
        position: [centerLon + dLon, centerLat + dLat],
        weight: avg[i] || 0,
        elevation: (avg[i] || 0) * 5,
        color: getColorForValue(avg[i] || 0, 0, Math.max(...avg) || 1),
      };
    });
  }, [hexIdx, pcaCoords, avg, centerLat, centerLon, dates.length]);

  // Filter data based on view
  const filteredHexData = useMemo(() => {
    if (filterView === "all") return hexData;
    if (filterView === "high")
      return hexData.filter((d) => d.weight > Math.max(...avg) * 0.75);
    if (filterView === "medium")
      return hexData.filter(
        (d) =>
          d.weight > Math.max(...avg) * 0.3 &&
          d.weight <= Math.max(...avg) * 0.75
      );
    if (filterView === "low")
      return hexData.filter((d) => d.weight <= Math.max(...avg) * 0.3);
    return hexData;
  }, [hexData, filterView, avg]);

  // ── REPORT GENERATION ────────────────────────────────────────────
  const generateReport = async () => {
    // pull the two things your report page needs
    const datasets = JSON.parse(localStorage.getItem("datasets") || "[]");
    const analysisResults = JSON.parse(
      localStorage.getItem("analysisResults") || "[]"
    ).filter((r) => r.dataset_id.startsWith("night_lights"));

    if (!datasets.length || !analysisResults.length) {
      return alert("No night-lights data available. Run the analysis first.");
    }

    // call your Flask endpoint
    try {
      const resp = await fetch(`${API_BASE}/report/night-lights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets, analysisResults }),
      });
      if (!resp.ok) throw await resp.text();
      const reportObj = await resp.json();

      // store it so your report page can load it
      localStorage.setItem("nightLightsReport", JSON.stringify(reportObj));

      // navigate to the report
      router.push("/report/night-lights-report");
    } catch (e) {
      console.error("Report generation failed:", e);
      alert("Failed to generate full report: " + e);
    }
  };

  // Shared Plotly settings
  const BASE_LAYOUT = {
    template: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(15,23,42,0.3)",
    font: { family: "Inter, system-ui, sans-serif", color: "#f9fafb" },
    margin: { t: 30, b: 40, l: 60, r: 20 },
    modebar: { bgcolor: "rgba(0,0,0,0.3)", color: "#fff" },
    legend: { font: { size: 10 } },
    xaxis: { gridcolor: "#334155", zerolinecolor: "#334155" },
    yaxis: { gridcolor: "#334155", zerolinecolor: "#334155" },
  };

  const BASE_CONFIG = {
    displayModeBar: false,
    responsive: true,
    toImageButtonOptions: {
      format: "png",
      filename: "night_lights_dashboard",
      height: 800,
      width: 1200,
      scale: 2,
    },
  };

  // ── HELPER FUNCTIONS ────────────────────────────────────────────────
  function getColorForValue(value, min, max) {
    // Generate color between blue (low) to purple (mid) to orange (high)
    const ratio = (value - min) / (max - min);
    if (ratio < 0.5) {
      // Blue to purple
      const r = Math.round(59 + (139 - 59) * (ratio * 2));
      const g = Math.round(130 + (92 - 130) * (ratio * 2));
      const b = Math.round(246 + (246 - 246) * (ratio * 2));
      return [r, g, b];
    } else {
      // Purple to orange
      const r = Math.round(139 + (249 - 139) * ((ratio - 0.5) * 2));
      const g = Math.round(92 + (115 - 92) * ((ratio - 0.5) * 2));
      const b = Math.round(246 + (22 - 246) * ((ratio - 0.5) * 2));
      return [r, g, b];
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  // DeckGL interaction handler
  const onHover = useCallback((info) => {
    setHoverInfo(
      info.object
        ? {
            position: info.object.position,
            weight: info.object.weight,
            x: info.x,
            y: info.y,
          }
        : null
    );
  }, []);

  // ── LOADING & EMPTY STATES ─────────────────────────────────────────
  if (!datasets.length) {
    return (
      <motion.main
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200 p-8"
      >
        <FaMapMarkerAlt className="text-6xl mb-4 text-purple-500" />
        <h1 className="text-3xl font-bold mb-3">
          Welcome to Night Lights Analysis
        </h1>
        <p className="text-lg mb-6 max-w-md text-center">
          Please select your Area of Interest (AOI) and fetch datasets to begin
          your analysis.
        </p>
        <button
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 transition rounded-lg font-medium"
          onClick={() => (window.location.href = "/aoi")}
        >
          Select Area of Interest
        </button>
      </motion.main>
    );
  }

  if (loading) {
    return (
      <motion.main
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8"
      >
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-500 rounded-full opacity-25 animate-ping"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold mb-3">Analyzing Night Lights Data</h2>
        <p className="text-gray-300">Crunching the numbers, please wait...</p>
      </motion.main>
    );
  }

  if (!results.length || !dates.length) {
    return (
      <motion.main
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300"
      >
        <div className="text-center p-8">
          <FaBolt className="text-5xl mb-4 mx-auto text-yellow-500" />
          <p className="text-xl">No analysis results available yet.</p>
          <button
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
            onClick={() => localStorage.removeItem("analysisResults")}
          >
            Retry Analysis
          </button>
        </div>
      </motion.main>
    );
  }

  // ── MAIN DASHBOARD RENDER ─────────────────────────────────────────
  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white pb-12"
    >
      {/* Header with gradient border bottom */}
      <header className="bg-gray-900 backdrop-blur-sm sticky top-0 z-50 border-b border-purple-900/30 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-3">
              <FaSun className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              Night-time Lights Dashboard
            </h1>
          </div>

          {/* Navigation tabs */}
          <nav className="flex space-x-1">
            <button
              onClick={generateReport}
              className="ml-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              View Full Night-Lights Report
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "overview"
                  ? "bg-purple-700/30 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "spatial"
                  ? "bg-purple-700/30 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              onClick={() => setActiveTab("spatial")}
            >
              Spatial Analysis
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "temporal"
                  ? "bg-purple-700/30 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              onClick={() => setActiveTab("temporal")}
            >
              Temporal Analysis
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "clusters"
                  ? "bg-purple-700/30 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              onClick={() => setActiveTab("clusters")}
            >
              Clustering
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Overview Tab - shown by default */}
        {activeTab === "overview" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ staggerChildren: 0.1 }}
            className="space-y-8"
          >
            {/* Top KPIs */}
            <motion.div
              variants={slideUp}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700/50"
              >
                <div className="absolute top-0 right-0 p-2 text-purple-400 opacity-20">
                  <FaSun className="text-3xl" />
                </div>
                <h2 className="text-sm text-gray-400 mb-1">Average Radiance</h2>
                <div className="flex items-end">
                  <p className="text-3xl font-bold">
                    {avg.slice(-1)[0]?.toFixed(2) ?? "—"}
                  </p>
                  {avgChange && (
                    <span
                      className={`ml-2 text-sm ${
                        parseFloat(avgChange) > 0
                          ? "text-green-400"
                          : parseFloat(avgChange) < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {parseFloat(avgChange) > 0
                        ? "↑"
                        : parseFloat(avgChange) < 0
                        ? "↓"
                        : ""}{" "}
                      {avgChange}%
                    </span>
                  )}
                </div>
                <div className="h-1 w-full bg-gray-700 mt-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        (avg.slice(-1)[0] / Math.max(...avg)) * 100 || 0
                      }%`,
                    }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700/50"
              >
                <div className="absolute top-0 right-0 p-2 text-green-400 opacity-20">
                  <FaMapMarkerAlt className="text-3xl" />
                </div>
                <h2 className="text-sm text-gray-400 mb-1">Lit Area (km²)</h2>
                <div className="flex items-end">
                  <p className="text-3xl font-bold">
                    {litArea.slice(-1)[0]?.toFixed(1) ?? "—"}
                  </p>
                  {litAreaChange && (
                    <span
                      className={`ml-2 text-sm ${
                        parseFloat(litAreaChange) > 0
                          ? "text-green-400"
                          : parseFloat(litAreaChange) < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {parseFloat(litAreaChange) > 0
                        ? "↑"
                        : parseFloat(litAreaChange) < 0
                        ? "↓"
                        : ""}{" "}
                      {litAreaChange}%
                    </span>
                  )}
                </div>
                <div className="h-1 w-full bg-gray-700 mt-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        (litArea.slice(-1)[0] / Math.max(...litArea)) * 100 || 0
                      }%`,
                    }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700/50"
              >
                <div className="absolute top-0 right-0 p-2 text-blue-400 opacity-20">
                  <FaBolt className="text-3xl" />
                </div>
                <h2 className="text-sm text-gray-400 mb-1">
                  Bright Pixels (%)
                </h2>
                <div className="flex items-end">
                  <p className="text-3xl font-bold">
                    {pctBright.slice(-1)[0]?.toFixed(1) ?? "—"}%
                  </p>
                  {pctBrightChange && (
                    <span
                      className={`ml-2 text-sm ${
                        parseFloat(pctBrightChange) > 0
                          ? "text-green-400"
                          : parseFloat(pctBrightChange) < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {parseFloat(pctBrightChange) > 0
                        ? "↑"
                        : parseFloat(pctBrightChange) < 0
                        ? "↓"
                        : ""}{" "}
                      {pctBrightChange}%
                    </span>
                  )}
                </div>
                <div className="h-1 w-full bg-gray-700 mt-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctBright.slice(-1)[0] || 0}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700/50"
              >
                <div className="absolute top-0 right-0 p-2 text-orange-400 opacity-20">
                  <FaChartLine className="text-3xl" />
                </div>
                <h2 className="text-sm text-gray-400 mb-1">
                  New Lit Area (km²)
                </h2>
                <p className="text-3xl font-bold">
                  {newLit.slice(-1)[0]?.toFixed(1) ?? "—"}
                </p>
                <div className="h-1 w-full bg-gray-700 mt-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        (newLit.slice(-1)[0] / Math.max(...newLit)) * 100 || 0
                      }%`,
                    }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Main Overview Charts */}
            <motion.div
              variants={slideUp}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50 backdrop-blur-sm">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">
                    Light Distribution Over Time
                  </h3>
                  <p className="text-xs text-gray-400">
                    Tracking lit vs unlit area changes over the monitored period
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        x: dates,
                        y: pctBright,
                        stackgroup: "one",
                        name: "Bright Area (%)",
                        fillcolor: "rgba(59,130,246,0.7)",
                        line: { width: 0.5, color: "rgb(59,130,246)" },
                      },
                      {
                        x: dates,
                        y: unlit,
                        stackgroup: "one",
                        name: "Unlit Area (%)",
                        fillcolor: "rgba(16,185,129,0.7)",
                        line: { width: 0.5, color: "rgb(16,185,129)" },
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      xaxis: {
                        title: "Date",
                        type: "date",
                        tickformat: "%b %Y",
                      },
                      yaxis: { title: "Percentage (%)" },
                      height: 300,
                      hovermode: "x unified",
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50 backdrop-blur-sm">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">Radiance Forecast</h3>
                  <p className="text-xs text-gray-400">
                    Comparing observed values with predicted trends
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        x: dates,
                        y: avg,
                        mode: "lines",
                        name: "Observed",
                        line: { color: "#3b82f6", width: 2.5 },
                        hovertemplate:
                          "<b>Date:</b> %{x|%b %d, %Y}<br><b>Radiance:</b> %{y:.2f}<extra></extra>",
                      },
                      {
                        x: forecast.dates,
                        y: forecast.avg_radiance,
                        mode: "lines",
                        name: "Forecast",
                        line: { dash: "dot", color: "#f97316", width: 2 },
                        hovertemplate:
                          "<b>Date:</b> %{x|%b %d, %Y}<br><b>Forecast:</b> %{y:.2f}<extra></extra>",
                      },
                      {
                        x: [...dates, ...forecast.dates.slice().reverse()],
                        y: [
                          ...trend,
                          ...forecast.avg_radiance.slice().reverse(),
                        ],
                        fill: "toself",
                        fillcolor: "rgba(249,115,22,0.15)",
                        line: { width: 0 },
                        name: "Trend + Forecast Range",
                        hoverinfo: "skip",
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      xaxis: {
                        title: "Date",
                        type: "date",
                        tickformat: "%b %Y",
                        rangeslider: { visible: false },
                      },
                      yaxis: { title: "Radiance" },
                      height: 300,
                      legend: { orientation: "h", y: -0.2 },
                      hovermode: "x unified",
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Anomalies & Map Preview Row */}
            <motion.div
              variants={slideUp}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-1 bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">Anomalies Detected</h3>
                  <p className="text-xs text-gray-400">
                    Significant deviations from expected values
                  </p>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {anomalies.length > 0 ? (
                    anomalies.map((anomaly, idx) => (
                      <div key={idx} className="p-3 flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                            anomaly.original > 0
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {anomaly.original > 0 ? "↑" : "↓"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(anomaly.date)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {anomaly.original > 0
                              ? "Unusually bright"
                              : "Unusually dim"}
                            <span className="ml-1 font-mono">
                              ({anomaly.original > 0 ? "+" : ""}
                              {anomaly.original.toFixed(2)})
                            </span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-gray-400 text-center">
                      No significant anomalies detected
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Quick Map View</h3>
                    <p className="text-xs text-gray-400">
                      Light intensity distribution for latest period
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("spatial")}
                    className="text-xs px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded transition"
                  >
                    Detailed View
                  </button>
                </div>
                <div className="h-64 relative">
                  <DeckGL
                    initialViewState={{
                      longitude: centerLon,
                      latitude: centerLat,
                      zoom: 9,
                      pitch: 45,
                      bearing: 0,
                    }}
                    controller={true}
                    layers={[
                      new HexagonLayer({
                        id: "hex-preview",
                        data: hexData,
                        getPosition: (d) => d.position,
                        getElevation: (d) => d.elevation,
                        elevationScale: 30,
                        radius: 400,
                        opacity: 0.8,
                        colorRange: [
                          [65, 182, 196],
                          [127, 205, 187],
                          [199, 233, 180],
                          [237, 248, 177],
                          [255, 211, 101],
                          [255, 127, 0],
                        ],
                        coverage: 0.85,
                        extruded: true,
                        pickable: true,
                      }),
                    ]}
                    mapStyle="mapbox://styles/mapbox/dark-v10"
                    mapboxAccessToken={MAPBOX_TOKEN}
                  />
                </div>
              </div>
            </motion.div>

            {/* Bottom Row - Distributions */}
            <motion.div
              variants={slideUp}
              className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50"
            >
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold">
                  Radiance Distribution Evolution
                </h3>
                <p className="text-xs text-gray-400">
                  How brightness values are distributed over time
                </p>
              </div>
              <div className="p-4">
                <Plot
                  data={histCounts.map((cnts, i) => ({
                    x: histBins,
                    y: cnts,
                    type: "violin",
                    name: formatDate(dates[i]),
                    side: "positive",
                    spanmode: "hard",
                    opacity: 0.7,
                    marker: { line: { width: 0.5 } },
                    hovertemplate:
                      "<b>Month:</b> %{fullData.name}<br><b>Radiance:</b> %{x}<br><b>Count:</b> %{y}",
                  }))}
                  layout={{
                    ...BASE_LAYOUT,
                    violinmode: "overlay",
                    height: 300,
                    xaxis: {
                      title: "Radiance Value",
                      showgrid: true,
                    },
                    yaxis: {
                      title: "Distribution",
                      showgrid: false,
                    },
                    showlegend: false,
                  }}
                  config={BASE_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Spatial Analysis Tab */}
        {activeTab === "spatial" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="space-y-6"
          >
            <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-purple-400" />
                  Spatial Hex-Bin Analysis
                </h3>
                <p className="text-xs text-gray-400">
                  3D visualization of light intensity across your selected area
                </p>
              </div>

              <div className="flex flex-wrap p-2 gap-2 bg-gray-900/50 border-b border-gray-700/50">
                <button
                  onClick={() => setFilterView("all")}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === "all"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  All Intensities
                </button>
                <button
                  onClick={() => setFilterView("high")}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === "high"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  High Intensity
                </button>
                <button
                  onClick={() => setFilterView("medium")}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === "medium"
                      ? "bg-yellow-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  Medium Intensity
                </button>
                <button
                  onClick={() => setFilterView("low")}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === "low"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  Low Intensity
                </button>
              </div>

              <div className="h-[500px] relative">
                <DeckGL
                  initialViewState={{
                    longitude: centerLon,
                    latitude: centerLat,
                    zoom: 10,
                    pitch: 50,
                    bearing: 15,
                  }}
                  controller={true}
                  layers={[
                    new HexagonLayer({
                      id: "hexagon-layer",
                      data: filteredHexData,
                      getPosition: (d) => d.position,
                      getElevation: (d) => d.elevation,
                      elevationScale: 50,
                      extruded: true,
                      radius: 300,
                      coverage: 0.8,
                      pickable: true,
                      autoHighlight: true,
                      transitions: {
                        getElevation: {
                          duration: 300,
                        },
                      },
                      colorRange: [
                        [65, 182, 196],
                        [127, 205, 187],
                        [199, 233, 180],
                        [237, 248, 177],
                        [255, 211, 101],
                        [255, 127, 0],
                      ],
                      onHover,
                    }),
                    new ScatterplotLayer({
                      id: "highlight-layer",
                      data:
                        hexIdx === dates.length - 1
                          ? newLit.slice(-1)[0] > 0
                            ? filteredHexData.filter(
                                (d) => d.weight > avg[avg.length - 2]
                              )
                            : []
                          : [],
                      getPosition: (d) => d.position,
                      getRadius: 200,
                      getColor: [255, 255, 255, 128],
                      getFillColor: [255, 180, 0, 80],
                      stroked: true,
                      lineWidthMinPixels: 2,
                      lineWidthScale: 1,
                      antialiasing: true,
                    }),
                  ]}
                  mapStyle="mapbox://styles/mapbox/dark-v10"
                  mapboxAccessToken={MAPBOX_TOKEN}
                >
                  {hoverInfo && (
                    <div
                      className="absolute bg-black/80 text-white p-2 rounded pointer-events-none text-xs"
                      style={{
                        left: hoverInfo.x,
                        top: hoverInfo.y - 50,
                        zIndex: 1,
                      }}
                    >
                      <p>
                        Radiance:{" "}
                        {typeof hoverInfo.weight === "number"
                          ? hoverInfo.weight.toFixed(2)
                          : "N/A"}
                      </p>
                      <p>
                        Lat: {hoverInfo.position[1].toFixed(5)}, Lon:{" "}
                        {hoverInfo.position[0].toFixed(5)}
                      </p>
                    </div>
                  )}
                </DeckGL>
              </div>

              <div className="p-4 bg-gray-900/30">
                <p className="text-sm mb-2">
                  Time Period: {formatDate(dates[hexIdx])}
                </p>
                <input
                  type="range"
                  min={0}
                  max={dates.length - 1}
                  value={hexIdx}
                  onChange={(e) => setHexIdx(+e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatDate(dates[0])}</span>
                  <span>{formatDate(dates[dates.length - 1])}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">Light Coverage Changes</h3>
                  <p className="text-xs text-gray-400">
                    Evolution of illuminated areas over time
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        x: dates,
                        y: litArea,
                        type: "bar",
                        name: "Lit Area (km²)",
                        marker: {
                          color: "rgba(59,130,246,0.8)",
                          line: {
                            color: "rgba(59,130,246,1)",
                            width: 1,
                          },
                        },
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      height: 300,
                      xaxis: {
                        title: "Date",
                        type: "date",
                        tickformat: "%b %Y",
                      },
                      yaxis: { title: "Area (km²)" },
                      hovermode: "x unified",
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">New Illuminated Areas</h3>
                  <p className="text-xs text-gray-400">
                    Newly lit areas detected per period
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        x: dates,
                        y: newLit,
                        type: "scatter",
                        mode: "lines+markers",
                        name: "New Lit Areas (km²)",
                        line: {
                          shape: "spline",
                          smoothing: 1.3,
                          width: 2,
                          color: "rgba(249,115,22,0.8)",
                        },
                        marker: {
                          size: 8,
                          color: dates.map((_, i) =>
                            newLit[i] > 0
                              ? "rgba(249,115,22,0.9)"
                              : "rgba(107,114,128,0.5)"
                          ),
                          line: { width: 1, color: "rgba(249,115,22,1)" },
                        },
                        fill: "tozeroy",
                        fillcolor: "rgba(249,115,22,0.1)",
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      height: 300,
                      xaxis: {
                        title: "Date",
                        type: "date",
                        tickformat: "%b %Y",
                      },
                      yaxis: { title: "Area (km²)" },
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Temporal Analysis Tab */}
        {activeTab === "temporal" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="space-y-6"
          >
            <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold flex items-center">
                  <FaClock className="mr-2 text-blue-400" />
                  Temporal Radiance Trends
                </h3>
                <p className="text-xs text-gray-400">
                  Detailed analysis of brightness changes over time
                </p>
              </div>
              <div className="p-4">
                <Plot
                  data={[
                    {
                      x: dates,
                      y: avg,
                      type: "scatter",
                      mode: "lines+markers",
                      name: "Average Radiance",
                      line: {
                        shape: "spline",
                        width: 3,
                        color: "rgba(79,70,229,0.8)",
                      },
                      marker: { size: 8, color: "rgba(79,70,229,1)" },
                    },
                    {
                      x: dates,
                      y: trend,
                      type: "scatter",
                      mode: "lines",
                      name: "Trend",
                      line: {
                        dash: "dash",
                        width: 2,
                        color: "rgba(236,72,153,0.7)",
                      },
                    },
                  ]}
                  layout={{
                    ...BASE_LAYOUT,
                    height: 350,
                    xaxis: {
                      title: "Date",
                      type: "date",
                      tickformat: "%b %Y",
                    },
                    yaxis: { title: "Radiance" },
                    hovermode: "x unified",
                  }}
                  config={BASE_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">Anomaly Detection</h3>
                  <p className="text-xs text-gray-400">
                    Unexpected deviations from predicted values
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        z: [residual],
                        x: dates,
                        y: ["Deviation"],
                        type: "heatmap",
                        colorscale: "RdBu",
                        colorbar: {
                          title: "Residual",
                          thickness: 15,
                          len: 0.9,
                        },
                        hovertemplate:
                          "<b>Date:</b> %{x|%b %d, %Y}<br><b>Residual:</b> %{z:.2f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      height: 200,
                      xaxis: {
                        tickangle: -45,
                        type: "date",
                        tickformat: "%b %Y",
                      },
                      yaxis: { showticklabels: false },
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>

                <div className="p-4 bg-gray-900/30 border-t border-gray-700/50">
                  <h4 className="text-sm font-medium mb-2">Top Anomalies</h4>
                  <div className="space-y-2">
                    {anomalies.map((anomaly, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            anomaly.original > 0 ? "bg-green-500" : "bg-red-500"
                          }`}
                        ></div>
                        <span className="text-gray-300">
                          {formatDate(anomaly.date)}:
                        </span>
                        <span
                          className={`ml-2 ${
                            anomaly.original > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {anomaly.original.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">Brightness Distribution</h3>
                  <p className="text-xs text-gray-400">
                    How light values are distributed across time periods
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        y:
                          histCounts.length > 0
                            ? histCounts[histCounts.length - 1]
                            : [],
                        x: histBins,
                        type: "bar",
                        marker: {
                          color: histBins.map((bin) => {
                            const ratio = bin / histBins.length;
                            return `rgba(${Math.round(
                              59 + (236 - 59) * ratio
                            )}, ${Math.round(
                              130 + (72 - 130) * ratio
                            )}, ${Math.round(246 + (153 - 246) * ratio)}, 0.8)`;
                          }),
                          line: {
                            color: "rgba(0,0,0,0.1)",
                            width: 1,
                          },
                        },
                        name: "Latest Distribution",
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      height: 300,
                      bargap: 0.1,
                      xaxis: { title: "Radiance Value" },
                      yaxis: { title: "Frequency" },
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold">Future Projections</h3>
                <p className="text-xs text-gray-400">
                  Predicted changes in radiance with confidence bands
                </p>
              </div>
              <div className="p-4">
                <Plot
                  data={[
                    {
                      x: dates,
                      y: avg,
                      type: "scatter",
                      mode: "lines",
                      name: "Historical",
                      line: {
                        shape: "spline",
                        width: 3,
                        color: "rgba(59,130,246,0.8)",
                      },
                    },
                    {
                      x: forecast.dates,
                      y: forecast.avg_radiance,
                      type: "scatter",
                      mode: "lines",
                      name: "Forecast",
                      line: {
                        dash: "dashdot",
                        width: 3,
                        color: "rgba(249,115,22,0.8)",
                      },
                    },
                    {
                      x: [...forecast.dates],
                      y: forecast.avg_radiance.map((y) => y * 1.1),
                      type: "scatter",
                      mode: "lines",
                      name: "Upper Bound",
                      line: { width: 0 },
                      showlegend: false,
                    },
                    {
                      x: [...forecast.dates],
                      y: forecast.avg_radiance.map((y) => y * 0.9),
                      type: "scatter",
                      mode: "lines",
                      name: "Lower Bound",
                      line: { width: 0 },
                      fill: "tonexty",
                      fillcolor: "rgba(249,115,22,0.2)",
                      showlegend: false,
                    },
                  ]}
                  layout={{
                    ...BASE_LAYOUT,
                    height: 350,
                    xaxis: {
                      title: "Date",
                      type: "date",
                      tickformat: "%b %Y",
                    },
                    yaxis: { title: "Radiance" },
                    shapes: [
                      {
                        type: "line",
                        x0: dates[dates.length - 1],
                        y0: 0,
                        x1: dates[dates.length - 1],
                        y1: Math.max(...avg) * 1.1,
                        line: {
                          color: "rgba(255,255,255,0.3)",
                          width: 2,
                          dash: "dot",
                        },
                      },
                    ],
                    annotations: [
                      {
                        x: dates[dates.length - 1],
                        y: Math.max(...avg) * 1.05,
                        xref: "x",
                        yref: "y",
                        text: "Forecast Start",
                        showarrow: true,
                        arrowhead: 2,
                        arrowsize: 1,
                        arrowwidth: 1,
                        ax: -40,
                        ay: -30,
                      },
                    ],
                  }}
                  config={BASE_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Clustering Tab */}
        {activeTab === "clusters" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="space-y-6"
          >
            <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold flex items-center">
                  <FaChartLine className="mr-2 text-green-400" />
                  Temporal Behavior Clusters (PCA)
                </h3>
                <p className="text-xs text-gray-400">
                  Principal Component Analysis of pixel brightness patterns
                </p>
              </div>
              <div className="p-4">
                <Plot
                  data={[
                    {
                      x: pcaX,
                      y: pcaY,
                      mode: "markers",
                      type: "scatter",
                      marker: {
                        size: 8,
                        opacity: 0.7,
                        color: avg,
                        colorscale: "Viridis",
                        colorbar: {
                          title: "Avg Radiance",
                          thickness: 15,
                        },
                        line: {
                          width: 1,
                          color: "rgba(255,255,255,0.3)",
                        },
                      },
                      text: pcaCoords.map((c) => `(${c[0]},${c[1]})`),
                      hovertemplate:
                        "<b>Coordinates:</b> %{text}<br><b>Avg Brightness:</b> %{marker.color:.2f}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...BASE_LAYOUT,
                    height: 500,
                    xaxis: { title: "Principal Component 1" },
                    yaxis: { title: "Principal Component 2" },
                    dragmode: "zoom",
                  }}
                  config={BASE_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">
                    Brightness Distribution Over Time
                  </h3>
                  <p className="text-xs text-gray-400">
                    How pixel values evolve across all periods
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={histCounts.map((cnts, i) => ({
                      x: histBins,
                      y: cnts,
                      type: "violin",
                      name: formatDate(dates[i]),
                      side: "positive",
                      spanmode: "hard",
                      opacity: 0.7,
                      line: {
                        width: 1,
                        color: "rgba(255,255,255,0.3)",
                      },
                      fillcolor: `rgba(${Math.round(
                        59 + (i / histCounts.length) * 190
                      )}, ${Math.round(
                        130 - (i / histCounts.length) * 40
                      )}, ${Math.round(
                        246 - (i / histCounts.length) * 150
                      )}, 0.5)`,
                      hovertemplate:
                        "<b>Month:</b> %{fullData.name}<br><b>Radiance:</b> %{x}<br><b>Count:</b> %{y}",
                    }))}
                    layout={{
                      ...BASE_LAYOUT,
                      violinmode: "overlay",
                      height: 350,
                      xaxis: { title: "Radiance Value" },
                      yaxis: { title: "Distribution" },
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="font-semibold">
                    Bright/Dark Area Relationship
                  </h3>
                  <p className="text-xs text-gray-400">
                    Correlation between bright pixel percentage and average
                    radiance
                  </p>
                </div>
                <div className="p-4">
                  <Plot
                    data={[
                      {
                        x: pctBright,
                        y: avg,
                        mode: "markers+lines",
                        type: "scatter",
                        marker: {
                          size: 10,
                          color: dates.map((_, i) => i),
                          colorscale: "Viridis",
                          colorbar: {
                            title: "Time Period",
                            thickness: 15,
                          },
                          line: {
                            width: 1,
                            color: "rgba(255,255,255,0.3)",
                          },
                        },
                        line: {
                          color: "rgba(255,255,255,0.3)",
                          width: 1,
                        },
                        text: dates,
                        hovertemplate:
                          "<b>Date:</b> %{text}<br><b>Bright Pixels:</b> %{x:.1f}%<br><b>Avg Radiance:</b> %{y:.2f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...BASE_LAYOUT,
                      height: 350,
                      xaxis: { title: "Bright Pixel Percentage (%)" },
                      yaxis: { title: "Average Radiance" },
                    }}
                    config={BASE_CONFIG}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/70 backdrop-blur-sm border-t border-gray-800 py-3 px-4 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>Night-time Lights Dashboard v1.0</p>
          <p className="mt-2 md:mt-0">
            Dataset: {datasets[0]?.id || "Unknown"} • Timespan:{" "}
            {formatDate(dates[0])} - {formatDate(dates[dates.length - 1])}
          </p>
        </div>
      </footer>
    </motion.main>
  );
}
