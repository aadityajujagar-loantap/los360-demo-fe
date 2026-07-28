"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Upload,
} from "lucide-react";
import { formatDisplayedApplicationId } from "@/app/_lib/applicationId";

type LoanDetailsTab = "overview" | "terms" | "security";
type Tone = "success" | "warning" | "danger" | "muted" | "info" | "purple";

const fallbackApplicationId = "COSMOS160726160512D88";
const updatedAt = "20 Jul 2026, 03:42 PM";

const tabs: Array<{ id: LoanDetailsTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "terms", label: "Terms & Charges" },
  { id: "security", label: "Security & Documents" },
];

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-orange-200 bg-orange-50 text-orange-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  muted: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  purple: "border-[#E7DDFF] bg-[#F1EAFF] text-[#5F18F6]",
};

function StatusPill({ children, tone = "purple" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex h-5 items-center rounded-md border px-2 text-[10px] font-extrabold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[#DDE5F0] bg-white px-4 py-3.5 shadow-sm ${className}`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[#0F172A]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 border-[#E2E8F0] px-[18px] py-2.5 first:pl-0 lg:border-l lg:first:border-l-0">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="shrink-0 text-[11px] font-bold text-[#475569]">{label}</span>
        <span className="min-w-0 truncate text-sm font-extrabold leading-tight text-[#0F172A]">{value}</span>
        {hint && <span className="truncate text-[11px] font-semibold text-[#64748B]">{hint}</span>}
      </div>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-[#E2E8F0] px-3 py-1.5 first:pl-0 sm:border-l sm:first:border-l-0">
      <div className="text-[10px] font-bold leading-none text-[#64748B]">{label}</div>
      <div className="mt-1 truncate text-xs font-extrabold leading-tight text-[#111827]">{value}</div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  hint,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-4 text-sm">
      <span className="text-xs font-semibold text-[#475569]">{label}</span>
      <span className={`text-xs font-extrabold text-[#0F172A] ${valueClass}`}>
        {value}
        {hint && <span className="ml-3 text-[11px] font-semibold text-[#64748B]">{hint}</span>}
      </span>
    </div>
  );
}

function PolicyMetric({ label, value, policy, progress }: { label: string; value: string; policy: string; progress: string }) {
  return (
    <div className="grid grid-cols-[120px_170px_minmax(120px,1fr)_120px] items-center gap-4 text-xs">
      <span className="font-semibold text-[#475569]">{label}</span>
      <span className="font-extrabold text-[#0F172A]">
        {value}
        <span className="ml-1 font-semibold text-[#64748B]">/ {policy}</span>
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-[#CBD5E1]">
        <span className="block h-full rounded-full bg-emerald-500" style={{ width: progress }} />
      </span>
      <span className="inline-flex items-center gap-2 font-bold text-emerald-600">
        <CheckCircle2 size={15} />
        Within policy
      </span>
    </div>
  );
}

function ReadinessItem({
  label,
  status,
  tone,
  complete = false,
}: {
  label: string;
  status: string;
  tone: Tone;
  complete?: boolean;
}) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_110px] items-center gap-3 py-1.5 text-xs">
      {complete ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className={tone === "warning" ? "text-orange-500" : "text-[#64748B]"} />}
      <span className="font-bold text-[#1E293B]">{label}</span>
      <span className={`text-right font-extrabold ${tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-orange-600" : tone === "danger" ? "text-rose-600" : "text-[#64748B]"}`}>
        {status}
      </span>
    </div>
  );
}

function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs font-semibold text-orange-800">
      <div className="flex min-w-0 items-center gap-3">
        <AlertCircle size={18} className="shrink-0 text-orange-500" />
        <span>{children}</span>
      </div>
      <span className="shrink-0 text-[#475569]">Last updated&nbsp; {updatedAt}</span>
    </div>
  );
}

