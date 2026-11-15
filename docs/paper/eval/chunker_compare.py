"""VI-B: retrieval with the original chunker vs the corrected one, on the same files.

Each course's indexed files are re-parsed and chunked twice:
- original: 400 whitespace words, stride 340, copied verbatim from commit
  882f91e (`_chunk_blocks` in backend/app/services/ingestion.py);
- corrected: whole-word windows of at most 254 word pieces, overlap <= 60
  (the current `window_spans`).
Both go into separate in-memory Chroma collections (the real index is not
touched) with the same encoder, and the judged questions in questions/*.json
are scored with vector-only search: P@5 and MRR, 95% bootstrap intervals,
Wilcoxon p, paired by question. Also reports, per chunker, the share of stored
word pieces the encoder never sees (beyond its 256-position limit).

    backend/venv/Scripts/python.exe docs/paper/eval/chunker_compare.py
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
# backend/.env and the relative upload paths resolve from backend/.
os.chdir(ROOT / "backend")

import chromadb  # noqa: E402
from chromadb.utils import embedding_functions  # noqa: E402

from eval_stats import bootstrap_ci, wilcoxon  # noqa: E402
from retrieval_eval import K, metrics  # noqa: E402

from app.db.postgres import SessionLocal  # noqa: E402
from app.models import Course, Resource, User  # noqa: E402
from app.services.ingestion import ENCODER_MAX_PIECES, _piece_counts, parse_resource, window_spans  # noqa: E402

N_RESULTS = 12


def original_chunks(blocks) -> list[str]:
    """The first version's windows (commit 882f91e), text only."""
    target_tokens, overlap_tokens = 400, 60
    step = max(target_tokens - overlap_tokens, 1)
    out = []
    for block in blocks:
        tokens = block.raw_text.split()
        for start in range(0, len(tokens), step):
            window = tokens[start : start + target_tokens]
            if not window:
                break
            out.append(" ".join(window))
    return out


def corrected_chunks(blocks) -> list[str]:
    out = []
    for block in blocks:
        tokens = block.raw_text.split()
        out += [" ".join(tokens[s:e]) for s, e in window_spans(_piece_counts(tokens))]
    return out


def unembedded_share(passages: list[str]) -> float:
    total = cut = 0
    for text in passages:
        pieces = sum(_piece_counts(text.split()))
        total += pieces
        cut += max(0, pieces - ENCODER_MAX_PIECES)
    return cut / total if total else 0.0


def course_blocks(db, course) -> list:
    blocks = []
    for r in db.query(Resource).filter(Resource.course_id == course.id, Resource.processing_status == "indexed"):
        if "://" in r.storage_url or not Path(r.storage_url).is_file():
            continue
        blocks += parse_resource(r.storage_url, r.file_type)
    return blocks


def main() -> None:
    folder = Path(__file__).with_name("questions")
    items = [q for p in sorted(folder.glob("*.json")) if not p.name.startswith("EXAMPLE")
             for q in json.loads(p.read_text(encoding="utf-8"))]
    if not items:
        raise SystemExit(f"No question files in {folder}. See questions/README.md.")

    db = SessionLocal()
    client = chromadb.EphemeralClient()
    encoder = embedding_functions.DefaultEmbeddingFunction()
    collections, stats = {}, {"original": {"passages": 0, "cut": []}, "corrected": {"passages": 0, "cut": []}}
    for code in sorted({q["course_code"] for q in items}):
        course = (
            db.query(Course).join(User, User.id == Course.user_id)
            .filter(Course.code == code, User.role == "instructor").first()
        )
        if course is None:
            raise SystemExit(f"Course {code} not found")
        blocks = course_blocks(db, course)
        for name, chunker in (("original", original_chunks), ("corrected", corrected_chunks)):
            passages = chunker(blocks)
            stats[name]["passages"] += len(passages)
            stats[name]["cut"].append(unembedded_share(passages))
            col = client.get_or_create_collection(f"{name}_{code}".lower(), embedding_function=encoder,
                                                  metadata={"hnsw:space": "cosine"})
            if passages:
                col.add(ids=[str(i) for i in range(len(passages))], documents=passages)
            collections[(name, code)] = col
    db.close()

    scores = {name: {"p@5": [], "mrr": []} for name in ("original", "corrected")}
    for item in items:
        for name in scores:
            col = collections[(name, item["course_code"])]
            n = min(N_RESULTS, col.count())
            texts = col.query(query_texts=[item["question"]], n_results=n)["documents"][0] if n else []
            p, rr = metrics(texts, item["relevant_contains"])
            scores[name]["p@5"].append(p)
            scores[name]["mrr"].append(rr)

    report = {"questions": len(items), "k": K}
    for name, values in scores.items():
        report[name] = {"passages": stats[name]["passages"],
                        "unembedded_share_mean": round(sum(stats[name]["cut"]) / len(stats[name]["cut"]), 4)}
        for metric, xs in values.items():
            mean, low, high = bootstrap_ci(xs)
            report[name][metric] = {"mean": round(mean, 4), "ci95": [round(low, 4), round(high, 4)]}
    report["p_corrected_vs_original"] = {m: wilcoxon(scores["corrected"][m], scores["original"][m]) for m in ("p@5", "mrr")}
    Path(__file__).with_name("chunker_compare_results.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
