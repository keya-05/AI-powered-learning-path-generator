# Annotation files for `graph_eval.py` (RQ1)

One JSON file per course, written by people who know the course. Files whose
name starts with `EXAMPLE` are ignored. Annotate before looking at the
system's output, so the gold set isn't anchored on it.

```json
{
  "course_code": "CS201",
  "annotators": ["initials A", "initials B"],
  "concepts": [
    {"title": "Linked lists", "unit": 1},
    {"title": "Stacks and queues", "unit": 2}
  ],
  "edges_annotator_a": [["Stacks and queues", "Linked lists"]],
  "edges_annotator_b": [["Stacks and queues", "Linked lists"]]
}
```

- `concepts` is the hand-labelled syllabus hierarchy (gold for extraction F1).
- Each edge is `[dependent, prerequisite]`: the first concept needs the second
  first. Titles must match `concepts` exactly. Annotators work independently;
  the gold set is the edges both marked, and Cohen's kappa is reported.
