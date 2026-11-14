"""RQ1: concept extraction and prerequisite edges against human annotation.

Needs one annotation file per course in docs/paper/eval/annotations/, written by
people, never generated (see annotations/README.md for the format). For each:

- Concept extraction: precision/recall/F1 of the heading-rule baseline and of
  the LLM extractor against the hand-labelled syllabus hierarchy. A predicted
  title matches a gold title when their normalised forms are equal or their
  word sets have Jaccard similarity >= 0.6 (one-to-one, greedy).
- Prerequisite edges: gold = edges both annotators marked; Cohen's kappa over
  all ordered pairs. Compared: the system's active edges (Eq. 1), "each unit
  precedes the next" (syllabus order) and embedding similarity alone.

    backend/venv/Scripts/python.exe docs/paper/eval/graph_eval.py [--no-llm]

The course must already be ingested and its graph built.
"""

import argparse
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
from app.services.concept_extraction import heading_rule_extract, llm_extract, syllabus_text  # noqa: E402
from app.services.llm import AIUnavailable  # noqa: E402
from app.services.text_match import embed, normalise  # noqa: E402

EMBEDDING_EDGE_THRESHOLD = 0.5


def _words(title: str) -> set[str]:
    return set(normalise(title).split())


def match_titles(predicted: list[str], gold: list[str]) -> set[tuple[str, str]]:
    pairs = []
    for p in predicted:
        for g in gold:
            if normalise(p) == normalise(g):
                score = 1.0
            else:
                a, b = _words(p), _words(g)
                score = len(a & b) / len(a | b) if a | b else 0.0
            if score >= 0.6:
                pairs.append((score, p, g))
    used_p, used_g, matched = set(), set(), set()
    for _, p, g in sorted(pairs, reverse=True):
        if p not in used_p and g not in used_g:
            used_p.add(p)
            used_g.add(g)
            matched.add((p, g))
    return matched


def concept_scores(predicted: list[str], gold: list[str]) -> dict:
    matched = match_titles(predicted, gold)
    tp = len(matched)
    p = tp / len(predicted) if predicted else 0.0
    r = tp / len(gold) if gold else 0.0
    return {"precision": round(p, 4), "recall": round(r, 4), "f1": round(2 * p * r / (p + r), 4) if p + r else 0.0,
            "predicted": len(predicted), "gold": len(gold)}


def evaluate(annotation: dict, use_llm: bool) -> dict:
    db = SessionLocal()
    course = (
        db.query(Course).join(User, User.id == Course.user_id)
        .filter(Course.code == annotation["course_code"], User.role == "instructor").first()
    )
    if course is None:
        raise SystemExit(f"Course {annotation['course_code']} not found")
    gold_titles = [c["title"] for c in annotation["concepts"]]
    text = syllabus_text(db, course)
    out: dict = {"course": course.code}

    heading = [t for u in heading_rule_extract(text) for t in u.concepts]
    out["extraction_heading_rules"] = concept_scores(heading, gold_titles)
    if use_llm:
        try:
            llm = [t for u in llm_extract(text) for t in u.concepts]
            out["extraction_llm"] = concept_scores(llm, gold_titles)
        except AIUnavailable as error:
            out["extraction_llm"] = f"unavailable: {error}"

    # Edges are compared on gold concept titles; system concepts are mapped onto them.
    concepts = db.query(Concept).filter(Concept.course_id == course.id).all()
    to_gold = {p: g for p, g in match_titles([c.title for c in concepts], gold_titles)}
    by_id = {c.id: to_gold.get(c.title) for c in concepts}
    a = {tuple(e) for e in annotation["edges_annotator_a"]}
    b = {tuple(e) for e in annotation["edges_annotator_b"]}
    gold = a & b
    n = len(gold_titles)
    out["annotator_kappa"] = round(cohen_kappa(a, b, n * (n - 1)), 4)
    out["gold_edges"] = len(gold)

    system = {
        (by_id[e.concept_id], by_id[e.prerequisite_id])
        for e in db.query(ConceptPrerequisite).filter(
            ConceptPrerequisite.course_id == course.id, ConceptPrerequisite.status == "active"
        )
        if by_id.get(e.concept_id) and by_id.get(e.prerequisite_id)
    }
    out["edges_proposed"] = prf(system, gold)

    unit = {c["title"]: c["unit"] for c in annotation["concepts"]}
    syllabus = {(x, y) for x in unit for y in unit if unit[y] == unit[x] - 1}
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-llm", action="store_true")
    args = parser.parse_args()
    folder = Path(__file__).with_name("annotations")
    files = sorted(p for p in folder.glob("*.json") if not p.name.startswith("EXAMPLE"))
    if not files:
        raise SystemExit(f"No annotation files in {folder}. See annotations/README.md.")
    results = [evaluate(json.loads(p.read_text(encoding="utf-8")), not args.no_llm) for p in files]
    Path(__file__).with_name("graph_eval_results.json").write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
