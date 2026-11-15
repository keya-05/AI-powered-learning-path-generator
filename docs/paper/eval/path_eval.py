"""RQ2 path checks for Algorithm 2 (backend/app/services/path_planner.py).

Three parts, all on constructed inputs (label them as test inputs in the paper,
never as learner data):

1. worked_example: reproduces Fig. 3 / Sec. IV-E and asserts every number.
2. random_profiles: random prerequisite DAGs with random mastery, exam
   relevance and effort. Compares the planner with syllabus-order revision
   (study every concept in unit order, stop when the budget runs out) on
   prerequisite-violation rate, share of mastered concepts included, and
   budget feasibility.
3. timing: planning time against |N|.

Run from the repository root:

    backend/venv/Scripts/python.exe docs/paper/eval/path_eval.py

Writes docs/paper/eval/path_eval_results.json.
"""

import json
import random
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))

sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_stats import bootstrap_ci, wilcoxon  # noqa: E402
from app.services.path_planner import PlanConcept, plan_path, violations  # noqa: E402

TAU = 0.6
SEED = 20261114


def worked_example() -> dict:
    rows = [
        ("Arrays & complexity", 1, 0.85, 0.10, 2),
        ("Linked lists", 1, 0.30, 0.20, 2),
        ("Stacks & queues", 2, 0.50, 0.40, 3),
        ("Binary trees", 3, 0.40, 0.60, 2),
        ("Binary search trees", 3, 0.20, 0.80, 3),
        ("AVL rotations", 3, 0.05, 0.90, 4),
    ]
    concepts = {
        t: PlanConcept(id=t, title=t, unit=u, position=i, mastery=m, exam_relevance=e, hours=h)
        for i, (t, u, m, e, h) in enumerate(rows)
    }
    pre = {
        "Linked lists": {"Arrays & complexity"},
        "Stacks & queues": {"Arrays & complexity"},
        "Binary trees": {"Linked lists", "Stacks & queues"},
        "Binary search trees": {"Binary trees"},
        "AVL rotations": {"Binary search trees"},
    }
    result = plan_path(concepts, pre, targets={"AVL rotations"}, budget=10, weights=(0.5, 0.3, 0.2))
    order = [s.concept.id for s in result.path]
    assert order == ["Linked lists", "Stacks & queues", "Binary trees", "Binary search trees"], order
    assert result.deferred == ["AVL rotations"] and result.extra_hours == 4
    expected = {"Linked lists": 0.56, "Stacks & queues": 0.52, "Binary trees": 0.58,
                "Binary search trees": 0.69, "AVL rotations": 0.745}
    for cid, w in expected.items():
        assert abs(result.priority[cid] - w) < 1e-9, (cid, result.priority[cid])
    return {
        "order": order,
        "priority": {k: round(v, 4) for k, v in result.priority.items()},
        "dependency_share": {k: round(v, 4) for k, v in result.dependency_share.items()},
        "deferred": result.deferred,
        "extra_hours": result.extra_hours,
        "matches_paper": True,
    }


def random_course(rng: random.Random, n: int, units: int = 5, edge_p: float = 0.08,
                  shuffle: bool = True, moved_share: float = 0.15):
    """A DAG whose edges point to earlier concepts; 15% of edges cross units backwards
    in syllabus order, as when a syllabus lists a topic before something it needs."""
    concepts = {}
    for i in range(n):
        unit = 1 + i * units // n
        mastered = rng.random() < 0.35
        concepts[i] = PlanConcept(
            id=i, title=f"c{i}", unit=unit, position=i,
            mastery=None if rng.random() < 0.2 else (rng.uniform(TAU, 1.0) if mastered else rng.uniform(0, TAU)),
            exam_relevance=rng.random() ** 2,
            hours=rng.choice([1.0, 1.5, 2.0, 2.5, 3.0]),
        )
    pre: dict[int, set] = {i: set() for i in range(n)}
    for a in range(n):
        for b in range(a):
            if rng.random() < edge_p * (1.0 if concepts[a].unit - concepts[b].unit <= 1 else 0.3):
                pre[a].add(b)
    # Shuffle syllabus position inside each unit so syllabus order isn't a topological order.
    for unit in range(1, units + 1 if shuffle else 1):
        members = [c for c in concepts.values() if c.unit == unit]
        positions = [c.position for c in members]
        rng.shuffle(positions)
        for c, p in zip(members, positions):
            c.position = p
    for a in range(n):
        if pre[a] and moved_share and rng.random() < moved_share:
            b = max(pre[a])
            if concepts[b].unit < units:
                concepts[b].unit = min(units, concepts[a].unit + 1)  # prerequisite listed in a later unit
    return concepts, pre


