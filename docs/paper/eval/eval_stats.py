"""Statistics used across the evaluation scripts (Sec. III-I): 95% bootstrap
confidence intervals and the Wilcoxon signed-rank test, without SciPy."""

import math
import random
import statistics


def bootstrap_ci(values: list[float], reps: int = 10_000, seed: int = 7) -> tuple[float, float, float]:
    """(mean, low, high) with a percentile 95% bootstrap interval."""
    if not values:
        return (float("nan"),) * 3
    rng = random.Random(seed)
    n = len(values)
    means = sorted(statistics.fmean(rng.choices(values, k=n)) for _ in range(reps))
    return statistics.fmean(values), means[int(0.025 * reps)], means[int(0.975 * reps) - 1]


def wilcoxon(x: list[float], y: list[float]) -> float | None:
    """Two-sided p-value of the Wilcoxon signed-rank test (normal approximation with
    tie and continuity correction; exact enumeration when there are at most 20 non-zero pairs)."""
    diffs = [a - b for a, b in zip(x, y) if a != b]
    n = len(diffs)
    if n == 0:
        return 1.0
    order = sorted(range(n), key=lambda i: abs(diffs[i]))
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and abs(diffs[order[j + 1]]) == abs(diffs[order[i]]):
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    w_plus = sum(r for r, d in zip(ranks, diffs) if d > 0)

    if n <= 20 and all(r == int(r) for r in ranks):
        # Exact null distribution of W+ by dynamic programming over integer ranks.
        total = n * (n + 1) // 2
        counts = [1] + [0] * total
        for r in (int(r) for r in ranks):
            for s in range(total, r - 1, -1):
                counts[s] += counts[s - r]
        observed = round(w_plus)
        tail = min(sum(counts[: observed + 1]), sum(counts[observed:]))
        return min(1.0, 2 * tail / 2**n)

    mean = n * (n + 1) / 4
    ties = {}
    for r in ranks:
        ties[r] = ties.get(r, 0) + 1
    variance = n * (n + 1) * (2 * n + 1) / 24 - sum(t**3 - t for t in ties.values()) / 48
    if variance <= 0:
        return 1.0
    z = (abs(w_plus - mean) - 0.5) / math.sqrt(variance)
    return math.erfc(z / math.sqrt(2))


def prf(predicted: set, gold: set) -> dict:
    tp = len(predicted & gold)
    p = tp / len(predicted) if predicted else 0.0
    r = tp / len(gold) if gold else 0.0
    f = 2 * p * r / (p + r) if p + r else 0.0
    return {"precision": round(p, 4), "recall": round(r, 4), "f1": round(f, 4), "tp": tp,
            "predicted": len(predicted), "gold": len(gold)}


def cohen_kappa(a: set, b: set, universe: int) -> float:
    """Agreement of two annotators' edge sets over `universe` candidate ordered pairs."""
    both = len(a & b)
    only_a, only_b = len(a - b), len(b - a)
    neither = universe - both - only_a - only_b
    po = (both + neither) / universe
    pa, pb = (both + only_a) / universe, (both + only_b) / universe
    pe = pa * pb + (1 - pa) * (1 - pb)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0
