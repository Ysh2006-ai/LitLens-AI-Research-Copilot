from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, ResearchGap, ResearchQuestion
from app.schemas.schemas import ResearchGapResponse, ResearchQuestionResponse
from app.services.research_gap_service import discover_research_gaps, generate_questions_from_gaps

router = APIRouter(prefix="/gaps", tags=["Research Gaps & Questions"])

@router.get("/discover", response_model=List[ResearchGapResponse])
def discover_gaps(workspace_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    gaps_data = discover_research_gaps(db, workspace_id)
    saved_gaps = []

    for g in gaps_data:
        gap_obj = ResearchGap(
            workspace_id=workspace_id,
            title=g["title"],
            description=g["description"],
            category=g["category"],
            supporting_paper_ids=g.get("supporting_paper_ids", []),
            evidence_json=g.get("evidence_quotes", [])
        )
        db.add(gap_obj)
        db.commit()
        db.refresh(gap_obj)

        saved_gaps.append({
            "id": gap_obj.id,
            "workspace_id": gap_obj.workspace_id,
            "title": gap_obj.title,
            "description": gap_obj.description,
            "category": gap_obj.category,
            "supporting_paper_ids": gap_obj.supporting_paper_ids,
            "evidence": gap_obj.evidence_json or [],
            "created_at": gap_obj.created_at
        })

    return saved_gaps

@router.post("/generate-question", response_model=ResearchQuestionResponse)
def generate_question(workspace_id: str, gap_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    gap = db.query(ResearchGap).filter(ResearchGap.id == gap_id, ResearchGap.workspace_id == workspace_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Gap not found.")

    q_data = generate_questions_from_gaps(db, workspace_id, gap.title, gap.description, gap.supporting_paper_ids)

    q_obj = ResearchQuestion(
        workspace_id=workspace_id,
        gap_id=gap.id,
        question=q_data["question"],
        motivation=q_data["motivation"],
        proposed_methodology=q_data["proposed_methodology"],
        dataset=q_data["dataset"],
        evaluation_metrics=q_data["evaluation_metrics"],
        supporting_paper_ids=gap.supporting_paper_ids
    )
    db.add(q_obj)
    db.commit()
    db.refresh(q_obj)

    return q_obj
