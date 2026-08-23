'use client';

import React, { useState } from 'react';
import { Layers, FileText, Cpu, GitCompare, HelpCircle, BookMarked, Plus, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { Workspace, User } from '@/lib/types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace) => void;
  onOpenNewWorkspace: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  workspaces,
  activeWorkspace,
  setActiveWorkspace,
  onOpenNewWorkspace,
  currentUser,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: Layers },
    { id: 'library', label: 'Paper Library', icon: FileText },
    { id: 'reader', label: 'Read & Ask AI', icon: SparklesIcon },
    { id: 'agent', label: 'AI Assistant', icon: Cpu },
    { id: 'comparison', label: 'Compare Papers', icon: GitCompare },
    { id: 'gaps', label: 'Missing Ideas', icon: HelpCircle },
    { id: 'review', label: 'Summary Review', icon: BookMarked },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E2DED4] px-4 lg:px-8 py-2 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center cursor-pointer group flex-shrink-0"
        >
          <img
            src="/litlens-logo.png"
            alt="LitLens Logo"
            className="h-10 sm:h-14 lg:h-16 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#F7F4ED] p-1 rounded-2xl border border-[#E2DED4]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#8FA28A] text-white shadow-xs'
                    : 'text-[#54664F] hover:text-[#2D372E] hover:bg-white/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8FA28A]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Active Workspace Selector */}
          {workspaces.length > 0 && (
            <div className="flex items-center gap-1 bg-[#F7F4ED] border border-[#E2DED4] rounded-xl px-2 py-1">
              <Layers className="w-3.5 h-3.5 text-[#8FA28A] hidden sm:inline" />
              <select
                value={activeWorkspace?.id || ''}
                onChange={(e) => {
                  const found = workspaces.find(w => w.id === e.target.value);
                  if (found) setActiveWorkspace(found);
                }}
                className="bg-transparent text-xs font-semibold text-[#2D372E] outline-none cursor-pointer max-w-[110px] sm:max-w-[150px] truncate"
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id} className="bg-white text-[#2D372E]">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Workspace Button */}
          <button
            onClick={onOpenNewWorkspace}
            className="flex items-center justify-center p-2 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white shadow-xs transition flex-shrink-0"
            title="Create New Project"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* User Profile Badge & Logout */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#E8EFE5] border border-[#C7D3C0] rounded-xl px-2.5 py-1">
              <UserIcon className="w-3.5 h-3.5 text-[#3D4A39]" />
              <span className="text-xs font-semibold text-[#3D4A39] max-w-[100px] truncate">
                {currentUser.full_name || currentUser.email.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                className="ml-1 p-1 text-[#54664F] hover:text-rose-600 rounded-lg hover:bg-white transition"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#F7F4ED] text-[#2D372E] border border-[#E2DED4] hover:bg-[#EFEBE0] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-[#E2DED4] bg-white rounded-2xl p-3 space-y-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {/* User Profile info in mobile drawer */}
          {currentUser && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] mb-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <UserIcon className="w-4 h-4 text-[#8FA28A]" />
                <span className="text-xs font-bold text-[#2D372E] truncate">{currentUser.email}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E2DED4] text-xs font-semibold text-rose-600"
              >
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A877B] px-3 pb-1">
            Navigation Menu
          </p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#8FA28A] text-white'
                    : 'text-[#54664F] hover:bg-[#F7F4ED]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8FA28A]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

// Helper Sparkles icon import
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
