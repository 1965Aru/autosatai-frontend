"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  FaLeaf,
  FaCalendarAlt,
  FaChartLine,
  FaTable,
  FaExclamationTriangle,
  FaPrint,
  FaEnvelope,
} from "react-icons/fa";
import { format } from "date-fns";
import axios from "axios";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://autosatai-backend.onrender.com";

// ensure all axios calls use your backend URL
axios.defaults.baseURL = API_BASE;

export default function AgriReportPage() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    error: "",
    report: null,
  });

  useEffect(() => {
    // Instead of re-posting, pull the full report JSON from localStorage
    const stored = localStorage.getItem("agriReportJSON");
    if (stored) {
      try {
        const rpt = JSON.parse(stored);
        setState({ loading: false, error: "", report: rpt });
      } catch (e) {
        setState({
          loading: false,
          error: "Failed to parse stored agriculture report.",
          report: null,
        });
      }
    } else {
      setState({
        loading: false,
        error:
          "No agriculture report found. Please generate the report first on the dashboard.",
        report: null,
      });
    }
  }, []); // no longer depends on router or posts

  const { loading, error, report } = state;

  if (loading)
    return <div className="p-8 text-center">🔄 Generating report…</div>;
  if (error)
    return (
      <div className="p-8 text-center text-red-600">
        <FaExclamationTriangle className="inline mr-2" />
        {error}
      </div>
    );

  // Destructure with safe defaults
  const {
    title = "",
    generated_at = "",
    metadata = {},
    metrics = [],
    timeseries = { dates: [], avg_ndvi: [], max_ndvi: [] },
    histogram = { bins: [], counts: [] },
    anomalies: anomalyList = [],
    spatial_summary = "",
    report: sections = {},
  } = report || {};

  // Extract our five sections
  const {
    executive_summary = "",
    key_findings = [],
    methodology = "",
    spatial_summary: spatial_section = "",
    recommendations = "",
  } = sections;

  // safe format helper
  const safeFormat = (dateStr, fmt) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return format(d, fmt);
    } catch {}
    return dateStr || "";
  };

  const handlePrint = () => window.print();
  const handleEmail = () => {
    const body = encodeURIComponent(JSON.stringify(report, null, 2));
    window.location.href = `mailto:?subject=Agriculture Report&body=${body}`;
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <FaLeaf className="mr-2 text-green-600" /> {title}
        </h1>
        <div className="space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            <FaPrint className="inline mr-1" />
            Print
          </button>
          <button
            onClick={handleEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FaEnvelope className="inline mr-1" />
            Email
          </button>
        </div>
      </header>

      <p className="text-sm text-gray-500">
        Generated: {safeFormat(generated_at, "PPPpp")} &nbsp;•&nbsp;
        Location: {metadata.location || "Unknown"} &nbsp;•&nbsp;
        Period: {safeFormat(metadata.date_range?.from, "MMM d, yyyy")} –{" "}
        {safeFormat(metadata.date_range?.to, "MMM d, yyyy")} &nbsp;•&nbsp;
        Datasets: {metadata.datasets_count ?? 0}
      </p>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-2xl font-semibold">{m.value}</p>
          </div>
        ))}
      </section>

      {/* Executive Summary */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Executive Summary</h2>
        <p className="bg-white p-4 rounded shadow">{executive_summary}</p>
      </section>

      {/* Key Findings */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Key Findings</h2>
        <ul className="list-disc pl-5 bg-white p-4 rounded shadow space-y-1">
          {key_findings.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </section>

      {/* Methodology */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Methodology</h2>
        <p className="bg-white p-4 rounded shadow">{methodology}</p>
      </section>

      {/* NDVI Over Time */}
      <section>
        <h2 className="text-xl font-semibold flex items-center mb-2">
          <FaChartLine className="mr-2" /> NDVI Over Time
        </h2>
        <Plot
          data={[
            {
              x: timeseries.dates,
              y: timeseries.avg_ndvi,
              mode: "lines+markers",
              name: "Avg NDVI",
            },
            {
              x: timeseries.dates,
              y: timeseries.max_ndvi,
              mode: "lines",
              name: "Max NDVI",
            },
          ]}
          layout={{
            margin: { t: 30, b: 40, l: 50, r: 20 },
            xaxis: { title: "Date" },
            yaxis: { title: "NDVI" },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(255,255,255,0.9)",
          }}
          style={{ width: "100%", height: 300 }}
        />
      </section>

      {/* NDVI Distribution */}
      <section>
        <h2 className="text-xl font-semibold flex items-center mb-2">
          <FaTable className="mr-2" /> NDVI Distribution
        </h2>
        <Plot
          data={[
            {
              x: histogram.bins,
              y: histogram.counts,
              type: "bar",
              marker: { color: "rgba(34,197,94,0.7)" },
            },
          ]}
          layout={{
            margin: { t: 30, b: 40, l: 50, r: 20 },
            xaxis: { title: "NDVI Value" },
            yaxis: { title: "Frequency" },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(255,255,255,0.9)",
          }}
          style={{ width: "100%", height: 300 }}
        />
      </section>

      {/* Detected Anomalies */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Detected Anomalies</h2>
        <ul className="list-disc pl-5 space-y-1 bg-white p-4 rounded shadow">
          {anomalyList.map((a, i) => (
            <li key={i}>
              <span className="font-medium">
                {safeFormat(a.date, "MMM d, yyyy")}:
              </span>{" "}
              {a.description}
            </li>
          ))}
        </ul>
      </section>

      {/* Spatial Summary */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Spatial Summary</h2>
        <p className="bg-white p-4 rounded shadow">
          {spatial_section || "No spatial summary available."}
        </p>
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Recommendations</h2>
        <p className="bg-white p-4 rounded shadow">{recommendations}</p>
      </section>
    </main>
  );
}
