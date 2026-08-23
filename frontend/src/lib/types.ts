export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  paper_count?: number;
}

export interface PaperAnalysis {
  id: string;
  paper_id: string;
  research_problem?: string;
  motivation?: string;
  methodology?: string;
  key_contributions?: string[];
  dataset?: string;
  results?: string;
  limitations?: string;
  future_work?: string;
  key_takeaways?: string[];
  glance_summary?: string;
}

export interface Paper {
  id: string;
  workspace_id: string;
  title: string;
  authors?: string;
  publication_year?: number;
  venue?: string;
  abstract?: string;
  file_name: string;
  pdf_url: string;
  status: string;
  created_at: string;
  analysis?: PaperAnalysis;
}

export interface CitationItem {
  paper_id: string;
  paper_title: string;
  page_number: number;
  section_title?: string;
  evidence_text: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationItem[];
  created_at: string;
}

export interface AgentResponse {
  response: string;
  tools_used: string[];
  citations: CitationItem[];
}

export interface PaperComparisonRow {
  paper_id: string;
  paper_title: string;
  problem: string;
  methodology: string;
  dataset: string;
  metrics_results: string;
  strengths: string;
  limitations: string;
}

export interface MultiPaperCompareResponse {
  rows: PaperComparisonRow[];
  cross_paper_synthesis: string;
}

export interface ResearchGap {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  category: 'recurring_limitation' | 'contradiction' | 'underexplored' | 'methodological' | 'dataset';
  supporting_paper_ids: string[];
  evidence: CitationItem[];
  created_at: string;
}

export interface ResearchQuestion {
  id: string;
  workspace_id: string;
  gap_id?: string;
  question: string;
  motivation: string;
  proposed_methodology: string;
  dataset: string;
  evaluation_metrics: string;
  supporting_paper_ids?: string[];
  created_at: string;
}

export interface LiteratureReview {
  id: string;
  workspace_id: string;
  title: string;
  content_markdown: string;
  themes: { theme_name: string; paper_count: number }[];
  cited_paper_ids: string[];
  created_at: string;
}

export interface AcademicSearchResult {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  pdf_url?: string;
  citation_count?: number;
  source: string;
}
