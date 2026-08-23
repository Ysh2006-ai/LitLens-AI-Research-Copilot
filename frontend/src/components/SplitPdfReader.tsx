'use client';

import React, { useState } from 'react';
import { Send, FileText, ExternalLink, ShieldCheck, Sparkles, BookOpen, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Paper, ChatMessage, CitationItem } from '@/lib/types';
import { api } from '@/lib/api';

interface SplitPdfReaderProps {
  workspaceId: string;
  papers: Paper[];
  selectedPaper: Paper | null;
  onSelectPaper: (paper: Paper) => void;
}

export const SplitPdfReader: React.FC<SplitPdfReaderProps> = ({
  workspaceId,
  papers,
  selectedPaper,
  onSelectPaper
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePdfPage, setActivePdfPage] = useState<number>(1);

  const getPdfUrl = (url?: string) => {
    if (!url) return '';
    const backendHost = (
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
      'http://localhost:8000'
    ).replace(/\/$/, '');

    // If stored URL points to localhost:8000, replace with active backend host for Vercel/production deployment
    if (url.startsWith('http://localhost:8000') || url.startsWith('http://127.0.0.1:8000')) {
      const path = url.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, '');
      return `${backendHost}${path}`;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleSendMessage = async (queryTextOverride?: string) => {
    const queryText = queryTextOverride || inputQuery;
    if (!queryText.trim() || loading) return;

    if (!queryTextOverride) setInputQuery('');
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversation_id: 'active',
      role: 'user',
      content: queryText,
      citations: [],
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const paperIds = selectedPaper ? [selectedPaper.id] : undefined;
      const res = await api.queryChat(workspaceId, queryText, paperIds);
      setMessages(prev => [...prev, res]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversation_id: 'active',
          role: 'assistant',
          content: `Error retrieving answer: ${err.message || 'Server error'}`,
          citations: [],
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToCitation = (citation: CitationItem) => {
    setActivePdfPage(citation.page_number);
    const matchingPaper = papers.find(p => p.id === citation.paper_id);
    if (matchingPaper && matchingPaper.id !== selectedPaper?.id) {
      onSelectPaper(matchingPaper);
    }
  };

  const resolvedPdfUrl = getPdfUrl(selectedPaper?.pdf_url);

  return (
    <div className="w-full min-h-screen lg:h-[calc(100vh-76px)] grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
      {/* Left Pane: PDF Reader */}
      <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl overflow-hidden border border-[#E2DED4] shadow-xs min-h-[500px] lg:min-h-0">
        {/* PDF Reader Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F7F4ED] border-b border-[#E2DED4]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <FileText className="w-4 h-4 text-[#8FA28A] flex-shrink-0" />
            {papers.length > 0 ? (
              <select
                value={selectedPaper?.id || ''}
                onChange={(e) => {
                  const p = papers.find(item => item.id === e.target.value);
                  if (p) {
                    onSelectPaper(p);
                    setActivePdfPage(1);
                  }
                }}
                className="bg-white border border-[#E2DED4] text-xs font-semibold text-[#2D372E] rounded-lg px-2.5 py-1 max-w-[280px] sm:max-w-md truncate outline-none focus:ring-1 focus:ring-[#8FA28A]"
              >
                {papers.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#7A877B]">No paper selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-[#E2DED4]">
              <button
                onClick={() => setActivePdfPage(prev => Math.max(1, prev - 1))}
                className="p-0.5 hover:bg-[#F7F4ED] text-[#2D372E] rounded transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono font-semibold text-[#3D4A39]">
                Page {activePdfPage}
              </span>
              <button
                onClick={() => setActivePdfPage(prev => prev + 1)}
                className="p-0.5 hover:bg-[#F7F4ED] text-[#2D372E] rounded transition"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedPaper && (
              <a
                href={resolvedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-[#7A877B] hover:text-[#2D372E] rounded-lg hover:bg-[#EFEBE0] transition"
                title="Open raw PDF in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-[#F7F4ED]/60 relative flex flex-col items-center justify-center p-1 overflow-hidden">
          {selectedPaper ? (
            <iframe
              key={`${selectedPaper.id}_page_${activePdfPage}`}
              src={`${resolvedPdfUrl}#page=${activePdfPage}`}
              className="w-full h-full rounded-xl border border-[#E2DED4] bg-white"
              title="PDF Reader"
            />
          ) : (
            <div className="text-center p-8 text-[#7A877B] space-y-2">
              <BookOpen className="w-10 h-10 mx-auto opacity-30 text-[#8FA28A]" />
              <p className="text-xs font-medium text-[#4A554C]">Select a paper from your library to open</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: AI Assistant Chat */}
      <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl overflow-hidden border border-[#E2DED4] shadow-xs min-h-[500px] lg:min-h-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F7F4ED] border-b border-[#E2DED4]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8FA28A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D372E]">
              AI Research Assistant
            </span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0] rounded-full">
            Direct Answer
          </span>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F7F4ED]/40">
          {messages.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#E8EFE5] flex items-center justify-center mx-auto text-[#8FA28A] border border-[#C7D3C0]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#2D372E]">Ask any question about your paper</p>
                <p className="text-xs text-[#7A877B] mt-0.5">Get accurate, concise, evidence-grounded research answers.</p>
              </div>

              {/* Sample Quick Prompt Chips */}
              <div className="space-y-1.5 max-w-xs mx-auto pt-2">
                <button
                  onClick={() => handleSendMessage("What is the main method used in this paper?")}
                  className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#E8EFE5]/60 border border-[#E2DED4] text-xs text-[#4A554C] transition flex items-center justify-between group shadow-2xs"
                >
                  <span>"What is the main method used?"</span>
                  <Zap className="w-3.5 h-3.5 text-[#C8A96B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                  onClick={() => handleSendMessage("What results and limitations are found in this paper?")}
                  className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#E8EFE5]/60 border border-[#E2DED4] text-xs text-[#4A554C] transition flex items-center justify-between group shadow-2xs"
                >
                  <span>"What results and limitations are found?"</span>
                  <Zap className="w-3.5 h-3.5 text-[#C8A96B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#C8A96B] text-white shadow-xs rounded-br-xs'
                      : 'bg-white text-[#2D372E] border border-[#E2DED4] shadow-xs rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white text-[#7A877B] text-xs w-fit border border-[#E2DED4] animate-pulse shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#8FA28A] animate-spin" />
              Reading paper & writing answer...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-2.5 bg-white border-t border-[#E2DED4] flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={selectedPaper ? `Ask about "${selectedPaper.title.slice(0, 25)}..."` : "Ask a question..."}
            className="flex-1 bg-[#F7F4ED] border border-[#E2DED4] focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20 rounded-xl px-3 py-2 text-xs text-[#2D372E] placeholder-[#7A877B] outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="p-2 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] disabled:opacity-50 text-white shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
