'use client';

import React from 'react';
import { ShieldCheck, BarChart3, UploadCloud, Search, AlertTriangle, Activity, Settings, Cpu, Clock, RefreshCw } from 'lucide-react';
import { BatchAuditMetrics } from '@/types/invoice';

export type ActiveTab = 'dashboard' | 'upload' | 'explorer' | 'investigation' | 'evaluation';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  metrics: BatchAuditMetrics | null;
  onLoadSynthetic: () => void;
  onClearDataset?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  onLoadSynthetic,
  onClearDataset,
}) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#004ac6] to-[#2563eb] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base text-[#0b1c30] tracking-tight leading-tight">
                SpendShield
              </span>
              <span className="text-[10px] font-bold text-[#004ac6] tracking-wider uppercase">
                AI Defense
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#004ac6] font-mono text-[11px] font-semibold">
            v2.4
          </span>
        </div>

        {/* Navigation Section */}
        <div className="p-3">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Audit Workspaces
          </p>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'upload'
                  ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload & Analyze</span>
            </button>

            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'explorer'
                  ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4" />
                <span>Invoice Explorer</span>
              </div>
              {metrics && metrics.flaggedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'explorer' ? 'bg-white text-[#2563eb]' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {metrics.flaggedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('investigation')}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'investigation'
                  ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Risk Investigation</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === 'evaluation'
                  ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Model Evaluation</span>
            </button>
          </nav>
        </div>

        {/* Quick Batch Tools */}
        <div className="px-3 pt-2 space-y-1.5">
          <button
            onClick={onLoadSynthetic}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004ac6]" />
            <span>Load Benchmark Data</span>
          </button>

          {metrics && onClearDataset && (
            <button
              onClick={onClearDataset}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition"
            >
              <span>Clear Current Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Telemetry & Status */}
      <div className="p-3 border-t border-slate-200 flex flex-col gap-2">
        <div className="px-3 py-2 rounded-lg bg-slate-50 flex items-center justify-between border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-800">Gemini 3.8 Flash</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 font-bold">LIVE</span>
        </div>

        <div className="px-3 flex items-center justify-between text-slate-500 text-xs">
          <span>Engine Latency</span>
          <span className="font-mono text-xs font-semibold text-slate-800">
            {metrics ? `${metrics.executionDurationMs}ms` : '3.9ms'}
          </span>
        </div>
      </div>
    </aside>
  );
};
