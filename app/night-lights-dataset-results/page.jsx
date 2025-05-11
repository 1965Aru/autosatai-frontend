"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaChartLine } from "react-icons/fa";
import { FiDownload, FiExternalLink } from "react-icons/fi";

// Ensure this points to your backend; you can override via NEXT_PUBLIC_API_BASE_URL in .env.local
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const DatasetResultsPage = () => {
  const [datasets, setDatasets] = useState([]);
  const [outputFormat, setOutputFormat] = useState("");
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("datasets");
      if (raw) setDatasets(JSON.parse(raw));
      const fmt = localStorage.getItem("outputFormat");
      if (fmt) setOutputFormat(fmt);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAnalysisChange = (id, v) =>
    setSelected((p) => ({ ...p, [id]: v }));

  const downloadOne = (ds) => {
    const url = ds.assets?.data;
    if (!url) return alert("No download URL available for this dataset.");
    window.open(
      outputFormat
        ? `${url}&format=${encodeURIComponent(outputFormat)}`
        : url,
      "_blank"
    );
  };

  const runOne = async (ds) => {
    const analysis = selected[ds.id];
    if (!analysis) return alert("Choose an analysis first!");
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify({
          dataset_id: ds.id,
          analysis,
          assets: { data: ds.assets.data },
        }),
      });

      if (!res.ok) {
        let errMsg = `Request failed with status ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();

      // Load existing results, dedupe, cap, and handle quota
      const rawPrev = localStorage.getItem("analysisResults") || "[]";
      let prev = JSON.parse(rawPrev);
      // remove any existing with same dataset_id
      prev = prev.filter((r) => r.dataset_id !== result.dataset_id);
      // append new
      let updated = [...prev, result];
      // cap to last N
      const MAX_RESULTS = 20;
      if (updated.length > MAX_RESULTS) {
        updated = updated.slice(updated.length - MAX_RESULTS);
      }
      // try storing
      try {
        localStorage.setItem("analysisResults", JSON.stringify(updated));
      } catch (e) {
        const isQuotaError =
          e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          e.code === 22;
        if (isQuotaError) {
          // evict oldest and retry once
          const evicted = updated.slice(1);
          try {
            localStorage.setItem(
              "analysisResults",
              JSON.stringify(evicted)
            );
          } catch {
            // if still fails, bail silently
          }
        } else {
          throw e;
        }
      }

      router.push("/night-lights-dashboard");
    } catch (err) {
      console.error("Analyse request failed:", err);
      alert(`Analyse request failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const runAll = async () => {
    if (datasets.length === 0) {
      alert("No datasets to analyse.");
      return;
    }
    setBusy(true);

    try {
      // build the full jobs array
      const jobs = datasets.map((ds) => ({
        dataset_id: ds.id,
        analysis: selected[ds.id] || "night_lights",
        assets: { data: ds.assets.data },
      }));

      const res = await fetch(`${API_BASE}/api/analyse-all-nights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify({ jobs }),
      });

      if (!res.ok) {
        let errMsg = `Batch request failed with status ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      // assume backend returns { results: [...] }
      const payload = await res.json();
      const resultsArray = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload)
        ? payload
        : [];

      // load existing, merge, dedupe, cap
      const rawPrev = localStorage.getItem("analysisResults") || "[]";
      let prev = JSON.parse(rawPrev);
      const MAX_RESULTS = 20;

      resultsArray.forEach((result) => {
        prev = prev.filter((r) => r.dataset_id !== result.dataset_id);
        prev.push(result);
      });

      if (prev.length > MAX_RESULTS) {
        prev = prev.slice(prev.length - MAX_RESULTS);
      }

      // store with quota handling
      try {
        localStorage.setItem("analysisResults", JSON.stringify(prev));
      } catch (e) {
        const isQuotaError =
          e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          e.code === 22;
        if (isQuotaError) {
          const evicted = prev.slice(1);
          try {
            localStorage.setItem(
              "analysisResults",
              JSON.stringify(evicted)
            );
          } catch {
            // bail silently
          }
        } else {
          throw e;
        }
      }

      router.push("/night-lights-dashboard");
    } catch (err) {
      console.error("Batch analyse failed:", err);
      alert(`Batch analyse failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const card = (d, i) => (
    <li
      key={d.id}
      style={{ animationDelay: `${i * 60}ms` }}
      className="card fade border border-violet-300/50 dark:border-violet-400/20 bg-white/80 dark:bg-slate-800/70 backdrop-blur-lg p-5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-[2px] transition-all"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">
            {d.id}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {new Date(d.datetime).toLocaleString()}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {d.lat.toFixed(4)}, {d.lon.toFixed(4)}
          </p>
        </div>

        {d.assets?.thumb && (
          <a
            href={d.assets.thumb}
            target="_blank"
            rel="noopener noreferrer"
            className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm"
          >
            <img
              src={d.assets.thumb}
              alt="thumbnail"
              className="w-full h-full object-cover"
            />
          </a>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={selected[d.id] || ""}
          onChange={(e) => handleAnalysisChange(d.id, e.target.value)}
          className="px-2.5 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">— analysis —</option>
          <option value="night_lights">Night-time Lights</option>
        </select>

        <button
          onClick={() => runOne(d)}
          disabled={!selected[d.id] || busy}
          className="px-3 py-1 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-[.98] text-white disabled:opacity-40 transition-all"
        >
          {busy ? "Analysing..." : "Run"}
        </button>

        <button
          onClick={() => downloadOne(d)}
          className="px-3 py-1 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white flex items-center gap-1 transition-all"
        >
          <FiDownload /> Download
        </button>

        {!d.assets?.thumb && d.assets?.data && (
          <a
            href={d.assets.data}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-violet-600 dark:text-violet-400 text-xs hover:underline"
          >
            preview <FiExternalLink />
          </a>
        )}
      </div>
    </li>
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent select-none">
        Fetched Datasets
      </h1>

      {datasets.length === 0 ? (
        <p className="text-center text-lg text-slate-600 dark:text-slate-300">
          No datasets found.
        </p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
            <label className="w-full sm:w-64">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Download format
              </span>
              <select
                value={outputFormat}
                onChange={(e) => {
                  setOutputFormat(e.target.value);
                  localStorage.setItem("outputFormat", e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">…choose…</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="geotiff">GeoTIFF</option>
                <option value="shp">Shapefile</option>
              </select>
            </label>

            <button
              onClick={runAll}
              disabled={busy}
              className="relative inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:to-fuchsia-700 active:scale-[.97] disabled:opacity-40 transition-transform"
            >
              {busy ? (
                <>
                  <span className="loader border-white/50" />
                  Processing…
                </>
              ) : (
                <>
                  <FaChartLine /> Analyse ALL
                </>
              )}
            </button>
          </div>

          <ul className="space-y-6">{datasets.map(card)}</ul>
        </>
      )}

      <style jsx>{`
        .card {
          opacity: 0;
          transform: translateY(10px);
          animation: rise 0.45s forwards ease;
        }
        @keyframes rise {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .loader {
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          border: 2px solid;
          border-top-color: transparent;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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

export default DatasetResultsPage;
