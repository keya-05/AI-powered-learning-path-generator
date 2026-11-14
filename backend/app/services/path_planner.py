"""Priority-weighted topological scheduling (Sec. IV, Algorithm 2).

`plan_path` is the pure algorithm, with no database access, so it can be
tested and evaluated directly (docs/paper/eval/path_eval.py). `build_plan`
gathers its inputs for one student and course.

Notation follows the paper: m mastery, e examination relevance, d dependency
share, h study hours, w priority (Eq. 7), B budget (Eq. 8), N needed set (Eq. 5).
"""

import heapq
import math
from collections import deque
from dataclasses import dataclass, field
from datetime import date
from typing import Hashable

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.knowledge_profile import StudentKnowledgeProfile
from app.models.resource import Resource
from app.models.user import User
from app.services.course_graph import load_graph

TAU = 0.6  # mastery threshold
ALPHA = 0.4  # weight of new evidence in Eq. (3); applied in services/assessments.py
M0 = 0.5  # prior for a concept never assessed
DEFAULT_HOURS = 2.0  # h_c when the syllabus lists no lecture hours

OBJECTIVE_WEIGHTS = {
    "exam": (0.5, 0.3, 0.2),
    "revision": (0.6, 0.2, 0.2),
    "new_subject": (0.4, 0.0, 0.6),
}


@dataclass
class PlanConcept:
    id: Hashable
    title: str
    unit: int = 1
    position: int = 0
    mastery: float | None = None  # None: not assessed (uses the prior M0)
    exam_relevance: float = 0.0  # e_c in [0, 1]
    hours: float = DEFAULT_HOURS  # h_c


@dataclass
class ScheduledStep:
    concept: PlanConcept
    order: int
    mastery: float
    exam_relevance: float
    dependency_share: float
    priority: float
    start_hour: float
    end_hour: float


@dataclass
class PlanResult:
    needed: list[Hashable]
    path: list[ScheduledStep]
    deferred: list[Hashable]
    extra_hours: float  # Delta
    used_hours: float
    budget: float | None
    weights: tuple[float, float, float]
    skipped_mastered: list[Hashable] = field(default_factory=list)
    priority: dict[Hashable, float] = field(default_factory=dict)
    dependency_share: dict[Hashable, float] = field(default_factory=dict)


def effective_weights(weights: tuple[float, float, float], exam_data: bool) -> tuple[float, float, float]:
    """With no past papers, e_c is undefined: drop lambda_2 and rescale (Sec. IV-F)."""
    l1, l2, l3 = weights
    if exam_data or l2 == 0:
        return weights
    rest = l1 + l3
    return (l1 / rest, 0.0, l3 / rest) if rest else (1.0, 0.0, 0.0)


def ancestors(targets: set, prerequisites: dict) -> set:
    """All direct and indirect prerequisites of the targets (reverse BFS)."""
    seen: set = set()
    queue = deque(targets)
    while queue:
        node = queue.popleft()
        for pre in prerequisites.get(node, ()):
            if pre not in seen:
                seen.add(pre)
                queue.append(pre)
    return seen


