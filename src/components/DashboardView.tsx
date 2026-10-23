'use client';

import React from 'react';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BatchAuditMetrics, InvoiceAnalysis } from '@/types/invoice';

interface DashboardViewProps {
  metrics: BatchAuditMetrics | null;
  analyses: InvoiceAnalysis[];
  onSelectInvoice: (analysis: InvoiceAnalysis) => void;
  onNavigateTab: (tab: 'upload' | 'explorer' | 'investigation') => void;
}

const RISK_COLORS = {
  low: '#10b981',      // Emerald Green
  medium: '#f59e0b',   // Amber
  high: '#f97316',     // Orange
  critical: '#ef4444', // Red
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  analyses,
  onSelectInvoice,
  onNavigateTab,
}) => {
  if (!metrics || analyses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Invoice Audit Data Loaded</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
          Upload an invoice CSV batch or load the built-in 48-invoice synthetic benchmark to inspect automated anomaly detection.
        </p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => onNavigateTab('upload')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition"
          >
            Upload Invoices
          </button>
        </div>
      </div>
    );
  }

  // Risk Distribution Data for Pie Chart
  const riskPieData = [
    { name: 'Low / Clean', value: metrics.riskDistribution.low, color: RISK_COLORS.low },
    { name: 'Medium Risk', value: metrics.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: 'High Risk', value: metrics.riskDistribution.high, color: RISK_COLORS.high },
    { name: 'Critical Risk', value: metrics.riskDistribution.critical, color: RISK_COLORS.critical },
  ].filter(d => d.value > 0);

  // Category Breakdown Data for Bar Chart
  const categoryBarData = [
    { name: 'Exact Dup', count: metrics.categoryBreakdown.EXACT_DUPLICATE || 0, fill: '#ef4444' },
    { name: 'Near Dup', count: metrics.categoryBreakdown.POTENTIAL_DUPLICATE || 0, fill: '#f97316' },
    { name: 'PO Mismatch', count: metrics.categoryBreakdown.AMOUNT_MISMATCH || 0, fill: '#f59e0b' },
    { name: 'Outlier', count: metrics.categoryBreakdown.AMOUNT_OUTLIER || 0, fill: '#8b5cf6' },
    { name: 'Future Date', count: metrics.categoryBreakdown.FUTURE_DATE || 0, fill: '#3b82f6' },
    { name: 'Data Gap', count: metrics.categoryBreakdown.DATA_QUALITY || 0, fill: '#64748b' },
  ];

  // Top critical flagged invoices
  const topFlagged = [...analyses]
    .filter(a => a.flagged)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Audit Metadata */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Audit Batch Live
            </span>
            <span className="text-xs text-slate-400 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Duration: {metrics.executionDurationMs} ms
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Audit & Risk Overview</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Deterministic rule engine with multi-factor anomaly signals and on-demand Gemini AI forensic explanations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('explorer')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition flex items-center space-x-1.5"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalInvoices}</div>
            <p className="text-xs text-slate-500 mt-1">100% parsed & evaluated</p>
          </div>
        </div>

        {/* Analyzed Invoice Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analyzed Value</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ${metrics.totalAnalyzedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cumulative batch total</p>
          </div>
        </div>

        {/* Flagged Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Flagged Invoices</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{metrics.flaggedCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              {((metrics.flaggedCount / metrics.totalInvoices) * 100).toFixed(1)}% of batch flagged
            </p>
          </div>
        </div>

        {/* High Risk Count */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High / Critical</span>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-600">{metrics.highRiskCount}</div>
            <p className="text-xs text-slate-500 mt-1">Require immediate human sign-off</p>
          </div>
        </div>

        {/* Flagged Amount (Under Review) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Flagged Amount</span>
              <span title="Total value of flagged invoices under review. Not automatically assumed 'money saved'." className="cursor-help">
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              ${metrics.flaggedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-medium text-purple-600/80 mt-1">Pending controller audit</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Categories Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Anomaly Detection Categories</h3>
              <p className="text-xs text-slate-500">Distribution of triggered deterministic audit rules</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Rule Matches
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number) => [`${val} occurrence(s)`, 'Findings Count']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Invoice Risk Stratification</h3>
              <p className="text-xs text-slate-500">Classification by overall composite risk score</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {metrics.totalInvoices} Invoices
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} invoice(s)`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-slate-700 font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Priority Invoices Spotlight Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Priority Investigation Queue</h3>
            <p className="text-xs text-slate-500">Top invoices with highest composite anomaly signals</p>
          </div>
          <button
            onClick={() => onNavigateTab('explorer')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>View All ({metrics.flaggedCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Primary Anomaly</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topFlagged.map(analysis => {
                const inv = analysis.invoice;
                const primaryFinding = analysis.findings[0];
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {inv.invoice_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {inv.vendor}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {inv.invoice_date}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-medium text-slate-700 block">
                        {primaryFinding ? primaryFinding.title : 'Normal'}
                      </span>
                      {analysis.findings.length > 1 && (
                        <span className="text-[11px] text-slate-400">
                          +{analysis.findings.length - 1} more signal(s)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          analysis.riskLevel === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : analysis.riskLevel === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : analysis.riskLevel === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {analysis.riskLevel} ({analysis.overallScore})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectInvoice(analysis);
                          onNavigateTab('investigation');
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
