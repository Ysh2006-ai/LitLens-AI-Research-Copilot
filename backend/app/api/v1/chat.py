from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Workspace, Conversation, Message
from app.schemas.schemas import ChatQueryRequest, ChatMessageResponse
from app.services.rag_service import retrieve_relevant_chunks, generate_grounded_answer

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])

@router.post("", response_model=ChatMessageResponse)
def query_chat(req: ChatQueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws = db.query(Workspace).filter(Workspace.id == req.workspace_id, Workspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # Find or create conversation
    conv = None
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id, Conversation.workspace_id == req.workspace_id).first()
    if not conv:
        conv = Conversation(
            workspace_id=req.workspace_id,
            title=req.message[:40] + ("..." if len(req.message) > 40 else "")
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # User message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message
    )
    db.add(user_msg)

    # Vector Retrieval & Grounded RAG
    chunks = retrieve_relevant_chunks(db, req.workspace_id, req.message, paper_ids=req.paper_ids, top_k=5)
    rag_res = generate_grounded_answer(req.message, chunks)

    # Assistant message
    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=rag_res["answer"],
        citations_json=rag_res["citations"]
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return {
        "id": assistant_msg.id,
        "conversation_id": conv.id,
        "role": assistant_msg.role,
        "content": assistant_msg.content,
        "citations": rag_res["citations"],
        "created_at": assistant_msg.created_at
    }