def plan_path(
    concepts: dict[Hashable, PlanConcept],
    prerequisites: dict[Hashable, set],
    *,
    targets: set | None = None,
    weights: tuple[float, float, float] = OBJECTIVE_WEIGHTS["exam"],
    budget: float | None = None,
    tau: float = TAU,
    prior: float = M0,
) -> PlanResult:
    """Algorithm 2. `prerequisites[a]` holds every b with a -> b (b before a).

    `budget=None` plans without a time limit. Ties in priority go to the
    earlier unit, then the earlier syllabus position, so plans are deterministic.
    """
    def m(cid) -> float:
        value = concepts[cid].mastery
        return prior if value is None else value

    goal = set(concepts) if not targets else {t for t in targets if t in concepts}
    scope = goal | ancestors(goal, prerequisites)
    scope &= set(concepts)
    needed = {c for c in scope if m(c) < tau}
    skipped = sorted((c for c in scope if c not in needed), key=lambda c: (concepts[c].unit, concepts[c].position))

    # Edges restricted to N.
    pre_n = {c: {p for p in prerequisites.get(c, ()) if p in needed} for c in needed}
    dep_n: dict[Hashable, set] = {c: set() for c in needed}
    for c, pres in pre_n.items():
        for p in pres:
            dep_n[p].add(c)

    def descendants(c) -> set:
        seen: set = set()
        stack = list(dep_n[c])
        while stack:
            node = stack.pop()
            if node not in seen:
                seen.add(node)
                stack.extend(dep_n[node])
        return seen

    desc = {c: descendants(c) for c in needed}
    denominator = len(needed) - 1
    d = {c: (len(desc[c]) / denominator if denominator > 0 else 0.0) for c in needed}
    exam_data = any(concepts[c].exam_relevance > 0 for c in concepts)
    l1, l2, l3 = effective_weights(weights, exam_data)
    w = {c: l1 * (1 - m(c)) + l2 * concepts[c].exam_relevance + l3 * d[c] for c in needed}

    def key(c):
        return (-round(w[c], 12), concepts[c].unit, concepts[c].position, concepts[c].title, str(c))

    indeg = {c: len(pre_n[c]) for c in needed}
    heap = [key(c) + (c,) for c in needed if indeg[c] == 0]
    heapq.heapify(heap)

    path: list[ScheduledStep] = []
    deferred: set = set()
    used = 0.0
    limit = math.inf if budget is None else budget
    while heap:
        c = heapq.heappop(heap)[-1]
        h = concepts[c].hours
        if used + h <= limit + 1e-9:
            path.append(
                ScheduledStep(
                    concept=concepts[c], order=len(path) + 1, mastery=m(c),
                    exam_relevance=concepts[c].exam_relevance, dependency_share=d[c],
                    priority=w[c], start_hour=used, end_hour=used + h,
                )
            )
            used += h
            for a in dep_n[c]:
                indeg[a] -= 1
                if indeg[a] == 0:
                    heapq.heappush(heap, key(a) + (a,))
        else:
            deferred |= {c} | desc[c]

    ordered_deferred = sorted(deferred, key=key)
    return PlanResult(
        needed=sorted(needed, key=key),
        path=path,
        deferred=ordered_deferred,
        extra_hours=sum(concepts[c].hours for c in deferred),
        used_hours=used,
        budget=budget,
        weights=(l1, l2, l3),
        skipped_mastered=skipped,
        priority=w,
        dependency_share=d,
    )


def violations(path: list[Hashable], prerequisites: dict, needed: set) -> int:
    """Number of (concept, needed prerequisite) pairs where the prerequisite comes later or is missing."""
    position = {c: i for i, c in enumerate(path)}
    count = 0
    for c in path:
        for p in prerequisites.get(c, ()):
            if p in needed and (p not in position or position[p] > position[c]):
                count += 1
    return count


# --------------------------------------------------------------------------
# Database wrapper
# --------------------------------------------------------------------------


def study_hours(unit: int, unit_hours: dict[int, float], unit_sizes: dict[int, int]) -> float:
    """h_c = H_u / |C_u|, or 2 h when the syllabus gives no hours for the unit."""
    hours = unit_hours.get(unit)
    if not hours or not unit_sizes.get(unit):
        return DEFAULT_HOURS
    return round(hours / unit_sizes[unit], 2)


