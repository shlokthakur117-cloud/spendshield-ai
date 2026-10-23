'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  Database,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { parseInvoiceCsv } from '@/lib/parser';
import { Invoice, ParseResult } from '@/types/invoice';
import { generateSyntheticCsvString } from '@/data/synthetic-invoices';

interface UploadViewProps {
  onAuditBatch: (invoices: Invoice[], sourceName: string) => void;
  onLoadSynthetic: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onAuditBatch,
  onLoadSynthetic,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      alert('Please select a valid CSV file (.csv).');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const res = parseInvoiceCsv(text);
      setParseResult(res);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent =
      'invoice_id,vendor,invoice_date,amount,expected_amount,po_number,currency,category\n' +
      'INV-001,Acme Cloud Services,2026-03-01,1200.00,1200.00,PO-9821,USD,Cloud Infrastructure\n' +
      'INV-002,Apex Supplies,2026-03-05,450.50,,PO-9822,USD,Office Supplies\n';

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spendshield_invoice_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSyntheticDataset = () => {
    const csvContent = generateSyntheticCsvString();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spendshield_synthetic_audit_benchmark.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeAudit = () => {
    if (!parseResult || parseResult.invoices.length === 0) return;
    setIsAuditing(true);
    setTimeout(() => {
      onAuditBatch(parseResult.invoices, fileName || 'Uploaded Batch');
      setIsAuditing(false);
    }, 300);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Upload & Analyze Invoices</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ingest accounts payable records for instant deterministic anomaly detection and AI forensic explanations.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept=".csv,text/csv"
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-slate-800">
          Drop your invoice CSV here, or <span className="text-blue-600 underline">browse files</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Supports UTF-8 CSVs up to 5MB with flexible header aliasing.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">invoice_id</span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">vendor</span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">invoice_date</span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">amount</span>
          <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono italic">expected_amount (optional)</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-900 font-semibold text-sm">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Synthetic Audit Benchmark (48 Invoices)</span>
            </div>
            <p className="text-xs text-blue-700/80 mt-1 max-w-sm">
              Load 48 synthetic invoices with 10 labeled ground-truth anomalies (exact duplicates, near duplicates, PO mismatches, outliers, future dates).
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={onLoadSynthetic}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Load Dataset Instantly
              </button>
              <button
                onClick={handleDownloadSyntheticDataset}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition flex items-center space-x-1"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Blank CSV Template</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Download our canonical invoice template to structure your internal accounts payable records.
            </p>
            <div className="mt-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download Sample Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Preview (When a file is loaded) */}
      {parseResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">{fileName || 'Uploaded CSV Batch'}</h4>
                <p className="text-xs text-slate-500">
                  {parseResult.validRowsCount} valid invoice record(s) ready for audit
                </p>
              </div>
            </div>

            {parseResult.invoices.length > 0 && (
              <button
                onClick={executeAudit}
                disabled={isAuditing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Financial Audit Engine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Validation Errors or Warnings */}
          {parseResult.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Validation Errors:</span>
              </div>
              {parseResult.errors.map((err, i) => (
                <div key={i} className="pl-5">• {err}</div>
              ))}
            </div>
          )}

          {parseResult.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Data Quality Notes ({parseResult.warnings.length}):</span>
              </div>
              {parseResult.warnings.slice(0, 4).map((w, i) => (
                <div key={i} className="pl-5">• {w}</div>
              ))}
              {parseResult.warnings.length > 4 && (
                <div className="pl-5 text-slate-500">
                  ...and {parseResult.warnings.length - 4} more warnings.
                </div>
              )}
            </div>
          )}

          {/* Table Preview of Invoices */}
          {parseResult.invoices.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Invoice ID</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Expected Amount</th>
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parseResult.invoices.slice(0, 5).map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-medium text-slate-800">{inv.invoice_id}</td>
                      <td className="py-2 px-3 text-slate-700">{inv.vendor}</td>
                      <td className="py-2 px-3 text-slate-600">{inv.invoice_date}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">${inv.amount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-600">
                        {inv.expected_amount !== undefined ? `$${inv.expected_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono">{inv.po_number || '—'}</td>
                      <td className="py-2 px-3 text-slate-600">{inv.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
