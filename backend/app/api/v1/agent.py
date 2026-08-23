from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace
from app.schemas.schemas import AgentQueryRequest, AgentQueryResponse
from app.services.agent_service import run_research_agent

router = APIRouter(prefix="/agent", tags=["Research Agent"])

@router.post("/query", response_model=AgentQueryResponse)
def execute_agent(req: AgentQueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = run_research_agent(db, req.workspace_id, req.user_prompt)
    return res
