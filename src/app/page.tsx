'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { DashboardView } from '@/components/DashboardView';
import { UploadView } from '@/components/UploadView';
import { ExplorerView } from '@/components/ExplorerView';
import { InvestigationView } from '@/components/InvestigationView';
import { EvaluationView } from '@/components/EvaluationView';
import { parseInvoiceCsv } from '@/lib/parser';
import { runAuditDetection } from '@/lib/engine';
import { generateSyntheticCsvString } from '@/data/synthetic-invoices';
import {
  Invoice,
  InvoiceAnalysis,
  BatchAuditMetrics,
  ReviewStatus,
  GeminiExplanation,
} from '@/types/invoice';
import { ShieldCheck, Heart, Sparkles, AlertCircle } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [analyses, setAnalyses] = useState<InvoiceAnalysis[]>([]);
  const [metrics, setMetrics] = useState<BatchAuditMetrics | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceAnalysis | null>(null);
  const [batchName, setBatchName] = useState<string>('Uploaded Invoice Batch');

  // Clear dataset handler
  const handleClearDataset = () => {
    setAnalyses([]);
    setMetrics(null);
    setSelectedInvoice(null);
    setBatchName('');
    setActiveTab('upload');
  };

  // Handle batch audit execution
  const handleAuditBatch = (invoices: Invoice[], sourceName: string) => {
    const { analyses: newAnalyses, metrics: newMetrics } = runAuditDetection(invoices);
    setAnalyses(newAnalyses);
    setMetrics(newMetrics);
    setBatchName(sourceName);
    if (newAnalyses.length > 0) {
      const topFlagged = newAnalyses.find(a => a.flagged) || newAnalyses[0];
      setSelectedInvoice(topFlagged);
    }
    setActiveTab('dashboard');
  };

  // One-click load of synthetic dataset
  const handleLoadSynthetic = () => {
    const csvContent = generateSyntheticCsvString();
    const parsed = parseInvoiceCsv(csvContent);
    const { analyses: synAnalyses, metrics: synMetrics } = runAuditDetection(
      parsed.invoices,
      { referenceDate: '2026-10-23' }
    );
    setAnalyses(synAnalyses);
    setMetrics(synMetrics);
    setBatchName('Synthetic Benchmark Batch (48 Invoices)');
    if (synAnalyses.length > 0) {
      const critical = synAnalyses.find(a => a.riskLevel === 'CRITICAL') || synAnalyses[0];
      setSelectedInvoice(critical);
    }
    setActiveTab('dashboard');
  };

  // Human Review Decision
  const handleUpdateReview = (invoiceId: string, status: ReviewStatus, note: string) => {
    const now = new Date().toLocaleString();
    setAnalyses(prev =>
      prev.map(item => {
        if (item.invoice.id === invoiceId) {
          const updated: InvoiceAnalysis = {
            ...item,
            reviewStatus: status,
            reviewNote: note.trim() || item.reviewNote,
            reviewedAt: now,
            reviewedBy: 'Financial Controller',
          };
          if (selectedInvoice && selectedInvoice.invoice.id === invoiceId) {
            setSelectedInvoice(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Gemini AI Explanation Trigger via POST /api/explain
  const handleRequestGeminiExplanation = async (analysis: InvoiceAnalysis, sessionApiKey?: string) => {
    const invId = analysis.invoice.id;

    // Set loading state
    setAnalyses(prev =>
      prev.map(item =>
        item.invoice.id === invId ? { ...item, aiLoading: true, aiError: undefined } : item
      )
    );
    if (selectedInvoice && selectedInvoice.invoice.id === invId) {
      setSelectedInvoice(prev => (prev ? { ...prev, aiLoading: true, aiError: undefined } : null));
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionApiKey && sessionApiKey.trim()) {
        headers['x-gemini-key'] = sessionApiKey.trim();
      }

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers,
        body: JSON.stringify({ analysis }),
      });

      const data = await res.json();
      const explanation: GeminiExplanation = data.explanation || data.fallbackExplanation;

      setAnalyses(prev =>
        prev.map(item => {
          if (item.invoice.id === invId) {
            const updated: InvoiceAnalysis = {
              ...item,
              aiLoading: false,
              aiExplanation: explanation,
            };
            if (selectedInvoice && selectedInvoice.invoice.id === invId) {
              setSelectedInvoice(updated);
            }
            return updated;
          }
          return item;
        })
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach AI service';
      setAnalyses(prev =>
        prev.map(item => {
          if (item.invoice.id === invId) {
            const updated: InvoiceAnalysis = {
              ...item,
              aiLoading: false,
              aiError: errMsg,
            };
            if (selectedInvoice && selectedInvoice.invoice.id === invId) {
              setSelectedInvoice(updated);
            }
            return updated;
          }
          return item;
        })
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 selection:bg-blue-500/20">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        onLoadSynthetic={handleLoadSynthetic}
        onClearDataset={handleClearDataset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            analyses={analyses}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'upload' && (
          <UploadView
            onAuditBatch={handleAuditBatch}
            onLoadSynthetic={handleLoadSynthetic}
          />
        )}

        {activeTab === 'explorer' && (
          <ExplorerView
            analyses={analyses}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationView
            selectedInvoice={selectedInvoice}
            allAnalyses={analyses}
            onUpdateReview={handleUpdateReview}
            onRequestGeminiExplanation={handleRequestGeminiExplanation}
            onBackToExplorer={() => setActiveTab('explorer')}
          />
        )}

        {activeTab === 'evaluation' && <EvaluationView />}
      </main>

      {/* Professional Fintech Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">SpendShield AI</span>
            <span>—</span>
            <span>Intelligent Invoice Risk Detection & Financial Audit Agent</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Prompt Wars 2026 Competition Entry</span>
            <span>•</span>
            <span className="font-medium text-slate-600">Deterministic Engine + Gemini 2.5 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
