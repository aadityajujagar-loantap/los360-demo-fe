"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import styles from "../users/users.module.css";
import dashStyles from "./dashboard.module.css";
import { useLazyExportLoanApplicationsQuery } from "@/app/_lib/redux/services/adminApiSlice";

// Static data for dashboard - will be replaced with API calls later
const MOCK_REPORTS_DATA = {
  summary: {
    totalApplications: 1247,
   
    approvedApplications: 856,
    approvedChange: 8.3,
    totalDisbursedAmount: 45700000, // 4.57 Cr
    disbursedChange: 15.7,
    averageLoanAmount: 53350,
    avgLoanChange: -3.2,
    pendingApplications: 234,
    pendingChange: -5.1,
    rejectedApplications: 157,
    rejectedChange: 12.6,
  },
  statusCounts: {
    verified: 145,
    aadhaar_kyc_initiated: 203,
    pan_verification: 187,
    kyc_verified: 165,
    application_in_progress: 142,
    under_income_assessment: 98,
    application_in_review: 121,
    application_reviewed: 95,
    document_upload: 54,
  },
  monthlyTrends: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    applications: [405, 448, 505, 525, 580, 620, 675, 720, 765],
    disbursedAmount: [1580000, 1920000, 2240000, 2450000, 2780000, 3020000, 3280000, 3540000, 3920000],
  },
  applicationsByStatus: [
    { status: "Approved", count: 856, percentage: 68.6, color: "#10b981" },
    { status: "Pending", count: 234, percentage: 18.8, color: "#f59e0b" },
    { status: "Rejected", count: 157, percentage: 12.6, color: "#ef4444" },
  ],
};

