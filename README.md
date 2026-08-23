# 📚 LitLens — Your AI Copilot for Research

**LitLens** is an advanced, evidence-grounded AI research assistant designed for scholars, researchers, and students. LitLens allows you to upload PDF research papers, ask questions with exact page proof citations, generate side-by-side multi-paper comparison matrices, discover missing research ideas, and synthesize literature reviews with 1-click PDF export.

---

## ✨ Key Features

- **📁 Research Project Workspaces**: Organize your research by creating dedicated projects with full CRUD capabilities.
- **📄 PDF Paper Parsing & Intelligence**: Upload PDF papers to automatically extract text via PyMuPDF (`fitz`), generate 768-dimensional vector embeddings, and compute structured summaries (Problem, Motivation, Method, Results, Limitations, Key Takeaways).
- **📖 Read & Ask AI (Split PDF Reader)**: View PDFs inline in a side-by-side interface while chatting with AI. Click any **Page Proof** chip (`Pg 8`, `Pg 9`) to instantly scroll the PDF viewer to that exact page.
- **🤖 AI Research Assistant (Gemini Agent)**: Powered by Google Gemini with tool calling to search evidence, find research gaps, and answer complex research queries.
- **📊 Multi-Paper Comparison Matrix**: Select multiple papers to construct side-by-side technical tables comparing research problems, methodologies, datasets, results, strengths, and limitations with AI cross-paper synthesis.
- **🔍 Missing Ideas (Research Gap Finder)**: Automated scanning of literature to identify recurring limitations and empirical contradictions, with a 1-click generator for detailed research proposals.
- **📝 Summary Review & 1-Click PDF Export**: Generate thematic literature reviews with inline paper citations and export them directly to PDF.
- **📱 Fully Responsive Design**: Mobile and tablet optimized navigation drawer, flexible grid layouts, and clean Color Hunt aesthetic palette.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom Color Hunt Sage & Gold Palette)
- **Icons**: Lucide React
- **Markdown Rendering**: `react-markdown` + `remark-gfm`

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Database**: PostgreSQL with `pgvector` extension & SQLAlchemy ORM
- **PDF Extraction**: PyMuPDF (`fitz`)
- **AI & Vector Embeddings**: Google Gemini API (`text-embedding-004` & `gemini-1.5-flash`)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL database with `pgvector` extension enabled

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create a .env file with your database URI and Gemini API key:
# DATABASE_URL=postgresql://user:password@localhost:5432/litlens_db
# GEMINI_API_KEY=your_gemini_api_key_here

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI server will start at `http://localhost:8000`.

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend application will start at `http://localhost:3000`.

---

## 📸 Main Interface Overview

1. **Overview (Dashboard)** — Manage projects and view workspace statistics.
2. **Paper Library** — Upload PDF papers and view automated structural breakdowns.
3. **Read & Ask AI** — Interactive split-screen PDF viewer with exact page jump evidence citations.
4. **AI Assistant** — Autonomous Gemini research agent for complex queries.
5. **Compare Papers** — Multi-paper technical matrix comparison tables.
6. **Missing Ideas** — Workspace research gap identification and proposal generator.
7. **Summary Review** — Thematic literature review generator with 1-click PDF export.

---

## 📜 License

This project is licensed under the MIT License.
