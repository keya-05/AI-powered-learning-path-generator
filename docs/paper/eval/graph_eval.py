"""RQ1: concept extraction and prerequisite edges against a gold annotation.

Needs one annotation file per course in docs/paper/eval/annotations/ (format in
annotations/README.md). The file records who annotated; with one annotator,
Cohen's kappa is reported as null. For each course:

- Concept extraction: precision/recall/F1 of the heading-rule baseline and of
  the stored LLM extraction (the run the graph was built from) against the gold
  concept list, under a strict and a lenient title match (see JACCARD_MATCH,
  EMBEDDING_MATCH; one-to-one, greedy). Input is the syllabus, or the outline
  assembled from lecture notes when a course has none, as in the system.
- Prerequisite edges: gold = edges both annotators marked (or the single
  annotator's). Compared: the system's active edges (Eq. 1), "each unit
  precedes the next" (syllabus order) and embedding similarity alone.

    backend/venv/Scripts/python.exe docs/paper/eval/graph_eval.py

The course must already be ingested and its graph built.
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
# backend/.env and the relative Chroma and upload paths resolve from backend/.
os.chdir(ROOT / "backend")
sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_stats import cohen_kappa, prf  # noqa: E402

from app.db.postgres import SessionLocal  # noqa: E402
from app.models import Concept, ConceptPrerequisite, Course, User  # noqa: E402
from app.services.concept_extraction import heading_rule_extract, lecture_outline, syllabus_text  # noqa: E402
from app.services.text_match import embed, normalise  # noqa: E402

EMBEDDING_EDGE_THRESHOLD = 0.5


def _words(title: str) -> set[str]:
    return set(normalise(title).split())


# Fixed before any results were seen. Strict: equal after normalisation, or word
# Jaccard >= 0.6. Lenient adds embedding cosine >= 0.8 (same encoder as the
# index), since LLM-written titles often paraphrase the annotator's.
JACCARD_MATCH = 0.6
EMBEDDING_MATCH = 0.8


def match_titles(predicted: list[str], gold: list[str], lenient: bool = False) -> set[tuple[str, str]]:
    """One-to-one greedy matching of predicted to gold titles, best score first."""
    similarity = None
    if lenient and predicted and gold:
        similarity = embed(predicted) @ embed(gold).T
    pairs = []
    for i, p in enumerate(predicted):
        for j, g in enumerate(gold):
            if normalise(p) == normalise(g):
                score = 2.0
            else:
                a, b = _words(p), _words(g)
                score = len(a & b) / len(a | b) if a | b else 0.0
                if score < JACCARD_MATCH:
                    score = float(similarity[i, j]) if similarity is not None and similarity[i, j] >= EMBEDDING_MATCH else 0.0
            if score > 0:
                pairs.append((score, p, g))
    used_p, used_g, matched = set(), set(), set()
    for _, p, g in sorted(pairs, reverse=True):
        if p not in used_p and g not in used_g:
            used_p.add(p)
            used_g.add(g)
            matched.add((p, g))
    return matched


def concept_scores(predicted: list[str], gold: list[str]) -> dict:
    out = {"predicted": len(predicted), "gold": len(gold)}
    for name, lenient in (("strict", False), ("lenient", True)):
        tp = len(match_titles(predicted, gold, lenient))
        p = tp / len(predicted) if predicted else 0.0
        r = tp / len(gold) if gold else 0.0
        out[name] = {"precision": round(p, 4), "recall": round(r, 4),
                     "f1": round(2 * p * r / (p + r), 4) if p + r else 0.0, "tp": tp}
    return out


def evaluate(annotation: dict) -> dict:
    db = SessionLocal()
    course = (
        db.query(Course).join(User, User.id == Course.user_id)
        .filter(Course.code == annotation["course_code"], User.role == "instructor").first()
    )
    if course is None:
        raise SystemExit(f"Course {annotation['course_code']} not found")
    gold_titles = [c["title"] for c in annotation["concepts"]]
    # Same input the system used: the syllabus, or the lecture-notes outline without one.
    rule_text = syllabus_text(db, course)
    source = "syllabus"
    if not rule_text.strip():
        _, rule_text = lecture_outline(db, course)
        source = "lecture_outline"
    out: dict = {"course": course.code, "source": source, "annotators": annotation.get("annotators")}

    heading = [t for u in heading_rule_extract(rule_text) for t in u.concepts]
    out["extraction_heading_rules"] = concept_scores(heading, gold_titles)
    # The LLM extraction is scored as stored (the run the graph was built from), not re-run.
    concepts = db.query(Concept).filter(Concept.course_id == course.id).all()
    out["extraction_llm_stored"] = concept_scores([c.title for c in concepts if c.source == "extracted"], gold_titles)

    # Edges are compared on gold titles; system concepts are mapped with the lenient match.
    # System edges whose ends map to no gold concept can't be judged and are counted separately.
    to_gold = {p: g for p, g in match_titles([c.title for c in concepts], gold_titles, lenient=True)}
    by_id = {c.id: to_gold.get(c.title) for c in concepts}
    a = {tuple(e) for e in annotation["edges_annotator_a"]}
    b = {tuple(e) for e in annotation["edges_annotator_b"]} if annotation.get("edges_annotator_b") else None
    gold = a & b if b is not None else a
    n = len(gold_titles)
    out["annotator_kappa"] = round(cohen_kappa(a, b, n * (n - 1)), 4) if b is not None else None
    out["gold_edges"] = len(gold)

    active = db.query(ConceptPrerequisite).filter(
        ConceptPrerequisite.course_id == course.id, ConceptPrerequisite.status == "active"
    ).all()
    system = {(by_id[e.concept_id], by_id[e.prerequisite_id]) for e in active
              if by_id.get(e.concept_id) and by_id.get(e.prerequisite_id)}
    out["edges_proposed"] = prf(system, gold)
    out["system_edges_total"] = len(active)
    out["system_edges_unmappable"] = len(active) - sum(
        1 for e in active if by_id.get(e.concept_id) and by_id.get(e.prerequisite_id))

    unit = {c["title"]: c["unit"] for c in annotation["concepts"]}
    units = sorted(set(unit.values()))
    previous = {u: units[i - 1] for i, u in enumerate(units) if i > 0}
    syllabus = {(x, y) for x in unit for y in unit if previous.get(unit[x]) == unit[y]}
    out["edges_syllabus_order"] = prf(syllabus, gold)

    vectors = embed(gold_titles)
    similarity = vectors @ vectors.T
    embedding = {
        (gold_titles[i], gold_titles[j])
        for i in range(n) for j in range(n)
        if i != j and similarity[i, j] >= EMBEDDING_EDGE_THRESHOLD
        and (unit[gold_titles[j]], j) < (unit[gold_titles[i]], i)
    }
    out["edges_embedding_similarity"] = prf(embedding, gold)
    out["embedding_threshold"] = EMBEDDING_EDGE_THRESHOLD
    db.close()
    return out


def main() -> None:
    folder = Path(__file__).with_name("annotations")
    files = sorted(p for p in folder.glob("*.json") if not p.name.startswith("EXAMPLE"))
    if not files:
        raise SystemExit(f"No annotation files in {folder}. See annotations/README.md.")
    results = [evaluate(json.loads(p.read_text(encoding="utf-8"))) for p in files]
    Path(__file__).with_name("graph_eval_results.json").write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
