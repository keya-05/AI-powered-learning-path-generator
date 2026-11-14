"""Before/after check of the two chunking defects described in Section VI-B.

Run from the repo root:
    backend/venv/Scripts/python.exe docs/paper/eval/chunking_check.py <pdf> [<pdf> ...]

For each PDF it parses pages exactly as ingestion does, then chunks them with
(a) the original loop (W=400, O=60 whitespace tokens, stride 340) and
(b) the current loop in app/services/ingestion.py (windows sized in encoder
word pieces). It reports, per chunker:
  - passages produced
  - passages longer than the encoder limit (254 word pieces + [CLS]/[SEP])
  - share of stored word pieces that fall past the limit (never embedded)
  - passages fully contained in the previous passage of the same block
It also runs a synthetic sweep over block lengths 1..1200 words.
Output is printed and written as JSON next to this script.
"""

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.ingestion import (  # noqa: E402
    ENCODER_MAX_PIECES,
    _parse_pdf,
    _piece_counts,
    window_spans,
)


def old_spans(n_words: int, target: int = 400, overlap: int = 60) -> list[tuple[int, int]]:
    # Verbatim logic of the original _chunk_blocks loop.
    spans = []
    step = max(target - overlap, 1)
    for start in range(0, n_words, step):
        end = min(start + target, n_words)
        if end <= start:
            break
        spans.append((start, end))
    return spans


def measure(blocks_counts: list[list[int]], spanner) -> dict:
    passages = over_limit = contained = 0
    pieces_total = pieces_lost = 0
    for counts in blocks_counts:
        spans = spanner(counts)
        prev = None
        for start, end in spans:
            passages += 1
            pieces = sum(counts[start:end])
            pieces_total += pieces
            if pieces > ENCODER_MAX_PIECES:
                over_limit += 1
                pieces_lost += pieces - ENCODER_MAX_PIECES
            if prev is not None and prev[0] <= start and end <= prev[1]:
                contained += 1
            prev = (start, end)
    return {
        "passages": passages,
        "passages_over_encoder_limit": over_limit,
        "share_over_limit": round(over_limit / passages, 4) if passages else None,
        "word_pieces_stored": pieces_total,
        "word_pieces_not_embedded": pieces_lost,
        "share_not_embedded": round(pieces_lost / pieces_total, 4) if pieces_total else None,
        "passages_contained_in_previous": contained,
    }


def main() -> None:
    results = {"encoder_max_content_pieces": ENCODER_MAX_PIECES, "documents": {}}
    for arg in sys.argv[1:]:
        blocks = _parse_pdf(arg)
        counts = [_piece_counts(b.raw_text.split()) for b in blocks]
        words = sum(len(c) for c in counts)
        results["documents"][Path(arg).name] = {
            "pages_with_text": len(blocks),
            "words": words,
            "word_pieces_per_word": round(sum(map(sum, counts)) / words, 3) if words else None,
            "before": measure(counts, lambda c: old_spans(len(c))),
            "after": measure(counts, window_spans),
        }

    # Synthetic sweep: every block length 1..1200, one word piece per word
    # (the best case for the old chunker), plus a seeded random piece mix.
    rng = random.Random(0)
    sweep_unit = [[1] * n for n in range(1, 1201)]
    sweep_mixed = [[rng.choice([1, 1, 1, 2, 3]) for _ in range(n)] for n in range(1, 1201)]
    results["synthetic_sweep"] = {
        "one_piece_per_word": {
            "before": measure(sweep_unit, lambda c: old_spans(len(c))),
            "after": measure(sweep_unit, window_spans),
        },
        "mixed_pieces_seed0": {
            "before": measure(sweep_mixed, lambda c: old_spans(len(c))),
            "after": measure(sweep_mixed, window_spans),
        },
    }

    print(json.dumps(results, indent=2))
    out = Path(__file__).with_name("chunking_check_results.json")
    out.write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
