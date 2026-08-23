'use client';

import React, { useState } from 'react';
import { Search, X, Download, ExternalLink, RefreshCw, BookOpen } from 'lucide-react';
import { AcademicSearchResult } from '@/lib/types';
import { api } from '@/lib/api';

interface AcademicSearchModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const AcademicSearchModal: React.FC<AcademicSearchModalProps> = ({
  workspaceId,
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AcademicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchAcademic(query);
      setResults(res);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (item: AcademicSearchResult) => {
    setImportingId(item.id);
    try {
      await api.importAcademicPaper(workspaceId, item);
      onImportSuccess();
      alert(`Successfully imported "${item.title}" into workspace!`);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E251E]/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl border border-[#E2DED4] shadow-2xl flex flex-col overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F7F4ED] border-b border-[#E2DED4]">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#8FA28A]" />
            <h2 className="text-base font-bold text-[#2D372E]">Live Academic Discovery (arXiv & OpenAlex)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A877B] hover:text-[#2D372E] hover:bg-[#EFEBE0]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="p-4 bg-white border-b border-[#E2DED4] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search papers by topic, author, or keywords (e.g. LLM hallucination mitigation)..."
            className="flex-1 bg-[#F7F4ED] border border-[#E2DED4] focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/20 rounded-xl px-4 py-2.5 text-xs text-[#2D372E] placeholder-[#7A877B] outline-none"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] disabled:opacity-50 text-white font-semibold text-xs shadow-xs"
          >
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Results List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F7F4ED]/30">
          {results.length === 0 ? (
            <div className="text-center py-16 text-[#7A877B]">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#8FA28A]" />
              <p className="text-sm font-medium text-[#2D372E]">Search millions of academic research papers</p>
              <p className="text-xs text-[#7A877B] mt-1">Enter keywords above to fetch papers from arXiv and OpenAlex.</p>
            </div>
          ) : (
            results.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-xl border border-[#E2DED4] hover:border-[#C7D3C0] transition flex flex-col sm:flex-row items-start justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0] rounded">
                      {item.source}
                    </span>
                    {item.year && <span className="text-xs font-mono text-[#7A877B]">{item.year}</span>}
                    {item.venue && <span className="text-xs text-[#7A877B]">• {item.venue}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-[#2D372E]">{item.title}</h3>
                  <p className="text-xs text-[#7A877B]">Authors: {item.authors.join(', ')}</p>
                  {item.abstract && <p className="text-xs text-[#4A554C] line-clamp-2 mt-1">{item.abstract}</p>}
                </div>

                <div className="flex sm:flex-col items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleImport(item)}
                    disabled={importingId === item.id}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] disabled:opacity-50 text-white font-semibold text-xs transition shadow-xs"
                  >
                    {importingId === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Import to Workspace
                  </button>

                  {item.pdf_url && (
                    <a
                      href={item.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-[#7A877B] hover:text-[#2D372E] rounded-lg hover:bg-[#F7F4ED]"
                      title="Preview PDF"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
