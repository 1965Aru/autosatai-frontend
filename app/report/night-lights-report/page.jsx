"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  FaMoon,
  FaPrint,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileAlt,
  FaListUl,
  FaChartBar
} from "react-icons/fa";
import { format } from "date-fns";
import axios from "axios";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://autosatai-backend-r4ol.onrender.com";

// ensure all axios calls point at your backend
axios.defaults.baseURL = API_BASE;

export default function NightLightsReportPage() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    error: "",
    report: null,
  });

  useEffect(() => {
    const datasets = JSON.parse(localStorage.getItem("datasets") || "[]");
    const analysisResults = JSON
      .parse(localStorage.getItem("analysisResults") || "[]")
      .filter((r) => r.dataset_id.startsWith("night_lights"));

    if (!datasets.length || !analysisResults.length) {
      setState({
        loading: false,
        error:
          "No night-lights data found. Please fetch datasets and run analysis first.",
        report: null,
      });
      return;
    }

    axios
      .post("/api/report/night-lights", { datasets, analysisResults })
      .then((res) => {
        const allReports = Array.isArray(res.data.reports)
          ? res.data.reports
          : [];
        if (!allReports.length)
          throw new Error("No reports returned from server");
        setState({ loading: false, error: "", report: allReports[0] });
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message;
        setState({ loading: false, error: msg, report: null });
      });
  }, []);

  const { loading, error, report } = state;
  if (loading)
    return <div className="p-8 text-center">🔄 Generating report…</div>;
  if (error)
    return (
      <div className="p-8 text-center text-red-600">
        <FaExclamationTriangle className="inline mr-1" /> {error}
      </div>
    );

  // top-level fields
  const {
    title,
    generated_at,
    metadata,
    kpis,
    series,
    anomalies,
  } = report;

  // narrative sections
  const {
    executive_summary,
    key_findings = [],
    methodology,
    spatial_summary,
    recommendations,
  } = report.report || {};

  const handlePrint = () => window.print();
  const handleEmail = () => {
    const body = encodeURIComponent(JSON.stringify(report, null, 2));
    window.location.href = `mailto:?subject=Night Lights Report&body=${body}`;
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <FaMoon className="mr-2 text-purple-600" />
          {title}
        </h1>
        <div className="space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            <FaPrint className="inline mr-1" /> Print
          </button>
          <button
            onClick={handleEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FaEnvelope className="inline mr-1" /> Email
          </button>
        </div>
      </header>

      {/* Metadata */}
      <p className="text-sm text-gray-500">
        Generated: {format(new Date(generated_at), "PPPpp")} &nbsp;•&nbsp;
        Location: {metadata.location} &nbsp;•&nbsp;
        Period:{" "}
        {format(new Date(metadata.date_range.from), "MMM d, yyyy")} –{" "}
        {format(new Date(metadata.date_range.to), "MMM d, yyyy")} &nbsp;•&nbsp;
        Datasets: {metadata.datasets_count}
      </p>

      {/* Narrative Sections */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <FaFileAlt className="mr-2" /> Executive Summary
          </h2>
          <p className="mt-2">{executive_summary}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <FaListUl className="mr-2" /> Key Findings
          </h2>
          <ul className="list-disc list-inside mt-2">
            {key_findings.map((kf, i) => {
              if (typeof kf === "object" && kf !== null) {
                return (
                  <li key={i}>
                    <strong>{kf.metric || "—"}</strong>
                    {kf.significance ? ` — ${kf.significance}` : ""}
                    {kf.trend ? ` (trend: ${kf.trend})` : ""}
                  </li>
                );
              }
              return <li key={i}>{kf}</li>;
            })}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <FaFileAlt className="mr-2" /> Methodology
          </h2>
          <p className="mt-2">{methodology}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <FaFileAlt className="mr-2" /> Spatial Summary
          </h2>
          <p className="mt-2">{spatial_summary || "No spatial summary available."}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <FaFileAlt className="mr-2" /> Recommendations
          </h2>
          <p className="mt-2">{recommendations}</p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <div key={k.name} className="bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500">{k.name}</p>
            <p className="text-2xl font-semibold">
              {k.value}
              {k.suffix || ""}
            </p>
          </div>
        ))}
      </section>

      {/* Radiance & Brightness Chart */}
      <section>
        <h2 className="text-xl font-semibold flex items-center mb-2">
          <FaChartBar className="mr-2" /> Radiance & Bright Area Over Time
        </h2>
        <Plot
          data={[
            {
              x: series.dates,
              y: series.avg_radiance,
              mode: "lines+markers",
              name: "Avg Radiance",
            },
            {
              x: series.dates,
              y: series.pct_bright,
              mode: "lines",
              name: "% Bright Area",
              yaxis: "y2",
            },
          ]}
          layout={{
            margin: { t: 30, b: 40, l: 50, r: 60 },
            xaxis: { title: "Date" },
            yaxis: { title: "Radiance" },
            yaxis2: { title: "% Bright", overlaying: "y", side: "right" },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(255,255,255,0.9)",
          }}
          style={{ width: "100%", height: 350 }}
        />
      </section>

      {/* Anomalies Table */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Anomalies Detected</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="p-2">{format(new Date(a.date), "MMM d, yyyy")}</td>
                <td className="p-2">{a.type}</td>
                <td className="p-2">{a.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
