"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  useGetLoanApplicationsQuery,
  useGetLoanApplicationFilterOptionsQuery,
  useDownloadOfferLetterMutation,
  useLazyExportLoanApplicationsQuery
} from "@/app/_lib/redux/services/adminApiSlice";
import Modal from "@/app/_components/ui/Modal";
import { orgs, OrgSlug } from "@/app/_config/orgs";
import { get } from "@/app/_lib/redux/services/apiClient";
import {
  Search,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  Download,
  Settings,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText
} from "lucide-react";


const formatAppId = (lappId: any, loanProduct: string) => {
  const p = (loanProduct || "").toLowerCase();
  let prefix = "APP";
  if (p.includes("home")) prefix = "HL";
  else if (p.includes("personal")) prefix = "PL";
  else if (p.includes("business")) prefix = "BL";
  else if (p.includes("vehicle")) prefix = "VL";
  else if (p.includes("gold")) prefix = "GL";
  else if (p.includes("education")) prefix = "EL";
  
  const strId = String(lappId);
  const padded = strId.padStart(8, '0');
  return `${prefix}${padded}`;
};

const formatTableDate = (dateStr: any) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatTableTime = (dateStr: any) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

export default function ApplicationsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    loanProduct: "",
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10); // set to 10 as per mockup

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);

  // Preview State
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; name: string } | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<number | null>(null);

  // Checked Rows State
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});
  const [isAllChecked, setIsAllChecked] = useState(false);

  // Row Action Dropdown State
  const [activeDropdownAppId, setActiveDropdownAppId] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLTableCellElement | null>(null);
  const org = orgs[orgSlug as OrgSlug];

  // API Queries
  const { data: filterOptionsRes } = useGetLoanApplicationFilterOptionsQuery();
  const filterOptions = filterOptionsRes?.data;

  const { data: applicationsRes, isFetching: isListLoading } = useGetLoanApplicationsQuery({
    status: appliedFilters.status || undefined,
    loan_product: appliedFilters.loanProduct || undefined,
    from_date: appliedFilters.fromDate || undefined,
    to_date: appliedFilters.toDate || undefined,
    page,
    per_page: perPage,
  });

  const [triggerExport, { isLoading: isExporting }] = useLazyExportLoanApplicationsQuery();
  const [downloadOffer, { isLoading: isOfferDownloading }] = useDownloadOfferLetterMutation();

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownAppId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleOfferDownload = async (app: any) => {
    try {
      let loanType = "PERSONAL_LOAN";
      const product = (app.loan_product || "").toLowerCase();
      if (product.includes("home")) loanType = "HOME_LOAN";
      else if (product.includes("vehicle") || product.includes("car")) loanType = "VEHICLE_LOAN";
      else if (product.includes("property") || product.includes("mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
      else if (product.includes("education")) loanType = "EDUCATION_LOAN";

      const response = await downloadOffer({
        step_key: "LOAN_APPLICATION",
        loan_type: loanType,
        payload: {
          application_id: app.lapp_id,
          section_id: "loan_application_submitted"
        }
      }).unwrap();

      if (response.data?.offer_letter_base64) {
        const base64String = response.data.offer_letter_base64;
        const linkSource = `data:application/pdf;base64,${base64String}`;
        const downloadLink = document.createElement("a");
        const fileName = `offer_letter_${app.lapp_id}.pdf`;
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
      }
    } catch (err) {
      console.error("Failed to download offer", err);
      alert("Failed to download offer letter. Please try again.");
    }
  };

  const fetchDocuments = async (app: any) => {
    setSelectedApp(app);
    setIsModalOpen(true);
    setIsDocsLoading(true);
    try {
      const docsRes = await get(`/admin/applications/${app.lapp_id}/documents`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });

      if (docsRes.ok) {
        const docsJson = await docsRes.json();
        setDocuments(docsJson.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setIsDocsLoading(false);
    }
  };

  const handleDocDownload = async (docId: number, fileName: string) => {
    try {
      const res = await get(`/admin/applications/${selectedApp.lapp_id}/documents/${docId}/download`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download document:", error);
      alert("Failed to download document");
    }
  };

  const handleView = async (doc: any) => {
    try {
      setIsViewing(true);
      setLoadingDocId(doc.id);
      const res = await get(`/admin/applications/${selectedApp.lapp_id}/documents/${doc.id}/download`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Fetch failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const type = doc.file_extension?.toLowerCase() === "pdf" ? "application/pdf" : blob.type;

      setPreviewDoc({ url, type, name: doc.file_name });
    } catch (error) {
      console.error("Failed to view document:", error);
      alert("Failed to load document preview");
    } finally {
      setIsViewing(false);
      setLoadingDocId(null);
    }
  };

  const rawApplications = applicationsRes?.data || [];
  const applications = appliedFilters.search
    ? rawApplications.filter((app: any) => {
        const name = `${app.first_name || ""} ${app.last_name || ""}`.toLowerCase();
        const formattedId = formatAppId(app.lapp_id, app.loan_product).toLowerCase();
        const mobile = (app.mobile || "").toLowerCase();
        const query = appliedFilters.search.toLowerCase();
        return name.includes(query) || formattedId.includes(query) || mobile.includes(query);
      })
    : rawApplications;
  const meta = applicationsRes?.meta;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      search: searchQuery,
      status: statusFilter,
      loanProduct: productFilter,
      fromDate,
      toDate,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setProductFilter("");
    setFromDate("");
    setToDate("");
    setAppliedFilters({
      search: "",
      status: "",
      loanProduct: "",
      fromDate: "",
      toDate: "",
    });
    setPage(1);
  };

  const handleDownload = async () => {
    try {
      const csvData = await triggerExport({
        status: appliedFilters.status || undefined,
        loan_product: appliedFilters.loanProduct || undefined,
        from_date: appliedFilters.fromDate || undefined,
        to_date: appliedFilters.toDate || undefined,
      }).unwrap();

      const blob = new Blob([csvData], { type: "text/csv" });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loan_applications_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const toggleCheckAll = () => {
    const nextCheckedState = !isAllChecked;
    setIsAllChecked(nextCheckedState);
    const updated: Record<number, boolean> = {};
    applications.forEach((app: any) => {
      updated[app.lapp_id] = nextCheckedState;
    });
    setCheckedRows(updated);
  };

  const toggleCheckRow = (id: number) => {
    const updated = { ...checkedRows, [id]: !checkedRows[id] };
    setCheckedRows(updated);
    setIsAllChecked(applications.every((app: any) => updated[app.lapp_id]));
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center p-20 text-[#64748B]">
        <p className="text-sm font-semibold">Initializing applications...</p>
      </div>
    );
  }

  // Color Mapping for Badges exactly matching mockup
  const normalizeStatus = (value: string) =>
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const STATUS_STYLE_MAP: Record<string, { bg: string; text: string; ring: string }> = {
    "Submitted": { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" },
    "In Review": { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200" },
    "Pending Docs": { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
    "Underwriting": { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
    "Approval Pending": { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
    "Approved": { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    "Sanctioned": { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200" },
    "Rejected": { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
    "Processing": { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
  };

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-[calc(100vh-70px)] flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">All Applications</h1>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              View, search and manage all loan applications.
            </p>
          </div>
          
          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="h-9 px-4 border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-[#475569] bg-white rounded-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Download size={14} className="text-[#64748B]" />
              <span>{isExporting ? "Exporting..." : "Export"}</span>
            </button>

            <button 
              type="button"
              className="h-9 px-4 border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-[#475569] bg-white rounded-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Settings size={14} className="text-[#64748B]" />
              <span>Column Settings</span>
            </button>

            {/* Split plus button with dropdown chevron */}
            <div className="flex items-center h-9">
              <button className="h-full pl-4 pr-3 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-xs font-bold rounded-l-lg flex items-center gap-1.5 cursor-pointer transition-all">
                <Plus size={14} />
                <span>New Application</span>
              </button>
              <div className="w-[1px] bg-[#4F2EE0] h-full" />
              <button className="h-full px-3 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white rounded-r-lg flex items-center justify-center cursor-pointer transition-all">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
            
            {/* Search filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ID, name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  <Search size={14} />
                </span>
              </div>
            </div>

            {/* Status select filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setAppliedFilters(prev => ({ ...prev, status: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full h-9 pl-3 pr-8 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] appearance-none font-medium cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {filterOptions?.statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                  <ChevronDown size={14} />
                </span>
              </div>
            </div>

            {/* Product select filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Product</label>
              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) => {
                    setProductFilter(e.target.value);
                    setAppliedFilters(prev => ({ ...prev, loanProduct: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full h-9 pl-3 pr-8 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] appearance-none font-medium cursor-pointer"
                >
                  <option value="">All Products</option>
                  {filterOptions?.loan_products.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                  <ChevronDown size={14} />
                </span>
              </div>
            </div>

            {/* Branch select filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Branch</label>
              <div className="relative">
                <select
                  className="w-full h-9 pl-3 pr-8 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] appearance-none font-medium cursor-pointer"
                  defaultValue=""
                >
                  <option value="">All Branches</option>
                  <option value="pune">Pune Branch</option>
                  <option value="mumbai">Mumbai Branch</option>
                  <option value="delhi">Delhi Branch</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                  <ChevronDown size={14} />
                </span>
              </div>
            </div>

            {/* Date range filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Applied On</label>
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 h-9 min-w-0 w-full">
                <Calendar size={14} className="text-[#94A3B8] shrink-0" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setAppliedFilters(prev => ({ ...prev, fromDate: e.target.value }));
                    setPage(1);
                  }}
                  className="flex-grow min-w-0 text-xs border-none focus:ring-0 p-0 text-[#1E293B] cursor-pointer bg-transparent"
                />
                <span className="text-[#94A3B8] text-xs font-semibold px-1 shrink-0">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setAppliedFilters(prev => ({ ...prev, toDate: e.target.value }));
                    setPage(1);
                  }}
                  className="flex-grow min-w-0 text-xs border-none focus:ring-0 p-0 text-[#1E293B] cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {/* Inline Filters Button */}
            <div className="space-y-1.5">
              <button
                type="button"
                className="w-full h-9 border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-[#475569] bg-white rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <SlidersHorizontal size={14} className="text-[#64748B]" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </form>

        {/* Table Wrap */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          {isListLoading ? (
            <div className="py-24 text-center text-[#64748B]">
              <p className="text-sm font-semibold">Loading applications...</p>
            </div>
          ) : !applications.length ? (
            <div className="py-24 text-center text-[#94A3B8] space-y-2">
              <p className="text-4xl">📦</p>
              <p className="text-sm font-bold text-[#475569]">No Applications Found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={toggleCheckAll}
                        className="rounded border-[#cbd5e1] text-[#5F39F8] focus:ring-[#5F39F8] cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none">
                        <span>Application ID</span>
                        <ChevronDown size={12} />
                      </div>
                    </th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">Applicant Name</th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">Product</th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">Loan Amount</th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none">
                        <span>Applied On</span>
                        <ChevronDown size={12} />
                      </div>
                    </th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">Assigned To</th>
                    <th className="p-4 text-xs font-bold text-[#64748B] uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {applications.map((app: any) => {
                    const name = `${app.first_name || ""} ${app.last_name || ""}`.trim() || "Anonymous";
                    const requested = app.loan_amount_requested || "0";
                    const score = app.score || "—";
                    const status = normalizeStatus(app.status || "Submitted");
                    const badgeStyles = STATUS_STYLE_MAP[status] || { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" };

                    const isChecked = checkedRows[app.lapp_id] || false;

                    return (
                      <tr key={app.lapp_id} className={`hover:bg-[#F8FAFC]/50 transition-all ${isChecked ? "bg-[#F8FAFC]" : ""}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheckRow(app.lapp_id)}
                            className="rounded border-[#cbd5e1] text-[#5F39F8] focus:ring-[#5F39F8] cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/${orgSlug}/applications/${app.lapp_id}`}
                            className="font-bold text-[#1E293B] hover:text-[#5F39F8] decoration-transparent text-sm"
                          >
                            {formatAppId(app.lapp_id, app.loan_product)}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-sm text-[#1E293B]">{name}</div>
                          <div className="text-xs text-[#64748B] mt-0.5">{app.mobile}</div>
                        </td>
                        <td className="p-4 text-sm text-[#475569] font-medium">
                          {app.loan_product || "Personal Loan"}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-sm text-[#1E293B]">
                            ₹ {Number(requested).toLocaleString("en-IN")}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-extrabold ring-1 ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.ring}`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-[#475569]">
                            {formatTableDate(app.application_date)}
                          </div>
                          <div className="text-xs text-[#94A3B8] mt-0.5">
                            {formatTableTime(app.application_date)}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#475569] font-semibold">
                          {app.assigned_to || "Arjun Singh"}
                        </td>
                        <td className="p-4 text-center relative" ref={dropdownRef}>
                          <button
                            onClick={() => setActiveDropdownAppId(activeDropdownAppId === app.lapp_id ? null : app.lapp_id)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#1E293B] hover:bg-slate-100 rounded-full cursor-pointer transition-all inline-block"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Row dropdown options */}
                          {activeDropdownAppId === app.lapp_id && (
                            <div className="absolute right-12 top-4 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 py-1.5 text-left animate-in fade-in slide-in-from-right-2">
                              <Link
                                href={`/${orgSlug}/applications/${app.lapp_id}`}
                                className="w-full block px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 decoration-transparent"
                              >
                                View Application
                              </Link>
                              <button
                                onClick={() => {
                                  handleOfferDownload(app);
                                  setActiveDropdownAppId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                              >
                                Download Offer Letter
                              </button>
                              <button
                                onClick={() => {
                                  fetchDocuments(app);
                                  setActiveDropdownAppId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                              >
                                View Documents
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 gap-4">
              <span className="text-xs font-semibold text-[#64748B]">
                Showing {((meta.current_page - 1) * meta.per_page) + 1} to {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} applications
              </span>
              
              <div className="flex items-center gap-4">
                {/* 10 per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] font-semibold">Show</span>
                  <div className="relative">
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-8 pl-3 pr-7 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] appearance-none font-bold cursor-pointer"
                    >
                      <option value={10}>10 per page</option>
                      <option value={15}>15 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                {/* Page numbers navigation */}
                {meta.last_page > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                      let pageNum = i + 1;
                      if (meta.last_page > 5 && page > 3) {
                        pageNum = page - 3 + i + 1;
                        if (pageNum > meta.last_page) pageNum = meta.last_page - (4 - i);
                      }
                      return pageNum;
                    }).map((p) => (
                      <button
                        key={p}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          p === page
                            ? "bg-[#5F39F8] text-white"
                            : "border border-[#E2E8F0] hover:bg-slate-50 text-[#475569]"
                        }`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    
                    <button
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      disabled={page === meta.last_page}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Section */}
      <footer className="mt-12 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-[#94A3B8] gap-4">
        <span>© 2024 iFLOW Technologies. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <Link href="#" className="flex items-center gap-1.5 hover:text-[#64748B] decoration-transparent">
            <ShieldCheck size={12} />
            <span>Privacy Policy</span>
          </Link>
          <Link href="#" className="flex items-center gap-1.5 hover:text-[#64748B] decoration-transparent">
            <FileText size={12} />
            <span>Terms of Service</span>
          </Link>
        </div>
      </footer>

      {/* Documents Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (previewDoc?.url) window.URL.revokeObjectURL(previewDoc.url);
          setPreviewDoc(null);
          setIsModalOpen(false);
        }}
        title={previewDoc ? `Preview: ${previewDoc.name}` : `Documents - ${selectedApp?.first_name} ${selectedApp?.last_name}`}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          {previewDoc ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => {
                  window.URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "none",
                  color: "#f36723",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: "4px 0"
                }}
              >
                ← Back to List
              </button>
              <div style={{ height: "65vh", background: "#f1f5f9", borderRadius: "8px", overflow: "auto", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {previewDoc.type.includes("pdf") ? (
                  <iframe src={previewDoc.url + "#toolbar=0&navpanes=0&view=FitH"} style={{ width: "85%", height: "100%", border: "none" }} />
                ) : previewDoc.type.includes("image") ? (
                  <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }} />
                ) : (
                  <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Preview not available.</p>
                )}
              </div>
            </div>
          ) : isDocsLoading ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>Loading documents...</p>
          ) : documents.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>No documents uploaded.</p>
          ) : (
            documents.map((doc: any) => (
              <div key={doc.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{doc.doc_type.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{doc.file_name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={() => handleView(doc)}
                    disabled={isViewing}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {loadingDocId === doc.id ? "..." : "View"}
                  </button>
                  <button
                    onClick={() => handleDocDownload(doc.id, doc.file_name)}
                    style={{
                      background: "#0f172a",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
