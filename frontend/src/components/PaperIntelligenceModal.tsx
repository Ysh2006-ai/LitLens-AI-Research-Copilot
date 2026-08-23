'use client';

import React from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, Layers, BarChart3 } from 'lucide-react';
import { Paper } from '@/lib/types';

interface PaperIntelligenceModalProps {
  paper: Paper | null;
  onClose: () => void;
}

export const PaperIntelligenceModal: React.FC<PaperIntelligenceModalProps> = ({ paper, onClose }) => {
  if (!paper) return null;
  const a = paper.analysis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E251E]/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-[#E2DED4] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F7F4ED] border-b border-[#E2DED4]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E8EFE5] text-[#3D4A39] border border-[#C7D3C0]">
              <Sparkles className="w-5 h-5 text-[#8FA28A]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D372E] line-clamp-1">{paper.title}</h2>
              <p className="text-xs text-[#7A877B]">Paper Intelligence & Automated Structural Analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A877B] hover:text-[#2D372E] hover:bg-[#EFEBE0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-[#4A554C]">
          {/* Executive Glance Summary */}
          {a?.glance_summary && (
            <div className="p-4 rounded-xl bg-[#E8EFE5] border border-[#C7D3C0]">
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-[#3D4A39] uppercase text-[10px] tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#8FA28A]" />
                Paper at a Glance
              </div>
              <p className="text-sm font-medium text-[#2D372E]">{a.glance_summary}</p>
            </div>
          )}

          {/* Grid Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Research Problem & Motivation */}
            <div className="p-4 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D372E]">
                <HelpCircle className="w-4 h-4 text-[#8FA28A]" />
                Research Problem & Motivation
              </div>
              <p><strong className="text-[#2D372E]">Problem:</strong> {a?.research_problem || "N/A"}</p>
              <p><strong className="text-[#2D372E]">Motivation:</strong> {a?.motivation || "N/A"}</p>
            </div>

            {/* Methodology */}
            <div className="p-4 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D372E]">
                <Layers className="w-4 h-4 text-[#8FA28A]" />
                Technical Methodology
              </div>
              <p className="text-[#4A554C]">{a?.methodology || "N/A"}</p>
            </div>

            {/* Dataset & Results */}
            <div className="p-4 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D372E]">
                <BarChart3 className="w-4 h-4 text-[#54664F]" />
                Datasets & Key Empirical Results
              </div>
              <p><strong className="text-[#2D372E]">Dataset:</strong> {a?.dataset || "N/A"}</p>
              <p><strong className="text-[#2D372E]">Results:</strong> {a?.results || "N/A"}</p>
            </div>

            {/* Limitations & Future Work */}
            <div className="p-4 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D372E]">
                <AlertTriangle className="w-4 h-4 text-[#C8A96B]" />
                Limitations & Future Work
              </div>
              <p><strong className="text-[#2D372E]">Limitations:</strong> {a?.limitations || "N/A"}</p>
              <p><strong className="text-[#2D372E]">Future Work:</strong> {a?.future_work || "N/A"}</p>
            </div>
          </div>

          {/* Key Contributions */}
          {a?.key_contributions && a.key_contributions.length > 0 && (
            <div className="p-4 rounded-xl bg-[#F7F4ED] border border-[#E2DED4] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D372E]">
                <CheckCircle2 className="w-4 h-4 text-[#8FA28A]" />
                Key Contributions
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#4A554C]">
                {a.key_contributions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
