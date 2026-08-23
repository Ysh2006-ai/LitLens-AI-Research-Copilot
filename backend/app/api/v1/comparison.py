from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace
from app.schemas.schemas import MultiPaperCompareRequest, MultiPaperCompareResponse
from app.services.comparison_service import compare_workspace_papers

router = APIRouter(prefix="/comparison", tags=["Paper Comparison"])

@router.post("", response_model=MultiPaperCompareResponse)
def compare_papers(req: MultiPaperCompareRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if len(req.paper_ids) < 1:
        raise HTTPException(status_code=400, detail="Select at least one paper to compare.")

    res = compare_workspace_papers(db, req.workspace_id, req.paper_ids)
    return res
