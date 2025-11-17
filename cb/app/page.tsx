"use client";


import React, { useState, useEffect, useRef } from "react";
import * as docxPreview from "docx-preview";
import { FileText, Eye, X, File, BarChart3 } from "lucide-react";

// TD brand colour
const TD_GREEN = "#007c41";

/* -------------------------------------------------------------------------- */
/*                          INTERFACES / DATA MODELS                          */
/* -------------------------------------------------------------------------- */

interface DeviationRow {
  clause: string;
  baseline: string;
  supplier: string;
  deviation: string;
  riskLevel: "Low" | "Medium" | "High";
  recommendation: string;
  score: number; // clause-level risk score used for distribution bars
}

interface ProjectRow {
  id: string;
  username: string;
  projectName: string;
  createdAt: string; // display string
  updatedAt: string; // display string
  riskLevel: "Low" | "Medium" | "High";
  totalWeightedScore: number;
  supplierDocTitle: string;
  baselineDocTitle: string;
  supplierDocUrl: string; // backend API endpoint returning DOCX bytes
  baselineDocUrl: string; // backend API endpoint returning DOCX bytes
  deviations: DeviationRow[];
}

/* -------------------------------------------------------------------------- */
/*                        SMALL PURE UTILS + DEV TESTS                        */
/* -------------------------------------------------------------------------- */

// Formats the deviation count label for the button.
export function formatDeviationCount(count: number): string {
  if (count <= 0) return "No deviations";
  if (count === 1) return "1 deviation";
  return `${count} deviations`;
}

// Lightweight dev-time checks (not formal tests, but helps avoid regressions)
if (process.env.NODE_ENV === "development") {
  console.assert(formatDeviationCount(0) === "No deviations", "formatDeviationCount(0)");
  console.assert(formatDeviationCount(1) === "1 deviation", "formatDeviationCount(1)");
  console.assert(
    formatDeviationCount(3) === "3 deviations",
    "formatDeviationCount(3) should pluralize"
  );
}

/* -------------------------------------------------------------------------- */
/*                             MOCK SAMPLE PROJECTS                           */
/* -------------------------------------------------------------------------- */

// NOTE: Replace this with data from your backend API.
// For demo: map uploaded DOCX files as if they were served from these endpoints.
//  - /api/documents/supplier-nda -> medium_post_20250406(2).docx
//  - /api/documents/td-baseline-nda -> medium_post_20250403(3).docx

const mockProjects: ProjectRow[] = [
  {
    id: "1",
    username: "TAE7758",
    projectName: "TD NDA – High & Low Changes",
    createdAt: "2025-11-16T23:00:00Z",
    updatedAt: "2025-11-16T23:40:00Z",
    riskLevel: "Medium",
    totalWeightedScore: 2.5,
    supplierDocTitle: "Supplier NDA.docx",
    baselineDocTitle: "TD Baseline NDA.docx",
    supplierDocUrl: "/api/documents/supplier-nda",
    baselineDocUrl: "/api/documents/td-baseline-nda",
    deviations: [
      {
        clause: "Security",
        baseline:
          "If there is any unauthorized handling or loss of, or inability to account for any Confidential Information ...",
        supplier:
          "For as long as any Confidential Information is in the Receiving Party's possession or control, the Receiving Party will protect and maintain the confidentiality and security ...",
        deviation:
          "Security obligations are less prescriptive than TD baseline and do not include explicit incident remediation steps.",
        riskLevel: "High",
        recommendation: "Align security obligations with TD baseline incident handling language.",
        score: 6,
      },
      {
        clause: "Confidentiality",
        baseline:
          "Confidential Information does not include information that is or becomes public, independently developed, or obtained from a third party without breach ...",
        supplier:
          '"Confidential Information" means any non‑public proprietary information ...',
        deviation:
          "Confidentiality carve-outs narrowed; survival period reduced compared to TD baseline.",
        riskLevel: "Medium",
        recommendation: "Restore full TD carve‑outs and minimum survival period.",
        score: 3,
      },
      {
        clause: "General provisions",
        baseline: "Agreement governed by the laws of Ontario, Canada ...",
        supplier: "Agreement governed by the laws of Delaware, USA ...",
        deviation: "Governing law moved away from TD's standard jurisdiction.",
        riskLevel: "Medium",
        recommendation: "Keep Ontario governing law unless approved as an exception.",
        score: 3,
      },
      {
        clause: "Duration & termination",
        baseline: "Either party may terminate for convenience upon 30 days' written notice ...",
        supplier:
          "Supplier may terminate for convenience; TD may terminate only for cause ...",
        deviation: "TD termination for convenience removed.",
        riskLevel: "Low",
        recommendation: "Re‑introduce TD termination for convenience right.",
        score: 1,
      },
    ],
  },
  // Extra mock rows so you can see pagination / sorting behaviour.
  {
    id: "2",
    username: "WYATT12",
    projectName: "OC Demo – Supplier ABC",
    createdAt: "2025-11-14T18:20:00Z",
    updatedAt: "2025-11-14T18:45:00Z",
    riskLevel: "High",
    totalWeightedScore: 3.9,
    supplierDocTitle: "Supplier OC.docx",
    baselineDocTitle: "TD Baseline OC.docx",
    supplierDocUrl: "/api/documents/supplier-oc",
    baselineDocUrl: "/api/documents/td-baseline-oc",
    deviations: [],
  },
  {
    id: "3",
    username: "TAF7337",
    projectName: "New Model Output Test",
    createdAt: "2025-11-13T17:50:00Z",
    updatedAt: "2025-11-13T18:00:00Z",
    riskLevel: "Low",
    totalWeightedScore: 0.7,
    supplierDocTitle: "Supplier Model.docx",
    baselineDocTitle: "TD Baseline Model.docx",
    supplierDocUrl: "/api/documents/supplier-model",
    baselineDocUrl: "/api/documents/td-baseline-model",
    deviations: [],
  },
];

