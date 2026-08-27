import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.llm import generate_llm_content, parse_json_from_llm
from app.models import Paper, PaperChunk, PaperAnalysis
from app.services.paper_intelligence_service import analyze_paper_content

OLD_FALLBACK_MARKERS = [
    "Proposed novel algorithmic approach described in section 3",
    "Standard domain benchmarks and curated dataset",
    "Achieves state-of-the-art results compared to strong baseline models",
    "High computational resources for training"
]

def is_generic_analysis(analysis: PaperAnalysis) -> bool:
    if not analysis:
        return True
    text_to_check = f"{analysis.methodology} {analysis.dataset} {analysis.results} {analysis.limitations}"
    return any(marker in text_to_check for marker in OLD_FALLBACK_MARKERS)

def get_paper_full_text(db: Session, paper_id: str) -> str:
    chunks = db.query(PaperChunk).filter(PaperChunk.paper_id == paper_id).order_by(PaperChunk.chunk_index).limit(10).all()
    if not chunks:
        return ""
    return "\n\n".join([c.content for c in chunks])

def compare_workspace_papers(db: Session, workspace_id: str, paper_ids: List[str]) -> Dict[str, Any]:
    """
    Generates a structured side-by-side comparison matrix and cross-paper synthesis across selected papers.
    Dynamically upgrades old generic fallback data to accurate paper-specific extractions.
    """
    papers = db.query(Paper).filter(Paper.id.in_(paper_ids), Paper.workspace_id == workspace_id).all()
    if not papers:
        return {"rows": [], "cross_paper_synthesis": "No papers found for comparison."}

    paper_contexts = []
    comparison_rows = []

    for p in papers:
        # 1. Upgrade paper analysis if missing or using old generic placeholder strings
        analysis = p.analysis
        if is_generic_analysis(analysis):
            full_text_sample = get_paper_full_text(db, p.id)
            fresh_intelligence = analyze_paper_content(
                title=p.title,
                abstract=p.abstract or "",
                full_text_sample=full_text_sample
            )
            
            if not analysis:
                analysis = PaperAnalysis(
                    paper_id=p.id,
                    research_problem=fresh_intelligence.get("research_problem"),
                    motivation=fresh_intelligence.get("motivation"),
                    methodology=fresh_intelligence.get("methodology"),
                    key_contributions=fresh_intelligence.get("key_contributions"),
                    dataset=fresh_intelligence.get("dataset"),
                    results=fresh_intelligence.get("results"),
                    limitations=fresh_intelligence.get("limitations"),
                    future_work=fresh_intelligence.get("future_work"),
                    key_takeaways=fresh_intelligence.get("key_takeaways"),
                    glance_summary=fresh_intelligence.get("glance_summary")
                )
                db.add(analysis)
            else:
                analysis.research_problem = fresh_intelligence.get("research_problem")
                analysis.motivation = fresh_intelligence.get("motivation")
                analysis.methodology = fresh_intelligence.get("methodology")
                analysis.key_contributions = fresh_intelligence.get("key_contributions")
                analysis.dataset = fresh_intelligence.get("dataset")
                analysis.results = fresh_intelligence.get("results")
                analysis.limitations = fresh_intelligence.get("limitations")
                analysis.future_work = fresh_intelligence.get("future_work")
                analysis.key_takeaways = fresh_intelligence.get("key_takeaways")
                analysis.glance_summary = fresh_intelligence.get("glance_summary")
            
            try:
                db.commit()
                db.refresh(analysis)
            except Exception as e:
                print(f"Error persisting upgraded paper analysis: {e}")
                db.rollback()

        # Build row data
        strengths = ", ".join(analysis.key_contributions[:2]) if (analysis and analysis.key_contributions) else "Empirical validation & novel formulation"
        row = {
            "paper_id": p.id,
            "paper_title": p.title,
            "problem": analysis.research_problem if analysis else (p.abstract[:120] + "..." if p.abstract else "Not specified"),
            "methodology": analysis.methodology if analysis else "Custom technical approach",
            "dataset": analysis.dataset if analysis else "Domain evaluation benchmarks",
            "metrics_results": analysis.results if analysis else "Empirical performance gains",
            "strengths": strengths,
            "limitations": analysis.limitations if analysis else "Scope and deployment constraints"
        }
        comparison_rows.append(row)

        paper_contexts.append(
            f"Paper Title: \"{p.title}\"\n"
            f"Problem: {row['problem']}\n"
            f"Methodology: {row['methodology']}\n"
            f"Dataset: {row['dataset']}\n"
            f"Results: {row['metrics_results']}\n"
            f"Strengths: {row['strengths']}\n"
            f"Limitations: {row['limitations']}\n"
        )

    # 2. Try Gemini LLM for structured comparison synthesis
    prompt = f"""
    You are LitLens AI Research Assistant. Compare the following {len(papers)} research papers and generate:
    1. Cleaned, highly distinct comparison matrix rows for each paper.
    2. An executive CROSS-PAPER SYNTHESIS in Markdown.

    SELECTED PAPERS OVERVIEW:
    {"\n---\n".join(paper_contexts)}

    Return ONLY a JSON object matching this schema:
    {{
        "rows": [
            {{
                "paper_id": "...",
                "paper_title": "...",
                "problem": "...",
                "methodology": "...",
                "dataset": "...",
                "metrics_results": "...",
                "strengths": "...",
                "limitations": "..."
            }}
        ],
        "cross_paper_synthesis": "### Cross-Paper Synthesis\\n\\nDetailed Markdown synthesis comparing methodological differences, dataset trade-offs, empirical outcomes, and key recommendations."
    }}
    """

    raw_res = generate_llm_content(prompt=prompt, json_output=True, temperature=0.2)
    if raw_res:
        parsed = parse_json_from_llm(raw_res)
        if parsed and isinstance(parsed, dict) and "rows" in parsed and "cross_paper_synthesis" in parsed:
            return parsed

    # 3. Dynamic synthesis fallback (without generic hardcoded template)
    paper_summaries_md = []
    for r in comparison_rows:
        paper_summaries_md.append(
            f"- **{r['paper_title']}**:\n"
            f"  - *Methodology*: {r['methodology']}\n"
            f"  - *Dataset*: {r['dataset']}\n"
            f"  - *Key Results*: {r['metrics_results']}\n"
            f"  - *Limitations*: {r['limitations']}"
        )

    synthesis_md = (
        f"### Cross-Paper Synthesis ({len(papers)} Papers Analyzed)\n\n"
        f"A comparative breakdown across the selected research papers reveals key architectural and empirical distinctions:\n\n"
        f"{'\n\n'.join(paper_summaries_md)}\n\n"
        f"#### Key Methodological Takeaways:\n"
        f"1. **Architectural Trade-offs**: The papers evaluate different trade-offs between model complexity, dataset requirements, and empirical performance.\n"
        f"2. **Evaluation Scope**: Differences exist in benchmarks, ranging from {comparison_rows[0]['dataset'][:60]} to specialized evaluation suites.\n"
        f"3. **Practical Considerations**: Researchers should weigh the computational requirements against accuracy gains when selecting these models."
    )

    return {
        "rows": comparison_rows,
        "cross_paper_synthesis": synthesis_md
    }
