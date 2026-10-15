"""Fail the deployment if the model's CV text and downloadable PDF diverge."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
site = ROOT / "_site"
knowledge = json.loads((site / "knowledge.json").read_text(encoding="utf-8-sig"))
documents = knowledge["documents"]
cvs = [document for document in documents if document.get("kind") == "cv"]
assert len(cvs) == 1, "Knowledge must contain exactly one current CV."
cv = cvs[0]
pdf_path = site / cv["url"].lstrip("/")
assert cv["sha256"] == hashlib.sha256(pdf_path.read_bytes()).hexdigest(), "CV text and published PDF have different fingerprints."
assert len(cv["content"].strip()) >= 100, "CV text is missing."
assert any(document.get("kind") == "profile" for document in documents), "About is missing."
assert not (site / "chat-service").exists(), "Backend source must not be published as static files."
print(f"Verified {len(documents)} knowledge documents; published PDF and CV index match.")