/* -------------------------------------------------------------------------- */
/*                             DOCUMENT VIEWER MODAL                          */
/* -------------------------------------------------------------------------- */

type DocumentViewerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
};

function DocumentViewer({ open, onClose, title, url }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !url || !containerRef.current) return;

    const el = containerRef.current;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch DOCX: ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        el.innerHTML = "";
        await docxPreview.renderAsync(buffer, el);
      } catch (err) {
        console.warn("DOCX preview failed", err);
        el.innerHTML =
          "<p style='color:#b91c1c;font-size:12px'>Document preview is unavailable. Please download and open locally.</p>";
      }
    })();
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-auto shadow-xl relative">
        <button
          className="absolute top-3 right-3 text-gray-700 hover:text-black"
          onClick={onClose}
          aria-label="Close document viewer"
        >
          <X size={18} />
        </button>

        <div className="p-4 border-b flex items-center gap-2 text-sm font-semibold">
          <File size={18} className="text-gray-700" />
          <span>{title}</span>
        </div>

        <div ref={containerRef} className="p-4" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        DEVIATION TABLE + RISK SUMMARY MODAL                */
/* -------------------------------------------------------------------------- */

type DeviationModalProps = {
  open: boolean;
  onClose: () => void;
  deviations: DeviationRow[];
  riskLevel: ProjectRow["riskLevel"];
  totalWeightedScore: number;
};