function StatCard({
  icon,
  value,
  label,
  subtext,
  change,
  iconBg,
  iconColor,
  href,
}: {
  icon: string;
  value: string | number;
  label: string;
  subtext?: string;
  change?: number;
  iconBg?: string;
  iconColor?: string;
  href?: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const content = (
    <div className={styles.statCard} style={href ? { cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" } : undefined} onMouseEnter={(e) => href && (e.currentTarget.style.transform = "translateY(-2px)")} onMouseLeave={(e) => href && (e.currentTarget.style.transform = "translateY(0)")}>
      <div className={styles.statIcon} style={{ background: iconBg || "#eff6ff", color: iconColor || "#3b82f6" }}>
        {icon}
      </div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        {subtext && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>{subtext}</div>}
        {change !== undefined && (
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              marginTop: "4px",
              color: isPositive ? "#10b981" : isNegative ? "#ef4444" : "#64748b",
            }}
          >
            {isPositive ? "↑" : isNegative ? "↓" : ""} {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link> : content;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return `₹${amount}`;
}

export default function DashboardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { summary, monthlyTrends, applicationsByStatus } = MOCK_REPORTS_DATA;
  const [triggerExport, { isLoading: isExporting }] = useLazyExportLoanApplicationsQuery();
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    setExportError("");
    try {
      const csv = await triggerExport().unwrap();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loan_applications_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("Unable to export the report. Please try again.");
    }
  };

  return (
    <div className={styles.main}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Comprehensive overview of loan applications and disbursements</p>
        </div>
        <div className={styles.topbarRight}>
          <select className={dashStyles.periodSelect}>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>Last 6 Months</option>
            <option>Last Year</option>
          </select>
          <button type="button" className={styles.btnPrimary} onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export Report"}
          </button>
        </div>
      </header>
      {exportError && (
        <p role="alert" style={{ margin: "12px 20px 0", color: "#b91c1c", fontSize: "0.8rem", fontWeight: 600 }}>
          {exportError}
        </p>
      )}

      {/* Stats Row */}
      <div className={dashStyles.totalStatWrap}>
        <StatCard
          icon="📋"
          value={summary.totalApplications.toLocaleString()}
          label="Total Applications"
          subtext="All time applications"
          iconBg="#eff6ff"
          iconColor="#3b82f6"
          href={`/${orgSlug}/reports`}
        />
      </div>

      {/* Status-wise Breakdown Section */}
      <div className={dashStyles.statusSection}>
        {/* First Row - 5 Cards */}
        <div className={dashStyles.statusGrid}>
          <Link href={`/${orgSlug}/reports?status=verified`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#dcfce7", color: "#10b981" }}>✓</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.verified.toLocaleString()}</div>
                <div className={styles.statLabel}>Verified</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Verification complete</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=aadhaar_kyc_initiated`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#dbeafe", color: "#3b82f6" }}>📱</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.aadhaar_kyc_initiated.toLocaleString()}</div>
                <div className={styles.statLabel}>Aadhaar OTP Request</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>OTP verification pending</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=pan_verification`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#ede9fe", color: "#8b5cf6" }}>🆔</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.pan_verification.toLocaleString()}</div>
                <div className={styles.statLabel}>PAN Verification</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Verifying PAN details</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=kyc_verified`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}>✅</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.kyc_verified.toLocaleString()}</div>
                <div className={styles.statLabel}>KYC Verified</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>KYC completed</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=application-in-progress`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#f59e0b" }}>📝</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.application_in_progress.toLocaleString()}</div>
                <div className={styles.statLabel}>Application In Progress</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Form being filled</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Second Row - 4 Cards */}
        <div className={dashStyles.statusGrid}>
          <Link href={`/${orgSlug}/reports?status=under-income-assessment`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#cffafe", color: "#0891b2" }}>💰</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.under_income_assessment.toLocaleString()}</div>
                <div className={styles.statLabel}>Under Income Assessment</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Income verification</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=application-in-review`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#fce7f3", color: "#ec4899" }}>🔍</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.application_in_review.toLocaleString()}</div>
                <div className={styles.statLabel}>Application In Review</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Under review</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=application-reviewed`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#e0e7ff", color: "#6366f1" }}>👁️</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.application_reviewed.toLocaleString()}</div>
                <div className={styles.statLabel}>Application Reviewed</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Review completed</div>
              </div>
            </div>
          </Link>
          <Link href={`/${orgSlug}/reports?status=document_upload`} style={{ textDecoration: "none" }}>
            <div className={styles.statCard} style={{ cursor: "pointer" }}>
              <div className={styles.statIcon} style={{ background: "#fed7aa", color: "#f97316" }}>📄</div>
              <div>
                <div className={styles.statValue}>{MOCK_REPORTS_DATA.statusCounts.document_upload.toLocaleString()}</div>
                <div className={styles.statLabel}>Document Upload</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Awaiting documents</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className={dashStyles.chartsContainer}>
        {/* Monthly Trends Chart */}
        <div className={dashStyles.chartCard}>
          <h3 className={dashStyles.chartTitle}>Monthly Trends</h3>
          <div className={dashStyles.chartLegend}>
            <div className={dashStyles.legendItem}>
              <div className={dashStyles.legendDot} style={{ background: "#6366f1" }}></div>
              <span>Applications</span>
            </div>
            <div className={dashStyles.legendItem}>
              <div className={dashStyles.legendDot} style={{ background: "#10b981" }}></div>
              <span>Disbursed Amount</span>
            </div>
          </div>
          <DualLineChart data={monthlyTrends} />
        </div>

        {/* Application Status Breakdown */}
        <div className={dashStyles.chartCard}>
          <h3 className={dashStyles.chartTitle}>Application Status Breakdown</h3>
          <DonutChart data={applicationsByStatus} total={summary.totalApplications} />
        </div>
      </div>

      {/* Top Performers Table */}
      <div className={dashStyles.tableSection}>
        <h3 className={dashStyles.sectionTitle}>Top Performing Branches</h3>
        <div className={dashStyles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Rank</th>
                <th className={styles.th}>Branch Name</th>
                <th className={styles.th}>Applications</th>
                <th className={styles.th}>Disbursed Amount</th>
                <th className={styles.th}>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Mumbai Central", apps: 245, disbursed: 8950000, conversion: 72.5 },
                { name: "Delhi South", apps: 198, disbursed: 7120000, conversion: 68.3 },
                { name: "Bangalore Tech Park", apps: 176, disbursed: 6480000, conversion: 71.2 },
                { name: "Pune West", apps: 154, disbursed: 5630000, conversion: 65.8 },
                { name: "Chennai Anna Nagar", apps: 142, disbursed: 5210000, conversion: 69.4 },
              ].map((branch, index) => (
                <tr key={index} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={dashStyles.rankBadge}>#{index + 1}</div>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{branch.name}</td>
                  <td className={styles.td}>{branch.apps}</td>
                  <td className={styles.td} style={{ fontWeight: 700, color: "#10b981" }}>
                    {formatCurrency(branch.disbursed)}
                  </td>
                  <td className={styles.td}>
                    <div className={dashStyles.conversionBadge}>{branch.conversion}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loan Distribution Table */}
      <div className={dashStyles.tableSection}>
        <h3 className={dashStyles.sectionTitle}>Loan Amount Distribution</h3>
        <div className={dashStyles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Amount Range</th>
                <th className={styles.th}>Count</th>
                <th className={styles.th}>Percentage</th>
                <th className={styles.th}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {[
                { range: "₹0 - ₹25,000", count: 145, pct: 16.9, total: 2175000 },
                { range: "₹25,000 - ₹50,000", count: 312, pct: 36.4, total: 11700000 },
                { range: "₹50,000 - ₹75,000", count: 228, pct: 26.6, total: 14250000 },
                { range: "₹75,000 - ₹1,00,000", count: 124, pct: 14.5, total: 10850000 },
                { range: "₹1,00,000+", count: 47, pct: 5.5, total: 6725000 },
              ].map((item, index) => (
                <tr key={index} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{item.range}</td>
                  <td className={styles.td}>{item.count}</td>
                  <td className={styles.td}>
                    <div className={dashStyles.progressBar}>
                      <div className={dashStyles.progressFill} style={{ width: `${item.pct}%` }}>
                        {item.pct}%
                      </div>
                    </div>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 700, color: "#10b981" }}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Dual Line Chart Component
function DualLineChart({ data }: { data: typeof MOCK_REPORTS_DATA.monthlyTrends }) {
  const { labels, applications, disbursedAmount } = data;

  const maxApps = Math.max(...applications);
  const maxAmount = Math.max(...disbursedAmount);

  const svgWidth = 800;
  const svgHeight = 300;
  const padding = 40;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const getX = (index: number) => padding + (index / (labels.length - 1)) * chartWidth;
  const getYApps = (value: number) => svgHeight - padding - (value / maxApps) * chartHeight;
  const getYAmount = (value: number) => svgHeight - padding - (value / maxAmount) * chartHeight;

  const appsPath = applications
    .map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getYApps(val)}`)
    .join(" ");

  const amountPath = disbursedAmount
    .map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getYAmount(val)}`)
    .join(" ");
  const appsAreaPath = `${appsPath} L ${getX(labels.length - 1)} ${svgHeight - padding} L ${getX(0)} ${svgHeight - padding} Z`;
  const amountAreaPath = `${amountPath} L ${getX(labels.length - 1)} ${svgHeight - padding} L ${getX(0)} ${svgHeight - padding} Z`;

  return (
    <div className={dashStyles.lineChartContainer}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={dashStyles.lineChartSvg}>
        <defs>
          <linearGradient id="appsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5F39F8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#5F39F8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="amountAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * chartHeight) / 4}
            x2={svgWidth - padding}
            y2={padding + (i * chartHeight) / 4}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray={i === 4 ? "0" : "4 6"}
          />
        ))}

        <path d={appsAreaPath} fill="url(#appsAreaGradient)" />
        <path d={amountAreaPath} fill="url(#amountAreaGradient)" />

        {/* Applications line */}
        <path d={appsPath} fill="none" stroke="#5F39F8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Disbursed Amount line */}
        <path d={amountPath} fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points for Applications */}
        {applications.map((val, idx) => (
          <circle key={`app-${idx}`} cx={getX(idx)} cy={getYApps(val)} r="4.5" fill="#5F39F8" stroke="#fff" strokeWidth="2.5" />
        ))}

        {/* Data points for Disbursed Amount */}
        {disbursedAmount.map((val, idx) => (
          <circle key={`amt-${idx}`} cx={getX(idx)} cy={getYAmount(val)} r="4.5" fill="#10B981" stroke="#fff" strokeWidth="2.5" />
        ))}

        {/* X-axis labels */}
        {labels.map((label, idx) => (
          <text
            key={label}
            x={getX(idx)}
            y={svgHeight - 10}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
            fontWeight="700"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Donut Chart Component
function DonutChart({
  data,
  total,
}: {
  data: typeof MOCK_REPORTS_DATA.applicationsByStatus;
  total: number;
}) {
  const size = 200;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className={dashStyles.donutChartContainer}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} className={dashStyles.donutSvg}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {data.map((segment, index) => {
            const segmentPercentage = segment.percentage;
            const offset = circumference - (accumulatedPercentage / 100) * circumference;
            const dashArray = `${(segmentPercentage / 100) * circumference} ${circumference}`;

            accumulatedPercentage += segmentPercentage;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className={dashStyles.donutSegment}
              />
            );
          })}
        </svg>
        <div className={dashStyles.donutCenter}>
          <div className={dashStyles.donutCenterValue}>{total}</div>
          <div className={dashStyles.donutCenterLabel}>Total Apps</div>
        </div>
      </div>
      <div className={dashStyles.donutLegend}>
        {data.map((segment, index) => (
          <div key={index} className={dashStyles.donutLegendItem}>
            <div className={dashStyles.donutLegendDot} style={{ background: segment.color }}></div>
            <div className={dashStyles.donutLegendInfo}>
              <div className={dashStyles.donutLegendStatus}>{segment.status}</div>
              <div className={dashStyles.donutLegendStats}>
                {segment.count} <span>({segment.percentage}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
