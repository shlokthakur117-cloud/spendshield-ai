'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  Send,
  HelpCircle,
  ExternalLink,
  RefreshCw,
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
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sessionApiKey, setSessionApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  if (!selectedInvoice) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Invoice Selected</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
          Please select an invoice from the Explorer or Dashboard to inspect its deterministic evidence and AI reasoning.
        </p>
        <button
          onClick={onBackToExplorer}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition"
        >
          Go to Invoice Explorer
        </button>
      </div>
    );
  }

  const inv = selectedInvoice.invoice;
  const findings = selectedInvoice.findings;

  // Find related invoices if any finding lists related IDs
  const relatedIds = findings.flatMap(f => f.relatedInvoiceIds || []);
  const relatedInvoices = allAnalyses.filter(
    a => relatedIds.includes(a.invoice.invoice_id) && a.invoice.id !== inv.id
  );

  const handleStatusChange = (status: ReviewStatus) => {
    setIsSubmittingReview(true);
    onUpdateReview(inv.id, status, reviewNote);
    setTimeout(() => {
      setIsSubmittingReview(false);
      setReviewNote('');
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBackToExplorer}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">Current Review State:</span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              selectedInvoice.reviewStatus === 'RESOLVED'
                ? 'bg-emerald-100 text-emerald-800'
                : selectedInvoice.reviewStatus === 'DISMISSED'
                ? 'bg-slate-100 text-slate-800'
                : selectedInvoice.reviewStatus === 'NEEDS_REVIEW'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {selectedInvoice.reviewStatus}
          </span>
        </div>
      </div>

      {/* Main Invoice Card Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {inv.invoice_id}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedInvoice.riskLevel === 'CRITICAL'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : selectedInvoice.riskLevel === 'HIGH'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : selectedInvoice.riskLevel === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {selectedInvoice.riskLevel} RISK ({selectedInvoice.overallScore}/100)
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 mt-1 flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              <span>{inv.vendor}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{inv.category}</span>
            </p>
          </div>

          {/* Amount Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-right min-w-[200px]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Billed Amount
            </span>
            <div className="text-3xl font-bold text-slate-900 mt-0.5">
              ${inv.amount.toFixed(2)}
            </div>
            {inv.expected_amount !== undefined && (
              <div className="text-xs font-medium text-slate-600 mt-1">
                Authorized PO: ${inv.expected_amount.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Invoice Date</span>
            <span className="text-slate-800 font-semibold">{inv.invoice_date || 'Missing'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Purchase Order</span>
            <span className="text-slate-800 font-mono font-semibold">{inv.po_number || 'None Linked'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Currency</span>
            <span className="text-slate-800 font-semibold">{inv.currency}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Due Date</span>
            <span className="text-slate-800 font-semibold">{inv.due_date || 'Standard Net 30'}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Left: Deterministic Findings | Right: Gemini AI Reasoning & Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Deterministic Evidence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              <span>Deterministic Rule Evidence</span>
            </h3>
            <span className="text-xs font-medium text-slate-500">
              {findings.length} signal(s) triggered
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Clean Transaction</p>
              <p className="text-xs text-slate-500 mt-1">
                No duplicate, outlier, date anomaly, or PO variance detected by audit rules.
              </p>
            </div>
          ) : (
            findings.map((f) => (
              <div
                key={f.id}
                className={`bg-white rounded-xl border p-5 shadow-xs space-y-3 ${
                  f.severity === 'CRITICAL'
                    ? 'border-red-200 bg-red-50/20'
                    : f.severity === 'HIGH'
                    ? 'border-orange-200 bg-orange-50/20'
                    : f.severity === 'MEDIUM'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        f.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : f.severity === 'HIGH'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {f.category.replace('_', ' ')} (+{f.scoreImpact} pts)
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                  </div>
                </div>

                {/* Evidence bullets */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs space-y-1.5">
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Calculated Audit Evidence:
                  </span>
                  {f.evidence.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-slate-700">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Related Invoices Comparison Drawer (if applicable) */}
          {relatedInvoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Related Invoices ({relatedInvoices.length})</span>
              </h4>
              <p className="text-xs text-slate-500">
                Candidate records flagged by the duplicate matching algorithm.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {relatedInvoices.map((rel) => (
                  <div key={rel.invoice.id} className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-semibold text-slate-900">#{rel.invoice.invoice_id}</div>
                      <div className="text-slate-500">
                        {rel.invoice.invoice_date} • {rel.invoice.vendor}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">${rel.invoice.amount.toFixed(2)}</div>
                      <div className="text-[11px] text-slate-500">{rel.riskLevel} Risk</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Gemini AI Reasoning & Human Review */}
        <div className="space-y-6">
          {/* Gemini AI Reasoning Card */}
          <div className="bg-white rounded-2xl border border-indigo-200/80 p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gemini AI Audit Reasoning</h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedInvoice.aiExplanation?.model_used || 'gemini-3.8-flash'} • Official Google GenAI SDK
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                  title="Configure temporary Google AI Studio Gemini API key for this test session"
                >
                  {sessionApiKey ? '🔑 Key Configured' : '⚙️ Set API Key'}
                </button>

                <button
                  onClick={() => onRequestGeminiExplanation(selectedInvoice, sessionApiKey)}
                  disabled={selectedInvoice.aiLoading}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {selectedInvoice.aiLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>{selectedInvoice.aiExplanation ? 'Regenerate' : 'Generate Explanation'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Gemini API Key Configuration Drawer */}
            {showKeyInput && (
              <div className="my-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-950">
                    Google AI Studio Gemini API Key (Session-Only)
                  </span>
                  <span className="text-[10px] text-slate-500">Not saved to git or disk</span>
                </div>
                <input
                  type="password"
                  value={sessionApiKey}
                  onChange={(e) => setSessionApiKey(e.target.value)}
                  placeholder="Paste AIzaSy... key to test live Gemini 2.5 Flash reasoning"
                  className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-indigo-700/80">
                  Tip: If left blank, the app seamlessly runs in deterministic fallback mode with zero runtime errors.
                </p>
              </div>
            )}

            {selectedInvoice.aiLoading && (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="font-medium text-slate-700">Synthesizing forensic explanation with Gemini...</p>
                <p className="text-slate-400">Grounding explanation against deterministic findings.</p>
              </div>
            )}

            {!selectedInvoice.aiLoading && selectedInvoice.aiExplanation && (
              <div className="pt-4 space-y-4 text-xs">
                {/* Executive Summary */}
                <div>
                  <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wider mb-1">
                    Executive Summary:
                  </span>
                  <p className="text-slate-700 leading-relaxed bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                    {selectedInvoice.aiExplanation.summary}
                  </p>
                </div>

                {/* Possible Explanations */}
                <div>
                  <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wider mb-1">
                    Plausible Operational Explanations:
                  </span>
                  <ul className="space-y-1 text-slate-700">
                    {selectedInvoice.aiExplanation.possible_explanations.map((exp, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Controller Action */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">
                    Recommended Audit Action:
                  </span>
                  <p className="text-xs text-slate-200 font-medium">
                    {selectedInvoice.aiExplanation.recommended_action}
                  </p>
                </div>

                {/* Limitations */}
                <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 space-y-1">
                  <span className="font-semibold text-slate-500">Advisory Limitations:</span>
                  {selectedInvoice.aiExplanation.limitations.map((lim, idx) => (
                    <div key={idx}>• {lim}</div>
                  ))}
                </div>
              </div>
            )}

            {!selectedInvoice.aiLoading && !selectedInvoice.aiExplanation && (
              <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                <HelpCircle className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="font-medium text-slate-700">No AI explanation generated yet</p>
                <p className="text-slate-400 max-w-xs mx-auto">
                  Click &apos;Generate Explanation&apos; to submit structured audit findings to Gemini for an objective natural-language explanation.
                </p>
              </div>
            )}
          </div>

          {/* Human Review & Decision Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Controller Audit Decision</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record human oversight decision. Original deterministic evidence is permanently preserved.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Reviewer Note / Justification:
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter audit rationale, vendor clarification notes, or PO reconciliation ID..."
                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={isSubmittingReview}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>

              <button
                onClick={() => handleStatusChange('NEEDS_REVIEW')}
                disabled={isSubmittingReview}
                className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Needs Review</span>
              </button>

              <button
                onClick={() => handleStatusChange('DISMISSED')}
                disabled={isSubmittingReview}
                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Dismiss Flag</span>
              </button>
            </div>

            {selectedInvoice.reviewedAt && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Latest Review Event:</div>
                <div>Status: <span className="font-semibold">{selectedInvoice.reviewStatus}</span> by {selectedInvoice.reviewedBy || 'Controller'}</div>
                <div>Timestamp: {selectedInvoice.reviewedAt}</div>
                {selectedInvoice.reviewNote && (
                  <div className="text-slate-700 italic">&ldquo;{selectedInvoice.reviewNote}&rdquo;</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
