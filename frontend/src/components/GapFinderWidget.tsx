'use client';

import React, { useState } from 'react';
import { HelpCircle, Sparkles, Lightbulb, AlertOctagon, RefreshCw, ArrowRight } from 'lucide-react';
import { ResearchGap, ResearchQuestion } from '@/lib/types';
import { api } from '@/lib/api';

interface GapFinderWidgetProps {
  workspaceId: string;
}

export const GapFinderWidget: React.FC<GapFinderWidgetProps> = ({ workspaceId }) => {
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingQuestionId, setGeneratingQuestionId] = useState<string | null>(null);

  const handleDiscoverGaps = async () => {
    setLoading(true);
    try {
      const res = await api.discoverGaps(workspaceId);
      setGaps(res);
    } catch (err: any) {
      alert(`Error discovering gaps: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestion = async (gap: ResearchGap) => {
    setGeneratingQuestionId(gap.id);
    try {
      const q = await api.generateQuestion(workspaceId, gap.id);
      setQuestions(prev => [q, ...prev]);
    } catch (err: any) {
      alert(`Error generating question: ${err.message}`);
    } finally {
      setGeneratingQuestionId(null);
    }
  };

  const categoryBadges: Record<string, { label: string; color: string }> = {
    recurring_limitation: { label: 'Recurring Limitation', color: 'bg-[#F4E9D0] text-[#6E5528] border-[#E7D2A3]' },
    contradiction: { label: 'Empirical Contradiction', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    underexplored: { label: 'Underexplored Domain', color: 'bg-[#E8EFE5] text-[#3D4A39] border-[#C7D3C0]' },
    methodological: { label: 'Methodological Gap', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    dataset: { label: 'Dataset Constraint', color: 'bg-[#E8EFE5] text-[#54664F] border-[#C7D3C0]' }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2DED4] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon className="w-5 h-5 text-[#C8A96B]" />
            <h2 className="text-xl font-bold text-[#2D372E]">Research Gap Finder & Question Generator</h2>
          </div>
          <p className="text-xs text-[#7A877B]">
            Automatically analyze workspace literature to identify potential research gaps, recurring limitations, and derive high-impact research questions.
          </p>
        </div>

        <button
          onClick={handleDiscoverGaps}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#B59453] text-white font-medium text-xs shadow-xs transition"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Scan Workspace for Research Gaps
        </button>
      </div>

      {/* Discovered Gaps Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#2D372E] uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#8FA28A]" />
          Identified Potential Research Gaps ({gaps.length})
        </h3>

        {gaps.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E2DED4] text-[#7A877B]">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#C8A96B]" />
            <p className="text-sm font-medium text-[#2D372E]">No research gaps scanned yet</p>
            <p className="text-xs text-[#7A877B] mt-1">Click "Scan Workspace for Research Gaps" to analyze your uploaded papers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gaps.map((gap) => {
              const badge = categoryBadges[gap.category] || { label: gap.category, color: 'bg-[#F7F4ED] text-[#2D372E] border-[#E2DED4]' };
              return (
                <div key={gap.id} className="p-5 bg-white rounded-2xl border border-[#E2DED4] space-y-4 hover:border-[#C7D3C0] transition flex flex-col justify-between glass-card-hover">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#2D372E]">{gap.title}</h4>
                    <p className="text-xs text-[#4A554C] leading-relaxed">{gap.description}</p>

                    {/* Evidence Quotes */}
                    {gap.evidence && gap.evidence.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-1">
                        <span className="text-[10px] font-bold text-[#6E5528] uppercase tracking-wider">Supporting Paper Quote:</span>
                        <p className="text-[11px] text-[#4A554C] italic">
                          "{gap.evidence[0].evidence_text}" — <span className="text-[#2D372E] font-semibold">{gap.evidence[0].paper_title}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleGenerateQuestion(gap)}
                    disabled={generatingQuestionId === gap.id}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#F7F4ED] hover:bg-[#E8EFE5] text-xs font-semibold text-[#3D4A39] border border-[#E2DED4] hover:border-[#C7D3C0] transition"
                  >
                    {generatingQuestionId === gap.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8FA28A]" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5 text-[#C8A96B]" />
                    )}
                    Generate Research Proposal Question
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generated Research Questions */}
      {questions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#E2DED4]">
          <h3 className="text-sm font-bold text-[#2D372E] uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#C8A96B]" />
            Generated Actionable Research Questions ({questions.length})
          </h3>

          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="p-5 bg-white rounded-2xl border border-[#C7D3C0] space-y-3 shadow-xs">
                <h4 className="text-sm font-bold text-[#2D372E] flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-[#8FA28A] flex-shrink-0 mt-0.5" />
                  {q.question}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#F7F4ED]">
                  <div>
                    <strong className="text-[#2D372E] block mb-1">Motivation & Value:</strong>
                    <p className="text-[#4A554C]">{q.motivation}</p>
                  </div>
                  <div>
                    <strong className="text-[#2D372E] block mb-1">Proposed Methodology:</strong>
                    <p className="text-[#4A554C]">{q.proposed_methodology}</p>
                  </div>
                  <div>
                    <strong className="text-[#2D372E] block mb-1">Dataset & Metrics:</strong>
                    <p className="text-[#4A554C] font-mono text-[11px]">
                      Dataset: {q.dataset}<br />
                      Metrics: {q.evaluation_metrics}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
