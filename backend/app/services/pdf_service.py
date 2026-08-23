import pymupdf as fitz
import re
from typing import List, Dict, Any

def extract_pdf_data(file_path: str) -> Dict[str, Any]:
    """
    Extracts text, metadata, page numbers, and structural sections from a PDF file using PyMuPDF.
    """
    doc = fitz.open(file_path)
    
    metadata = {
        "title": doc.metadata.get("title") or "",
        "author": doc.metadata.get("author") or "",
        "subject": doc.metadata.get("subject") or "",
        "keywords": doc.metadata.get("keywords") or "",
        "page_count": len(doc)
    }

    full_text_list = []
    chunks = []
    
    current_section = "Abstract / Introduction"

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_num = page_idx + 1
        blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
        
        for block in blocks:
            if block[6] == 0:  # text block
                text = block[4].strip()
                if not text:
                    continue
                
                # Simple heading detection heuristic (short lines, uppercase/numbered headings)
                first_line = text.split("\n")[0].strip()
                if len(first_line) < 60 and re.match(r"^(\d+(\.\d+)*\s+|[A-Z\s]{4,}|Abstract|Introduction|Related Work|Methodology|Methods|Experiments|Results|Discussion|Conclusion|Limitations|Future Work)", first_line, re.IGNORECASE):
                    current_section = first_line

                full_text_list.append(text)

                # Store text chunks with metadata
                chunks.append({
                    "content": text,
                    "page_number": page_num,
                    "section_title": current_section
                })

    full_text = "\n\n".join(full_text_list)

    # Fallback title if doc metadata is missing
    extracted_title = metadata["title"]
    if not extracted_title or len(extracted_title.strip()) < 3:
        # Extract top line of page 1 as title
        if chunks:
            lines = chunks[0]["content"].split("\n")
            extracted_title = lines[0] if lines else "Untitled Research Paper"
        else:
            extracted_title = "Untitled Research Paper"

    return {
        "metadata": metadata,
        "title": extracted_title,
        "authors": metadata["author"],
        "full_text": full_text,
        "chunks": chunks
    }

def create_semantic_chunks(raw_chunks: List[Dict[str, Any]], max_chunk_words: int = 250) -> List[Dict[str, Any]]:
    """
    Groups raw text blocks into semantic chunks while maintaining exact page number and section title references.
    """
    semantic_chunks = []
    chunk_index = 0

    current_chunk_words = []
    current_page = 1
    current_section = "Introduction"

    for block in raw_chunks:
        words = block["content"].split()
        if not words:
            continue

        current_page = block["page_number"]
        if block["section_title"]:
            current_section = block["section_title"]

        if len(current_chunk_words) + len(words) > max_chunk_words:
            if current_chunk_words:
                semantic_chunks.append({
                    "chunk_index": chunk_index,
                    "content": " ".join(current_chunk_words),
                    "page_number": current_page,
                    "section_title": current_section
                })
                chunk_index += 1
                current_chunk_words = []

        current_chunk_words.extend(words)

    if current_chunk_words:
        semantic_chunks.append({
            "chunk_index": chunk_index,
            "content": " ".join(current_chunk_words),
            "page_number": current_page,
            "section_title": current_section
        })

    return semantic_chunks