def syllabus_order(concepts, budget):
    """Baseline: every concept in (unit, position) order, mastered or not, until the budget runs out."""
    path, used = [], 0.0
    for c in sorted(concepts.values(), key=lambda c: (c.unit, c.position)):
        if used + c.hours > budget:
            break
        path.append(c.id)
        used += c.hours
    return path


def random_profiles(trials: int = 200, shuffle: bool = True, moved_share: float = 0.15) -> dict:
    rng = random.Random(SEED)
    rows = []
    for _ in range(trials):
        n = rng.randint(15, 80)
        concepts, pre = random_course(rng, n, shuffle=shuffle, moved_share=moved_share)
        total = sum(c.hours for c in concepts.values())
        budget = round(total * rng.uniform(0.2, 0.8), 1)
        result = plan_path(concepts, pre, budget=budget)
        needed = set(result.needed)
        mastered = {c for c, v in concepts.items() if (0.5 if v.mastery is None else v.mastery) >= TAU}
        proposed = [s.concept.id for s in result.path]
        baseline = syllabus_order(concepts, budget)

        def rates(path):
            pairs = sum(1 for c in path for p in pre[c] if p in needed)
            return {
                "violation_rate": violations(path, pre, needed) / pairs if pairs else 0.0,
                "mastered_included": sum(c in mastered for c in path) / len(path) if path else 0.0,
                "needed_covered": len(set(path) & needed) / len(needed) if needed else 1.0,
                "hours": sum(concepts[c].hours for c in path),
            }

        p, b = rates(proposed), rates(baseline)
        assert p["hours"] <= budget + 1e-9
        rows.append({"n": n, "budget": budget, "proposed": p, "baseline": b})

    def summary(key, metric):
        values = [r[key][metric] for r in rows]
        mean, low, high = bootstrap_ci(values)
        return {"mean": round(mean, 4), "ci95": [round(low, 4), round(high, 4)], "max": round(max(values), 4)}

    def paired_p(metric):
        return wilcoxon([r["proposed"][metric] for r in rows], [r["baseline"][metric] for r in rows])

    return {
        "trials": trials,
        "seed": SEED,
        "note": "Constructed DAGs and mastery profiles; test inputs, not learner data.",
        "proposed": {m: summary("proposed", m) for m in ("violation_rate", "mastered_included", "needed_covered")},
        "syllabus_order": {m: summary("baseline", m) for m in ("violation_rate", "mastered_included", "needed_covered")},
        "wilcoxon_p": {m: paired_p(m) for m in ("violation_rate", "mastered_included", "needed_covered")},
        "budget_exceeded": sum(r["proposed"]["hours"] > r["budget"] + 1e-9 for r in rows),
        "generator": {"shuffle_within_units": shuffle, "prerequisites_moved_later": moved_share},
    }


def baseline_sensitivity() -> list[dict]:
    """Syllabus-order baseline under three amounts of syllabus disorder; the planner is unaffected."""
    out = []
    for label, shuffle, moved in (
        ("syllabus order is a topological order", False, 0.0),
        ("positions shuffled within units", True, 0.0),
        ("shuffled, 15% of prerequisites listed in a later unit", True, 0.15),
    ):
        res = random_profiles(shuffle=shuffle, moved_share=moved)
        out.append({
            "setting": label,
            "baseline_violation_rate": res["syllabus_order"]["violation_rate"]["mean"],
            "baseline_mastered_included": res["syllabus_order"]["mastered_included"]["mean"],
            "proposed_violation_rate": res["proposed"]["violation_rate"]["mean"],
            "proposed_mastered_included": res["proposed"]["mastered_included"]["mean"],
        })
    return out


def timing() -> list[dict]:
    rng = random.Random(SEED + 1)
    out = []
    for n in (10, 25, 50, 100, 200, 400):
        concepts, pre = random_course(rng, n, units=8, edge_p=min(0.08, 6 / n))
        for c in concepts.values():
            c.mastery = rng.uniform(0, TAU - 0.01)  # all needed, so |N| = n
        samples = []
        for _ in range(7):
            start = time.perf_counter()
            plan_path(concepts, pre, budget=None)
            samples.append(time.perf_counter() - start)
        out.append({"needed": n, "edges": sum(len(v) for v in pre.values()),
                    "median_ms": round(statistics.median(samples) * 1000, 3)})
    return out


def main() -> None:
    results = {
        "worked_example": worked_example(),
        "random_profiles": random_profiles(),
        "baseline_sensitivity": baseline_sensitivity(),
        "timing": timing(),
    }
    out = Path(__file__).with_name("path_eval_results.json")
    out.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
