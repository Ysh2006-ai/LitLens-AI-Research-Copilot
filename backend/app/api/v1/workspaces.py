from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, Paper, PaperChunk
from app.schemas.schemas import WorkspaceCreate, WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workspaces = db.query(Workspace).filter(Workspace.user_id == current_user.id).order_by(Workspace.created_at.desc()).all()
    res = []
    for ws in workspaces:
        paper_count = db.query(Paper).filter(Paper.workspace_id == ws.id).count()
        res.append({
            "id": ws.id,
            "user_id": ws.user_id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at,
            "paper_count": paper_count
        })
    return res

@router.post("", response_model=WorkspaceResponse)
def create_workspace(ws_in: WorkspaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = Workspace(
        user_id=current_user.id,
        name=ws_in.name,
        description=ws_in.description
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return {
        "id": ws.id,
        "user_id": ws.user_id,
        "name": ws.name,
        "description": ws.description,
        "created_at": ws.created_at,
        "paper_count": 0
    }

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    paper_count = db.query(Paper).filter(Paper.workspace_id == ws.id).count()
    return {
        "id": ws.id,
        "user_id": ws.user_id,
        "name": ws.name,
        "description": ws.description,
        "created_at": ws.created_at,
        "paper_count": paper_count
    }

@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    
    # Delete paper chunks associated with workspace to avoid foreign key violation
    db.query(PaperChunk).filter(PaperChunk.workspace_id == workspace_id).delete(synchronize_session=False)
    
    db.delete(ws)
    db.commit()
    return {"message": "Workspace deleted successfully."}
