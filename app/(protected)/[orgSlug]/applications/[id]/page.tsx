"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { get, post } from "@/app/_lib/redux/services/apiClient";
import { orgs, OrgSlug } from "@/app/_config/orgs";
import Modal from "@/app/_components/ui/Modal";
import EquifaxReportFull from "@/app/_components/ui/EquifaxReportFull";
import { Download, UploadCloud, Eye, ChevronRight, User, AlertCircle, FileText, Activity, ShieldCheck, Search, MapPin, Phone, Mail, Award, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, CreditCard, Mars, Venus, RefreshCw, Link as LinkIcon, Calendar, Building2, FileEdit, Heart, Briefcase, Landmark, Wallet, Receipt, TrendingDown, PieChart, Lock, Filter, MessageSquare, MessageCircle, Globe, ArrowUpRight, ArrowDownLeft, Send, Trash2 } from "lucide-react";
import { load as loadCashfreeSDK } from "@cashfreepayments/cashfree-js";

type Tab = "Overview" | "Customer Profile" | "Contact & Address" | "Co-Applicants" | "Documents" | "Upload Documents" | "Identity & KYC" | "Employment / Business" | "Financial Profile" | "Banking Details" | "Bureau" | "Fraud & Compliance" | "Audit Trail" | "Notes" | "Communication" | "Status History" | "Decision" | "Audit / Logs" | "CBS APIs" | "NACH" | "Equifax";

const STATUS_CLASSES: Record<string, string> = {
  submitted: "bg-[var(--primary-light,#f0f4ff)] text-[var(--primary,#2e3192)] border border-[var(--primary,#2e3192)]/20",
  processing: "bg-amber-50 text-amber-700 border border-amber-200/50",
  approved: "bg-green-50 text-green-700 border border-green-200/50",
  rejected: "bg-red-50 text-red-700 border border-red-200/50",
  on_hold: "bg-orange-50 text-orange-700 border border-orange-200/50",
  cancelled: "bg-slate-100 text-slate-500 border border-slate-200/50",
  pending: "bg-amber-50 text-amber-700 border border-amber-200/50",
};