function DeviationModal({
  open,
  onClose,
  deviations,
  riskLevel,
  totalWeightedScore,
}: DeviationModalProps) {
  if (!open) return null;

  const totalScore = deviations.reduce((sum, d) => sum + d.score, 0) || 1;
  const riskLabel = `${riskLevel} Risk`;
  const bandText =
    totalWeightedScore < 1 ? "Low: 0–1" : totalWeightedScore < 3 ? "Medium: 1–3" : "High: 3+";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-700 hover:text-black"
          aria-label="Close deviation & risk summary"
        >
          <X size={18} />
        </button>

        <div className="p-4 border-b flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={18} className="text-emerald-700" />
          <span>Risk Summary & Deviation Details</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Risk summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Summary card */}
            <div className="border rounded-xl p-4 shadow-sm bg-white">
              <p className="text-xs font-semibold text-gray-600 mb-1">Risk Summary</p>
              <div className="mt-2 text-2xl font-semibold text-amber-700">{riskLabel}</div>
              <p className="text-xs text-gray-500 mt-1">Legal Review Required</p>

              <div className="mt-4 flex items-end gap-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {totalWeightedScore.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total Weighted Score</div>
                </div>
                <div className="ml-auto text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Low: 0–1
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Medium: 1–3
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    High: 3+
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">Current band: {bandText}</div>
            </div>

            {/* Distribution card */}
            <div className="border rounded-xl p-4 shadow-sm bg-white">
              <p className="text-xs font-semibold text-gray-600 mb-1">Risk Distribution</p>
              <div className="mt-3 space-y-3">
                {deviations.map((dev) => {
                  const pct = (dev.score / totalScore) * 100;
                  const barColour =
                    dev.score >= 6 ? "bg-red-500" : dev.score >= 3 ? "bg-amber-500" : "bg-emerald-500";

                  return (
                    <div key={dev.clause} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span className="truncate mr-2">{dev.clause}</span>
                        <span>{dev.score.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full ${barColour}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-3 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> High Risk
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Medium Risk
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Low Risk
                </div>
              </div>
            </div>
          </div>

          {/* Filter chips (visual only for now) */}
          <div className="inline-flex rounded-full border bg-gray-50 overflow-hidden text-[11px]">
            {(["All", "High", "Medium", "Low"] as const).map((label, idx) => (
              <button
                key={label}
                type="button"
                className={`px-4 py-1.5 border-r last:border-r-0 ${
                  idx === 0
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Deviation table (clause-level) */}
          <div className="border rounded-xl overflow-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3 border">Clause</th>
                  <th className="p-3 border">TD Baseline Standard</th>
                  <th className="p-3 border">Supplier Contract</th>
                  <th className="p-3 border">Deviation Summary</th>
                  <th className="p-3 border">Risk Level</th>
                  <th className="p-3 border">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {deviations.map((d, i) => (
                  <tr key={i} className="border-b last:border-b-0 align-top">
                    <td className="p-3 border font-semibold w-32">{d.clause}</td>
                    <td className="p-3 border text-gray-700 whitespace-pre-wrap w-64">{d.baseline}</td>
                    <td className="p-3 border text-gray-700 whitespace-pre-wrap w-64">{d.supplier}</td>
                    <td className="p-3 border text-gray-700 whitespace-pre-wrap w-64">{d.deviation}</td>
                    <td className="p-3 border font-semibold w-24">
                      {d.riskLevel === "High" ? (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px]">
                          High
                        </span>
                      ) : d.riskLevel === "Medium" ? (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px]">
                          Medium
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px]">
                          Low
                        </span>
                      )}
                    </td>
                    <td className="p-3 border text-gray-700 whitespace-pre-wrap w-64">{d.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         ITERATION TRACKER DASHBOARD UI                     */
/* -------------------------------------------------------------------------- */

type RiskFilter = "All" | "High" | "Medium" | "Low";

type SortKey = "createdAt" | "updatedAt" | "totalWeightedScore";

type SortDirection = "asc" | "desc";

export default function IterationTrackerDashboard() {
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(
    mockProjects[0] ?? null
  );
  const [openSupplierDoc, setOpenSupplierDoc] = useState(false);
  const [openBaselineDoc, setOpenBaselineDoc] = useState(false);
  const [openDeviationModal, setOpenDeviationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("All");
  const [userFilter, setUserFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const current = selectedProject ?? mockProjects[0];

  // Unique usernames for filter dropdown
  const uniqueUsers = Array.from(new Set(mockProjects.map((p) => p.username)));

  // Filtered list
  const filteredProjects = mockProjects.filter((p) => {
    const matchesSearch =
      !searchTerm.trim() ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === "All" || p.riskLevel === riskFilter;
    const matchesUser = userFilter === "All" || p.username === userFilter;

    return matchesSearch && matchesRisk && matchesUser;
  });

  // Sorting helper
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortKey) {
      case "createdAt":
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
        break;
      case "totalWeightedScore":
        aVal = a.totalWeightedScore;
        bVal = b.totalWeightedScore;
        break;
      default:
        aVal = 0;
        bVal = 0;
    }

    if (Number.isNaN(aVal) || Number.isNaN(bVal)) return 0;
    const diff = aVal - bVal;
    return sortDir === "asc" ? diff : -diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);
  const startIndex = safePage * pageSize;
  const paginatedProjects = sortedProjects.slice(startIndex, startIndex + pageSize);

  // Ensure page index is valid when page count shrinks
  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside
        className="w-56 text-white flex flex-col"
        style={{ backgroundColor: TD_GREEN }}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/20">
          <div className="bg-white rounded-md h-9 w-9 flex items-center justify-center shadow">
            <span className="text-[18px] font-extrabold" style={{ color: TD_GREEN }}>
              TD
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs opacity-80">ContractBuddy</span>
            <span className="text-sm font-semibold">Iteration Tracker</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Iterations</h1>
            {current && (
              <p className="text-xs text-gray-500">
                Showing latest run for <span className="font-medium">{current.projectName}</span>
              </p>
            )}
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Search by user or project"
              className="px-3 py-1.5 text-xs border rounded-full bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value as RiskFilter);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 text-xs border rounded-full bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All risks</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 text-xs border rounded-full bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All users</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PROJECT TABLE */}
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 text-gray-600 text-[11px] uppercase">
              <tr>
                <th className="p-3 border-b text-left">User</th>
                <th className="p-3 border-b text-left">Project Name</th>
                <th className="p-3 border-b text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-gray-800"
                  >
                    <span>Created</span>
                    {sortKey === "createdAt" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
                <th className="p-3 border-b text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("updatedAt")}
                    className="inline-flex items-center gap-1 hover:text-gray-800"
                  >
                    <span>Last Modified</span>
                    {sortKey === "updatedAt" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
                <th className="p-3 border-b text-left">Supplier Document</th>
                <th className="p-3 border-b text-left">Baseline Document</th>
                <th className="p-3 border-b text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("totalWeightedScore")}
                    className="inline-flex items-center gap-1 hover:text-gray-800"
                  >
                    <span>Total Weighted Score</span>
                    {sortKey === "totalWeightedScore" && (
                      <span>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </button>
                </th>
                <th className="p-3 border-b text-left">Risk Level</th>
                <th className="p-3 border-b text-left">Risk Summary</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b last:border-b-0 cursor-pointer hover:bg-emerald-50/60 ${
                    current?.id === p.id ? "bg-emerald-50" : "bg-white"
                  }`}
                  onClick={() => setSelectedProject(p)}
                >
                  <td className="p-3 whitespace-nowrap">{p.username}</td>
                  <td className="p-3 font-medium max-w-xs truncate">{p.projectName}</td>
                  <td className="p-3 whitespace-nowrap">{formatDisplayDate(p.createdAt)}</td>
                  <td className="p-3 whitespace-nowrap">{formatDisplayDate(p.updatedAt)}</td>

                  {/* Supplier Doc */}
                  <td className="p-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-emerald-700 underline decoration-emerald-400 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(p);
                        setOpenSupplierDoc(true);
                      }}
                    >
                      <FileText size={14} /> {p.supplierDocTitle}
                    </button>
                  </td>

                  {/* Baseline Doc */}
                  <td className="p-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-emerald-700 underline decoration-emerald-400 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(p);
                        setOpenBaselineDoc(true);
                      }}
                    >
                      <FileText size={14} /> {p.baselineDocTitle}
                    </button>
                  </td>

                  {/* Total weighted score */}
                  <td className="p-3 whitespace-nowrap font-semibold">
                    {p.totalWeightedScore.toFixed(2)}
                  </td>

                  {/* Risk level */}
                  <td className="p-3 whitespace-nowrap font-semibold">
                    {p.riskLevel === "High" ? (
                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px]">
                        High
                      </span>
                    ) : p.riskLevel === "Medium" ? (
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px]">
                        Medium
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px]">
                        Low
                      </span>
                    )}
                  </td>

                  {/* Risk summary action */}
                  <td className="p-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(p);
                        setOpenDeviationModal(true);
                      }}
                    >
                      <Eye size={14} />
                      <span>View Risk Summary</span>
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedProjects.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-xs text-gray-500" colSpan={9}>
                    No projects match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination controls */}
          <div className="flex items-center justify-between px-4 py-2 border-t text-[11px] text-gray-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
              <span className="ml-2">
                Page {totalPages === 0 ? 0 : safePage + 1} of {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                className="border rounded px-2 py-1 bg-white"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {current && (
        <>
          <DocumentViewer
            open={openSupplierDoc}
            onClose={() => setOpenSupplierDoc(false)}
            title={current.supplierDocTitle}
            url={current.supplierDocUrl}
          />

          <DocumentViewer
            open={openBaselineDoc}
            onClose={() => setOpenBaselineDoc(false)}
            title={current.baselineDocTitle}
            url={current.baselineDocUrl}
          />

          <DeviationModal
            open={openDeviationModal}
            onClose={() => setOpenDeviationModal(false)}
            deviations={current.deviations}
            riskLevel={current.riskLevel}
            totalWeightedScore={current.totalWeightedScore}
          />
        </>
      )}
    </div>
  );
}
