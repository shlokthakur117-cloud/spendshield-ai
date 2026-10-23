'use client';

import React from 'react';
import {
  Building2,
  Search,
  Plus,
  Bell,
  ChevronDown,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onUploadClick: () => void;
  onSearchChange?: (val: string) => void;
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUploadClick,
  onSearchChange,
  onMobileMenuToggle,
}) => {
  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40">
      <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Ledger & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <Building2 className="w-4 h-4 text-[#004ac6]" />
            <span>Acme Global Holdings · US AP Ledger</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search invoices by #, vendor, tax ID or anomaly..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]/20 transition"
            />
          </div>
        </div>

        {/* Action Button & User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-3.5 py-1.5 rounded-lg hover:bg-[#1d4ed8] transition font-medium text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Upload CSV</span>
          </button>

          <div className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-600 text-white font-mono text-[10px] rounded-full flex items-center justify-center font-bold">
              4
            </span>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-indigo-900 text-white font-bold text-xs flex items-center justify-center">
              MV
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">Marcus Vance</span>
              <span className="text-[10px] text-slate-400">Lead AP Risk Auditor</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
