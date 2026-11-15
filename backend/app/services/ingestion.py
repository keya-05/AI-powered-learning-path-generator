import re
import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import fitz  # PyMuPDF
from pptx import Presentation
from sqlalchemy.orm import Session

from app.db.vector_store import get_chunk_collection
from app.models.resource import Resource


@dataclass
class ParentBlock:
    unit_number: int
    unit_title: str
    raw_text: str
    page_or_slide_no: int


def parse_resource(file_path: str, file_type: str) -> list[ParentBlock]:
    if file_type == "pdf":
        return _parse_pdf(file_path)
    if file_type == "pptx":
        return _parse_pptx(file_path)
    if file_type == "docx":
        return _parse_docx(file_path)
    raise ValueError(f"Unsupported file_type for parsing: {file_type}")


def _file_unit(file_path: str) -> int:
    """Unit named in the file name ("Lecture_2_UNIT_3.docx" -> 3), else 1."""
    return _infer_unit_number(Path(file_path).stem.replace("_", " "), fallback=1)


def _parse_pdf(file_path: str) -> list[ParentBlock]:
    blocks: list[ParentBlock] = []
    unit = _file_unit(file_path)
    with fitz.open(file_path) as doc:
        for page_index, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if not text:
                continue
            # A page that names no unit continues the previous page's unit.
            unit = _infer_unit_number(text, fallback=unit)
            blocks.append(
                ParentBlock(
                    unit_number=unit,
                    unit_title=_infer_unit_title(text, fallback=f"Page {page_index}"),
                    raw_text=text,
                    page_or_slide_no=page_index,
                )
            )
    return blocks


def _parse_pptx(file_path: str) -> list[ParentBlock]:
    blocks: list[ParentBlock] = []
    unit = _file_unit(file_path)
    presentation = Presentation(file_path)
    for slide_index, slide in enumerate(presentation.slides, start=1):
        text_fragments = [
            shape.text_frame.text.strip()
            for shape in slide.shapes
            if shape.has_text_frame and shape.text_frame.text.strip()
        ]
        if not text_fragments:
            continue
        combined_text = "\n".join(text_fragments)
        unit = _infer_unit_number(combined_text, fallback=unit)
        blocks.append(
            ParentBlock(
                unit_number=unit,
                unit_title=_infer_unit_title(combined_text, fallback=f"Slide {slide_index}"),
                raw_text=combined_text,
                page_or_slide_no=slide_index,
            )
        )
    return blocks


# A DOCX section ends at the next heading, or once it holds this many words
# (the chunker splits long sections into passages anyway).
_DOCX_SECTION_WORDS = 400


def _docx_lines(file_path: str) -> list[tuple[str, bool]]:
    """(text, is_heading) for every paragraph and table row, in document order.

    A table row becomes one line with its distinct cell texts joined by " | ",
    so a syllabus laid out as a table keeps its "Unit I | Title | (9 Hours)" rows.
    """
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = Document(file_path)
    lines: list[tuple[str, bool]] = []
    for child in document.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            paragraph = Paragraph(child, document)
            text = paragraph.text.strip()
            if text:
                style = (paragraph.style.name or "").lower() if paragraph.style is not None else ""
                lines.append((text, style.startswith(("heading", "title"))))
        elif tag == "tbl":
            for row in Table(child, document).rows:
                cells: list[str] = []
                for cell in row.cells:  # merged cells repeat; keep each text once
                    text = " ".join(cell.text.split())
                    if text and text not in cells:
                        cells.append(text)
                if cells:
                    lines.append((" | ".join(cells), False))
    return lines


def _parse_docx(file_path: str) -> list[ParentBlock]:
    blocks: list[ParentBlock] = []
    unit = _file_unit(file_path)
    section: list[str] = []
    words = 0

    def close() -> None:
        nonlocal unit, section, words
        if not section:
            return
        text = "\n".join(section)
        unit = _infer_unit_number(text, fallback=unit)
        blocks.append(
            ParentBlock(
                unit_number=unit,
                unit_title=_infer_unit_title(text, fallback=f"Section {len(blocks) + 1}"),
                raw_text=text,
                page_or_slide_no=len(blocks) + 1,
            )
        )
        section, words = [], 0

    for text, is_heading in _docx_lines(file_path):
        # A heading, or a syllabus row that opens a unit, starts a new section.
        if is_heading or _UNIT_PATTERN.match(text) or words >= _DOCX_SECTION_WORDS:
            close()
        section.append(text)
        words += len(text.split())
    close()
    return blocks


# "Unit 3", "UNIT-3", "Unit: 3", "Unit III". The number must follow the word
# "unit" directly, so a year or page number elsewhere in the block is ignored,
# and words that merely contain "unit" ("community", "units") don't match.
# Dashes include the en and em dash ("Unit – V"). "in unit" / "per unit" are
# counts, not labels ("Total Lectures in Unit: 3").
_UNIT_PATTERN = re.compile(
    r"(?<!\bin )(?<!\bper )\bunit\s*[-–—:.#]?\s*(\d{1,2}|[ivx]{1,4})\b", re.IGNORECASE
)
_ROMAN = {"i": 1, "v": 5, "x": 10}


