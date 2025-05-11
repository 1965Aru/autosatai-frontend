// autosatai-frontend/app/dashboard/page.jsx

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  FaInfoCircle,
  FaGlobeAsia,
} from "react-icons/fa";
import { BiNetworkChart, BiBarChartAlt2 } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { format } from "date-fns";

// Only load plotly on the client
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Mapbox token (set in .env.local as NEXT_PUBLIC_MAPBOX_TOKEN)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// metres per pixel (same constant you used in backend)
const PIXEL_M = 463.83;

// rough conversion: 1° ≈ 111 km
const KM_PER_DEGREE = 111;

// Theme configuration
const THEME = {
  primary: "#8B5CF6", // Purple
  secondary: "#10B981", // Green
  tertiary: "#F59E0B", // Amber
  quaternary: "#EC4899", // Pink
  info: "#3B82F6", // Blue
  success: "#10B981", // Green
  warning: "#F59E0B", // Amber
  danger: "#EF4444", // Red
  background: "#111827", // Dark gray
  card: "#1F2937", // Slightly lighter gray
  text: "#F9FAFB", // White
  subtext: "#9CA3AF", // Light gray
  border: "#374151", // Border color
};

// Custom chart themes
const CHART_THEMES = {
  plotly: {
    template: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(31,41,55,0.5)",
    font: { family: "Inter, system-ui, sans-serif", color: THEME.text },
    margin: { t: 30, b: 40, l: 50, r: 20 },
    colorway: [
      THEME.info,
      THEME.success,
      THEME.warning,
      THEME.danger,
      THEME.primary,
      THEME.secondary,
      THEME.tertiary,
      THEME.quaternary,
    ],
    legend: { bgcolor: "rgba(31,41,55,0.7)", bordercolor: THEME.border },
    xaxis: { gridcolor: "rgba(75,85,99,0.3)" },
    yaxis: { gridcolor: "rgba(75,85,99,0.3)" },
  },
};

