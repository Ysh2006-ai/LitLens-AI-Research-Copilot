import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="workspaces")
    papers = relationship("Paper", back_populates="workspace", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
    gaps = relationship("ResearchGap", back_populates="workspace", cascade="all, delete-orphan")
    questions = relationship("ResearchQuestion", back_populates="workspace", cascade="all, delete-orphan")
    reviews = relationship("LiteratureReview", back_populates="workspace", cascade="all, delete-orphan")

class Paper(Base):
    __tablename__ = "papers"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    title = Column(String, nullable=False)
    authors = Column(Text, nullable=True)
    publication_year = Column(Integer, nullable=True)
    venue = Column(String, nullable=True)
    abstract = Column(Text, nullable=True)
    pdf_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    status = Column(String, default="processed") # processing, processed, error
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="papers")
    chunks = relationship("PaperChunk", back_populates="paper", cascade="all, delete-orphan")
    analysis = relationship("PaperAnalysis", back_populates="paper", uselist=False, cascade="all, delete-orphan")

class PaperChunk(Base):
    __tablename__ = "paper_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False)
    section_title = Column(String, nullable=True)
    embedding = Column(Vector(768), nullable=True)

    paper = relationship("Paper", back_populates="chunks")

class PaperAnalysis(Base):
    __tablename__ = "paper_analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False, unique=True)
    research_problem = Column(Text, nullable=True)
    motivation = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    key_contributions = Column(JSON, nullable=True)
    dataset = Column(Text, nullable=True)
    results = Column(Text, nullable=True)
    limitations = Column(Text, nullable=True)
    future_work = Column(Text, nullable=True)
    key_takeaways = Column(JSON, nullable=True)
    glance_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    paper = relationship("Paper", back_populates="analysis")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=True)
    title = Column(String, nullable=False, default="Research Workspace Chat")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False) # user or assistant
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")

class ResearchGap(Base):
    __tablename__ = "research_gaps"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False) # recurring_limitation, contradiction, underexplored, methodological, dataset
    supporting_paper_ids = Column(JSON, nullable=False)
    evidence_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="gaps")

class ResearchQuestion(Base):
    __tablename__ = "research_questions"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    gap_id = Column(String, ForeignKey("research_gaps.id"), nullable=True)
    question = Column(Text, nullable=False)
    motivation = Column(Text, nullable=False)
    proposed_methodology = Column(Text, nullable=False)
    dataset = Column(Text, nullable=False)
    evaluation_metrics = Column(Text, nullable=False)
    supporting_paper_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="questions")

class LiteratureReview(Base):
    __tablename__ = "literature_reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    title = Column(String, nullable=False)
    content_markdown = Column(Text, nullable=False)
    themes_json = Column(JSON, nullable=True)
    paper_ids_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="reviews")