def _roman_to_int(numeral: str) -> int:
    values = [_ROMAN[ch] for ch in numeral.lower()]
    return sum(-v if i + 1 < len(values) and v < values[i + 1] else v for i, v in enumerate(values))


def _infer_unit_number(text: str, fallback: int) -> int:
    match = _UNIT_PATTERN.search(text)
    if match is None:
        return fallback
    value = match.group(1)
    number = int(value) if value.isdigit() else _roman_to_int(value)
    return number if number >= 1 else fallback


def _infer_unit_title(text: str, fallback: str) -> str:
    first_line = text.splitlines()[0].strip() if text.splitlines() else ""
    return first_line[:150] or fallback


def ingest_resource(db: Session, resource: Resource) -> int:
    """
    Runs parsing -> chunking -> vector indexing for a single resource, marking
    its processing_status along the way. Returns the number of chunks indexed.
    The graph branch (concept extraction, links, prerequisite edges, exam
    weights) runs afterwards in app/services/course_graph.py.
    """
    resource.processing_status = "processing"
    db.commit()

    try:
        parent_blocks = parse_resource(resource.storage_url, resource.file_type)
        chunks = _chunk_blocks(resource, parent_blocks)
        if chunks:
            _index_chunks(chunks)
        resource.processing_status = "indexed"
        db.commit()
        return len(chunks)
    except Exception:
        resource.processing_status = "failed"
        db.commit()
        raise


# The default Chroma encoder (all-MiniLM-L6-v2) truncates at 256 word pieces,
# [CLS] and [SEP] included. Windows are sized in those word pieces so that no
# part of a passage is stored without being embedded.
ENCODER_MAX_PIECES = 256 - 2
OVERLAP_PIECES = 60


@lru_cache
def _word_piece_tokenizer():
    from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2

    encoder = ONNXMiniLM_L6_V2()
    encoder._download_model_if_not_exists()
    tokenizer = encoder.Tokenizer.from_file(
        str(Path(encoder.DOWNLOAD_PATH) / encoder.EXTRACTED_FOLDER_NAME / "tokenizer.json")
    )
    tokenizer.no_truncation()
    tokenizer.no_padding()
    return tokenizer


def _piece_counts(words: list[str]) -> list[int]:
    """Number of encoder word pieces each whitespace-delimited word becomes."""
    if not words:
        return []
    encoding = _word_piece_tokenizer().encode(words, is_pretokenized=True, add_special_tokens=False)
    counts = [0] * len(words)
    for word_id in encoding.word_ids:
        if word_id is not None:
            counts[word_id] += 1
    return [max(c, 1) for c in counts]


def window_spans(
    counts: list[int], max_pieces: int = ENCODER_MAX_PIECES, overlap_pieces: int = OVERLAP_PIECES
) -> list[tuple[int, int]]:
    """[start, end) word spans: each fits in `max_pieces`, consecutive spans share
    whole words worth at most `overlap_pieces`, and the loop stops once a span
    reaches the end of the block, so no span is contained in the previous one."""
    spans: list[tuple[int, int]] = []
    n = len(counts)
    start = 0
    while start < n:
        end, used = start, 0
        while end < n and used + counts[end] <= max_pieces:
            used += counts[end]
            end += 1
        if end == start:  # a single word longer than the budget
            end = start + 1
        spans.append((start, end))
        if end == n:
            break
        # Leave room for the next word so every span extends past the previous one.
        budget = min(overlap_pieces, max_pieces - counts[end])
        next_start, shared = end, 0
        while next_start - 1 > start and shared + counts[next_start - 1] <= budget:
            next_start -= 1
            shared += counts[next_start]
        start = next_start
    return spans


def _chunk_blocks(resource: Resource, parent_blocks: list[ParentBlock]) -> list[dict]:
    chunks: list[dict] = []
    for block in parent_blocks:
        tokens = block.raw_text.split()
        for start, end in window_spans(_piece_counts(tokens)):
            window = tokens[start:end]
            chunk_id = _deterministic_chunk_id(str(resource.id), block.page_or_slide_no, start)
            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "text": " ".join(window),
                    "course_id": str(resource.course_id),
                    "unit_id": f"{resource.course_id}:{block.unit_number}",
                    "resource_type": resource.resource_type,
                    "resource_id": str(resource.id),
                }
            )
    return chunks


def _deterministic_chunk_id(resource_id: str, block_offset: int, span_start: int) -> str:
    namespace = uuid.UUID("6f9619ff-8b86-d011-b42d-00cf4fc964ff")
    return str(uuid.uuid5(namespace, f"{resource_id}:{block_offset}:{span_start}"))


def _index_chunks(chunks: list[dict]) -> None:
    collection = get_chunk_collection()
    collection.upsert(
        ids=[c["chunk_id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        metadatas=[
            {
                "course_id": c["course_id"],
                "unit_id": c["unit_id"],
                "resource_type": c["resource_type"],
                "resource_id": c["resource_id"],
            }
            for c in chunks
        ],
    )
