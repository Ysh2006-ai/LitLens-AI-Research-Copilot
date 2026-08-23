from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, LiteratureReview
from app.schemas.schemas import GenerateReviewRequest, LiteratureReviewResponse
from app.services.literature_review_service import generate_thematic_literature_review

router = APIRouter(prefix="/literature-review", tags=["Literature Review"])

@router.post("", response_model=LiteratureReviewResponse)
def create_review(req: GenerateReviewRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = generate_thematic_literature_review(db, req.workspace_id, req.paper_ids, topic=req.topic or "")

    review_obj = LiteratureReview(
        workspace_id=req.workspace_id,
        title=res["title"],
        content_markdown=res["content_markdown"],
        themes_json=res["themes"],
        paper_ids_json=res["cited_paper_ids"]
    )
    db.add(review_obj)
    db.commit()
    db.refresh(review_obj)

    return {
        "id": review_obj.id,
        "workspace_id": review_obj.workspace_id,
        "title": review_obj.title,
        "content_markdown": review_obj.content_markdown,
        "themes": review_obj.themes_json,
        "cited_paper_ids": review_obj.paper_ids_json,
        "created_at": review_obj.created_at
    }
