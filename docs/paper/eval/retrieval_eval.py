"""RQ3 retrieval: P@5 and MRR of BM25, vector-only and hybrid RRF retrieval.

Needs a judged question set written by people: docs/paper/eval/questions/*.json
(format in questions/README.md). A retrieved passage counts as relevant when
its text contains any of the question's `relevant_contains` phrases
(case-insensitive), which survives re-ingestion, unlike passage ids.

    backend/venv/Scripts/python.exe docs/paper/eval/retrieval_eval.py

Reports means with 95% bootstrap intervals and Wilcoxon p-values of each
method against BM25, paired by question.
"""

import json
import os
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
# backend/.env and the relative Chroma and upload paths resolve from backend/.
os.chdir(ROOT / "backend")
sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_stats import bootstrap_ci, wilcoxon  # noqa: E402

from app.db.postgres import SessionLocal  # noqa: E402
from app.models import Course, User  # noqa: E402
from app.services.prerequisites import course_passages  # noqa: E402
from app.services.retrieval import hybrid_retrieve, vector_search  # noqa: E402

K = 5
_TOKEN = re.compile(r"[a-z0-9]+")


def tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


class BM25:
    """Okapi BM25 (k1 = 1.5, b = 0.75) over one course's passages."""

    def __init__(self, docs: list[str], k1: float = 1.5, b: float = 0.75):
        self.docs = [tokens(d) for d in docs]
        self.k1, self.b = k1, b
        self.avg = sum(map(len, self.docs)) / max(len(self.docs), 1)
        df = Counter(t for d in self.docs for t in set(d))
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        self.tf = [Counter(d) for d in self.docs]

    def rank(self, query: str) -> list[int]:
        q = tokens(query)
        scores = []
        for i, (tf, doc) in enumerate(zip(self.tf, self.docs)):
            s = 0.0
            for t in q:
                if t in tf:
                    f = tf[t]
                    s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * len(doc) / self.avg))
            scores.append((s, i))
        return [i for s, i in sorted(scores, reverse=True) if s > 0]


def relevant(text: str, phrases: list[str]) -> bool:
    """Case- and whitespace-insensitive: stored passages collapse whitespace."""
    low = " ".join(text.lower().split())
    return any(" ".join(p.lower().split()) in low for p in phrases)


def metrics(texts: list[str], phrases: list[str]) -> tuple[float, float]:
    hits = [relevant(t, phrases) for t in texts]
    p_at_k = sum(hits[:K]) / K
    rr = next((1 / (i + 1) for i, h in enumerate(hits) if h), 0.0)
    return p_at_k, rr


def main() -> None:
    folder = Path(__file__).with_name("questions")
    files = sorted(p for p in folder.glob("*.json") if not p.name.startswith("EXAMPLE"))
    if not files:
        raise SystemExit(f"No question files in {folder}. See questions/README.md.")
    db = SessionLocal()
    scores: dict[str, dict[str, list[float]]] = {m: {"p@5": [], "mrr": []} for m in ("bm25", "vector", "hybrid")}
    indexes: dict = {}
    for path in files:
        for item in json.loads(path.read_text(encoding="utf-8")):
            course = (
                db.query(Course).join(User, User.id == Course.user_id)
                .filter(Course.code == item["course_code"], User.role == "instructor").first()
            )
            if course is None:
                raise SystemExit(f"Course {item['course_code']} not found")
            if course.id not in indexes:
                passages = course_passages(course.id)
                indexes[course.id] = (passages, BM25([p.text for p in passages]))
            passages, bm25 = indexes[course.id]
            ranked = {
                "bm25": [passages[i].text for i in bm25.rank(item["question"])[:12]],
                "vector": [r.text for r in vector_search(item["question"], [str(course.id)])],
                "hybrid": [r.text for r in hybrid_retrieve(db, item["question"], [course.id])],
            }
            for method, texts in ranked.items():
                p, rr = metrics(texts, item["relevant_contains"])
                scores[method]["p@5"].append(p)
                scores[method]["mrr"].append(rr)
    db.close()

    report = {"questions": len(scores["bm25"]["p@5"]), "k": K}
    for method, values in scores.items():
        report[method] = {}
        for metric, xs in values.items():
            mean, low, high = bootstrap_ci(xs)
            entry = {"mean": round(mean, 4), "ci95": [round(low, 4), round(high, 4)]}
            if method != "bm25":
                entry["p_vs_bm25"] = wilcoxon(xs, scores["bm25"][metric])
            report[method][metric] = entry
    Path(__file__).with_name("retrieval_eval_results.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
