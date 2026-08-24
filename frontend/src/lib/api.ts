import {
  User, Workspace, Paper, ChatMessage, AgentResponse, MultiPaperCompareResponse,
  ResearchGap, ResearchQuestion, LiteratureReview, AcademicSearchResult
} from './types';

const getApiBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url += '/api/v1';
  }
  return url;
};

const API_BASE = getApiBaseUrl();

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('litlens_token') : null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('litlens_token', token);
    else localStorage.removeItem('litlens_token');
  }
};

const getHeaders = (isJson = true) => {
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
};

export const api = {
  // Auth
  register: async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  // Workspaces / Projects
  listWorkspaces: async (): Promise<Workspace[]> => {
    const res = await fetch(`${API_BASE}/workspaces`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  createWorkspace: async (name: string, description?: string): Promise<Workspace> => {
    const res = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create workspace');
    return res.json();
  },

  deleteWorkspace: async (workspaceId: string) => {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete workspace');
    return res.json();
  },

  // Papers
  listPapers: async (workspaceId: string): Promise<Paper[]> => {
    const res = await fetch(`${API_BASE}/papers?workspace_id=${workspaceId}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  uploadPaper: async (workspaceId: string, file: File): Promise<Paper> => {
    const formData = new FormData();
    formData.append('workspace_id', workspaceId);
    formData.append('file', file);

    const headers = getHeaders(false);
    const res = await fetch(`${API_BASE}/papers/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Paper upload failed');
    return res.json();
  },

  deletePaper: async (paperId: string) => {
    const res = await fetch(`${API_BASE}/papers/${paperId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete paper');
    return res.json();
  },

  // Chat & RAG
  queryChat: async (workspaceId: string, message: string, paperIds?: string[], conversationId?: string): Promise<ChatMessage> => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        workspace_id: workspaceId,
        message,
        paper_ids: paperIds,
        conversation_id: conversationId
      })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  // Agent
  queryAgent: async (workspaceId: string, userPrompt: string): Promise<AgentResponse> => {
    const res = await fetch(`${API_BASE}/agent/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workspace_id: workspaceId, user_prompt: userPrompt })
    });
    if (!res.ok) throw new Error('Agent execution failed');
    return res.json();
  },

  // Comparison
  comparePapers: async (workspaceId: string, paperIds: string[]): Promise<MultiPaperCompareResponse> => {
    const res = await fetch(`${API_BASE}/comparison`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workspace_id: workspaceId, paper_ids: paperIds })
    });
    if (!res.ok) throw new Error('Failed to compare papers');
    return res.json();
  },

  // Gaps & Questions
  discoverGaps: async (workspaceId: string): Promise<ResearchGap[]> => {
    const res = await fetch(`${API_BASE}/gaps/discover?workspace_id=${workspaceId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to discover research gaps');
    return res.json();
  },

  generateQuestion: async (workspaceId: string, gapId: string): Promise<ResearchQuestion> => {
    const res = await fetch(`${API_BASE}/gaps/generate-question?workspace_id=${workspaceId}&gap_id=${gapId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate research question');
    return res.json();
  },

  // Literature Review
  createLiteratureReview: async (workspaceId: string, paperIds: string[], topic?: string): Promise<LiteratureReview> => {
    const res = await fetch(`${API_BASE}/literature-review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workspace_id: workspaceId, paper_ids: paperIds, topic })
    });
    if (!res.ok) throw new Error('Failed to generate literature review');
    return res.json();
  },

  // Academic Search
  searchAcademic: async (query: string): Promise<AcademicSearchResult[]> => {
    const res = await fetch(`${API_BASE}/academic-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  },

  importAcademicPaper: async (workspaceId: string, paper: AcademicSearchResult): Promise<Paper> => {
    const res = await fetch(`${API_BASE}/academic-search/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workspace_id: workspaceId, paper })
    });
    if (!res.ok) throw new Error('Failed to import paper');
    return res.json();
  }
};