export default function ApplicationDetailsPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedCoappIndex, setSelectedCoappIndex] = useState(0);
  const [coappSubTab, setCoappSubTab] = useState<"co-applicant" | "guarantor">("co-applicant");
  const [isAddingCoapp, setIsAddingCoapp] = useState(false);
  const [coappForm, setCoappForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "Male",
    dob: "",
    relationship: "Co-borrower",
    pan: "",
    aadhaar: "",
    voterId: "",
    passportNo: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    pincode: "",
    state: "",
    city: ""
  });
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const [appData, setAppData] = useState<any>(null);

  const [coapplicants, setCoapplicants] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Identity & KYC": true,
    "Income": true,
    "Property": true,
    "Other": true
  });
  const [isMoreTabOpen, setIsMoreTabOpen] = useState<boolean>(false);
  const subTabsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [subTabsBarWidth, setSubTabsBarWidth] = useState<number>(0);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !subTabsContainerRef.current) return;

    const updateWidth = () => {
      setSubTabsBarWidth(subTabsContainerRef.current?.clientWidth || window.innerWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(subTabsContainerRef.current);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadCategory, setUploadCategory] = useState("KYC DOCUMENTS");
  const [uploadRemarks, setUploadRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [dedupeData, setDedupeData] = useState<any>(null);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [dedupeError, setDedupeError] = useState<string | null>(null);
  const [dedupeFetched, setDedupeFetched] = useState(false);
  const [triggeringDedupe, setTriggeringDedupe] = useState(false);

  const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null);
  const [rejectionDocId, setRejectionDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  const [bureauData, setBureauData] = useState<any[]>([]);
  const [bureauLoading, setBureauLoading] = useState(false);
  const [bureauError, setBureauError] = useState<string | null>(null);
  const [bureauFetched, setBureauFetched] = useState(false);
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

  const [equifaxSummary, setEquifaxSummary] = useState<any>(null);
  const [equifaxLoading, setEquifaxLoading] = useState(false);
  const [equifaxError, setEquifaxError] = useState<string | null>(null);
  const [equifaxFetched, setEquifaxFetched] = useState(false);
  const [pullingEquifax, setPullingEquifax] = useState(false);
  const [equifaxPullError, setEquifaxPullError] = useState<string | null>(null);

  const [fullReport, setFullReport] = useState<any>(null);
  const [fullReportLoading, setFullReportLoading] = useState(false);
  const [fullReportError, setFullReportError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<"summary" | "accounts" | "enquiries" | "raw">("summary");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; name: string } | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const [openChecklistGroupId, setOpenChecklistGroupId] = useState<string | null>("KYC");
  const [checklistSearchQuery, setChecklistSearchQuery] = useState("");

  // Workflow State Variables
  const [currentStatus, setCurrentStatus] = useState<any>(null);

  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);

  const [selectedStatusCode, setSelectedStatusCode] = useState<string>("");
  const [workflowRemarks, setWorkflowRemarks] = useState<string>("");
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState<number | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | "refer_back">("approve");

  const org = orgs[orgSlug as OrgSlug];

  // NACH State Variables
  const [nachData, setNachData] = useState<any>(null);
  const [nachLoading, setNachLoading] = useState(false);
  const [nachError, setNachError] = useState<string | null>(null);
  const [nachFetched, setNachFetched] = useState(false);
  const [creatingNach, setCreatingNach] = useState(false);
  const [showNachForm, setShowNachForm] = useState(false);
  const [nachForm, setNachForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    plan_type: "ON_DEMAND",
    payment_methods: ["enach", "upi"],
    authorization_amount: 1,
    authorization_amount_refund: false,
    max_amount: 500000,
    plan_amount: 5000,
    plan_max_amount: 10000,
    plan_max_cycles: 60,
    plan_intervals: 1,
    plan_interval_type: "MONTH",
    account_holder_name: "",
    account_number: "",
    ifsc: "",
    bank_code: "",
    account_type: "SAVINGS",
    subscription_note: "Loan EMI mandate"
  });

  // Cashfree SDK loader (cached)
  const cashfreeRef = React.useRef<any>(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const openCashfreeCheckout = async (sessionId: string) => {
    try {
      setOpeningCheckout(true);
      if (!cashfreeRef.current) {
        cashfreeRef.current = await loadCashfreeSDK({ mode: "sandbox" });
      }
      const result = await cashfreeRef.current.subscriptionsCheckout({
        subsSessionId: sessionId,
        redirectTarget: "_blank",
      });
      if (result?.error) {
        alert("Checkout error: " + result.error.message);
      }
    } catch (err: any) {
      alert("Failed to open checkout: " + (err.message || "Unknown error"));
    } finally {
      setOpeningCheckout(false);
    }
  };

  useEffect(() => {
    if (!appData) return;
    setNachForm(prev => ({
      ...prev,
      customer_name: `${appData.first_name || ""} ${appData.middle_name ? appData.middle_name + " " : ""}${appData.last_name || ""}`.trim(),
      customer_email: appData.work_email || "",
      customer_phone: appData.mobile || "",
      max_amount: Number(appData.eligible_emi) || Number(appData.loan_amount_requested) || 500000,
      plan_amount: Number(appData.eligible_emi) || 5000,
      plan_max_amount: Math.round((Number(appData.eligible_emi) || 5000) * 1.2),
      plan_max_cycles: Number(appData.eligible_tenure) || 60,
      account_holder_name: `${appData.first_name || ""} ${appData.middle_name ? appData.middle_name + " " : ""}${appData.last_name || ""}`.trim(),
    }));
  }, [appData]);

  const fetchNachStatus = async () => {
    setNachLoading(true);
    setNachError(null);
    try {
      const res = await get(`/v1/applications/${id}/nach/status`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Failed to fetch NACH status");
      const json = await res.json();
      const data = json.data;
      // Backend getStatus returns mandate_url but not subscription_session_id.
      // Extract session ID from URL so the Cashfree SDK checkout button works.
      if (data && !data.subscription_session_id && data.mandate_url) {
        const parts = data.mandate_url.split("/subscriptions/pay/");
        if (parts.length === 2) {
          data.subscription_session_id = parts[1];
        }
      }
      setNachData(data);
      if (data) {
        setShowNachForm(false);
      } else {
        setShowNachForm(true);
      }
    } catch (err: any) {
      setNachError(err.message || "Failed to load NACH status");
    } finally {
      setNachLoading(false);
      setNachFetched(true);
    }
  };

  useEffect(() => {
    if (activeTab === "NACH" && !nachFetched) {
      fetchNachStatus();
    }
  }, [activeTab, nachFetched]);

  const handleCreateNachMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingNach(true);
    try {
      const body: any = {
        customer_name: nachForm.customer_name,
        customer_email: nachForm.customer_email,
        customer_phone: nachForm.customer_phone,
        plan_type: nachForm.plan_type,
        payment_methods: nachForm.payment_methods,
        authorization_amount: nachForm.authorization_amount,
        authorization_amount_refund: nachForm.authorization_amount_refund,
        subscription_note: nachForm.subscription_note,
      };

      if (nachForm.account_holder_name) body.account_holder_name = nachForm.account_holder_name;
      if (nachForm.account_number) body.account_number = nachForm.account_number;
      if (nachForm.ifsc) body.ifsc = nachForm.ifsc;
      if (nachForm.bank_code) body.bank_code = nachForm.bank_code;
      if (nachForm.account_type) body.account_type = nachForm.account_type;

      if (nachForm.plan_type === "ON_DEMAND") {
        body.max_amount = nachForm.max_amount;
      } else {
        body.plan_amount = nachForm.plan_amount;
        body.plan_max_amount = nachForm.plan_max_amount;
        body.plan_max_cycles = nachForm.plan_max_cycles;
        body.plan_intervals = nachForm.plan_intervals;
        body.plan_interval_type = nachForm.plan_interval_type;
      }

      const res = await post(`/v1/applications/${id}/nach/create`, body, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create NACH mandate");
      }

      alert(json.message || "NACH Mandate created successfully.");
      setNachData(json.data);
      setShowNachForm(false);
      setNachFetched(false);
      fetchNachStatus();
    } catch (err: any) {
      alert(err.message || "An error occurred while creating the NACH mandate.");
    } finally {
      setCreatingNach(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    setAppData(null);
    setCoapplicants([]);
    setDocuments([]);
    setDedupeData(null);
    setDedupeFetched(false);
    setBureauData([]);
    setBureauFetched(false);
    setEquifaxSummary(null);
    setEquifaxFetched(false);
    setFullReport(null);
    setIsReportModalOpen(false);
    setActiveReportTab("summary");
    setActiveTab("Overview");
    setCurrentStatus(null);
    setStatusHistory([]);
    setAllStatuses([]);
    setSelectedStatusCode("");
    setWorkflowRemarks("");
    setNachData(null);
    setNachFetched(false);
    setShowNachForm(false);

    const fetchData = async () => {
      try {
        setLoading(true);
        const appRes = await get(`/admin/applications/${id}`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });

        if (!appRes.ok) {
          throw new Error("Failed to fetch application details");
        }

        const appJson = await appRes.json();
        setAppData(appJson.data?.application);
        setCoapplicants(appJson.data?.coapplicants || []);

        const docsRes = await get(`/admin/applications/${id}/documents`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });

        if (docsRes.ok) {
          const docsJson = await docsRes.json();
          setDocuments(docsJson.data || []);
        }

        // Fetch Current Workflow Status on load
        const statusRes = await get(`/v1/applications/${id}/status`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          setCurrentStatus(statusJson.data);
          setSelectedStatusCode(statusJson.data?.status_code || "");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, orgSlug, org?.backendTenantId]);

  useEffect(() => {
    if (activeTab !== "CBS APIs" || dedupeFetched) return;

    const fetchDedupeData = async () => {
      setDedupeLoading(true);
      setDedupeError(null);
      try {
        const res = await get(`/v1/applications/${id}/dedupe?customer_type=applicant`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });
        if (res.status === 404) {
          setDedupeData(null);
        } else if (!res.ok) {
          throw new Error("Failed to fetch dedupe status");
        } else {
          const json = await res.json();
          setDedupeData(json);
        }
      } catch (err: any) {
        setDedupeError(err.message || "Failed to load dedupe status");
      } finally {
        setDedupeLoading(false);
        setDedupeFetched(true);
      }
    };

    fetchDedupeData();
  }, [activeTab, dedupeFetched, org?.backendTenantId, orgSlug, id]);

  // Fetch Status History when that tab is active
  useEffect(() => {
    if (activeTab !== "Status History") return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await get(`/v1/applications/${id}/history`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });
        if (!res.ok) throw new Error("Failed to fetch status history");
        const json = await res.json();
        setStatusHistory(json.data || []);
      } catch (err: any) {
        setHistoryError(err.message || "Failed to load status history");
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeTab, id, orgSlug, org?.backendTenantId]);

  // Fetch All Statuses list when Decision tab is active
  useEffect(() => {
    if (activeTab !== "Decision") return;

    const fetchAllStatuses = async () => {
      setStatusesLoading(true);
      setStatusesError(null);
      try {
        const res = await get(`/v1/workflow/statuses`, {
          "X-Tenant-ID": org?.backendTenantId || orgSlug,
        });
        if (!res.ok) throw new Error("Failed to fetch workflow status list");
        const json = await res.json();
        setAllStatuses(json.data || []);
      } catch (err: any) {
        setStatusesError(err.message || "Failed to load statuses list");
      } finally {
        setStatusesLoading(false);
      }
    };

    fetchAllStatuses();
  }, [activeTab, id, orgSlug, org?.backendTenantId]);

  const handleTriggerDedupe = async () => {
    setTriggeringDedupe(true);
    setDedupeError(null);
    try {
      const res = await post(
        `/v1/applications/${id}/dedupe`,
        { customer_type: "applicant" },
        { "X-Tenant-ID": org?.backendTenantId || orgSlug }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to trigger dedupe check");
      }

      setDedupeData({
        success: json.success,
        dedupe_status: json.dedupe_status,
        cbs_customer_id: json.cbs_customer_id,
        customer_id: json.cbs_customer_id,
        match_score: json.match_score,
        customer_name: json.customer_name,
        checked_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        message: json.message
      });
      setDedupeFetched(true);
    } catch (err: any) {
      setDedupeError(err.message || "Failed to run dedupe check");
    } finally {
      setTriggeringDedupe(false);
    }
  };

  const handleVerifyDocument = async (docId: number, status: "approved" | "rejected", reason: string = "") => {
    setVerifyingDocId(docId);
    try {
      const res = await post(
        `/admin/applications/${id}/documents/${docId}/verify`,
        { status, reject_reason: reason },
        { "X-Tenant-ID": org?.backendTenantId || orgSlug }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || `Failed to ${status} document`);
      }

      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === docId
            ? {
              ...doc,
              is_verified: status === "approved",
              verified_at: new Date().toISOString(),
              metadata: status === "rejected" ? { ...doc.metadata, reject_reason: reason } : doc.metadata
            }
            : doc
        )
      );

      setRejectionDocId(null);
      setRejectReason("");
    } catch (err: any) {
      alert(err.message || `An error occurred while trying to ${status} the document.`);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("doc_type", uploadCategory);
      if (uploadRemarks) formData.append("remarks", uploadRemarks);

      const res = await fetch(`/api/admin/applications/${id}/documents/upload`, {
        method: "POST",
        headers: { "X-Tenant-ID": org?.backendTenantId || orgSlug },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();

      if (json.data) {
        setDocuments(prev => [...prev, json.data]);
      }
      setSelectedFile(null);
      setUploadRemarks("");
      alert("Document uploaded successfully");
    } catch (err: any) {
      console.warn("API Error, updating optimistically:", err.message);
      const newDoc = {
        id: Date.now(),
        doc_type: uploadCategory,
        file_name: selectedFile.name,
        file_extension: selectedFile.name.split('.').pop()?.toLowerCase() || '',
        is_verified: null,
        metadata: { remarks: uploadRemarks },
        _localFile: selectedFile
      };
      setDocuments(prev => [...prev, newDoc]);
      setSelectedFile(null);
      setUploadRemarks("");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusCode) return;

    const confirmUpdate = window.confirm("Do you really want to update the status?");
    if (!confirmUpdate) return;

    setSubmittingWorkflow(true);
    try {
      const res = await post(
        `/v1/applications/${id}/status`,
        {
          status_code: selectedStatusCode,
          remarks: workflowRemarks || "Status updated from dashboard"
        },
        { "X-Tenant-ID": org?.backendTenantId || orgSlug }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to update application status");
      }

      alert("Application status updated successfully!");
      setWorkflowRemarks("");

      // Refresh status info
      const statusRes = await get(`/v1/applications/${id}/status`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setCurrentStatus(statusJson.data);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const handleFinalApproval = async () => {
    const confirmApprove = window.confirm(`Do you really want to submit the decision to ${approvalAction === "approve" ? "Approve" : approvalAction === "reject" ? "Reject" : "Refer Back"} this application?`);
    if (!confirmApprove) return;

    setSubmittingWorkflow(true);
    try {
      const res = await post(
        `/v1/applications/${id}/approval-action`,
        {
          action: approvalAction,
          remarks: workflowRemarks || `Approval action: ${approvalAction}`
        },
        { "X-Tenant-ID": org?.backendTenantId || orgSlug }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit approval action");
      }

      alert(`Decision to ${approvalAction === "approve" ? "Approve" : approvalAction === "reject" ? "Reject" : "Refer Back"} processed successfully!`);
      setWorkflowRemarks("");

      // Refresh status info
      const statusRes = await get(`/v1/applications/${id}/status`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setCurrentStatus(statusJson.data);
        setSelectedStatusCode(statusJson.data?.status_code || "");
      }

      // Also refresh history
      const histRes = await get(`/v1/applications/${id}/history`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (histRes.ok) {
        const histJson = await histRes.json();
        setStatusHistory(histJson.data || []);
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit decision");
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Audit / Logs" && !bureauFetched) {
      const fetchBureauData = async () => {
        setBureauLoading(true);
        setBureauError(null);
        try {
          const res = await get(`/cibil/hard-pull`, {
            "X-Tenant-ID": org?.backendTenantId || orgSlug,
          });
          if (!res.ok) throw new Error("Failed to fetch bureau data");
          const json = await res.json();
          setBureauData(json.data || []);
        } catch (err: any) {
          setBureauError(err.message || "Failed to load bureau data");
        } finally {
          setBureauLoading(false);
          setBureauFetched(true);
        }
      };
      fetchBureauData();
    }

    if ((activeTab === "CBS APIs" || activeTab === "Equifax") && !equifaxFetched) {
      const fetchEquifaxSummary = async () => {
        setEquifaxLoading(true);
        setEquifaxError(null);
        try {
          const res = await get(`/v1/bureau/${id}`, {
            "X-Tenant-ID": org?.backendTenantId || orgSlug,
          });
          if (res.status === 404) {
            setEquifaxSummary(null);
          } else if (!res.ok) {
            throw new Error("Failed to fetch Equifax bureau summary");
          } else {
            const json = await res.json();
            setEquifaxSummary(json);
          }
        } catch (err: any) {
          setEquifaxError(err.message || "Failed to load Equifax bureau summary");
        } finally {
          setEquifaxLoading(false);
          setEquifaxFetched(true);
        }
      };
      fetchEquifaxSummary();
    }
  }, [activeTab, bureauFetched, equifaxFetched, org?.backendTenantId, orgSlug, id]);

  const handlePullEquifax = async () => {
    setPullingEquifax(true);
    setEquifaxPullError(null);
    try {
      const res = await post(
        `/v1/bureau/pull`,
        { laap_id: id, pull_type: "hardpull", queue: false },
        { "X-Tenant-ID": org?.backendTenantId || orgSlug }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to pull Equifax bureau report");
      }

      const summaryRes = await get(`/v1/bureau/${id}`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        setEquifaxSummary(summaryJson);
      } else {
        setEquifaxSummary({
          credit_score: json.bureau_score,
          risk_category: json.risk_category,
          active_accounts: 0,
          closed_accounts: 0,
          max_dpd: 0
        });
      }
      setEquifaxFetched(true);
    } catch (err: any) {
      setEquifaxPullError(err.message || "Failed to trigger Equifax bureau pull");
    } finally {
      setPullingEquifax(false);
    }
  };

  const handleFetchFullReport = async () => {
    setIsReportModalOpen(true);
    if (fullReport) return;

    setFullReportLoading(true);
    setFullReportError(null);
    try {
      const res = await get(`/v1/bureau/${id}/full`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Failed to fetch full bureau report");
      const json = await res.json();
      setFullReport(json);
    } catch (err: any) {
      setFullReportError(err.message || "Failed to load full report");
    } finally {
      setFullReportLoading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      if (doc._localFile) {
        const url = URL.createObjectURL(doc._localFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const res = await get(`/admin/applications/${id}/documents/${doc.id}/download`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
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
      if (doc._localFile) {
        const url = URL.createObjectURL(doc._localFile);
        const type = doc.file_extension?.toLowerCase() === "pdf" ? "application/pdf" : doc._localFile.type;
        setPreviewDoc({ url, type, name: doc.file_name });
        setIsPreviewOpen(true);
        setIsViewing(false);
        return;
      }

      const res = await get(`/admin/applications/${id}/documents/${doc.id}/download`, {
        "X-Tenant-ID": org?.backendTenantId || orgSlug,
      });
      if (!res.ok) throw new Error("Fetch failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const type = doc.file_extension?.toLowerCase() === "pdf" ? "application/pdf" : blob.type;

      setPreviewDoc({ url, type, name: doc.file_name });
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Failed to view document:", error);
      alert("Failed to load document preview");
    } finally {
      setIsViewing(false);
    }
  };

  const fmt = (val: any) => val ? `₹${Number(val).toLocaleString("en-IN")}` : "—";
  const firstPresent = (...values: unknown[]) =>
    values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

  const formatDob = (val: string) => {
    if (!val || String(val).length !== 8) return val || "—";
    const s = String(val);
    const year = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day = s.substring(6, 8);
    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f1f5f9] font-[Poppins]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary,#2e3192)]"></div>
        <p className="ml-3 font-semibold text-slate-500">Loading Application...</p>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center bg-[#f1f5f9] p-10 text-center font-[Poppins]">
        <p className="text-xl font-bold text-red-500">Error</p>
        <p className="text-sm text-red-400">{error || "Application not found"}</p>
        <button
          className="mt-4 rounded-sm border border-[var(--primary,#2e3192)] bg-white px-4 py-2 text-sm font-medium text-[var(--primary,#2e3192)] hover:bg-[var(--primary-light,#f0f4ff)]"
          onClick={() => router.push(`/${orgSlug}/applications`)}
        >
          Back to Applications
        </button>
      </div>
    );
  }

  const status = (appData.status || "submitted").toLowerCase();

  const getDocumentCategoryClass = (category: string) => {
    if (category.includes("KYC")) return { dot: "bg-green-500", heading: "text-green-600", header: "bg-green-50/50" };
    if (category.includes("LOAN")) return { dot: "bg-blue-500", heading: "text-blue-600", header: "bg-blue-50/50" };
    if (category.includes("MORTGAGE")) return { dot: "bg-purple-500", heading: "text-purple-600", header: "bg-purple-50/50" };
    return { dot: "bg-slate-500", heading: "text-slate-600", header: "bg-slate-50/50" };
  };

  const getDocStatusPill = (doc: any) => {
    if (doc.is_verified === true) return <span className="rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">Approved</span>;
    if (doc.verified_at) return <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Rejected</span>;
    if (doc._localFile) return <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">Uploaded</span>;
    return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">Under Review</span>;
  };

  const getDocCategory = (doc: any) => {
    if (doc.category) return doc.category;
    const type = (doc.doc_type || "").toUpperCase();
    if (type.includes("KYC") || type.includes("AADHAAR") || type.includes("PAN") || type.includes("PHOTO") || type.includes("SIGNATURE") || type.includes("PASSPORT") || type.includes("VOTER")) {
      return "Identity & KYC";
    }
    if (type.includes("INCOME") || type.includes("SALARY") || type.includes("STATEMENT") || type.includes("FORM_16") || type.includes("ITR")) {
      return "Income";
    }
    if (type.includes("PROPERTY") || type.includes("AGREEMENT") || type.includes("MORTGAGE") || type.includes("TAX") || type.includes("SALE")) {
      return "Property";
    }
    return "Other";
  };

  const kycDocs = documents.filter(d => d.doc_type?.includes("KYC") || d.doc_type?.includes("AADHAAR") || d.doc_type?.includes("PAN"));
  const loanDocs = documents.filter(d => d.doc_type?.includes("LOAN") || d.doc_type?.includes("AGREEMENT") || d.doc_type?.includes("STATEMENT"));
  const mortgageDocs = documents.filter(d => d.doc_type?.includes("MORTGAGE") || d.doc_type?.includes("PROPERTY"));
  const otherDocs = documents.filter(d => !kycDocs.includes(d) && !loanDocs.includes(d) && !mortgageDocs.includes(d));

  const getFilteredItems = (items: any[]) => {
    const q = checklistSearchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(d =>
      (d.doc_type || "").toLowerCase().includes(q) ||
      (d.file_name || "").toLowerCase().includes(q)
    );
  };

  // Compute Document Verification Flow Status
  const getDocFlowStatus = () => {
    if (!documents || documents.length === 0) return 'uploading';
    
    // Check if any document is explicitly rejected
    if (documents.some((d: any) => d.verified_at && d.is_verified === false)) return 'rejected';

    // Check if ALL documents are explicitly approved
    if (documents.every((d: any) => d.is_verified === true)) return 'approved';

    // Otherwise, there are some documents under review
    return 'under_review';
  };
  const docFlowStatus = getDocFlowStatus();

  const docGroups = [
    { name: "KYC DOCUMENTS", id: "KYC", label: "KYC Documents", items: getFilteredItems(kycDocs), rawItems: kycDocs, ...getDocumentCategoryClass("KYC") },
    { name: "LOAN DOCUMENTS", id: "LOAN", label: "Loan Documents", items: getFilteredItems(loanDocs), rawItems: loanDocs, ...getDocumentCategoryClass("LOAN") },
    { name: "MORTGAGE DOCUMENTS", id: "MORTGAGE", label: "Mortgage Documents", items: getFilteredItems(mortgageDocs), rawItems: mortgageDocs, ...getDocumentCategoryClass("MORTGAGE") },
    { name: "OTHER DOCUMENTS", id: "OTHER", label: "Other Documents", items: getFilteredItems(otherDocs), rawItems: otherDocs, ...getDocumentCategoryClass("OTHER") },
  ].filter(g => g.rawItems.length > 0 || activeTab === "Upload Documents");

  // Calculate CIBIL Gauge & Needle
  const scoreVal = Number(appData.score) || 810;
  const cibilProgress = scoreVal > 300 ? Math.min((scoreVal - 300) / 600, 1) : 0;
  const cibilAngle = -117 + cibilProgress * 234;

  const getCibilScoreMeta = (score: number) => {
    if (score <= 0) return { label: "Not available", color: "#9ca3af" };
    if (score >= 750) return { label: "Excellent", color: "#16a34a" };
    if (score >= 700) return { label: "Good", color: "#22c55e" };
    if (score >= 650) return { label: "Fair", color: "#f59e0b" };
    return { label: "Poor", color: "#ef4444" };
  };
  const { label: scoreLabel, color: scoreColor } = getCibilScoreMeta(scoreVal);

  const hiddenSubTabs: Tab[] = ["Equifax", "Status History", "Decision", "Audit / Logs"];
  const isGuarantorEntry = (coapp: any) => coapp?.relationship === "Guarantor";

  const handleRemoveCoapplicant = (targetCoapp: any) => {
    const label = isGuarantorEntry(targetCoapp) ? "guarantor" : "co-applicant";
    if (typeof window !== "undefined" && !window.confirm(`Remove this ${label}?`)) return;

    const targetKey = targetCoapp?.coapplicant_id ?? targetCoapp?.id;
    setCoapplicants((prev) => {
      const next = targetKey
        ? prev.filter((item) => (item?.coapplicant_id ?? item?.id) !== targetKey)
        : prev.filter((item) => item !== targetCoapp);
      const remainingVisible = next.filter((item) =>
        coappSubTab === "co-applicant" ? !isGuarantorEntry(item) : isGuarantorEntry(item)
      );
      setSelectedCoappIndex((index) => Math.max(0, Math.min(index, remainingVisible.length - 1)));
      return next;
    });
    setIsAddingCoapp(false);
  };

  const renderSubTabs = () => {
    const allNavigationTabs: Tab[] = ([
      "Overview", "Contact & Address", "Co-Applicants", "Documents",
      "Identity & KYC", "Employment / Business", "Financial Profile", "Banking Details",
      "Bureau", "Fraud & Compliance", "Audit Trail", "Notes", "Communication",
      "NACH", "Equifax", "CBS APIs", "Status History", "Decision", "Audit / Logs"
    ] as Tab[]).filter((tab) => !hiddenSubTabs.includes(tab));

    const estimateTabWidth = (tab: Tab) => Math.min(180, Math.max(74, tab.length * 7 + 34));
    const availableWidth = Math.max(220, (subTabsBarWidth || windowWidth) - 8);
    const moreButtonWidth = 82;
    let usedWidth = 0;
    let visibleCount = allNavigationTabs.length;

    for (let index = 0; index < allNavigationTabs.length; index += 1) {
      const tabWidth = estimateTabWidth(allNavigationTabs[index]);
      const reserveForMore = moreButtonWidth;
      if (usedWidth + tabWidth + reserveForMore > availableWidth) {
        visibleCount = Math.max(1, index);
        break;
      }
      usedWidth += tabWidth;
    }

    const primaryTabs = allNavigationTabs.slice(0, visibleCount);
    const dropdownTabs = allNavigationTabs.slice(visibleCount);
    const allDropdownTabs = activeTab === "Upload Documents" ? [...dropdownTabs, "Upload Documents" as Tab] : dropdownTabs;
    const isDropdownActive = allDropdownTabs.includes(activeTab);

    return (
      <div ref={subTabsContainerRef} className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-xs py-1 mb-1.5 shrink-0 w-full overflow-visible">
        <div className="flex max-w-full items-center gap-1 rounded-lg bg-white p-1 shadow-sm border border-[#e2e8f0] overflow-visible">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {primaryTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsMoreTabOpen(false);
                  }}
                  className={`px-2.5 py-2 xl:px-3.5 xl:py-2.5 text-[11px] font-bold transition-all relative whitespace-nowrap cursor-pointer shrink-0
                    ${isActive ? "text-[#5F39F8] bg-white translate-y-[1px]" : "text-slate-400 hover:text-slate-650 bg-white"}`}
                >
                  {tab}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5F39F8] rounded-t-full" />}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto shrink-0">
            {isMoreTabOpen && (
              <div
                className="fixed inset-0 z-20 cursor-default bg-transparent"
                onClick={() => setIsMoreTabOpen(false)}
              />
            )}

            <button
              onClick={() => setIsMoreTabOpen(!isMoreTabOpen)}
              className={`px-2.5 py-2 xl:px-3.5 xl:py-2.5 text-[11px] font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1 bg-white z-30
                ${isDropdownActive ? "text-[#5F39F8] translate-y-[1px]" : "text-slate-400 hover:text-slate-650"}`}
            >
              <span>More</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isMoreTabOpen ? "rotate-180" : ""}`} />
              {isDropdownActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5F39F8] rounded-t-full" />}
            </button>

            {isMoreTabOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 py-1.5 max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                {dropdownTabs.length === 0 ? (
                  <div className="px-4 py-2 text-xs font-bold text-slate-400">All tabs visible</div>
                ) : dropdownTabs.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setIsMoreTabOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-all hover:bg-slate-50 cursor-pointer
                        ${isActive ? "text-[#5F39F8] bg-indigo-50/20" : "text-slate-600 hover:text-slate-800"}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-y-auto lg:overflow-hidden bg-slate-50 p-2.5 lg:p-3 xl:p-4 text-slate-700 font-sans">

      {/* Top Header Banner matching mockup */}
      <div className="-mx-2.5 -mt-2.5 bg-white border-b border-[#E2E8F0] px-4 py-3 lg:-mx-3 lg:-mt-3 lg:px-6 xl:-mx-4 xl:-mt-4 xl:px-8 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 xl:gap-4">
        <div className="flex flex-wrap items-center gap-x-4 lg:gap-x-6 xl:gap-x-8 gap-y-2.5">
          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Application ID</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-lg font-extrabold leading-none text-[#111827]">APP{appData.lapp_id}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`APP${appData.lapp_id}`);
                  alert("Copied to clipboard!");
                }}
                className="text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <Copy size={13} />
              </button>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#5F39F8] ml-1">
                {currentStatus ? currentStatus.name : "In Review"}
              </span>
            </div>
          </div>

          <div className="w-[1px] bg-slate-200 h-8 self-center hidden sm:block" />

          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Loan Product</div>
            <div className="text-xs font-extrabold text-[#111827] mt-1.5">{appData.loan_product || "Home Loan"}</div>
          </div>

          <div className="w-[1px] bg-slate-200 h-8 self-center hidden sm:block" />

          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Loan Amount</div>
            <div className="text-xs font-extrabold text-[#111827] mt-1.5">{fmt(appData.loan_amount_requested) !== "—" ? fmt(appData.loan_amount_requested) : "₹ 50,00,000"}</div>
          </div>

          <div className="w-[1px] bg-slate-200 h-8 self-center hidden sm:block" />

          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Applicant</div>
            <div className="text-xs font-extrabold text-[#111827] mt-1.5">{appData.first_name} {appData.last_name}</div>
          </div>

          <div className="w-[1px] bg-slate-200 h-8 self-center hidden sm:block" />

          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Branch</div>
            <div className="text-xs font-extrabold text-[#111827] mt-1.5">{appData.branch_name || "Pune Branch"}</div>
          </div>

          <div className="w-[1px] bg-slate-200 h-8 self-center hidden sm:block" />

          <div>
            <div className="text-[10px] font-bold text-[#64748B]">Applied On</div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#111827] mt-1.5">
              <Calendar size={13} className="text-[#94A3B8]" />
              <span>
                {appData.application_date ? new Date(appData.application_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }) : "16 May 2024"}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons on Right */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end xl:self-center xl:flex-col xl:items-end xl:gap-1.5">
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 border border-[#E2E8F0] hover:bg-slate-50 text-[11px] font-extrabold text-[#111827] bg-white rounded flex items-center gap-2 cursor-pointer transition-all shadow-xs shrink-0">
              <span>More Actions</span>
              <ChevronDown size={14} className="text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>

      {(() => {
        const allNavigationTabs: Tab[] = [
          "Overview", "Customer Profile", "Contact & Address", "Identity & KYC",
          "Employment / Business", "Financial Profile", "Banking Details", "Co-Applicants", "Documents",
          "Bureau", "Fraud & Compliance", "Audit Trail", "Notes", "Communication",
          "NACH", "Equifax", "CBS APIs", "Status History", "Decision", "Audit / Logs"
        ];
        const estimateTopTabWidth = (tab: Tab) => {
          const textWidth = tab.length * 7.4;
          return Math.min(195, Math.max(68, textWidth + 32));
        };
        const tabRowGap = windowWidth >= 1280 ? 32 : windowWidth >= 640 ? 24 : 16;
        const tabToggleReserve = 112 + tabRowGap + 14;
        const getVisibleCount = () => {
          const measuredWidth = subTabsBarWidth || windowWidth;
          const horizontalPadding = windowWidth >= 1280 ? 64 : windowWidth >= 1024 ? 48 : 32;
          const availableWidth = Math.max(240, measuredWidth - horizontalPadding);
          let usedWidth = 0;

          for (let index = 0; index < allNavigationTabs.length; index += 1) {
            const remainingTabs = allNavigationTabs.length - index - 1;
            const tabWidth = estimateTopTabWidth(allNavigationTabs[index]);
            const gapWidth = index > 0 ? tabRowGap : 0;
            const reserveForShowMore = remainingTabs > 0 ? tabToggleReserve : 0;

            if (usedWidth + gapWidth + tabWidth + reserveForShowMore > availableWidth) {
              return Math.max(1, index);
            }

            usedWidth += gapWidth + tabWidth;
          }

          return allNavigationTabs.length;
        };
        const visibleCount = getVisibleCount();
        const primaryTabs = allNavigationTabs.slice(0, visibleCount);
        const dropdownTabs = allNavigationTabs.slice(visibleCount);
        const isOverflowActive = dropdownTabs.includes(activeTab);
        const tabIcons: Partial<Record<Tab, React.ReactNode>> = {
          "Overview": <Activity size={13} />,
          "Customer Profile": <User size={13} />,
          "Contact & Address": <MapPin size={13} />,
          "Identity & KYC": <ShieldCheck size={13} />,
          "Employment / Business": <Briefcase size={13} />,
          "Financial Profile": <Wallet size={13} />,
          "Banking Details": <Landmark size={13} />,
          "Co-Applicants": <User size={13} />,
          "Documents": <FileText size={13} />,
          "Bureau": <CreditCard size={13} />,
          "Fraud & Compliance": <ShieldCheck size={13} />,
          "Audit Trail": <Activity size={13} />,
          "Notes": <MessageSquare size={13} />,
          "Communication": <MessageCircle size={13} />,
          "NACH": <Receipt size={13} />,
          "Equifax": <CreditCard size={13} />,
          "CBS APIs": <Globe size={13} />,
          "Status History": <RefreshCw size={13} />,
          "Decision": <CheckCircle2 size={13} />,
          "Audit / Logs": <FileText size={13} />,
        };
        const overflowRows = (() => {
          const measuredWidth = subTabsBarWidth || windowWidth;
          const horizontalPadding = windowWidth >= 1280 ? 64 : windowWidth >= 1024 ? 48 : 32;
          const rowGap = tabRowGap;
          const overflowRightReserve = tabToggleReserve;
          const availableWidth = Math.max(190, measuredWidth - horizontalPadding - overflowRightReserve);
          const rows: Tab[][] = [];
          let currentRow: Tab[] = [];
          let usedWidth = 0;

          dropdownTabs.forEach((tab) => {
            const gapWidth = currentRow.length > 0 ? rowGap : 0;
            const tabWidth = estimateTopTabWidth(tab);

            if (currentRow.length > 0 && usedWidth + gapWidth + tabWidth > availableWidth) {
              rows.push(currentRow);
              currentRow = [tab];
              usedWidth = tabWidth;
              return;
            }

            currentRow.push(tab);
            usedWidth += gapWidth + tabWidth;
          });

          if (currentRow.length > 0) rows.push(currentRow);
          return rows;
        })();
        const overflowRowRightReserve = tabToggleReserve;

        return (
          <div ref={subTabsContainerRef} className="sticky top-0 z-30 -mx-2.5 mb-2.5 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 lg:-mx-3 lg:px-6 xl:-mx-4 xl:px-8 overflow-visible">
            <div className="relative h-12 overflow-visible">
              <div
                className="flex h-12 items-center gap-4 overflow-visible sm:gap-6 xl:gap-8"
                style={dropdownTabs.length > 0 ? { width: `calc(100% - ${overflowRowRightReserve}px)` } : undefined}
              >
                {primaryTabs.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setIsMoreTabOpen(false);
                      }}
                      className={`relative inline-flex h-full shrink-0 items-center gap-2 whitespace-nowrap text-[12px] font-extrabold transition-all cursor-pointer ${isActive ? "text-[#5F39F8]" : "text-[#475569] hover:text-[#1E293B]"}`}
                    >
                      <span className={isActive ? "text-[#5F39F8]" : "text-[#64748B]"}>{tabIcons[tab]}</span>
                      <span>{tab}</span>
                      {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#5F39F8]" />}
                    </button>
                  );
                })}
              </div>

              {dropdownTabs.length > 0 && (
                <div className="absolute right-0 top-0 flex h-12 shrink-0 items-center">
                  <button
                    onClick={() => setIsMoreTabOpen(!isMoreTabOpen)}
                    className={`relative inline-flex h-12 items-center gap-1 text-[12px] font-extrabold transition-all cursor-pointer ${isOverflowActive ? "text-[#5F39F8]" : "text-[#475569] hover:text-[#1E293B]"}`}
                  >
                    <span>{isMoreTabOpen ? "Show Less" : "Show More"}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isMoreTabOpen ? "rotate-180" : ""}`} />
                    {isOverflowActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#5F39F8]" />}
                  </button>
                </div>
              )}
            </div>
            {isMoreTabOpen && dropdownTabs.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                {overflowRows.map((row, rowIndex) => (
                  <div
                    key={row.join("-")}
                    className="flex min-h-9 items-center gap-4 overflow-visible border-t border-[#E2E8F0] py-0.5 sm:gap-6 xl:gap-8"
                    style={{ width: `calc(100% - ${overflowRowRightReserve}px)` }}
                  >
                    {row.map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={`${rowIndex}-${tab}`}
                          onClick={() => setActiveTab(tab)}
                          className={`relative inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap text-[12px] font-extrabold transition-all cursor-pointer ${isActive ? "text-[#5F39F8]" : "text-[#475569] hover:text-[#1E293B]"}`}
                        >
                          <span className={isActive ? "text-[#5F39F8]" : "text-[#64748B]"}>{tabIcons[tab]}</span>
                          {tab}
                          {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#5F39F8]" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}


      <div className="flex min-h-0 flex-1 flex-col lg:flex-row gap-2.5 items-stretch overflow-visible lg:overflow-hidden pt-0">
        {/* Left Sidebar - Always shown */}
        <aside className="w-full lg:h-full lg:w-60 xl:w-64 shrink-0 space-y-2.5 overflow-visible lg:overflow-y-auto pr-0 lg:pr-1 z-20 custom-scrollbar lg:pb-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col items-center">
            {/* Applicant Profile Card */}
            {/* Illustrated Vector Cartoon Avatar matching mockup */}
            <div className="relative mb-3 flex flex-col items-center select-none">
              <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden flex items-center justify-center bg-slate-100">
                <img
                  src="/images/applicant_avatar.png"
                  alt="Primary Applicant Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-2 inline-flex h-5 min-w-[92px] items-center justify-center whitespace-nowrap rounded-md border border-[#C7D2FE] bg-[#EEF2FF] px-2 text-[10px] font-medium leading-none text-[#5F39F8] shadow-xs">
                Primary Borrower
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-800 text-center mb-1 truncate w-full" title={`${appData.first_name} ${appData.middle_name ? `${appData.middle_name} ` : ""}${appData.last_name}`}>
              {appData.first_name} {appData.middle_name ? `${appData.middle_name} ` : ""}{appData.last_name}
            </h2>

            {/* Badges row: gender, age, marital status */}
            <div className="flex flex-nowrap items-center justify-center gap-1 mb-4 w-full text-[9px] font-medium text-[#5F39F8]">
              <span className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md bg-[#EEF2FF] px-1.5 leading-none shadow-xs">
                <User size={11} className="text-[#5F39F8]" />
                <span className="whitespace-nowrap">{(() => {
                  const gender = (appData.gender || "").toLowerCase();
                  if (gender === "female" || gender === "f") return "Female";
                  return "Male";
                })()}</span>
              </span>
              <span className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md bg-[#EEF2FF] px-1.5 leading-none shadow-xs">
                <Calendar size={11} className="text-[#5F39F8]" />
                <span className="whitespace-nowrap">32 Yrs</span>
              </span>
              <span className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md bg-[#EEF2FF] px-1.5 leading-none shadow-xs">
                <Heart size={11} className="text-[#5F39F8]" />
                <span className="whitespace-nowrap">Married</span>
              </span>
            </div>

            {/* Phone & Email Stack */}
            <div className="w-full space-y-2 mb-4 text-xs font-semibold text-slate-600 flex flex-col items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-[#94A3B8] shrink-0" />
                <span>{appData.mobile || "9876543210"}</span>
              </div>
              <div className="flex items-center gap-2 max-w-full">
                <Mail size={13} className="text-[#94A3B8] shrink-0" />
                <span className="truncate max-w-[160px] inline-block" title={appData.email || "rahul.sharma@email.com"}>{appData.email || "rahul.sharma@email.com"}</span>
              </div>
            </div>

            {/* Metadata Grid matching mockup */}
            <div className="w-full space-y-3 pb-4 text-xs font-semibold">
              <div className="flex justify-between items-center">
                <span className="text-slate-450 font-medium">Customer ID</span>
                <span className="font-bold text-[#1E293B]">CUST00012345</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">CIF Number</span>
                <span className="font-bold text-[#1E293B]">CIF987654321</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">CKYC Number</span>
                <span className="font-bold text-[#1E293B]">123456789012</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">Customer Segment</span>
                <span className="font-bold text-[#1E293B]">Priority</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">PAN Status</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Verified</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">Aadhaar Verification</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Verified</span>
              </div>
            </div>
            
            <button className="w-full h-9 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs">
              <span>View Customer 360</span>
              <ExternalLink size={12} className="text-[#94A3B8]" />
            </button>
          </div>

            {(() => {
              const numericScore = Number(appData.score) || 0;
              const progress = numericScore > 0 ? Math.min(numericScore / 850, 1) : 0;
              const angle = -117 + progress * 234;
              const bgPath =
                "M98.8963 82.045C100.776 83.2256 103.27 82.6812 104.332 80.7328C108.394 73.2859 110.662 64.9942 110.934 56.5047C111.25 46.6824 108.882 36.9573 104.08 28.349C99.2776 19.7408 92.2177 12.5667 83.6403 7.57888C75.063 2.59107 65.2842 -0.0266551 55.3294 0.000204573C45.3745 0.0270642 35.6104 2.69752 27.0608 7.73154C18.5112 12.7656 11.4911 19.9777 6.73665 28.6117C1.9822 37.2457 -0.331458 46.9835 0.038281 56.8039C0.357856 65.292 2.67192 73.5716 6.77466 80.9967C7.84789 82.939 10.3446 83.4697 12.2172 82.279C14.1212 81.0683 14.6523 78.5425 13.5901 76.5519C10.292 70.3707 8.43112 63.5217 8.16697 56.5057C7.85144 48.125 9.82588 39.815 13.8833 32.4468C17.9406 25.0787 23.9315 18.924 31.2276 14.628C38.5237 10.332 46.8563 8.05311 55.3516 8.03019C63.8469 8.00727 72.192 10.2412 79.5118 14.4977C86.8316 18.7542 92.8564 24.8766 96.9545 32.2227C101.053 39.5688 103.073 47.8681 102.804 56.2503C102.579 63.2675 100.756 70.1264 97.492 76.3252C96.4408 78.3217 96.9857 80.8447 98.8963 82.045Z";
              const meterColor = "#0089CF";
              const reportDate = appData.cibil_report_date || appData.report_date || "2026-07-16";
              const formattedReportDate = reportDate ? new Date(reportDate).toLocaleDateString("en-GB") : "-";
              const { label, color } = getCibilScoreMeta(numericScore);

              return (
                <div className="w-full rounded-xl border border-gray-200 bg-white px-3 py-4 mb-2 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-700 mb-1 text-center uppercase tracking-wider">
                    CIBIL Score
                  </h3>

                  <div className="relative flex flex-col items-center justify-center">
                    <svg viewBox="0 0 111 83" className="w-[110px] my-1 overflow-visible" aria-label="CIBIL score meter">
                      <path d={bgPath} fill="#D5ECF7" />

                      <path
                        pathLength="100"
                        d="M 10.18 78.6 A 50.85 50.85 0 1 1 100.82 78.6"
                        fill="none"
                        stroke={meterColor}
                        strokeWidth="8.3"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 100} 100`}
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />

                      {Array.from({ length: 15 }).map((_, i) => {
                        const tickAngle = -117 + (i / 14) * 234;
                        const isMajor = i % 2 === 0;

                        return (
                          <line
                            key={i}
                            x1="55.5"
                            y1={isMajor ? "13" : "14"}
                            x2="55.5"
                            y2="18"
                            stroke="#0089CF"
                            strokeWidth="0.5"
                            transform={`rotate(${tickAngle}, 55.5, 55.5)`}
                          />
                        );
                      })}

                      <g transform={`rotate(${angle - 30.1}, 55.5, 55.5)`}>
                        <g transform="translate(51.10, 24.9)">
                          <path
                            d="M22.1085 0.000280766L8.84942 33.1279L-0.000305079 28.0082L22.1085 0.000280766Z"
                            fill="url(#needleGradient)"
                          />
                        </g>
                      </g>

                      <g transform="translate(46.5, 46.5)">
                        <circle cx="8.5" cy="8.5" r="8.5" fill="#0089CF" />
                      </g>

                      <defs>
                        <linearGradient
                          id="needleGradient"
                          x1="22.1085"
                          y1="0"
                          x2="4.42456"
                          y2="30.568"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#0089CF" />
                          <stop offset="1" stopColor="#0089CF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="mt-1 text-center w-full">
                      {numericScore > 0 ? (
                        <>
                          <p className="text-[11px] font-bold text-gray-800">
                            Score:
                            <span className="ml-1" style={{ color }}>
                              {numericScore}
                            </span>
                          </p>
                          <p className="text-[10px] font-bold" style={{ color }}>
                            {label}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] font-bold text-gray-500">
                          Not Reported
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex justify-center mt-3">
                    <img src="/images/meterScoreCibil.svg" className="w-[160px]" alt="" />
                  </div>

                  <div className="flex flex-col items-center mt-0">
                    <img src="/images/vantage.svg" alt="" className="mx-auto w-[150px] mb-1" />

                    <div className="mt-1 border-t w-full pt-1 border-gray-100 flex justify-center items-center gap-1.5 text-[10px] text-gray-500 text-center">
                      <span className="whitespace-nowrap uppercase tracking-tighter opacity-70">Report Date:</span>
                      <span className="font-bold text-gray-700 whitespace-nowrap">
                        {formattedReportDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CIBIL Score Card */}
            <div className="hidden">
              
              {/* Card Header */}
              <h3 className="w-full text-center text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] mb-3">
                CIBIL SCORE
              </h3>

              {/* Gauge SVG */}
              <div className="flex items-center justify-center w-full pb-1">
                <svg viewBox="0 0 220 130" className="w-full max-w-[190px]">
                  <defs>
                    {/* Multi-stop spectrum gradient for the arc track */}
                    <linearGradient id="spectrumGrad" x1="25" y1="0" x2="195" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="30%" stopColor="#f97316" />
                      <stop offset="55%" stopColor="#eab308" />
                      <stop offset="75%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>

                  {/* Semicircle Track Shadow (very subtle) */}
                  <path
                    d="M 25 108 A 85 85 0 0 1 195 108"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />

                  {/* Colored progress arc */}
                  <path
                    d="M 25 108 A 85 85 0 0 1 195 108"
                    fill="none"
                    stroke="url(#spectrumGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${cibilProgress * 267} 267`}
                    style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)" }}
                  />



                  {/* Score number - large, bold, clean */}
                  <text
                    x="110" y="86"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="28"
                    fontWeight="800"
                    fill="#1E293B"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {scoreVal > 0 ? scoreVal : "—"}
                  </text>

                  {/* Label pill */}
                  {scoreVal > 0 && (
                    <>
                      <rect x="78" y="98" width="64" height="15" rx="7.5"
                        fill={scoreColor} opacity="0.1" />
                      <text
                        x="110" y="106"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="8"
                        fontWeight="800"
                        fill={scoreColor}
                        fontFamily="system-ui, sans-serif"
                      >
                        {scoreLabel.toUpperCase()}
                      </text>
                    </>
                  )}

                  {/* Range labels */}
                  <text x="18" y="122" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="600" fontFamily="system-ui, sans-serif">300</text>
                  <text x="110" y="18" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="600" fontFamily="system-ui, sans-serif">600</text>
                  <text x="202" y="122" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="600" fontFamily="system-ui, sans-serif">900</text>
                </svg>
              </div>

              {/* Footer info */}
              <div className="flex flex-col items-center gap-0.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Vantage Score 3.0</span>
                <span className="text-[9px] text-slate-400">
                  Report Date: {appData.application_date ? new Date(appData.application_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric"
                  }) : "—"}
                </span>
              </div>
            </div>
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-visible lg:overflow-y-auto custom-scrollbar pr-0 lg:pr-1 lg:pb-4">

          {/* Tabs Navigation */}
          {false && (() => {
            const allNavigationTabs: Tab[] = [
              "Overview", "Contact & Address", "Co-Applicants", "Documents", 
              "Identity & KYC", "Employment / Business", "Financial Profile", "Banking Details", 
              "Bureau", "Fraud & Compliance", "Audit Trail", "Notes", "Communication", 
              "NACH", "Equifax", "CBS APIs", "Status History", "Decision", "Audit / Logs"
            ];
            
            // Calculate max visible primary tabs based on width
            const getVisibleCount = (width: number) => {
              if (width < 640) return 1;   // Mobile
              if (width < 768) return 2;   // Small tablet
              if (width < 1024) return 3;  // Large tablet
              if (width < 1280) return 4;  // Small Laptop
              if (width < 1440) return 5;  // Standard Desktop
              if (width < 1600) return 6;  // Large Desktop
              return 8;                    // Ultrawide
            };
            
            const visibleCount = getVisibleCount(windowWidth);
            const primaryTabs = allNavigationTabs.slice(0, visibleCount);
            const dropdownTabs = allNavigationTabs.slice(visibleCount);
            
            // Include "Upload Documents" to dropdown list for active check (so checklist highlights "More")
            const allDropdownTabs = activeTab === "Upload Documents" ? [...dropdownTabs, "Upload Documents" as Tab] : dropdownTabs;
            const isDropdownActive = allDropdownTabs.includes(activeTab);
            
            return (
              <div className="flex items-center gap-1 rounded-lg bg-white p-1.5 shadow-sm border border-[#e2e8f0] sticky top-[104px] z-20 before:absolute before:-top-6 before:left-0 before:right-0 before:h-6 before:bg-slate-50 overflow-visible">
                {/* 1. Primary Tabs */}
                {primaryTabs.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setIsMoreTabOpen(false);
                      }}
                      className={`px-3 py-2.5 xl:px-5 xl:py-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer shrink-0
                          ${isActive
                          ? "text-[#5F39F8] bg-white translate-y-[1px]"
                          : "text-slate-400 hover:text-slate-650 bg-white"
                        }`}
                    >
                      {tab}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5F39F8] rounded-t-full" />
                      )}
                    </button>
                  );
                })}

                {/* 2. "More" Dropdown Chevron */}
                {dropdownTabs.length > 0 && (
                  <div className="relative shrink-0">
                    {/* Backdrop */}
                    {isMoreTabOpen && (
                      <div 
                        className="fixed inset-0 z-20 cursor-default bg-transparent"
                        onClick={() => setIsMoreTabOpen(false)}
                      />
                    )}
                    
                    <button
                      onClick={() => setIsMoreTabOpen(!isMoreTabOpen)}
                      className={`px-3 py-2.5 xl:px-5 xl:py-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1 bg-white z-30
                        ${isDropdownActive
                          ? "text-[#5F39F8] translate-y-[1px]"
                          : "text-slate-400 hover:text-slate-650"
                        }`}
                    >
                      <span>
                        {isDropdownActive 
                          ? `More (${activeTab === "Upload Documents" ? "Checklist" : activeTab})` 
                          : "More"}
                      </span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isMoreTabOpen ? "rotate-180" : ""}`} />
                      {isDropdownActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5F39F8] rounded-t-full" />
                      )}
                    </button>

                    {/* Dropdown Options */}
                    {isMoreTabOpen && (
                      <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 py-1.5 max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                        {dropdownTabs.map((tab) => {
                          const isActive = activeTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => {
                                setActiveTab(tab);
                                setIsMoreTabOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-all hover:bg-slate-50 cursor-pointer
                                ${isActive
                                  ? "text-[#5F39F8] bg-indigo-50/20"
                                  : "text-slate-600 hover:text-slate-800"
                                }`}
                            >
                              {tab}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab Content Areas */}
          {activeTab === "Overview" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              {/* Top overview grid: three blocks per row on large screens with no nested gaps. */}
              <div className="grid grid-flow-dense grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 xl:gap-3 items-stretch">
                
                {/* 1. Application Status Timeline */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:h-full">
                  <div className="flex h-full flex-col">
                    <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-2.5 mb-3">Application Status</h3>
                    <div className="relative ml-2 flex flex-1 flex-col justify-between gap-2 border-l border-[#E2E8F0] pl-5">
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Lead Captured</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">16 May 2024, 09:15 AM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Application Submitted</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">16 May 2024, 10:20 AM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Document Verification</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">16 May 2024, 11:10 AM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Bureau Report Pulled</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">16 May 2024, 12:05 PM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Banking Analysis</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">16 May 2024, 04:15 PM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#1E293B]">Eligibility Check</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">17 May 2024, 10:30 AM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#5F39F8] border-[3px] border-white flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                        <div className="text-[11px] font-bold text-[#5F39F8]">Credit Assessment</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">17 May 2024, 01:20 PM</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-200 border-[3px] border-white flex items-center justify-center shadow-xs" />
                        <div className="text-[11px] font-semibold text-[#64748B]">Underwriting</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">Pending</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-200 border-[3px] border-white flex items-center justify-center shadow-xs" />
                        <div className="text-[11px] font-semibold text-[#64748B]">Credit Committee</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">Pending</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-200 border-[3px] border-white flex items-center justify-center shadow-xs" />
                        <div className="text-[11px] font-semibold text-[#64748B]">Sanction</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">Pending</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-200 border-[3px] border-white flex items-center justify-center shadow-xs" />
                        <div className="text-[11px] font-semibold text-[#64748B]">Disbursement</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">Pending</div>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* 2. Source of Lead */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm xl:col-start-2 xl:row-start-1">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-3 mb-3">Source of Lead</h3>
                      <div className="space-y-2 text-xs font-semibold">
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">Source Type</span>
                          <span className="text-[#1E293B] font-extrabold text-right">DSA</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">DSA Name</span>
                          <span className="text-[#1E293B] font-extrabold text-right truncate max-w-[110px]" title="Pyramid Finserv">Pyramid Finserv</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">DSA Code</span>
                          <span className="text-[#1E293B] font-extrabold text-right truncate max-w-[110px] inline-block" title="DSA12345">DSA12345</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">Campaign</span>
                          <span className="text-[#1E293B] font-extrabold text-right truncate max-w-[110px]" title="Summer Offer 2024">Summer Offer</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">Lead ID</span>
                          <span className="text-[#1E293B] font-extrabold text-right truncate max-w-[110px] inline-block" title={`LD${appData.lapp_id || '12345678'}`}>LD{appData.lapp_id || '12345678'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-[#64748B]">Captured On</span>
                          <span className="text-[#1E293B] font-extrabold text-right">14 May 2024</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[#64748B]">Captured By</span>
                          <span className="text-[#1E293B] font-extrabold text-right truncate max-w-[110px] inline-block" title="Neha Verma">Neha Verma</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Customer Summary */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm xl:col-start-3 xl:row-start-1">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-3 mb-4">Customer Summary</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-[#64748B] font-semibold text-xs">Applicant</span>
                        <span className="w-6 h-6 rounded bg-indigo-50 border border-indigo-100 text-[#5F39F8] font-bold text-xs flex items-center justify-center">1</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-[#64748B] font-semibold text-xs">Co-Applicant</span>
                        <span className="w-6 h-6 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-xs flex items-center justify-center">1</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-[#64748B] font-semibold text-xs">Guarantor</span>
                        <span className="w-6 h-6 rounded bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">1</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#64748B] font-semibold text-xs">Total Customers</span>
                        <span className="w-6 h-6 rounded bg-amber-50 border border-amber-100 text-amber-600 font-bold text-xs flex items-center justify-center">3</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full h-9 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 mt-4">
                    View All Customers
                  </button>
                </div>
                  {/* 4. eKYC Progress */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm xl:col-start-2 xl:row-start-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-3 mb-3">eKYC Progress</h3>
                      <div className="space-y-1.5 text-xs font-semibold text-[#1E293B]">
                        {[
                          "Aadhaar eKYC",
                          "PAN Verification",
                          "CKYC",
                          "DigiLocker",
                          "Face Match",
                          "Liveness Check",
                          "Video KYC"
                        ].map((item) => (
                          <div key={item} className="flex items-center justify-between py-0.5 border-b border-slate-50/50">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                              <span className="text-[#1E293B] truncate">{item}</span>
                            </div>
                            <span className="text-emerald-600 text-[10px] font-bold shrink-0">Completed</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="w-full h-9 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 mt-4">
                      View eKYC Details
                    </button>
                  </div>

                  {/* 5. Quick Actions */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm xl:col-start-3 xl:row-start-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-2 mb-3">Quick Actions</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => setIsAssignModalOpen(true)}
                          className="w-full flex items-center gap-2 px-3 h-8 text-xs font-bold border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer transition-all"
                        >
                          <User size={14} className="text-[#94A3B8] shrink-0" />
                          <span>Assign To</span>
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 h-8 text-xs font-bold border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer transition-all">
                          <FileText size={14} className="text-[#94A3B8] shrink-0" />
                          <span>Add Note</span>
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 h-8 text-xs font-bold border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer transition-all">
                          <UploadCloud size={14} className="text-[#94A3B8] shrink-0" />
                          <span>Upload Document</span>
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 h-8 text-xs font-bold border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer transition-all">
                          <CheckCircle2 size={14} className="text-[#94A3B8] shrink-0" />
                          <span>Send for Approval</span>
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 h-8 text-xs font-bold border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-lg cursor-pointer transition-all">
                          <AlertCircle size={14} className="text-red-500 shrink-0" />
                          <span>Reject Application</span>
                        </button>
                      </div>
                    </div>
                  </div>
              </div>

                {/* 6. Loan Product & Key Parameters */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-2.5 xl:space-y-3">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                      <h3 className="text-sm font-bold text-[#1E293B]">Loan Product & Key Parameters</h3>
                      <button className="h-8 px-3 border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-[#475569] bg-white rounded-lg flex items-center justify-center cursor-pointer transition-all shadow-xs">
                        View Loan Details
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 xl:gap-x-6 gap-y-5 xl:gap-y-6">
                      {/* Col 1 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Loan Product</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">{appData.loan_product || "Home Loan"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Purpose</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">Purchase of Property</div>
                        </div>
                      </div>
                      
                      {/* Col 2 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Interest Type</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">Floating</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">LTV</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">75.50%</div>
                        </div>
                      </div>

                      {/* Col 3 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">ROI</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">8.75%</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Tenure</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">240 Months</div>
                        </div>
                      </div>

                      {/* Col 4 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">FOIR</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">45.00%</div>
                        </div>
                      </div>

                      {/* Col 5 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Loan Limit (Min-Max)</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">₹ 5,00,000 - ₹ 5,00,00,000</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Requested Amount</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">{fmt(appData.loan_amount_requested) !== "—" ? fmt(appData.loan_amount_requested) : "₹ 50,00,000"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Approved Limit</div>
                          <div className="text-xs font-bold text-[#64748B] mt-1">-</div>
                        </div>
                      </div>

                      {/* Col 6 */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Charges</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">Applicable</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">Insurance</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">Applicable</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#64748B]">GST</div>
                          <div className="text-xs font-bold text-[#1E293B] mt-1">18%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Relationship Mapping + Duplicate Check, Customer 360 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 xl:gap-3">
                
                {/* Relationship Mapping + Duplicate Check */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm flex min-h-[360px] flex-col">
                  <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-3">Relationship Mapping</h3>
                  <div className="relative mt-3 min-h-[220px] flex-1 overflow-hidden rounded-xl border border-slate-100 bg-white px-4 py-5">
                    <div className="absolute left-[27%] right-[27%] top-[74px] h-px bg-slate-200" />
                    <div className="absolute left-1/2 top-[74px] h-[72px] w-px -translate-x-1/2 bg-slate-200" />
                    <span className="absolute left-1/2 top-[111px] -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-400">
                      Guarantor
                    </span>

                    <div className="flex items-start justify-between">
                      <div className="flex w-[112px] flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 text-[#5F39F8] flex items-center justify-center font-extrabold text-sm shadow-xs">
                          {appData.first_name?.[0] || "R"}{appData.last_name?.[0] || "S"}
                        </div>
                        <span className="text-[11px] font-extrabold text-[#1E293B] mt-2 truncate max-w-[112px]">{appData.first_name} {appData.last_name}</span>
                        <span className="text-[10px] text-[#64748B] font-bold">Applicant</span>
                      </div>

                      <span className="mt-[45px] rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-400">
                        Joint
                      </span>

                      <div className="flex w-[112px] flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-extrabold text-sm shadow-xs">
                          PS
                        </div>
                        <span className="text-[11px] font-extrabold text-[#1E293B] mt-2">Priya Sharma</span>
                        <span className="text-[10px] text-[#64748B] font-bold">Co-Applicant</span>
                      </div>
                    </div>

                    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-extrabold text-sm shadow-xs">
                        SS
                      </div>
                      <span className="text-[11px] font-extrabold text-[#1E293B] mt-2">Suresh Sharma</span>
                      <span className="text-[10px] text-[#64748B] font-bold">Guarantor</span>
                    </div>
                  </div>

                </div>

                {/* Customer 360 */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm flex min-h-[286px] flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] border-b border-slate-100 pb-3 mb-4">Customer 360</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Applications</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">2</div>
                        </div>
                        <FileText size={20} className="text-blue-500" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Loans</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">1</div>
                        </div>
                        <Building2 size={20} className="text-emerald-500" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Overdue</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">0</div>
                        </div>
                        <AlertCircle size={20} className="text-rose-500" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Total Exposure</div>
                          <div className="text-sm font-bold text-[#1E293B] mt-1">₹ 35,00,000</div>
                        </div>
                        <span className="text-indigo-650 font-bold text-sm">₹</span>
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">KYC Completed</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">100%</div>
                        </div>
                        <CheckCircle2 size={20} className="text-teal-500" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Docs Uploaded</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">18</div>
                        </div>
                        <UploadCloud size={20} className="text-[#5F39F8]" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Last Interaction</div>
                          <div className="text-base font-extrabold text-[#1E293B] mt-1">15 May 2024</div>
                        </div>
                        <Calendar size={20} className="text-amber-500" />
                      </div>
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Duplicate Status</div>
                          <div className="text-xs font-extrabold text-[#1E293B] mt-1 truncate">No Duplicates Found</div>
                          <button className="mt-1.5 text-[10px] font-extrabold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                            View Details
                          </button>
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="w-full h-9 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 mt-4">
                    <Eye size={14} className="text-[#64748B]" />
                    <span>View Customer 360</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {activeTab === "Customer Profile" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              {/* 1. Customer Basic Information Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Customer Basic Information</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsEditDrawerOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none"
                    >
                      <FileEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                      <Activity size={13} />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-8 text-xs font-semibold">
                  {/* Column 1 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "Applicant Type", value: appData.applicant_type || "Individual" },
                      { label: "Customer Category", value: appData.customer_category || "Individual" },
                      { label: "Individual/Non-Individual", value: appData.individual_non_individual || "Individual" },
                      { label: "Prefix", value: appData.prefix || "Mr." },
                      { label: "First Name", value: appData.first_name || "Rahul" },
                      { label: "Middle Name", value: appData.middle_name || "Kumar" },
                      { label: "Last Name", value: appData.last_name || "Sharma" },
                      { label: "Father's Name", value: appData.father_name || "Suresh Sharma" },
                      { label: "Mother's Name", value: appData.mother_name || "Sunita Sharma" },
                      { label: "Maiden Name", value: appData.maiden_name || "-" },
                      { label: "Gender", value: appData.gender || "Male" },
                      { label: "Date of Birth", value: appData.date_of_birth ? new Date(appData.date_of_birth).toLocaleDateString("en-GB") : "15/08/1991" },
                      { label: "Age", value: appData.age ? `${appData.age} Years` : "32 Years" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[90px] xl:max-w-[125px]">{field.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "Marital Status", value: appData.marital_status || "Married" },
                      { label: "Nationality", value: "Indian" },
                      { label: "Resident Status", value: "Resident Indian" },
                      { label: "Religion", value: "Hindu" },
                      { label: "Category", value: "General" },
                      { label: "Education", value: appData.education || "Post Graduate" },
                      { label: "Occupation", value: appData.occupation || "Salaried" },
                      { label: "Profession", value: "IT Professional" },
                      { label: "Annual Income", value: appData.annual_income ? `₹ ${Number(appData.annual_income).toLocaleString("en-IN")}` : "₹ 12,00,000" },
                      { label: "Monthly Income", value: appData.monthly_income ? `₹ ${Number(appData.monthly_income).toLocaleString("en-IN")}` : "₹ 1,00,050" },
                      { label: "Customer Segment", value: "Priority" },
                      { label: "PAN Status", value: "Verified" },
                      { label: "Aadhaar Verification", value: "Verified" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[90px] xl:max-w-[125px]">{field.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "CKYC Number", value: "123456789012" },
                      { label: "GST Registered", value: "No" },
                      { label: "MSME Registered", value: "No" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[90px] xl:max-w-[125px]">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Contact Information Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Contact Information</h3>
                  <div className="flex items-center gap-4">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none">
                      <FileEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                      <Activity size={13} />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-8 text-xs font-semibold">
                  {/* Column 1 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "Mobile Number", value: appData.mobile || "9876543210" },
                      { label: "Alternate Mobile", value: "9123456780" },
                      { label: "Email ID", value: appData.email || "rahul.sharma@email.com" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[130px]">{field.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "Landline", value: "020-1234567" },
                      { label: "Preferred Contact Time", value: "10:00 AM - 06:00 PM" },
                      { label: "Preferred Language", value: "English" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[130px]">{field.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-0.5">
                    {[
                      { label: "Communication Preference", value: "Email, SMS, WhatsApp" },
                    ].map((field) => (
                      <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">{field.label}</span>
                        <span className="text-[#1E293B] font-bold text-right truncate max-w-[140px]">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Address Details Card (realigned columns and properties directly under Current Address) */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Address Details</h3>
                  <div className="flex items-center gap-4">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none">
                      <FileEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                      <Activity size={13} />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-8 text-xs font-semibold">
                  {/* Column 1: Current Address & Sub-Properties */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px] mb-2.5">Current Address</div>
                      <div className="text-[#1E293B] font-bold leading-relaxed">
                        {appData.current_address_line1 || "Flat No. 101, Maple Heights,"}<br />
                        {appData.current_address_line2 || "Baner Road, Near D Mart,"}<br />
                        {appData.current_city ? `${appData.current_city}, ` : "Baner, Pune, "}{appData.current_state || "Maharashtra"} - {appData.current_pincode || "411045"}<br />
                        India
                      </div>
                    </div>

                    <div className="space-y-0.5 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">Residence Type</span>
                        <span className="text-[#1E293B] font-bold text-right">{appData.current_residence_ownership || "Owned"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                        <span className="text-[#94A3B8] font-medium">Staying Since</span>
                        <span className="text-[#1E293B] font-bold text-right">5 Years</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 gap-4">
                        <span className="text-[#94A3B8] font-medium">Ownership</span>
                        <span className="text-[#1E293B] font-bold text-right">Self</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Permanent Address */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Permanent Address</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 select-none">Same as Current</span>
                    </div>
                    <div className="text-[#1E293B] font-bold leading-relaxed">
                      {appData.permanent_address_line1 || "Flat No. 101, Maple Heights,"}<br />
                      {appData.permanent_address_line2 || "Baner Road, Near D Mart,"}<br />
                      {appData.permanent_city ? `${appData.permanent_city}, ` : "Baner, Pune, "}{appData.permanent_state || "Maharashtra"} - {appData.permanent_pincode || "411045"}<br />
                      India
                    </div>
                  </div>

                  {/* Column 3: Office Address */}
                  <div>
                    <div className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px] mb-2.5">Office Address</div>
                    <div className="text-[#1E293B] font-bold leading-relaxed">
                      TCS Pvt. Ltd.,<br />
                      TCS House, Ravet,<br />
                      Pune, Maharashtra - 411057<br />
                      India
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Loan & Income Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Loan & Income Details</h3>
                  <div className="flex items-center gap-4">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none">
                      <FileEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                      <Activity size={13} />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-8 text-xs font-semibold">
                  {[
                    [
                      { label: "Loan Product", value: appData.loan_product || "Home Loan" },
                      { label: "Loan Scheme", value: appData.loan_scheme || "Standard" },
                      { label: "Requested Amount", value: fmt(appData.loan_amount_requested) },
                      { label: "Sanctioned Amount", value: fmt(appData.sanction_amount) },
                    ],
                    [
                      { label: "Requested Tenure", value: appData.loan_period_requested || "240 Months" },
                      { label: "Eligible Tenure", value: appData.eligible_tenure || "240 Months" },
                      { label: "Interest Rate", value: appData.eligible_roi ? `${appData.eligible_roi}%` : "8.75%" },
                      { label: "Monthly EMI", value: fmt(appData.eligible_emi) },
                    ],
                    [
                      { label: "Avg Monthly Income", value: fmt(appData.avg_monthly_income) },
                      { label: "Total Monthly Income", value: fmt(appData.total_monthly_income) },
                      { label: "Monthly Deduction", value: fmt(appData.monthly_deduction) },
                      { label: "Existing Obligations", value: fmt(appData.existing_monthly_obligations) },
                    ],
                  ].map((column, index) => (
                    <div key={index} className="space-y-0.5">
                      {column.map((field) => (
                        <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                          <span className="text-[#94A3B8] font-medium">{field.label}</span>
                          <span className="text-[#1E293B] font-bold text-right truncate max-w-[110px] xl:max-w-[145px]" title={String(field.value)}>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Work & Branch Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1E293B]">Work & Branch Details</h3>
                  <div className="flex items-center gap-4">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none">
                      <FileEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                      <Activity size={13} />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-8 text-xs font-semibold">
                  {[
                    [
                      { label: "Employer Name", value: appData.employer_name || "TCS Pvt. Ltd." },
                      { label: "Work Email", value: appData.work_email || "-" },
                    ],
                    [
                      { label: "Branch", value: appData.branch || "-" },
                      { label: "District", value: appData.district || "-" },
                    ],
                    [
                      { label: "State", value: appData.state || appData.current_state || "Maharashtra" },
                      { label: "Account Number", value: appData.account_number || "-" },
                    ],
                  ].map((column, index) => (
                    <div key={index} className="space-y-0.5">
                      {column.map((field) => (
                        <div key={field.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-4">
                          <span className="text-[#94A3B8] font-medium">{field.label}</span>
                          <span className="text-[#1E293B] font-bold text-right truncate max-w-[120px] xl:max-w-[170px]" title={String(field.value)}>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {false && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">

              {/* Left Column (Address & Loan details with underline styled fields) */}
              <div className="space-y-4">
                {/* Address Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-6 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5 text-[var(--primary,#2e3192)]">
                    <MapPin className="h-5 w-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Address Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 xl:gap-x-6 gap-y-4">
                    <FormUnderlineField label="Permanent Address 1" value={appData.permanent_address_line1} />
                    <FormUnderlineField label="Permanent Address 2" value={appData.permanent_address_line2} />
                    <FormUnderlineField label="City" value={appData.permanent_city} />
                    <FormUnderlineField label="State" value={appData.permanent_state} />
                    <FormUnderlineField label="Pincode" value={appData.permanent_pincode} />
                    <FormUnderlineField
                      label="Ownership"
                      value={firstPresent(
                        appData.permanent_residence_ownership,
                        appData.perm_residence_ownership,
                        appData.residence_ownership,
                        appData.perm_ownership,
                      )}
                    />
                  </div>

                  {appData.current_address_line1 ? (
                    <>
                      <div className="mt-6 border-b border-slate-100 pb-2 mb-4 text-[var(--primary,#2e3192)]">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Current Address</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 xl:gap-x-6 gap-y-4">
                        <FormUnderlineField label="Current Address 1" value={appData.current_address_line1} />
                        <FormUnderlineField label="Current Address 2" value={appData.current_address_line2} />
                        <FormUnderlineField label="Current City" value={appData.current_city} />
                        <FormUnderlineField label="Current State" value={appData.current_state} />
                        <FormUnderlineField label="Current Pincode" value={appData.current_pincode} />
                        <FormUnderlineField label="Current Ownership" value={appData.current_residence_ownership} />
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sameAddress"
                        checked
                        readOnly
                        className="h-4 w-4 rounded border-slate-200 text-[var(--primary,#2e3192)] focus:ring-[var(--primary,#2e3192)] cursor-default"
                      />
                      <label htmlFor="sameAddress" className="text-xs font-semibold text-slate-400 cursor-default">
                        My current address is the same as my permanent address
                      </label>
                    </div>
                  )}
                </div>

                {/* Loan Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-6 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5 text-[var(--primary,#2e3192)]">
                    <span className="text-lg font-bold">₹</span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Loan Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 xl:gap-x-6 gap-y-4">
                    <FormUnderlineField label="Loan Product" value={appData.loan_product} />
                    <FormUnderlineField label="Loan Scheme" value={appData.loan_scheme} />
                    <FormUnderlineField label="Requested Amount" value={fmt(appData.loan_amount_requested)} />
                    <FormUnderlineField label="Sanctioned Amount" value={fmt(appData.sanction_amount)} />
                    <FormUnderlineField label="Requested Tenure" value={appData.loan_period_requested} />
                    <FormUnderlineField label="Eligible Tenure" value={appData.eligible_tenure} />
                    <FormUnderlineField label="Interest Rate" value={appData.eligible_roi ? `${appData.eligible_roi}%` : "—"} />
                    <FormUnderlineField label="Monthly EMI" value={fmt(appData.eligible_emi)} />
                  </div>
                </div>

                {/* Income Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-6 shadow-xs mt-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5 text-[var(--primary,#2e3192)]">
                    <Activity className="h-5 w-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Income Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 xl:gap-x-6 gap-y-4">
                    <FormUnderlineField label="Avg Monthly Income" value={fmt(appData.avg_monthly_income)} />
                    <FormUnderlineField label="Total Monthly Income" value={fmt(appData.total_monthly_income)} />
                    <FormUnderlineField label="Monthly Deduction" value={fmt(appData.monthly_deduction)} />
                    <FormUnderlineField label="Existing Obligations" value={fmt(appData.existing_monthly_obligations)} />
                  </div>
                </div>
              </div>

              {/* Right Column (Personal, Contact, KYC and collapsible details) */}
              <div className="space-y-4">
                {/* Personal Profile & Contact Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-6 shadow-xs">
                  {/* Personal Details */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-[var(--primary,#2e3192)]">
                    <User className="h-5 w-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Personal Details</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    <InfoRowSimple label="First Name" value={appData.first_name} />
                    <InfoRowSimple label="Middle Name" value={appData.middle_name || "—"} />
                    <InfoRowSimple label="Last Name" value={appData.last_name} />
                    <InfoRowSimple label="Gender" value={appData.gender || "—"} />
                    <InfoRowSimple label="DOB" value={formatDob(appData.date_of_birth)} />
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-[var(--primary,#2e3192)]">
                    <Phone className="h-4 w-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Contact Info</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center text-xs py-0.5">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-300" /> Mobile</span>
                      <span className="font-bold text-slate-700">{appData.mobile || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-0.5">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-300" /> Email</span>
                      <span className="font-bold text-slate-700">{appData.work_email || "—"}</span>
                    </div>
                  </div>

                  {/* KYC Details */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-[var(--primary,#2e3192)]">
                    <Award className="h-5 w-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">KYC Details</h3>
                  </div>

                  <div className="space-y-3">
                    <InfoRowSimple label="PAN" value={appData.pan || "—"} />
                    <InfoRowSimple label="Aadhaar" value={appData.aadhaar_number || (appData.aadhaar ? `XXXX-XXXX-${appData.aadhaar}` : "—")} />
                    <InfoRowSimple label="KYC No." value={appData.cif_no ? `KYC-${appData.cif_no}` : "—"} />
                    <InfoRowSimple label="CKYC No." value={appData.cif_no ? `CKYC-${appData.cif_no}` : "—"} />
                    <InfoRowSimple label="Account Number" value={appData.account_number || "—"} />
                  </div>
                </div>

                {/* Collapsible More Personal Details */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <button
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-sm text-slate-800 border-b border-slate-200 cursor-pointer"
                  >
                    <span>More Personal Details</span>
                    {showMoreDetails ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>

                  {showMoreDetails && (
                    <div className="p-6 space-y-4 bg-white animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 xl:gap-x-6 gap-y-4">
                        <FormUnderlineField label="Occupation" value={appData.occupation} />
                        <FormUnderlineField label="Employer Name" value={appData.employer_name} />
                        <FormUnderlineField label="Work Email" value={appData.work_email} />
                        <FormUnderlineField label="Branch" value={appData.branch} />
                        <FormUnderlineField label="District" value={appData.district} />
                        <FormUnderlineField label="State" value={appData.state} />
                      </div>


                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === "Co-Applicants" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5 xl:gap-2.5 items-start animate-fade-slide-up">
              
              {/* Left Panel - List & Selection */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4 lg:col-span-1">
                {/* Save & Continue Button (Visible in Adding Mode) */}
                {isAddingCoapp && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // Save Form
                        if (!coappForm.firstName || !coappForm.lastName) {
                          alert("First Name and Last Name are required.");
                          return;
                        }
                        const newCoapp = {
                          coapplicant_id: `COAPP-MOCK-${Date.now()}`,
                          relationship: coappForm.relationship,
                          is_verified: true,
                          verification_status: "verified",
                          personal_details: JSON.stringify({
                            first_name: coappForm.firstName,
                            middle_name: coappForm.middleName,
                            last_name: coappForm.lastName,
                            gender: coappForm.gender === "Male" ? "M" : coappForm.gender === "Female" ? "F" : "O",
                            dob: coappForm.dob,
                            phone: coappForm.phone,
                            email_id: coappForm.email,
                            pan: coappForm.pan,
                            aadhaar: coappForm.aadhaar,
                            voter_id: coappForm.voterId,
                            passport_number: coappForm.passportNo,
                            address_line1: coappForm.addressLine1,
                            address_line2: coappForm.addressLine2,
                            landmark: coappForm.landmark,
                            pincode: coappForm.pincode,
                            state: coappForm.state,
                            city: coappForm.city
                          }),
                          income_details: JSON.stringify({}),
                          occupation_details: JSON.stringify({})
                        };
                        setCoapplicants([...coapplicants, newCoapp]);
                        setIsAddingCoapp(false);
                        setSelectedCoappIndex(coapplicants.filter(c => coappSubTab === "co-applicant" ? c.relationship !== "Guarantor" : c.relationship === "Guarantor").length);
                        // Reset Form
                        setCoappForm({
                          firstName: "",
                          middleName: "",
                          lastName: "",
                          gender: "Male",
                          dob: "",
                          relationship: "Co-borrower",
                          pan: "",
                          aadhaar: "",
                          voterId: "",
                          passportNo: "",
                          phone: "",
                          email: "",
                          addressLine1: "",
                          addressLine2: "",
                          landmark: "",
                          pincode: "",
                          state: "",
                          city: ""
                        });
                      }}
                      className="w-full h-10 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white font-bold text-xs rounded-lg shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send size={14} />
                      Save & Continue
                    </button>
                    <button
                      onClick={() => setIsAddingCoapp(false)}
                      className="w-full h-10 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all bg-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    {coappSubTab === "co-applicant" ? "Co-applicants" : "Guarantors"}
                  </h3>
                  {!isAddingCoapp && (
                    <button 
                      onClick={() => {
                        setIsAddingCoapp(true);
                        setCoappForm(prev => ({
                          ...prev,
                          relationship: coappSubTab === "co-applicant" ? "Co-borrower" : "Guarantor"
                        }));
                      }}
                      className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer bg-transparent border-none"
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* Subtabs Toggle */}
                <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                  <button
                    onClick={() => {
                      setCoappSubTab("co-applicant");
                      setSelectedCoappIndex(0);
                      setIsAddingCoapp(false);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer border-none
                      ${coappSubTab === "co-applicant"
                        ? "bg-white text-[#5F39F8] shadow-sm"
                        : "text-slate-500 hover:text-slate-800 bg-transparent"
                      }`}
                  >
                    Co-applicant
                  </button>
                  <button
                    onClick={() => {
                      setCoappSubTab("guarantor");
                      setSelectedCoappIndex(0);
                      setIsAddingCoapp(false);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer border-none
                      ${coappSubTab === "guarantor"
                        ? "bg-white text-[#5F39F8] shadow-sm"
                        : "text-slate-500 hover:text-slate-800 bg-transparent"
                      }`}
                  >
                    Guarantor
                  </button>
                </div>

                {/* List of Entries */}
                <div className="space-y-2">
                  {(() => {
                    const parseJsonField = (field: any) => {
                      if (typeof field === "string") {
                        try { return JSON.parse(field); } catch (e) { return {}; }
                      }
                      return field || {};
                    };

                    const filteredCoapps = coapplicants.filter(c => 
                      coappSubTab === "co-applicant" ? c.relationship !== "Guarantor" : c.relationship === "Guarantor"
                    );

                    if (filteredCoapps.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                            <User size={16} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 select-none">
                              No {coappSubTab === "co-applicant" ? "Co-applicants" : "Guarantors"} Yet
                            </div>
                            <button 
                              onClick={() => {
                                setIsAddingCoapp(true);
                                setCoappForm(prev => ({
                                  ...prev,
                                  relationship: coappSubTab === "co-applicant" ? "Co-borrower" : "Guarantor"
                                }));
                              }}
                              className="text-[10px] font-bold text-[#5F39F8] hover:underline cursor-pointer bg-transparent border-none mt-1"
                            >
                              Create First Entry
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return filteredCoapps.map((coapp, idx) => {
                      const personal = parseJsonField(coapp.personal_details);
                      const isSelected = !isAddingCoapp && selectedCoappIndex === idx;
                      return (
                        <button
                          key={coapp.coapplicant_id || idx}
                          onClick={() => {
                            setSelectedCoappIndex(idx);
                            setIsAddingCoapp(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-3 rounded-lg border text-left cursor-pointer transition-all
                            ${isSelected
                              ? "bg-indigo-50/50 border-[#5F39F8] text-[#5F39F8]"
                              : "bg-white border-[#E2E8F0] hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0
                            ${isSelected
                              ? "bg-white border-[#5F39F8] text-[#5F39F8]"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            {(personal.first_name?.[0] || "").toUpperCase()}
                            {(personal.last_name?.[0] || "").toUpperCase()}
                          </div>
                          <div className="truncate flex-1">
                            <div className="text-xs font-bold truncate">
                              {personal.first_name || ""} {personal.last_name || ""}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              {coapp.relationship || "Co-borrower"}
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Panel - Form Fields */}
              <div className="lg:col-span-3 space-y-2.5 xl:space-y-3">
                {isAddingCoapp ? (
                  /* ── Form View for Adding Co-applicant ── */
                  <>
                    {/* 1. PERSONAL DETAILS FORM */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <User className="h-4 w-4 text-[#5F39F8]" />
                        <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Personal Details</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                        {/* Avatar Block */}
                        <div className="flex flex-col items-center justify-center p-3 xl:p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 text-center gap-2 xl:gap-3 h-[140px] xl:h-[180px]">
                          <div className="h-14 w-14 rounded-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white">
                            <UploadCloud size={16} className="text-[#5F39F8] mb-0.5 animate-pulse" />
                            <span className="text-[8px] font-bold leading-none">No Image</span>
                            <span className="text-[7px] text-slate-400 scale-90 leading-none mt-0.5">(Optional)</span>
                          </div>
                          <button className="h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg cursor-pointer transition-all shadow-xs border-none select-none">
                            Upload Photo
                          </button>
                          <div className="text-[8px] text-slate-400 font-medium">JPG, PNG (Max. 2MB)</div>
                        </div>

                        {/* Fields */}
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 xl:gap-3 text-xs font-semibold">
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">First Name *</span>
                            <input 
                              type="text" 
                              placeholder="Enter First Name" 
                              value={coappForm.firstName}
                              onChange={(e) => setCoappForm({ ...coappForm, firstName: e.target.value })}
                              className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Middle Name</span>
                            <input 
                              type="text" 
                              placeholder="Middle Name" 
                              value={coappForm.middleName}
                              onChange={(e) => setCoappForm({ ...coappForm, middleName: e.target.value })}
                              className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Last Name *</span>
                            <input 
                              type="text" 
                              placeholder="Enter Last Name" 
                              value={coappForm.lastName}
                              onChange={(e) => setCoappForm({ ...coappForm, lastName: e.target.value })}
                              className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Gender</span>
                            <div className="relative">
                              <select 
                                value={coappForm.gender}
                                onChange={(e) => setCoappForm({ ...coappForm, gender: e.target.value })}
                                className="w-full h-10 pl-3 pr-8 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white appearance-none cursor-pointer"
                              >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Date of Birth</span>
                            <input 
                              type="date" 
                              value={coappForm.dob}
                              onChange={(e) => setCoappForm({ ...coappForm, dob: e.target.value })}
                              className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Relationship *</span>
                            <div className="relative">
                              {coappSubTab === "guarantor" ? (
                                <select 
                                  value={coappForm.relationship}
                                  onChange={(e) => setCoappForm({ ...coappForm, relationship: e.target.value })}
                                  className="w-full h-10 pl-3 pr-8 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white appearance-none cursor-pointer"
                                >
                                  <option>Guarantor</option>
                                </select>
                              ) : (
                                <select 
                                  value={coappForm.relationship}
                                  onChange={(e) => setCoappForm({ ...coappForm, relationship: e.target.value })}
                                  className="w-full h-10 pl-3 pr-8 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white appearance-none cursor-pointer"
                                >
                                  <option>Co-borrower</option>
                                  <option>Spouse</option>
                                  <option>Parent</option>
                                  <option>Sibling</option>
                                  <option>Child</option>
                                  <option>Relative</option>
                                  <option>Business Partner</option>
                                  <option>Other</option>
                                </select>
                              )}
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. IDENTIFICATION DETAILS FORM */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <ShieldCheck className="h-4 w-4 text-[#5F39F8]" />
                        <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Identification Details</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:gap-3 text-xs font-semibold">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">PAN</span>
                          <input 
                            type="text" 
                            placeholder="ABCDE1234F" 
                            value={coappForm.pan}
                            onChange={(e) => setCoappForm({ ...coappForm, pan: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Aadhaar</span>
                          <input 
                            type="text" 
                            placeholder="XXXX XXXX XXXX" 
                            value={coappForm.aadhaar}
                            onChange={(e) => setCoappForm({ ...coappForm, aadhaar: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Voter ID</span>
                          <input 
                            type="text" 
                            placeholder="Voter ID" 
                            value={coappForm.voterId}
                            onChange={(e) => setCoappForm({ ...coappForm, voterId: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Passport No.</span>
                          <input 
                            type="text" 
                            placeholder="Passport Number" 
                            value={coappForm.passportNo}
                            onChange={(e) => setCoappForm({ ...coappForm, passportNo: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. CONTACT DETAILS FORM */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Phone className="h-4 w-4 text-[#5F39F8]" />
                        <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Contact Details</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Mobile Number</span>
                          <input 
                            type="text" 
                            placeholder="+91 - " 
                            value={coappForm.phone}
                            onChange={(e) => setCoappForm({ ...coappForm, phone: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Email ID</span>
                          <input 
                            type="text" 
                            placeholder="Email Address" 
                            value={coappForm.email}
                            onChange={(e) => setCoappForm({ ...coappForm, email: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. ADDRESS DETAILS FORM */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#5F39F8]" />
                          <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Address Details</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="sameApplicantAddressForm"
                            checked={true}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-slate-200 text-[#5F39F8] focus:ring-[#5F39F8] cursor-default"
                          />
                          <label htmlFor="sameApplicantAddressForm" className="text-[10px] font-bold text-[#64748B] cursor-default select-none">
                            Same as Applicant Address
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Address Line 1</span>
                          <input 
                            type="text" 
                            placeholder="Flat/House No, Building Name" 
                            value={coappForm.addressLine1}
                            onChange={(e) => setCoappForm({ ...coappForm, addressLine1: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Address Line 2</span>
                          <input 
                            type="text" 
                            placeholder="Street, Locality" 
                            value={coappForm.addressLine2}
                            onChange={(e) => setCoappForm({ ...coappForm, addressLine2: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:gap-3 text-xs font-semibold">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Landmark</span>
                          <input 
                            type="text" 
                            placeholder="Landmark" 
                            value={coappForm.landmark}
                            onChange={(e) => setCoappForm({ ...coappForm, landmark: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Pincode</span>
                          <input 
                            type="text" 
                            placeholder="Pincode" 
                            value={coappForm.pincode}
                            onChange={(e) => setCoappForm({ ...coappForm, pincode: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">State</span>
                          <div className="relative">
                            <select 
                              value={coappForm.state}
                              onChange={(e) => setCoappForm({ ...coappForm, state: e.target.value })}
                              className="w-full h-10 pl-3 pr-8 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white appearance-none cursor-pointer"
                            >
                              <option>Select State</option>
                              <option>Maharashtra</option>
                              <option>Delhi</option>
                              <option>Karnataka</option>
                              <option>Gujarat</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">City</span>
                          <div className="relative">
                            <select 
                              value={coappForm.city}
                              onChange={(e) => setCoappForm({ ...coappForm, city: e.target.value })}
                              className="w-full h-10 pl-3 pr-8 border border-[#E2E8F0] focus:border-[#5F39F8] focus:outline-none rounded-lg text-xs font-semibold text-[#1E293B] bg-white appearance-none cursor-pointer"
                            >
                              <option>Select City</option>
                              <option>Pune</option>
                              <option>Mumbai</option>
                              <option>Bangalore</option>
                              <option>Ahmedabad</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Read-only Details View ── */
                  (() => {
                    const parseJsonField = (field: any) => {
                      if (typeof field === "string") {
                        try { return JSON.parse(field); } catch (e) { return {}; }
                      }
                      return field || {};
                    };

                    const filteredCoapps = coapplicants.filter(c => 
                      coappSubTab === "co-applicant" ? c.relationship !== "Guarantor" : c.relationship === "Guarantor"
                    );

                    if (filteredCoapps.length === 0 || !filteredCoapps[selectedCoappIndex]) {
                      return (
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-slate-400 font-medium text-xs shadow-sm">
                          Please select or add a {coappSubTab === "co-applicant" ? "co-applicant" : "guarantor"} to view details.
                        </div>
                      );
                    }

                    const coapp = filteredCoapps[selectedCoappIndex];
                    const personal = parseJsonField(coapp.personal_details);

                    const firstName = personal.first_name || "";
                    const middleName = personal.middle_name || "Kumar";
                    const lastName = personal.last_name || "";
                    const gender = personal.gender === "M" ? "Male" : personal.gender === "F" ? "Female" : personal.gender || "Male";
                    const dob = personal.dob || "1992-06-15";
                    const relationship = coapp.relationship || "Co-borrower";

                    const pan = personal.pan || "ABCDE1234F";
                    const aadhaar = personal.aadhaar || "XXXX XXXX XXXX";
                    const voterId = personal.voter_id || "Voter ID";
                    const passportNo = personal.passport_number || "Passport Number";

                    const mobileNumber = personal.phone || "+91 - ";
                    const emailId = personal.email_id || "Email Address";

                    const addressLine1 = personal.address_line1 || "Flat/House No, Building Name";
                    const addressLine2 = personal.address_line2 || "Street, Locality";
                    const landmark = personal.landmark || "Landmark";
                    const pincode = personal.pincode || "Pincode";
                    const state = personal.state || "Select State";
                    const city = personal.city || "Select City";

                    return (
                      <>
                        {/* 1. PERSONAL DETAILS */}
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-[#5F39F8]" />
                              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Personal Details</h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                            {/* Avatar Sub-block */}
                            <div className="flex flex-col items-center justify-center p-3 xl:p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 text-center gap-2 xl:gap-3 h-[140px] xl:h-[180px]">
                              <div className="h-14 w-14 rounded-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white">
                                <UploadCloud size={16} className="text-[#5F39F8] mb-0.5" />
                                <span className="text-[8px] font-bold leading-none">No Image</span>
                                <span className="text-[7px] text-slate-400 scale-90 leading-none mt-0.5">(Optional)</span>
                              </div>
                              <button className="h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg cursor-pointer transition-all shadow-xs border-none select-none">
                                Upload Photo
                              </button>
                              <div className="text-[8px] text-slate-400 font-medium">JPG, PNG (Max. 2MB)</div>
                            </div>

                            {/* Form Fields Sub-block */}
                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 xl:gap-3">
                              <FormInputLike label="First Name *" value={firstName} />
                              <FormInputLike label="Middle Name" value={middleName} />
                              <FormInputLike label="Last Name *" value={lastName} />
                              <FormInputLike label="Gender" value={gender} />
                              <FormInputLike label="Date of Birth" value={dob} />
                              <FormInputLike label="Relationship *" value={relationship} />
                            </div>
                          </div>
                        </div>

                        {/* 2. IDENTIFICATION DETAILS */}
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <ShieldCheck className="h-4 w-4 text-[#5F39F8]" />
                            <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Identification Details</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:gap-3">
                            <FormInputLike label="PAN" value={pan} />
                            <FormInputLike label="Aadhaar" value={aadhaar} />
                            <FormInputLike label="Voter ID" value={voterId} />
                            <FormInputLike label="Passport No." value={passportNo} />
                          </div>
                        </div>

                        {/* 3. CONTACT DETAILS */}
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Phone className="h-4 w-4 text-[#5F39F8]" />
                            <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Contact Details</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInputLike label="Mobile Number" value={mobileNumber} />
                            <FormInputLike label="Email ID" value={emailId} />
                          </div>
                        </div>

                        {/* 4. ADDRESS DETAILS */}
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 xl:p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#5F39F8]" />
                              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Address Details</h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                id="sameApplicantAddress"
                                checked={true}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-slate-200 text-[#5F39F8] focus:ring-[#5F39F8] cursor-default"
                              />
                              <label htmlFor="sameApplicantAddress" className="text-[10px] font-bold text-[#64748B] cursor-default select-none">
                                Same as Applicant Address
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInputLike label="Address Line 1" value={addressLine1} />
                            <FormInputLike label="Address Line 2" value={addressLine2} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:gap-3">
                            <FormInputLike label="Landmark" value={landmark} />
                            <FormInputLike label="Pincode" value={pincode} />
                            <FormInputLike label="State" value={state} />
                            <FormInputLike label="City" value={city} />
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {false && activeTab === "Documents" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              {/* Header block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Documents</h2>
                  <p className="text-xs text-slate-500 mt-1">View, manage and track all documents submitted for this application.</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button 
                    onClick={() => setActiveTab("Upload Documents")}
                    className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                  >
                    <FileText size={14} className="text-[#5F39F8]" />
                    <span>Document Checklist</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("Upload Documents")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F39F8] hover:bg-[#4C28D9] text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-md"
                  >
                    <UploadCloud size={14} />
                    <span>Upload Document</span>
                  </button>
                </div>
              </div>

              {/* Main content split grid */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
                
                {/* Left Column: Metric cards + category list table */}
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {/* Card 1: Total Documents */}
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Total Documents</div>
                        <div className="text-xl font-extrabold text-[#1E293B] mt-1">
                          {documents.length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <FileText size={16} className="text-[#5F39F8]" />
                      </div>
                    </div>

                    {/* Card 2: Verified */}
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Verified</div>
                        <div className="text-xl font-extrabold text-emerald-600 mt-1">
                          {documents.filter(d => d.is_verified === true).length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                    </div>

                    {/* Card 3: Pending Verification */}
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Pending Verification</div>
                        <div className="text-xl font-extrabold text-amber-600 mt-1">
                          {documents.filter(d => d.is_verified === null || d.is_verified === undefined || (d.verified_at === null && !d.is_verified)).length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Activity size={16} className="text-amber-500" />
                      </div>
                    </div>

                    {/* Card 4: Rejected */}
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Rejected</div>
                        <div className="text-xl font-extrabold text-red-600 mt-1">
                          {documents.filter(d => d.verified_at && d.is_verified === false).length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                        <AlertCircle size={16} className="text-red-500" />
                      </div>
                    </div>

                    {/* Card 5: Requested */}
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Requested</div>
                        <div className="text-xl font-extrabold text-[#5F39F8] mt-1">
                          {documents.filter(d => d.is_verified === "requested").length || 3}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-[#E2E8F0]/30 flex items-center justify-center">
                        <ArrowUpRight size={16} className="text-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Documents table / list */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-extrabold text-[#94A3B8] uppercase bg-slate-50/75 select-none">
                            <th className="px-5 py-3">Document Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Uploaded On</th>
                            <th className="px-4 py-3">Uploaded By</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Expiry Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-semibold">
                          {(["Identity & KYC", "Income", "Property", "Other"] as const).map(catName => {
                            const catDocs = documents.filter(d => getDocCategory(d) === catName);
                            const isExpanded = expandedCategories[catName];
                            
                            return (
                              <React.Fragment key={catName}>
                                {/* Category Header Row */}
                                <tr 
                                  onClick={() => setExpandedCategories(prev => ({ ...prev, [catName]: !isExpanded }))}
                                  className="bg-slate-50 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/80 transition-all"
                                >
                                  <td colSpan={7} className="px-5 py-2.5">
                                    <div className="flex items-center justify-between text-slate-700 font-bold text-xs">
                                      <span>{catName} ({catDocs.length})</span>
                                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                    </div>
                                  </td>
                                </tr>

                                {/* Category Documents Rows */}
                                {isExpanded && (
                                  catDocs.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-5 py-6 text-center text-slate-400 italic">No documents in this category.</td>
                                    </tr>
                                  ) : (
                                    catDocs.flatMap(doc => {
                                      const isSelected = (selectedDoc || documents[0])?.id === doc.id;
                                      const docStatus = doc.is_verified === true ? "verified" : doc.is_verified === false ? "rejected" : doc.is_verified === "requested" ? "requested" : "pending";
                                      
                                      const mainRow = (
                                        <tr 
                                          key={doc.id} 
                                          onClick={() => setSelectedDoc(doc)}
                                          className={`border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer ${isSelected ? "bg-indigo-50/20 border-l-2 border-l-[#5F39F8]" : ""}`}
                                        >
                                          <td className="px-5 py-3">
                                            <div className="font-bold text-slate-800 truncate max-w-[200px]" title={doc.file_name || doc.doc_type?.replace(/_/g, " ")}>
                                              {doc.file_name || doc.doc_type?.replace(/_/g, " ")}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-slate-500">{catName === "Income" ? "Income Proof" : catName}</td>
                                          <td className="px-4 py-3 text-slate-500">
                                            {doc.created_at || doc.verified_at ? new Date(doc.created_at || doc.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(doc.created_at || doc.verified_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "16 May 2024, 09:20 AM"}
                                          </td>
                                          <td className="px-4 py-3 text-slate-500">{doc.uploaded_by || "Rahul Sharma"}</td>
                                          <td className="px-4 py-3">
                                            {docStatus === "verified" && (
                                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-100">Verified</span>
                                            )}
                                            {docStatus === "pending" && (
                                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100">Pending Verification</span>
                                            )}
                                            {docStatus === "rejected" && (
                                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-100">Rejected</span>
                                            )}
                                            {docStatus === "requested" && (
                                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">Requested</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-slate-500">{doc.expiry_date || "-"}</td>
                                          <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                              <button 
                                                onClick={() => handleView(doc)}
                                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                                                title="View Document"
                                              >
                                                <Eye size={14} />
                                              </button>
                                              <button 
                                                onClick={() => handleDownload(doc)}
                                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                                                title="Download Document"
                                              >
                                                <Download size={14} />
                                              </button>
                                              
                                              {/* Verification action inside table if pending */}
                                              {docStatus === "pending" && (
                                                verifyingDocId === doc.id ? (
                                                  <span className="text-[10px] text-slate-400">...</span>
                                                ) : (
                                                  <div className="flex gap-1.5 ml-1">
                                                    <button 
                                                      onClick={() => handleVerifyDocument(doc.id, "approved")}
                                                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] rounded cursor-pointer transition-all"
                                                    >
                                                      Approve
                                                    </button>
                                                    <button 
                                                      onClick={() => {
                                                        setRejectionDocId(doc.id);
                                                        setRejectReason("");
                                                      }}
                                                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded cursor-pointer transition-all"
                                                    >
                                                      Reject
                                                    </button>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );

                                      // Rejection Reason row if rejecting
                                      const rejectRow = rejectionDocId === doc.id ? (
                                        <tr key={`reject-${doc.id}`} className="bg-red-50/30">
                                          <td colSpan={7} className="px-5 py-2">
                                            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/40 p-2">
                                              <input
                                                type="text"
                                                placeholder="Rejection reason..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="h-8 flex-1 rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                                              />
                                              <button
                                                onClick={() => handleVerifyDocument(doc.id, "rejected", rejectReason)}
                                                disabled={!rejectReason.trim()}
                                                className="rounded-lg bg-red-650 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer transition-all"
                                              >
                                                Confirm Reject
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setRejectionDocId(null);
                                                  setRejectReason("");
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : null;

                                      return [mainRow, rejectRow].filter(Boolean);
                                    })
                                  )
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 font-semibold select-none">
                      <div>Showing 1 to {documents.length} of {documents.length} documents</div>
                      <div className="flex items-center gap-2">
                        <button className="p-1 border border-slate-200 bg-white hover:bg-slate-50 rounded text-slate-400 cursor-not-allowed"><ChevronRight size={14} className="rotate-180" /></button>
                        <button className="px-2.5 py-1 bg-[#5F39F8] text-white font-bold rounded">1</button>
                        <button className="p-1 border border-slate-200 bg-white hover:bg-slate-50 rounded text-slate-400 cursor-not-allowed"><ChevronRight size={14} /></button>
                        <div className="flex items-center gap-1.5 ml-2">
                          <select className="border border-slate-200 bg-white px-2 py-1 rounded text-xs text-slate-600 font-semibold outline-none">
                            <option>20 / page</option>
                            <option>50 / page</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Selected Document Details Card */}
                <div className="sticky top-[104px]">
                  {(() => {
                    const activeDoc = selectedDoc || documents[0];
                    if (!activeDoc) {
                      return (
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm text-center text-slate-400 py-12 font-semibold text-xs">
                          No document selected.
                        </div>
                      );
                    }

                    const docStatus = activeDoc.is_verified === true ? "verified" : activeDoc.is_verified === false ? "rejected" : activeDoc.is_verified === "requested" ? "requested" : "pending";
                    
                    return (
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="font-bold text-slate-800 text-sm">Document Details</h3>
                        </div>

                        <div className="space-y-4 text-xs font-semibold">
                          {/* Header details with status */}
                          <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-800 truncate max-w-[130px]" title={activeDoc.file_name || activeDoc.doc_type?.replace(/_/g, " ")}>
                              {activeDoc.file_name || activeDoc.doc_type?.replace(/_/g, " ")}
                            </span>
                            {docStatus === "verified" && (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-150">Verified</span>
                            )}
                            {docStatus === "pending" && (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-150">Pending</span>
                            )}
                            {docStatus === "rejected" && (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-150">Rejected</span>
                            )}
                            {docStatus === "requested" && (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-150">Requested</span>
                            )}
                          </div>

                          {/* Details list */}
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Document ID</span>
                              <span className="text-slate-800 font-bold">DOC{activeDoc.id}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Category</span>
                              <span className="text-slate-800 font-bold">{getDocCategory(activeDoc)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Uploaded On</span>
                              <span className="text-slate-800 font-bold">
                                {activeDoc.created_at ? new Date(activeDoc.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "16 May 2024"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Uploaded By</span>
                              <span className="text-slate-800 font-bold">{activeDoc.uploaded_by || "Rahul Sharma"}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Verified On</span>
                              <span className="text-slate-800 font-bold">
                                {activeDoc.verified_at ? new Date(activeDoc.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Verified By</span>
                              <span className="text-slate-800 font-bold">{activeDoc.verified_by || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                              <span className="text-[#64748B] font-medium">Expiry Date</span>
                              <span className="text-slate-800 font-bold">{activeDoc.expiry_date || "-"}</span>
                            </div>
                          </div>

                          {/* Remarks */}
                          <div className="space-y-1">
                            <span className="text-[#64748B] font-medium block">Remarks</span>
                            <p className="text-slate-700 bg-slate-50/50 p-2 border border-slate-100 rounded-lg text-[11px] leading-relaxed">
                              {activeDoc.remarks || activeDoc.metadata?.remarks || "No remarks provided."}
                            </p>
                          </div>

                          {/* Rejection Reason inside Details card */}
                          {docStatus === "rejected" && activeDoc.metadata?.reject_reason && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-750">
                              Rejection Reason: {activeDoc.metadata.reject_reason}
                            </div>
                          )}

                          {/* Action button inside details */}
                          <button 
                            onClick={() => handleView(activeDoc)}
                            className="w-full h-9 border border-[#5F39F8] hover:bg-indigo-50 text-[#5F39F8] text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Eye size={13} />
                            <span>View Document</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {(activeTab === "Documents" || activeTab === "Upload Documents") && (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_260px] items-start">
              {/* Left/Main Column: Collapsible checklist + Upload Controls */}
              <div className="min-w-0 space-y-4">

                {/* 1. Mapped Documents Collapsible Checklist */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Mapped Documents <span className="font-semibold text-slate-400">({documents.length})</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Checklist of uploaded and pending files</p>
                    </div>

                    {/* Search Checklist */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={checklistSearchQuery}
                          onChange={(e) => setChecklistSearchQuery(e.target.value)}
                          placeholder="Search checklist..."
                          className="h-8 w-[200px] rounded-lg border border-slate-200 pl-8 text-xs focus:border-[var(--primary)] outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Groups */}
                  <div className="space-y-3">
                    {docGroups.map((group) => {
                      const isGroupOpen = openChecklistGroupId === group.id;
                      return (
                        <div key={group.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-3xs animate-in fade-in duration-200">
                          {/* Collapsible Header */}
                          <div className={`flex h-10 items-center justify-between px-4 ${group.header}`}>
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left flex-1"
                              onClick={() => setOpenChecklistGroupId(isGroupOpen ? null : group.id)}
                            >
                              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isGroupOpen ? "rotate-180" : ""}`} />
                              <span className={`text-xs font-bold uppercase tracking-wider ${group.heading}`}>{group.name}</span>
                              <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200/50">
                                {group.items.length}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Select category in upload form dynamically
                                const opt = group.id === "KYC" ? "KYC_PAN" : group.id === "LOAN" ? "LOAN_AGREEMENT" : group.id === "MORTGAGE" ? "PROPERTY_DEED" : "OTHER";
                                setUploadCategory(opt);
                              }}
                              className={`flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold shadow-3xs hover:bg-white transition-colors cursor-pointer border border-slate-200/55 ${group.heading}`}
                            >
                              <span className="text-sm font-semibold">+</span> Upload
                            </button>
                          </div>

                          {/* Collapsible Body using CSS Grid transition */}
                          <div className={`grid transition-all duration-300 ease-in-out ${isGroupOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="min-h-0 overflow-hidden">
                              <div className="border-t border-slate-100 overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-semibold">
                                      <th className="p-3 w-[40%] font-bold">Document Name</th>
                                      <th className="p-3 w-[25%] font-bold">Uploaded On</th>
                                      <th className="p-3 w-[20%] font-bold">Status</th>
                                      <th className="p-3 w-[15%] text-right font-bold">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {group.items.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                                          No documents found.
                                        </td>
                                      </tr>
                                    ) : (
                                      group.items.map((doc: any) => (
                                        <tr key={doc.id} className="hover:bg-slate-50/40 transition-colors">
                                          <td className="p-3">
                                            <div className="font-bold text-slate-800 text-[12px]">{doc.doc_type?.replace(/_/g, " ")}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[250px] truncate">{doc.file_name}</div>
                                          </td>
                                          <td className="p-3 text-slate-500 font-semibold">
                                            {doc.verified_at ? new Date(doc.verified_at).toLocaleDateString("en-IN") : "Just now"}
                                          </td>
                                          <td className="p-3">
                                            {getDocStatusPill(doc)}
                                          </td>
                                          <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() => handleView(doc)}
                                                className="rounded-lg p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[var(--primary)] transition-colors shadow-3xs cursor-pointer"
                                                title="View Document"
                                              >
                                                <Eye className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleDownload(doc)}
                                                className="rounded-lg p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[var(--primary)] transition-colors shadow-3xs cursor-pointer"
                                                title="Download Document"
                                              >
                                                <Download className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 3-Panel Upload Controls Grid */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-800">
                    Upload New Document
                  </h3>
                  <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Panel 1: Document Details */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-start">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">1. Document Details</h4>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-500">Document Type Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[var(--primary)] cursor-pointer shadow-3xs"
                        >
                          <optgroup label="KYC Documents">
                            <option value="KYC_PAN">PAN Card</option>
                            <option value="KYC_AADHAAR">Aadhaar Card</option>
                            <option value="KYC_PASSPORT">Passport</option>
                          </optgroup>
                          <optgroup label="Loan Documents">
                            <option value="LOAN_AGREEMENT">Loan Agreement</option>
                            <option value="BANK_STATEMENT">Bank Statement</option>
                            <option value="ITR">ITR Document</option>
                          </optgroup>
                          <optgroup label="Mortgage Documents">
                            <option value="PROPERTY_DEED">Property Deed</option>
                            <option value="PROPERTY_TAX">Property Tax Receipt</option>
                          </optgroup>
                          <optgroup label="Other">
                            <option value="OTHER">Other Document</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-500">Document Display Name</label>
                        <input
                          type="text"
                          value={uploadCategory.replace(/_/g, " ")}
                          disabled
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-100/70 px-3 text-xs font-semibold text-slate-400 outline-none shadow-3xs cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Panel 2: Upload File Zone */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col justify-start">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Upload File</h4>

                      <div
                        className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center hover:bg-slate-50 transition-colors shadow-3xs cursor-pointer min-h-[140px]"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <UploadCloud className="mb-2 h-8 w-8 text-[var(--primary,#2e3192)]" />
                        {selectedFile ? (
                          <div className="max-w-full">
                            <p className="text-xs text-slate-800 font-bold truncate max-w-[180px]">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-700 font-bold">Drag & drop or Click to browse</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">PDF, JPG, PNG (Max 10MB)</p>
                          </>
                        )}
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>

                    {/* Panel 3: Remarks & Submit */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col justify-between">
                      <div className="space-y-1.5 w-full">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">3. Add Remarks</h4>
                          <span className="text-[10px] font-semibold text-slate-400">{uploadRemarks.length}/500</span>
                        </div>
                        <textarea
                          value={uploadRemarks}
                          maxLength={500}
                          onChange={(e) => setUploadRemarks(e.target.value)}
                          placeholder="Enter audit remarks..."
                          className="min-h-[70px] w-full resize-none rounded-lg border border-slate-200 p-2.5 text-xs focus:border-[var(--primary)] outline-none shadow-3xs bg-white"
                          required
                        />
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setUploadRemarks(""); }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-3xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={uploading || !selectedFile}
                          className="h-9 w-full rounded-lg bg-[var(--primary,#2e3192)] text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-3xs transition-opacity"
                        >
                          {uploading ? "Uploading..." : "Upload & Submit"}
                        </button>
                      </div>
                    </div>

                  </form>
                </div>
              </div>

              {/* Right/Sidebar Column: categories timeline + flow info */}
              <div className="space-y-4">

                {/* Document Categories Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Categories Summary
                  </h4>
                  <div className="space-y-1.5">
                    {/* All Documents */}
                    <button
                      type="button"
                      onClick={() => setOpenChecklistGroupId(null)}
                      className={`grid grid-cols-[10px_1fr_auto] items-center gap-2.5 w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${openChecklistGroupId === null
                          ? "border-[var(--primary)] bg-[var(--primary-light)] font-bold text-[var(--primary)] shadow-3xs"
                          : "border-slate-100 hover:bg-slate-50 font-semibold text-slate-600"
                        }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-[var(--primary,#2e3192)]" />
                      <span>All Documents</span>
                      <span className="rounded bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200/50">
                        {documents.length}
                      </span>
                    </button>
                    {/* Individual categories */}
                    {docGroups.map((group) => {
                      const isSelected = openChecklistGroupId === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setOpenChecklistGroupId(group.id)}
                          className={`grid grid-cols-[10px_1fr_auto] items-center gap-2.5 w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${isSelected
                              ? "border-[var(--primary)] bg-[var(--primary-light)] font-bold text-[var(--primary)] shadow-3xs"
                              : "border-slate-100 hover:bg-slate-50 font-semibold text-slate-600"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                          <span>{group.label}</span>
                          <span className="rounded bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200/50">
                            {group.rawItems.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Document Flow Checklist */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Verification Flow
                  </h4>
                  <div className="relative space-y-4">
                    <div className="absolute left-[11px] top-3 h-[calc(100%-20px)] w-px bg-slate-200" />
                    {[
                      { 
                        label: "1. Upload File", 
                        desc: "Applicant uploads file on journey", 
                        color: ['uploading', 'under_review', 'approved', 'rejected'].includes(docFlowStatus) 
                          ? "bg-[var(--primary,#2e3192)] text-white border-2 border-[var(--primary,#2e3192)]" 
                          : "bg-white text-slate-400 border-2 border-slate-200",
                        textColor: ['uploading', 'under_review', 'approved', 'rejected'].includes(docFlowStatus) ? "text-slate-800" : "text-slate-400",
                        descColor: ['uploading', 'under_review', 'approved', 'rejected'].includes(docFlowStatus) ? "text-slate-500" : "text-slate-400"
                      },
                      { 
                        label: "2. Under Review", 
                        desc: "Audit queue evaluates validation check", 
                        color: ['under_review', 'approved', 'rejected'].includes(docFlowStatus) 
                          ? "bg-[#f59e0b] text-white border-2 border-[#f59e0b]" 
                          : "bg-white text-slate-400 border-2 border-slate-200",
                        textColor: ['under_review', 'approved', 'rejected'].includes(docFlowStatus) ? "text-slate-800" : "text-slate-400",
                        descColor: ['under_review', 'approved', 'rejected'].includes(docFlowStatus) ? "text-slate-500" : "text-slate-400"
                      },
                      { 
                        label: "3. Approved", 
                        desc: "Verified passes audit successfully", 
                        color: docFlowStatus === 'approved' 
                          ? "bg-[#10b981] text-white border-2 border-[#10b981]" 
                          : "bg-white text-slate-400 border-2 border-slate-200",
                        textColor: docFlowStatus === 'approved' ? "text-slate-800" : "text-slate-400",
                        descColor: docFlowStatus === 'approved' ? "text-slate-500" : "text-slate-400"
                      },
                      { 
                        label: "4. Rejected", 
                        desc: "Flagged error returns for re-upload", 
                        color: docFlowStatus === 'rejected' 
                          ? "bg-[#ef4444] text-white border-2 border-[#ef4444]" 
                          : "bg-white text-slate-400 border-2 border-slate-200",
                        textColor: docFlowStatus === 'rejected' ? "text-slate-800" : "text-slate-400",
                        descColor: docFlowStatus === 'rejected' ? "text-slate-500" : "text-slate-400"
                      },
                    ].map((step, index) => (
                      <div key={index} className="relative flex gap-2.5 items-start">
                        <span className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors ${step.color}`}>
                          {index + 1}
                        </span>
                        <div className="pt-0.5">
                          <p className={`text-xs font-bold leading-none ${step.textColor}`}>{step.label}</p>
                          <p className={`text-[10px] font-semibold mt-1 ${step.descColor}`}>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Legend */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Status Legend
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Approved / Passed", dot: "bg-green-500" },
                      { label: "Under Review / Audit", dot: "bg-amber-500" },
                      { label: "Uploaded / Pending", dot: "bg-blue-500" },
                      { label: "Rejected / Defect", dot: "bg-red-500" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "Equifax" && (
            <EquifaxReportFull 
              equifaxSummary={equifaxSummary} 
              appData={appData}
              onRefresh={handlePullEquifax} 
              pulling={pullingEquifax} 
              onViewFullReport={handleFetchFullReport} 
            />
          )}

          {activeTab === "Status History" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <SectionHeader title="Application Status History" />
                <span className="text-xs text-slate-400 font-semibold">Audit Trail of State Changes</span>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading history...</div>
              ) : historyError ? (
                <div className="py-12 text-center text-sm text-red-500">{historyError}</div>
              ) : statusHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No status changes recorded yet.</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 ml-4 space-y-8">
                  {statusHistory.map((item, idx) => {
                    const isExpanded = expandedHistoryIndex === idx;
                    return (
                      <div key={idx} className="relative">
                        {/* Timeline Dot */}
                        <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 transition-colors ${idx === 0 ? "border-orange-500 ring-4 ring-orange-50" : "border-[var(--primary,#2e3192)]"
                          }`} />

                        <div
                          onClick={() => setExpandedHistoryIndex(isExpanded ? null : idx)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-xs ${isExpanded
                              ? "border-[var(--primary,#2e3192)] bg-[var(--primary-light,#f0f4ff)]/20 animate-in fade-in duration-200"
                              : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                            } max-w-2xl`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--primary,#2e3192)] text-sm">{item.name}</span>
                              <span className="rounded-md bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                                {item.stage}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-semibold">
                                {item.performed_at ? new Date(item.performed_at).toLocaleString("en-IN") : "—"}
                              </span>
                              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-[var(--primary,#2e3192)]" : ""}`} />
                            </div>
                          </div>

                          {/* Expandable details */}
                          {isExpanded && (
                            <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-2 animate-in fade-in duration-200">
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-slate-400 font-medium">Stage:</span> <span className="font-bold text-slate-700">{item.stage}</span></div>
                                <div><span className="text-slate-400 font-medium">Status Code:</span> <span className="font-bold font-mono text-slate-700">{item.status_code}</span></div>
                                <div><span className="text-slate-400 font-medium">Performed By:</span> <span className="font-semibold text-slate-700">{item.performed_by ? `User #${item.performed_by}` : "System"}</span></div>
                                <div><span className="text-slate-400 font-medium">Date & Time:</span> <span className="font-semibold text-slate-700">{item.performed_at ? new Date(item.performed_at).toLocaleString("en-IN") : "—"}</span></div>
                              </div>
                              {item.remarks && (
                                <div className="mt-3 bg-white border border-slate-100 rounded-lg p-2.5 text-xs text-slate-500 italic">
                                  <span className="font-bold not-italic text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Remarks / Notes</span>
                                  "{item.remarks}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "Decision" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

              {/* Left Column: Dropdown Status Update */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5 text-[var(--primary,#2e3192)]">
                  <Activity className="h-5 w-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Change Application Status</h3>
                </div>

                {statusesLoading ? (
                  <div className="py-6 text-center text-sm font-semibold text-slate-500">Loading statuses...</div>
                ) : statusesError ? (
                  <div className="py-6 text-center text-sm text-red-500">{statusesError}</div>
                ) : (
                  <form onSubmit={handleUpdateStatus} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-500">Select Status</label>
                      <select
                        value={selectedStatusCode}
                        onChange={(e) => setSelectedStatusCode(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--primary,#2e3192)] cursor-pointer"
                      >
                        <option value="" disabled>Select status...</option>
                        {allStatuses.map((st) => (
                          <option key={st.id} value={st.code}>
                            {st.name} ({st.stage})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-500">Remarks / Comments</label>
                      <textarea
                        value={workflowRemarks}
                        onChange={(e) => setWorkflowRemarks(e.target.value)}
                        placeholder="Add comments regarding this transition..."
                        className="min-h-[100px] w-full resize-none rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-[var(--primary,#2e3192)]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingWorkflow || selectedStatusCode === (currentStatus?.status_code || "")}
                      className="h-10 w-full rounded-lg bg-[var(--primary,#2e3192)] text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {submittingWorkflow ? "Updating..." : "Update Status"}
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Final Approval Decision */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5 text-[var(--primary,#2e3192)]">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Final Approval Process</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submit sequential manager approvals for this loan application. Please select the action, enter your remarks, and click the final approval button.
                  </p>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-start gap-2 text-xs text-blue-700 leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                      <div>
                        <span className="font-bold">Current Status:</span>{" "}
                        <span className="font-semibold">{currentStatus ? `${currentStatus.name} (${currentStatus.stage})` : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Decision Action</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setApprovalAction("approve")}
                        disabled={currentStatus?.status_code !== "APPROVAL_PENDING"}
                        className={`h-9 rounded-lg text-xs font-bold transition-all border cursor-pointer ${approvalAction === "approve"
                            ? "bg-green-50 border-green-500 text-green-700 shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          } disabled:opacity-50`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalAction("reject")}
                        disabled={currentStatus?.status_code !== "APPROVAL_PENDING"}
                        className={`h-9 rounded-lg text-xs font-bold transition-all border cursor-pointer ${approvalAction === "reject"
                            ? "bg-red-50 border-red-500 text-red-700 shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          } disabled:opacity-50`}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalAction("refer_back")}
                        disabled={currentStatus?.status_code !== "APPROVAL_PENDING"}
                        className={`h-9 rounded-lg text-xs font-bold transition-all border cursor-pointer ${approvalAction === "refer_back"
                            ? "bg-amber-50 border-amber-500 text-amber-700 shadow-xs"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          } disabled:opacity-50`}
                      >
                        Refer Back
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Approval / Decision Remarks</label>
                    <textarea
                      value={workflowRemarks}
                      onChange={(e) => setWorkflowRemarks(e.target.value)}
                      placeholder="Add decision comments..."
                      className="min-h-[100px] w-full resize-none rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-[var(--primary,#2e3192)]"
                    />
                  </div>

                  <button
                    onClick={handleFinalApproval}
                    disabled={submittingWorkflow || currentStatus?.status_code !== "APPROVAL_PENDING"}
                    className={`h-10 w-full rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" :
                        approvalAction === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
                      } disabled:opacity-50`}
                  >
                    {submittingWorkflow ? "Processing..." : `Confirm ${approvalAction === "approve" ? "Approval" : approvalAction === "reject" ? "Rejection" : "Refer Back"}`}
                  </button>

                  {currentStatus?.status_code !== "APPROVAL_PENDING" && (
                    <p className="text-[10px] text-red-500 text-center font-semibold mt-2">
                      * Final Approval decision is only active when status is APPROVAL_PENDING.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === "Audit / Logs" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <SectionHeader title="CIBIL Hard Pull Logs (Legacy History)" />
                <button
                  onClick={() => { setBureauFetched(false); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ↻ Refresh
                </button>
              </div>

              {bureauLoading ? (
                <div className="py-10 text-center text-sm font-semibold text-slate-500">Loading logs...</div>
              ) : bureauError ? (
                <div className="py-10 text-center text-sm text-red-500">{bureauError}</div>
              ) : bureauData.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No CIBIL hard pull enquiries found.</div>
              ) : (
                <div className="space-y-3">
                  {bureauData.map((record: any) => {
                    const isExpanded = expandedUuid === record.uuid;
                    const scoreColor = record.cibil_score >= 750 ? "#16a34a" : record.cibil_score >= 650 ? "#d97706" : record.cibil_score ? "#ef4444" : "#64748b";
                    const scoreBg = record.cibil_score >= 750 ? "#dcfce7" : record.cibil_score >= 650 ? "#fef3c7" : record.cibil_score ? "#fee2e2" : "#f1f5f9";

                    return (
                      <div key={record.uuid} className={`rounded-xl border ${isExpanded ? "border-slate-300 bg-slate-50/50" : "border-slate-100 bg-slate-50/20 hover:bg-slate-50"}`}>
                        <div
                          className="grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 p-4"
                          onClick={() => setExpandedUuid(isExpanded ? null : record.uuid)}
                        >
                          <div>
                            <div className="text-[13px] font-bold font-mono text-slate-800">{record.member_reference_number || "—"}</div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {record.created_at ? new Date(record.created_at).toLocaleString("en-IN") : "—"}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">SCORE</div>
                            <span className="rounded-md px-2 py-0.5 text-[13px] font-bold" style={{ backgroundColor: scoreBg, color: scoreColor }}>
                              {record.cibil_score ?? "N/A"}
                            </span>
                          </div>

                          <div className="text-center">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">ENQUIRY AMT</div>
                            <span className="text-[13px] font-bold text-slate-850">
                              {record.enquiry_amount ? `₹${Number(record.enquiry_amount).toLocaleString("en-IN")}` : "—"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${record.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {record.status}
                            </span>
                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-2.5 border-t border-slate-200/50 p-4 text-[12px] bg-white rounded-b-xl animate-in fade-in duration-200">
                            <div className="flex flex-col"><span className="text-slate-400 font-semibold">UUID</span><span className="font-mono font-bold text-slate-700">{record.uuid}</span></div>
                            <div className="flex flex-col"><span className="text-slate-400 font-semibold">Applicant ID</span><span className="font-bold text-slate-700">{record.applicant_id}</span></div>
                            <div className="flex flex-col"><span className="text-slate-400 font-semibold">Purpose</span><span className="font-bold text-slate-700">{record.enquiry_purpose}</span></div>
                            <div className="flex flex-col"><span className="text-slate-400 font-semibold">User ID</span><span className="font-bold text-slate-700">{record.triggered_by_user_id}</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "CBS APIs" && (
            <div className="space-y-4">

              {/* Dedupe Check Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[var(--primary,#2e3192)]">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-800">CBS Deduplication Check</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Verify against Core Banking System</p>
                    </div>
                  </div>
                  {dedupeData && (
                    <button
                      onClick={() => setDedupeFetched(false)}
                      disabled={dedupeLoading || triggeringDedupe}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      ↻ Refresh
                    </button>
                  )}
                </div>

                {dedupeLoading ? (
                  <div className="py-10 text-center text-sm font-semibold text-slate-500">Retrieving dedupe logs...</div>
                ) : dedupeError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-center">
                    <p className="text-sm font-bold text-red-600 mb-2">Verification Failed</p>
                    <p className="text-xs text-red-500 mb-4">{dedupeError}</p>
                    <button onClick={handleTriggerDedupe} className="rounded-lg bg-[var(--primary,#2e3192)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 cursor-pointer">Retry</button>
                  </div>
                ) : !dedupeData ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center">
                    <p className="text-sm font-bold text-slate-700 mb-2">Verification Pending</p>
                    <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">A customer deduplication check has not been run. This checks PAN, Aadhaar, and Mobile against the CBS.</p>
                    <button
                      onClick={handleTriggerDedupe}
                      disabled={triggeringDedupe}
                      className="rounded-lg bg-[var(--primary,#2e3192)] px-5 py-2 text-xs font-bold text-white hover:opacity-90 cursor-pointer"
                    >
                      {triggeringDedupe ? "Running..." : "Run CBS Verification"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className={`flex items-start gap-3 rounded-lg border p-4 ${dedupeData.dedupe_status === 'new_customer' ? 'border-green-200 bg-green-50 text-green-700' :
                        dedupeData.dedupe_status === 'existing_customer' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                      <div className="font-bold mt-0.5">
                        {dedupeData.dedupe_status === 'new_customer' ? "✅" : dedupeData.dedupe_status === 'existing_customer' ? "👤" : "⚠️"}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold capitalize">{dedupeData.dedupe_status.replace('_', ' ')} Match</p>
                        <p className="text-[11px] mt-1 opacity-90">{dedupeData.message || "Result verified from Core Banking."}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Profile Details</p>
                        <div className="space-y-2 text-[12px]">
                          <div className="flex justify-between"><span className="text-slate-400 font-semibold">CBS ID</span><span className="font-bold text-slate-700">{dedupeData.cbs_customer_id || "N/A"}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-semibold">CBS Name</span><span className="font-bold text-slate-700">{dedupeData.customer_name || "N/A"}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-semibold">Type</span><span className="font-bold text-slate-700 capitalize">{dedupeData.customer_type || "Applicant"}</span></div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={handleTriggerDedupe}
                            disabled={triggeringDedupe}
                            className="rounded-lg border border-[var(--primary,#2e3192)] bg-[var(--primary-light,#f0f4ff)] px-4 py-1.5 text-xs font-semibold text-[var(--primary,#2e3192)] hover:opacity-90 cursor-pointer"
                          >
                            Re-verify
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CBS Confidence Match Score</p>
                        <p className="text-3xl font-black mt-3" style={{ color: dedupeData.match_score >= 100 ? '#16a34a' : '#f59e0b' }}>
                          {dedupeData.match_score ?? 0}%
                        </p>
                        <div className="mt-4 w-full flex justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                          <span>Checked At</span>
                          <span className="font-bold text-slate-500">{dedupeData.checked_at || "Just now"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "Contact & Address" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              
              {/* Contact Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <Phone className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Contact Information</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Mobile Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">9876543210</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Landline</span>
                      <span className="text-xs font-bold text-[#1E293B]">020-1234567</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Communication Preference</span>
                      <span className="text-xs font-bold text-[#1E293B]">Email, SMS, WhatsApp</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Alternate Mobile</span>
                      <span className="text-xs font-bold text-[#1E293B]">9123456780</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Preferred Contact Time</span>
                      <span className="text-xs font-bold text-[#1E293B]">10:00 AM - 06:00 PM</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">WhatsApp Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">9876543210</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Email ID</span>
                      <span className="text-xs font-bold text-[#1E293B]">rahul.sharma@email.com</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Preferred Language</span>
                      <span className="text-xs font-bold text-[#1E293B]">English</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Address */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Current Address</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Address Line 1</span>
                      <span className="text-xs font-bold text-[#1E293B]">Flat No. 101, Maple Heights,</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">City</span>
                      <span className="text-xs font-bold text-[#1E293B]">Pune</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Residence Type</span>
                      <span className="text-xs font-bold text-[#1E293B]">Owned</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Address Line 2</span>
                      <span className="text-xs font-bold text-[#1E293B]">Baner Road, Near D Mart</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">District</span>
                      <span className="text-xs font-bold text-[#1E293B]">Pune</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Staying Since</span>
                      <span className="text-xs font-bold text-[#1E293B]">5 Years</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Landmark</span>
                      <span className="text-xs font-bold text-[#1E293B]">Near D Mart</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">State</span>
                      <span className="text-xs font-bold text-[#1E293B]">Maharashtra</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Ownership</span>
                      <span className="text-xs font-bold text-[#1E293B]">Self</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Locality</span>
                      <span className="text-xs font-bold text-[#1E293B]">Baner</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Country</span>
                      <span className="text-xs font-bold text-[#1E293B]">India</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Village</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">PIN Code</span>
                      <span className="text-xs font-bold text-[#1E293B]">411045</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 border border-purple-100">
                      <MapPin className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1E293B]">Permanent Address</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Same as Current Address</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Address Line 1</span>
                      <span className="text-xs font-bold text-[#1E293B]">Flat No. 101, Maple Heights,</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">City</span>
                      <span className="text-xs font-bold text-[#1E293B]">Pune</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">State</span>
                      <span className="text-xs font-bold text-[#1E293B]">Maharashtra</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">PIN Code</span>
                      <span className="text-xs font-bold text-[#1E293B]">411045</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Country</span>
                      <span className="text-xs font-bold text-[#1E293B]">India</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Address Line 2</span>
                      <span className="text-xs font-bold text-[#1E293B]">Baner Road, Near D Mart</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Address */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <Building2 className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Office Address</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Company Name</span>
                      <span className="text-xs font-bold text-[#1E293B]">TCS Pvt. Ltd.</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">City</span>
                      <span className="text-xs font-bold text-[#1E293B]">Pune</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Country</span>
                      <span className="text-xs font-bold text-[#1E293B]">India</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Building</span>
                      <span className="text-xs font-bold text-[#1E293B]">TCS House, Ravet</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">State</span>
                      <span className="text-xs font-bold text-[#1E293B]">Maharashtra</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-start-1">
                      <span className="text-[10px] font-bold text-[#64748B]">Landmark</span>
                      <span className="text-xs font-bold text-[#1E293B]">Near Decathlon</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#64748B]">PIN Code</span>
                      <span className="text-xs font-bold text-[#1E293B]">411057</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Identity & KYC" && (
            <div className="space-y-2 animate-fade-slide-up">

              {/* Identity Documents */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-xs font-bold text-[#1E293B]">Identity Documents</h3>
                  </div>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                    <span className="text-sm leading-none">+</span>
                    <span>Add Document</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Document Type</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Document Number</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Issue Date</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Expiry Date</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Name on Document</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Verification Status</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">OCR Status</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Verified By</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { type: "Aadhaar", number: "XXXX XXXX 3452", issue: "12/05/2015", expiry: "–", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                        { type: "PAN", number: appData.pan || "XXXXXX234F", issue: "18/07/2018", expiry: "–", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                        { type: "Passport", number: "Z1234567", issue: "10/02/2020", expiry: "09/02/2030", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                        { type: "Driving License", number: "MH12 20100123456", issue: "22/03/2016", expiry: "21/03/2036", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                      ].map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-1.5 font-semibold text-[#1E293B]">{doc.type}</td>
                          <td className="px-3 py-1.5 font-mono text-[#475569]">{doc.number}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{doc.issue}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{doc.expiry}</td>
                          <td className="px-3 py-1.5 font-semibold text-[#1E293B]">{doc.name}</td>
                          <td className="px-3 py-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {doc.verStatus}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">{doc.ocrStatus}</span>
                          </td>
                          <td className="px-3 py-1.5 text-[#475569] font-semibold">{doc.verBy}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <button className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer" title="View">
                                <Eye className="h-3 w-3" />
                              </button>
                              <button className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer" title="Download">
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Address Proof Documents */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <h3 className="text-xs font-bold text-[#1E293B]">Address Proof Documents</h3>
                  </div>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                    <span className="text-sm leading-none">+</span>
                    <span>Add Document</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Document Type</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Document Number</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Issue Date</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Expiry Date</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Name on Document</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Verification Status</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">OCR Status</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Verified By</th>
                        <th className="text-left px-3 py-1.5 text-[#94A3B8] font-bold uppercase tracking-wider text-[9px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { type: "Aadhaar", number: "XXXX XXXX 3452", issue: "12/05/2015", expiry: "–", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                        { type: "Electricity Bill", number: "EB1234567890", issue: "01/05/2024", expiry: "–", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                        { type: "Rent Agreement", number: "RA2024-25/001", issue: "15/04/2024", expiry: "14/04/2025", name: appData.first_name + " " + appData.last_name, verStatus: "Verified", ocrStatus: "Success", verBy: "System" },
                      ].map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-1.5 font-semibold text-[#1E293B]">{doc.type}</td>
                          <td className="px-3 py-1.5 font-mono text-[#475569]">{doc.number}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{doc.issue}</td>
                          <td className="px-3 py-1.5 text-[#475569]">{doc.expiry}</td>
                          <td className="px-3 py-1.5 font-semibold text-[#1E293B]">{doc.name}</td>
                          <td className="px-3 py-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {doc.verStatus}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">{doc.ocrStatus}</span>
                          </td>
                          <td className="px-3 py-1.5 text-[#475569] font-semibold">{doc.verBy}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <button className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer" title="View">
                                <Eye className="h-3 w-3" />
                              </button>
                              <button className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer" title="Download">
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KYC Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-xs font-bold text-[#1E293B]">KYC Information</h3>
                  </div>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                    <Activity className="h-3 w-3 text-[#94A3B8]" />
                    <span>History</span>
                  </button>
                </div>
                <div className="px-4 py-2.5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-x-4 xl:gap-x-6 gap-y-2">
                    {[
                      { label: "CKYC Number", value: "123456789012", badge: false },
                      { label: "Face Match Score", value: "98%", badge: false },
                      { label: "FATCA Status", value: "Compliant", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "CKYC Status", value: "Completed", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "Liveness Detection", value: "Passed", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "KYC Completed On", value: "14 May 2024, 09:20 AM", badge: false },
                      { label: "CKYC Download Date", value: "14 May 2024, 09:15 AM", badge: false },
                      { label: "Video KYC Status", value: "Completed", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "KYC Completed By", value: "System", badge: false },
                      { label: "Aadhaar Authentication", value: "Verified", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "AML Status", value: "Clear", badge: true, color: "bg-blue-50 text-blue-700 border-blue-100" },
                      { label: "KYC Source", value: "eKYC", badge: false },
                      { label: "PAN Verification", value: "Verified", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "PEP Status", value: "Clear", badge: true, color: "bg-blue-50 text-blue-700 border-blue-100" },
                      { label: "Risk Category", value: "Low", badge: false },
                      { label: "DigiLocker Verification", value: "Verified", badge: true, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { label: "Sanction Screening", value: "Clear", badge: true, color: "bg-blue-50 text-blue-700 border-blue-100" },
                      { label: "Risk Grade", value: "Low", badge: false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider leading-tight">{item.label}</span>
                        {item.badge ? (
                          <span className={`inline-flex self-start items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${item.color}`}>{item.value}</span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#1E293B] leading-tight">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Verification */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
                    <Search className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <h3 className="text-xs font-bold text-[#1E293B]">Additional Verification</h3>
                </div>
                <div className="px-4 py-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "EPFO Verification", status: "Not Applicable", color: "text-slate-400", bg: "" },
                      { label: "Voter ID Verification", status: "Verified", color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-100" },
                      { label: "GST Verification", status: "Not Applicable", color: "text-slate-400", bg: "" },
                      { label: "RC Verification", status: "Not Applicable", color: "text-slate-400", bg: "" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{item.label}</span>
                        {item.bg ? (
                          <span className={`inline-flex self-start items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${item.bg} ${item.color}`}>{item.status}</span>
                        ) : (
                          <span className={`text-[11px] font-bold ${item.color}`}>{item.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Employment / Business" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              
              {/* Employment / Business Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <Briefcase className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Employment / Business Details</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <h4 className="text-xs font-bold text-[#64748B]">Employment Type</h4>
                    <span className="px-2.5 py-1 rounded bg-[#F1F5F9] text-[#5F39F8] text-[10px] font-bold">Salaried</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Employer Name</span>
                      <span className="text-xs font-bold text-[#1E293B]">TCS Pvt. Ltd.</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Total Experience</span>
                      <span className="text-xs font-bold text-[#1E293B]">6 Years 11 Months</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Monthly Gross Salary</span>
                      <span className="text-xs font-bold text-[#1E293B]">₹ 1,20,000</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Employer Category</span>
                      <span className="text-xs font-bold text-[#1E293B]">Private Limited</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Experience in Current Org.</span>
                      <span className="text-xs font-bold text-[#1E293B]">5 Years 11 Months</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Net Salary (In Hand)</span>
                      <span className="text-xs font-bold text-[#1E293B]">₹ 1,00,000</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Employee ID</span>
                      <span className="text-xs font-bold text-[#1E293B]">TCS98765</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Salary Mode</span>
                      <span className="text-xs font-bold text-[#1E293B]">Bank Transfer</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Incentives (Monthly Avg.)</span>
                      <span className="text-xs font-bold text-[#1E293B]">₹ 10,000</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Department</span>
                      <span className="text-xs font-bold text-[#1E293B]">IT Services</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Salary Account</span>
                      <span className="text-xs font-bold text-[#1E293B]">HDFC Bank - 50100012345678</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Annual Bonus</span>
                      <span className="text-xs font-bold text-[#1E293B]">₹ 1,20,000</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Designation</span>
                      <span className="text-xs font-bold text-[#1E293B]">Senior Software Engineer</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">PF Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">PY/PN/1234567/000/000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Variable Pay</span>
                      <span className="text-xs font-bold text-[#1E293B]">₹ 60,000</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Date of Joining</span>
                      <span className="text-xs font-bold text-[#1E293B]">15/06/2018</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">ESI Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">Not Applicable</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Employment Status</span>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Permanent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Self Employed / Business Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden opacity-60 pointer-events-none">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1E293B]">Self Employed / Business Details</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Not Applicable</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Business Name</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Business Vintage</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Number of Employees</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Constitution</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Nature of Business</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Business Category</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">GST Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Annual Turnover</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Udyam Number</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">PAN</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Net Profit (Last FY)</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Banking Vintage</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">CIN</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Business Address</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Employment Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Additional Employment Information</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 xl:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Source of Income</span>
                      <span className="text-xs font-bold text-[#1E293B]">Salary</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Work Location</span>
                      <span className="text-xs font-bold text-[#1E293B]">Pune, Maharashtra</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Income Stability</span>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Stable</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Probation Completed</span>
                      <span className="text-xs font-bold text-[#1E293B]">Yes</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Notice Period</span>
                      <span className="text-xs font-bold text-[#1E293B]">90 Days</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Any Previous Employment Gap</span>
                      <span className="text-xs font-bold text-[#1E293B]">No</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Gap Duration</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Reason for Gap</span>
                      <span className="text-xs font-bold text-[#1E293B]">-</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Income Documents */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <FileText className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Income Documents</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[#64748B] font-bold">
                      <tr>
                        <th className="px-5 py-3 border-b border-slate-100">Document Type</th>
                        <th className="px-5 py-3 border-b border-slate-100">Document Number</th>
                        <th className="px-5 py-3 border-b border-slate-100">Issue Date</th>
                        <th className="px-5 py-3 border-b border-slate-100">Verified By</th>
                        <th className="px-5 py-3 border-b border-slate-100">Verification Status</th>
                        <th className="px-5 py-3 border-b border-slate-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Salary Slip (Latest)</td>
                        <td className="px-5 py-3">SLIP-MAY-2024</td>
                        <td className="px-5 py-3">31/05/2024</td>
                        <td className="px-5 py-3">System</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">Verified</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Eye size={14} className="text-[#5F39F8] cursor-pointer" />
                            <Download size={14} className="text-[#64748B] cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Form 16 (AY 2023-24)</td>
                        <td className="px-5 py-3">F16-2324-001</td>
                        <td className="px-5 py-3">15/06/2024</td>
                        <td className="px-5 py-3">System</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">Verified</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Eye size={14} className="text-[#5F39F8] cursor-pointer" />
                            <Download size={14} className="text-[#64748B] cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">ITR (AY 2023-24)</td>
                        <td className="px-5 py-3">ITR-2324-001</td>
                        <td className="px-5 py-3">31/07/2024</td>
                        <td className="px-5 py-3">System</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">Verified</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Eye size={14} className="text-[#5F39F8] cursor-pointer" />
                            <Download size={14} className="text-[#64748B] cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Offer Letter</td>
                        <td className="px-5 py-3">OFFER-TCS-001</td>
                        <td className="px-5 py-3">10/06/2018</td>
                        <td className="px-5 py-3">System</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">Verified</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Eye size={14} className="text-[#5F39F8] cursor-pointer" />
                            <Download size={14} className="text-[#64748B] cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Financial Profile" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              
              {/* Financial Summary */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <Landmark className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Financial Summary</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                      <span className="text-[#5F39F8]">Edit</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                      <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 text-center md:text-left">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Total Annual Income (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">18,00,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Monthly Income (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">1,50,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Total Monthly Expenses (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">70,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Total Assets (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">55,50,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Total Liabilities (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">28,00,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#94A3B8]">Net Worth (₹)</span>
                      <span className="text-xs font-bold text-[#1E293B]">27,50,000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial detail cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-2.5 xl:gap-3 items-start">
                
                {/* Income Details */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                        <Wallet className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Income Details</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                        <span className="text-[#5F39F8]">Edit</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto">
                    <table className="min-w-[520px] w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[#64748B] font-bold">
                        <tr>
                          <th className="px-5 py-3 border-b border-slate-100">Income Type</th>
                          <th className="px-5 py-3 border-b border-slate-100">Annual Income (₹)</th>
                          <th className="px-5 py-3 border-b border-slate-100">Monthly Income (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Salary Income</td>
                          <td className="px-5 py-3">12,00,000</td>
                          <td className="px-5 py-3">1,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Business Income</td>
                          <td className="px-5 py-3">-</td>
                          <td className="px-5 py-3">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Rental Income</td>
                          <td className="px-5 py-3">2,40,000</td>
                          <td className="px-5 py-3">20,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Agricultural Income</td>
                          <td className="px-5 py-3">-</td>
                          <td className="px-5 py-3">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Pension</td>
                          <td className="px-5 py-3">-</td>
                          <td className="px-5 py-3">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Other Income</td>
                          <td className="px-5 py-3">3,60,000</td>
                          <td className="px-5 py-3">30,000</td>
                        </tr>
                        <tr className="hover:bg-indigo-50/50 transition-colors bg-indigo-50/30">
                          <td className="px-5 py-3 text-[#5F39F8] font-extrabold">Total Income</td>
                          <td className="px-5 py-3 text-[#5F39F8] font-extrabold">18,00,000</td>
                          <td className="px-5 py-3 text-[#5F39F8] font-extrabold">1,50,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 border border-pink-100">
                        <Receipt className="h-4 w-4 text-pink-600" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Monthly Expenses</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <FileEdit className="h-3.5 w-3.5 text-[#5F39F8]" />
                        <span className="text-[#5F39F8]">Edit</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <Activity className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto">
                    <table className="min-w-[420px] w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[#64748B] font-bold">
                        <tr>
                          <th className="px-5 py-3 border-b border-slate-100">Expense Type</th>
                          <th className="px-5 py-3 border-b border-slate-100">Monthly Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Household Expenses</td>
                          <td className="px-5 py-3">25,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">EMI</td>
                          <td className="px-5 py-3">22,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Rent</td>
                          <td className="px-5 py-3">10,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">School Fees</td>
                          <td className="px-5 py-3">5,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Utility Bills</td>
                          <td className="px-5 py-3">4,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Insurance</td>
                          <td className="px-5 py-3">2,500</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Credit Card Payment</td>
                          <td className="px-5 py-3">1,500</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">Other Expenses</td>
                          <td className="px-5 py-3">-</td>
                        </tr>
                        <tr className="hover:bg-indigo-50/50 transition-colors bg-indigo-50/30">
                          <td className="px-5 py-3 text-[#5F39F8] font-extrabold">Total Expenses</td>
                          <td className="px-5 py-3 text-[#5F39F8] font-extrabold">70,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Assets */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                        <Building2 className="h-4 w-4 text-[#5F39F8]" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Assets</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <FileEdit className="h-3 w-3 text-[#5F39F8]" />
                        <span className="text-[#5F39F8]">Edit</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <Activity className="h-3 w-3 text-[#94A3B8]" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto">
                    <table className="min-w-[420px] w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-[#64748B] font-bold">
                        <tr>
                          <th className="px-4 py-2 border-b border-slate-100">Asset Type</th>
                          <th className="px-4 py-2 border-b border-slate-100">Value (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">House</td>
                          <td className="px-4 py-2.5">25,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Flat</td>
                          <td className="px-4 py-2.5">15,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Land</td>
                          <td className="px-4 py-2.5">5,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Commercial Property</td>
                          <td className="px-4 py-2.5">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Vehicle</td>
                          <td className="px-4 py-2.5">6,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Gold</td>
                          <td className="px-4 py-2.5">2,50,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">FD</td>
                          <td className="px-4 py-2.5">1,50,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Mutual Funds</td>
                          <td className="px-4 py-2.5">2,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Shares</td>
                          <td className="px-4 py-2.5">1,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Insurance Value</td>
                          <td className="px-4 py-2.5">2,50,000</td>
                        </tr>
                        <tr className="hover:bg-indigo-50/50 transition-colors bg-indigo-50/30">
                          <td className="px-4 py-2.5 text-[#5F39F8] font-extrabold">Total Assets</td>
                          <td className="px-4 py-2.5 text-[#5F39F8] font-extrabold">55,50,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Liabilities</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <FileEdit className="h-3 w-3 text-[#5F39F8]" />
                        <span className="text-[#5F39F8]">Edit</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <Activity className="h-3 w-3 text-[#94A3B8]" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto">
                    <table className="min-w-[420px] w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-[#64748B] font-bold">
                        <tr>
                          <th className="px-4 py-2 border-b border-slate-100">Liability Type</th>
                          <th className="px-4 py-2 border-b border-slate-100">Outstanding Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Existing Loans</td>
                          <td className="px-4 py-2.5">18,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Credit Card Outstanding</td>
                          <td className="px-4 py-2.5">50,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Mortgage</td>
                          <td className="px-4 py-2.5">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Personal Loan</td>
                          <td className="px-4 py-2.5">5,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Vehicle Loan</td>
                          <td className="px-4 py-2.5">3,00,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Gold Loan</td>
                          <td className="px-4 py-2.5">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Business Loan</td>
                          <td className="px-4 py-2.5">1,50,000</td>
                        </tr>
                        <tr className="hover:bg-indigo-50/50 transition-colors bg-indigo-50/30">
                          <td className="px-4 py-2.5 text-[#5F39F8] font-extrabold">Total Liabilities</td>
                          <td className="px-4 py-2.5 text-[#5F39F8] font-extrabold">28,00,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Ratios */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                        <PieChart className="h-4 w-4 text-teal-600" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Financial Ratios</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <FileEdit className="h-3 w-3 text-[#5F39F8]" />
                        <span className="text-[#5F39F8]">Edit</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                        <Activity className="h-3 w-3 text-[#94A3B8]" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto">
                    <table className="min-w-[360px] w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-[#64748B] font-bold">
                        <tr>
                          <th className="px-4 py-2 border-b border-slate-100">Ratio</th>
                          <th className="px-4 py-2 border-b border-slate-100">Value</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Debt to Income Ratio (DTI)</td>
                          <td className="px-4 py-2.5">30.56%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Debt to Asset Ratio</td>
                          <td className="px-4 py-2.5">50.45%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Savings Ratio</td>
                          <td className="px-4 py-2.5">53.33%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">EMI to Income Ratio</td>
                          <td className="px-4 py-2.5">14.67%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">Credit Utilization Ratio</td>
                          <td className="px-4 py-2.5">32.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "Banking Details" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              
              {/* Banking Summary */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <Landmark className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Banking Summary <span className="text-[10px] text-[#64748B] font-medium ml-1">(via Account Aggregator)</span></h3>
                    <AlertCircle className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Synced</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#64748B]">16 May 2024, 09:45 AM</span>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#5F39F8] text-xs font-bold rounded-lg cursor-pointer transition-all">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Sync Now</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Total Linked Accounts</span>
                    <span className="text-xs font-bold text-[#1E293B]">3</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Total Monthly Credits (Avg)</span>
                    <span className="text-xs font-bold text-[#1E293B]">₹ 1,85,000</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Total Monthly Debits (Avg)</span>
                    <span className="text-xs font-bold text-[#1E293B]">₹ 1,23,000</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Average Balance (Avg)</span>
                    <span className="text-xs font-bold text-[#1E293B]">₹ 1,25,000</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Cash Flow Surplus (Avg)</span>
                    <span className="text-xs font-bold text-green-600">₹ 62,000</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94A3B8]">Data Fetched For</span>
                    <span className="text-xs font-bold text-[#1E293B]">12 Months</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50 mt-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[#5F39F8]" />
                    <span className="text-xs text-indigo-900">Data securely fetched from your bank accounts through Account Aggregator with your consent.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-indigo-900"><span className="font-bold">AA Consent ID:</span> 6f3e2a8...1c9d</span>
                    <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1">
                      View Consent <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Linked Bank Accounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1E293B]">Linked Bank Accounts</h3>
                  <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1 cursor-pointer">
                    + Add Account
                  </button>
                </div>
                
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[#64748B] font-bold">
                      <tr>
                        <th className="px-5 py-3 border-b border-slate-100">#</th>
                        <th className="px-5 py-3 border-b border-slate-100">Bank Name</th>
                        <th className="px-5 py-3 border-b border-slate-100">Account Number</th>
                        <th className="px-5 py-3 border-b border-slate-100">Account Type</th>
                        <th className="px-5 py-3 border-b border-slate-100">Linked On</th>
                        <th className="px-5 py-3 border-b border-slate-100">Status</th>
                        <th className="px-5 py-3 border-b border-slate-100">Data Available For</th>
                        <th className="px-5 py-3 border-b border-slate-100">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">1</td>
                        <td className="px-5 py-3 flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-[10px] text-blue-600">H</div>
                          HDFC Bank
                        </td>
                        <td className="px-5 py-3">5010 0012 3456 78</td>
                        <td className="px-5 py-3">Savings</td>
                        <td className="px-5 py-3">16 May 2024</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-200/50">Active</span></td>
                        <td className="px-5 py-3">Apr 2023 – May 2024</td>
                        <td className="px-5 py-3 flex items-center gap-2.5">
                          <span className="text-[#5F39F8] cursor-pointer">View</span>
                          <span className="text-slate-400 cursor-pointer">⋮</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">2</td>
                        <td className="px-5 py-3 flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[10px] text-orange-600">I</div>
                          ICICI Bank
                        </td>
                        <td className="px-5 py-3">1234 0123 4567</td>
                        <td className="px-5 py-3">Savings</td>
                        <td className="px-5 py-3">16 May 2024</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-200/50">Active</span></td>
                        <td className="px-5 py-3">Jun 2023 – May 2024</td>
                        <td className="px-5 py-3 flex items-center gap-2.5">
                          <span className="text-[#5F39F8] cursor-pointer">View</span>
                          <span className="text-slate-400 cursor-pointer">⋮</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">3</td>
                        <td className="px-5 py-3 flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-[10px] text-blue-600">S</div>
                          State Bank of India
                        </td>
                        <td className="px-5 py-3">0000 0037 7612 345</td>
                        <td className="px-5 py-3">Current</td>
                        <td className="px-5 py-3">16 May 2024</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-200/50">Active</span></td>
                        <td className="px-5 py-3">May 2023 – May 2024</td>
                        <td className="px-5 py-3 flex items-center gap-2.5">
                          <span className="text-[#5F39F8] cursor-pointer">View</span>
                          <span className="text-slate-400 cursor-pointer">⋮</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t border-slate-100 text-[10px] text-[#64748B] font-bold bg-slate-50/50">
                    Showing 1 to 3 of 3 accounts
                  </div>
                </div>
              </div>

              {/* Bank Statement Insights */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700">
                      <PieChart className="h-3 w-3" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Bank Statement Insights <span className="text-[10px] text-[#64748B] font-medium ml-1">(Powered by AI)</span></h3>
                    <AlertCircle className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </div>
                  <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1 cursor-pointer">
                    View Detailed Analysis <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Cash Flow Trend */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col">
                    <h4 className="text-xs font-bold text-[#1E293B] mb-4">Cash Flow Trend <span className="text-[10px] text-[#64748B] font-medium">(Last 6 Months)</span></h4>
                    <div className="flex items-center gap-4 mb-4 text-[10px] font-bold">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Credits</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Debits</div>
                      <div className="ml-auto text-slate-400 font-medium">(Amount in ₹)</div>
                    </div>
                    
                    {/* Placeholder Chart */}
                    <div className="flex-1 relative flex items-end justify-between h-32 pt-2 border-l border-b border-slate-200 pb-1 ml-6 pl-2">
                      <div className="absolute left-[-24px] top-0 text-[8px] text-slate-400">3L</div>
                      <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 text-[8px] text-slate-400">2L</div>
                      <div className="absolute left-[-24px] bottom-0 text-[8px] text-slate-400">1L</div>
                      
                      {/* Fake line chart nodes */}
                      <div className="w-full h-full relative">
                        {/* Green line nodes */}
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[40%] left-[10%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[45%] left-[25%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[42%] left-[40%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[55%] left-[55%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[50%] left-[70%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-green-500 rounded-full bottom-[65%] left-[85%]"></div>
                        
                        {/* Red line nodes */}
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[20%] left-[10%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[25%] left-[25%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[15%] left-[40%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[35%] left-[55%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[20%] left-[70%]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full bottom-[40%] left-[85%]"></div>
                        
                        {/* Lines linking them would require SVG, keeping it conceptual with absolute positioning for dots */}
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                          <polyline points="30,76 75,67 120,73 165,48 210,57 255,29" fill="none" stroke="#22c55e" strokeWidth="1.5" />
                          <polyline points="30,114 75,105 120,123 165,85 210,114 255,76" fill="none" stroke="#f87171" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between w-full pl-2 mt-2 text-[9px] text-slate-500 font-medium">
                      <span>Dec '23</span>
                      <span>Jan '24</span>
                      <span>Feb '24</span>
                      <span>Mar '24</span>
                      <span>Apr '24</span>
                      <span>May '24</span>
                    </div>
                  </div>
                  
                  {/* Income vs Expense */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col items-center">
                    <h4 className="text-xs font-bold text-[#1E293B] mb-4 self-start">Income vs Expense <span className="text-[10px] text-[#64748B] font-medium">(Avg. Monthly)</span></h4>
                    
                    <div className="flex-1 flex items-center justify-center gap-8 w-full">
                      {/* Donut Chart */}
                      <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: "conic-gradient(#22c55e 0% 60%, #f87171 60% 100%)" }}>
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center flex-col">
                          <span className="text-[10px] text-slate-500 font-bold">Net Surplus</span>
                          <span className="text-xs font-extrabold text-[#1E293B]">₹ 62,000</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded bg-green-500"></div>
                            <span className="text-[10px] font-bold text-slate-500">Income</span>
                          </div>
                          <div className="text-xs font-bold text-[#1E293B]">₹ 1,85,000 <span className="text-[10px] text-slate-500 font-medium">(60%)</span></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded bg-red-400"></div>
                            <span className="text-[10px] font-bold text-slate-500">Expense</span>
                          </div>
                          <div className="text-xs font-bold text-[#1E293B]">₹ 1,23,000 <span className="text-[10px] text-slate-500 font-medium">(40%)</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top Expense Categories */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col">
                    <h4 className="text-xs font-bold text-[#1E293B] mb-4">Top Expense Categories <span className="text-[10px] text-[#64748B] font-medium">(Avg. Monthly)</span></h4>
                    
                    <div className="flex-1 flex flex-col justify-between text-xs font-bold text-[#1E293B]">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">House Rent</span>
                        <div className="flex w-24 justify-between"><span>22%</span> <span>₹ 27,000</span></div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">Food & Dining</span>
                        <div className="flex w-24 justify-between"><span>18%</span> <span>₹ 22,140</span></div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">EMI / Loan Repayment</span>
                        <div className="flex w-24 justify-between"><span>16%</span> <span>₹ 19,680</span></div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">Shopping</span>
                        <div className="flex w-24 justify-between"><span>12%</span> <span>₹ 14,760</span></div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">Utilities</span>
                        <div className="flex w-24 justify-between"><span>8%</span> <span>₹ 9,840</span></div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">Others</span>
                        <div className="flex w-24 justify-between"><span>24%</span> <span>₹ 29,580</span></div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 mt-1 text-sm font-extrabold border-t border-slate-200">
                        <span>Total Expenses</span>
                        <span>₹ 1,23,000</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-green-50/70 border border-green-200/50 rounded-lg">
                  <div className="bg-green-500 rounded-full p-0.5 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-[11px] text-green-800"><span className="font-bold">AI Analysis:</span> Your average monthly cash flow shows a surplus of <span className="font-bold">₹ 62,000</span> with consistent income over the last 6 months.</p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1E293B]">Recent Transactions <span className="text-[10px] text-[#64748B] font-medium ml-1">(HDFC Bank - 5010 0012 3456 78)</span> <AlertCircle className="h-3 w-3 inline text-[#94A3B8] -mt-0.5" /></h3>
                  <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1 cursor-pointer">
                    View All Transactions <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[#64748B] font-bold">
                      <tr>
                        <th className="px-5 py-3 border-b border-slate-100">Date</th>
                        <th className="px-5 py-3 border-b border-slate-100">Description</th>
                        <th className="px-5 py-3 border-b border-slate-100">Type</th>
                        <th className="px-5 py-3 border-b border-slate-100 text-right">Amount (₹)</th>
                        <th className="px-5 py-3 border-b border-slate-100 text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">15 May 2024</td>
                        <td className="px-5 py-3">Salary Credit - Piramal Finance</td>
                        <td className="px-5 py-3"><span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px]">Credit</span></td>
                        <td className="px-5 py-3 text-right text-green-600">+ 1,00,000</td>
                        <td className="px-5 py-3 text-right">1,75,000</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">14 May 2024</td>
                        <td className="px-5 py-3">Rent Payment</td>
                        <td className="px-5 py-3"><span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px]">Debit</span></td>
                        <td className="px-5 py-3 text-right text-red-500">- 20,000</td>
                        <td className="px-5 py-3 text-right">75,000</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">12 May 2024</td>
                        <td className="px-5 py-3">Amazon India</td>
                        <td className="px-5 py-3"><span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px]">Debit</span></td>
                        <td className="px-5 py-3 text-right text-red-500">- 3,450</td>
                        <td className="px-5 py-3 text-right">95,000</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">10 May 2024</td>
                        <td className="px-5 py-3">Swiggy</td>
                        <td className="px-5 py-3"><span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px]">Debit</span></td>
                        <td className="px-5 py-3 text-right text-red-500">- 650</td>
                        <td className="px-5 py-3 text-right">98,450</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Bureau" && (
            <div className="space-y-2.5 animate-fade-slide-up">

              {/* Bureau Summary */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                      <ShieldCheck className="h-4 w-4 text-[#5F39F8]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Bureau Summary</h3>
                  </div>
                  <button className="inline-flex items-center gap-2 h-8 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#1E293B] text-xs font-bold rounded-lg cursor-pointer transition-all">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Pull All Reports
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 xl:gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Overall Bureau Score (Best)</p>
                    <p className="text-xl font-extrabold text-[#1E293B]">782</p>
                    <p className="text-[10px] text-[#64748B] font-medium">Source: CIBIL</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Reports Available</p>
                    <p className="text-lg font-extrabold leading-none text-[#111827]">4 / 4</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Reports Pulled On</p>
                    <p className="text-lg font-extrabold leading-none text-[#111827]">16 May 2024, 09:40 AM</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Next Pull Due On</p>
                    <p className="text-lg font-extrabold leading-none text-[#111827]">15 Aug 2024</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Overall Risk Grade</p>
                    <span className="inline-block px-3 py-1 bg-green-50 text-green-700 border border-green-200/50 text-xs font-bold rounded-full">Low Risk</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-indigo-50/60 border border-indigo-100/60 rounded-lg text-xs text-indigo-900">
                  <AlertCircle className="h-4 w-4 text-[#5F39F8] shrink-0" />
                  <span>Bureau reports are pulled via API integration. In case of API unavailability, you can upload the PDF report.</span>
                </div>
              </div>

              {/* Bureau Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* CIBIL Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <BureauLogo bureau="cibil" />
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200/50">Available</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200/50">Primary</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">⋮</button>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-3xl font-extrabold text-[#1E293B]">782</p>
                      <p className="text-xs font-bold text-green-600">Excellent</p>
                      <div className="mt-2 w-32 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative">
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#1E293B] shadow" style={{left: '82%'}}></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 w-32"><span>300</span><span>600</span><span>900</span></div>
                    </div>
                    <div className="text-xs space-y-1.5 flex-1">
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Date</span><span className="font-bold text-[#1E293B]">16 May 2024</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Membership No.</span><span className="font-bold text-[#1E293B]">TU12345678</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Enquiry Status</span><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-bold rounded">Matched</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Type</span><span className="font-bold text-[#1E293B]">Individual</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Fetched Via</span><span className="font-bold text-[#1E293B]">API</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report ID</span><span className="font-bold text-[#1E293B]">CIBIL-20240516-0915</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Eye className="h-3.5 w-3.5" /> View Report
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Activity className="h-3.5 w-3.5" /> View Analysis
                    </button>
                  </div>
                </div>

                {/* CRIF Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <BureauLogo bureau="crif" />
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200/50">Available</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">⋮</button>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-3xl font-extrabold text-[#1E293B]">768</p>
                      <p className="text-xs font-bold text-green-500">Very Good</p>
                      <div className="mt-2 w-32 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative">
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#1E293B] shadow" style={{left: '76%'}}></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 w-32"><span>300</span><span>600</span><span>900</span></div>
                    </div>
                    <div className="text-xs space-y-1.5 flex-1">
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Date</span><span className="font-bold text-[#1E293B]">16 May 2024</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Membership No.</span><span className="font-bold text-[#1E293B]">CRIF1234567</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Enquiry Status</span><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-bold rounded">Matched</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Type</span><span className="font-bold text-[#1E293B]">Individual</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Fetched Via</span><span className="font-bold text-[#1E293B]">API</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report ID</span><span className="font-bold text-[#1E293B]">CRIF-20240516-0916</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Eye className="h-3.5 w-3.5" /> View Report
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Activity className="h-3.5 w-3.5" /> View Analysis
                    </button>
                  </div>
                </div>

                {/* Equifax Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <BureauLogo bureau="equifax" />
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200/50">Available</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">⋮</button>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-3xl font-extrabold text-[#1E293B]">754</p>
                      <p className="text-xs font-bold text-blue-500">Good</p>
                      <div className="mt-2 w-32 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative">
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#1E293B] shadow" style={{left: '74%'}}></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 w-32"><span>300</span><span>600</span><span>900</span></div>
                    </div>
                    <div className="text-xs space-y-1.5 flex-1">
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Date</span><span className="font-bold text-[#1E293B]">16 May 2024</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Membership No.</span><span className="font-bold text-[#1E293B]">EQFX1234567</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Enquiry Status</span><span className="px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-bold rounded">Matched</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report Type</span><span className="font-bold text-[#1E293B]">Individual</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Fetched Via</span><span className="font-bold text-[#1E293B]">API</span></div>
                      <div className="flex justify-between"><span className="text-[#64748B] font-medium">Report ID</span><span className="font-bold text-[#1E293B]">EQUIFAX-20240516-0917</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Eye className="h-3.5 w-3.5" /> View Report
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] cursor-pointer">
                      <Activity className="h-3.5 w-3.5" /> View Analysis
                    </button>
                  </div>
                </div>

                {/* Experian Card - Not Available */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <BureauLogo bureau="experian" />
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-200/50">Not Available</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">⋮</button>
                  </div>
                  <div className="py-4 text-center space-y-1 text-xs text-[#64748B] font-medium border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <p className="font-bold text-[#1E293B]">Unable to fetch report via API</p>
                    <p>Upload PDF report to proceed</p>
                    <div className="text-[10px] space-y-1 mt-2 text-left px-4">
                      <div className="flex justify-between"><span>Last Attempt</span><span className="font-bold text-[#1E293B]">16 May 2024, 09:30 AM</span></div>
                      <div className="flex justify-between"><span>Reason</span><span className="font-bold text-[#1E293B]">API Timeout</span></div>
                      <div className="flex justify-between"><span>Report Type</span><span className="font-bold text-[#1E293B]">Individual</span></div>
                    </div>
                  </div>
                  <button className="mt-4 w-full h-9 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2">
                    <UploadCloud className="h-3.5 w-3.5" /> Upload PDF Report
                  </button>
                </div>
              </div>

              {/* Bureau Enquiry Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1E293B]">Bureau Enquiry Summary <span className="text-[10px] text-[#64748B] font-medium ml-1">(Last 12 Months)</span></h3>
                  <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1 cursor-pointer">
                    View Enquiry Details <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[#64748B] font-bold">
                      <tr>
                        <th className="px-5 py-3 border-b border-slate-100">Bureau</th>
                        <th className="px-5 py-3 border-b border-slate-100 text-center">Total Enquiries</th>
                        <th className="px-5 py-3 border-b border-slate-100 text-center">Hard Enquiries</th>
                        <th className="px-5 py-3 border-b border-slate-100 text-center">Soft Enquiries</th>
                        <th className="px-5 py-3 border-b border-slate-100">Last Enquiry On</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">CIBIL</td>
                        <td className="px-5 py-3 text-center">8</td>
                        <td className="px-5 py-3 text-center text-red-600">3</td>
                        <td className="px-5 py-3 text-center text-blue-600">5</td>
                        <td className="px-5 py-3">12 May 2024</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">CRIF High Mark</td>
                        <td className="px-5 py-3 text-center">6</td>
                        <td className="px-5 py-3 text-center text-red-600">2</td>
                        <td className="px-5 py-3 text-center text-blue-600">4</td>
                        <td className="px-5 py-3">10 May 2024</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Equifax</td>
                        <td className="px-5 py-3 text-center">7</td>
                        <td className="px-5 py-3 text-center text-red-600">2</td>
                        <td className="px-5 py-3 text-center text-blue-600">5</td>
                        <td className="px-5 py-3">11 May 2024</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Experian</td>
                        <td className="px-5 py-3 text-center">5</td>
                        <td className="px-5 py-3 text-center text-red-600">1</td>
                        <td className="px-5 py-3 text-center text-blue-600">4</td>
                        <td className="px-5 py-3">08 May 2024</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Fraud & Compliance" && (
            <div className="space-y-2.5 animate-fade-slide-up">

              {/* Fraud & Compliance Summary */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
                      <ShieldCheck className="h-4 w-4 text-orange-500" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Fraud & Compliance Summary</h3>
                  </div>
                  <button className="inline-flex items-center gap-2 h-8 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#1E293B] text-xs font-bold rounded-lg cursor-pointer transition-all">
                    View History
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 xl:gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Overall Risk Score</p>
                    <p className="text-xl font-extrabold text-[#1E293B]">23 / 100</p>
                    <p className="text-xs font-bold text-green-600">Low Risk</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Fraud Checks Performed</p>
                    <p className="text-lg font-extrabold leading-none text-[#111827]">12 / 12</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Alerts</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-extrabold leading-none text-[#111827]">1</p>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200/50">Review</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Blocked Lists Matched</p>
                    <p className="text-lg font-extrabold leading-none text-[#111827]">0</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">PEP / Sanction Hit</p>
                    <p className="text-sm font-extrabold text-green-600">No</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] mb-1">Compliance Status</p>
                    <span className="inline-block px-3 py-1 bg-green-50 text-green-700 border border-green-200/50 text-xs font-bold rounded-full">Clean</span>
                  </div>
                </div>
              </div>

              {/* Fraud Check Results + Sanctions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Fraud Check Results */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Fraud Check Results</h3>
                  </div>
                  <div className="text-[10px] font-bold text-[#64748B] grid grid-cols-6 pb-2 border-b border-slate-100 mb-1">
                    <span>Check Name</span><span>Description</span><span>Result</span><span>Score / Status</span><span>Matched Details</span><span>Checked On</span>
                  </div>
                  <div className="flex-1 space-y-0 divide-y divide-slate-50 text-xs">
                    {[
                      { name: "Device Intelligence", desc: "Device reputation & risk scoring", result: "Pass", score: "12 / 100 (Low)", matched: "-", date: "16 May 2024, 09:40 AM" },
                      { name: "IP Risk Analysis", desc: "IP address risk & proxy detection", result: "Pass", score: "8 / 100 (Low)", matched: "-", date: "16 May 2024, 09:40 AM" },
                      { name: "Email Permutation", desc: "Email pattern & disposable check", result: "Pass", score: "-", matched: "-", date: "16 May 2024, 09:40 AM" },
                      { name: "Mobile Reputation", desc: "Mobile number risk analysis", result: "Pass", score: "10 / 100 (Low)", matched: "-", date: "16 May 2024, 09:40 AM" },
                      { name: "Velocity Check", desc: "Application velocity for entity", result: "Review", score: "45 / 100 (Medium)", matched: "3 Applications", date: "16 May 2024, 09:40 AM" },
                      { name: "Identity Risk", desc: "Identity mismatch & synthetic ID", result: "Pass", score: "15 / 100 (Low)", matched: "-", date: "16 May 2024, 09:40 AM" },
                    ].map((row) => (
                      <div key={row.name} className="grid grid-cols-6 py-2 items-center gap-1">
                        <span className="font-bold text-[#1E293B] text-[11px]">{row.name}</span>
                        <span className="text-[#64748B] text-[10px]">{row.desc}</span>
                        <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.result === "Pass" ? "bg-green-50 text-green-700" :
                          row.result === "Review" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        }`}>{row.result}</span>
                        <span className="text-[#1E293B] font-bold text-[11px]">{row.score}</span>
                        <span className={`text-[11px] font-bold ${row.matched !== "-" ? "text-[#5F39F8]" : "text-[#94A3B8]"}`}>{row.matched}</span>
                        <span className="text-[#64748B] text-[10px]">{row.date}</span>
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 self-start h-8 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#1E293B] text-xs font-bold rounded-lg cursor-pointer transition-all">
                    View All Checks
                  </button>
                </div>

                {/* Sanctions & Watchlist Screening */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Sanctions & Watchlist Screening</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "PEP (Politically Exposed Person)", status: "No Match" },
                      { label: "OFAC Sanctions List", status: "No Match" },
                      { label: "UN Sanctions List", status: "No Match" },
                      { label: "EU Sanctions List", status: "No Match" },
                      { label: "SDN (Specially Designated Nationals)", status: "No Match" },
                      { label: "India Sanctions / MHA List", status: "No Match" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                        <span className="text-[#64748B] font-medium">{item.label}</span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200/50">{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 p-3 bg-green-50/60 border border-green-200/40 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-[11px] text-green-800 font-medium">No adverse match found in any sanctions or watchlists.</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Compliance Checks + Document Verification + Fraud Risk Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Compliance & Regulatory Checks */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <h3 className="text-xs font-bold text-[#1E293B]">Compliance & Regulatory Checks</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "KYC Compliance", status: "Completed", color: "text-green-600" },
                      { label: "CKYC Verification", status: "Completed", color: "text-green-600" },
                      { label: "Aadhaar Authentication", status: "Verified", color: "text-green-600" },
                      { label: "Pan Validation", status: "Valid", color: "text-green-600" },
                      { label: "AML Screening", status: "Cleared", color: "text-green-600" },
                      { label: "Regulatory Flags", status: "No", color: "text-green-600" },
                      { label: "Source of Funds Declaration", status: "Received", color: "text-green-600" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-[#64748B] font-medium text-[11px]">{item.label}</span>
                        <span className={`font-bold text-[11px] ${item.color}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Verification */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <h3 className="text-xs font-bold text-[#1E293B]">Document Verification</h3>
                  </div>
                  <div className="text-[10px] font-bold text-[#64748B] grid grid-cols-3 pb-2 border-b border-slate-100 mb-1">
                    <span>Document</span><span>Status</span><span>Verified On</span>
                  </div>
                  <div className="space-y-0 divide-y divide-slate-50 text-xs">
                    {[
                      { doc: "PAN Card", status: "Verified", date: "16 May 2024, 09:20 AM" },
                      { doc: "Aadhaar Card", status: "Verified", date: "16 May 2024, 09:20 AM" },
                      { doc: "Address Proof", status: "Verified", date: "16 May 2024, 09:20 AM" },
                      { doc: "Income Proof", status: "Verified", date: "16 May 2024, 09:20 AM" },
                      { doc: "Bank Statement", status: "Verified", date: "16 May 2024, 09:25 AM" },
                    ].map((row) => (
                      <div key={row.doc} className="grid grid-cols-3 py-2 items-center gap-1">
                        <span className="font-bold text-[#1E293B] text-[11px]">{row.doc}</span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded w-fit">{row.status}</span>
                        <span className="text-[#64748B] text-[10px]">{row.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fraud Risk Trend */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <h3 className="text-xs font-bold text-[#1E293B]">Fraud Risk Trend</h3>
                    </div>
                    <select className="text-[10px] font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg px-2 py-1 cursor-pointer bg-white appearance-none">
                      <option>Last 6 Months</option>
                    </select>
                  </div>
                  <div className="text-[10px] text-[#64748B] space-y-1 mb-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-green-500"></div><span>High (75-100)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-amber-400"></div><span>Medium (35-74)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-indigo-400"></div><span>Low (0-34)</span></div>
                  </div>
                  <div className="flex-1 relative h-24 border-l border-b border-slate-200 ml-4">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <polyline points="10,60 50,55 90,50 130,52 170,45 210,40" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                      <circle cx="10" cy="60" r="3" fill="#6366f1" />
                      <circle cx="50" cy="55" r="3" fill="#6366f1" />
                      <circle cx="90" cy="50" r="3" fill="#6366f1" />
                      <circle cx="130" cy="52" r="3" fill="#6366f1" />
                      <circle cx="170" cy="45" r="3" fill="#6366f1" />
                      <circle cx="210" cy="40" r="3" fill="#6366f1" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1 ml-4">
                    <span>Dec '23</span><span>Jan '24</span><span>Feb '24</span><span>Mar '24</span><span>Apr '24</span><span>May '24</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#64748B] font-medium">Current Risk Category</p>
                      <span className="inline-block mt-1 px-3 py-1 bg-green-50 text-green-700 border border-green-200/50 text-[10px] font-bold rounded-full">Low Risk</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#64748B] font-medium">Average Score (Last 6 Months)</p>
                      <p className="text-lg font-extrabold leading-none text-[#111827] mt-1">21 / 100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts & Remarks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Alerts & Remarks</h3>
                  </div>
                  <button className="h-8 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#1E293B] text-xs font-bold rounded-lg cursor-pointer transition-all">
                    + Add Remark
                  </button>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[#64748B] font-bold">
                      <tr>
                        <th className="px-5 py-3 border-b border-slate-100">Type</th>
                        <th className="px-5 py-3 border-b border-slate-100">Message</th>
                        <th className="px-5 py-3 border-b border-slate-100">Severity</th>
                        <th className="px-5 py-3 border-b border-slate-100">Created On</th>
                        <th className="px-5 py-3 border-b border-slate-100">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1E293B] font-bold divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">Velocity Alert</td>
                        <td className="px-5 py-3 font-medium text-[#64748B]">Multiple applications found for the same mobile number in last 7 days.</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-200/50">Medium</span></td>
                        <td className="px-5 py-3">16 May 2024, 09:40 AM</td>
                        <td className="px-5 py-3"><button className="text-[#5F39F8] font-bold hover:text-[#4F2EE0] cursor-pointer">Review</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Audit Trail" && (
            <div className="space-y-2.5 animate-fade-slide-up">

              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Audit Trail</h3>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">Complete history of activities performed on this application.</p>
                </div>
                <button className="h-8 px-4 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2">
                  Export <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-[1320px] w-full table-fixed text-left text-[11px]">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0] uppercase tracking-[0.02em]">
                    <tr>
                      <th className="w-12 px-3 py-2.5 whitespace-nowrap">#</th>
                      <th className="w-44 px-3 py-2.5 whitespace-nowrap">Date & Time <span className="text-[#5F39F8] inline-block font-black ml-1">&#8595;</span></th>
                      <th className="w-36 px-3 py-2.5 whitespace-nowrap">Performed By</th>
                      <th className="w-32 px-3 py-2.5 whitespace-nowrap">Role</th>
                      <th className="w-40 px-3 py-2.5 whitespace-nowrap">Module</th>
                      <th className="w-44 px-3 py-2.5 whitespace-nowrap">Activity</th>
                      <th className="w-48 px-3 py-2.5 whitespace-nowrap">Field Name / Section</th>
                      <th className="w-36 px-3 py-2.5 whitespace-nowrap">Old Value</th>
                      <th className="w-44 px-3 py-2.5 whitespace-nowrap">New Value</th>
                      <th className="w-32 px-3 py-2.5 whitespace-nowrap">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1E293B] font-bold divide-y divide-[#F1F5F9]">
                    {[
                      { id: "1", date: "16 May 2024, 10:30 AM", user: "Arjun Singh", role: "Super Admin", module: "Application", activity: "Application Created", field: "-", old: "-", new: "-", ip: "10.1.2.45" },
                      { id: "2", date: "16 May 2024, 10:35 AM", user: "Priya Mehta", role: "Credit Analyst", module: "Customer Profile", activity: "Viewed", field: "-", old: "-", new: "-", ip: "10.1.2.52" },
                      { id: "3", date: "16 May 2024, 10:40 AM", user: "Priya Mehta", role: "Credit Analyst", module: "Personal Details", activity: "Updated", field: "PAN Number", old: "ABCDE1234F", new: "ABCDE1234G", ip: "10.1.2.52" },
                      { id: "4", date: "16 May 2024, 10:42 AM", user: "Priya Mehta", role: "Credit Analyst", module: "Identity & KYC", activity: "Document Uploaded", field: "PAN Card", old: "-", new: "PAN_16052024.pdf", ip: "10.1.2.52" },
                      { id: "5", date: "16 May 2024, 10:45 AM", user: "Rohit Verma", role: "Operations", module: "Banking Details", activity: "AA Sync Initiated", field: "HDFC Bank", old: "-", new: "Sync Initiated", ip: "10.1.2.63" },
                      { id: "6", date: "16 May 2024, 10:46 AM", user: "System", role: "System", module: "Banking Details", activity: "AA Sync Completed", field: "HDFC Bank", old: "-", new: "Success", ip: "-" },
                      { id: "7", date: "16 May 2024, 10:47 AM", user: "Rohit Verma", role: "Operations", module: "Bank Statement Analyzer", activity: "Analysis Completed", field: "HDFC Bank (Apr 24 - May 24)", old: "-", new: "Score: 78", ip: "10.1.2.63" },
                      { id: "8", date: "16 May 2024, 10:50 AM", user: "Neha Kapoor", role: "Credit Manager", module: "Fraud & Compliance", activity: "Check Performed", field: "Velocity Check", old: "-", new: "Pass", ip: "10.1.2.71" },
                      { id: "9", date: "16 May 2024, 10:55 AM", user: "Neha Kapoor", role: "Credit Manager", module: "Fraud & Compliance", activity: "Status Updated", field: "Overall Risk Score", old: "Low Risk (18)", new: "Low Risk (23)", ip: "10.1.2.71" },
                      { id: "10", date: "16 May 2024, 11:02 AM", user: "Arjun Singh", role: "Super Admin", module: "Application", activity: "Status Changed", field: "Application Status", old: "New", new: "In Review", ip: "10.1.2.45" },
                      { id: "11", date: "16 May 2024, 11:10 AM", user: "Arjun Singh", role: "Super Admin", module: "Notes", activity: "Note Added", field: "Internal Note", old: "-", new: "KYC verified, proceed for credit", ip: "10.1.2.45" },
                      { id: "12", date: "16 May 2024, 11:15 AM", user: "Rohit Verma", role: "Operations", module: "Documents", activity: "Document Deleted", field: "Address Proof", old: "Address_15052024.pdf", new: "-", ip: "10.1.2.63" },
                      { id: "13", date: "16 May 2024, 11:16 AM", user: "Rohit Verma", role: "Operations", module: "Documents", activity: "Document Uploaded", field: "Address Proof", old: "-", new: "Address_16052024.pdf", ip: "10.1.2.63" },
                      { id: "14", date: "16 May 2024, 11:20 AM", user: "Arjun Singh", role: "Super Admin", module: "Alerts & Notifications", activity: "Alert Acknowledged", field: "Income Mismatch Alert", old: "-", new: "Acknowledged", ip: "10.1.2.45" },
                    ].map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-[#64748B] whitespace-nowrap">{row.id}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap truncate" title={row.user}>{row.user}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap truncate" title={row.role}>{row.role}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap truncate" title={row.module}>{row.module}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap truncate" title={row.activity}>{row.activity}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap truncate" title={row.field}>{row.field}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap truncate" title={row.old}>{row.old}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap truncate" title={row.new}>{row.new}</td>
                        <td className="px-3 py-2.5 text-[#64748B] font-medium whitespace-nowrap">{row.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
                {/* Pagination Footer */}
                <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#64748B]">
                  <div>Showing 1 to 14 of 14 records</div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="rotate-90" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#5F39F8] bg-indigo-50 text-[#5F39F8] font-bold cursor-pointer">
                        1
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="-rotate-90" />
                      </button>
                    </div>
                    <div className="relative">
                      <select className="h-8 pl-3 pr-8 border border-[#E2E8F0] rounded bg-white text-[#1E293B] font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#5F39F8]">
                        <option>20 / page</option>
                        <option>50 / page</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Notes" && (
            <div className="space-y-2.5 animate-fade-slide-up">

              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Notes</h3>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">View all notes and comments added for this application.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative w-64">
                    <input type="text" placeholder="Search notes..." className="w-full h-9 pl-9 pr-4 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] text-xs font-medium text-[#1E293B]" />
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button className="h-9 px-4 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" /> Filters
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-5 py-4 w-12">#</th>
                      <th className="px-5 py-4 w-96">Note</th>
                      <th className="px-5 py-4 w-40">Added By</th>
                      <th className="px-5 py-4 w-40">Role</th>
                      <th className="px-5 py-4 w-32 text-center">Note Type</th>
                      <th className="px-5 py-4 w-44">Added On</th>
                      <th className="px-5 py-4 w-32 text-center">Visibility</th>
                      <th className="px-5 py-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1E293B] font-bold divide-y divide-[#F1F5F9]">
                    {[
                      { id: "1", text: "Applicant has 3 years of stable employment with current employer.", by: "Priya Mehta", role: "Credit Analyst", type: "General", date: "16 May 2024, 11:15 AM", vis: "Internal" },
                      { id: "2", text: "Income documents verified. ITR for last 2 years is consistent.", by: "Priya Mehta", role: "Credit Analyst", type: "Income", date: "16 May 2024, 11:10 AM", vis: "Internal" },
                      { id: "3", text: "CIBIL score is good. No major delinquencies observed.", by: "Rohit Verma", role: "Credit Manager", type: "Credit", date: "16 May 2024, 10:55 AM", vis: "Internal" },
                      { id: "4", text: "Property location and documents are verified.", by: "Neha Kapoor", role: "Legal Reviewer", type: "Property", date: "16 May 2024, 10:45 AM", vis: "Internal" },
                      { id: "5", text: "DSR is within acceptable limits.", by: "Priya Mehta", role: "Credit Analyst", type: "Assessment", date: "16 May 2024, 10:40 AM", vis: "Internal" },
                      { id: "6", text: "Pending bank statement for last 3 months.", by: "Priya Mehta", role: "Credit Analyst", type: "Pending", date: "16 May 2024, 10:35 AM", vis: "Internal" },
                      { id: "7", text: "Co-applicant details collected. KYC pending.", by: "Arjun Singh", role: "Super Admin", type: "KYC", date: "16 May 2024, 10:25 AM", vis: "Internal" },
                      { id: "8", text: "Site visit scheduled for 18 May 2024.", by: "Rohit Verma", role: "Credit Manager", type: "Verification", date: "16 May 2024, 10:20 AM", vis: "Internal" },
                      { id: "9", text: "Customer is very responsive and cooperative.", by: "Priya Mehta", role: "Credit Analyst", type: "General", date: "16 May 2024, 10:15 AM", vis: "Internal" },
                      { id: "10", text: "Requested for updated salary slips.", by: "Priya Mehta", role: "Credit Analyst", type: "Pending", date: "16 May 2024, 10:10 AM", vis: "Applicant" },
                    ].map((row) => {
                      const typeClasses = {
                        General: "bg-fuchsia-50 text-fuchsia-600",
                        Income: "bg-blue-50 text-blue-600",
                        Credit: "bg-emerald-50 text-emerald-600",
                        Property: "bg-orange-50 text-orange-600",
                        Assessment: "bg-amber-50 text-amber-600",
                        Pending: "bg-slate-100 text-slate-500",
                        KYC: "bg-pink-50 text-pink-600",
                        Verification: "bg-cyan-50 text-cyan-600"
                      }[row.type as string];
                      
                      const visClasses = row.vis === "Internal" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-600";
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 text-[#64748B] font-bold">{row.id}</td>
                          <td className="px-5 py-4 text-[#1E293B] font-medium">{row.text}</td>
                          <td className="px-5 py-4 text-[#64748B] font-medium">{row.by}</td>
                          <td className="px-5 py-4 text-[#64748B] font-medium">{row.role}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeClasses}`}>{row.type}</span>
                          </td>
                          <td className="px-5 py-4 text-[#64748B] font-medium">{row.date}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded border ${row.vis === "Internal" ? "border-green-200/50" : "border-blue-200/50"} text-[10px] font-bold ${visClasses}`}>{row.vis}</span>
                          </td>
                          <td className="px-5 py-4 text-center text-[#94A3B8] font-bold text-lg leading-none cursor-pointer hover:text-[#1E293B]">⋮</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#64748B]">
                  <div>Showing 1 to 10 of 18 notes</div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="rotate-90" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#5F39F8] bg-indigo-50 text-[#5F39F8] font-bold cursor-pointer">
                        1
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#1E293B] font-bold">
                        2
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="-rotate-90" />
                      </button>
                    </div>
                    <div className="relative">
                      <select className="h-8 pl-3 pr-8 border border-[#E2E8F0] rounded bg-white text-[#1E293B] font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#5F39F8]">
                        <option>10 / page</option>
                        <option>20 / page</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Communication" && (
            <div className="space-y-2.5 animate-fade-slide-up">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Communication</h3>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">View all communications sent to and received from the customer.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative w-64">
                    <input type="text" placeholder="Search communication..." className="w-full h-9 pl-9 pr-4 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] text-xs font-medium text-[#1E293B]" />
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button className="h-9 px-4 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" /> Filters
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-5 py-4 w-12">#</th>
                      <th className="px-5 py-4 w-44">Date & Time <span className="text-[#5F39F8] inline-block font-black ml-1">↓</span></th>
                      <th className="px-5 py-4 w-32">Channel</th>
                      <th className="px-5 py-4 w-32 text-center">Direction</th>
                      <th className="px-5 py-4 w-44">Communication Type</th>
                      <th className="px-5 py-4">Subject</th>
                      <th className="px-5 py-4 w-44">Sent / Received By</th>
                      <th className="px-5 py-4 w-32 text-center">Status</th>
                      <th className="px-5 py-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1E293B] font-bold divide-y divide-[#F1F5F9]">
                    {[
                      { id: "1", date: "16 May 2024, 11:20 AM", channel: "Email", dir: "Outgoing", type: "Document Request", subject: "Request for Income Proof", by: "Priya Mehta", role: "Credit Analyst", status: "Delivered" },
                      { id: "2", date: "16 May 2024, 10:45 AM", channel: "SMS", dir: "Outgoing", type: "Application Update", subject: "Application is under review", by: "System", role: "", status: "Delivered" },
                      { id: "3", date: "16 May 2024, 10:30 AM", channel: "Call", dir: "Outgoing", type: "Verification", subject: "KYC Verification Call", by: "Arjun Singh", role: "Credit Manager", status: "Completed" },
                      { id: "4", date: "16 May 2024, 09:55 AM", channel: "WhatsApp", dir: "Outgoing", type: "Document Request", subject: "Please share bank statement", by: "Priya Mehta", role: "Credit Analyst", status: "Delivered" },
                      { id: "5", date: "15 May 2024, 06:15 PM", channel: "Email", dir: "Incoming", type: "Customer Query", subject: "Query on processing time", by: "Rahul Sharma", role: "Customer", status: "Received" },
                      { id: "6", date: "15 May 2024, 05:50 PM", channel: "Call", dir: "Incoming", type: "Customer Query", subject: "Enquiry about loan eligibility", by: "Rahul Sharma", role: "Customer", status: "Completed" },
                      { id: "7", date: "15 May 2024, 05:20 PM", channel: "SMS", dir: "Outgoing", type: "OTP", subject: "Your OTP for verification is 4587", by: "System", role: "", status: "Delivered" },
                      { id: "8", date: "14 May 2024, 04:10 PM", channel: "Email", dir: "Outgoing", type: "Application Update", subject: "Application submitted successfully", by: "System", role: "", status: "Delivered" },
                      { id: "9", date: "14 May 2024, 03:40 PM", channel: "WhatsApp", dir: "Incoming", type: "Document Received", subject: "Bank statement shared", by: "Rahul Sharma", role: "Customer", status: "Received" },
                      { id: "10", date: "14 May 2024, 03:30 PM", channel: "Portal", dir: "Incoming", type: "Application", subject: "Application submitted via portal", by: "Rahul Sharma", role: "Customer", status: "Received" },
                    ].map((row) => {
                      const ChannelIcon = row.channel === "Email" ? Mail : row.channel === "SMS" ? MessageSquare : row.channel === "Call" ? Phone : row.channel === "WhatsApp" ? MessageCircle : Globe;
                      const channelColor = row.channel === "Email" ? "text-purple-600" : row.channel === "SMS" ? "text-blue-500" : row.channel === "Call" ? "text-green-600" : row.channel === "WhatsApp" ? "text-emerald-500" : "text-orange-500";
                      
                      const DirIcon = row.dir === "Outgoing" ? ArrowUpRight : ArrowDownLeft;
                      const dirClasses = row.dir === "Outgoing" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-600";
                      
                      const statusClasses = row.status === "Received" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-700";
                      const statusIconColor = row.status === "Received" ? "text-blue-500" : "text-green-500";
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 text-[#64748B] font-bold">{row.id}</td>
                          <td className="px-5 py-4 text-[#64748B] font-medium">{row.date}</td>
                          <td className="px-5 py-4">
                            <div className={`flex items-center gap-1.5 font-bold ${channelColor}`}>
                              <ChannelIcon className="w-4 h-4" />
                              {row.channel}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${dirClasses}`}>
                              <DirIcon className="w-3 h-3" />
                              {row.dir}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#64748B] font-medium">{row.type}</td>
                          <td className="px-5 py-4 text-[#1E293B] font-medium">{row.subject}</td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-[#1E293B]">{row.by}</div>
                            {row.role && <div className="text-[10px] text-[#64748B] font-medium mt-0.5">{row.role}</div>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${statusClasses}`}>
                              <CheckCircle2 className={`w-3 h-3 ${statusIconColor}`} />
                              {row.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-[#94A3B8] font-bold text-lg leading-none cursor-pointer hover:text-[#1E293B]">⋮</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#64748B]">
                  <div>Showing 1 to 10 of 48 communications</div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="rotate-90" />
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#5F39F8] bg-indigo-50 text-[#5F39F8] font-bold cursor-pointer">1</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#1E293B] font-bold">2</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#1E293B] font-bold">3</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#1E293B] font-bold">4</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#1E293B] font-bold">5</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 cursor-pointer text-[#94A3B8]">
                        <ChevronDown size={14} className="-rotate-90" />
                      </button>
                    </div>
                    <div className="relative">
                      <select className="h-8 pl-3 pr-8 border border-[#E2E8F0] rounded bg-white text-[#1E293B] font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#5F39F8]">
                        <option>10 / page</option>
                        <option>20 / page</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "NACH" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {nachLoading && !nachData ? (
                <div className="py-16 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-[var(--primary,#2e3192)] opacity-20"></div>
                    <div className="relative flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-slate-100 border-t-[var(--primary,#2e3192)]"></div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-500">Loading mandate details...</p>
                </div>
              ) : nachError ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/50 p-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-red-800 mb-2">Failed to Load Mandate</h3>
                  <p className="text-sm text-red-600/80 mb-4 max-w-md">{nachError}</p>
                  <button onClick={fetchNachStatus} className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-sm">
                    Try Again
                  </button>
                </div>
              ) : nachData && !showNachForm ? (
                /* --- View Existing Mandate details --- */
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-[var(--primary,#2e3192)] text-white shadow-sm">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Active NACH / eNACH Mandate</h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Created on {new Date(nachData.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={fetchNachStatus}
                      disabled={nachLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[var(--primary,#2e3192)] transition-all shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${nachLoading ? "animate-spin" : ""}`} />
                      {nachLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {/* Left Column: Status Box */}
                    <div className="xl:col-span-1 space-y-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 flex flex-col items-center text-center relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${nachData.subscription_status === "ACTIVE" ? "bg-emerald-500" : nachData.subscription_status === "INITIALIZED" ? "bg-amber-500" : "bg-red-500"}`}></div>
                        
                        <div className={`mt-2 flex h-16 w-16 items-center justify-center rounded-full mb-4 ${nachData.subscription_status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : nachData.subscription_status === "INITIALIZED" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                          {nachData.subscription_status === "ACTIVE" ? <CheckCircle2 className="h-8 w-8" /> : nachData.subscription_status === "INITIALIZED" ? <Activity className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                        </div>
                        
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status</span>
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black uppercase ${nachData.subscription_status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : nachData.subscription_status === "INITIALIZED" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {nachData.subscription_status}
                        </span>

                        <p className="text-sm text-slate-600 mt-4 font-medium leading-relaxed">
                          {nachData.subscription_status === "ACTIVE"
                            ? "Mandate is successfully registered and active. Debits can be triggered automatically."
                            : nachData.subscription_status === "INITIALIZED"
                              ? "The customer has not authorized the mandate yet. Share the link to complete verification."
                              : "Mandate registration failed or was cancelled. Please create a new mandate."}
                        </p>
                      </div>

                      {(nachData.subscription_status === "FAILED" || nachData.subscription_status === "CANCELLED") && (
                        <button
                          type="button"
                          onClick={() => setShowNachForm(true)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary,#2e3192)] py-3 text-sm font-bold text-white hover:bg-opacity-90 transition-all shadow-sm"
                        >
                          <CreditCard className="h-4 w-4" />
                          Create New Mandate
                        </button>
                      )}
                    </div>

                    {/* Right Column: Mandate Details */}
                    <div className="xl:col-span-2 flex flex-col gap-4">
                      <div className="rounded-xl border border-slate-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5 text-slate-400" />
                          <h4 className="text-sm font-bold text-slate-800">Mandate Metadata</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Subscription ID</span>
                            <span className="text-sm font-bold text-slate-800 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate">{nachData.subscription_id}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Cashfree Sub ID</span>
                            <span className="text-sm font-bold text-slate-800 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate">{nachData.cashfree_subscription_id || "—"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Plan Type</span>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                              <span className="text-sm font-bold text-slate-800 capitalize">{nachData.plan_type?.toLowerCase()?.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Payment Methods</span>
                            <span className="text-sm font-bold text-slate-800 uppercase">{nachData.payment_method}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Authorization Charge</span>
                            <span className="text-xs font-bold text-emerald-600">₹{nachData.authorization_amount}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 mb-1">Expiry Date</span>
                            <span className="text-xs font-bold text-slate-800">{nachData.subscription_expiry_time ? new Date(nachData.subscription_expiry_time).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}</span>
                          </div>
                        </div>
                      </div>

                      {nachData.subscription_status === "ACTIVE" && (
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <h5 className="text-sm font-bold text-emerald-800">Bank Authorization Details</h5>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/60 p-4 rounded-lg border border-emerald-100/50">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Auth Ref (UMRN)</span>
                              <span className="text-sm font-black text-emerald-900 font-mono">{nachData.authorization_reference}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Status</span>
                              <span className="text-sm font-black text-emerald-900 uppercase">{nachData.authorization_status || "SUCCESS"}</span>
                            </div>
                            {nachData.webhook_received_at && (
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Verified At</span>
                                <span className="text-sm font-black text-emerald-900">{new Date(nachData.webhook_received_at).toLocaleString("en-IN")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Share Mandate URL / Checkout Area */}
                      {nachData.subscription_status === "INITIALIZED" && nachData.subscription_session_id && (
                        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <LinkIcon className="h-5 w-5 text-indigo-600" />
                            <h4 className="text-sm font-bold text-indigo-900">Customer Authorization</h4>
                          </div>
                          <p className="text-sm text-indigo-700/80 mb-5">
                            Open the Cashfree checkout for the customer to authorize the mandate via NetBanking / UPI, or copy the session ID to share.
                          </p>

                          <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <div className="relative flex-1">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Copy className="h-4 w-4 text-indigo-400" />
                              </div>
                              <input
                                type="text"
                                readOnly
                                value={nachData.subscription_session_id}
                                className="block w-full pl-10 pr-3 py-3 border border-indigo-200 rounded-xl leading-5 bg-white text-indigo-900 placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono shadow-sm"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(nachData.subscription_session_id);
                                  alert("Session ID copied to clipboard!");
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Copy ID
                              </button>

                              <button
                                type="button"
                                disabled={openingCheckout}
                                onClick={() => openCashfreeCheckout(nachData.subscription_session_id)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary,#2e3192)] px-6 py-3 text-sm font-bold text-white hover:bg-opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {openingCheckout ? "Opening..." : "Checkout"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* --- Create New Mandate Form --- */
                <form onSubmit={handleCreateNachMandate} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-[var(--primary,#2e3192)] text-white shadow-sm">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Create New Mandate</h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Setup eNACH / UPI AutoPay via Cashfree</p>
                      </div>
                    </div>
                    {nachData && (
                      <button
                        type="button"
                        onClick={() => setShowNachForm(false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Left Column */}
                      <div className="space-y-10">
                        {/* Section 1 */}
                        <div className="relative">
                          <div className="absolute top-0 -left-6 bottom-0 w-0.5 bg-indigo-100 hidden lg:block"></div>
                          <div className="absolute -left-[29px] top-0 h-6 w-6 rounded-full bg-indigo-100 border-4 border-white flex items-center justify-center hidden lg:flex">
                            <div className="h-2 w-2 rounded-full bg-[var(--primary,#2e3192)]"></div>
                          </div>
                          <h4 className="text-sm font-bold text-[var(--primary,#2e3192)] mb-5 flex items-center gap-2">
                            <span className="lg:hidden flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px]">1</span>
                            Plan Configuration
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Plan Type</label>
                              <select
                                value={nachForm.plan_type}
                                onChange={(e) => setNachForm(prev => ({ ...prev, plan_type: e.target.value }))}
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs cursor-pointer"
                              >
                                <option value="ON_DEMAND">ON DEMAND (Flexible)</option>
                                <option value="PERIODIC">PERIODIC (Fixed)</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Payment Channels</label>
                              <div className="flex h-[42px] items-center gap-4 bg-white rounded-xl border border-slate-200 px-3.5 shadow-3xs">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={nachForm.payment_methods.includes("enach")}
                                    onChange={(e) => {
                                      const updated = e.target.checked
                                        ? [...nachForm.payment_methods, "enach"]
                                        : nachForm.payment_methods.filter(m => m !== "enach");
                                      setNachForm(prev => ({ ...prev, payment_methods: updated }));
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                                  />
                                  eNACH
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={nachForm.payment_methods.includes("upi")}
                                    onChange={(e) => {
                                      const updated = e.target.checked
                                        ? [...nachForm.payment_methods, "upi"]
                                        : nachForm.payment_methods.filter(m => m !== "upi");
                                      setNachForm(prev => ({ ...prev, payment_methods: updated }));
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                                  />
                                  UPI
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 p-5 rounded-xl bg-blue-50/50 border border-blue-100">
                            {nachForm.plan_type === "ON_DEMAND" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700">Max Single Debit Amount</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-slate-400 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                      type="number"
                                      required
                                      value={nachForm.max_amount}
                                      onChange={(e) => setNachForm(prev => ({ ...prev, max_amount: Number(e.target.value) }))}
                                      className="block w-full pl-8 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700">Auth Registration Charge</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-slate-400 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                      type="number"
                                      required
                                      value={nachForm.authorization_amount}
                                      onChange={(e) => setNachForm(prev => ({ ...prev, authorization_amount: Number(e.target.value) }))}
                                      className="block w-full pl-8 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500">NPCI rule: 0 for eNACH; typically 1 INR for UPI.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-in fade-in">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700">Cycle Amount</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-slate-400 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                      type="number"
                                      required
                                      value={nachForm.plan_amount}
                                      onChange={(e) => setNachForm(prev => ({ ...prev, plan_amount: Number(e.target.value) }))}
                                      className="block w-full pl-8 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700">Max Amount</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-slate-400 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                      type="number"
                                      required
                                      value={nachForm.plan_max_amount}
                                      onChange={(e) => setNachForm(prev => ({ ...prev, plan_max_amount: Number(e.target.value) }))}
                                      className="block w-full pl-8 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700">Tenure (Cycles)</label>
                                  <input
                                    type="number"
                                    required
                                    value={nachForm.plan_max_cycles}
                                    onChange={(e) => setNachForm(prev => ({ ...prev, plan_max_cycles: Number(e.target.value) }))}
                                    className="block w-full rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 2 */}
                        <div className="relative">
                          <div className="absolute top-0 -left-6 bottom-0 w-0.5 bg-indigo-100 hidden lg:block"></div>
                          <div className="absolute -left-[29px] top-0 h-6 w-6 rounded-full bg-indigo-100 border-4 border-white flex items-center justify-center hidden lg:flex">
                            <div className="h-2 w-2 rounded-full bg-[var(--primary,#2e3192)]"></div>
                          </div>
                          <h4 className="text-sm font-bold text-[var(--primary,#2e3192)] mb-5 flex items-center gap-2">
                            <span className="lg:hidden flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px]">2</span>
                            Customer Details
                          </h4>
                          
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Full Name</label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-slate-400" />
                                  </div>
                                  <input
                                    type="text"
                                    required
                                    value={nachForm.customer_name}
                                    onChange={(e) => setNachForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                    className="block w-full pl-9 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                  </div>
                                  <input
                                    type="text"
                                    required
                                    value={nachForm.customer_phone}
                                    onChange={(e) => setNachForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                                    className="block w-full pl-9 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Email Address</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                  type="email"
                                  required
                                  value={nachForm.customer_email}
                                  onChange={(e) => setNachForm(prev => ({ ...prev, customer_email: e.target.value }))}
                                  className="block w-full pl-9 rounded-xl border-slate-200 bg-white py-2.5 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-10">
                        {/* Section 3 */}
                        <div className="relative">
                          <div className="absolute top-0 -left-6 bottom-0 w-0.5 bg-amber-100 hidden lg:block"></div>
                          <div className="absolute -left-[29px] top-0 h-6 w-6 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center hidden lg:flex">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-5">
                            <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                              <span className="lg:hidden flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px]">3</span>
                              Target Bank Account (TPV)
                            </h4>
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
                          </div>
                          
                          <p className="text-xs text-slate-500 mb-5 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                            Pre-fill target bank details to enforce Trusted Party Verification. If empty, the customer can provide any account.
                          </p>

                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Account Name</label>
                                <input
                                  type="text"
                                  placeholder="As per bank"
                                  value={nachForm.account_holder_name}
                                  onChange={(e) => setNachForm(prev => ({ ...prev, account_holder_name: e.target.value }))}
                                  className="block w-full rounded-xl border-slate-200 bg-white py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow shadow-3xs"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Account Number</label>
                                <input
                                  type="text"
                                  value={nachForm.account_number}
                                  onChange={(e) => setNachForm(prev => ({ ...prev, account_number: e.target.value }))}
                                  className="block w-full rounded-xl border-slate-200 bg-white py-2.5 px-3.5 text-sm font-mono text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow shadow-3xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                              <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">IFSC Code</label>
                                <input
                                  type="text"
                                  value={nachForm.ifsc}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setNachForm(prev => ({ ...prev, ifsc: val, bank_code: val.substring(0, 4) }));
                                  }}
                                  className="block w-full rounded-xl border-slate-200 bg-white py-2.5 px-3.5 text-sm font-mono text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow shadow-3xs uppercase"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Type</label>
                                <select
                                  value={nachForm.account_type}
                                  onChange={(e) => setNachForm(prev => ({ ...prev, account_type: e.target.value }))}
                                  className="block w-full rounded-xl border-slate-200 bg-white py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-shadow shadow-3xs cursor-pointer"
                                >
                                  <option value="SAVINGS">SAVINGS</option>
                                  <option value="CURRENT">CURRENT</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 4 */}
                        <div className="relative">
                          <div className="absolute -left-[29px] top-0 h-6 w-6 rounded-full bg-indigo-100 border-4 border-white flex items-center justify-center hidden lg:flex">
                            <div className="h-2 w-2 rounded-full bg-[var(--primary,#2e3192)]"></div>
                          </div>
                          <h4 className="text-sm font-bold text-[var(--primary,#2e3192)] mb-5 flex items-center gap-2">
                            <span className="lg:hidden flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px]">4</span>
                            Mandate Note
                          </h4>
                          
                          <div className="space-y-1.5">
                            <textarea
                              value={nachForm.subscription_note}
                              onChange={(e) => setNachForm(prev => ({ ...prev, subscription_note: e.target.value }))}
                              placeholder="Reason for mandate..."
                              className="block w-full rounded-xl border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow shadow-3xs resize-none min-h-[100px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-end gap-4">
                    {nachData && (
                      <button
                        type="button"
                        onClick={() => setShowNachForm(false)}
                        className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={creatingNach}
                      className="w-full sm:w-auto rounded-xl bg-[var(--primary,#2e3192)] px-8 py-3 text-sm font-bold text-white hover:bg-opacity-90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {creatingNach ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Generate Mandate Link"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/18 px-4 py-6 backdrop-blur-[1px]">
          <div className="w-full max-w-[680px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">Assign To</h3>
                <p className="mt-2 text-xs font-medium text-[#64748B]">
                  Select a user or team to assign this application. They will be responsible for the next actions.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-[#1E2A5A] transition-all hover:bg-slate-50 cursor-pointer"
                aria-label="Close assign modal"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-5 pt-2">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1E2A5A]">
                    Assigned To <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid h-10 grid-cols-2 overflow-hidden rounded-lg border border-[#D7DEE9] bg-white">
                    <label className="flex cursor-pointer items-center gap-2 border-r border-[#E2E8F0] px-3 text-xs font-bold text-[#1E293B]">
                      <input type="radio" name="assignTarget" defaultChecked className="h-4 w-4 accent-[#5F39F8]" />
                      <span>User</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 px-3 text-xs font-bold text-[#475569]">
                      <input type="radio" name="assignTarget" className="h-4 w-4 accent-[#5F39F8]" />
                      <span>Team</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1E2A5A]">
                    Select Dept <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="h-10 w-full appearance-none rounded-lg border border-[#D7DEE9] bg-white px-3 pr-9 text-xs font-semibold text-[#475569] outline-none transition-colors focus:border-[#5F39F8]">
                      <option>Credit Department</option>
                      <option>Operations</option>
                      <option>Risk Team</option>
                      <option>Branch Team</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1E2A5A]">
                    Search Users <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      placeholder="Search and select user"
                      className="h-10 w-full rounded-lg border border-[#D7DEE9] bg-white px-9 text-xs font-semibold text-[#1E293B] outline-none transition-colors placeholder:text-[#64748B] focus:border-[#5F39F8]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1E2A5A]">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="h-10 w-full appearance-none rounded-lg border border-[#D7DEE9] bg-white pl-7 pr-9 text-xs font-semibold text-[#1E293B] outline-none transition-colors focus:border-[#5F39F8]">
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <span className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500" />
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-[#1E2A5A]">Remarks</label>
                  <div className="relative">
                    <textarea
                      placeholder="Enter remarks"
                      maxLength={500}
                      className="h-[86px] w-full resize-none rounded-lg border border-[#D7DEE9] bg-white px-3 py-3 text-xs font-semibold text-[#1E293B] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#5F39F8]"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] font-bold text-[#64748B]">0 / 500</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-md bg-[#F1F3FF] px-3 py-3 text-xs font-semibold text-[#2536D8]">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#2536D8] text-[10px] font-black">i</span>
                <span>The selected user will be notified and can take action on this application.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] px-6 py-4">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="h-9 min-w-[148px] rounded-md border border-[#D7DEE9] bg-white px-5 text-xs font-extrabold text-[#1E2A5A] transition-all hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="h-9 min-w-[148px] rounded-md bg-[#5F18F6] px-5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#4F0EDB] cursor-pointer"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => {
          if (previewDoc?.url && !previewDoc.url.startsWith("blob")) window.URL.revokeObjectURL(previewDoc.url);
          setIsPreviewOpen(false);
          setPreviewDoc(null);
        }}
        title={previewDoc?.name || "Document Preview"}
      >
        <div className="flex h-[75vh] w-full items-center justify-center overflow-auto rounded-xl bg-slate-100">
          {previewDoc?.type.includes("pdf") ? (
            <iframe src={previewDoc.url + "#toolbar=0&navpanes=0&view=FitH"} className="h-full w-[85%] border-none" />
          ) : previewDoc?.type.includes("image") ? (
            <img src={previewDoc.url} alt={previewDoc.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-center p-5">
              <p className="mb-3 text-[13px] text-slate-500">Preview not available for this file type.</p>
              <a href={previewDoc?.url} download={previewDoc?.name} className="text-[13px] font-bold text-[var(--primary,#2e3192)] underline">Download to View</a>
            </div>
          )}
        </div>
      </Modal>

      {/* Equifax Full Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={`Equifax PCRLT Credit Report - Application Ref #${id}`}
      >
        <div className="h-[80vh] w-[90vw] max-w-7xl flex flex-col bg-white overflow-hidden rounded-xl">

          {fullReportLoading ? (
            <div className="flex flex-col justify-center items-center flex-1 p-20 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary,#2e3192)] mb-4" />
              <p className="font-bold text-lg">Fetching complete bureau dataset...</p>
            </div>
          ) : fullReportError ? (
            <div className="p-10 text-center text-red-500 flex-1 flex flex-col items-center justify-center">
              <span className="text-5xl block mb-2">⚠️</span>
              <p className="text-lg font-bold mt-4">Report Loading Failed</p>
              <p className="text-sm text-slate-400 mt-1">{fullReportError}</p>
            </div>
          ) : !fullReport ? (
            <div className="p-10 text-center text-slate-500 flex-1 flex items-center justify-center">
              <p>No report loaded.</p>
            </div>
          ) : (() => {
            const cirData = fullReport.raw_response?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData;

            if (!cirData) {
              return (
                <div className="p-10 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
                  <p>Failed to parse credit data: CIRReportData block is missing from raw response.</p>
                  <details className="mt-5 text-left w-full max-w-lg">
                    <summary className="cursor-pointer font-bold text-sm text-slate-700">Show raw response</summary>
                    <pre className="bg-slate-100 p-3 rounded-lg text-xs overflow-auto font-mono mt-2">
                      {JSON.stringify(fullReport, null, 2)}
                    </pre>
                  </details>
                </div>
              );
            }

            const personal = cirData.IDAndContactInfo?.PersonalInfo?.[0] || {};
            const scoreDetails = cirData.ScoreDetails || {};
            const accountsSummary = cirData.RetailAccountsSummary || {};
            const accounts = cirData.RetailAccountDetails || [];
            const enquiries = cirData.Enquiries || [];

            // Parse Identity Documents list safely from nested properties
            const identitiesList: Array<{ idType: string; idNumber: string }> = [];
            if (cirData.IDAndContactInfo?.IdentityInfo) {
              const identityInfo = cirData.IDAndContactInfo.IdentityInfo;
              Object.keys(identityInfo).forEach((key) => {
                const list = identityInfo[key];
                if (Array.isArray(list)) {
                  list.forEach((item: any) => {
                    if (item.IdNumber) {
                      const idType = key.replace(/Id$/i, "").toUpperCase();
                      identitiesList.push({ idType, idNumber: item.IdNumber });
                    }
                  });
                }
              });
            }

            // Format numbers to INR locale
            const fmtAmt = (val: any) => {
              if (val === null || val === undefined || isNaN(Number(val))) return "—";
              return `₹${Number(val).toLocaleString("en-IN")}`;
            };

            return (
              <div className="flex flex-col h-full overflow-hidden">

                {/* Top Info Banner */}
                <div className="bg-slate-900 text-white px-6 py-5 rounded-lg flex justify-between items-center mb-4 shrink-0 shadow-sm">
                  <div>
                    <h3 className="text-lg font-extrabold text-white m-0">
                      {personal.FirstName ? `${personal.FirstName} ${personal.MiddleName ? `${personal.MiddleName} ` : ""}${personal.LastName}`.trim() : "Applicant Report"}
                    </h3>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                      <span><strong>Order No:</strong> {fullReport.report_order_no || "N/A"}</span>
                      <span>•</span>
                      <span><strong>Pulled At:</strong> {fullReport.pulled_at ? new Date(fullReport.pulled_at).toLocaleString("en-IN") : "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CREDIT SCORE</div>
                      <div className="text-3xl font-black text-green-500 leading-none mt-1">
                        {fullReport.bureau_score || scoreDetails.Value || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub Tabs inside Modal */}
                <div className="flex gap-4 border-b border-slate-200 mb-4 px-1 shrink-0 overflow-x-auto scrollbar-none">
                  {(["summary", "accounts", "enquiries", "raw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveReportTab(tab)}
                      className={`py-2 px-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer
                        ${activeReportTab === tab
                          ? "text-[var(--primary,#2e3192)] border-[var(--primary,#2e3192)]"
                          : "text-slate-400 hover:text-slate-600 border-transparent"
                        }`}
                    >
                      {tab === "summary" ? "Summary & Demographics" : tab === "enquiries" ? `Recent Enquiries (${enquiries.length})` : tab === "accounts" ? `Credit Accounts (${accounts.length})` : "Raw JSON Data"}
                    </button>
                  ))}
                </div>

                {/* Modal Body Container with Scroll */}
                <div className="flex-grow overflow-y-auto pr-1 p-1">

                  {/* Summary & Demographics Tab */}
                  {activeReportTab === "summary" && (
                    <div className="flex flex-col gap-5">

                      {/* Section 1: Account Metrics Grid */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-700 m-0 mb-4 uppercase tracking-wider">
                          📊 Equifax Bureau Accounts Stats
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <ModalStat label="Total Accounts" value={accountsSummary.NoOfAccounts} />
                          <ModalStat label="Active Accounts" value={accountsSummary.NoOfActiveAccounts} />
                          <ModalStat label="Write-Off Accounts" value={accountsSummary.NoOfWriteOffs} />
                          <ModalStat label="Past Due Accounts" value={accountsSummary.NoOfPastDueAccounts} />

                          <ModalStat label="Total Sanctioned" value={fmtAmt(accountsSummary.TotalSanctionAmount)} />
                          <ModalStat label="Total Outstanding" value={fmtAmt(accountsSummary.TotalBalanceAmount)} />
                          <ModalStat label="Total Past Due" value={fmtAmt(accountsSummary.TotalPastDue)} />
                          <ModalStat label="Monthly EMI (Total)" value={fmtAmt(accountsSummary.TotalMonthlyPaymentAmount)} />
                        </div>
                      </div>

                      {/* Section 2: Personal details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Demographic info */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-black text-slate-700 m-0 mb-4 uppercase tracking-wider">
                            👤 Personal Information
                          </h4>
                          <div className="grid gap-3 text-sm">
                            <InfoRow label="Gender" value={personal.Gender === "2" ? "Male" : personal.Gender === "1" ? "Female" : personal.Gender || "N/A"} />
                            <InfoRow label="Date of Birth" value={personal.DateOfBirth ? formatDob(personal.DateOfBirth.replace(/-/g, "")) : "N/A"} />

                            {/* Identities list */}
                            {identitiesList.length > 0 && (
                              <div className="mt-3 border-t border-slate-100 pt-3">
                                <span className="text-xs font-bold text-slate-500 block mb-2">Documents Provided</span>
                                {identitiesList.map((idInfo, idx) => (
                                  <div key={idx} className="flex justify-between py-1 text-xs">
                                    <span className="text-slate-400 font-medium">{idInfo.idType}</span>
                                    <span className="text-slate-700 font-bold font-mono">{idInfo.idNumber}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contacts & Addresses info */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-black text-slate-700 m-0 mb-4 uppercase tracking-wider">
                            🏠 Addresses & Contacts
                          </h4>
                          <div className="flex flex-col gap-3 text-sm">

                            {/* Address List */}
                            {cirData.IDAndContactInfo?.AddressInfo && (
                              <div>
                                <span className="text-xs font-bold text-slate-500 block mb-1.5">Address Details</span>
                                {cirData.IDAndContactInfo.AddressInfo.slice(0, 2).map((addr: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{addr.AddressType || "Address"}</div>
                                    <div className="text-slate-600 font-medium text-xs mt-0.5">
                                      {addr.Address}, {addr.State || ""}, {addr.Postal || ""}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Phone List */}
                            {cirData.IDAndContactInfo?.PhoneInfo && (
                              <div className="border-t border-slate-100 pt-2">
                                <span className="text-xs font-bold text-slate-500 block mb-1.5">Phone Contacts</span>
                                <div className="flex gap-2 flex-wrap">
                                  {cirData.IDAndContactInfo.PhoneInfo.map((pInfo: any, idx: number) => (
                                    <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                                      {pInfo.Number} ({pInfo.PhoneType || "Mobile"})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Accounts Tab */}
                  {activeReportTab === "accounts" && (
                    <div className="flex flex-col gap-4">
                      {accounts.length === 0 ? (
                        <p className="text-center text-slate-400 py-10 font-semibold">No credit accounts found in Equifax records.</p>
                      ) : (
                        accounts.map((acc: any, idx: number) => {
                          const status = acc.AccountStatus || "";
                          const isDelinquent = Number(acc.PastDueAmount) > 0;

                          return (
                            <div key={idx} className={`border border-slate-200 rounded-xl p-4 ${isDelinquent ? "bg-red-50/10" : "bg-white"}`}>
                              {/* Header info */}
                              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                                <div>
                                  <div className="font-extrabold text-sm text-slate-800">
                                    {acc.Institution || "Unknown Lender"}
                                  </div>
                                  <div className="flex gap-2.5 mt-1 text-xs text-slate-400">
                                    <span><strong>Type:</strong> {acc.AccountType || "N/A"}</span>
                                    <span>•</span>
                                    <span><strong>Acct No:</strong> {acc.AccountNumber || "N/A"}</span>
                                    <span>•</span>
                                    <span><strong>Date Opened:</strong> {acc.DateOpened || "N/A"}</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 items-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${acc.Open?.toLowerCase() === "yes" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {acc.Open?.toLowerCase() === "yes" ? "Open" : "Closed"}
                                  </span>

                                  {status && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${isDelinquent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                                      }`}>
                                      {status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Balance & Sanction grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">SANCTION AMOUNT</span>
                                  <span className="text-slate-700 font-bold mt-0.5 block">{fmtAmt(acc.SanctionAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">CURRENT BALANCE</span>
                                  <span className="text-slate-700 font-bold mt-0.5 block">{fmtAmt(acc.Balance)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">PAST DUE AMOUNT</span>
                                  <span className={`font-extrabold mt-0.5 block ${isDelinquent ? "text-red-600" : "text-slate-750"}`}>
                                    {fmtAmt(acc.PastDueAmount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">OWNERSHIP</span>
                                  <span className="text-slate-600 font-semibold mt-0.5 block">{acc.OwnershipType || "Individual"}</span>
                                </div>
                              </div>

                              {/* 48 Month DPD Grid */}
                              {acc.History48Months && acc.History48Months.length > 0 && (
                                <div className="border-t border-dashed border-slate-200 pt-3">
                                  <div className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wide">
                                    📅 Payment History & DPD Grid (Last 24 Months)
                                  </div>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {acc.History48Months.slice(0, 24).map((hItem: any, hIdx: number) => {
                                      const status = (hItem.PaymentStatus || "").toString().trim();
                                      const isClean = status === "000" || status === "NEW" || status === "CLSD" || status === "*";
                                      const cleanBg = status === "000" ? "bg-green-50" : "bg-slate-50";
                                      const cleanText = status === "000" ? "text-green-700" : "text-slate-400";

                                      const isMinor = !isClean && Number(status.replace("+", "")) < 30;
                                      const isMajor = !isClean && Number(status.replace("+", "")) >= 30 && Number(status.replace("+", "")) < 90;
                                      const isCritical = !isClean && Number(status.replace("+", "")) >= 90;

                                      const bg = isClean ? cleanBg : (isMinor ? "bg-amber-50" : (isMajor ? "bg-orange-50" : "bg-red-50"));
                                      const color = isClean ? cleanText : (isMinor ? "text-amber-700" : (isMajor ? "text-orange-700" : "text-red-700"));
                                      const displayVal = status === "000" ? "0" : status;

                                      return (
                                        <div key={hIdx} className={`flex flex-col items-center min-w-[36px] border border-slate-100 rounded p-1 ${bg}`}>
                                          <span className="text-[8px] font-bold text-slate-400">{hItem.key}</span>
                                          <span className={`text-[10px] font-black ${color}`}>{displayVal}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Enquiries Tab */}
                  {activeReportTab === "enquiries" && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {enquiries.length === 0 ? (
                        <p className="text-center text-slate-400 py-10 font-semibold">No recent credit enquiries logged.</p>
                      ) : (
                        <table className="w-full border-collapse text-xs text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">#</th>
                              <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">Institution</th>
                              <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">Purpose</th>
                              <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">Amount</th>
                              <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {enquiries.map((enq: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 text-slate-400 font-semibold">{idx + 1}</td>
                                <td className="p-3 text-slate-800 font-bold">{enq.Institution}</td>
                                <td className="p-3 text-slate-600">{enq.Purpose}</td>
                                <td className="p-3 text-slate-800 font-bold">{fmtAmt(enq.Amount)}</td>
                                <td className="p-3 text-slate-400">{enq.Date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Raw JSON Tab */}
                  {activeReportTab === "raw" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(fullReport, null, 2));
                            alert("Raw JSON payload copied to clipboard!");
                          }}
                          className="bg-[var(--primary,#2e3192)] hover:opacity-90 text-white border-none px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Copy Raw JSON
                        </button>
                      </div>
                      <pre className="bg-slate-900 text-sky-400 p-4 rounded-xl overflow-auto max-h-[50vh] text-[11px] font-mono text-left">
                        {JSON.stringify(fullReport, null, 2)}
                      </pre>
                    </div>
                  )}

                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Edit Side Sheet Drawer — context-aware */}
      {isEditDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsEditDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in" 
          />
          
          {activeTab === "Contact & Address" ? (
            /* ── Edit Contact & Address Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Contact &amp; Address</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update the contact and address details.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Contact Information */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] uppercase tracking-wider mb-3">Contact Information</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Mobile Number <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="9876543210" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Alternate Mobile</label>
                      <input type="text" defaultValue="9123456780" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Email ID <span className="text-rose-500">*</span></label>
                      <input type="email" defaultValue="rahul.sharma@email.com" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Landline</label>
                      <input type="text" defaultValue="020-1234567" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Preferred Contact Time <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>10:00 AM - 06:00 PM</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Preferred Language</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>English</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-[#64748B]">Communication Preference <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <div className="w-4 h-4 rounded bg-[#5F39F8] flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                          <span className="font-bold text-[#1E293B]">Email</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <div className="w-4 h-4 rounded bg-[#5F39F8] flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                          <span className="font-bold text-[#1E293B]">SMS</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <div className="w-4 h-4 rounded bg-[#5F39F8] flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                          <span className="font-bold text-[#1E293B]">WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <div className="w-4 h-4 rounded border border-[#E2E8F0] bg-white" />
                          <span className="font-bold text-[#1E293B]">Call</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">WhatsApp Number</label>
                      <input type="text" defaultValue="9876543210" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                  </div>
                </div>
                
                <hr className="border-[#E2E8F0]" />

                {/* Current Address */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] uppercase tracking-wider mb-3">Current Address</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Address Line 1 <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="Flat No. 101, Maple Heights," className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Address Line 2</label>
                      <input type="text" defaultValue="Baner Road, Near D Mart" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Landmark</label>
                      <input type="text" defaultValue="Near D Mart" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Locality <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="Baner" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Village</label>
                      <input type="text" placeholder="Enter village" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">City <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue="Pune" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">District <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue="Pune" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Changes saved successfully.");
                  }}
                  className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : activeTab === "Employment / Business" ? (
            /* ── Edit Employment / Business Details Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Employment / Business Details</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update employment or business related information.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Employment Type */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Employment Type</h4>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border-4 border-[#5F39F8] bg-white flex items-center justify-center"></div>
                      <span className="font-bold text-[#1E293B]">Salaried</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
                      <span className="font-bold text-[#1E293B]">Self Employed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
                      <span className="font-bold text-[#1E293B]">Business Owner</span>
                    </label>
                  </div>
                </div>
                
                {/* Salaried Details */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Salaried Details</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Employer Name <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="TCS Pvt. Ltd." className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Employer Category <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Private Limited</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Employee ID</label>
                      <input type="text" defaultValue="TCS98765" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Department</label>
                      <input type="text" defaultValue="IT Services" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Designation <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="Senior Software Engineer" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Date of Joining <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input type="text" defaultValue="15/06/2018" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                        <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Total Experience <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                            <option>6 Years 11 Months</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Exp. in Current Org. <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                            <option>5 Years 11 Months</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Salary Mode <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                            <option>Bank Transfer</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Salary Account <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer text-[10px]">
                            <option>50100012345678 - HDFC Bank</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">PF Number</label>
                        <input type="text" defaultValue="PY/PN/1234567/000/000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">ESI Number</label>
                        <input type="text" placeholder="Enter ESI Number" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Monthly Gross Salary (₹) <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue="120000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Net Salary / In Hand (₹) <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue="100000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Incentives (Monthly Avg.) (₹)</label>
                        <input type="text" defaultValue="10000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Annual Bonus (₹)</label>
                        <input type="text" defaultValue="120000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Variable Pay (₹)</label>
                        <input type="text" defaultValue="60000" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Employment Status <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                            <option>Permanent</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Changes saved successfully.");
                  }}
                  className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : activeTab === "Financial Profile" ? (
            /* ── Edit Financial Profile Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Financial Profile</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update the financial information below.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Income Details */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Income Details</h4>
                  
                  {/* Table-like header */}
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="w-24 text-[10px] font-bold text-[#64748B] text-right">Annual Income (₹)</span>
                    <span className="w-24 text-[10px] font-bold text-[#64748B] text-right">Monthly Income (₹)</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Salary Income</label>
                      <input type="text" defaultValue="12,00,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="1,00,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Business Income</label>
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Rental Income</label>
                      <input type="text" defaultValue="2,40,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="20,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Agricultural Income</label>
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Pension</label>
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="0" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Other Income</label>
                      <input type="text" defaultValue="3,60,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                      <input type="text" defaultValue="30,000" className="w-24 h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white text-right" />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                      <label className="font-extrabold text-[#1E293B] flex-1">Total Income</label>
                      <input type="text" defaultValue="18,00,000" readOnly className="w-24 h-8 px-3 border border-transparent rounded-lg font-bold text-[#1E293B] bg-slate-50 text-right cursor-not-allowed" />
                      <input type="text" defaultValue="1,50,000" readOnly className="w-24 h-8 px-3 border border-transparent rounded-lg font-bold text-[#1E293B] bg-slate-50 text-right cursor-not-allowed" />
                    </div>
                  </div>
                </div>
                
                {/* Monthly Expenses */}
                <div className="pt-2">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Monthly Expenses</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Household Expenses</label>
                      <input type="text" defaultValue="25,000" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">EMI</label>
                      <input type="text" defaultValue="22,000" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Rent</label>
                      <input type="text" defaultValue="10,000" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">School Fees</label>
                      <input type="text" defaultValue="5,000" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Utility Bills</label>
                      <input type="text" defaultValue="4,000" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Insurance</label>
                      <input type="text" defaultValue="2,500" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Credit Card Payment</label>
                      <input type="text" defaultValue="1,500" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="font-bold text-[#64748B] flex-1">Other Expenses</label>
                      <input type="text" defaultValue="0" className="w-[200px] h-8 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                      <label className="font-extrabold text-[#1E293B] flex-1">Total Expenses</label>
                      <input type="text" defaultValue="70,000" readOnly className="w-[200px] h-8 px-3 border border-transparent rounded-lg font-bold text-[#1E293B] bg-slate-50 cursor-not-allowed" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Changes saved successfully.");
                  }}
                  className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : activeTab === "Communication" ? (
            /* ── New Communication Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-[#1E293B]">New Communication</h3>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
                
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Channel <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>Select Channel</option>
                      <option>Email</option>
                      <option>SMS</option>
                      <option>WhatsApp</option>
                      <option>Call</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Communication Type <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>Select Communication Type</option>
                      <option>Document Request</option>
                      <option>Application Update</option>
                      <option>Verification</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Subject <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="Enter subject" className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Message <span className="text-rose-500">*</span></label>
                  <textarea
                    placeholder="Type your message here..."
                    className="w-full h-32 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                  ></textarea>
                  <p className="text-right text-[10px] text-[#94A3B8] font-bold">0 / 2000</p>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-[#64748B]">Attach Document (Optional)</label>
                  <div className="border border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center py-6 bg-slate-50/50">
                    <UploadCloud className="w-6 h-6 text-[#5F39F8] mb-2" />
                    <p className="text-xs font-bold text-[#1E293B] mb-1">Drag & drop files here</p>
                    <p className="text-[10px] text-[#64748B] mb-3">or</p>
                    <button className="h-8 px-4 bg-white border border-[#5F39F8] text-[#5F39F8] font-bold text-xs rounded-lg cursor-pointer">Browse File</button>
                  </div>
                  <p className="text-[10px] text-[#64748B] font-medium">Supported formats: PDF, JPG, PNG | Max size: 20MB</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Use Template (Optional)</label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>Select Template</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button className="flex-1 h-10 border border-[#E2E8F0] text-[#1E293B] hover:bg-slate-50 font-bold rounded-lg transition-colors cursor-pointer text-xs" onClick={() => setIsEditDrawerOpen(false)}>
                    Cancel
                  </button>
                  <button className="flex-1 h-10 bg-[#F1F5F9] text-[#94A3B8] font-bold rounded-lg transition-colors cursor-not-allowed text-xs flex items-center justify-center gap-2">
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>

                <div className="border-t border-[#E2E8F0] pt-6 mt-4">
                  <h4 className="font-bold text-[#1E293B] text-xs mb-4">Customer Contact Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-medium">Email</span>
                      <div className="flex items-center gap-2 font-bold text-[#1E293B]">
                        rahul.sharma@email.com <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-medium">Mobile</span>
                      <div className="flex items-center gap-2 font-bold text-[#1E293B]">
                        +91 98765 43210 <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-medium">Alternate Mobile</span>
                      <div className="flex items-center gap-2 font-bold text-[#1E293B]">
                        +91 91234 56789 <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === "Notes" ? (
            /* ── Add Note Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-[#1E293B]">Add Note</h3>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
                
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Note Type <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>Select Note Type</option>
                      <option>General</option>
                      <option>Income</option>
                      <option>Credit</option>
                      <option>Property</option>
                      <option>Assessment</option>
                      <option>KYC</option>
                      <option>Verification</option>
                      <option>Pending</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Note <span className="text-rose-500">*</span></label>
                  <textarea
                    placeholder="Enter your note here..."
                    className="w-full h-32 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                  ></textarea>
                  <p className="text-right text-[10px] text-[#94A3B8] font-bold">0 / 2000</p>
                </div>

                <div className="space-y-1 border-t border-[#E2E8F0] pt-4">
                  <label className="font-bold text-[#64748B]">Visibility <span className="text-rose-500">*</span></label>
                  <div className="relative mb-2">
                    <select className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>Internal</option>
                      <option>Applicant</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-[#64748B] font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Internal notes are visible to staff only.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
                  <div>
                    <h4 className="font-bold text-[#1E293B] text-xs">Pin Note</h4>
                    <p className="text-[#64748B] text-[10px] mt-0.5">Pin this note to show at the top of the list.</p>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-slate-200 relative cursor-pointer">
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow"></div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button className="flex-1 h-10 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 font-bold rounded-lg transition-colors cursor-pointer text-xs" onClick={() => setIsEditDrawerOpen(false)}>
                    Cancel
                  </button>
                  <button className="flex-1 h-10 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer text-xs" onClick={() => setIsEditDrawerOpen(false)}>
                    Add Note
                  </button>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl p-4 mt-4">
                  <h4 className="font-bold text-[#1E293B] text-xs mb-3">Note Types</h4>
                  <div className="space-y-3">
                    {[
                      { name: "General", desc: "General comments or observations", dot: "bg-fuchsia-500", badge: "bg-fuchsia-50 text-fuchsia-600" },
                      { name: "Income", desc: "Income related notes", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-600" },
                      { name: "Credit", desc: "Credit score or bureau related notes", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
                      { name: "Property", desc: "Property verification related notes", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-600" },
                      { name: "Assessment", desc: "Loan assessment related notes", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-600" },
                      { name: "KYC", desc: "KYC verification related notes", dot: "bg-pink-500", badge: "bg-pink-50 text-pink-600" },
                      { name: "Verification", desc: "Field verification or visit notes", dot: "bg-cyan-500", badge: "bg-cyan-50 text-cyan-600" },
                      { name: "Pending", desc: "Pending documents or actions", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500" }
                    ].map(type => (
                      <div key={type.name} className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 w-28 shrink-0">
                          <div className={`w-2 h-2 rounded-full ${type.dot}`}></div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${type.badge}`}>{type.name}</span>
                        </div>
                        <span className="text-[#64748B] text-[10px] font-medium">{type.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === "Audit Trail" ? (
            /* ── Filter Audit Trail Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-bold text-[#1E293B]">Filter Audit Trail</h3>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
                
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Date Range</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="text" defaultValue="09/05/2024" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] cursor-pointer" />
                    </div>
                    <span className="text-[#64748B] font-bold text-[10px]">to</span>
                    <div className="relative flex-1">
                      <input type="text" defaultValue="16/05/2024" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Module</label>
                  <div className="relative">
                    <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>All Modules</option>
                      <option>Application</option>
                      <option>Customer Profile</option>
                      <option>Documents</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Activity</label>
                  <div className="relative">
                    <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>All Activities</option>
                      <option>Created</option>
                      <option>Updated</option>
                      <option>Deleted</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Performed By</label>
                  <div className="relative">
                    <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>All Users</option>
                      <option>Arjun Singh</option>
                      <option>Priya Mehta</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Role</label>
                  <div className="relative">
                    <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                      <option>All Roles</option>
                      <option>Super Admin</option>
                      <option>Credit Analyst</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Field / Section</label>
                  <input type="text" placeholder="Enter field or section" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">IP Address</label>
                  <input type="text" placeholder="Enter IP Address" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white" />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button className="flex-1 h-9 border border-[#5F39F8] text-[#5F39F8] hover:bg-indigo-50 font-bold rounded-lg transition-colors cursor-pointer">
                    Reset
                  </button>
                  <button className="flex-1 h-9 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer" onClick={() => setIsEditDrawerOpen(false)}>
                    Apply Filters
                  </button>
                </div>

                <div className="pt-5 border-t border-[#E2E8F0]">
                  <h4 className="font-bold text-[#1E293B] mb-3 text-sm">Quick Filters</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Custom"].map(filter => (
                      <button 
                        key={filter} 
                        className={`h-8 border rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${filter === "Last 7 Days" ? "border-[#5F39F8] bg-indigo-50/50 text-[#5F39F8]" : "border-[#E2E8F0] text-[#64748B] hover:border-indigo-200 hover:text-[#1E293B] bg-white"}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2 text-[#64748B] font-medium text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    All times shown in IST
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === "Fraud & Compliance" ? (
            /* ── Edit Fraud & Compliance Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Fraud & Compliance</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update fraud check and compliance information.</p>
                </div>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Fraud Check Summary */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Fraud Check Summary</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Overall Risk Score (0-100) <span className="text-rose-500">*</span></label>
                      <input type="number" defaultValue="23" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Risk Category</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Low Risk</option>
                          <option>Medium Risk</option>
                          <option>High Risk</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Fraud Checks Performed <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="12 / 12" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Alerts <span className="text-rose-500">*</span></label>
                      <input type="number" defaultValue="1" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="font-bold text-[#64748B]">Compliance Status</label>
                    <div className="flex items-center gap-2.5">
                      {["Clean", "Flagged", "Review"].map((s) => (
                        <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${s === "Clean" ? "border-[#5F39F8]" : "border-[#CBD5E1]"}`}>
                            {s === "Clean" && <div className="w-2 h-2 rounded-full bg-[#5F39F8]"></div>}
                          </div>
                          <span className="font-bold text-[#1E293B]">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="font-bold text-[#64748B]">Internal Remarks</label>
                    <textarea
                      defaultValue="Velocity alert observed. Applicant explanation received and reviewed."
                      className="w-full h-16 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                    ></textarea>
                    <p className="text-right text-[9px] text-[#94A3B8]">120 / 500</p>
                  </div>
                </div>

                {/* Sanctions & Watchlist */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Sanctions & Watchlist</h4>
                  <div className="space-y-3">
                    {[
                      "PEP / Politically Exposed Person",
                      "OFAC Sanctions List",
                      "UN Sanctions List",
                      "EU Sanctions List",
                      "SDN List",
                      "India Sanctions / MHA List",
                    ].map((item) => (
                      <div key={item} className="flex items-center justify-between">
                        <span className="font-bold text-[#64748B]">{item}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#64748B]">No</span>
                          <div className="w-8 h-4 rounded-full bg-slate-200 relative cursor-pointer">
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Velocity Check Details */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Velocity Check Details</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Applications in Last 7 Days</label>
                      <input type="number" defaultValue="3" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Decision</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Review</option>
                          <option>Pass</option>
                          <option>Fail</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Reviewed By</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Arjun Singh</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Reviewed On</label>
                      <div className="relative">
                        <input type="text" defaultValue="16/05/2024" className="w-full h-9 px-3 pr-10 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="font-bold text-[#64748B]">Comments</label>
                    <textarea
                      defaultValue="Customer contacted and KYC re-verified. No suspicious activity found."
                      className="w-full h-16 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                    ></textarea>
                    <p className="text-right text-[9px] text-[#94A3B8]">74 / 500</p>
                  </div>
                </div>

                {/* AML Risk */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">AML Risk Level</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">AML Risk Level</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Source</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Salary</option>
                          <option>Business</option>
                          <option>Rental</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source of Funds Document */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Source of Funds Document</h4>
                  <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200/50 rounded-lg">
                    <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1E293B] truncate">Salary_Slip_May2024.pdf</p>
                      <p className="text-[10px] text-[#64748B]">245 KB</p>
                    </div>
                    <button className="text-[#94A3B8] hover:text-red-500 cursor-pointer transition-colors">✕</button>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Changes saved successfully.");
                  }}
                  className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : activeTab === "Bureau" ? (
            /* ── Add / Update Bureau Report Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Add / Update Bureau Report</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update bureau report details or upload PDF.</p>
                </div>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Provider Selection */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Provider <span className="text-rose-500">*</span></h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "CIBIL", color: "#E31837", selected: true },
                      { name: "CRIF", color: "#00529B", selected: false },
                      { name: "EQUIFAX", color: "#C41230", selected: false },
                      { name: "experian", color: "#702082", selected: false },
                    ].map((p) => (
                      <button
                        key={p.name}
                        className={`relative h-14 rounded-xl border-2 flex items-center justify-center font-extrabold text-xs cursor-pointer transition-all ${p.selected ? "border-[#5F39F8] bg-indigo-50/40" : "border-[#E2E8F0] bg-white hover:border-indigo-200"}`}
                        style={{ color: p.color }}
                      >
                        {p.name}
                        {p.selected && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#5F39F8] flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Report Source */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Report Source</h4>
                  <div className="flex items-center gap-6 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border-2 border-[#5F39F8] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#5F39F8]"></div>
                      </div>
                      <span className="font-bold text-[#1E293B]">Fetch via API</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border-2 border-[#CBD5E1]"></div>
                      <span className="font-bold text-[#64748B]">Upload PDF</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-[#64748B] font-medium mb-3">Pull report instantly from bureau via API</p>
                  <button className="h-9 px-4 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Pull Report
                  </button>
                  <p className="text-[10px] text-[#94A3B8] font-medium mt-2">Last pulled on  16 May 2024, 09:15 AM</p>
                </div>

                {/* Report Details */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Report Details</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Report Date <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input type="text" defaultValue="16/05/2024" className="w-full h-9 px-3 pr-10 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Membership Number</label>
                      <input type="text" defaultValue="TU12345678" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Report Type</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Individual</option>
                          <option>Commercial</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload PDF */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-1">Upload PDF <span className="text-[#94A3B8] font-medium">(If API Unavailable)</span> <AlertCircle className="h-3 w-3 inline text-[#94A3B8]" /></h4>
                  <div className="mt-3 border-2 border-dashed border-[#E2E8F0] rounded-xl p-5 text-center bg-slate-50/50 hover:border-indigo-300 transition-colors cursor-pointer">
                    <UploadCloud className="h-6 w-6 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-[#64748B]">Drag & drop file here</p>
                    <p className="text-[9px] text-[#94A3B8] mb-3">or</p>
                    <button className="h-7 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#1E293B] text-[10px] font-bold rounded-lg cursor-pointer transition-all">
                      Browse File
                    </button>
                    <p className="text-[9px] text-[#94A3B8] mt-2">Supported formats: PDF | Max size: 10MB</p>
                  </div>

                  {/* Uploaded File */}
                  <div className="mt-3 flex items-center gap-2.5 p-3 bg-red-50 border border-red-200/50 rounded-lg">
                    <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1E293B] truncate">CIBIL_Report_16052024.pdf</p>
                      <p className="text-[10px] text-[#64748B]">2.4 MB</p>
                    </div>
                    <button className="text-[#94A3B8] hover:text-red-500 cursor-pointer transition-colors">✕</button>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="pt-1 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Additional Information (Optional)</h4>
                  <div className="space-y-1">
                    <label className="font-bold text-[#64748B]">Remarks</label>
                    <textarea
                      placeholder="Enter remarks"
                      className="w-full h-16 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                    ></textarea>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Bureau report updated successfully.");
                  }}
                  className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : activeTab === "Banking Details" ? (
            /* ── Edit Banking Details Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Banking Details</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update linked bank accounts and banking information.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Add / Update Bank Account */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Add / Update Bank Account</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Select Bank <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>HDFC Bank</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Account Number <span className="text-rose-500">*</span></label>
                      <input type="text" defaultValue="50100012345678" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Account Type <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Savings</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Account Nickname (Optional)</label>
                      <input type="text" defaultValue="HDFC Salary Account" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Account Holder Name</label>
                      <input type="text" defaultValue="Rahul Sharma" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <div className="w-4 h-4 rounded border border-[#5F39F8] bg-[#5F39F8] flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-[#1E293B]">Set as Primary Account</span>
                    </label>
                  </div>
                </div>
                
                {/* Account Aggregator */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Account Aggregator</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-bold">AA Consent Status</span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-200/50 font-bold">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-bold">Consent ID</span>
                      <span className="text-[#1E293B] font-bold">6f3e2a9b-7d45-4a1c-9d89-1c2e3f45a1c9</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-bold">Consent Valid Till</span>
                      <span className="text-[#1E293B] font-bold">16 May 2025</span>
                    </div>
                    
                    <div className="pt-2">
                      <button className="text-xs font-bold text-[#5F39F8] hover:text-[#4F2EE0] flex items-center gap-1">
                        View / Manage Consent <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="pt-2">
                      <button className="h-9 px-4 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 w-full justify-center">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-fetch Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bank Statement Analyzer */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Bank Statement Analyzer</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#1E293B] font-bold">Enable AI Analysis</span>
                      <div className="w-8 h-4 rounded-full bg-[#5F39F8] relative cursor-pointer">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">Data Available For</label>
                      <div className="relative">
                        <select className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white appearance-none cursor-pointer">
                          <option>Last 12 Months</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-extrabold text-[#5F39F8] mb-3">Additional Notes (Optional)</h4>
                  <textarea 
                    placeholder="Enter notes about this account" 
                    className="w-full h-20 p-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-medium text-[#1E293B] bg-white resize-none"
                  ></textarea>
                </div>

              </div>

              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <Lock className="w-3 h-3" />
                  Your data is secure and encrypted end-to-end.
                </div>
                <div className="flex gap-2.5">
                  <button 
                    onClick={() => setIsEditDrawerOpen(false)}
                    className="h-10 px-6 border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] text-sm font-bold rounded-lg transition-all cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditDrawerOpen(false);
                      alert("Changes saved successfully.");
                    }}
                    className="h-10 px-6 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-sm font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "Identity & KYC" ? (
            /* ── Edit Identity & KYC Drawer ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Identity &amp; KYC</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update identity documents and KYC information.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">

                {/* Identity Documents */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] uppercase tracking-wider mb-3">Identity Documents</h4>

                  {/* Add Document accordion trigger */}
                  <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-[#E2E8F0] bg-slate-50 cursor-pointer mb-3">
                    <span className="font-bold text-[#1E293B] text-xs flex items-center gap-1.5">
                      <span className="text-[#5F39F8] text-sm font-extrabold">+</span> Add Document
                    </span>
                    <ChevronDown size={14} className="text-[#94A3B8]" />
                  </div>

                  {/* Aadhaar — expanded */}
                  <div className="border border-[#E2E8F0] rounded-lg overflow-hidden mb-2">
                    <div className="flex items-center justify-between h-10 px-3 bg-white">
                      <span className="font-bold text-[#1E293B] text-xs">Aadhaar</span>
                      <div className="flex items-center gap-2">
                        <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                          <FileText size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-[#E2E8F0] p-4 bg-white space-y-3">
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Document Number <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue="XXXX XXXX 3452" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="font-bold text-[#64748B]">Issue Date</label>
                          <div className="relative">
                            <input type="text" defaultValue="12/05/2015" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                            <Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-[#64748B]">Expiry Date</label>
                          <div className="relative">
                            <input type="text" placeholder="DD/MM/YYYY" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                            <Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Name on Document <span className="text-rose-500">*</span></label>
                        <input type="text" defaultValue={`${appData.first_name} ${appData.last_name}`} className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Clarified By</label>
                        <input type="text" placeholder="Enter clarifier" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B] bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="font-bold text-[#64748B]">Verified By</label>
                          <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                            <option>System</option>
                            <option>Manual</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-[#64748B]">OCR Status</label>
                          <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                            <option>Success</option>
                            <option>Failed</option>
                            <option>Pending</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#64748B]">Verification Status <span className="text-rose-500">*</span></label>
                        <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                          <option>Verified</option>
                          <option>Pending</option>
                          <option>Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PAN — collapsed */}
                  {["PAN", "Passport", "Driving License"].map((doc) => (
                    <div key={doc} className="flex items-center justify-between h-10 px-3 rounded-lg border border-[#E2E8F0] bg-slate-50/50 mb-2 cursor-pointer">
                      <span className="font-bold text-[#1E293B] text-xs">{doc}</span>
                      <div className="flex items-center gap-2">
                        <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                          <FileText size={12} />
                        </button>
                        <ChevronDown size={13} className="text-[#94A3B8]" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Address Proof Documents */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] uppercase tracking-wider mb-3">Address Proof Documents</h4>
                  <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-[#E2E8F0] bg-slate-50 cursor-pointer">
                    <span className="font-bold text-[#1E293B] text-xs flex items-center gap-1.5">
                      <span className="text-[#5F39F8] text-sm font-extrabold">+</span> Add Document
                    </span>
                    <ChevronDown size={14} className="text-[#94A3B8]" />
                  </div>
                </div>

                {/* KYC Information */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#5F39F8] uppercase tracking-wider mb-3">KYC Information</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">CKYC Number</label>
                      <input type="text" defaultValue="123456789012" className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">CKYC Status</label>
                      <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                        <option>Completed</option>
                        <option>Pending</option>
                        <option>In Progress</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B]">CKYC Download Date</label>
                      <div className="relative">
                        <input type="text" defaultValue="14/05/2024" className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B] bg-white" />
                        <Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Footer */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-9 px-4 border border-[#E2E8F0] hover:bg-slate-100 text-xs font-bold text-[#475569] bg-white rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Identity & KYC changes saved successfully!");
                  }}
                  className="h-9 px-4 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-xs font-bold rounded-lg cursor-pointer transition-all border-none"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* ── Edit Personal Details Drawer (default) ── */
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
              {/* Header */}
              <div className="h-[70px] border-b border-[#E2E8F0] px-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Edit Personal Details</h3>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Update the personal details below.</p>
                </div>
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              {/* Form Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Prefix</label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Mr.</option>
                    <option>Ms.</option>
                    <option>Mrs.</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">First Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    defaultValue={appData.first_name} 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Middle Name</label>
                  <input 
                    type="text" 
                    defaultValue={appData.middle_name || "Kumar"} 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Last Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    defaultValue={appData.last_name} 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Father&apos;s Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    defaultValue="Suresh Sharma" 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Mother&apos;s Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    defaultValue="Sunita Sharma" 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Maiden Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter maiden name" 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#64748B]">Gender <span className="text-rose-500">*</span></label>
                  <div className="flex items-center gap-4 py-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1E293B]">
                      <input type="radio" name="gender" defaultChecked={appData.gender?.toLowerCase() === 'male' || true} className="text-[#5F39F8] focus:ring-[#5F39F8]" />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1E293B]">
                      <input type="radio" name="gender" defaultChecked={appData.gender?.toLowerCase() === 'female'} className="text-[#5F39F8] focus:ring-[#5F39F8]" />
                      <span>Female</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1E293B]">
                      <input type="radio" name="gender" className="text-[#5F39F8] focus:ring-[#5F39F8]" />
                      <span>Other</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Date of Birth <span className="text-rose-500">*</span></label>
                  <input 
                    type="date" 
                    defaultValue={appData.date_of_birth ? new Date(appData.date_of_birth).toISOString().split('T')[0] : "1991-08-15"} 
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-bold text-[#1E293B]" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Marital Status <span className="text-rose-500">*</span></label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Married</option>
                    <option>Single</option>
                    <option>Divorced</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Nationality <span className="text-rose-500">*</span></label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Indian</option>
                    <option>NRI</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Resident Status <span className="text-rose-500">*</span></label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Resident Indian</option>
                    <option>Non-Resident Indian</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Religion</label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Hindu</option>
                    <option>Muslim</option>
                    <option>Christian</option>
                    <option>Sikh</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Category</label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>General</option>
                    <option>OBC</option>
                    <option>SC</option>
                    <option>ST</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#64748B]">Education <span className="text-rose-500">*</span></label>
                  <select className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#5F39F8] font-semibold text-[#1E293B]">
                    <option>Post Graduate</option>
                    <option>Graduate</option>
                    <option>Under Graduate</option>
                  </select>
                </div>
              </div>
              
              {/* Footer Buttons */}
              <div className="h-[70px] border-t border-[#E2E8F0] px-6 flex items-center justify-end gap-3 bg-slate-50/50">
                <button 
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="h-9 px-4 border border-[#E2E8F0] hover:bg-slate-100 text-xs font-bold text-[#475569] bg-white rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditDrawerOpen(false);
                    alert("Changes saved successfully!");
                  }}
                  className="h-9 px-4 bg-[#5F39F8] hover:bg-[#4F2EE0] text-white text-xs font-bold rounded-lg cursor-pointer transition-all border-none"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-[var(--primary,#2e3192)]/10 pb-2 text-[var(--primary,#2e3192)]">
      <h3 className="text-[13px] font-bold uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-xs">
      <span className="text-slate-400 whitespace-nowrap">{label}</span>
      <span className="font-bold text-slate-700 text-right break-words max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function InfoRowSimple({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5 gap-3">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="font-bold text-slate-700 text-right break-words max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function FormUnderlineField({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold text-slate-400 mb-1">{label}</span>
      <div className="border-b border-slate-200 pb-1.5 text-xs font-semibold text-slate-750 min-h-[22px]">
        {value || "—"}
      </div>
    </div>
  );
}

function FormInputLike({ label, value }: { label: string; value: any }) {
  return (
    <div className="space-y-1.5 flex flex-col w-full">
      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{label}</span>
      <div className="w-full h-10 px-3 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]/50 text-[#1E293B] font-semibold text-xs flex items-center select-all truncate">
        {value || "—"}
      </div>
    </div>
  );
}

// Helper Components

function BureauLogo({ bureau }: { bureau: "cibil" | "crif" | "equifax" | "experian" }) {
  const logos: Record<typeof bureau, { src: string; alt: string; width: string; fit?: string }> = {
    cibil: { src: "/assets/bureaus/cibil.png", alt: "TransUnion CIBIL", width: "w-[128px]" },
    crif: { src: "/assets/bureaus/crif.png", alt: "CRIF High Mark", width: "w-[124px]" },
    equifax: { src: "/assets/bureaus/equifax.svg", alt: "Equifax", width: "w-[116px]" },
    experian: { src: "/assets/bureaus/experian.svg", alt: "Experian", width: "w-[122px]", fit: "object-cover object-left" },
  };
  const logo = logos[bureau];

  return (
    <span className={`inline-flex h-8 ${logo.width} items-center rounded-md border border-[#E2E8F0] bg-white px-2 shadow-xs`} title={logo.alt}>
      <img
        src={logo.src}
        alt={logo.alt}
        className={`h-5 w-full ${logo.fit || "object-contain"}`}
      />
    </span>
  );
}

function BureauInfoRow({ label, value, mono, error }: { label: string; value: any; mono?: boolean; error?: boolean }) {
  return (
    <div className="py-2 border-b border-slate-100">
      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-bold word-break-all ${error ? "text-red-600" : "text-slate-800"} ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function ModalStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-200 shadow-3xs">
      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-slate-800 text-lg font-black mt-1 leading-none">{value || "—"}</span>
    </div>
  );
}