function OverviewTab({ setActiveTab }: { setActiveTab: (tab: LoanDetailsTab) => void }) {
  return (
    <div className="space-y-3.5">
      <section className="grid grid-cols-1 rounded-xl border border-[#DDE5F0] bg-white px-5 shadow-sm lg:grid-cols-4">
        <SummaryMetric label="Requested Amount" value={"\u20b94,56,789"} />
        <SummaryMetric label="Approved Limit" value="-" hint="Pending assessment" />
        <SummaryMetric label="Estimated EMI" value="-" hint="Pending pricing" />
        <SummaryMetric label="Tenure" value="240 Months" />
      </section>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Panel title="Loan Request & Eligibility">
          <div className="rounded-lg border border-[#DDE5F0] p-3.5">
            <div className="grid gap-3.5 md:grid-cols-2">
              <div className="space-y-3.5">
                <KeyValue label="Loan Product" value="2" />
                <KeyValue label="Purpose" value="Purchase of Property" />
                <KeyValue label="Interest Type" value="Floating" />
              </div>
              <div className="space-y-3.5 border-[#E2E8F0] md:border-l md:pl-5">
                <KeyValue label="ROI" value="8.75% p.a." />
                <KeyValue label="Repayment" value="Monthly" />
                <KeyValue label="Product Limit" value={"\u20b95,00,000 - \u20b95,00,00,000"} />
              </div>
            </div>
          </div>
          <div className="mt-3.5 space-y-3.5">
            <PolicyMetric label="LTV" value="75.50%" policy="Policy maximum 80%" progress="84%" />
            <PolicyMetric label="FOIR" value="45.00%" policy="Policy maximum 50%" progress="70%" />
            <PolicyMetric label="Bureau Score" value="765" policy="Policy minimum 700" progress="82%" />
          </div>
          <div className="mt-3.5 flex items-center gap-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
            <AlertCircle size={16} className="text-orange-500" />
            Final eligibility pending credit assessment
          </div>
        </Panel>

        <Panel title="Borrowers">
          <div className="divide-y divide-[#EEF2F7]">
            {[
              ["Primary Borrower", "Bxxxxxl Axxxxxd", "Primary", "purple"],
              ["Co-Applicant", "Priya Sharma", "Co-Applicant", "success"],
              ["Guarantor", "Suresh Sharma", "Guarantor", "warning"],
            ].map(([role, name, badge, tone]) => (
              <div key={role} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#64748B]">{role}</div>
                  <div className="mt-1 flex min-w-0 items-center gap-3">
                    <span className="truncate text-sm font-extrabold text-[#0F172A]">{name}</span>
                    <StatusPill tone={tone as Tone}>{badge}</StatusPill>
                  </div>
                </div>
                <button className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold text-[#1E2A5A] hover:text-[#5F18F6]">
                  View 360 <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="mt-2 flex w-full items-center justify-center gap-2 border-t border-[#EEF2F7] pt-4 text-xs font-extrabold text-[#5F18F6]">
            View relationship map <ArrowRight size={14} />
          </button>
        </Panel>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)]">
        <Panel title="Decision Readiness" action={<span className="text-xs font-bold text-[#475569]">3 of 6 complete</span>}>
          <div className="space-y-1">
            <ReadinessItem label="Customer KYC" status="Complete" tone="success" complete />
            <ReadinessItem label="Bureau Report" status="Completed" tone="success" complete />
            <ReadinessItem label="Banking Analysis" status="Completed" tone="success" complete />
            <ReadinessItem label="Income Assessment" status="In Review" tone="warning" />
            <ReadinessItem label="Property Valuation" status="Not Initiated" tone="muted" />
            <ReadinessItem label="Legal Verification" status="Not Initiated" tone="muted" />
          </div>
        </Panel>

        <Panel title="Pricing Snapshot">
          <div className="space-y-3">
            <KeyValue label="Interest Rate" value="8.75% Floating" />
            <KeyValue label="APR" value="Pending" />
            <KeyValue label="Processing Charges" value="Applicable" />
            <KeyValue label="Insurance" value="Applicable" />
            <KeyValue label="GST" value="18%" />
            <KeyValue label="KFS Status" value="Not Available" />
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 text-xs font-extrabold text-[#5F18F6] transition-all hover:bg-[#F8FAFC]"
          >
            <FileText size={14} />
            View Terms & Charges
          </button>
        </Panel>
      </div>

      <InfoAlert>Approved limit, APR, EMI and KFS will be available after credit assessment and final pricing.</InfoAlert>
    </div>
  );
}

function TermsTab() {
  const charges = [
    ["Processing Charges", "Applicable", "Pending", "Before disbursement", "warning"],
    ["Insurance Premium", "Applicable", "Pending", "At disbursement", "warning"],
    ["GST", "Applicable", "18%", "With applicable charges", "muted"],
    ["Legal & Valuation Fee", "Applicable", "At actuals", "During assessment", "warning"],
    ["Stamp Duty", "As applicable", "At actuals", "At documentation", "warning"],
    ["Penal Charges", "Refer product policy", "-", "On default", "muted"],
    ["Foreclosure / Prepayment", "Refer product policy", "-", "During loan tenure", "muted"],
  ];

  return (
    <div className="space-y-3.5">
      <section className="grid grid-cols-1 rounded-xl border border-[#DDE5F0] bg-white px-5 shadow-sm lg:grid-cols-4">
        <SummaryMetric label="Interest Rate" value="8.75% p.a." />
        <SummaryMetric label="Interest Type" value="Floating" />
        <SummaryMetric label="Estimated EMI" value="-" hint="Pending final pricing" />
        <SummaryMetric label="APR" value="-" hint="Pending calculation" />
      </section>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Panel title="Interest & Repayment Terms">
          <div className="space-y-3.5">
            <KeyValue label="Requested Amount" value={"\u20b94,56,789"} />
            <KeyValue label="Approved Limit" value="-" hint="Pending assessment" />
            <KeyValue label="Tenure" value="240 Months" />
            <KeyValue label="Repayment Frequency" value="Monthly" />
            <KeyValue label="Interest Rate" value="8.75% p.a." />
            <KeyValue label="Rate Type" value="Floating" />
            <KeyValue label="Benchmark" value="Not configured" />
            <KeyValue label="Spread" value="Not configured" />
            <KeyValue label="Rate Reset Frequency" value="Not configured" />
            <KeyValue label="First EMI Date" value="-" hint="After disbursement" />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            <AlertCircle size={16} className="text-blue-600" />
            EMI and repayment schedule will be calculated after the approved limit and final rate are confirmed.
          </div>
        </Panel>

        <Panel title="KFS Readiness" action={<span className="text-xs font-bold text-[#475569]">1 of 5 ready</span>}>
          <div className="divide-y divide-[#EEF2F7]">
            <ReadinessItem label="Interest type confirmed" status="Complete" tone="success" complete />
            <ReadinessItem label="Sanctioned amount" status="Pending" tone="warning" />
            <ReadinessItem label="APR calculation" status="Pending" tone="warning" />
            <ReadinessItem label="Final charges" status="Pending" tone="warning" />
            <ReadinessItem label="Repayment schedule" status="Pending" tone="warning" />
          </div>
          <button disabled className="mt-5 h-9 rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] px-5 text-xs font-extrabold text-[#94A3B8]">
            Generate KFS
          </button>
          <p className="mt-4 text-xs font-semibold text-[#64748B]">KFS becomes available after all mandatory pricing fields are finalized.</p>
        </Panel>
      </div>

      <Panel
        title="Charges & Deductions"
        action={<button className="h-8 rounded-lg border border-[#CBD5E1] bg-white px-4 text-xs font-extrabold text-[#5F18F6]">View Product Policy</button>}
      >
        <div className="overflow-hidden rounded-lg border border-[#DDE5F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th className="px-4 py-2 font-bold">Charge</th>
                <th className="px-4 py-2 font-bold">Applicability</th>
                <th className="px-4 py-2 font-bold">Amount / Rate</th>
                <th className="px-4 py-2 font-bold">Payment Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7] font-bold text-[#0F172A]">
              {charges.map(([charge, applicability, amount, stage, tone]) => (
                <tr key={charge}>
                  <td className="px-4 py-2">{charge}</td>
                  <td className="px-4 py-2"><StatusPill tone={tone as Tone}>{applicability}</StatusPill></td>
                  <td className="px-4 py-2"><StatusPill tone={tone as Tone}>{amount}</StatusPill></td>
                  <td className="px-4 py-2">{stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <InfoAlert>Final APR, EMI and total cost of credit are pending credit assessment and approved pricing.</InfoAlert>
    </div>
  );
}

function SecurityTab() {
  const documents = [
    ["Agreement to Sell", "Primary Borrower", "Pending", "-", "Upload", "warning"],
    ["Title Deed / Ownership Proof", "Primary Borrower", "Pending", "-", "Upload", "warning"],
    ["Approved Building Plan", "Builder / Authority", "Pending", "-", "Upload", "warning"],
    ["Encumbrance Certificate", "Registrar", "Pending", "-", "Upload", "warning"],
    ["Latest Property Tax Receipt", "Primary Borrower", "Pending", "-", "Upload", "warning"],
    ["Valuation Report", "Empanelled Valuer", "Not Initiated", "-", "-", "muted"],
    ["Legal Opinion", "Empanelled Lawyer", "Not Initiated", "-", "-", "muted"],
  ];

  return (
    <div className="space-y-3.5">
      <section className="grid grid-cols-1 rounded-xl border border-[#DDE5F0] bg-white px-5 shadow-sm lg:grid-cols-4">
        <SummaryMetric label="Security Type" value={<span className="text-sm">Residential Property</span>} />
        <SummaryMetric label="LTV" value="75.50%" hint="Policy maximum 80%" />
        <SummaryMetric label="Valuation" value={<span className="text-sm">Not Initiated</span>} />
        <SummaryMetric label="Legal Verification" value={<span className="text-sm">Not Initiated</span>} />
      </section>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.95fr)]">
        <Panel title="Property & Security Details">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3.5">
              <KeyValue label="Property Usage" value="Self Occupied" />
              <KeyValue label="Property Type" value="Residential Property" />
              <KeyValue label="Property Address" value="-" hint="Pending" />
              <KeyValue label="Ownership" value="-" hint="Pending" />
              <KeyValue label="Builder / Project" value="-" hint="Pending" />
              <KeyValue label="Agreement Value" value="-" hint="Pending" />
            </div>
            <div className="space-y-3.5 border-[#E2E8F0] md:border-l md:pl-5 md:self-end">
              <KeyValue label="Market Value" value="-" hint="Pending valuation" />
              <KeyValue label="Security Creation" value="Not Initiated" />
              <KeyValue label="Primary Charge" value="To be created" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
            <AlertCircle size={16} className="text-orange-500" />
            Property details are required before valuation and legal verification can begin.
          </div>
        </Panel>

        <Panel title="Verification Workflow" action={<span className="text-xs font-bold text-[#475569]">0 of 4 complete</span>}>
          <div className="space-y-3.5">
            {[
              ["1", "Property Details", "Pending", "warning"],
              ["2", "Valuation", "Not Initiated", "muted"],
              ["3", "Legal Verification", "Not Initiated", "muted"],
              ["4", "Security Approval", "Blocked", "danger"],
            ].map(([step, label, status, tone]) => (
              <div key={step} className="grid grid-cols-[30px_minmax(0,1fr)_110px] items-center gap-4 text-xs">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-extrabold ${toneClasses[tone as Tone]}`}>{step}</span>
                <span className="font-bold text-[#1E293B]">{label}</span>
                <span className={`text-right font-extrabold ${tone === "warning" ? "text-orange-600" : tone === "danger" ? "text-rose-600" : "text-[#64748B]"}`}>{status}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled className="h-9 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-5 text-xs font-extrabold text-[#94A3B8]">Initiate Valuation</button>
            <button disabled className="h-9 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-5 text-xs font-extrabold text-[#94A3B8]">Initiate Legal Review</button>
          </div>
          <p className="mt-4 text-xs font-semibold text-[#64748B]">Add mandatory property documents to enable verification.</p>
        </Panel>
      </div>

      <Panel
        title="Security Document Checklist"
        action={<button className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 text-xs font-extrabold text-[#1E2A5A]"><Upload size={14} /> Request Documents</button>}
      >
        <p className="-mt-3 mb-4 text-xs font-semibold text-[#475569]">Documents required for property-backed loan assessment</p>
        <div className="overflow-hidden rounded-lg border border-[#DDE5F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th className="px-4 py-2 font-bold">Document</th>
                <th className="px-4 py-2 font-bold">Applicant / Source</th>
                <th className="px-4 py-2 font-bold">Status</th>
                <th className="px-4 py-2 font-bold">Last Updated</th>
                <th className="px-4 py-2 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7] font-bold text-[#0F172A]">
              {documents.map(([doc, source, status, lastUpdated, action, tone]) => (
                <tr key={doc}>
                  <td className="px-4 py-2">{doc}</td>
                  <td className="px-4 py-2 text-[#334155]">{source}</td>
                  <td className="px-4 py-2"><StatusPill tone={tone as Tone}>{status}</StatusPill></td>
                  <td className="px-4 py-2 text-[#64748B]">{lastUpdated}</td>
                  <td className="px-4 py-2 text-right text-[#5F18F6]">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-[140px_160px_minmax(120px,1fr)_50px] items-center gap-4 text-xs font-semibold text-[#475569]">
          <span className="font-extrabold text-[#0F172A]">Document Readiness</span>
          <span><strong className="text-[#0F172A]">0</strong> of 5 borrower documents received</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[#CBD5E1]">
            <span className="block h-full w-0 rounded-full bg-[#5F18F6]" />
          </span>
          <span className="text-right">0%</span>
        </div>
      </Panel>

      <InfoAlert>Assessment is blocked until mandatory property details and ownership documents are available.</InfoAlert>
    </div>
  );
}

export default function LoanDetailsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [activeTab, setActiveTab] = useState<LoanDetailsTab>("overview");
  const [rawApplicationId, setRawApplicationId] = useState(fallbackApplicationId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRawApplicationId(params.get("applicationId") || params.get("id") || fallbackApplicationId);
  }, []);

  const applicationId = formatDisplayedApplicationId(rawApplicationId) || "APP160720261605";
  const applicationPath = rawApplicationId ? `/${orgSlug}/applications/${encodeURIComponent(rawApplicationId)}` : `/${orgSlug}/applications`;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <section className="border-b border-[#E2E8F0] bg-white px-3 py-2 lg:px-4">
        <div className="grid gap-y-2 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:items-center lg:gap-x-6 xl:gap-x-8">
          <div className="min-w-0">
            <label className="text-[10px] font-bold leading-none text-[#64748B]">Application ID</label>
            <button className="mt-1 flex h-8 w-full items-center justify-between rounded-md border border-[#CBD5E1] bg-white px-2.5 text-left text-xs font-extrabold text-[#0F172A] shadow-sm">
              <span className="truncate">{applicationId}</span>
              <ChevronDown size={13} className="shrink-0 text-[#64748B]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 sm:grid-cols-3 lg:grid-cols-5 lg:border-0 lg:border-l lg:pl-6 lg:pr-0 lg:py-0">
            <HeaderMetric label="Product" value="2" />
            <HeaderMetric label="Requested Amount" value={"\u20b94,56,789"} />
            <HeaderMetric label="Applicant" value="Bxxxxxl Axxxxxd" />
            <HeaderMetric label="Branch" value="Pune Branch" />
            <HeaderMetric label="Applied On" value="16 Jul 2026" />
          </div>

          <Link
            href={applicationPath}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#CBD5E1] bg-white px-3 text-[11px] font-extrabold text-[#1E2A5A] shadow-sm transition-all hover:bg-[#F8FAFC] sm:w-auto"
          >
            <ArrowLeft size={13} />
            Back to Application
          </Link>
        </div>
      </section>

      <section className="px-3 py-2.5 lg:px-4">
        <div className="mb-2.5 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A]">Loan Details</h1>
            <p className="mt-0.5 text-xs font-medium text-[#475569]">Review loan terms, eligibility, pricing and security for this application.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill>Lead Created</StatusPill>
              <StatusPill>Credit Assessment</StatusPill>
            </div>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#CBD5E1] bg-white px-3 text-[11px] font-extrabold text-[#1E2A5A] shadow-sm transition-all hover:bg-[#F8FAFC]">
              <FileText size={14} />
              Export Summary
            </button>
            <button className="inline-flex h-8 items-center gap-2 rounded-md bg-[#5F18F6] px-3.5 text-[11px] font-extrabold text-white shadow-sm transition-all hover:bg-[#4F0EDB]">
              Continue Assessment
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mb-2.5 border-b border-[#DDE5F0]">
          <div className="flex flex-wrap gap-x-4 gap-y-0 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-9 shrink-0 px-1 text-xs font-extrabold transition-all ${
                  activeTab === tab.id ? "text-[#5F18F6]" : "text-[#334155] hover:text-[#0F172A]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#5F18F6]" />}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && <OverviewTab setActiveTab={setActiveTab} />}
        {activeTab === "terms" && <TermsTab />}
        {activeTab === "security" && <SecurityTab />}
      </section>
    </div>
  );
}
