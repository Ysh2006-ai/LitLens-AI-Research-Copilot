import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, Paper, PaperChunk, PaperAnalysis
from app.schemas.schemas import PaperResponse
from app.services.pdf_service import extract_pdf_data, create_semantic_chunks
from app.services.embedding_service import generate_batch_embeddings
from app.services.paper_intelligence_service import analyze_paper_content

router = APIRouter(prefix="/papers", tags=["Papers"])

def build_pdf_url(paper_id: str) -> str:
    backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
    if backend_url:
        return f"{backend_url}{settings.API_V1_STR}/papers/{paper_id}/pdf"
    return f"{settings.API_V1_STR}/papers/{paper_id}/pdf"

@router.get("/{paper_id}/pdf")
def get_paper_pdf(paper_id: str, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper record not found.")

    # Auto-generate or restore PDF if file missing on disk (e.g. serverless environment or restart)
    if not paper.pdf_path or not os.path.exists(paper.pdf_path):
        paper_dir = os.path.join(settings.UPLOAD_DIR, paper.workspace_id)
        os.makedirs(paper_dir, exist_ok=True)
        pdf_file_path = os.path.join(paper_dir, f"{paper.id}.pdf")
        
        try:
            import fitz
            doc = fitz.open()
            page = doc.new_page()
            header_text = f"Title: {paper.title}\nAuthors: {paper.authors or 'Unknown'}\nVenue/Year: {paper.venue or ''} ({paper.publication_year or ''})\n\nABSTRACT:\n{paper.abstract or 'No abstract provided.'}\n\n"
            
            chunks = db.query(PaperChunk).filter(PaperChunk.paper_id == paper.id).order_by(PaperChunk.chunk_index).all()
            if chunks:
                header_text += "\n--- EXTRACTED PAPER CONTENT ---\n\n" + "\n\n".join([f"[Page {c.page_number} - {c.section_title}]\n{c.content}" for c in chunks])
                
            page.insert_text((50, 50), header_text[:2000])
            remaining = header_text[2000:]
            while remaining:
                p = doc.new_page()
                p.insert_text((50, 50), remaining[:2000])
                remaining = remaining[2000:]
                
            doc.save(pdf_file_path)
            doc.close()
            
            paper.pdf_path = pdf_file_path
            db.commit()
        except Exception as e:
            print(f"Error auto-generating PDF fallback: {e}")
            raise HTTPException(status_code=404, detail="PDF file not found and could not be generated.")

    return FileResponse(
        paper.pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{paper.file_name or "paper.pdf"}"'}
    )

@router.post("/upload", response_model=PaperResponse)
async def upload_paper(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_name = file.filename
    paper_dir = os.path.join(settings.UPLOAD_DIR, workspace_id)
    os.makedirs(paper_dir, exist_ok=True)
    file_path = os.path.join(paper_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 1. Parse PDF text & structure
    pdf_info = extract_pdf_data(file_path)

    # Create Paper record
    paper = Paper(
        workspace_id=workspace_id,
        title=pdf_info["title"],
        authors=pdf_info["authors"],
        file_name=file_name,
        pdf_path=file_path,
        status="processing",
        metadata_json=pdf_info["metadata"]
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    # 2. Chunking & Embeddings
    raw_chunks = pdf_info["chunks"]
    semantic_chunks = create_semantic_chunks(raw_chunks)

    chunk_texts = [c["content"] for c in semantic_chunks]
    embeddings = generate_batch_embeddings(chunk_texts)

    for idx, c in enumerate(semantic_chunks):
        chunk_obj = PaperChunk(
            paper_id=paper.id,
            workspace_id=workspace_id,
            chunk_index=c["chunk_index"],
            content=c["content"],
            page_number=c["page_number"],
            section_title=c["section_title"],
            embedding=embeddings[idx]
        )
        db.add(chunk_obj)

    # 3. Automatic Paper Intelligence
    intelligence_data = analyze_paper_content(
        title=paper.title,
        abstract=pdf_info["metadata"].get("subject", "") or paper.title,
        full_text_sample=pdf_info["full_text"][:4000]
    )

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

    paper.status = "processed"
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
        "pdf_url": build_pdf_url(paper.id),
        "status": paper.status,
        "created_at": paper.created_at,
        "analysis": analysis_obj
    }

@router.get("", response_model=List[PaperResponse])
def list_papers(workspace_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    papers = db.query(Paper).filter(Paper.workspace_id == workspace_id).order_by(Paper.created_at.desc()).all()
    res = []
    for p in papers:
        res.append({
            "id": p.id,
            "workspace_id": p.workspace_id,
            "title": p.title,
            "authors": p.authors,
            "publication_year": p.publication_year,
            "venue": p.venue,
            "abstract": p.abstract,
            "file_name": p.file_name,
            "pdf_url": build_pdf_url(p.id),
            "status": p.status,
            "created_at": p.created_at,
            "analysis": p.analysis
        })
    return res

@router.get("/{paper_id}", response_model=PaperResponse)
def get_paper(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(Paper).join(Workspace).filter(Paper.id == paper_id, Workspace.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return {
        "id": paper.id,
        "workspace_id": paper.workspace_id,
        "title": paper.title,
        "authors": paper.authors,
        "publication_year": paper.publication_year,
        "venue": paper.venue,
        "abstract": paper.abstract,
        "file_name": paper.file_name,
        "pdf_url": build_pdf_url(paper.id),
        "status": paper.status,
        "created_at": paper.created_at,
        "analysis": paper.analysis
    }

@router.get("/{paper_id}/pdf")
def get_paper_pdf(paper_id: str, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper or not os.path.exists(paper.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")
    
    # Use Content-Disposition: inline so the browser renders PDF in-place without triggering auto-download
    return FileResponse(
        paper.pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{paper.file_name}"'}
    )

@router.post("/{paper_id}/reindex")
def reindex_paper(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(Paper).join(Workspace).filter(Paper.id == paper_id, Workspace.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if not os.path.exists(paper.pdf_path):
        raise HTTPException(status_code=400, detail="PDF file no longer exists on server.")

    # Re-extract and re-chunk with corrected page tracking
    pdf_info = extract_pdf_data(paper.pdf_path)
    semantic_chunks = create_semantic_chunks(pdf_info["chunks"])
    chunk_texts = [c["content"] for c in semantic_chunks]
    embeddings = generate_batch_embeddings(chunk_texts)

    # Remove existing chunks for this paper
    db.query(PaperChunk).filter(PaperChunk.paper_id == paper.id).delete()
    db.commit()

    for idx, c in enumerate(semantic_chunks):
        chunk_obj = PaperChunk(
            paper_id=paper.id,
            workspace_id=paper.workspace_id,
            chunk_index=c["chunk_index"],
            content=c["content"],
            page_number=c["page_number"],
            section_title=c["section_title"],
            embedding=embeddings[idx]
        )
        db.add(chunk_obj)

    db.commit()
    return {"message": f"Successfully re-indexed '{paper.title}' with {len(semantic_chunks)} accurate chunks."}

@router.delete("/{paper_id}")
def delete_paper(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(Paper).join(Workspace).filter(Paper.id == paper_id, Workspace.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    
    if os.path.exists(paper.pdf_path):
        try:
            os.remove(paper.pdf_path)
        except Exception:
            pass

    db.delete(paper)
    db.commit()
    return {"message": "Paper deleted successfully."}
