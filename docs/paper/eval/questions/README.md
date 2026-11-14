# Judged question sets for `retrieval_eval.py` (RQ3)

A JSON list per file; files whose name starts with `EXAMPLE` are ignored.
Write questions a student would ask, then mark relevance by listing short
phrases that only a relevant passage contains.

```json
[
  {
    "course_code": "CS201",
    "question": "Why does an AVL tree need rotations after insertion?",
    "relevant_contains": ["single or double rotation", "balance factor"]
  }
]
```

A retrieved passage is relevant when its text contains any phrase in
`relevant_contains` (case-insensitive). Phrases survive re-ingestion, which
changes passage ids.
