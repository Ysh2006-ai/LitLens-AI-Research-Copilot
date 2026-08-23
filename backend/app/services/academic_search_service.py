import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

async def search_academic_papers(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Searches arXiv and OpenAlex academic paper databases.
    """
    results = []

    # 1. Search arXiv API
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            arxiv_url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={limit}"
            res = await client.get(arxiv_url)
            if res.status_code == 200:
                root = ET.fromstring(res.text)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                for entry in root.findall("atom:entry", ns):
                    title = entry.find("atom:title", ns).text.strip().replace("\n", " ")
                    summary = entry.find("atom:summary", ns).text.strip().replace("\n", " ")
                    published = entry.find("atom:published", ns).text[:4]
                    id_url = entry.find("atom:id", ns).text
                    pdf_url = id_url.replace("abs", "pdf") + ".pdf"

                    authors = []
                    for author in entry.findall("atom:author", ns):
                        name = author.find("atom:name", ns).text
                        authors.append(name)

                    results.append({
                        "id": f"arxiv_{id_url.split('/')[-1]}",
                        "title": title,
                        "authors": authors,
                        "year": int(published) if published.isdigit() else 2024,
                        "venue": "arXiv",
                        "abstract": summary,
                        "pdf_url": pdf_url,
                        "citation_count": 0,
                        "source": "arXiv"
                    })
    except Exception as e:
        print(f"Error fetching from arXiv API: {e}")

    # 2. Search OpenAlex API if arXiv returned few results
    if len(results) < limit:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                openalex_url = f"https://api.openalex.org/works?search={query}&per-page={limit - len(results)}"
                res = await client.get(openalex_url)
                if res.status_code == 200:
                    data = res.json()
                    for item in data.get("results", []):
                        authors = [a.get("author", {}).get("display_name", "") for a in item.get("authorships", [])]
                        pdf_url = item.get("open_access", {}).get("oa_url")
                        
                        results.append({
                            "id": item.get("id", "").replace("https://openalex.org/", "oa_"),
                            "title": item.get("title") or "Untitled Paper",
                            "authors": [a for a in authors if a],
                            "year": item.get("publication_year"),
                            "venue": item.get("primary_location", {}).get("source", {}).get("display_name", "OpenAlex"),
                            "abstract": "Abstract available via open access repository.",
                            "pdf_url": pdf_url,
                            "citation_count": item.get("cited_by_count", 0),
                            "source": "OpenAlex"
                        })
        except Exception as e:
            print(f"Error fetching from OpenAlex API: {e}")

    return results[:limit]
