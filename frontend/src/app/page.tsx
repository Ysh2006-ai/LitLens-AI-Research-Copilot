'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SplitPdfReader } from '@/components/SplitPdfReader';
import { PaperIntelligenceModal } from '@/components/PaperIntelligenceModal';
import { ComparisonMatrix } from '@/components/ComparisonMatrix';
import { GapFinderWidget } from '@/components/GapFinderWidget';
import { LiteratureReviewModal } from '@/components/LiteratureReviewModal';
import { GeminiAgentChatbot } from '@/components/GeminiAgentChatbot';
import { Workspace, Paper, AgentResponse, User } from '@/lib/types';
import { api, setAuthToken } from '@/lib/api';
import {
  Sparkles, Upload, FileText, Plus, Layers, Cpu, GitCompare,
  HelpCircle, BookMarked, Trash2, Eye, CheckCircle2, ArrowRight, Zap,
  Lock, Mail, User as UserIcon, LogIn, UserPlus, ShieldCheck, ArrowRightCircle
} from 'lucide-react';

export default function Home() {
  // Navigation & User Auth State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  // Login / Signup Form State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // App Data State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [intelligencePaper, setIntelligencePaper] = useState<Paper | null>(null);
  const [uploading, setUploading] = useState(false);

  // New Workspace Modal
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  // Agent State
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResponse | null>(null);

  // Init Auth on Mount
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setInitLoading(true);
    try {
      const me = await api.getMe();
      setCurrentUser(me);
      await loadUserWorkspaces();
    } catch {
      setCurrentUser(null);
      setAuthToken(null);
    } finally {
      setInitLoading(false);
    }
  };

  const loadUserWorkspaces = async () => {
    try {
      const wsList = await api.listWorkspaces();
      setWorkspaces(wsList);
      setActiveWorkspace(wsList.length > 0 ? wsList[0] : null);
    } catch (err) {
      console.error('Error loading workspaces:', err);
    }
  };

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspacePapers(activeWorkspace.id);
    } else {
      setPapers([]);
      setSelectedPaper(null);
    }
  }, [activeWorkspace?.id]);

  const loadWorkspacePapers = async (wsId: string) => {
    try {
      const list = await api.listPapers(wsId);
      setPapers(list);
      if (list.length > 0 && !selectedPaper) {
        setSelectedPaper(list[0]);
      }
    } catch (err) {
      console.error('Error loading papers:', err);
    }
  };

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        await api.register(authEmail.trim(), authPassword.trim(), authFullName.trim() || undefined);
      } else {
        await api.login(authEmail.trim(), authPassword.trim());
      }
      const me = await api.getMe();
      setCurrentUser(me);
      await loadUserWorkspaces();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setPapers([]);
    setSelectedPaper(null);
    setActiveTab('dashboard');
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const created = await api.createWorkspace(newWsName, newWsDesc);
      setWorkspaces(prev => [created, ...prev]);
      setActiveWorkspace(created);
      setShowNewWorkspaceModal(false);
      setNewWsName('');
      setNewWsDesc('');
    } catch (err: any) {
      alert(`Error creating workspace: ${err.message}`);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete project "${workspaceName}" and all its papers?`)) return;
    try {
      await api.deleteWorkspace(workspaceId);
      const remaining = workspaces.filter(w => w.id !== workspaceId);
      setWorkspaces(remaining);
      if (activeWorkspace?.id === workspaceId) {
        if (remaining.length > 0) {
          setActiveWorkspace(remaining[0]);
        } else {
          setActiveWorkspace(null);
          setPapers([]);
          setSelectedPaper(null);
        }
      }
    } catch (err: any) {
      alert(`Error deleting project: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeWorkspace) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const uploaded = await api.uploadPaper(activeWorkspace.id, file);
      setPapers(prev => [uploaded, ...prev]);
      setSelectedPaper(uploaded);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;
    try {
      await api.deletePaper(paperId);
      setPapers(prev => prev.filter(p => p.id !== paperId));
      if (selectedPaper?.id === paperId) setSelectedPaper(null);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim() || !activeWorkspace || agentRunning) return;
    setAgentRunning(true);
    try {
      const res = await api.queryAgent(activeWorkspace.id, agentPrompt);
      setAgentResult(res);
    } catch (err: any) {
      alert(`Agent error: ${err.message}`);
    } finally {
      setAgentRunning(false);
    }
  };

  // 1. Initial Loading Screen
  if (initLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F4ED] text-[#2D372E]">
        <img src="/litlens-logo.png" alt="LitLens Logo" className="h-16 w-auto object-contain mb-4 animate-pulse" />
        <p className="text-xs font-semibold text-[#8FA28A]">Loading LitLens Workspace...</p>
      </div>
    );
  }

  // 2. Unauthenticated Login / Signup Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#F7F4ED] p-4 selection:bg-[#C7D3C0]">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-[#E2DED4] shadow-xl space-y-6">
          {/* Logo Header */}
          <div className="text-center space-y-2">
            <img src="/litlens-logo.png" alt="LitLens Logo" className="h-16 mx-auto object-contain" />
            <p className="text-xs text-[#7A877B]">Your Evidence-Grounded AI Copilot for Research</p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-[#F7F4ED] p-1 rounded-2xl border border-[#E2DED4]">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'login' ? 'bg-[#8FA28A] text-white shadow-xs' : 'text-[#54664F] hover:text-[#2D372E]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'signup' ? 'bg-[#8FA28A] text-white shadow-xs' : 'text-[#54664F] hover:text-[#2D372E]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-[#4A554C] block mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#8FA28A] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-[#F7F4ED] border border-[#E2DED4] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2D372E] outline-none focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#4A554C] block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8FA28A] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#F7F4ED] border border-[#E2DED4] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2D372E] outline-none focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#4A554C] block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8FA28A] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F7F4ED] border border-[#E2DED4] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2D372E] outline-none focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
            >
              {authSubmitting ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to My Account
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create My Account
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-[#7A877B]">
            Your research data & papers are isolated to your private account.
          </p>
        </div>
      </div>
    );
  }

  // 3. Authenticated App Layout
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4ED] text-[#2D372E] selection:bg-[#C7D3C0] selection:text-[#1E251E]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        onOpenNewWorkspace={() => setShowNewWorkspaceModal(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Hero Card */}
            <div className="relative overflow-hidden p-8 rounded-3xl bg-white border border-[#E2DED4] shadow-xs space-y-4">
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0] rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8FA28A]" /> Smart AI Research Assistant
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2D372E]">
                  Welcome back, {currentUser.full_name || currentUser.email.split('@')[0]}
                </h1>

                <p className="text-xs sm:text-sm text-[#4A554C] leading-relaxed max-w-2xl">
                  Upload research papers to ask questions with exact page proofs, compare papers side-by-side, and find missing research ideas.
                </p>

                {/* Metric Stat Badge */}
                <div className="pt-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F7F4ED] border border-[#E2DED4]">
                    <span className="text-base font-extrabold text-[#2D372E]">{papers.length}</span>
                    <span className="text-xs text-[#7A877B] font-medium">Saved Papers in Current Project</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-3 pt-2">
                  {activeWorkspace ? (
                    <button
                      onClick={() => setActiveTab('library')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white font-semibold text-xs shadow-xs transition"
                    >
                      <Upload className="w-4 h-4" />
                      Upload PDF Papers
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowNewWorkspaceModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white font-semibold text-xs shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Research Project
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Workspaces List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#2D372E] uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8FA28A]" />
                  Your Research Projects ({workspaces.length})
                </h2>
                <button
                  onClick={() => setShowNewWorkspaceModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8EFE5] hover:bg-[#C7D3C0] text-[#3D4A39] text-xs font-semibold border border-[#C7D3C0] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Project
                </button>
              </div>

              {workspaces.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-[#E2DED4] space-y-3">
                  <Layers className="w-10 h-10 mx-auto opacity-30 text-[#8FA28A]" />
                  <p className="text-sm font-medium text-[#2D372E]">No research projects created yet</p>
                  <button
                    onClick={() => setShowNewWorkspaceModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white text-xs font-semibold shadow-xs"
                  >
                    Create Your First Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {workspaces.map(ws => {
                    const isActive = ws.id === activeWorkspace?.id;
                    return (
                      <div
                        key={ws.id}
                        onClick={() => setActiveWorkspace(ws)}
                        className={`p-5 bg-white rounded-2xl border cursor-pointer glass-card-hover ${
                          isActive
                            ? 'border-[#8FA28A] ring-2 ring-[#8FA28A]/20 shadow-xs'
                            : 'border-[#E2DED4] hover:border-[#C7D3C0]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-[#F7F4ED] text-[#54664F]">
                            {ws.paper_count || 0} Papers
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#54664F]">
                                <CheckCircle2 className="w-3 h-3 text-[#8FA28A]" /> Active
                              </span>
                            )}
                            {/* Delete Project Button */}
                            <button
                              onClick={(e) => handleDeleteWorkspace(ws.id, ws.name, e)}
                              className="p-1 text-[#7A877B] hover:text-rose-600 rounded-lg hover:bg-[#F7F4ED] transition"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-base font-bold text-[#2D372E]">{ws.name}</h3>
                        <p className="text-xs text-[#7A877B] mt-1 line-clamp-2">{ws.description || "No description."}</p>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#F7F4ED] text-xs">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveTab('reader'); }}
                            className="text-[#8FA28A] hover:text-[#54664F] font-semibold flex items-center gap-1"
                          >
                            Read & Ask AI <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Paper Library */}
        {activeTab === 'library' && (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2DED4] shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-[#2D372E]">Paper Library — {activeWorkspace?.name || 'No Project Selected'}</h2>
                <p className="text-xs text-[#7A877B]">Upload PDF research papers to read, ask questions, and summarize.</p>
              </div>

              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs transition ${activeWorkspace ? 'bg-[#C8A96B] hover:bg-[#B59453] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}>
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading PDF..." : "Upload PDF"}
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={uploading || !activeWorkspace} />
              </label>
            </div>

            {/* Papers Grid */}
            {papers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E2DED4] text-[#7A877B]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#8FA28A]" />
                <p className="text-sm font-medium text-[#2D372E]">No papers uploaded yet</p>
                <p className="text-xs text-[#7A877B] mt-1">
                  {activeWorkspace ? 'Upload a PDF paper above to get started.' : 'Create or select a research project first.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {papers.map((p) => (
                  <div key={p.id} className="p-5 bg-white rounded-2xl border border-[#E2DED4] space-y-4 flex flex-col justify-between glass-card-hover">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0]">
                          Ready
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setIntelligencePaper(p)}
                            className="px-2.5 py-1 rounded-lg bg-[#E8EFE5] hover:bg-[#C7D3C0] text-[#3D4A39] text-xs font-semibold flex items-center gap-1 border border-[#C7D3C0] transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#8FA28A]" />
                            Quick Summary
                          </button>
                          <button
                            onClick={() => handleDeletePaper(p.id)}
                            className="p-1.5 text-[#7A877B] hover:text-rose-600 rounded-lg hover:bg-[#F7F4ED]"
                            title="Delete paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-[#2D372E]">{p.title}</h3>
                      {p.authors && <p className="text-xs text-[#7A877B]">Authors: {p.authors}</p>}
                      {p.abstract && <p className="text-xs text-[#4A554C] line-clamp-3 italic">"{p.abstract}"</p>}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#F7F4ED]">
                      <button
                        onClick={() => { setSelectedPaper(p); setActiveTab('reader'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4ED] hover:bg-[#EFEBE0] text-xs font-semibold text-[#2D372E] border border-[#E2DED4] transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#8FA28A]" />
                        Read & Ask AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Split Reader & Grounded RAG Chat */}
        {activeTab === 'reader' && activeWorkspace && (
          <SplitPdfReader
            workspaceId={activeWorkspace.id}
            papers={papers}
            selectedPaper={selectedPaper}
            onSelectPaper={setSelectedPaper}
          />
        )}

        {/* Tab 4: AI Research Assistant Chatbot */}
        {activeTab === 'agent' && activeWorkspace && (
          <div className="p-4 lg:p-6">
            <GeminiAgentChatbot
              workspaceId={activeWorkspace.id}
              workspaceName={activeWorkspace.name}
              papers={papers}
            />
          </div>
        )}

        {/* Tab 5: Multi-Paper Comparison */}
        {activeTab === 'comparison' && activeWorkspace && (
          <ComparisonMatrix workspaceId={activeWorkspace.id} papers={papers} />
        )}

        {/* Tab 6: Research Gaps & Questions */}
        {activeTab === 'gaps' && activeWorkspace && (
          <GapFinderWidget workspaceId={activeWorkspace.id} />
        )}

        {/* Tab 7: Literature Review */}
        {activeTab === 'review' && activeWorkspace && (
          <LiteratureReviewModal workspaceId={activeWorkspace.id} papers={papers} />
        )}
      </main>

      {/* Paper Intelligence Modal */}
      <PaperIntelligenceModal
        paper={intelligencePaper}
        onClose={() => setIntelligencePaper(null)}
      />

      {/* Create Workspace Modal */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E251E]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-[#E2DED4] shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#2D372E]">Create New Project</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="text-xs text-[#4A554C] font-medium block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. LLM Hallucination Research"
                  className="w-full bg-[#F7F4ED] border border-[#E2DED4] rounded-xl px-3 py-2 text-xs text-[#2D372E] outline-none focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#4A554C] font-medium block mb-1">Description (Optional)</label>
                <textarea
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="What is this project about?"
                  className="w-full bg-[#F7F4ED] border border-[#E2DED4] rounded-xl px-3 py-2 text-xs text-[#2D372E] outline-none focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20 h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F7F4ED] hover:bg-[#EFEBE0] text-xs font-semibold text-[#4A554C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-xs font-semibold text-[#FFFFFF] shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
