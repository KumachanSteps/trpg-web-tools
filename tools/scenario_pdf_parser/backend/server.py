from __future__ import annotations

import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

try:
    import pymupdf4llm
except Exception as exc:
    pymupdf4llm = None
    PYMUPDF4LLM_IMPORT_ERROR = exc
else:
    PYMUPDF4LLM_IMPORT_ERROR = None

APP_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(title="Scenario PDF Parser API", version="0.5.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


ABILITY_KEYS = "STR|DEX|POW|CON|APP|EDU|SIZ|INT|SAN|HP|MP|DB"


def fix_split_numbers(text: str) -> str:
    ability = ABILITY_KEYS
    text = re.sub(rf"\b({ability}):([0-9])\n([0-9])(?=\s+(?:{ability}):|\s*$)", r"\1:\2\3", text)
    text = re.sub(rf"\b({ability}):([0-9])\n([0-9])", r"\1:\2\3", text)
    text = re.sub(r"(\bNo\.[0-9])\n([0-9]\b)", r"\1\2", text)
    text = re.sub(r"(\bP[0-9])\n([0-9]{1,2}\b)", r"\1\2", text)
    text = re.sub(r"(\b[0-9]+d[0-9])\n([0-9]\b)", r"\1\2", text, flags=re.IGNORECASE)
    text = re.sub(r"(\b[0-9]+D[0-9])\n([0-9]\b)", r"\1\2", text)
    return text


def normalize_chapter_and_remove_page_headers(text: str) -> str:
    lines = [line.strip() for line in text.split("\n")]
    result: list[str] = []
    seen_chapters: set[str] = set()

    for line in lines:
        if not line:
            result.append("")
            continue

        if re.fullmatch(r"\d{1,3}", line):
            continue

        if re.match(r"^HO\d+\s+秘匿HO／HO\d+", line):
            continue

        secret_match = re.match(r"^0?1[\.．]秘匿HO[／/]\s*HO\d+.*$", line)
        if secret_match:
            chapter = "01.秘匿HO"
            if chapter not in seen_chapters:
                result.append("【01.秘匿HO】")
                seen_chapters.add(chapter)
            continue

        chapter_match = re.match(r"^([0-9]{2})[\.．](諸注意|KP情報|本編前半パート|本編探索パート|本編クライマックス|エンディング).*", line)
        if chapter_match:
            chapter = f"{chapter_match.group(1)}.{chapter_match.group(2)}"
            if chapter not in seen_chapters:
                result.append(f"【{chapter}】")
                seen_chapters.add(chapter)
            continue

        result.append(line)

    text = "\n".join(result)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_japanese_text(text: str) -> str:
    text = text.replace("\ufeff", "").replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("‧", "・").replace("∕", "／")
    text = text.replace("⻩", "黄").replace("⻘", "青")
    text = fix_split_numbers(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"([■●▼▶★○])\s+", r"\1", text)
    text = re.sub(r"([。！？!？])\n(」)", r"\1\2", text)
    text = re.sub(r"([ぁ-んァ-ヶ一-龠々ー])\n([ぁ-んァ-ヶ一-龠々ー])", r"\1\2", text)
    text = re.sub(r"(セッショ)\n(ン)", r"\1\2", text)
    text = re.sub(r"(ポイ)\n(ント)", r"\1\2", text)
    text = re.sub(r"(スパ)\n(イ)", r"\1\2", text)
    text = re.sub(r"(ビスポー)\n(ク)", r"\1\2", text)
    text = re.sub(r"(マルク)\n(ス)", r"\1\2", text)
    text = fix_split_numbers(text)
    text = normalize_chapter_and_remove_page_headers(text)
    text = re.sub(r"([■●▼▶★○])", r"\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def markdown_to_plain_text(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*]\s+", "・", text, flags=re.MULTILINE)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\n-{3,}\n", "\n________________\n", text)
    return normalize_japanese_text(text)


def parse_with_pymupdf4llm(pdf_path: Path) -> dict[str, Any]:
    if pymupdf4llm is None:
        raise RuntimeError(f"pymupdf4llm import failed: {PYMUPDF4LLM_IMPORT_ERROR}")

    markdown = pymupdf4llm.to_markdown(str(pdf_path))
    text = markdown_to_plain_text(markdown)
    return {
        "engine": "pymupdf4llm",
        "markdown": markdown,
        "text": text,
    }


@app.post("/api/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    preset: str = Form("scenario"),
    version: str = Form("0.5"),
):
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.write(await file.read())

        parsed = parse_with_pymupdf4llm(temp_path)
        text = parsed["text"]

        return {
            "ok": True,
            "engine": parsed["engine"],
            "filename": file.filename,
            "version": version,
            "preset": preset,
            "pages": None,
            "text": text,
            "markdown": parsed["markdown"],
            "chars": len(text),
            "postprocess": {
                "removed_page_headers": True,
                "fixed_split_numbers": True
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/")
async def index():
    return FileResponse(APP_DIR / "index.html")


app.mount("/", StaticFiles(directory=APP_DIR, html=True), name="static")
