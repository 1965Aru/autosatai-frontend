"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FiDownload,
  FiInfo,
  FiMapPin,
  FiCalendar,
  FiFilter,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Brush,
  Cell,
} from "recharts";

// ── report endpoint base ─────────────────────────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://autosatai-backend.onrender.com";

// Custom components
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number"
            ? entry.value.toFixed(4)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, secondary, change }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 flex flex-col">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <span className={`p-2 rounded-lg bg-opacity-20 ${color}`}>{icon}</span>
    </div>
    <div className="flex items-baseline">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {secondary && (
        <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {secondary}
        </p>
      )}
    </div>
    {change !== undefined && (
      <p
        className={`mt-2 text-xs ${
          change >= 0 ? "text-green-500" : "text-red-500"
        }`}
      >
        {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(2)}% from previous
      </p>
    )}
  </div>
);

const AgricultureHotspotDashboardPage = () => {
  // State management
  const [singleResults, setSingleResults] = useState([]);
  const [seriesResults, setSeriesResults] = useState(null);
  const [metadata, setMetadata] = useState({
    location: "", // the AOI string
    date_range: { from: "", to: "" },
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [timeRange, setTimeRange] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reportText, setReportText] = useState(null);
  const router = useRouter();

  // ------------------------------
  const generateReport = async () => {
    const datasets = JSON.parse(localStorage.getItem("datasets") || "[]");
    if (!singleResults.length || !seriesResults) {
      return alert(
        "Please run both single-image and time-series analyses first"
      );
    }

    const payload = {
      datasets,
      location: metadata.location,
      date_range: metadata.date_range,
      singleResults,
      series: seriesResults.series,
      anomalies: seriesResults.anomalies,
      breakpoints: seriesResults.breakpoints,
    };

    const res = await fetch(`/report/agri`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      return alert("Report generation failed: " + txt);
    }

    const reportObj = await res.json(); 
    localStorage.setItem("agriReportJSON", JSON.stringify(reportObj));
    // ALSO show it right here, inline:
    setReportText(JSON.stringify(reportObj, null, 2));
    // navigate to the report page
    router.push("/report/agri-report");
  };

  // Helper functions for NDVI analysis
  const calculateHealth = (ndvi) => {
    if (ndvi >= 0.7) return "Excellent";
    if (ndvi >= 0.5) return "Good";
    if (ndvi >= 0.3) return "Moderate";
    if (ndvi >= 0.1) return "Poor";
    return "Very Poor";
  };

  const calculateHighNdviPercentage = (distribution) => {
    if (!distribution || !distribution.histogram || !distribution.bucketMeans)
      return null;

    const { histogram, bucketMeans } = distribution;
    let highNdviCount = 0;
    let totalCount = 0;

    for (let i = 0; i < histogram.length; i++) {
      if (bucketMeans[i] > 0.6) {
        highNdviCount += histogram[i];
      }
      totalCount += histogram[i];
    }

    return totalCount > 0 ? (highNdviCount / totalCount) * 100 : 0;
  };

  // Load data from localStorage
  useEffect(() => {
    try {
      // Load single image analysis results
      const raw = localStorage.getItem("analysisResults") || "[]";
      const parsed = JSON.parse(raw);
      const agriResults = parsed
        .filter(
          (r) =>
            r.analysis === "agriculture_hotspot" && r.stats?.NDVI_mean != null
        )
        .map((r) => ({
          ...r,
          date: new Date(r.timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          // Calculate vegetation health from NDVI (basic scale)
          health: calculateHealth(r.stats.NDVI_mean),
          // Calculate percentage of high NDVI pixels (> 0.6) if distribution exists
          highNdviPercentage: calculateHighNdviPercentage(r.distribution),
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setSingleResults(agriResults);

      // Set default selected image
      if (agriResults.length > 0 && !selectedImage) {
        setSelectedImage(agriResults[agriResults.length - 1]);
      }

      // Load time series analysis results
      const seriesRaw = localStorage.getItem("seriesResults") || "null";
      const seriesParsed = JSON.parse(seriesRaw);
      if (
        seriesParsed &&
        seriesParsed.results &&
        seriesParsed.results[0]?.series
      ) {
        setSeriesResults(seriesParsed.results[0]);
      }
      // ——— load metadata from localStorage ———
      const rawParams = localStorage.getItem("agriParams");
      if (rawParams) {
        const params = JSON.parse(rawParams);
        if (params.location && params.date_range) {
          setMetadata({
            location: params.location,
            date_range: params.date_range,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load analysis results:", e);
      setSingleResults([]);
      setSeriesResults(null);
    }
  }, []);

  // Format time series data for charts
  const seriesChartData = useMemo(() => {
    if (!seriesResults?.series) return [];

    // pull anomalies & breakpoints from the top‐level payload
    const { dates, mean: avg_NDVI } = seriesResults.series;
    const anomalies = seriesResults.anomalies || [];
    const breakpoints = seriesResults.breakpoints || [];

    return dates.map((date, idx) => {
      // Calculate a trend line using simple moving average
      const windowSize = 3;
      let trend = null;
      if (idx >= windowSize - 1) {
        const window = avg_NDVI.slice(idx - windowSize + 1, idx + 1);
        trend = window.reduce((sum, val) => sum + val, 0) / windowSize;
      }

      // Mark anomalies and breakpoints
      const isAnomaly = anomalies.includes(idx);
      const isBreakpoint = breakpoints.includes(idx);

      return {
        date,
        ndvi: avg_NDVI[idx],
        trend,
        isAnomaly,
        isBreakpoint,
      };
    });
  }, [seriesResults]);

  // Filter time series data based on selected time range
  const filteredSeriesData = useMemo(() => {
    if (!seriesChartData.length) return [];

    switch (timeRange) {
      case "1m":
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return seriesChartData.filter((d) => new Date(d.date) >= oneMonthAgo);
      case "3m":
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return seriesChartData.filter(
          (d) => new Date(d.date) >= threeMonthsAgo
        );
      case "6m":
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return seriesChartData.filter((d) => new Date(d.date) >= sixMonthsAgo);
      default:
        return seriesChartData;
    }
  }, [seriesChartData, timeRange]);

  // Calculate key statistics for the dashboard
  const stats = useMemo(() => {
    if (!singleResults.length) return null;

    const latestResult = singleResults[singleResults.length - 1];
    const prevResult =
      singleResults.length > 1 ? singleResults[singleResults.length - 2] : null;

    const ndviChange = prevResult
      ? ((latestResult.stats.NDVI_mean - prevResult.stats.NDVI_mean) /
          prevResult.stats.NDVI_mean) *
        100
      : null;

    return {
      currentNdvi: latestResult.stats.NDVI_mean.toFixed(3),
      ndviHealth: calculateHealth(latestResult.stats.NDVI_mean),
      ndviRange: `${latestResult.stats.NDVI_min.toFixed(
        2
      )} - ${latestResult.stats.NDVI_max.toFixed(2)}`,
      ndviChange,
      analysisCount: singleResults.length,
      lastUpdated: latestResult.date,
    };
  }, [singleResults]);

  // Format data for NDVI distribution chart
  const distributionData = useMemo(() => {
    if (!selectedImage?.distribution) return [];

    const { bucketMeans, histogram } = selectedImage.distribution;
    if (!bucketMeans || !histogram) return [];

    const maxCount = Math.max(...histogram); // find highest count
    const scaleFactor = maxCount < 10 ? 10 : 1; // if all values are small, scale them

    return bucketMeans.map((mean, idx) => {
      const originalCount = Number(histogram[idx]) || 0;
      return {
        ndvi: parseFloat(mean.toFixed(2)),
        count: originalCount * scaleFactor, // scale for visibility
        trueCount: originalCount, // store original for tooltip if needed
        range:
          mean < 0.2
            ? "very-low"
            : mean < 0.4
            ? "low"
            : mean < 0.6
            ? "moderate"
            : mean < 0.8
            ? "high"
            : "very-high",
      };
    });
  }, [selectedImage]);

  // Group NDVI values into qualitative ranges for the distribution chart
  const ndviColorRanges = {
    "very-low": "#e57373", // Red - poor vegetation
    low: "#ffb74d", // Orange - below average vegetation
    moderate: "#fff176", // Yellow - average vegetation
    high: "#81c784", // Light green - good vegetation
    "very-high": "#2e7d32", // Dark green - excellent vegetation
  };

  // Generate data for comparison chart
  const comparisonData = useMemo(() => {
    return singleResults.map((result) => ({
      date: result.date,
      mean: result.stats.NDVI_mean,
      min: result.stats.NDVI_min,
      max: result.stats.NDVI_max,
      range: result.stats.NDVI_max - result.stats.NDVI_min,
      stdDev: result.stats.NDVI_stdDev,
    }));
  }, [singleResults]);

  // Summary text based on the data
  const generateSummary = () => {
    if (!stats || !seriesResults) return "Insufficient data for analysis.";

    const health = stats.ndviHealth;
    const trend = stats.ndviChange;

    let trendText = "";
    if (trend !== null) {
      trendText =
        trend > 5
          ? "showing significant improvement"
          : trend > 1
          ? "slightly improving"
          : trend < -5
          ? "declining substantially"
          : trend < -1
          ? "slightly declining"
          : "remaining stable";
    }

    // ← pull from top‐level instead of seriesResults.series
    const anomalyCount = (seriesResults.anomalies || []).length;
    const breakpointCount = (seriesResults.breakpoints || []).length;

    const anomalyText = anomalyCount
      ? `detected ${anomalyCount} anomalies`
      : "no anomalies detected";
    const breakpointText = breakpointCount
      ? `identified ${breakpointCount} significant change points`
      : "no significant change points identified";

    return `Vegetation health is currently ${health.toLowerCase()}, ${trendText}. Time series analysis has ${anomalyText} and ${breakpointText} in the monitored period.`;
  };

  return (
    <main className="bg-gray-50 dark:bg-slate-900 min-h-screen pb-12">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-green-700 to-green-500 dark:from-green-800 dark:to-green-600 text-white py-8 px-4 mb-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Agriculture Monitoring Dashboard
          </h1>
          <p className="text-green-100 max-w-3xl">
            Real-time NDVI analysis and vegetation health monitoring system
            powered by satellite imagery
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4">
        {singleResults.length === 0 && !seriesResults ? (
          <div className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-md text-center">
            <FiInfo className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-300">
              No analysis results found. Please analyze some agricultural data
              first.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Overview Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Current NDVI"
                  value={stats.currentNdvi}
                  icon={<FiMapPin className="text-green-500" />}
                  color="bg-green-100 dark:bg-green-900"
                  change={stats.ndviChange}
                />
                <StatCard
                  title="Vegetation Health"
                  value={stats.ndviHealth}
                  icon={<FiInfo className="text-blue-500" />}
                  color="bg-blue-100 dark:bg-blue-900"
                />
                <StatCard
                  title="NDVI Range"
                  value={stats.ndviRange}
                  icon={<FiFilter className="text-purple-500" />}
                  color="bg-purple-100 dark:bg-purple-900"
                />
                <StatCard
                  title="Last Updated"
                  value={stats.lastUpdated}
                  icon={<FiCalendar className="text-yellow-500" />}
                  color="bg-yellow-100 dark:bg-yellow-900"
                  secondary={`${stats.analysisCount} analyses`}
                />
              </div>
            )}

            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Analysis Summary
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {generateSummary()}
              </p>
            </div>

            {/* Report Download */}
            <div className="flex justify-end mb-6">
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                onClick={generateReport}
              >
                <FiDownload className="inline-block mr-2" />
                Generate Full Agri Report
              </button>
            </div>

            {/* Generated report text */}
            {reportText && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">
                  Generated Report
                </h2>
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {reportText}
                </pre>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
              <button
                className={`py-4 px-6 ${
                  activeTab === "overview"
                    ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`py-4 px-6 ${
                  activeTab === "timeseries"
                    ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("timeseries")}
              >
                Time Series
              </button>
              <button
                className={`py-4 px-6 ${
                  activeTab === "distribution"
                    ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("distribution")}
              >
                Distribution
              </button>
              <button
                className={`py-4 px-6 ${
                  activeTab === "images"
                    ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("images")}
              >
                Images
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <>
                  {/* Main NDVI Time Series Chart */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                      NDVI Trends Over Time
                    </h2>
                    <div className="h-72">
                      <ResponsiveContainer>
                        <ComposedChart
                          data={comparisonData}
                          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis
                            domain={[0, 1]}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) => v.toFixed(1)}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="range"
                            fill="rgba(22, 163, 74, 0.1)"
                            stroke="transparent"
                            name="Range"
                          />
                          <Line
                            type="monotone"
                            dataKey="min"
                            stroke="#9ca3af"
                            dot={{ r: 2 }}
                            strokeWidth={1.5}
                            name="Min"
                          />
                          <Line
                            type="monotone"
                            dataKey="mean"
                            stroke="#16A34A"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Mean"
                          />
                          <Line
                            type="monotone"
                            dataKey="max"
                            stroke="#15803d"
                            dot={{ r: 2 }}
                            strokeWidth={1.5}
                            name="Max"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Statistical Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Standard Deviation Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                        NDVI Variability
                      </h2>
                      <div className="h-64">
                        <ResponsiveContainer>
                          <BarChart data={comparisonData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.2}
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => v.toFixed(2)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                              dataKey="stdDev"
                              name="Standard Deviation"
                              fill="#4ADE80"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* NDVI Scatter Plot */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                        NDVI Range vs Mean
                      </h2>
                      <div className="h-64">
                        <ResponsiveContainer>
                          <ScatterChart
                            margin={{
                              top: 20,
                              right: 20,
                              bottom: 10,
                              left: 10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.2}
                            />
                            <XAxis
                              type="number"
                              dataKey="mean"
                              name="Mean NDVI"
                              domain={[0, 1]}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => v.toFixed(1)}
                            />
                            <YAxis
                              type="number"
                              dataKey="range"
                              name="NDVI Range"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => v.toFixed(1)}
                            />
                            <ZAxis
                              type="number"
                              dataKey="stdDev"
                              range={[40, 400]}
                              name="StdDev"
                            />
                            <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ strokeDasharray: "3 3" }}
                            />
                            <Scatter
                              name="NDVI Distribution"
                              data={comparisonData}
                              fill="#16A34A"
                              shape="circle"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Time Series Tab */}
              {activeTab === "timeseries" && (
                <>
                  {/* Time Range Filter */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-6 flex items-center">
                    <span className="text-gray-700 dark:text-gray-300 mr-4">
                      Time range:
                    </span>
                    <div className="flex space-x-2">
                      {["all", "6m", "3m", "1m"].map((range) => (
                        <button
                          key={range}
                          className={`px-3 py-1 rounded ${
                            timeRange === range
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                          }`}
                          onClick={() => setTimeRange(range)}
                        >
                          {range === "all" ? "All time" : range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {seriesResults ? (
                    <>
                      {/* Time Series Chart with Anomalies */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                          NDVI Time Series with Anomalies
                        </h2>
                        <div className="h-72">
                          <ResponsiveContainer>
                            <ComposedChart
                              data={filteredSeriesData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 20,
                              }}
                              onMouseMove={(e) => {
                                if (e && e.activeTooltipIndex !== undefined) {
                                  setHoveredPoint(
                                    filteredSeriesData[e.activeTooltipIndex]
                                  );
                                }
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                opacity={0.2}
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={50}
                              />
                              <YAxis
                                domain={[0, 1]}
                                tick={{ fontSize: 12 }}
                                tickFormatter={(v) => v.toFixed(1)}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />

                              {/* Main NDVI line */}
                              <Line
                                type="monotone"
                                dataKey="ndvi"
                                stroke="#16A34A"
                                strokeWidth={2}
                                name="NDVI"
                                dot={(props) => {
                                  // grab index so we can build unique keys
                                  const { cx, cy, payload, index } = props;

                                  if (
                                    payload.isAnomaly &&
                                    payload.isBreakpoint
                                  ) {
                                    return (
                                      <path
                                        key={`pt-${index}-both`}
                                        d="M12 0 L14.6 5.2 H20 L15.6 8.3 L17.4 14 L12 10.8 L6.6 14 L8.4 8.3 L4 5.2 H9.4 L12 0 Z"
                                        transform={`translate(${cx - 9}, ${
                                          cy - 9
                                        }) scale(0.8)`}
                                        fill="#DC2626"
                                        stroke="#991B1B"
                                        strokeWidth="1"
                                      />
                                    );
                                  }
                                  if (payload.isAnomaly) {
                                    return (
                                      <circle
                                        key={`pt-${index}-anom`}
                                        cx={cx}
                                        cy={cy}
                                        r={6}
                                        fill="#DC2626"
                                        stroke="#991B1B"
                                        strokeWidth="1"
                                      />
                                    );
                                  }
                                  if (payload.isBreakpoint) {
                                    return (
                                      <rect
                                        key={`pt-${index}-break`}
                                        x={cx - 5}
                                        y={cy - 5}
                                        width={10}
                                        height={10}
                                        fill="#9333EA"
                                        stroke="#6B21A8"
                                        strokeWidth="1"
                                      />
                                    );
                                  }
                                  // regular points
                                  return (
                                    <circle
                                      key={`pt-${index}-norm`}
                                      cx={cx}
                                      cy={cy}
                                      r={4}
                                      fill="#16A34A"
                                      stroke="#16A34A"
                                    />
                                  );
                                }}
                              />

                              {/* Trend line */}
                              <Line
                                type="monotone"
                                dataKey="trend"
                                stroke="#9CA3AF"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                name="Trend"
                              />

                              {/* Add reference lines for breakpoints */}
                              {filteredSeriesData
                                .filter((d) => d.isBreakpoint)
                                .map((d, i) => (
                                  <ReferenceLine
                                    key={i}
                                    x={d.date}
                                    stroke="#9333EA"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                    label={{
                                      value: "Change Point",
                                      position: "insideTopRight",
                                      fill: "#9333EA",
                                      fontSize: 12,
                                    }}
                                  />
                                ))}

                              <Brush
                                dataKey="date"
                                height={20}
                                stroke="#16A34A"
                                fill="rgba(22, 163, 74, 0.1)"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Legend for special points */}
                        <div className="flex flex-wrap mt-4 text-sm text-gray-600 dark:text-gray-400 gap-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
                            <span>Anomaly</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-600 mr-2"></div>
                            <span>Breakpoint</span>
                          </div>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 text-center font-bold text-red-600 border-red-600 border"
                              style={{
                                transformOrigin: "center",
                                transform: "rotate(45deg)",
                              }}
                            >
                              ★
                            </div>
                            <span className="ml-2">Both</span>
                          </div>
                        </div>
                      </div>

                      {/* Anomaly Detail View */}
                      {hoveredPoint && hoveredPoint.isAnomaly && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-6 border-l-4 border-red-500">
                          <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                            Anomaly Detected: {hoveredPoint.date}
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 mb-4">
                            This point shows an unusual NDVI value of{" "}
                            {hoveredPoint.ndvi.toFixed(4)}, which deviates
                            significantly from the expected trend.
                            {hoveredPoint.isBreakpoint &&
                              " This also marks a significant change point in the time series."}
                          </p>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p>Possible causes:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                              <li>
                                Sudden vegetation change (drought, harvest,
                                replanting)
                              </li>
                              <li>Atmospheric interference (clouds, haze)</li>
                              <li>
                                Seasonal variation outside normal parameters
                              </li>
                              <li>
                                Land use change or agricultural practice shift
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Breakpoint Detail View */}
                      {hoveredPoint &&
                        !hoveredPoint.isAnomaly &&
                        hoveredPoint.isBreakpoint && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-6 border-l-4 border-purple-500">
                            <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-400">
                              Change Point Detected: {hoveredPoint.date}
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              This marks a significant shift in the vegetation
                              pattern, indicating a potential change in land
                              use, growing season transition, or response to
                              environmental factors.
                            </p>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-md text-center">
                      <FiInfo className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-xl text-gray-600 dark:text-gray-300">
                        No time series data available. Please run a complete
                        analysis first.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Distribution Tab */}
              {activeTab === "distribution" && (
                <>
                  {/* Image Selector */}
                  {singleResults.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Image:
                      </label>
                      <select
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200"
                        value={selectedImage?.dataset_id || ""}
                        onChange={(e) => {
                          const selected = singleResults.find(
                            (r) => r.dataset_id === e.target.value
                          );
                          if (selected) setSelectedImage(selected);
                        }}
                      >
                        {singleResults.map((result) => (
                          <option
                            key={result.dataset_id}
                            value={result.dataset_id}
                          >
                            {result.date} - {result.dataset_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedImage ? (
                    <>
                      {/* NDVI Distribution Chart */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                          NDVI Distribution
                        </h2>
                        <div className="h-72">
                          <ResponsiveContainer>
                            <BarChart data={distributionData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                opacity={0.2}
                              />
                              <XAxis
                                dataKey="ndvi"
                                tick={{ fontSize: 12 }}
                                label={{
                                  value: "NDVI Value",
                                  position: "insideBottom",
                                  offset: -5,
                                }}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                label={{
                                  value: "Pixel Count",
                                  angle: -90,
                                  position: "insideLeft",
                                }}
                                domain={[0, "dataMax + 1"]} // ensures bars are visible even for small counts
                                allowDecimals={false}
                              />

                              <Tooltip content={<CustomTooltip />} />
                              <Bar
                                dataKey="count"
                                name="Pixel Count"
                                minPointSize={1}
                              >
                                {distributionData.map((entry, index) => (
                                  <Cell
                                    key={index}
                                    fill={ndviColorRanges[entry.range]}
                                  />
                                ))}
                              </Bar>

                              {/* Add reference lines for important thresholds */}
                              <ReferenceLine
                                x="0.20"
                                stroke="#e57373"
                                strokeDasharray="3 3"
                                label={{
                                  value: "Low",
                                  position: "top",
                                  fill: "#e57373",
                                  fontSize: 10,
                                }}
                              />
                              <ReferenceLine
                                x="0.60"
                                stroke="#2e7d32"
                                strokeDasharray="3 3"
                                label={{
                                  value: "High",
                                  position: "top",
                                  fill: "#2e7d32",
                                  fontSize: 10,
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Color legend */}
                        <div className="flex flex-wrap mt-4 text-sm text-gray-600 dark:text-gray-400 gap-4">
                          {Object.entries(ndviColorRanges).map(
                            ([range, color]) => (
                              <div key={range} className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: color }}
                                ></div>
                                <span>
                                  {range === "very-low"
                                    ? "Very Low (0.0-0.2)"
                                    : range === "low"
                                    ? "Low (0.2-0.4)"
                                    : range === "moderate"
                                    ? "Moderate (0.4-0.6)"
                                    : range === "high"
                                    ? "High (0.6-0.8)"
                                    : "Very High (0.8-1.0)"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Percentile Chart */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                          NDVI Percentile Distribution
                        </h2>
                        {selectedImage.percentiles ? (
                          <div className="h-32">
                            <ResponsiveContainer>
                              <ComposedChart
                                layout="vertical"
                                data={[
                                  {
                                    name: "Percentiles",
                                    min: selectedImage.stats.NDVI_min,
                                    p25: selectedImage.percentiles.p25,
                                    median: selectedImage.percentiles.p50,
                                    p75: selectedImage.percentiles.p75,
                                    max: selectedImage.stats.NDVI_max,
                                  },
                                ]}
                                margin={{
                                  top: 20,
                                  right: 30,
                                  left: 20,
                                  bottom: 5,
                                }}
                              >
                                <XAxis type="number" domain={[0, 1]} />
                                <YAxis
                                  dataKey="name"
                                  type="category"
                                  scale="band"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" />
                                <Bar dataKey="min" fill="#e57373" name="Min" />
                                <Bar
                                  dataKey="p25"
                                  fill="#ffb74d"
                                  name="25th Percentile"
                                />
                                <Bar
                                  dataKey="median"
                                  fill="#fff176"
                                  name="Median"
                                />
                                <Bar
                                  dataKey="p75"
                                  fill="#81c784"
                                  name="75th Percentile"
                                />
                                <Bar dataKey="max" fill="#2e7d32" name="Max" />

                                <ReferenceLine
                                  x={selectedImage.stats.NDVI_mean}
                                  stroke="#000"
                                  strokeDasharray="3 3"
                                  label="Mean"
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-center text-gray-600 dark:text-gray-400">
                            Percentile data not available for this image.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-md text-center">
                      <FiInfo className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-xl text-gray-600 dark:text-gray-300">
                        No image selected. Please select an image to view its
                        distribution.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Images Tab */}
              {activeTab === "images" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {singleResults.map((result) => (
                      <div
                        key={result.dataset_id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Image with overlay showing health */}
                        <div
                          className="relative aspect-video cursor-pointer"
                          onClick={() => {
                            setSelectedImage(result);
                            setIsFullscreen(true);
                          }}
                        >
                          {result.assets?.thumb ? (
                            <img
                              src={result.assets.thumb}
                              alt="NDVI visualization"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400">
                                No image
                              </span>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs py-1 px-2 rounded">
                            {calculateHealth(result.stats.NDVI_mean)}
                          </div>
                        </div>

                        {/* Image metadata */}
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                              {result.dataset_id}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {result.date}
                            </span>
                          </div>

                          <div className="flex flex-col space-y-1 mb-4 text-xs text-gray-700 dark:text-gray-300">
                            <div className="flex justify-between">
                              <span>Mean NDVI:</span>
                              <span className="font-medium">
                                {result.stats.NDVI_mean.toFixed(4)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Range:</span>
                              <span className="font-medium">
                                {result.stats.NDVI_min.toFixed(2)} -{" "}
                                {result.stats.NDVI_max.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>StdDev:</span>
                              <span className="font-medium">
                                {result.stats.NDVI_stdDev.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg transition"
                              onClick={() => {
                                setSelectedImage(result);
                                setActiveTab("distribution");
                              }}
                            >
                              <FiInfo /> View Details
                            </button>

                            {(result.assets?.ndvi || result.assets?.data) && (
                              <a
                                href={
                                  result.assets?.ndvi || result.assets?.data
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition"
                              >
                                <FiDownload /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {singleResults.length === 0 && (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-md text-center">
                      <FiInfo className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-xl text-gray-600 dark:text-gray-300">
                        No images available. Please analyze some agricultural
                        data first.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedImage.dataset_id}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setIsFullscreen(false)}
              >
                ✕
              </button>
            </div>

            {selectedImage.assets?.thumb ? (
              <div className="mb-6">
                <img
                  src={selectedImage.assets.thumb}
                  alt="NDVI visualization"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-6 rounded-lg">
                <span className="text-gray-500 dark:text-gray-400">
                  No image available
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  NDVI Statistics
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Mean:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedImage.stats.NDVI_mean.toFixed(4)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Min:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedImage.stats.NDVI_min.toFixed(4)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Max:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedImage.stats.NDVI_max.toFixed(4)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      StdDev:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedImage.stats.NDVI_stdDev.toFixed(4)}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Vegetation Health Assessment
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {calculateHealth(selectedImage.stats.NDVI_mean)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Date:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedImage.date}
                    </span>
                  </div>
                  {selectedImage.percentiles && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Median NDVI:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedImage.percentiles.p50.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          IQR:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {(
                            selectedImage.percentiles.p75 -
                            selectedImage.percentiles.p25
                          ).toFixed(4)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {(selectedImage.assets?.ndvi || selectedImage.assets?.data) && (
              <a
                href={selectedImage.assets?.ndvi || selectedImage.assets?.data}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition"
              >
                <FiDownload /> Download Full Resolution GeoTIFF
              </a>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .inner-shadow {
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        @media (prefers-color-scheme: dark) {
          html :global(body) {
            background: #0f172a;
            color: #e2e8f0;
          }
        }
      `}</style>
    </main>
  );
};

export default AgricultureHotspotDashboardPage;