def build_plan(
    db: Session,
    student: User,
    course: Course,
    *,
    objective: str = "exam",
    hours_per_day: float = 2.0,
    exam_date: date | None = None,
    target_units: list[int] | None = None,
    today: date | None = None,
) -> dict:
    graph = load_graph(db, course.id, with_links=True)
    mastery = {
        cid: float(score)
        for cid, score in db.query(StudentKnowledgeProfile.concept_id, StudentKnowledgeProfile.mastery_score).filter(
            StudentKnowledgeProfile.user_id == student.id,
            StudentKnowledgeProfile.concept_id.in_(list(graph.concepts)),
        )
    }
    unit_sizes: dict[int, int] = {}
    for concept in graph.concepts.values():
        unit_sizes[concept.unit_number] = unit_sizes.get(concept.unit_number, 0) + 1
    max_marks = max((c.exam_marks for c in graph.concepts.values()), default=0.0)

    plan_concepts = {
        cid: PlanConcept(
            id=cid,
            title=c.title,
            unit=c.unit_number,
            position=c.position,
            mastery=mastery.get(cid),
            exam_relevance=round(c.exam_marks / max_marks, 4) if max_marks > 0 else 0.0,
            hours=study_hours(c.unit_number, graph.unit_hours, unit_sizes),
        )
        for cid, c in graph.concepts.items()
    }

    today = today or date.today()
    days = max(0, (exam_date - today).days) if exam_date else None
    budget = round(hours_per_day * days, 2) if days is not None else None
    targets = (
        {cid for cid, c in graph.concepts.items() if c.unit_number in set(target_units)} if target_units else None
    )
    result = plan_path(
        plan_concepts,
        dict(graph.prerequisites),
        targets=targets,
        weights=OBJECTIVE_WEIGHTS[objective],
        budget=budget,
    )

    resource_names = {
        r.id: (r.file_name, r.resource_type)
        for r in db.query(Resource).filter(Resource.course_id == course.id, Resource.processing_status == "indexed")
    }
    scheduled = {step.concept.id for step in result.path}

    def materials(cid) -> list[dict]:
        # Teaching material first; past papers and the syllabus only name the topic.
        rank = {"notes": 0, "ppt": 0, "pyq": 1, "syllabus": 2}
        links = sorted(graph.links.get(cid, []), key=lambda l: (rank.get(l.resource_type, 1), -l.score))
        seen, out = set(), []
        teaching = any(l.resource_type in ("notes", "ppt") for l in links)
        for link in links:
            if link.resource_id in seen or link.resource_id not in resource_names:
                continue
            if teaching and link.resource_type == "syllabus":
                continue
            seen.add(link.resource_id)
            name, rtype = resource_names[link.resource_id]
            out.append({"resource_id": str(link.resource_id), "file_name": name, "resource_type": rtype})
            if len(out) == 3:
                break
        return out

    def prerequisite_view(cid) -> list[dict]:
        out = []
        for pid in sorted(graph.prerequisites.get(cid, ()), key=lambda p: (graph.concepts[p].unit_number, graph.concepts[p].position)):
            pm = mastery.get(pid)
            state = "mastered" if (pm if pm is not None else M0) >= TAU else ("scheduled" if pid in scheduled else "deferred")
            out.append({"concept_id": str(pid), "title": graph.concepts[pid].title, "state": state})
        return out

    def day_of(hour: float) -> int:
        return int(hour // hours_per_day) + 1

    steps = [
        {
            "order": s.order,
            "concept_id": str(s.concept.id),
            "title": s.concept.title,
            "unit_number": s.concept.unit,
            "mastery": mastery.get(s.concept.id),
            "mastery_used": round(s.mastery, 3),
            "exam_relevance": round(s.exam_relevance, 3),
            "dependency_share": round(s.dependency_share, 3),
            "priority": round(s.priority, 3),
            "hours": s.concept.hours,
            "start_hour": round(s.start_hour, 2),
            "end_hour": round(s.end_hour, 2),
            "start_day": day_of(s.start_hour),
            "end_day": day_of(max(s.start_hour, s.end_hour - 1e-6)),
            "prerequisites": prerequisite_view(s.concept.id),
            "materials": materials(s.concept.id),
        }
        for s in result.path
    ]
    deferred = [
        {
            "concept_id": str(cid),
            "title": plan_concepts[cid].title,
            "unit_number": plan_concepts[cid].unit,
            "hours": plan_concepts[cid].hours,
            "priority": round(result.priority[cid], 3),
            "is_target": targets is None or cid in targets,
        }
        for cid in result.deferred
    ]
    return {
        "course_id": str(course.id),
        "objective": objective,
        "hours_per_day": hours_per_day,
        "exam_date": exam_date.isoformat() if exam_date else None,
        "days_remaining": days,
        "budget_hours": budget,
        "used_hours": round(result.used_hours, 2),
        "extra_hours": round(result.extra_hours, 2),
        "weights": [round(x, 3) for x in result.weights],
        "tau": TAU,
        "target_units": target_units or [],
        "exam_data": max_marks > 0,
        "edge_count": len(graph.edges),
        "steps": steps,
        "deferred": deferred,
        "skipped_mastered": [
            {"concept_id": str(cid), "title": plan_concepts[cid].title, "mastery": mastery.get(cid)}
            for cid in result.skipped_mastered
        ],
    }
