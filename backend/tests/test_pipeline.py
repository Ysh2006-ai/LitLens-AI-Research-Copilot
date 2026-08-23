import os
import pytest
import httpx

API_BASE = "http://localhost:8000/api/v1"

def test_full_rag_pipeline():
    # 1. Register & Login
    client = httpx.Client(timeout=30.0)
    auth_res = client.post(f"{API_BASE}/auth/register", json={
        "email": "test_researcher@litlens.ai",
        "password": "Password123!",
        "full_name": "Test Researcher"
    })
    if auth_res.status_code == 400: # user exists
        auth_res = client.post(f"{API_BASE}/auth/login", json={
            "email": "test_researcher@litlens.ai",
            "password": "Password123!"
        })
    
    if auth_res.status_code != 200:
        print("Auth response error:", auth_res.status_code, auth_res.text)
    assert auth_res.status_code == 200
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Workspace
    ws_res = client.post(f"{API_BASE}/workspaces", json={
        "name": "Transformer Benchmark Workspace",
        "description": "Testing vector similarity & grounded citations."
    }, headers=headers)
    assert ws_res.status_code == 200
    ws_id = ws_res.json()["id"]

    # 3. Upload Sample PDF
    pdf_path = "/tmp/sample_transformer_paper.pdf"
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            f"{API_BASE}/papers/upload",
            data={"workspace_id": ws_id},
            files={"file": ("sample_transformer_paper.pdf", f, "application/pdf")},
            headers=headers
        )
    assert upload_res.status_code == 200
    paper_data = upload_res.json()
    assert paper_data["status"] == "processed"
    assert paper_data["analysis"] is not None

    # 4. Grounded Chat Query
    chat_res = client.post(f"{API_BASE}/chat", json={
        "workspace_id": ws_id,
        "message": "What BLEU score did the transformer achieve on English-to-German?"
    }, headers=headers)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    print("Chat response:", chat_data)
    assert len(chat_data["content"]) > 0
    assert len(chat_data["citations"]) > 0

    print("SUCCESS: Full RAG and evidence grounding pipeline verified!")

if __name__ == "__main__":
    test_full_rag_pipeline()
