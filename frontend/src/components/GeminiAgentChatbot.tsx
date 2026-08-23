'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu, Bot, User as UserIcon, Copy, Check, Zap, Layers, Search, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { Paper } from '@/lib/types';

interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  createdAt: string;
}

interface GeminiAgentChatbotProps {
  workspaceId: string;
  workspaceName?: string;
  papers: Paper[];
}

export const GeminiAgentChatbot: React.FC<GeminiAgentChatbotProps> = ({
  workspaceId,
  workspaceName,
  papers
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **AI Research Assistant**. I can search across all paper(s) in your workspace, synthesize methodologies, find research gaps, and construct comparison insights.\n\nHow can I help advance your research today?`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryOverride?: string) => {
    const query = (queryOverride || inputQuery).trim();
    if (!query || loading) return;

    if (!queryOverride) setInputQuery('');

    const userMsg: AgentChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.queryAgent(workspaceId, query);
      const assistantMsg: AgentChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.response || 'No response generated.',
        toolsUsed: res.tools_used || [],
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Apologies, an error occurred while generating response: ${err.message || 'Server error'}`,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-white rounded-2xl border border-[#E2DED4] shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7F4ED] border-b border-[#E2DED4]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E8EFE5] border border-[#C7D3C0] flex items-center justify-center text-[#3D4A39]">
            <Cpu className="w-5 h-5 text-[#8FA28A]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#2D372E]">AI Research Assistant</h2>
            <p className="text-[11px] text-[#7A877B]">
              Autonomous literature synthesis & evidence reasoning
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-white text-[#4A554C] border border-[#E2DED4] rounded-lg">
            <Search className="w-3 h-3 text-[#8FA28A]" /> Smart Search
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-white text-[#4A554C] border border-[#E2DED4] rounded-lg">
            <Zap className="w-3 h-3 text-[#C8A96B]" /> AI Analysis
          </span>
        </div>
      </div>

      {/* Preset Action Chips Header */}
      <div className="p-3 bg-[#F7F4ED]/50 border-b border-[#E2DED4] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-semibold text-[#7A877B] whitespace-nowrap px-1">
          Quick Actions:
        </span>
        <button
          onClick={() => handleSend("Synthesize the main methodologies and technical approaches across all papers in my workspace.")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8EFE5] border border-[#E2DED4] text-[11px] font-medium text-[#2D372E] transition flex-shrink-0 shadow-2xs"
        >
          <Layers className="w-3.5 h-3.5 text-[#8FA28A]" />
          Synthesize Methodologies
        </button>
        <button
          onClick={() => handleSend("Compare the key results, datasets, and trade-offs of the papers in this workspace.")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8EFE5] border border-[#E2DED4] text-[11px] font-medium text-[#2D372E] transition flex-shrink-0 shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
          Compare Results & Datasets
        </button>
        <button
          onClick={() => handleSend("Analyze the limitations across these papers and identify top 3 research gaps.")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8EFE5] border border-[#E2DED4] text-[11px] font-medium text-[#2D372E] transition flex-shrink-0 shadow-2xs"
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#C8A96B]" />
          Discover Research Gaps
        </button>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F7F4ED]/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#E8EFE5] border border-[#C7D3C0] flex items-center justify-center text-[#3D4A39] flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#8FA28A]" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 relative group shadow-2xs ${
                msg.role === 'user'
                  ? 'bg-[#C8A96B] text-white rounded-br-xs'
                  : 'bg-white text-[#2D372E] border border-[#E2DED4] rounded-bl-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5 mb-1.5">
                <span className={`font-bold text-[10px] uppercase tracking-wider ${msg.role === 'user' ? 'text-white/80' : 'text-[#3D4A39]'}`}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] ${msg.role === 'user' ? 'text-white/70' : 'text-[#7A877B]'}`}>
                    {msg.createdAt}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 hover:bg-[#F7F4ED] rounded text-[#7A877B] transition"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Tools Executed Chips */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  {msg.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0] rounded-md flex items-center gap-1"
                    >
                      <Zap className="w-2.5 h-2.5 text-[#C8A96B]" /> {tool}
                    </span>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-[#C8A96B] flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8EFE5] border border-[#C7D3C0] flex items-center justify-center text-[#8FA28A]">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-[#E2DED4] text-xs text-[#7A877B] flex items-center gap-2 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#8FA28A] animate-spin" />
              <span>AI Assistant is analyzing papers & synthesizing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-white border-t border-[#E2DED4] flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask AI Assistant (e.g. Synthesize methods, compare findings, or propose future ideas)..."
          className="flex-1 bg-[#F7F4ED] border border-[#E2DED4] focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20 rounded-xl px-4 py-2.5 text-xs text-[#2D372E] placeholder-[#7A877B] outline-none"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-2 shadow-2xs"
        >
          {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
