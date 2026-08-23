from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Workspace Schemas ---
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    paper_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Paper Schemas ---
class PaperAnalysisResponse(BaseModel):
    id: str
    paper_id: str
    research_problem: Optional[str] = None
    motivation: Optional[str] = None
    methodology: Optional[str] = None
    key_contributions: Optional[List[str]] = []
    dataset: Optional[str] = None
    results: Optional[str] = None
    limitations: Optional[str] = None
    future_work: Optional[str] = None
    key_takeaways: Optional[List[str]] = []
    glance_summary: Optional[str] = None

    class Config:
        from_attributes = True

class PaperResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    authors: Optional[str] = None
    publication_year: Optional[int] = None
    venue: Optional[str] = None
    abstract: Optional[str] = None
    file_name: str
    pdf_url: str
    status: str
    created_at: datetime
    analysis: Optional[PaperAnalysisResponse] = None

    class Config:
        from_attributes = True

# --- Chat & RAG Schemas ---
class CitationItem(BaseModel):
    paper_id: str
    paper_title: str
    page_number: int
    section_title: Optional[str] = None
    evidence_text: str

class ChatQueryRequest(BaseModel):
    workspace_id: str
    paper_ids: Optional[List[str]] = None
    conversation_id: Optional[str] = None
    message: str

class ChatMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: List[CitationItem] = []
    created_at: datetime

# --- Agent Request & Response ---
class AgentQueryRequest(BaseModel):
    workspace_id: str
    user_prompt: str

class AgentQueryResponse(BaseModel):
    response: str
    tools_used: List[str]
    citations: List[CitationItem] = []

# --- Comparison Matrix ---
class MultiPaperCompareRequest(BaseModel):
    workspace_id: str
    paper_ids: List[str]

class PaperComparisonRow(BaseModel):
    paper_id: str
    paper_title: str
    problem: str
    methodology: str
    dataset: str
    metrics_results: str
    strengths: str
    limitations: str

class MultiPaperCompareResponse(BaseModel):
    rows: List[PaperComparisonRow]
    cross_paper_synthesis: str

# --- Research Gap & Question Schemas ---
class ResearchGapResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    description: str
    category: str
    supporting_paper_ids: List[str]
    evidence: List[CitationItem] = []
    created_at: datetime

class ResearchQuestionResponse(BaseModel):
    id: str
    workspace_id: str
    gap_id: Optional[str] = None
    question: str
    motivation: str
    proposed_methodology: str
    dataset: str
    evaluation_metrics: str
    supporting_paper_ids: Optional[List[str]] = []
    created_at: datetime

# --- Literature Review ---
class GenerateReviewRequest(BaseModel):
    workspace_id: str
    paper_ids: List[str]
    topic: Optional[str] = None

class LiteratureReviewResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    content_markdown: str
    themes: List[Dict[str, Any]] = []
    cited_paper_ids: List[str]
    created_at: datetime

# --- Academic Search ---
class AcademicSearchResult(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    venue: Optional[str] = None
    abstract: Optional[str] = None
    pdf_url: Optional[str] = None
    citation_count: Optional[int] = 0
    source: str
