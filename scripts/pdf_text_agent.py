import json
import os
import re
import sys
import tempfile
import time
from contextlib import redirect_stdout


os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")


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


def env_int(name, default, minimum=None, maximum=None):
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def env_float(name, default, minimum=None, maximum=None):
    try:
        value = float(os.environ.get(name, default))
    except (TypeError, ValueError):
        value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def choose_ocr_pages(total_pages):
    max_pages = env_int("PDF_AGENT_OCR_MAX_PAGES", 80, 1, 300)
    leading_pages = env_int("PDF_AGENT_OCR_LEADING_PAGES", 40, 0, max_pages)
    if total_pages <= max_pages:
        return list(range(total_pages))

    leading = min(leading_pages, max_pages, total_pages)
    pages = set(range(leading))
    remaining = max_pages - len(pages)
    if remaining > 0 and total_pages > leading:
        span = total_pages - leading - 1
        for slot in range(remaining):
            offset = 0 if remaining == 1 else round((slot / (remaining - 1)) * span)
            pages.add(min(total_pages - 1, leading + offset))

    return sorted(pages)[:max_pages]


def usable_ocr_line(line):
    text = re.sub(r"\s+", " ", str(line or "")).strip()
    if len(text) < 2:
        return ""
    if re.match(r"^[A-Za-z]:\\", text) or text.lower().endswith((".png", ".jpg", ".jpeg")):
        return ""
    return text


def collect_ocr_text(result, min_score=0.35):
    lines = []

    def add_line(text, score=None):
        try:
            if score is not None and float(score) < min_score:
                return
        except (TypeError, ValueError):
            pass
        line = usable_ocr_line(text)
        if line:
            lines.append(line)

    def walk(value):
        if isinstance(value, dict):
            rec_texts = value.get("rec_texts") or value.get("texts")
            rec_scores = value.get("rec_scores") or value.get("scores") or []
            if isinstance(rec_texts, (list, tuple)):
                for index, text in enumerate(rec_texts):
                    score = rec_scores[index] if isinstance(rec_scores, (list, tuple)) and index < len(rec_scores) else None
                    add_line(text, score)
            if isinstance(value.get("text"), str):
                add_line(value.get("text"), value.get("score"))
            for child in value.values():
                if child is not rec_texts and child is not rec_scores:
                    walk(child)
        elif isinstance(value, (list, tuple)):
            if len(value) >= 2 and isinstance(value[1], (list, tuple)) and value[1] and isinstance(value[1][0], str):
                score = value[1][1] if len(value[1]) > 1 else None
                add_line(value[1][0], score)
                return
            for child in value:
                walk(child)

    walk(result)
    unique = []
    seen = set()
    for line in lines:
        key = re.sub(r"\s+", "", line)
        if key in seen:
            continue
        seen.add(key)
        unique.append(line)
    return "\n".join(unique)


def create_paddle_ocr():
    from paddleocr import PaddleOCR

    base_kwargs = {
        "lang": "ch",
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
    }
    candidates = [
        (
            "PaddleOCR",
            {
                **base_kwargs,
                "engine": "paddle_static",
                "engine_config": {
                    "enable_new_ir": False,
                    "run_mode": "paddle",
                    "cpu_threads": env_int("PDF_AGENT_OCR_CPU_THREADS", 2, 1, 8),
                },
            },
        ),
        ("PaddleOCR-dynamic", {**base_kwargs, "engine": "paddle_dynamic"}),
        ("PaddleOCR-default", base_kwargs),
    ]
    errors = []
    for engine_name, kwargs in candidates:
        try:
            with redirect_stdout(sys.stderr):
                return engine_name, PaddleOCR(**kwargs), errors
        except Exception as exc:
            errors.append(f"{engine_name}: {exc}")
    raise RuntimeError("; ".join(errors))


