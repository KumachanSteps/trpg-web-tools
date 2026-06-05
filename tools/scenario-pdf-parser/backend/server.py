from __future__ import annotations

import math
import re
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from statistics import median
from typing import Any

import cv2
import fitz
import numpy as np
import pdfplumber
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

APP_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(title="Scenario PDF Parser API", version="0.6.6")

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
    source: str = "text"

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0

    @property
    def center_x(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def center_y(self) -> float:
        return (self.y0 + self.y1) / 2


@dataclass
class LayoutBand:
    page: int
    y0: float
    y1: float
    mode: str = "full"
    lines: list[LayoutLine] = field(default_factory=list)
    separators: list[float] = field(default_factory=list)

    @property
    def height(self) -> float:
        return self.y1 - self.y0


ABILITY_KEYS = "STR|DEX|POW|CON|APP|EDU|SIZ|INT|SAN|HP|MP|DB"


def clean_span_text(text: str) -> str:
    text = text.replace("\ufeff", "").replace("\x00", "")
    text = text.replace("‧", "・").replace("∕", "／")
    text = text.replace("⻩", "黄").replace("⻘", "青")
    text = text.replace("⾃", "自").replace("⼈", "人").replace("⽬", "目")
    text = text.replace("⽋", "欠").replace("⾔", "言").replace("⽀", "支")
    text = text.replace("⾼", "高").replace("⼤", "大").replace("⽣", "生")
    text = text.replace("⼀", "一").replace("⼆", "二").replace("⽤", "用")
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
            and gap > 4.8
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
    if re.match(r"^(STR|DEX|POW|CON|APP|EDU|SIZ|INT|SAN|HP|MP|DB)[:：]", text):
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
    return merge_same_y_lines(lines, float(page.rect.width))


def should_keep_same_y_items_separate(group: list[LayoutLine], page_width: float) -> bool:
    if len(group) < 2:
        return False

    group = sorted(group, key=lambda item: item.x0)
    gaps = [group[i + 1].x0 - group[i].x1 for i in range(len(group) - 1)]
    if not gaps:
        return False

    max_gap = max(gaps)
    split_index = gaps.index(max_gap)
    left_item = group[split_index]
    right_item = group[split_index + 1]
    midpoint = page_width / 2

    crosses_mid_gap = left_item.x1 < midpoint < right_item.x0
    looks_like_column_gap = max_gap >= max(24, page_width * 0.032)
    both_are_text_blocks = left_item.width > 16 and right_item.width > 16

    left_text = left_item.text.strip()
    right_text = right_item.text.strip()
    structural_pair = bool(
        re.match(r"^[●○■・※]", left_text) or
        re.match(r"^[●○■・※]", right_text) or
        left_item.kind in {"heading", "list", "stat"} or
        right_item.kind in {"heading", "list", "stat"}
    )

    return both_are_text_blocks and looks_like_column_gap and (crosses_mid_gap or structural_pair)


def merge_same_y_lines(lines: list[LayoutLine], page_width: float, tolerance: float = 2.2) -> list[LayoutLine]:
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

        if should_keep_same_y_items_separate(group, page_width):
            merged.extend(group)
            continue

        x0 = min(item.x0 for item in group)
        y0 = min(item.y0 for item in group)
        x1 = max(item.x1 for item in group)
        y1 = max(item.y1 for item in group)
        text_parts: list[str] = []
        previous_x1: float | None = None

        for item in group:
            if previous_x1 is not None and item.x0 - previous_x1 > 4.8:
                text_parts.append(" ")
            text_parts.append(item.text)
            previous_x1 = item.x1

        text = "".join(text_parts).strip()
        merged.append(LayoutLine(group[0].page, x0, y0, x1, y1, text, kind=classify_kind(text)))

    return sorted(merged, key=lambda line: (line.y0, line.x0))

def pixmap_to_cv_image(page: fitz.Page, scale: float = 2.0) -> tuple[np.ndarray, float]:
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
    return image, scale


def detect_ruling_lines(page: fitz.Page) -> dict[str, list[float]]:
    image, scale = pixmap_to_cv_image(page, scale=2.0)
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    binary = cv2.threshold(gray, 225, 255, cv2.THRESH_BINARY_INV)[1]

    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (90, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 60))

    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)

    horizontal_contours, _ = cv2.findContours(horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    vertical_contours, _ = cv2.findContours(vertical, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h_ys: list[float] = []
    v_xs: list[float] = []

    page_width = float(page.rect.width)
    page_height = float(page.rect.height)

    for contour in horizontal_contours:
        x, y, w, h = cv2.boundingRect(contour)
        width_pt = w / scale
        if width_pt > page_width * 0.25:
            h_ys.append((y + h / 2) / scale)

    for contour in vertical_contours:
        x, y, w, h = cv2.boundingRect(contour)
        height_pt = h / scale
        if height_pt > page_height * 0.15:
            v_xs.append((x + w / 2) / scale)

    return {
        "horizontal": dedupe_positions(h_ys, tolerance=4.0),
        "vertical": dedupe_positions(v_xs, tolerance=4.0),
    }


def dedupe_positions(values: list[float], tolerance: float = 3.0) -> list[float]:
    if not values:
        return []
    values = sorted(values)
    groups: list[list[float]] = []
    for value in values:
        if groups and abs(groups[-1][-1] - value) <= tolerance:
            groups[-1].append(value)
        else:
            groups.append([value])
    return [sum(group) / len(group) for group in groups]


def is_page_number(line: LayoutLine, page_height: float) -> bool:
    return bool(re.fullmatch(r"\d{1,3}", line.text)) and line.y0 > page_height * 0.86


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


def remove_headers_footers(lines: list[LayoutLine], page_height: float) -> list[LayoutLine]:
    return [
        line for line in lines
        if not is_page_number(line, page_height)
        and not is_repeated_page_header(line, page_height)
    ]


def infer_text_gaps(lines: list[LayoutLine], page_width: float) -> list[float]:
    if len(lines) < 6:
        return []

    xs = sorted(set(round(line.x0, 1) for line in lines))
    centers = [line.center_x for line in lines if line.width < page_width * 0.65]
    left_count = len([x for x in centers if x < page_width * 0.46])
    right_count = len([x for x in centers if x > page_width * 0.54])
    if left_count < 3 or right_count < 3:
        return []

    mid = page_width / 2
    return [mid]


def detect_band_breaks(lines: list[LayoutLine], horizontal_lines: list[float], page_height: float) -> list[float]:
    breaks: list[float] = []
    sorted_lines = sorted(lines, key=lambda item: item.y0)

    for prev, cur in zip(sorted_lines, sorted_lines[1:]):
        gap = cur.y0 - prev.y1

        if gap > 30:
            breaks.append((prev.y1 + cur.y0) / 2)
            continue

        prev_is_major_heading = bool(re.match(r"^(【|[0-9]{2}[.．]|■)", prev.text))
        cur_is_major_heading = bool(re.match(r"^(【|[0-9]{2}[.．]|■)", cur.text))
        if gap > 16 and (prev_is_major_heading or cur_is_major_heading):
            breaks.append((prev.y1 + cur.y0) / 2)

    return dedupe_positions([b for b in breaks if 0 < b < page_height], tolerance=5.0)

def split_lines_into_bands(lines: list[LayoutLine], page_number: int, page_width: float, page_height: float, separators: dict[str, list[float]]) -> list[LayoutBand]:
    if not lines:
        return []

    breaks = detect_band_breaks(lines, separators.get("horizontal", []), page_height)
    edges = [0.0] + breaks + [page_height]
    bands: list[LayoutBand] = []

    for y0, y1 in zip(edges, edges[1:]):
        band_lines = [line for line in lines if y0 <= line.center_y < y1]
        if not band_lines:
            continue

        band = LayoutBand(page=page_number, y0=y0, y1=y1, lines=band_lines)
        band.mode = detect_band_mode(band_lines, page_width, separators)
        bands.append(band)

    return merge_small_bands(bands, page_width, separators)


def detect_band_mode(lines: list[LayoutLine], page_width: float, separators: dict[str, list[float]]) -> str:
    if len(lines) < 3:
        return "full"

    verticals = [x for x in separators.get("vertical", []) if page_width * 0.32 < x < page_width * 0.68]
    text_gaps = infer_text_gaps(lines, page_width)
    split_candidates = verticals[:1] or text_gaps[:1] or [page_width / 2]
    split_x = split_candidates[0]

    left = [line for line in lines if line.center_x < split_x and line.width < page_width * 0.78]
    right = [line for line in lines if line.center_x >= split_x and line.width < page_width * 0.78]

    same_y_pairs = 0
    sorted_lines = sorted(lines, key=lambda item: (item.y0, item.x0))
    for i, line in enumerate(sorted_lines):
        for other in sorted_lines[i + 1:]:
            if abs(other.y0 - line.y0) > 3:
                break
            if line.center_x < split_x < other.center_x:
                same_y_pairs += 1

    if len(left) >= 2 and len(right) >= 2:
        return "twoColumn"
    if same_y_pairs >= 2:
        return "twoColumn"

    return "full"

def merge_small_bands(bands: list[LayoutBand], page_width: float, separators: dict[str, list[float]]) -> list[LayoutBand]:
    if not bands:
        return []

    merged: list[LayoutBand] = []
    for band in bands:
        if merged and band.height < 10 and band.mode == merged[-1].mode:
            merged[-1].y1 = band.y1
            merged[-1].lines.extend(band.lines)
        else:
            merged.append(band)

    for band in merged:
        band.mode = detect_band_mode(band.lines, page_width, separators)
    return merged


def order_band_lines(band: LayoutBand, page_width: float, separators: dict[str, list[float]]) -> list[LayoutLine]:
    lines = band.lines
    if band.mode != "twoColumn":
        for line in lines:
            line.col = "full"
        return sorted(lines, key=lambda item: (item.y0, item.x0))

    split_candidates = [x for x in separators.get("vertical", []) if page_width * 0.32 < x < page_width * 0.68]
    if not split_candidates:
        split_candidates = infer_text_gaps(lines, page_width)
    split_x = split_candidates[0] if split_candidates else page_width / 2

    leading_full: list[LayoutLine] = []
    left: list[LayoutLine] = []
    right: list[LayoutLine] = []
    trailing_full: list[LayoutLine] = []

    min_y = min(line.y0 for line in lines)
    max_y = max(line.y1 for line in lines)

    for line in lines:
        text = line.text.strip()
        is_major_full = bool(re.match(r"^(【|[0-9]{2}[.．]|■)", text))
        full_by_width = line.width >= page_width * 0.72

        if is_major_full or full_by_width:
            line.col = "full"
            if line.y0 <= min_y + 24:
                leading_full.append(line)
            elif line.y0 >= max_y - 24:
                trailing_full.append(line)
            elif line.center_x < split_x:
                line.col = "left"
                left.append(line)
            else:
                line.col = "right"
                right.append(line)
        elif line.center_x < split_x:
            line.col = "left"
            left.append(line)
        else:
            line.col = "right"
            right.append(line)

    ordered: list[LayoutLine] = []
    ordered.extend(sorted(leading_full, key=lambda item: (item.y0, item.x0)))
    ordered.extend(sorted(left, key=lambda item: (item.y0, item.x0)))
    ordered.extend(sorted(right, key=lambda item: (item.y0, item.x0)))
    ordered.extend(sorted(trailing_full, key=lambda item: (item.y0, item.x0)))
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

    with pdfplumber.open(str(pdf_path)) as plumber_doc:
        for page_index, page in enumerate(doc, start=1):
            page_width = float(page.rect.width)
            page_height = float(page.rect.height)
            lines = extract_page_lines(page, page_index)
            lines = remove_headers_footers(lines, page_height)
            separators = detect_ruling_lines(page)

            # pdfplumber line objects help detect vector rules that image morphology may miss.
            try:
                plumber_page = plumber_doc.pages[page_index - 1]
                for obj in plumber_page.lines:
                    y = float(obj.get("top", 0))
                    x0 = float(obj.get("x0", 0))
                    x1 = float(obj.get("x1", 0))
                    if abs(float(obj.get("height", 0))) < 3 and (x1 - x0) > page_width * 0.25:
                        separators["horizontal"].append(y)
                    x = float(obj.get("x0", 0))
                    h = abs(float(obj.get("bottom", 0)) - float(obj.get("top", 0)))
                    if h > page_height * 0.15:
                        separators["vertical"].append(x)
                separators["horizontal"] = dedupe_positions(separators["horizontal"], tolerance=4)
                separators["vertical"] = dedupe_positions(separators["vertical"], tolerance=4)
            except Exception:
                pass

            bands = split_lines_into_bands(lines, page_index, page_width, page_height, separators)
            page_lines: list[str] = []

            for band_index, band in enumerate(bands, start=1):
                ordered = order_band_lines(band, page_width, separators)
                if page_lines and page_lines[-1] != "":
                    page_lines.append("")

                debug_lines.append(
                    f"page={page_index} band={band_index} y={band.y0:.1f}-{band.y1:.1f} mode={band.mode} "
                    f"hLines={','.join(f'{v:.1f}' for v in separators.get('horizontal', [])[:8])} "
                    f"vLines={','.join(f'{v:.1f}' for v in separators.get('vertical', [])[:8])}"
                )

                previous_y: float | None = None
                for line in ordered:
                    if previous_y is not None and line.y0 - previous_y > 22:
                        page_lines.append("")
                    page_lines.append(line.text)
                    debug_lines.append(
                        f"  y={line.y0:.1f} x={line.x0:.1f} w={line.width:.1f} col={line.col} kind={line.kind} {line.text}"
                    )
                    previous_y = line.y0

            page_text = "\n".join(page_lines).strip()
            if page_text:
                pages_text.append(page_text)

    raw = "\n\n".join(pages_text)
    text = normalize_japanese_text(raw)

    return {
        "engine": "layout-analysis-pymupdf-pdfplumber-opencv",
        "text": text,
        "debug": "\n".join(debug_lines),
        "pages": len(doc),
    }



@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "engine": "layout-analysis-pymupdf-pdfplumber-opencv",
        "version": "0.6.6",
        "storage": "temporary-files-deleted-after-processing",
    }


@app.post("/api/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    preset: str = Form("scenario"),
    version: str = Form("0.6.6"),
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
            "privacy": {
                "stored": False,
                "temporary_file_deleted": True,
                "public_file_url_created": False,
            },
            "postprocess": {
                "removed_page_headers": True,
                "fixed_split_numbers": True,
                "coordinate_layout": True,
                "column_ordering": True,
                "ruling_line_detection": True,
                "band_layout": True,
                "same_y_column_split": True,
                "column_underline_ignored_as_band_break": True,
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
