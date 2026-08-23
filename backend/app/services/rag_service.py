from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from google import genai
from google.genai import types

from app.core.config import settings
from app.models import PaperChunk, Paper
from app.services.embedding_service import generate_embedding

def retrieve_relevant_chunks(
    db: Session,
    workspace_id: str,
    query: str,
    paper_ids: Optional[List[str]] = None,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Retrieves the top_k most relevant paper chunks using pgvector vector similarity search.
    """
    query_vector = generate_embedding(query)

    # Convert python float list to pgvector string format '[v1, v2, ...]'
    vec_str = f"[{','.join(str(x) for x in query_vector)}]"

    paper_filter_sql = ""
    if paper_ids and len(paper_ids) > 0:
        paper_list_str = "'" + "','".join(paper_ids) + "'"
        paper_filter_sql = f"AND c.paper_id IN ({paper_list_str})"

    sql = text(f"""
        SELECT 
            c.id, c.paper_id, c.content, c.page_number, c.section_title,
            p.title as paper_title,
            (1 - (c.embedding <=> '{vec_str}'::vector)) as similarity
        FROM paper_chunks c
        JOIN papers p ON c.paper_id = p.id
        WHERE c.workspace_id = :workspace_id {paper_filter_sql}
        ORDER BY c.embedding <=> '{vec_str}'::vector ASC
        LIMIT :top_k
    """)

    results = db.execute(sql, {"workspace_id": workspace_id, "top_k": top_k}).fetchall()

    retrieved = []
    for r in results:
        retrieved.append({
            "chunk_id": r.id,
            "paper_id": r.paper_id,
            "paper_title": r.paper_title,
            "page_number": r.page_number,
            "section_title": r.section_title or "Main Text",
            "content": r.content,
            "similarity": float(r.similarity) if r.similarity else 0.0
        })

    return retrieved

def generate_grounded_answer(
    query: str,
    retrieved_chunks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates an evidence-grounded answer using Gemini LLM.
    Strictly prevents hallucination and formats citations with paper_id, page_number, section_title, evidence_text.
    """
    if not retrieved_chunks:
        return {
            "answer": "Insufficient evidence found in the workspace papers to answer your query. Please upload relevant papers or broaden your prompt.",
            "citations": []
        }

    context_blocks = []
    for idx, c in enumerate(retrieved_chunks, 1):
        context_blocks.append(
            f"[Source {idx}] Paper: \"{c['paper_title']}\" (Paper ID: {c['paper_id']}), Page: {c['page_number']}, Section: {c['section_title']}\n"
            f"Content: \"{c['content']}\""
        )
    
    formatted_context = "\n\n".join(context_blocks)

    system_prompt = """
    You are LitLens, a world-class AI Research Assistant.
    Your task is to answer the researcher's query STRICTLY based on the provided source contexts.

    CRITICAL RULES:
    1. Ground every factual claim directly in the provided sources.
    2. NEVER invent citations, numbers, or details not present in the sources.
    3. If the provided sources do NOT contain enough information to fully answer, state clearly what is known and state that evidence is insufficient for the rest.
    4. For every claim, indicate which source numbers [Source X] support it.

    In addition to your written response, provide a clean JSON array of citations that were directly used.
    """

    user_prompt = f"""
    QUERY: {query}

    RETRIEVED EVIDENCE SOURCES:
    {formatted_context}

    Respond in JSON with two keys:
    - "answer": Markdown formatted explanation with inline source brackets e.g. [Source 1]
    - "used_source_indices": Array of integer source numbers used (e.g. [1, 3])
    """

    client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

    if client:
        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            import json
            res_data = json.loads(response.text)
            used_indices = res_data.get("used_source_indices", list(range(1, len(retrieved_chunks) + 1)))
            
            citations = []
            for idx in used_indices:
                if 1 <= idx <= len(retrieved_chunks):
                    chunk = retrieved_chunks[idx - 1]
                    citations.append({
                        "paper_id": chunk["paper_id"],
                        "paper_title": chunk["paper_title"],
                        "page_number": chunk["page_number"],
                        "section_title": chunk["section_title"],
                        "evidence_text": chunk["content"][:200] + "..."
                    })

            return {
                "answer": res_data.get("answer", "No answer generated."),
                "citations": citations
            }
        except Exception as e:
            print(f"Error in Gemini grounded answer generation: {e}")

    # Heuristic fallback if LLM key is absent
    citations = []
    for c in retrieved_chunks[:2]:
        citations.append({
            "paper_id": c["paper_id"],
            "paper_title": c["paper_title"],
            "page_number": c["page_number"],
            "section_title": c["section_title"],
            "evidence_text": c["content"][:200] + "..."
        })

    return {
        "answer": f"Based on retrieved evidence from **{retrieved_chunks[0]['paper_title']}** (Page {retrieved_chunks[0]['page_number']}), the paper discusses: {retrieved_chunks[0]['content'][:300]}...",
        "citations": citations
    }
