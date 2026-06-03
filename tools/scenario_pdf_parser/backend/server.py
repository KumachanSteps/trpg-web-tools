from __future__ import annotations

import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from statistics import median
from typing import Any

import fitz
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

APP_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(title="Scenario PDF Parser API", version="0.5.3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class LayoutLine:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    col: str = "full"
    kind: str = "body"

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def center_x(self) -> float:
        return (self.x0 + self.x1) / 2


ABILITY_KEYS = "STR|DEX|POW|CON|APP|EDU|SIZ|INT|SAN|HP|MP|DB"


def clean_span_text(text: str) -> str:
    text = text.replace("\ufeff", "").replace("\x00", "")
    text = text.replace("‧", "・").replace("∕", "／")
    text = text.replace("⻩", "黄").replace("⻘", "青")
    text = text.replace("⾃", "自").replace("⼈", "人").replace("⽬", "目")
    text = text.replace("⽋", "欠").replace("⾔", "言").replace("⽀", "支")
    return re.sub(r"\s+", " ", text).strip()


def join_spans_to_line(spans: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    previous_x1: float | None = None
    previous_text = ""

    for span in sorted(spans, key=lambda s: s.get("bbox", [0, 0, 0, 0])[0]):
        text = clean_span_text(span.get("text", ""))
        if not text:
            continue

        x0, _, x1, _ = span.get("bbox", [0, 0, 0, 0])
        gap = 0 if previous_x1 is None else x0 - previous_x1

        needs_space = (
            previous_x1 is not None
            and gap > 4.5
            and previous_text
            and not re.search(r"[（(［\[{「『【〈《・／/:\-]$", previous_text)
            and not re.match(r"^[）)］\]}」』】〉》、。．，,.！？!?:：％%]", text)
        )

        if needs_space:
            parts.append(" ")

        parts.append(text)
        previous_x1 = x1
        previous_text = text

    return "".join(parts).strip()


def classify_kind(text: str) -> str:
    if re.match(r"^([0-9]{2}[.．]|【|■|●|○|▼|▶|★)", text):
        return "heading"
    if re.match(r"^[・※→①②③④⑤⑥⑦⑧⑨⑩]", text):
        return "list"
    if re.match(r"^\[.+\]$", text):
        return "stat"
    return "body"


def extract_page_lines(page: fitz.Page, page_number: int) -> list[LayoutLine]:
    data = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)
    lines: list[LayoutLine] = []

    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for raw_line in block.get("lines", []):
            spans = raw_line.get("spans", [])
            text = join_spans_to_line(spans)
            if not text:
                continue

            x0, y0, x1, y1 = raw_line.get("bbox", block.get("bbox", [0, 0, 0, 0]))
            lines.append(
                LayoutLine(
                    page=page_number,
                    x0=float(x0),
                    y0=float(y0),
                    x1=float(x1),
                    y1=float(y1),
                    text=text,
                    kind=classify_kind(text),
                )
            )

    lines.sort(key=lambda line: (line.y0, line.x0))
    return merge_same_y_lines(lines)


def merge_same_y_lines(lines: list[LayoutLine], tolerance: float = 2.2) -> list[LayoutLine]:
    if not lines:
        return []

    groups: list[list[LayoutLine]] = []
    for line in lines:
        if groups and abs(groups[-1][0].y0 - line.y0) <= tolerance:
            groups[-1].append(line)
        else:
            groups.append([line])

    merged: list[LayoutLine] = []
    for group in groups:
        group = sorted(group, key=lambda item: item.x0)
        if len(group) == 1:
            merged.append(group[0])
            continue

        # Keep clearly separated left/right columns as separate lines.
        gaps = [group[i + 1].x0 - group[i].x1 for i in range(len(group) - 1)]
        if gaps and max(gaps) > 80:
            merged.extend(group)
            continue

        text = ""
        x0 = min(item.x0 for item in group)
        y0 = min(item.y0 for item in group)
        x1 = max(item.x1 for item in group)
        y1 = max(item.y1 for item in group)

        for item in group:
            if text and item.x0 - x1 > 4:
                text += " "
            text += item.text

        merged.append(LayoutLine(group[0].page, x0, y0, x1, y1, text, kind=classify_kind(text)))

    return sorted(merged, key=lambda line: (line.y0, line.x0))


def is_page_number(line: LayoutLine, page_height: float) -> bool:
    return bool(re.fullmatch(r"\d{1,3}", line.text)) and line.y0 > page_height * 0.88


def is_repeated_page_header(line: LayoutLine, page_height: float) -> bool:
    if line.y0 > page_height * 0.14:
        return False
    text = line.text.strip()
    if re.match(r"^HO\d+\s+秘匿HO／HO\d+", text):
        return True
    if re.match(r"^0?1[.．]秘匿HO／HO\d+", text):
        return True
    if re.match(r"^0?2[.．]KP情報$", text):
        return True
    if re.match(r"^0?3[.．]本編前半パート$", text):
        return True
    return False


def classify_columns(lines: list[LayoutLine], page_width: float) -> list[LayoutLine]:
    if not lines:
        return []

    mid = page_width / 2
    left_margin = min(line.x0 for line in lines)
    right_margin = max(line.x1 for line in lines)
    content_width = max(1, right_margin - left_margin)

    left_candidates = [line for line in lines if line.center_x < mid and line.width < content_width * 0.72]
    right_candidates = [line for line in lines if line.center_x >= mid and line.width < content_width * 0.72]
    has_two_columns = len(left_candidates) >= 3 and len(right_candidates) >= 3

    for line in lines:
        text = line.text
        full_by_text = bool(re.match(r"^([0-9]{2}[.．]|【|■)", text))
        full_by_width = line.width >= page_width * 0.52 or (line.x0 < mid and line.x1 > mid)
        if not has_two_columns or full_by_text or full_by_width:
            line.col = "full"
        elif line.center_x < mid:
            line.col = "left"
        else:
            line.col = "right"

    return lines


def order_lines_by_layout(lines: list[LayoutLine], page_width: float, page_height: float) -> list[LayoutLine]:
    filtered = [
        line for line in lines
        if not is_page_number(line, page_height)
        and not is_repeated_page_header(line, page_height)
    ]
    classified = classify_columns(filtered, page_width)

    ordered: list[LayoutLine] = []
    column_buffer: list[LayoutLine] = []

    def flush_columns() -> None:
        nonlocal column_buffer
        if not column_buffer:
            return
        left = sorted([line for line in column_buffer if line.col == "left"], key=lambda item: (item.y0, item.x0))
        right = sorted([line for line in column_buffer if line.col == "right"], key=lambda item: (item.y0, item.x0))
        full = sorted([line for line in column_buffer if line.col == "full"], key=lambda item: (item.y0, item.x0))
        ordered.extend(left)
        ordered.extend(right)
        ordered.extend(full)
        column_buffer = []

    for line in sorted(classified, key=lambda item: (item.y0, item.x0)):
        if line.col == "full":
            flush_columns()
            ordered.append(line)
        else:
            column_buffer.append(line)

    flush_columns()
    return ordered


def fix_split_numbers(text: str) -> str:
    ability = ABILITY_KEYS
    text = re.sub(rf"\b({ability}):([0-9])\n([0-9])(?=\s+(?:{ability}):|\s*$)", r"\1:\2\3", text)
    text = re.sub(rf"\b({ability}):([0-9])\n([0-9])", r"\1:\2\3", text)
    text = re.sub(r"(\bNo\.[0-9])\n([0-9]\b)", r"\1\2", text)
    text = re.sub(r"(\bP[0-9])\n([0-9]{1,2}\b)", r"\1\2", text)
    text = re.sub(r"(\b[0-9]+[dD][0-9])\n([0-9]\b)", r"\1\2", text)
    return text


def normalize_chapter_headers(text: str) -> str:
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

        secret_match = re.match(r"^0?1[.．]秘匿HO[／/]\s*HO\d+.*$", line)
        if secret_match:
            chapter = "01.秘匿HO"
            if chapter not in seen_chapters:
                result.append("【01.秘匿HO】")
                seen_chapters.add(chapter)
            continue

        chapter_match = re.match(r"^([0-9]{2})[.．](諸注意|KP情報|本編前半パート|本編探索パート|本編クライマックス|エンディング).*", line)
        if chapter_match:
            chapter = f"{chapter_match.group(1)}.{chapter_match.group(2)}"
            if chapter not in seen_chapters:
                result.append(f"【{chapter}】")
                seen_chapters.add(chapter)
            continue

        result.append(line)

    return "\n".join(result)


def should_join(prev: str, cur: str) -> bool:
    if not prev or not cur:
        return False
    if re.match(r"^([■●○▼▶★・※→①②③④⑤⑥⑦⑧⑨⑩\[]|【)", cur):
        return False
    if re.match(r"^([■●○▼▶★]|【)", prev):
        return False
    if re.search(r"[。！？!?」』）)]$", prev):
        return False
    if re.match(r"^「", cur):
        return False
    return True


def join_wrapped_japanese_lines(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    for line in lines:
        cur = line.strip()
        if not out:
            out.append(cur)
            continue
        if should_join(out[-1], cur):
            out[-1] += cur
        else:
            out.append(cur)
    return "\n".join(out)


def normalize_japanese_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = fix_split_numbers(text)
    text = normalize_chapter_headers(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"([■●▼▶★○])\s+", r"\1", text)
    text = re.sub(r"([。！？!？])\n(」)", r"\1\2", text)
    text = join_wrapped_japanese_lines(text)
    text = fix_split_numbers(text)
    text = re.sub(r"(■|●|○|▼|▶|★)(?=[^\n])", r"\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_pdf_with_layout(pdf_path: Path) -> dict[str, Any]:
    doc = fitz.open(str(pdf_path))
    pages_text: list[str] = []
    debug_lines: list[str] = []

    for page_index, page in enumerate(doc, start=1):
        page_width = float(page.rect.width)
        page_height = float(page.rect.height)
        lines = extract_page_lines(page, page_index)
        ordered = order_lines_by_layout(lines, page_width, page_height)

        page_lines: list[str] = []
        previous_y: float | None = None

        for line in ordered:
            if previous_y is not None and line.y0 - previous_y > 22:
                page_lines.append("")
            page_lines.append(line.text)
            debug_lines.append(
                f"page={page_index} y={line.y0:.1f} x={line.x0:.1f} col={line.col} kind={line.kind} {line.text}"
            )
            previous_y = line.y0

        page_text = "\n".join(page_lines).strip()
        if page_text:
            pages_text.append(page_text)

    raw = "\n\n".join(pages_text)
    text = normalize_japanese_text(raw)

    return {
        "engine": "pymupdf-layout",
        "text": text,
        "debug": "\n".join(debug_lines),
        "pages": len(doc),
    }


@app.post("/api/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    preset: str = Form("scenario"),
    version: str = Form("0.5.3"),
):
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
    temp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.write(await file.read())

        parsed = parse_pdf_with_layout(temp_path)
        text = parsed["text"]

        return {
            "ok": True,
            "engine": parsed["engine"],
            "filename": file.filename,
            "version": version,
            "preset": preset,
            "pages": parsed["pages"],
            "text": text,
            "markdown": "",
            "debug": parsed["debug"],
            "chars": len(text),
            "postprocess": {
                "removed_page_headers": True,
                "fixed_split_numbers": True,
                "coordinate_layout": True,
                "column_ordering": True,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass


@app.get("/")
async def index():
    return FileResponse(APP_DIR / "index.html")


app.mount("/", StaticFiles(directory=APP_DIR, html=True), name="static")
