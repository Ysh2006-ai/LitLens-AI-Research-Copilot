from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import httpx, os, shutil
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, Paper
from app.schemas.schemas import AcademicSearchResult, PaperResponse
from app.services.academic_search_service import search_academic_papers
from app.services.pdf_service import extract_pdf_data, create_semantic_chunks
from app.services.embedding_service import generate_batch_embeddings
from app.services.paper_intelligence_service import analyze_paper_content

router = APIRouter(prefix="/academic-search", tags=["Academic Search"])

class ImportPaperRequest(BaseModel):
    workspace_id: str
    paper: AcademicSearchResult

@router.get("", response_model=List[AcademicSearchResult])
async def search_papers_api(q: str, limit: int = 10):
    if not q or len(q.strip()) < 2:
        return []
    results = await search_academic_papers(q, limit)
    return results

@router.post("/import", response_model=PaperResponse)
async def import_academic_paper(req: ImportPaperRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    paper_data = req.paper
    paper_dir = os.path.join(settings.UPLOAD_DIR, req.workspace_id)
    os.makedirs(paper_dir, exist_ok=True)
    file_name = f"{paper_data.id}.pdf"
    file_path = os.path.join(paper_dir, file_name)

    # Download PDF if available, otherwise write fallback text PDF summary
    pdf_downloaded = False
    if paper_data.pdf_url:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(paper_data.pdf_url)
                if res.status_code == 200 and len(res.content) > 1000:
                    with open(file_path, "wb") as f:
                        f.write(res.content)
                    pdf_downloaded = True
        except Exception as e:
            print(f"Error downloading PDF from url {paper_data.pdf_url}: {e}")

    if not pdf_downloaded:
        # Create a clean synthetic PDF using PyMuPDF doc writer for abstract preview
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), f"Title: {paper_data.title}\n\nAuthors: {', '.join(paper_data.authors)}\n\nVenue: {paper_data.venue} ({paper_data.year})\n\nAbstract:\n{paper_data.abstract or 'No abstract provided.'}")
        doc.save(file_path)

    # Extract & Chunk
    pdf_info = extract_pdf_data(file_path)
    paper = Paper(
        workspace_id=req.workspace_id,
        title=paper_data.title,
        authors=", ".join(paper_data.authors),
        publication_year=paper_data.year,
        venue=paper_data.venue,
        abstract=paper_data.abstract or pdf_info["full_text"][:500],
        file_name=file_name,
        pdf_path=file_path,
        status="processed"
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    # Chunking & Embeddings
    semantic_chunks = create_semantic_chunks(pdf_info["chunks"])
    chunk_texts = [c["content"] for c in semantic_chunks]
    embeddings = generate_batch_embeddings(chunk_texts)

    from app.models import PaperChunk, PaperAnalysis
    for idx, c in enumerate(semantic_chunks):
        chunk_obj = PaperChunk(
            paper_id=paper.id,
            workspace_id=req.workspace_id,
            chunk_index=c["chunk_index"],
            content=c["content"],
            page_number=c["page_number"],
            section_title=c["section_title"],
            embedding=embeddings[idx]
        )
        db.add(chunk_obj)

    # Intelligence
    intelligence_data = analyze_paper_content(paper.title, paper.abstract or "", pdf_info["full_text"][:4000])
    analysis_obj = PaperAnalysis(
        paper_id=paper.id,
        research_problem=intelligence_data.get("research_problem"),
        motivation=intelligence_data.get("motivation"),
        methodology=intelligence_data.get("methodology"),
        key_contributions=intelligence_data.get("key_contributions"),
        dataset=intelligence_data.get("dataset"),
        results=intelligence_data.get("results"),
        limitations=intelligence_data.get("limitations"),
        future_work=intelligence_data.get("future_work"),
        key_takeaways=intelligence_data.get("key_takeaways"),
        glance_summary=intelligence_data.get("glance_summary")
    )
    db.add(analysis_obj)
    db.commit()
    db.refresh(paper)

    return {
        "id": paper.id,
        "workspace_id": paper.workspace_id,
        "title": paper.title,
        "authors": paper.authors,
        "publication_year": paper.publication_year,
        "venue": paper.venue,
        "abstract": paper.abstract,
        "file_name": paper.file_name,
        "pdf_url": f"{settings.API_V1_STR}/papers/{paper.id}/pdf",
        "status": paper.status,
        "created_at": paper.created_at,
        "analysis": analysis_obj
    }
