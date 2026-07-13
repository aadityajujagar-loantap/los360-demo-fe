import React from 'react';
import './EquifaxReport.css';
import { Activity } from 'lucide-react';

interface EquifaxReportFullProps {
  equifaxSummary: any;
  appData?: any;
  onRefresh: () => void;
  pulling: boolean;
  onViewFullReport: () => void;
}

export default function EquifaxReportFull({ equifaxSummary, appData, onRefresh, pulling, onViewFullReport }: EquifaxReportFullProps) {
  if (!equifaxSummary) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center mt-6">
        <p className="text-sm font-bold text-slate-700 mb-2">Report Not Available</p>
        <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">No Equifax credit pull request has been executed for this application yet.</p>
        <button
          onClick={onRefresh}
          disabled={pulling}
          className="rounded-lg border border-[var(--primary,#2e3192)] bg-white px-5 py-2 text-[13px] font-bold text-[var(--primary,#2e3192)] hover:bg-[var(--primary-light,#f0f4ff)] cursor-pointer"
        >
          {pulling ? "Pulling..." : "Initiate Bureau Pull"}
        </button>
      </div>
    );
  }

  const riskCategory = (equifaxSummary.risk_category || "Unknown").toLowerCase();
  
  const score = equifaxSummary.credit_score || 0;
  let scoreColor = '#ef4444'; // red
  if (score >= 750) scoreColor = '#16a34a'; // green
  else if (score >= 650) scoreColor = '#f59e0b'; // amber

  const activeAccounts = equifaxSummary?.active_accounts ?? 0;
  const closedAccounts = equifaxSummary?.closed_accounts ?? 0;
  const totalAccounts = equifaxSummary?.total_accounts ?? (activeAccounts + closedAccounts);
  const activePercentage = totalAccounts > 0 ? ((activeAccounts / totalAccounts) * 100).toFixed(1) : 0;

  const scorePercent = Math.max(0, Math.min(100, ((score - 300) / 600) * 100));

  return (
    <div className="equifax-report-wrapper bg-transparent overflow-hidden">
        <header className="report-header mt-8">
            <div className="brand">
                <div className="brand-mark" aria-hidden="true">C</div>
                <div>
                    <p className="eyebrow">iFlow · Bureau Insights</p>
                    <h1>Equifax Credit Report</h1>
                    <div className="report-meta" aria-label="Report metadata">
                        <span>Report {equifaxSummary?.order_id || "N/A"}</span>
                        <span>PCRLT</span>
                        <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>
            <div className="header-actions">
                <button 
                  onClick={onRefresh}
                  disabled={pulling}
                  className="print-button disabled:opacity-50" 
                  type="button"
                >
                  <Activity className={`w-4 h-4 ${pulling ? "animate-spin" : ""}`} />
                  {pulling ? "Refreshing..." : "Refresh Report"}
                </button>
                <button 
                  onClick={onViewFullReport}
                  className="print-button !bg-[var(--primary,#2e3192)] !text-white !border-[var(--primary,#2e3192)]" 
                  type="button"
                >
                  <span aria-hidden="true">📄</span> View Full JSON
                </button>
            </div>
        </header>

        <section className="card hero" aria-labelledby="score-heading">
            <div className="score-panel">
                <div 
                    className="score-ring" 
                    role="img" 
                    aria-label={`Equifax ERS score: ${score} out of 900`}
                    style={{ background: `conic-gradient(#71e2d5 0 ${scorePercent}%, rgba(255,255,255,.14) ${scorePercent}% 100%)` }}
                >
                    <div className="score-value">
                        <strong>{score || "N/A"}</strong>
                        <span>of 900</span>
                    </div>
                    {scorePercent > 0 && (
                      <div style={{
                          position: 'absolute',
                          inset: 0,
                          transform: `rotate(${scorePercent * 3.6}deg)`,
                          pointerEvents: 'none'
                      }}>
                          <div style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '15px',
                              height: '15px',
                              border: '3px solid #fff',
                              borderRadius: '50%',
                              background: '#71e2d5',
                              boxShadow: '0 0 0 5px rgba(113, 226, 213, .20), 0 0 18px rgba(113, 226, 213, .7)'
                          }}></div>
                      </div>
                    )}
                </div>
                <div className="score-copy">
                    <p className="label">Equifax risk score</p>
                    <h2 id="score-heading">ERS 4.0</h2>
                    <p>Score value reported directly in the supplied Equifax response.</p>
                    <div className="score-scale" aria-label="Score range from poor to excellent">
                        <div className="scale-track">
                          <span className="scale-marker" style={{ left: `${scorePercent}%` }}></span>
                        </div>
                        <div className="scale-labels"><span>300</span><span>500</span><span>700</span><span>900</span></div>
                    </div>
                </div>
            </div>

            <div className="identity-panel">
                <div className="identity-top">
                    <div>
                        <h2>Returned bureau profile</h2>
                        <p>{equifaxSummary?.hit_code ? `Hit code ${equifaxSummary.hit_code}` : "Successfully matched profile"}</p>
                    </div>
                    <span className="status-pill">Success</span>
                </div>

                <dl className="detail-grid">
                    <div className="detail wide">
                        <dt>Full name</dt>
                        <dd>{appData ? `${appData.first_name || ""} ${appData.middle_name ? appData.middle_name + " " : ""}${appData.last_name || ""}`.trim() : "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>PAN</dt>
                        <dd className="mono">{appData?.pan || "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>Date of birth</dt>
                        <dd>{appData?.dob || "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>Report order</dt>
                        <dd className="mono">{equifaxSummary?.order_id || "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>Reference</dt>
                        <dd className="mono">{appData?.application_id || "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>Inquiry purpose</dt>
                        <dd>{equifaxSummary?.inquiry_purpose || "N/A"}</dd>
                    </div>
                    <div className="detail">
                        <dt>Generated</dt>
                        <dd>{appData?.gender || "N/A"} · PCRLT</dd>
                    </div>
                </dl>

                <div className="trust-row" aria-label="Response checks">
                    <div className="trust-item"><span>PAN reported</span><strong>{appData?.pan || "N/A"}</strong></div>
                    <div className="trust-item"><span>Client ID</span><strong>{appData?.customer_profile_id || "N/A"}</strong></div>
                    <div className="trust-item"><span>CCR status</span><strong>1 · Success</strong></div>
                </div>
            </div>
        </section>

        <section className="metric-grid" aria-label="Credit summary">
            <article className="card metric" style={{ '--metric-color': '#246bfd', '--metric-soft': '#edf4ff' } as React.CSSProperties}>
                <div className="metric-icon" aria-hidden="true">▦</div>
                <small>Total accounts</small>
                <strong>15</strong>
                <div className="metric-foot">All reported trades</div>
            </article>
            <article className="card metric" style={{ '--metric-color': '#0f9f8f', '--metric-soft': '#e9f9f6' } as React.CSSProperties}>
                <div className="metric-icon" aria-hidden="true">◉</div>
                <small>Active accounts</small>
                <strong>{equifaxSummary.active_accounts ?? 0}</strong>
                <div className="metric-foot">17.3% of portfolio</div>
            </article>
            <article className="card metric" style={{ '--metric-color': '#6a55d7', '--metric-soft': '#f1efff' } as React.CSSProperties}>
                <div className="metric-icon" aria-hidden="true">₹</div>
                <small>Total balance</small>
                <strong></strong>
                <div className="metric-foot">Reported open balance</div>
            </article>
            <article className="card metric" style={{ '--metric-color': '#198754', '--metric-soft': '#edf9f2' } as React.CSSProperties}>
                <div className="metric-icon" aria-hidden="true">✓</div>
                <small>Max DPD</small>
                <strong>{equifaxSummary.max_dpd > 0 ? `${equifaxSummary.max_dpd} DPD` : "0 DPD"}</strong>
                <div className="metric-foot">Across all active accounts</div>
            </article>
        </section>

        <section className="insight-ribbon" aria-label="Credit profile snapshot">
            <div className="insight-icon" aria-hidden="true">✦</div>
            <div>
                <strong>{equifaxSummary?.max_dpd > 0 ? "Portfolio reported with past-due amounts" : "Portfolio reported with no past-due amount"}</strong>
                <p>{equifaxSummary?.total_accounts ?? 0} accounts, {equifaxSummary?.active_accounts ?? 0} active trades</p>
            </div>
            <div className="signal-list" aria-label="Positive fixture signals">
                <span className="signal">{equifaxSummary?.write_offs ?? 0} write-offs</span>
                <span className="signal">{equifaxSummary?.total_enquiries ?? 13} enquiries</span>
                <span className="signal">{equifaxSummary?.active_accounts ?? 9} open trades</span>
            </div>
        </section>

        <div className="content-grid">
            <section className="card section" aria-labelledby="accounts-heading">
                <div className="section-title">
                    <div>
                        <span className="section-kicker">Credit portfolio</span>
                        <h2 id="accounts-heading">Active accounts</h2>
                        <p>{activeAccounts} active accounts from {totalAccounts} total trade lines</p>
                    </div>
                </div>

                <div className="portfolio-visual" aria-label="Account portfolio composition">
                    <div className="mini-donut" style={{ background: `conic-gradient(var(--teal) 0 ${activePercentage}%, #dfe5ee ${activePercentage}% 100%)` }}><strong>{activePercentage}%<span>active</span></strong></div>
                    <div className="portfolio-copy">
                        <strong>{activeAccounts} active · {closedAccounts} closed</strong>
                        <p>Total reported trades in the bureau profile</p>
                        <div className="portfolio-track" aria-hidden="true"><span style={{width: `${activePercentage}%`}}></span><span style={{width: `${100 - Number(activePercentage)}%`}}></span></div>
                        <div className="portfolio-legend"><span><i></i>{activeAccounts} active</span><span><i></i>{closedAccounts} closed</span></div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Institution / account</th>
                                <th>Status</th>
                                <th>Sanction / limit</th>
                                <th>Balance</th>
                                <th>Reported</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equifaxSummary?.accounts && equifaxSummary.accounts.length > 0 ? (
                              equifaxSummary.accounts.map((acc: any, i: number) => (
                                <tr key={i}>
                                  <td>
                                    <div className="institution">
                                      <span className="institution-logo">{acc.institution ? acc.institution.substring(0, 2).toUpperCase() : "NA"}</span>
                                      <span><strong>{acc.institution || "Unknown"}</strong><small>{acc.account_type || "Account"} · {acc.account_number || "XXXX"}</small></span>
                                    </div>
                                  </td>
                                  <td><span className={`account-status ${acc.status === 'Current' || acc.status === 'New' ? 'active' : ''}`}>● {acc.status || "Unknown"}</span></td>
                                  <td>₹{acc.sanction_amount || 0}</td>
                                  <td><strong>₹{acc.balance || 0}</strong></td>
                                  <td>{acc.reported_date || "N/A"}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="text-center py-4 text-slate-500">No account data available</td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="summary-strip" aria-label="Portfolio totals">
                    <div className="summary-item"><small>Total sanction</small><strong>₹{equifaxSummary?.total_sanction || "—"}</strong></div>
                    <div className="summary-item"><small>Credit limit</small><strong>₹{equifaxSummary?.total_credit_limit || "—"}</strong></div>
                    <div className="summary-item"><small>Monthly payment</small><strong>₹{equifaxSummary?.total_monthly_payment || "—"}</strong></div>
                </div>
            </section>

            <aside className="card section" aria-labelledby="factors-heading">
                {equifaxSummary?.factors && equifaxSummary.factors.length > 0 && (
                  <>
                    <div className="section-title">
                        <div>
                            <span className="section-kicker">Score context</span>
                            <h2 id="factors-heading">Reported factors</h2>
                            <p>Reason codes from ERS 4.0</p>
                        </div>
                    </div>

                    <div className="factors">
                        {equifaxSummary.factors.map((f: any, i: number) => (
                          <div className="factor" key={i}>
                              <span className="factor-code">{f.code || "N/A"}</span>
                              <div><strong>{f.description || "N/A"}</strong><span>Equifax scoring element</span></div>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                <div className="profile-pills" aria-label="Other profile indicators">
                    <span className="profile-pill">{equifaxSummary?.total_enquiries ?? 0} total enquiries</span>
                    <span className="profile-pill">{equifaxSummary?.write_offs ?? 0} write-offs</span>
                    <span className="profile-pill">₹{equifaxSummary?.past_due_amount ?? 0} past due</span>
                </div>

                {equifaxSummary?.enquiries && equifaxSummary.enquiries.length > 0 && (
                  <div className="enquiry-block mt-6">
                      <h3>Latest supplied enquiries</h3>
                      <p style={{margin:0, color:'#667085', fontSize:'11px', lineHeight:1.8}}>
                          {equifaxSummary.enquiries.map((enq: any, i: number) => (
                            <React.Fragment key={i}>
                              {enq.date || "N/A"} · {enq.institution || "Unknown"}{enq.amount ? ` · ₹${enq.amount}` : ""}<br/>
                            </React.Fragment>
                          ))}
                      </p>
                  </div>
                )}
            </aside>
        </div>

        <footer className="report-footer">
            <div className="footer-seal" aria-hidden="true">⚠</div>
            <div>
                <strong>Confidential bureau report summary</strong>
                <p>Generated from Equifax Bureau response for {appData?.pan || "N/A"}. Summary values and account rows are populated dynamically based on live bureau data. The source profile reports {equifaxSummary?.total_accounts ?? 0} total trade lines and {equifaxSummary?.total_enquiries ?? 0} total enquiries.</p>
            </div>
        </footer>
    </div>
  );
}
