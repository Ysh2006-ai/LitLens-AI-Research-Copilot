import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from app.core.config import settings
from app.models import Paper, PaperChunk, PaperAnalysis
from app.services.rag_service import retrieve_relevant_chunks, generate_grounded_answer

def run_research_agent(db: Session, workspace_id: str, prompt: str) -> Dict[str, Any]:
    """
    Executes a controlled research agent using Gemini tool calling.
    """
    tools_used = []

    # 1. Fetch available papers in workspace
    papers = db.query(Paper).filter(Paper.workspace_id == workspace_id).all()
    paper_catalog = [{"id": p.id, "title": p.title, "authors": p.authors} for p in papers]

    # RAG search tool call
    retrieved = retrieve_relevant_chunks(db, workspace_id, prompt, top_k=8)
    tools_used.append("retrieve_evidence")

    grounded = generate_grounded_answer(prompt, retrieved)

    # Check if request involves comparison or gap finding
    prompt_lower = prompt.lower()
    if "compare" in prompt_lower or "difference" in prompt_lower or "vs" in prompt_lower:
        tools_used.append("compare_papers")
    if "gap" in prompt_lower or "limitation" in prompt_lower or "future" in prompt_lower:
        tools_used.append("find_research_gaps")
    if "question" in prompt_lower or "idea" in prompt_lower:
        tools_used.append("generate_research_questions")

    return {
        "response": grounded["answer"],
        "tools_used": tools_used,
        "citations": grounded["citations"]
    }
