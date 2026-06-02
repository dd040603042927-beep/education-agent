import json
import os
import re
import sys
import time


def emit_progress(payload):
    print("PROGRESS " + json.dumps(payload, ensure_ascii=False), file=sys.stderr, flush=True)


def clean_text(text):
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def append_limited(parts, text, max_chars):
    if not text:
        return False
    current = sum(len(part) for part in parts)
    remaining = max_chars - current
    if remaining <= 0:
        return True
    parts.append(text[:remaining])
    return len(text) > remaining


def extract_with_fitz(pdf_path, max_chars):
    import fitz

    parts = []
    doc = fitz.open(pdf_path)
    total = doc.page_count
    truncated = False
    for index in range(total):
        page = doc.load_page(index)
        text = page.get_text("text") or ""
        truncated = append_limited(parts, text + "\n", max_chars)
        if index % 5 == 0 or index == total - 1:
            emit_progress({
                "method": "PyMuPDF",
                "page": index + 1,
                "pages": total,
                "characters": sum(len(part) for part in parts),
            })
        if truncated:
            break
    doc.close()
    return "\n".join(parts), {"method": "PyMuPDF", "pages": total, "truncated": truncated}


def extract_with_pdfplumber(pdf_path, max_chars):
    import pdfplumber

    parts = []
    truncated = False
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            truncated = append_limited(parts, text + "\n", max_chars)
            if index % 5 == 0 or index == total - 1:
                emit_progress({
                    "method": "pdfplumber",
                    "page": index + 1,
                    "pages": total,
                    "characters": sum(len(part) for part in parts),
                })
            if truncated:
                break
    return "\n".join(parts), {"method": "pdfplumber", "pages": total, "truncated": truncated}


def extract_with_pypdf(pdf_path, max_chars):
    from pypdf import PdfReader

    parts = []
    reader = PdfReader(pdf_path, strict=False)
    total = len(reader.pages)
    truncated = False
    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        truncated = append_limited(parts, text + "\n", max_chars)
        if index % 5 == 0 or index == total - 1:
            emit_progress({
                "method": "pypdf",
                "page": index + 1,
                "pages": total,
                "characters": sum(len(part) for part in parts),
            })
        if truncated:
            break
    return "\n".join(parts), {"method": "pypdf", "pages": total, "truncated": truncated}


def main():
    if len(sys.argv) < 4:
        raise SystemExit("Usage: pdf_text_agent.py <pdf_path> <output_path> <max_chars>")

    pdf_path = sys.argv[1]
    output_path = sys.argv[2]
    max_chars = int(sys.argv[3])
    started = time.time()
    errors = []

    methods = [
        ("PyMuPDF", extract_with_fitz),
        ("pdfplumber", extract_with_pdfplumber),
        ("pypdf", extract_with_pypdf),
    ]

    best_text = ""
    best_meta = None
    for name, extractor in methods:
        try:
            emit_progress({"method": name, "stage": "start", "characters": len(best_text)})
            text, meta = extractor(pdf_path, max_chars)
            text = clean_text(text)
            if len(text) > len(best_text):
                best_text = text
                best_meta = meta
            if len(text) >= 80:
                break
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            emit_progress({"method": name, "stage": "failed", "message": str(exc)})

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8", errors="ignore") as handle:
        handle.write(best_text[:max_chars])

    meta = best_meta or {"method": "advanced-python-pdf-agent", "pages": 0, "truncated": False}
    meta.update({
        "characters": len(best_text[:max_chars]),
        "fileSize": os.path.getsize(pdf_path),
        "durationMs": int((time.time() - started) * 1000),
        "errors": errors,
    })
    print(json.dumps(meta, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