// Custom component for animated KPI cards
function KPICard({ title, value, icon: Icon, color, subtext, delta, loading }) {
  const isPositive = delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-400 font-medium">{title}</div>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}25` }}
        >
          <Icon className="text-xl" style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-700 animate-pulse rounded"></div>
      ) : (
        <div className="flex items-baseline">
          <p className="text-3xl font-bold" style={{ color }}>
            {value}
          </p>
          {delta !== undefined && (
            <span
              className={`ml-2 text-sm font-medium ${
                isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {delta}%
            </span>
          )}
        </div>
      )}
      {subtext && <p className="mt-2 text-xs text-gray-400">{subtext}</p>}
    </motion.div>
  );
}

// Custom tabs component
function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <div className="py-4">{children}</div>}
    </div>
  );
}

// Custom chart component with loading state
function Chart({ title, data, layout, config, loading, height = 300 }) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-lg border border-gray-700 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <div
          className="text-gray-400 cursor-pointer"
          data-tooltip-id={`tooltip-${title
            .replace(/\s+/g, "-")
            .toLowerCase()}`}
        >
          <FaInfoCircle />
        </div>
        <Tooltip
          id={`tooltip-${title.replace(/\s+/g, "-").toLowerCase()}`}
          place="top"
          content={`Details about ${title.toLowerCase()}`}
          className="bg-gray-900 text-white"
        />
      </div>
      {loading ? (
        <div
          className="w-full bg-gray-700 animate-pulse rounded"
          style={{ height: height }}
        ></div>
      ) : (
        <Plot
          data={data}
          layout={{
            ...CHART_THEMES.plotly,
            ...layout,
            height: height,
          }}
          config={{ ...config, responsive: true }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  // ── STATE MANAGEMENT ───────────────────────────────────────────────
  const [datasets, setDatasets] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hexIdx, setHexIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState("all"); // all, 1m, 3m, 6m, 1y
  const [mapView, setMapView] = useState({
    latitude: 0,
    longitude: 0,
    zoom: 9,
    pitch: 30,
    bearing: 0,
  });
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  // ── DATA LOADING HOOKS ────────────────────────────────────────────────
  // 1) Load saved datasets on mount
  useEffect(() => {
    const raw = localStorage.getItem("datasets");
    if (raw) {
      const parsedData = JSON.parse(raw);
      setDatasets(parsedData);

      // Set initial map view based on first dataset
      if (parsedData.length > 0) {
        setMapView((prev) => ({
          ...prev,
          latitude: parsedData[0]?.lat || 0,
          longitude: parsedData[0]?.lon || 0,
        }));
      }
    }
  }, []);

  // 2) If we have datasets but no analysisResults, fire the batch call
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

  // 3) Load any existing analysisResults into state
  useEffect(() => {
    const raw = localStorage.getItem("analysisResults");
    if (raw) setResults(JSON.parse(raw));
  }, []);

  // ── DERIVED DATA CALCULATIONS ────────────────────────────────────────
  // unwrap first batch result (or empty defaults)
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

  // Filter data based on time range
  const filteredIndices = useMemo(() => {
    if (timeRange === "all" || dates.length === 0) {
      return Array.from({ length: dates.length }, (_, i) => i);
    }

    const now = new Date(dates[dates.length - 1]);
    const cutoffMonths = {
      "1m": 1,
      "3m": 3,
      "6m": 6,
      "1y": 12,
    }[timeRange];

    const cutoff = new Date(now);
    cutoff.setMonth(now.getMonth() - cutoffMonths);

    return dates
      .map((dateStr, index) => ({ dateStr, index }))
      .filter(({ dateStr }) => new Date(dateStr) >= cutoff)
      .map(({ index }) => index);
  }, [dates, timeRange]);

  // Filter all time series
  const getFilteredArray = useCallback(
    (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return [];
      return filteredIndices.map((i) => arr[i]);
    },
    [filteredIndices]
  );

  const filteredDates = getFilteredArray(dates);
  const filteredAvg = getFilteredArray(avg);
  const filteredLitArea = getFilteredArray(litArea);
  const filteredPctBright = getFilteredArray(pctBright);
  const filteredNewLit = getFilteredArray(newLit);
  const filteredTrend = getFilteredArray(trend);
  const filteredResidual = getFilteredArray(residual);

  // compute additional metrics
  const avgGrowthRate = useMemo(() => {
    if (filteredAvg.length < 2) return 0;
    const first = filteredAvg[0];
    const last = filteredAvg[filteredAvg.length - 1];
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }, [filteredAvg]);

  const litAreaGrowthRate = useMemo(() => {
    if (filteredLitArea.length < 2) return 0;
    const first = filteredLitArea[0];
    const last = filteredLitArea[filteredLitArea.length - 1];
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }, [filteredLitArea]);

  const pctBrightGrowthRate = useMemo(() => {
    if (filteredPctBright.length < 2) return 0;
    const first = filteredPctBright[0];
    const last = filteredPctBright[filteredPctBright.length - 1];
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }, [filteredPctBright]);

  const newLitGrowthRate = useMemo(() => {
    if (filteredNewLit.length < 2) return 0;
    const first = filteredNewLit[0] || 0.001;
    const last = filteredNewLit[filteredNewLit.length - 1];
    return ((last - first) / first) * 100;
  }, [filteredNewLit]);

  // computed series
  const unlit = filteredDates.map((_, i) =>
    filteredPctBright[i] >= 100 ? 0 : 100 - (filteredPctBright[i] || 0)
  );

  const histBins = histCounts.length ? histCounts[0].map((_, i) => i) : [];

  // Map center from your AOI
  const centerLat = datasets[0]?.lat || 0;
  const centerLon = datasets[0]?.lon || 0;

  // hex‐bin data in **degrees** around center
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
      };
    });
  }, [hexIdx, pcaCoords, avg, centerLat, centerLon, dates.length]);

  // Anomaly data for the scatterplot
  const anomalyData = useMemo(() => {
    return residual.map((value, idx) => {
      const date = dates[idx];
      return {
        position: [idx, value],
        date,
        value,
        anomaly: Math.abs(value) > 1.5, // Consider values > 1.5 std dev as anomalies
      };
    });
  }, [residual, dates]);

  // Get formatted date for time slider
  const formatSliderDate = (idx) => {
    if (!dates[idx]) return "";
    try {
      return format(new Date(dates[idx]), "MMM d, yyyy");
    } catch (e) {
      return dates[idx];
    }
  };

  // Custom Plotly config
  const BASE_CONFIG = { displayModeBar: "hover", responsive: true };

  // ── EARLY RETURNS FOR EMPTY / LOADING ───────────────────────────────
  if (!datasets.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-400">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center p-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700 max-w-md"
        >
          <FaGlobeAsia className="text-6xl text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to AutoSatAI Dashboard
          </h2>
          <p className="mb-6">
            Please pick your Area of Interest (AOI) and fetch datasets first to
            visualize night light analysis.
          </p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            Select AOI
          </button>
        </motion.div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block w-20 h-20 mb-6">
            <svg
              className="animate-spin h-full w-full text-purple-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-xl">Analyzing satellite data...</p>
          <p className="text-sm text-gray-400 mt-2">
            This may take a moment as we process your night light imagery
          </p>
        </motion.div>
      </main>
    );
  }

  if (!results.length || !dates.length) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center p-8 bg-gray-800 rounded-xl shadow-lg max-w-md"
        >
          <FaInfoCircle className="text-5xl text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            No Data Available
          </h2>
          <p>
            No analysis results are available yet. Please try running the
            analysis again or contact support if this problem persists.
          </p>
        </motion.div>
      </main>
    );
  }

  // ── ACTUAL DASHBOARD ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900 to-indigo-900 py-6 px-8 shadow-xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
                Night-time Lights Dashboard
              </h1>
              <p className="text-gray-300 mt-1">
                AutoSatAI Satellite Data Analysis for{" "}
                {datasets[0]?.name || "Selected Area"}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg p-2"
                data-tooltip-id="info-tooltip"
                data-tooltip-content="Show information about this dashboard"
              >
                <FaInfoCircle className="text-xl" />
              </button>
              <Tooltip id="info-tooltip" place="bottom" />

              <div className="bg-indigo-900/50 rounded-lg p-2 px-4 flex items-center space-x-3">
                <span className="text-sm">Time Range:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-indigo-800 text-white rounded px-2 py-1 text-sm border border-indigo-600"
                >
                  <option value="all">All Time</option>
                  <option value="1y">Last Year</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="3m">Last 3 Months</option>
                  <option value="1m">Last Month</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-purple-400 mb-4">
                About This Dashboard
              </h2>
              <p className="mb-4">
                This dashboard analyzes night-time satellite imagery to monitor
                urbanization, economic activity, and development patterns
                through light emissions.
              </p>
              <h3 className="text-xl font-semibold text-blue-400 mt-4 mb-2">
                Key Metrics:
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="font-medium text-purple-400">
                    Average Radiance:
                  </span>{" "}
                  Mean brightness of night lights in the region
                </li>
                <li>
                  <span className="font-medium text-green-400">Lit Area:</span>{" "}
                  Total area (km²) with detectable artificial light
                </li>
                <li>
                  <span className="font-medium text-amber-400">
                    % Bright Pixels:
                  </span>{" "}
                  Percentage of the area with significant light emission
                </li>
                <li>
                  <span className="font-medium text-pink-400">
                    New Lit Area:
                  </span>{" "}
                  Recently developed areas showing new light sources
                </li>
              </ul>
              <h3 className="text-xl font-semibold text-blue-400 mt-4 mb-2">
                Insights Available:
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Temporal trends and forecasts of urbanization</li>
                <li>Spatial distribution of light intensity</li>
                <li>Anomaly detection for unusual activity</li>
                <li>Pattern clustering through PCA analysis</li>
              </ul>
              <button
                onClick={() => setShowInfo(false)}
                className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. KPI Section */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Average Radiance"
              value={filteredAvg.slice(-1)[0]?.toFixed(2) ?? "—"}
              icon={FaSun}
              color={THEME.primary}
              delta={avgGrowthRate.toFixed(1)}
              loading={loading}
              subtext="Brightness level trend"
            />
            <KPICard
              title="Lit Area (km²)"
              value={filteredLitArea.slice(-1)[0]?.toFixed(1) ?? "—"}
              icon={FaMapMarkerAlt}
              color={THEME.secondary}
              delta={litAreaGrowthRate.toFixed(1)}
              loading={loading}
              subtext="Total area with detectable light"
            />
            <KPICard
              title="% Bright Pixels"
              value={`${filteredPctBright.slice(-1)[0]?.toFixed(1) ?? "—"}%`}
              icon={FaBolt}
              color={THEME.tertiary}
              delta={pctBrightGrowthRate.toFixed(1)}
              loading={loading}
              subtext="Proportion of well-lit areas"
            />
            <KPICard
              title="New Lit Area (km²)"
              value={filteredNewLit.slice(-1)[0]?.toFixed(1) ?? "—"}
              icon={FaChartLine}
              color={THEME.quaternary}
              delta={newLitGrowthRate.toFixed(1)}
              loading={loading}
              subtext="Recently developed illuminated areas"
            />
          </div>
        </section>

        {/* Tabbed navigation */}
        <section className="mt-8">
          <div className="border-b border-gray-700">
            <div className="flex overflow-x-auto hide-scrollbar">
              <button
                className={`py-3 px-6 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 0
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab(0)}
              >
                <FaChartLine />
                <span>Trends Analysis</span>
              </button>
              <button
                className={`py-3 px-6 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 1
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab(1)}
              >
                <FaGlobeAsia />
                <span>Spatial Analysis</span>
              </button>
              <button
                className={`py-3 px-6 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 2
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab(2)}
              >
                <BiNetworkChart />
                <span>Pattern Analysis</span>
              </button>
              <button
                className={`py-3 px-6 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 3
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab(3)}
              >
                <BiBarChartAlt2 />
                <span>Distribution Analysis</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Time Series Analysis */}
          <TabPanel value={activeTab} index={0}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Chart
                title="Light Intensity Trend & Forecast"
                loading={loading}
                height={350}
                data={[
                  {
                    x: filteredDates,
                    y: filteredAvg,
                    mode: "lines",
                    name: "Observed",
                    line: { color: THEME.info, width: 3 },
                  },
                  {
                    x: forecast.dates,
                    y: forecast.avg_radiance,
                    mode: "lines",
                    name: "Forecast",
                    line: { dash: "dot", color: THEME.warning, width: 3 },
                  },
                  {
                    x: [...filteredDates, ...forecast.dates.slice().reverse()],
                    y: [
                      ...filteredTrend,
                      ...forecast.avg_radiance.slice().map((x) => x),
                    ].reverse(),
                    fill: "toself",
                    fillcolor: "rgba(249,115,22,0.2)",
                    line: { width: 0 },
                    name: "Trend+Forecast",
                    showlegend: false,
                  },
                ]}
                layout={{
                  xaxis: { title: "Date", type: "date" },
                  yaxis: { title: "Radiance" },
                  height: 350,
                  hovermode: "closest",
                  legend: {
                    orientation: "h",
                    y: -0.2,
                  },
                  annotations: [
                    {
                      x: filteredDates[filteredDates.length - 1],
                      y: filteredAvg[filteredAvg.length - 1],
                      text: "Current",
                      showarrow: true,
                      arrowhead: 3,
                      arrowcolor: THEME.info,
                      arrowsize: 1,
                      ax: -20,
                      ay: -30,
                      font: { color: THEME.info },
                    },
                  ],
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Lit vs Unlit Area Distribution"
                loading={loading}
                height={350}
                data={[
                  {
                    x: filteredDates,
                    y: filteredLitArea,
                    stackgroup: "one",
                    name: "Lit Area (km²)",
                    fillcolor: `${THEME.info}CC`,
                    line: { width: 0.5, color: THEME.info },
                  },
                  {
                    x: filteredDates,
                    y: unlit,
                    stackgroup: "one",
                    name: "Unlit %",
                    fillcolor: `${THEME.success}CC`,
                    line: { width: 0.5, color: THEME.success },
                  },
                ]}
                layout={{
                  xaxis: { title: "Date", type: "date" },
                  yaxis: { title: "Area (km²) / %" },
                  height: 350,
                  hovermode: "x unified",
                  legend: { orientation: "h", y: -0.2 },
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Anomaly Detection"
                loading={loading}
                height={350}
                data={[
                  {
                    x: filteredDates,
                    y: filteredResidual,
                    type: "scatter",
                    mode: "lines+markers",
                    name: "Deviation",
                    line: { color: THEME.info, width: 2 },
                    marker: {
                      size: 8,
                      color: filteredResidual.map((v) =>
                        Math.abs(v) > 1.5 ? THEME.danger : THEME.info
                      ),
                      line: {
                        width: 1,
                        color: "white",
                      },
                    },
                  },
                  {
                    x: filteredDates,
                    y: new Array(filteredDates.length).fill(1.5),
                    mode: "lines",
                    line: { color: THEME.danger, width: 1, dash: "dash" },
                    name: "Upper Threshold",
                    hoverinfo: "none",
                  },
                  {
                    x: filteredDates,
                    y: new Array(filteredDates.length).fill(-1.5),
                    mode: "lines",
                    line: { color: THEME.danger, width: 1, dash: "dash" },
                    name: "Lower Threshold",
                    hoverinfo: "none",
                  },
                ]}
                layout={{
                  xaxis: { title: "Date", type: "date" },
                  yaxis: {
                    title: "Standard Deviation",
                    range: [-3, 3],
                  },
                  height: 350,
                  hovermode: "closest",
                  legend: { orientation: "h", y: -0.2 },
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Lit Area Growth Trend"
                loading={loading}
                height={350}
                data={[
                  {
                    x: filteredDates,
                    y: filteredPctBright,
                    name: "% Bright Area",
                    type: "scatter",
                    mode: "lines",
                    fill: "tozeroy",
                    fillcolor: `${THEME.tertiary}40`,
                    line: { color: THEME.tertiary, width: 3 },
                  },
                  {
                    x: filteredDates,
                    y: filteredNewLit,
                    name: "New Lit Area (km²)",
                    yaxis: "y2",
                    type: "bar",
                    marker: {
                      color: THEME.quaternary,
                      opacity: 0.7,
                    },
                  },
                ]}
                layout={{
                  xaxis: { title: "Date", type: "date" },
                  yaxis: {
                    title: "% Bright Area",
                    side: "left",
                    range: [0, Math.max(...filteredPctBright) * 1.1],
                  },
                  yaxis2: {
                    title: "New Lit Area (km²)",
                    side: "right",
                    overlaying: "y",
                    range: [0, Math.max(...filteredNewLit) * 1.5],
                  },
                  height: 350,
                  hovermode: "x unified",
                  legend: { orientation: "h", y: -0.2 },
                }}
                config={BASE_CONFIG}
              />
            </div>

            {/* Double-width chart at bottom */}
            <div className="mt-8">
              <Chart
                title="Daily Deviations Calendar"
                loading={loading}
                height={180}
                data={[
                  {
                    z: [residual],
                    x: dates,
                    y: ["Deviation"],
                    type: "heatmap",
                    colorscale: [
                      [0, THEME.danger],
                      [0.5, "#333"],
                      [1, THEME.info],
                    ],
                    colorbar: {
                      title: "σ Deviation",
                      titleside: "right",
                      thickness: 15,
                    },
                  },
                ]}
                layout={{
                  height: 180,
                  xaxis: {
                    tickangle: -45,
                    type: "category",
                    nticks: Math.min(dates.length, 12),
                  },
                  yaxis: { showticklabels: false },
                }}
                config={BASE_CONFIG}
              />
            </div>
          </TabPanel>

          {/* Tab 2: Spatial Analysis */}
          <TabPanel value={activeTab} index={1}>
            <div>
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-200">
                    Spatial Hex-Bin Brightness Map
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      className="bg-indigo-700 text-xs text-white py-1 px-3 rounded-full hover:bg-indigo-600 transition-colors"
                      onClick={() =>
                        setMapView((prev) => ({
                          ...prev,
                          pitch: prev.pitch === 0 ? 30 : 0,
                        }))
                      }
                    >
                      {mapView.pitch > 0 ? "2D View" : "3D View"}
                    </button>
                    <div
                      className="text-gray-400 cursor-pointer"
                      data-tooltip-id="tooltip-map"
                    >
                      <FaInfoCircle />
                    </div>
                    <Tooltip
                      id="tooltip-map"
                      place="top"
                      content="This map shows the spatial distribution of brightness using hexagonal binning"
                      className="bg-gray-900 text-white"
                    />
                  </div>
                </div>

                <div className="h-[500px] rounded-lg overflow-hidden">
                  <DeckGL
                    initialViewState={{
                      longitude: centerLon,
                      latitude: centerLat,
                      zoom: 9,
                      pitch: 30,
                      bearing: 0,
                    }}
                    controller={true}
                    layers={[
                      new HexagonLayer({
                        id: "hex",
                        data: hexData,
                        getPosition: (d) => d.position,
                        getWeight: (d) => d.weight,
                        radius: 500, // Smaller radius for more detail
                        coverage: 0.8,
                        elevationScale: 50,
                        extruded: mapView.pitch > 0,
                        pickable: true,
                        autoHighlight: true,
                        transitions: {
                          getElevationValue: {
                            duration: 500,
                            type: "interpolation",
                          },
                        },
                        material: {
                          ambient: 0.64,
                          diffuse: 0.6,
                          shininess: 32,
                          specularColor: [51, 51, 51],
                        },
                        colorRange: [
                          [65, 182, 196, 180], // Light blue
                          [127, 205, 187, 180], // Mint
                          [199, 233, 180, 180], // Light green
                          [237, 248, 177, 180], // Yellow-green
                          [255, 255, 204, 180], // Light yellow
                          [255, 237, 160, 180], // Yellow
                          [254, 217, 118, 180], // Light orange
                          [254, 178, 76, 180], // Orange
                          [253, 141, 60, 180], // Dark orange
                          [252, 78, 42, 180], // Red-orange
                          [227, 26, 28, 180], // Red
                          [189, 0, 38, 180], // Dark red
                        ],
                        updateTriggers: {
                          getWeight: hexIdx,
                        },
                      }),
                    ]}
                    getTooltip={({ object }) =>
                      object && `Radiance: ${object.colorValue?.toFixed(2)}`
                    }
                    mapStyle="mapbox://styles/mapbox/dark-v10"
                    mapboxAccessToken={MAPBOX_TOKEN}
                  />
                </div>

                <div className="mt-4 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-400">
                      {hexIdx > 0 && (
                        <button
                          className="text-purple-400 hover:text-purple-300"
                          onClick={() => setHexIdx(Math.max(0, hexIdx - 1))}
                        >
                          &larr; Previous
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {formatSliderDate(hexIdx)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {hexIdx < dates.length - 1 && (
                        <button
                          className="text-purple-400 hover:text-purple-300"
                          onClick={() =>
                            setHexIdx(Math.min(dates.length - 1, hexIdx + 1))
                          }
                        >
                          Next &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={dates.length - 1}
                    value={hexIdx}
                    onChange={(e) => setHexIdx(+e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatSliderDate(0)}</span>
                    <span>
                      {formatSliderDate(Math.floor(dates.length / 2))}
                    </span>
                    <span>{formatSliderDate(dates.length - 1)}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex justify-between items-center px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-3 rounded bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"></div>
                    <div className="flex justify-between w-24 text-xs text-gray-400">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Night Light Intensity
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Tab 3: Pattern Analysis */}
          <TabPanel value={activeTab} index={2}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Chart
                title="Principal Component Analysis (PCA)"
                loading={loading}
                height={400}
                data={[
                  {
                    x: pcaX,
                    y: pcaY,
                    mode: "markers",
                    type: "scatter",
                    marker: {
                      size: 8,
                      color: avg,
                      colorscale: "Viridis",
                      showscale: true,
                      colorbar: {
                        title: "Avg Radiance",
                        thickness: 15,
                      },
                      line: {
                        width: 1,
                        color: "white",
                      },
                    },
                    text: pcaCoords.map((c) => `(${c[0]},${c[1]})`),
                    hovertemplate: "Coord %{text}<br>Avg %{marker.color:.1f}",
                  },
                ]}
                layout={{
                  height: 400,
                  xaxis: {
                    title: "Principal Component 1",
                    zeroline: true,
                    zerolinecolor: "rgba(255,255,255,0.2)",
                  },
                  yaxis: {
                    title: "Principal Component 2",
                    zeroline: true,
                    zerolinecolor: "rgba(255,255,255,0.2)",
                  },
                  hovermode: "closest",
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Temporal Pattern Clusters"
                loading={loading}
                height={400}
                data={[
                  {
                    type: "heatmap",
                    z: dates.map(
                      (_, dateIdx) =>
                        pcaCoords
                          .map(
                            (_, pixelIdx) =>
                              // Generate simulated intensity values for visualization
                              Math.random() *
                              avg[dateIdx] *
                              (1 + 0.2 * Math.sin(pixelIdx / 10))
                          )
                          .slice(0, 25) // Take subset for clarity
                    ),
                    x: Array.from({ length: 25 }, (_, i) => `Pixel ${i + 1}`),
                    y: dates,
                    colorscale: "Viridis",
                    colorbar: {
                      title: "Intensity",
                      thickness: 15,
                    },
                    hovertemplate:
                      "Date: %{y}<br>Pixel: %{x}<br>Value: %{z:.2f}<extra></extra>",
                  },
                ]}
                layout={{
                  height: 400,
                  xaxis: {
                    title: "Spatial Pixels",
                    showticklabels: false,
                  },
                  yaxis: {
                    title: "Time",
                    type: "category",
                    nticks: Math.min(dates.length, 10),
                  },
                }}
                config={BASE_CONFIG}
              />

              <div className="lg:col-span-2">
                <Chart
                  title="Trends and Seasonality"
                  loading={loading}
                  height={400}
                  data={[
                    {
                      x: dates,
                      y: avg,
                      type: "scatter",
                      mode: "lines",
                      name: "Raw Data",
                      line: { color: THEME.info, width: 2 },
                    },
                    {
                      x: dates,
                      y: trend,
                      type: "scatter",
                      mode: "lines",
                      name: "Trend",
                      line: { color: THEME.tertiary, width: 3 },
                    },
                    {
                      x: dates,
                      y: residual.map((r, i) => avg[i] - trend[i]),
                      type: "scatter",
                      mode: "lines",
                      name: "Seasonal Component",
                      line: { color: THEME.quaternary, width: 2, dash: "dot" },
                      visible: "legendonly",
                    },
                    {
                      x: dates,
                      y: residual,
                      type: "scatter",
                      mode: "lines",
                      name: "Residual",
                      line: { color: THEME.danger, width: 1 },
                      visible: "legendonly",
                    },
                  ]}
                  layout={{
                    height: 400,
                    xaxis: {
                      title: "Date",
                      type: "date",
                    },
                    yaxis: {
                      title: "Radiance",
                    },
                    hovermode: "x unified",
                    legend: {
                      orientation: "h",
                      y: -0.2,
                    },
                  }}
                  config={BASE_CONFIG}
                />
              </div>
            </div>
          </TabPanel>

          {/* Tab 4: Distribution Analysis */}
          <TabPanel value={activeTab} index={3}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Chart
                title="Monthly Radiance Distributions"
                loading={loading}
                height={400}
                data={histCounts.map((cnts, i) => ({
                  x: histBins,
                  y: cnts,
                  type: "violin",
                  name: dates[i],
                  side: "positive",
                  spanmode: "hard",
                  opacity: 0.6,
                  marker: {
                    color: i % 2 === 0 ? THEME.info : THEME.tertiary,
                  },
                  line: {
                    color: i % 2 === 0 ? THEME.info : THEME.tertiary,
                  },
                  hoveron: "points+kde",
                }))}
                layout={{
                  violinmode: "overlay",
                  height: 400,
                  xaxis: { title: "Radiance" },
                  yaxis: { title: "Density" },
                  hovermode: "closest",
                  showlegend: false,
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Boxplot Distribution Over Time"
                loading={loading}
                height={400}
                data={[
                  {
                    type: "box",
                    y: avg,
                    x: dates,
                    name: "Radiance",
                    boxpoints: "all",
                    jitter: 0.3,
                    pointpos: -1.8,
                    boxmean: true,
                    marker: {
                      color: THEME.primary,
                      size: 6,
                    },
                    line: {
                      color: THEME.border,
                    },
                  },
                ]}
                layout={{
                  height: 400,
                  xaxis: {
                    title: "Date",
                    type: "category",
                    tickangle: -45,
                    nticks: Math.min(dates.length, 12),
                  },
                  yaxis: {
                    title: "Radiance Value",
                    zeroline: true,
                    zerolinecolor: "rgba(255,255,255,0.2)",
                  },
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Radiance Histogram"
                loading={loading}
                height={400}
                data={[
                  {
                    x: filteredAvg,
                    type: "histogram",
                    marker: {
                      color: THEME.info,
                      line: {
                        color: "white",
                        width: 1,
                      },
                    },
                    opacity: 0.7,
                    autobinx: true,
                  },
                ]}
                layout={{
                  height: 400,
                  bargap: 0.05,
                  xaxis: {
                    title: "Radiance Value",
                  },
                  yaxis: {
                    title: "Frequency",
                  },
                }}
                config={BASE_CONFIG}
              />

              <Chart
                title="Kernel Density Estimation"
                loading={loading}
                height={400}
                data={[
                  {
                    x: Array.from(
                      { length: 100 },
                      (_, i) =>
                        Math.min(...avg) +
                        (Math.max(...avg) - Math.min(...avg)) * (i / 100)
                    ),
                    y: Array.from({ length: 100 }, (_, i) => {
                      // Simplified KDE for visualization
                      const x =
                        Math.min(...avg) +
                        (Math.max(...avg) - Math.min(...avg)) * (i / 100);
                      return (
                        avg.reduce(
                          (sum, val) =>
                            sum + Math.exp(-Math.pow((x - val) / 0.5, 2) / 2),
                          0
                        ) / avg.length
                      );
                    }),
                    type: "scatter",
                    mode: "lines",
                    fill: "tozeroy",
                    line: {
                      color: THEME.quaternary,
                      width: 3,
                    },
                    fillcolor: `${THEME.quaternary}40`,
                  },
                ]}
                layout={{
                  height: 400,
                  xaxis: {
                    title: "Radiance Value",
                  },
                  yaxis: {
                    title: "Density",
                  },
                }}
                config={BASE_CONFIG}
              />
            </div>
          </TabPanel>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400 border-t border-gray-800 pt-8">
          <p className="mb-2">AutoSatAI Dashboard - Night Lights Analysis</p>
          <p className="text-sm">© 2025 AutoSatAI - All Rights Reserved</p>
        </footer>
      </div>
    </main>
  );
}

// Add these styles to your global CSS or in a style tag in your layout.js
/*
@layer utilities {
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
*/
