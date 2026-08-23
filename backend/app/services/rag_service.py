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
    top_k: int = 8
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
    Strictly prevents hallucination and formats citations with paper_id, page_number, section_title, exact_quote.
    """
    if not retrieved_chunks:
        return {
            "answer": "Insufficient evidence found in the workspace papers to answer your query. Please upload relevant research papers or broaden your search prompt.",
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
    You are LitLens, an evidence-grounded AI Research Assistant.
    Your absolute top priority is ACCURACY, EVIDENCE GROUNDING, and ZERO HALLUCINATION.

    CRITICAL RULES FOR ZERO HALLUCINATION:
    1. Base every single assertion STRICTLY and EXCLUSIVELY on the provided RETRIEVED EVIDENCE SOURCES.
    2. NEVER extrapolate, guess, or invent numbers, formulas, datasets, performance metrics, or author claims not explicitly present in the sources.
    3. If the provided sources do NOT contain sufficient information to answer the query, clearly state: "The uploaded paper(s) do not contain sufficient evidence to answer this question." Do not attempt to guess an answer.
    4. Provide a clear, direct, professional Markdown explanation.
    """

    user_prompt = f"""
    RESEARCHER QUERY: {query}

    RETRIEVED PAPER SOURCES:
    {formatted_context}

    Respond ONLY in valid JSON matching this exact structure:
    {{
        "answer": "Clean, direct Markdown response explaining the answer based on paper evidence.",
        "citations": []
    }}
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
                    temperature=0.0
                )
            )
            import json
            res_data = json.loads(response.text)
            raw_citations = res_data.get("citations", [])
            
            processed_citations = []
            seen_sources = set()

            for item in raw_citations:
                s_idx = item.get("source_index")
                quote = item.get("exact_quote", "").strip()
                if isinstance(s_idx, int) and 1 <= s_idx <= len(retrieved_chunks):
                    if s_idx in seen_sources:
                        continue
                    seen_sources.add(s_idx)
                    chunk = retrieved_chunks[s_idx - 1]
                    
                    # If quote is empty, use the first 180 chars of the chunk
                    if not quote:
                        quote = chunk["content"][:180] + "..."

                    processed_citations.append({
                        "paper_id": chunk["paper_id"],
                        "paper_title": chunk["paper_title"],
                        "page_number": chunk["page_number"],
                        "section_title": chunk["section_title"],
                        "evidence_text": quote
                    })

            # If model cited inline sources in answer text but omitted citations array, fallback gracefully
            if not processed_citations and "[Source" in res_data.get("answer", ""):
                for idx, chunk in enumerate(retrieved_chunks[:3], 1):
                    if f"[Source {idx}]" in res_data.get("answer", ""):
                        processed_citations.append({
                            "paper_id": chunk["paper_id"],
                            "paper_title": chunk["paper_title"],
                            "page_number": chunk["page_number"],
                            "section_title": chunk["section_title"],
                            "evidence_text": chunk["content"][:180] + "..."
                        })

            return {
                "answer": res_data.get("answer", "No answer generated."),
                "citations": processed_citations
            }
        except Exception as e:
            print(f"Error in Gemini grounded answer generation: {e}")

    # Heuristic fallback if LLM key is absent or call fails
    citations = []
    for c in retrieved_chunks[:2]:
        citations.append({
            "paper_id": c["paper_id"],
            "paper_title": c["paper_title"],
            "page_number": c["page_number"],
            "section_title": c["section_title"],
            "evidence_text": c["content"][:180] + "..."
        })

    return {
        "answer": f"Based on retrieved evidence from **{retrieved_chunks[0]['paper_title']}** (Page {retrieved_chunks[0]['page_number']}), the paper states: \"{retrieved_chunks[0]['content'][:250]}...\"",
        "citations": citations
    }
