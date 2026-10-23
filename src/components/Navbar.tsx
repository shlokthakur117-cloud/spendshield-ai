'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  BarChart3,
  UploadCloud,
  Search,
  AlertTriangle,
  Activity,
  Database,
  Menu,
  X,
} from 'lucide-react';
import { BatchAuditMetrics } from '@/types/invoice';

export type ActiveTab = 'dashboard' | 'upload' | 'explorer' | 'investigation' | 'evaluation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  metrics: BatchAuditMetrics | null;
  onLoadSynthetic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  onLoadSynthetic,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleTabClick('dashboard')}
            role="button"
            tabIndex={0}
            aria-label="SpendShield AI Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">SpendShield</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Intelligent Invoice Risk & Audit Agent</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex space-x-1" aria-label="Main Navigation">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('upload')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload & Audit</span>
            </button>

            <button
              onClick={() => handleTabClick('explorer')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'explorer'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Explorer</span>
              {metrics && metrics.flaggedCount > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  {metrics.flaggedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('investigation')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'investigation'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Investigation</span>
            </button>

            <button
              onClick={() => handleTabClick('evaluation')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'evaluation'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Evaluation</span>
            </button>
          </nav>

          {/* Quick Actions & Mobile Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onLoadSynthetic}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
              title="Load 48-Invoice Synthetic Benchmark Dataset"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Load Sample</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleTabClick('upload')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'upload' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload & Audit</span>
            </button>
            <button
              onClick={() => handleTabClick('explorer')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'explorer' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Explorer</span>
            </button>
            <button
              onClick={() => handleTabClick('investigation')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'investigation' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Investigation</span>
            </button>
            <button
              onClick={() => handleTabClick('evaluation')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'evaluation' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Evaluation</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
