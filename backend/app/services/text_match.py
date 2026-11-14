"""Title matching shared by concept linking, co-occurrence and PYQ mapping."""

import re
from functools import lru_cache

import numpy as np

_NON_WORD = re.compile(r"[^a-z0-9+#]+")


def normalise(text: str) -> str:
    """Lower-case, punctuation to single spaces, '&' read as 'and'."""
    return " " + _NON_WORD.sub(" ", text.lower().replace("&", " and ")).strip() + " "


def title_variants(title: str) -> list[str]:
    """Normalised forms of a concept title to look for in passage text.

    "Stacks & Queues" -> " stacks and queues ", plus singular forms of the last
    word (" stacks and queue ") so "a queue" still counts as a mention, and,
    for titles with a parenthesised abbreviation, both the long form and the
    abbreviation alone when it is at least three characters ("BFS").
    """
    variants: set[str] = set()
    paren = re.search(r"\(([^)]{3,})\)", title)
    base = re.sub(r"\([^)]*\)", " ", title)
    for form in (base, paren.group(1) if paren else None):
        if not form:
            continue
        norm = normalise(form)
        if len(norm.strip()) < 3:
            continue
        variants.add(norm)
        words = norm.split()
        if words and words[-1].endswith("s") and len(words[-1]) > 3:
            variants.add(" " + " ".join(words[:-1] + [words[-1][:-1]]) + " ")
        if words and words[-1].endswith("ies") and len(words[-1]) > 4:
            variants.add(" " + " ".join(words[:-1] + [words[-1][:-3] + "y"]) + " ")
    return sorted(variants, key=len, reverse=True)


def mentions(normalised_text: str, variants: list[str]) -> bool:
    return any(v in normalised_text for v in variants)


def find_mentions(normalised_text: str, titles: dict) -> dict:
    """Spans (start, end) of each title in the text, longest titles claimed first.

    `titles` maps an id to its variants. A shorter title inside a longer one
    ("binary search" inside "binary search tree") is not counted, so the two
    concepts don't look like they co-occur, or share past-paper marks.
    """
    claimed: list[tuple[int, int]] = []
    found: dict = {}
    pairs = [(v, key) for key, variants in titles.items() for v in variants]
    for variant, key in sorted(pairs, key=lambda t: -len(t[0])):
        start = normalised_text.find(variant)
        while start >= 0:
            end = start + len(variant)
            # Variants start and end with a space; neighbours may share that space.
            if not any(start < c_end - 1 and c_start < end - 1 for c_start, c_end in claimed):
                claimed.append((start, end))
                found.setdefault(key, []).append((start, end))
            start = normalised_text.find(variant, start + 1)
    return found


@lru_cache
def _embedder():
    from chromadb.utils import embedding_functions

    return embedding_functions.DefaultEmbeddingFunction()


def embed(texts: list[str]) -> np.ndarray:
    """Unit-normalised all-MiniLM-L6-v2 embeddings (the same encoder as the vector index)."""
    if not texts:
        return np.zeros((0, 384), dtype=np.float32)
    vectors = np.asarray(_embedder()(texts), dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.maximum(norms, 1e-9)
