"""Build the chat's CV document from the exact PDF shipped with the website."""
import hashlib
import io
import json
from pathlib import Path
import unicodedata

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "assets/files/Su_Linxiang_CV.pdf"
OUTPUT = ROOT / "_data/cv.json"


def extract_document(pdf_path: Path) -> dict:
    data = pdf_path.read_bytes()
    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        raise ValueError("The published CV must be an unencrypted, readable PDF.")
    pages = []
    for number, page in enumerate(reader.pages, 1):
        text = unicodedata.normalize("NFKC", page.extract_text() or "")
        text = "".join(c for c in text if c in "\n\t" or not unicodedata.category(c).startswith("C"))
        if len(text.strip()) < 100:
            raise ValueError(f"CV page {number} has too little readable text; OCR or a text-based PDF is required.")
        pages.append(f"[Page {number}]\n{text.strip()}")
    if not pages:
        raise ValueError("The CV has no pages.")
    return {
        "title": "Linxiang Su — CV",
        "url": "/assets/files/Su_Linxiang_CV.pdf",
        "kind": "cv",
        "sha256": hashlib.sha256(data).hexdigest(),
        "pages": len(pages),
        "content": "\n\n".join(pages),
    }


if __name__ == "__main__":
    document = extract_document(PDF)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"CV indexed: {document['pages']} page(s), {len(document['content'])} characters, sha256={document['sha256']}")
