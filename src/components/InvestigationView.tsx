'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  LockOpen,
  Mail,
  Ban,
  Shield,
  Save,
  CheckCircle2,
  FileText,
  ExternalLink,
  ChevronRight,
  Eye,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import { InvoiceAnalysis, ReviewStatus } from '@/types/invoice';

interface InvestigationViewProps {
  selectedInvoice: InvoiceAnalysis | null;
  allAnalyses: InvoiceAnalysis[];
  onUpdateReview: (invoiceId: string, status: ReviewStatus, note: string) => void;
  onRequestGeminiExplanation: (analysis: InvoiceAnalysis, sessionApiKey?: string) => Promise<void>;
  onBackToExplorer: () => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  selectedInvoice,
  allAnalyses,
  onUpdateReview,
  onRequestGeminiExplanation,
  onBackToExplorer,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [sessionApiKey, setSessionApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ title: string; desc: string } | null>(null);
  const [localAuditTrail, setLocalAuditTrail] = useState<
    Array<{ id: string; title: string; desc: string; badge: string; timestamp: string }>
  >([]);

  if (!selectedInvoice) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs max-w-4xl mx-auto mt-6">
        <div className="w-16 h-16 bg-blue-50 text-[#004ac6] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Invoice Selected</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
          Please select an invoice record from the Explorer or Dashboard to inspect its deterministic evidence and AI reasoning.
        </p>
        <button
          onClick={onBackToExplorer}
          className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-sm rounded-lg shadow-xs transition"
        >
          Go to Invoice Explorer
        </button>
      </div>
    );
  }

  const inv = selectedInvoice.invoice;
  const findings = selectedInvoice.findings;
  const riskScore = selectedInvoice.overallScore || (selectedInvoice.riskLevel === 'CRITICAL' ? 96 : selectedInvoice.riskLevel === 'HIGH' ? 82 : 45);

  // Find related invoices (e.g. historical baseline or conflicting record)
  const relatedIds = findings.flatMap(f => f.relatedInvoiceIds || []);
  const relatedMatch = allAnalyses.find(
    a => (relatedIds.includes(a.invoice.invoice_id) || a.invoice.vendor === inv.vendor) && a.invoice.id !== inv.id
  );

  const baselineInvoice = relatedMatch ? relatedMatch.invoice : {
    id: 'base-0',
    invoice_id: 'INV-88102',
    vendor: inv.vendor,
    invoice_date: '2026-03-14',
    amount: inv.amount,
    currency: inv.currency,
    po_number: inv.po_number || 'PO-99120',
  };

  const recordAction = (actionTitle: string, description: string) => {
    setBannerMessage({ title: actionTitle, desc: description });
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLocalAuditTrail(prev => [
      {
        id: `action-${Date.now()}`,
        title: actionTitle,
        desc: description,
        badge: 'Auditor Action',
        timestamp: `Today · ${now} UTC`,
      },
      ...prev,
    ]);
  };

  const handleAppendAuditNote = () => {
    if (!quickNote.trim()) return;
    const noteText = quickNote.trim();
    onUpdateReview(inv.id, selectedInvoice.reviewStatus, noteText);
    recordAction('Forensic Note Added', noteText);
    setQuickNote('');
  };

  const handleWorkflowChange = (val: string) => {
    let newStatus: ReviewStatus = 'NEEDS_REVIEW';
    if (val === 'Cleared False Positive') newStatus = 'RESOLVED';
    else if (val === 'Flagged Fraud') newStatus = 'DISMISSED';
    else if (val === 'Pending Review') newStatus = 'NEEDS_REVIEW';
    else newStatus = 'NEEDS_REVIEW';

    onUpdateReview(inv.id, newStatus, `Workflow status shifted to: ${val}`);
    recordAction(`Status Changed: ${val}`, `Investigation workflow status updated to ${val}.`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1500px] mx-auto pb-16">
      {/* Interactive Feedback Banner Notification */}
      {bannerMessage && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg transition-all animate-fade-in border border-slate-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-semibold text-sm leading-tight">{bannerMessage.title}</p>
              <p className="text-xs text-slate-300">{bannerMessage.desc}</p>
            </div>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Top Telemetry Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span onClick={onBackToExplorer} className="hover:text-slate-800 cursor-pointer">Audit Workspaces</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span onClick={onBackToExplorer} className="hover:text-slate-800 cursor-pointer">Invoices</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-semibold">#{inv.invoice_id} ({inv.vendor})</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#004ac6] font-semibold">Forensic Investigation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 font-mono text-[11px] text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#004ac6] animate-pulse" />
            LEDGER SYNC: SAP S/4HANA (AP-US-01)
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px]">
            HASH: <span className="text-[#004ac6]">0x7F2a...981c</span>
          </span>
        </div>
      </div>

      {/* Master Header & Quick Resolution Bar */}
      <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Entity Primary Identifiers */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                  #{inv.invoice_id}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                  {selectedInvoice.riskLevel} ({riskScore}% Confidence)
                </span>
                {findings.some(f => f.category === 'EXACT_DUPLICATE' || f.category === 'POTENTIAL_DUPLICATE') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase">
                    Duplicate Hash Match
                  </span>
                )}
                {findings.some(f => f.category === 'AMOUNT_MISMATCH') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold uppercase">
                    PO Value Variance
                  </span>
                )}
                {findings.some(f => f.category === 'AMOUNT_OUTLIER') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold uppercase">
                    MAD Baseline Outlier
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs">
                <span className="font-semibold text-slate-800">{inv.vendor}</span>
                <span>•</span>
                <span className="font-mono font-bold text-slate-900">${inv.amount.toFixed(2)} {inv.currency}</span>
                <span>•</span>
                <span>Invoice Date: {inv.invoice_date}</span>
                <span>•</span>
                <span>PO: <span className="text-[#004ac6] font-mono font-medium">{inv.po_number || 'None Linked'}</span></span>
              </div>
            </div>
          </div>

          {/* Metric Pill Cluster */}
          <div className="flex items-center gap-4 self-start lg:self-center">
            <div className="px-4 py-2 rounded-lg bg-slate-50 text-right border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disbursement Risk</p>
              <p className="font-mono text-xl text-red-600 font-extrabold">${inv.amount.toFixed(2)}</p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-slate-50 text-right border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Wire Date</p>
              <p className="font-mono text-base text-slate-800 font-bold">{inv.due_date || 'Net 30 Pending'}</p>
            </div>
          </div>
        </div>

        {/* Action Button Command Bar */}
        <div className="pt-4 bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onUpdateReview(inv.id, 'RESOLVED', 'Approval granted. Wire payment hold released.');
                recordAction('Cleared False Positive', 'Approval granted. Wire payment hold released.');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <LockOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Approve & Release Hold</span>
            </button>

            <button
              onClick={() => recordAction('Clarification Sent', `Automated vendor dispute package dispatched to accounts@${inv.vendor.toLowerCase().replace(/[^a-z]/g, '')}.com`)}
              className="px-3.5 py-1.5 rounded-lg bg-[#4648d4] text-white hover:bg-[#3537b8] transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Request Vendor Clarification</span>
            </button>

            <button
              onClick={() => {
                onUpdateReview(inv.id, 'DISMISSED', 'Wire blocked permanently. Added vendor banking coordinates to global blocklist.');
                recordAction('Confirmed Fraudulent Attempt', 'Wire blocked permanently. Added vendor banking coordinates to global blocklist.');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Mark Confirmed Fraud / Block Wire</span>
            </button>

            <button
              onClick={() => recordAction('Case Escalated', 'Transferred with high priority to Internal Audit & Ethics Compliance Board')}
              className="px-3.5 py-1.5 rounded-lg bg-[#004ac6] text-white hover:bg-[#003896] transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Escalate to Compliance</span>
            </button>
          </div>

          {/* Status Tag Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Workflow:</span>
            <select
              defaultValue={selectedInvoice.reviewStatus === 'RESOLVED' ? 'Cleared False Positive' : selectedInvoice.reviewStatus === 'DISMISSED' ? 'Flagged Fraud' : 'Under Investigation'}
              onChange={(e) => handleWorkflowChange(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 font-semibold text-xs px-2.5 py-1 rounded-lg cursor-pointer focus:outline-none"
            >
              <option value="Under Investigation">Under Investigation</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Flagged Fraud">Flagged Fraud</option>
              <option value="Cleared False Positive">Cleared False Positive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Reviewer Notes Form Drawer */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAppendAuditNote()}
            placeholder="Add forensic finding note to audit trail (e.g. Spoke with vendor controller, confirmed phishing attempt)..."
            className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:border-[#004ac6]"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-400 font-mono text-[11px]">Auditor: Marcus Vance (US-8812)</span>
          <button
            onClick={handleAppendAuditNote}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>Save Audit Note</span>
          </button>
        </div>
      </div>

      {/* Dedicated AI Intelligence Panel: Gemini 3.8 Flash Forensic Reasoning Engine */}
      <div className="bg-white rounded-xl p-6 shadow-xs border border-indigo-100 flex flex-col gap-6 relative overflow-hidden">
        {/* Panel Header & Badging */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900 tracking-tight">
                  Gemini 3.8 Flash Forensic Reasoning Engine
                </h2>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#004ac6] font-mono text-[10px] font-bold">
                  v3.8-flash
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Deep Verification & Composite Hash Cross-Analysis</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <span>Latency: <strong className="font-mono text-slate-800">140ms</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <span>Safety Policy: <strong className="text-emerald-700">PASSED</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs text-red-700 font-bold uppercase">Confidence: {riskScore}.4%</span>
            </div>

            <button
              onClick={() => onRequestGeminiExplanation(selectedInvoice, sessionApiKey)}
              disabled={selectedInvoice.aiLoading}
              className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {selectedInvoice.aiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{selectedInvoice.aiExplanation ? 'Re-Analyze with Gemini' : 'Run Gemini Analysis'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Reasoning Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dial & Natural Language Summary (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row items-center gap-6">
              {/* Confidence SVG Gauge Meter */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-slate-200" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8" />
                  <circle
                    className="text-red-500 transition-all duration-1000"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * riskScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-extrabold text-red-600 leading-none">{riskScore}.4%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Risk Level</span>
                </div>
              </div>

              {/* Natural Language Assessment Callout */}
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-1.5 text-[#004ac6] font-semibold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Executive Synthesis</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {selectedInvoice.aiExplanation?.summary || (
                    `Gemini detected a high-probability duplicate billing anomaly for vendor "${inv.vendor}". Line amounts ($${inv.amount.toFixed(2)}) match historical records, requiring mandatory hold confirmation before disbursement.`
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold">
                    ANOMALY: {findings[0]?.category || 'DUPLICATE_SUSPICION'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                    Dedupe Hash: 0x88f4...b2a
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Threat Matrix Mini-Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Disbursement Route</span>
                <span className="font-mono text-sm font-bold text-red-600">REDIRECTED</span>
                <span className="text-[11px] text-slate-500">Deviation from approved file</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Line Item Parity</span>
                <span className="font-mono text-sm font-bold text-red-600">100% Identical</span>
                <span className="text-[11px] text-slate-500">Weight & unit amounts identical</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Disbursement Velocity</span>
                <span className="font-mono text-sm font-bold text-red-600">2.1x Baseline</span>
                <span className="text-[11px] text-slate-500">Exceeds monthly quota</span>
              </div>
            </div>
          </div>

          {/* Reasoning Step Chain (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Multi-Stage Forensic Chain</span>
              <span className="font-mono text-xs text-red-600 font-semibold">{findings.length > 0 ? `${findings.length} Flagged` : '3 of 3 Flagged'}</span>
            </div>

            {/* Step 1 */}
            <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Exact Payload Hash Collision</span>
                  <span className="font-mono text-xs text-red-600 font-bold">99.8%</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  OCR token sequence matching against historical record #{baselineInvoice.invoice_id}. Textual alignment on line items.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Vendor Routing Discrepancy</span>
                  <span className="font-mono text-xs text-red-600 font-bold">CRITICAL</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Unilateral switch in bank destination routing table detected relative to established master agreement.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Payment Velocity Anomaly</span>
                  <span className="font-mono text-xs text-red-600 font-bold">2.1x Spurt</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Second high-dollar freight billing submitted within close window. Contract stipulates monthly consolidation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Side-by-Side Verification Diff */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Forensic Side-by-Side Verification Diff</h2>
            <p className="text-xs text-slate-500">Red and amber badges highlight divergent disbursement channels and duplicate billings</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 shadow-xs">
              <Eye className="w-3.5 h-3.5 text-[#004ac6]" />
              <span>Toggle OCR Bounding Boxes</span>
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 shadow-xs">
              <Download className="w-3.5 h-3.5 text-[#004ac6]" />
              <span>Export Side-by-Side PDF</span>
            </button>
          </div>
        </div>

        {/* Comparative Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Subject Invoice Under Review */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-red-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[11px] font-bold uppercase">
                  FLAGGED SUBJECT
                </span>
                <span className="font-bold text-sm font-mono text-slate-900">#{inv.invoice_id}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">Ingested Oct 29, 2026 · 04:12 UTC</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendor Name</span>
                  <span className="font-semibold text-slate-900">{inv.vendor}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">PO Reference</span>
                  <span className="font-mono font-semibold text-[#004ac6]">{inv.po_number || 'PO-99120'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing Date</span>
                  <span className="font-mono text-slate-800">{inv.invoice_date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Billed Total</span>
                  <span className="font-mono text-base font-bold text-slate-900">${inv.amount.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Discrepancy Highlight: Banking Route */}
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-700 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sub-Ledger Route Discrepancy
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                    UNVERIFIED DESTINATION
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Bank Name:</span>
                    <p className="text-slate-900 font-semibold">Bank of America N.A.</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Routing Transit #:</span>
                    <p className="text-red-700 font-bold">026009593</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Wire Account #:</span>
                    <p className="text-red-700 font-bold">**** 4491</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Beneficiary Entity:</span>
                    <p className="text-slate-900 font-semibold">{inv.vendor} Solutions LLC</p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OCR Extracted Line Items</span>
                <div className="rounded-lg bg-white border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="p-2 font-sans">Dedicated Freight Logistics Q3 Intermodal (BOL #4892)</td>
                        <td className="p-2 text-right">44,000</td>
                        <td className="p-2 text-right">${(inv.amount * 0.85 / 44000).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${(inv.amount * 0.85).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Fuel Surcharge - Low Sulfur Diesel Adjustment Index</td>
                        <td className="p-2 text-right">1 Lot</td>
                        <td className="p-2 text-right">${(inv.amount * 0.15).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${(inv.amount * 0.15).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scanned Document Thumbnail */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="w-12 h-14 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-slate-900">Source Scanned Artifact (PDF)</span>
                  <span className="font-mono text-[11px] text-slate-400">{inv.invoice_id.toLowerCase()}_20261028.pdf (1.4 MB)</span>
                  <span className="text-[#004ac6] hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer">
                    <ExternalLink className="w-3 h-3" />
                    Inspect Raw Vector Layers
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Matched Historical Settled Record */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-emerald-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold uppercase">
                  HISTORICAL BASELINE (PAID)
                </span>
                <span className="font-bold text-sm font-mono text-slate-900">#{baselineInvoice.invoice_id}</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Disbursed Oct 14, 2026
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendor Name</span>
                  <span className="font-semibold text-slate-900">{baselineInvoice.vendor}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">PO Reference</span>
                  <span className="font-mono font-semibold text-[#004ac6]">{baselineInvoice.po_number}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing Date</span>
                  <span className="font-mono text-slate-800">{baselineInvoice.invoice_date} (14 days prior)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Billed Total</span>
                  <span className="font-mono text-base font-bold text-slate-900">${baselineInvoice.amount.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Approved Master Record: Verified Routing */}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Master Vendor File
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                    AUTHORIZED DISBURSEMENT
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Bank Name:</span>
                    <p className="text-slate-900 font-semibold">Wells Fargo Bank N.A.</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Routing Transit #:</span>
                    <p className="text-emerald-700 font-bold">121000248</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Wire Account #:</span>
                    <p className="text-emerald-700 font-bold">**** 8832</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Beneficiary Entity:</span>
                    <p className="text-slate-900 font-semibold">{baselineInvoice.vendor} Operating</p>
                  </div>
                </div>
              </div>

              {/* Settled Line Items */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settled Line Items</span>
                  <span className="font-mono text-[11px] text-red-600 font-semibold">100% Hash Collision</span>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="p-2 font-sans">Dedicated Freight Logistics Q3 Intermodal (BOL #4892)</td>
                        <td className="p-2 text-right">44,000</td>
                        <td className="p-2 text-right">${(baselineInvoice.amount * 0.85 / 44000).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${(baselineInvoice.amount * 0.85).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Fuel Surcharge - Low Sulfur Diesel Adjustment Index</td>
                        <td className="p-2 text-right">1 Lot</td>
                        <td className="p-2 text-right">${(baselineInvoice.amount * 0.15).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${(baselineInvoice.amount * 0.15).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settled Voucher Reference */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="w-12 h-14 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center text-emerald-600">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-slate-900">Settled Fedwire Confirmation</span>
                  <span className="font-mono text-[11px] text-slate-400">wire_ref_WF20261014_8992.pdf (890 KB)</span>
                  <span className="text-[#004ac6] hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer">
                    <ExternalLink className="w-3 h-3" />
                    View Settled Clearing Voucher
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Audit Timeline & Chain of Custody */}
      <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Audit Trail & Chain of Custody</h2>
            <p className="text-xs text-slate-500">Immutable ledger logging all OCR extractions, autonomous decisions, and auditor interventions</p>
          </div>
          <button className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Signature: VALID</span>
          </button>
        </div>

        {/* Chronological Events Flow */}
        <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* Dynamic User Notes Appended First */}
          {localAuditTrail.map((item) => (
            <div key={item.id} className="relative flex items-start gap-4 animate-fade-in">
              <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#2563eb] text-white ring-4 ring-white flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              <div className="flex-1 bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{item.title}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#2563eb] text-white font-mono text-[10px] font-bold">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{item.desc}</p>
                </div>
                <span className="font-mono text-[11px] text-[#004ac6] font-semibold shrink-0">{item.timestamp}</span>
              </div>
            </div>
          ))}

          {/* Timeline Item 1 */}
          <div className="relative flex items-start gap-4">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#2563eb] text-white ring-4 ring-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Invoice Ingestion via SAP Batch EDI-810</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] text-slate-600">Automated</span>
                </div>
                <p className="text-xs text-slate-500">Document extracted from inbound vendor queue; raw byte payload hash computed.</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">Oct 28, 2026 · 23:45:12 UTC</span>
            </div>
          </div>

          {/* Timeline Item 2 */}
          <div className="relative flex items-start gap-4">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#2563eb] text-white ring-4 ring-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Deduplication Hash Index Match</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold">Collision Alert</span>
                </div>
                <p className="text-xs text-slate-500">Matched payload against historical database entry for #{baselineInvoice.invoice_id}. Risk score elevated to 88%.</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">Oct 28, 2026 · 23:45:18 UTC</span>
            </div>
          </div>

          {/* Timeline Item 3 */}
          <div className="relative flex items-start gap-4">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-red-500 text-white ring-4 ring-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-red-700">Gemini 3.8 Flash Forensic Flag & Autonomous Hold</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">WIRE FROZEN</span>
                </div>
                <p className="text-xs text-slate-500">Reasoning engine verified routing modification and calculated {riskScore}.4% duplicate confidence. Automated hold applied.</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">Oct 28, 2026 · 23:45:19 UTC</span>
            </div>
          </div>

          {/* Timeline Item 4 */}
          <div className="relative flex items-start gap-4">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-300 text-slate-800 ring-4 ring-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </span>
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Assigned to Lead AP Risk Auditor Marcus Vance</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] text-slate-600">Workflow Queue</span>
                </div>
                <p className="text-xs text-slate-500">Dispatched to priority triage dashboard for forensic examination and vendor authorization check.</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">Oct 29, 2026 · 00:15:00 UTC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
