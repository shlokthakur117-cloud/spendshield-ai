'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InvoiceAnalysis, RiskLevel, ReviewStatus, AnomalyCategory } from '@/types/invoice';

interface ExplorerViewProps {
  analyses: InvoiceAnalysis[];
  onSelectInvoice: (analysis: InvoiceAnalysis) => void;
  onNavigateTab: (tab: 'investigation') => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  analyses,
  onSelectInvoice,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [reviewFilter, setReviewFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'score' | 'amount' | 'date' | 'vendor'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter and Sort logic
  const filteredInvoices = useMemo(() => {
    return analyses
      .filter((item) => {
        const inv = item.invoice;
        const matchesSearch =
          searchTerm === '' ||
          inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.category && inv.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.po_number && inv.po_number.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRisk =
          riskFilter === 'ALL' || item.riskLevel === riskFilter;

        const matchesReview =
          reviewFilter === 'ALL' || item.reviewStatus === reviewFilter;

        const matchesCategory =
          categoryFilter === 'ALL' ||
          item.findings.some((f) => f.category === categoryFilter);

        return matchesSearch && matchesRisk && matchesReview && matchesCategory;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'score') {
          cmp = a.overallScore - b.overallScore;
        } else if (sortField === 'amount') {
          cmp = a.invoice.amount - b.invoice.amount;
        } else if (sortField === 'date') {
          cmp = new Date(a.invoice.invoice_date).getTime() - new Date(b.invoice.invoice_date).getTime();
        } else if (sortField === 'vendor') {
          cmp = a.invoice.vendor.localeCompare(b.invoice.vendor);
        }
        return sortDirection === 'desc' ? -cmp : cmp;
      });
  }, [analyses, searchTerm, riskFilter, reviewFilter, categoryFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = (field: 'score' | 'amount' | 'date' | 'vendor') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Critical ({score})</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">High ({score})</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Medium ({score})</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Clean (0)</span>;
    }
  };

  const getReviewBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3" />
            <span>Dismissed</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Needs Review</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice ID, Vendor, PO..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
            <span>Showing {filteredInvoices.length} of {analyses.length} record(s)</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Risk Level Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 bg-slate-50/50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low / Clean</option>
            </select>
          </div>

          {/* Anomaly Category Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Anomaly:</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 bg-slate-50/50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="EXACT_DUPLICATE">Exact Duplicate</option>
              <option value="POTENTIAL_DUPLICATE">Potential Duplicate</option>
              <option value="AMOUNT_MISMATCH">PO / Amount Mismatch</option>
              <option value="AMOUNT_OUTLIER">Amount Outlier</option>
              <option value="FUTURE_DATE">Future / Post-Dated</option>
              <option value="DATA_QUALITY">Data Quality</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={reviewFilter}
              onChange={(e) => { setReviewFilter(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 bg-slate-50/50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          {(searchTerm || riskFilter !== 'ALL' || categoryFilter !== 'ALL' || reviewFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('ALL');
                setCategoryFilter('ALL');
                setReviewFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th
                  onClick={() => toggleSort('score')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('vendor')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice & Vendor</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Audit Findings</th>
                <th className="py-3 px-4">Review State</th>
                <th className="py-3 px-4 text-right">Investigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No invoices match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((item) => {
                  const inv = item.invoice;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        {getRiskBadge(item.riskLevel, item.overallScore)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-medium text-slate-900">{inv.invoice_id}</div>
                        <div className="text-xs text-slate-600 font-medium">{inv.vendor}</div>
                        <div className="text-[11px] text-slate-400">{inv.category}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">${inv.amount.toFixed(2)}</div>
                        {inv.expected_amount !== undefined && (
                          <div className="text-[11px] text-slate-500">
                            PO: ${inv.expected_amount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {item.findings.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No anomalies detected</span>
                        ) : (
                          <div className="space-y-1">
                            {item.findings.slice(0, 2).map((f) => (
                              <div
                                key={f.id}
                                className="text-xs font-medium text-slate-700 truncate"
                                title={f.title}
                              >
                                • {f.title}
                              </div>
                            ))}
                            {item.findings.length > 2 && (
                              <div className="text-[11px] text-slate-400">
                                +{item.findings.length - 2} more signal(s)
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getReviewBadge(item.reviewStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            onSelectInvoice(item);
                            onNavigateTab('investigation');
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