def extract_with_paddleocr(pdf_path, max_chars, output_dir):
    import fitz

    parts = []
    page_errors = []
    truncated = False
    processed_pages = 0
    scale = env_float("PDF_AGENT_OCR_SCALE", 1.6, 1.0, 3.0)
    min_score = env_float("PDF_AGENT_OCR_MIN_SCORE", 0.35, 0.0, 1.0)
    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    page_indexes = choose_ocr_pages(total_pages)
    emit_progress({
        "method": "PaddleOCR",
        "stage": "ocr-start",
        "page": 0,
        "pages": len(page_indexes),
        "pdfPages": total_pages,
        "characters": 0,
        "message": f"正在初始化 OCR，计划识别 {len(page_indexes)}/{total_pages} 页",
    })

    engine_name = "PaddleOCR"
    ocr = None
    engine_errors = []
    try:
        engine_name, ocr, engine_errors = create_paddle_ocr()
        with tempfile.TemporaryDirectory(prefix="pdf_ocr_", dir=output_dir) as temp_dir:
            for ordinal, page_index in enumerate(page_indexes, 1):
                page_text = ""
                image_path = os.path.join(temp_dir, f"page_{page_index + 1}.png")
                try:
                    page = doc.load_page(page_index)
                    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                    pix.save(image_path)
                    with redirect_stdout(sys.stderr):
                        result = ocr.predict(image_path)
                    page_text = collect_ocr_text(result, min_score=min_score)
                except Exception as exc:
                    page_errors.append(f"page {page_index + 1}: {exc}")
                finally:
                    try:
                        os.remove(image_path)
                    except OSError:
                        pass

                if page_text:
                    truncated = append_limited(parts, f"\n第 {page_index + 1} 页 OCR\n{page_text}\n", max_chars)
                processed_pages = ordinal
                emit_progress({
                    "method": engine_name,
                    "stage": "ocr",
                    "page": ordinal,
                    "pages": len(page_indexes),
                    "pdfPage": page_index + 1,
                    "pdfPages": total_pages,
                    "characters": sum(len(part) for part in parts),
                    "message": f"{engine_name} 正在 OCR 第 {ordinal}/{len(page_indexes)} 页（PDF 第 {page_index + 1} 页），已识别 {sum(len(part) for part in parts)} 字符",
                })
                if truncated:
                    break
    finally:
        if ocr is not None:
            try:
                ocr.close()
            except Exception:
                pass
        doc.close()

    return "\n".join(parts), {
        "method": engine_name,
        "pages": total_pages,
        "truncated": truncated,
        "ocrUsed": True,
        "ocrEngine": engine_name,
        "ocrPages": processed_pages,
        "ocrPlannedPages": len(page_indexes),
        "ocrTotalPdfPages": total_pages,
        "ocrScale": scale,
        "ocrPageErrors": page_errors[:20],
        "ocrEngineFallbacks": engine_errors,
    }


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
    output_dir = os.path.dirname(output_path) or "."
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

    text_layer_chars = len(best_text)
    if text_layer_chars < env_int("PDF_AGENT_TEXT_MIN_CHARS", 80, 0, 10000):
        try:
            emit_progress({
                "method": "PaddleOCR",
                "stage": "ocr-queued",
                "characters": text_layer_chars,
                "message": "PDF 文本层不足，正在切换扫描版 OCR 识别",
            })
            ocr_text, ocr_meta = extract_with_paddleocr(pdf_path, max_chars, output_dir)
            ocr_text = clean_text(ocr_text)
            if len(ocr_text) > 0:
                best_text = clean_text("\n\n".join(part for part in [best_text, ocr_text] if part))
                best_meta = ocr_meta
                best_meta["textLayerCharacters"] = text_layer_chars
            elif best_meta is None:
                best_meta = ocr_meta
                best_meta["textLayerCharacters"] = text_layer_chars
            elif best_meta:
                best_meta.update({
                    "ocrUsed": True,
                    "ocrEngine": ocr_meta.get("ocrEngine"),
                    "ocrPages": ocr_meta.get("ocrPages", 0),
                    "ocrPlannedPages": ocr_meta.get("ocrPlannedPages", 0),
                    "ocrTotalPdfPages": ocr_meta.get("ocrTotalPdfPages", 0),
                    "ocrPageErrors": ocr_meta.get("ocrPageErrors", []),
                    "textLayerCharacters": text_layer_chars,
                })
        except Exception as exc:
            errors.append(f"PaddleOCR: {exc}")
            emit_progress({"method": "PaddleOCR", "stage": "failed", "message": str(exc)})

    os.makedirs(output_dir, exist_ok=True)
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
