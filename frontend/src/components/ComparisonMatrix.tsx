'use client';

import React, { useState, useEffect } from 'react';
import { GitCompare, Sparkles, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { Paper, MultiPaperCompareResponse } from '@/lib/types';
import { api } from '@/lib/api';

interface ComparisonMatrixProps {
  workspaceId: string;
  papers: Paper[];
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({ workspaceId, papers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(papers.map(p => p.id));
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<MultiPaperCompareResponse | null>(null);

  useEffect(() => {
    setSelectedIds(papers.map(p => p.id));
  }, [papers]);

  const toggleSelectPaper = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRunComparison = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await api.comparePapers(workspaceId, selectedIds);
      setComparisonData(res);
    } catch (err: any) {
      alert(`Error comparing papers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2DED4] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="w-5 h-5 text-[#8FA28A]" />
            <h2 className="text-xl font-bold text-[#2D372E]">Multi-Paper Comparison Matrix</h2>
          </div>
          <p className="text-xs text-[#7A877B]">
            Select multiple research papers to generate side-by-side technical matrix tables and AI cross-paper synthesis.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={selectedIds.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] disabled:opacity-50 text-white font-medium text-xs shadow-xs transition"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Run Matrix Synthesis ({selectedIds.length} papers)
        </button>
      </div>

      {/* Paper Selection Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[#4A554C] mr-2">Select Papers:</span>
        {papers.map(p => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggleSelectPaper(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                isSelected
                  ? 'bg-[#E8EFE5] text-[#3D4A39] border-[#C7D3C0]'
                  : 'bg-white text-[#4A554C] border-[#E2DED4] hover:border-[#C7D3C0]'
              }`}
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#8FA28A]" /> : <Square className="w-3.5 h-3.5 text-[#7A877B]" />}
              <span className="truncate max-w-[200px]">{p.title}</span>
            </button>
          );
        })}
      </div>

      {/* Cross-Paper AI Synthesis Card */}
      {comparisonData?.cross_paper_synthesis && (
        <div className="p-6 rounded-2xl bg-[#E8EFE5] border border-[#C7D3C0] space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#3D4A39] font-bold uppercase text-xs tracking-wider">
            <Sparkles className="w-4 h-4 text-[#8FA28A]" />
            AI Cross-Paper Synthesis
          </div>
          <div className="text-xs text-[#2D372E] leading-relaxed whitespace-pre-wrap">
            {comparisonData.cross_paper_synthesis}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix Table */}
      {comparisonData?.rows && comparisonData.rows.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DED4] overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F4ED] border-b border-[#E2DED4] text-[#4A554C] font-semibold uppercase tracking-wider">
                <th className="p-4 w-48">Paper Title</th>
                <th className="p-4 w-60">Research Problem</th>
                <th className="p-4 w-60">Methodology</th>
                <th className="p-4 w-48">Dataset</th>
                <th className="p-4 w-60">Metrics & Results</th>
                <th className="p-4 w-48">Strengths</th>
                <th className="p-4 w-48">Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F4ED] text-[#2D372E]">
              {comparisonData.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F7F4ED]/60 transition">
                  <td className="p-4 font-bold text-[#2D372E]">{row.paper_title}</td>
                  <td className="p-4 leading-relaxed">{row.problem}</td>
                  <td className="p-4 leading-relaxed">{row.methodology}</td>
                  <td className="p-4 font-mono text-[#54664F]">{row.dataset}</td>
                  <td className="p-4 leading-relaxed">{row.metrics_results}</td>
                  <td className="p-4 text-[#8FA28A]">{row.strengths}</td>
                  <td className="p-4 text-[#C8A96B]">{row.limitations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E2DED4] text-[#7A877B]">
            <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#8FA28A]" />
            <p className="text-sm font-medium text-[#2D372E]">No comparison generated yet</p>
            <p className="text-xs text-[#7A877B] mt-1">Select papers above and click "Run Matrix Synthesis"</p>
          </div>
        )
      )}
    </div>
  );
};
