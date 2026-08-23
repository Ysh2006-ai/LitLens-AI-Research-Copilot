import pytest
from app.services.pdf_service import create_semantic_chunks

def test_semantic_chunks_page_number_accuracy():
    # Construct raw blocks spanning across pages 1 and 2
    raw_chunks = [
        {"content": "This is word " * 80, "page_number": 1, "section_title": "Introduction"},
        {"content": "More text on page 1 " * 80, "page_number": 1, "section_title": "Introduction"},
        {"content": "Text starting on page 2 " * 80, "page_number": 2, "section_title": "Methodology"}
    ]

    semantic_chunks = create_semantic_chunks(raw_chunks, max_chunk_words=100)

    assert len(semantic_chunks) >= 2
    
    # First chunk's words were on page 1
    assert semantic_chunks[0]["page_number"] == 1
    assert semantic_chunks[0]["section_title"] == "Introduction"

    # Last chunk containing page 2 text must be assigned page 2
    last_chunk = semantic_chunks[-1]
    assert last_chunk["page_number"] == 2
    assert last_chunk["section_title"] == "Methodology"

if __name__ == "__main__":
    test_semantic_chunks_page_number_accuracy()
