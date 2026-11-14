# Paper updates from the codebase (2026-11-14)

> **Update, later on 2026-11-14:** the components this file lists as planned
> (graph writer, concept extraction, prerequisite edges, hybrid RRF retrieval,
> situation-specific diagnostics, path planner) are now implemented, and the
> `for_class` bug in 1.5 is fixed. Section 4 at the end supersedes 1.4, the
> "not yet implemented" sentence of 1.5, and the P rows of 1.8. Neo4j has since
> been removed entirely (the graph is stored in PostgreSQL), so every Neo4j
> mention in sections 1-3 is out of date; 4.8 lists the paper text to change.

`docs/paper/research_paper.tex` is not in the repo, and no LaTeX distribution is
installed on this machine, so nothing here has been applied or compiled. Each
block below is ready to paste into the `.tex`, replacing the quoted original.
Line references are to the working tree on 2026-11-14.

## 1. Corrections: paper text that no longer matches the code

### 1.1 Who uploads (Sec. III-B, III-C)
Code: instructors create and upload to their courses. Students enroll through
their school's catalog or a join code, and can also create a private subject
of their own and upload to it (`backend/app/api/courses.py:56-93`,
`backend/app/api/resources.py:42`).

III-B, replace "Instructors create a course workspace ... path and assistant." with:
```latex
Instructors create a course workspace and upload its syllabus, slides, notes
and previous-year question papers (PYQs). Students enroll in instructor courses
through their school's catalog or a join code, and receive a personal profile,
path and assistant; a student can also create a private subject from their own
files, which only that student sees.
```
III-C, "is tagged by the instructor as" becomes "is tagged by the course owner as".

### 1.2 Unit heuristic (Sec. III-C): code changed, see Section 3
Replace "The unit number is inferred heuristically: when a block mentions
``unit'', the first integer token ... defaults to Unit~1." with:
```latex
The unit number is inferred heuristically: when the word ``unit'' is followed
directly by a number in digits or Roman numerals (``Unit 3'', ``UNIT-IV''),
that number is the block's unit; otherwise the block defaults to Unit~1.
```

### 1.3 Chunking (Sec. III-C): code changed, see Section 3
Replace the paragraph "Blocks are split into overlapping windows of $W=400$ ...
without a lookup table." with:
```latex
Blocks are split into overlapping windows of whole whitespace-delimited words.
A window grows until it holds $W = 254$ word pieces of the embedding model's
tokenizer, which together with the \texttt{[CLS]} and \texttt{[SEP]} tokens is
the encoder's input limit of 256 (Section~\ref{sec:indexing}), so every stored
passage is embedded in full. Consecutive windows share whole words worth at
most $O = 60$ word pieces, which preserves definitions that cross a window
boundary, and the loop stops once a window reaches the end of its block, so no
passage is contained in the one before it. Every passage receives a
deterministic identifier, a version-5 UUID of the string
\textit{resource\_id:block\_offset:span\_start}, so re-ingesting a file
updates passages in place instead of duplicating them, and the graph branch can
refer to the same passage without a lookup table.
```
(Adjust `\ref{sec:indexing}` to the label of III-D.) Source:
`backend/app/services/ingestion.py` (`ENCODER_MAX_PIECES`, `OVERLAP_PIECES`,
`window_spans`). The 256 limit is set in chromadb's encoder:
`venv/.../chromadb/utils/embedding_functions/onnx_mini_lm_l6_v2.py:213`.

### 1.4 Graph branch is not implemented (Fig. 1, Sec. III-D, Table II)
No application code writes to Neo4j. `backend/app/db/neo4j_client.py` creates a
driver that nothing calls. The schema exists only as `docs/GRAPH_SCHEMA.cypher`.
The `graph_indexing.py` named in the `ingest_resource` docstring does not exist.
Concepts are not extracted: the course creator types topics with unit numbers,
and these go into the `concepts` table (`backend/app/api/courses.py:90-91`).

- Fig. 1: draw the Neo4j box dashed, like the extraction box.
- Fig. 1 caption: "while the graph branch writes" becomes "while the graph
  branch, once implemented, writes".
- III-D, start of "Graph branch." paragraph, replace the first two sentences with:
```latex
\textit{Graph branch.} Fig.~\ref{fig:datamodel} shows the data model, defined
as a Cypher schema with uniqueness constraints; the writer that populates it is
specified here and under implementation. At present the course creator enters
each course's topics with their unit numbers, and these populate the relational
\textit{concepts} table. The planned extractor calls an LLM with a fixed
function schema to read the syllabus and return concept titles grouped by unit;
the writer merges \textit{Course}, \textit{Unit} and \textit{Concept} nodes and
links each concept to the passages it was extracted from.
```

### 1.5 Assessment is implemented, but not as III-E describes
Code (`backend/app/services/assessments.py`): the LLM writes four-option
multiple-choice practice papers grounded in two retrieved passages per concept.
`weak_focus` mode gives concept $c$ a share proportional to
$\exp(-7 m_c)$ (line 42), with unassessed concepts counted as 0.5 (line 39).
Shares are capped at 40% per concept (line 44) and rounded by largest
remainder. `balanced` mode splits questions equally. Instructor class
assignments always use balanced mode (line 100). The mastery update is Eq. (2)
with $\alpha=0.4$ (line 46) and $m_0=0.5$ (lines 39, 407-408). The
new-subject / revision / exam-preparation diagnostics do not exist.

Replace the first paragraph of III-E ("What a diagnostic tests ... through (2).") with:
```latex
Students generate practice papers of four-option multiple-choice questions,
written by the LLM from the course's indexed passages (two per concept) and the
student's current mastery of each concept. Two modes decide how many questions
each concept receives. In balanced mode every selected concept receives an
equal share. In weak-focus mode concept $c$ receives a share proportional to
$e^{-\kappa m_c}$ with $\kappa = 7$, an unassessed concept counts as
$m_c = 0.5$, no concept receives more than 40\% of the paper, and shares are
rounded to whole questions by the largest-remainder method. Instructors can
also assign one paper to a class, spread evenly over the selected concepts.
Grading a submitted paper updates per-concept mastery $m_c$ through (2).
Situation-specific diagnostics, with prerequisite questions for a new subject,
short recall questions for revision and examination-weighted questions for
examination preparation, are specified but not yet implemented.
```
Possible section title change: "Situation-Specific Assessment and Gap Detection"
to "Assessment and Gap Detection".

**Bug:** `assessments.py:332` calls `_call_model(course, topics, for_class=...)`, but
`_call_model` (line 238) takes no `for_class` argument. Every paper and
assignment generation raises `TypeError` before reaching the model. Fix this
before calling the feature implemented.

### 1.6 Assistant (Sec. III-F, Table II)
Verified unchanged: top-6 passages (`assistant.py:37`), last 8 turns of at most
2000 chars (lines 38-39), JSON schema with `in_scope` (lines 104-127),
server-side fixed refusal on refusal, out-of-scope or empty answers (lines 287-288, 298-299),
citations filtered to retrieved passages and deduplicated by
file (lines 301-315), and a second course filter in code (line 195).

New behaviour to add to III-F, after "...and returns no sources.":
```latex
For a subject a student created from their own files, the assistant answers
only from those files: the server replaces any answer about such a subject
that cites no passage with a fixed message saying the uploaded material does
not cover the question.
```
Source: `assistant.py:318-331`.

Model: `claude-opus-5-5` (`backend/app/core/config.py:24`), effort `medium`,
`max_tokens` 16000. Calls also enable server-side fallback (`assistant.py:269-270`),
so a different model can answer if the primary one is unavailable. For
evaluation runs, record `response.model` per call, or turn fallback off.

### 1.7 Verified, no change needed
25 MB cap (`config.py:20`, `storage.py:62`). Resource types
syllabus/pyq/notes/ppt (`resources.py:26`). File formats PDF, PPTX, DOCX
(`storage.py:10-14`). PyMuPDF, python-pptx and unstructured (`ingestion.py`).
UUIDv5 chunk IDs. Chroma `DefaultEmbeddingFunction` (all-MiniLM-L6-v2, ONNX),
cosine HNSW (`vector_store.py:21`). Mastery gap < 0.6 (`api/analytics.py:29`),
strong >= 0.8 (`frontend/src/lib/mastery.js:3`). Neo4j labels and relationship
types match `docs/GRAPH_SCHEMA.cypher`. Python 3.12, FastAPI, SQLAlchemy 2.0,
React 18, Vite, Tailwind CSS, bcrypt (`requirements.txt`, `frontend/package.json`).

### 1.8 Table II, updated rows
```latex
Chunking & $\le$254 word pieces, overlap $\le$60; UUIDv5 identifiers & I \\
Assistant & Anthropic \texttt{claude-opus-5-5} via API; JSON schema; top-6 passages; 8-turn history & I \\
Graph store & Neo4j 5; Cypher schema with uniqueness constraints; no writer yet & P \\
Concepts & entered by the course creator, with unit numbers & I \\
Concept extraction & LLM function calling & P \\
Prerequisite edges & three signals, instructor review, cycle removal & P \\
Assessment & LLM-written MCQ papers; weak-focus/balanced; update (2) & I \\
Situation-specific diagnostics & new subject / revision / exam modes & P \\
Hybrid retrieval & RRF, $k_{\text{rrf}}=60$, top-8 & P \\
Path planner & Algorithm~2 & P \\
```
Abstract, "We implement the ingestion pipeline, vector indexing, scoped
assistant and mastery analytics" should add "practice assessments with mastery
updates".

## 2. TODOs resolved

**IV-B parameters (partial).** Replace the TODO with the line below and keep a
smaller TODO for the rest:
```latex
The implemented mastery update uses $\alpha = 0.4$ and $m_0 = 0.5$, and the
analytics layer uses $\tau = 0.6$. \todo{Values of $\lambda_1,\lambda_2,\lambda_3$
per objective and how $h_c$ is estimated.}
```
Sources: `assessments.py:46`, `assessments.py:39`, `api/analytics.py:29`.

**III-G hardware (partial).** Replace the TODO with:
```latex
Measurements were run on a laptop with an Intel Core i3-1005G1 processor
(2 cores, 4 threads, 1.2\,GHz base), 11.7\,GB of usable memory and no
discrete GPU, under Windows 10 Home (build 19045) with Python 3.12.10,
Chroma 1.0.21, tokenizers 0.23.3 and PyMuPDF 1.24.10. The assistant uses
Anthropic's \texttt{claude-opus-5-5} model. \todo{Date of the LLM evaluation runs.}
```
Sources: `Get-CimInstance Win32_Processor / Win32_ComputerSystem /
Win32_VideoController / Win32_OperatingSystem`, and version imports in
`backend/venv`. Hardware was measured on 2026-11-14.

**VI-B before/after (partial, structural only).** Replace the VI-B paragraph with:
```latex
Two defects in the first version of the chunker bore on retrieval quality.
First, windows were built from $W = 400$ whitespace tokens, whereas the
default embedding model truncates its input at 256 word pieces, so the tail of
most passages was stored and returned to the LLM but never embedded and could
not influence retrieval. Second, because the window loop advanced by the
stride $S = 340$ until it passed the end of a block, a block of 341--400
tokens produced a second passage entirely contained in the first.
Section~\ref{sec:ingestion} describes the corrected chunker. Over every block
length from 1 to 1200 words, at one word piece per word, which is the most
favourable case for the original chunker, the original left 28.9\% of stored
word pieces unembedded and produced 180 passages contained in their
predecessor; the corrected chunker produces none of either. \todo{Retrieval
P@5 and MRR before and after the correction.} The unit heuristic was also
tightened: the original rule took the first integer in any block that
mentioned ``unit'', so a year or page number could set the unit, whereas the
current rule reads only a number that directly follows the word.
```
Source: `docs/paper/eval/chunking_check.py`, output in
`docs/paper/eval/chunking_check_results.json` (`synthetic_sweep.one_piece_per_word`).

## 3. Code changes made (`backend/app/services/ingestion.py`)
- Windows are sized in encoder word pieces (at most 254), using the cached
  tokenizer from chromadb's own encoder. Before: 400 whitespace tokens.
- Overlap is at most 60 word pieces of whole words, reduced when needed so
  every window extends past the previous one.
- The window loop stops once a window reaches the end of its block.
- Unit regex: `\bunit\s*[-:.#]?\s*(\d{1,2}|[ivx]{1,4})\b`, case-insensitive.
  Words like "community" and "units" no longer match. Before: the first integer
  anywhere in a block containing the substring "unit".
- Verified: an invariant test over 5,000 random blocks (spans cover the block,
  strictly advance, never exceed the budget except for single oversized words),
  10 unit-string cases, and an end-to-end `_chunk_blocks` run on a 9-page PDF.
- The one existing Chroma chunk was built by the old chunker. Re-ingest any
  real material before evaluating.


## 4. Implemented after this file was first written (2026-11-14)

Values below are read from the code; file references are to `backend/app/`.

### 4.1 Graph branch (Sec. III-D, Fig. 1, Table II)
- **Store.** Neo4j has been removed from the system. The curriculum graph is
  stored in PostgreSQL (`models/graph.py`): `course_units` (unit number, title,
  lecture hours), `prerequisite_edges` (one row per edge with its three
  signals, confidence, evidence, source and status), `concept_passages`
  (EXTRACTED_FROM: concept id, Chroma passage id, score) and
  `course_graph_status`. Traversals (ancestors, descendants, cycle detection,
  Kahn's algorithm) run in Python after one query per table, which is cheap at
  tens to hundreds of concepts per course. See 4.8 for the paper text this changes.
- **Concept extraction** (`services/concept_extraction.py`): Claude with a fixed
  JSON schema returns units, lecture hours and concepts; without a key, heading
  rules ("Unit N: Title (H hours)" then comma/semicolon-split topics) run
  instead. The heading-rule extractor is the Table III baseline. Extracted
  concepts are merged with typed ones (typed concepts keep their unit; the
  syllabus supplies their order). Nothing is deleted. At most 80 concepts.
- **Links (EXTRACTED_FROM)** (`services/prerequisites.py`): a concept is linked
  to every passage naming its title (longest title claimed first, so "binary
  search" inside "binary search tree" doesn't count); a concept never named
  verbatim is linked to its three nearest passages with cosine similarity >= 0.45.
- **Edges, Eq. (1)** exactly as written: o_ab, c_ab (NPMI over passages,
  clipped at 0), l_ab; conf = 0.5l + 0.3o + 0.2c >= 0.4. l_ab comes from Claude
  for the 80 most co-occurring pairs, or a clause-level phrase matcher without
  a key. Cycles: DFS, drop the lowest-confidence automatic edge of each cycle,
  status `cycle`. Instructor decisions (confirm, reject, add) survive rebuilds;
  an instructor edge that would close a cycle is refused (HTTP 409).
- **Exam relevance, Eq. (4)** (`services/exam_weights.py`): PYQ files are split
  into questions ("Q1", "1.", "(a)"), marks read from "(10 marks)", "[5]"
  etc. (median of found marks when absent), split evenly over the concepts a
  question names, else given to the most similar concept when cosine >= 0.35.

Paste-ready replacement for the start of the "Graph branch" paragraph:
```latex
\textit{Graph branch.} An LLM called with a fixed function schema reads the
syllabus and returns concept titles grouped by unit, with each unit's lecture
hours; without model access, heading rules read the ``Unit~$N$'' headings
and split the topics beneath them. Each concept is linked to the passages that
name it, the longest matching title taking precedence, or, if no passage names
it, to its three nearest passages above a cosine similarity of 0.45.
```

### 4.2 Hybrid retrieval, Eq. (2) (`services/retrieval.py`)
Implemented as specified: L_v = 12 nearest passages; L_g = passages linked to
the question's concept (named in the question, else the most similar title at
cosine >= 0.5), then to its immediate prerequisites and dependants, ordered by
graph distance and then similarity to the question; RRF with k_rrf = 60, top 8.
The assistant now sends 8 fused passages, not 6 (Algorithm 1 line 4 and
Table II: "top-6 passages" becomes "top-8 fused passages").

### 4.3 Situation-specific diagnostics (Sec. III-E) (`services/assessments.py`)
- new_subject: concepts with no prerequisite and at least one dependant,
  weighted 1 + number of descendants (no edges yet: the first unit).
- revision: equal shares, short recall questions.
- exam_prep: share proportional to max(M_c / max M, 0.05); weak-focus weights
  when no past papers exist.
Mastery update (3) unchanged: alpha = 0.4, m0 = 0.5.

### 4.4 Path planner, Algorithm 2 (`services/path_planner.py`)
Implemented as written, with tau = 0.6, m0 = 0.5, h_c = H_u/|C_u| (else 2 h),
B = H_d * D with D = days until the exam date, and the weights of Sec. IV-B.
Details the paper should state: edges are restricted to N for indeg and
Desc_N (matching the complexity analysis); ties in w_c go to the earlier unit,
then the earlier syllabus position; with no exam date the plan has no budget.
The plan is recomputed on every request, so it reflects each new assessment.

### 4.5 Table II, rows now implemented
```latex
Graph store & PostgreSQL tables: units, edges, concept--passage links & I \
Concept extraction & LLM function calling; heading-rule fallback & I \
Prerequisite edges & $\mathrm{conf}_{ab} \ge 0.4$ by (1); cycle removal; instructor review & I \
Hybrid retrieval & RRF, $k_{\mathrm{rrf}}=60$, top-8 & I \
Assessment & situation-specific diagnostics; update (3) & I \
Path planner & Algorithm~2 & I \
```
Fig. 1: all boxes can now be drawn solid, with the Neo4j box replaced (4.8). Abstract: "and specify the remaining
components formally" can become "and evaluate each component against a baseline".

### 4.6 Results available now (RQ2), from `eval/path_eval.py`
Output: `eval/path_eval_results.json` (seed 20261114). Constructed inputs only.
- Worked example (Fig. 3) reproduced exactly by the implementation (asserted).
- 200 random prerequisite DAGs (15-80 concepts, budgets 20-80% of total effort):
  prerequisite-violation rate 0% (max 0%), mastered concepts included 0%,
  budget never exceeded. Syllabus-order revision: 32.6% violations and 27.8% of
  studied concepts already mastered. **Caution:** the baseline numbers depend on
  how much syllabus disorder the generator injects (positions shuffled within
  units, 15% of prerequisites moved to a later unit); report them as a property
  of the generator, not of real syllabi.
- Planning time (median of 7, i3-1005G1): 0.06 ms at |N| = 10, 0.74 ms at 100,
  4.4 ms at 400, consistent with "negligible next to LLM latency".

### 4.7 Still needs real data (TODOs that remain)
- RQ1 extraction F1, edge F1 and Cohen's kappa: `eval/graph_eval.py`, which
  needs annotation files written by people (`eval/annotations/README.md`).
- RQ3 P@5 and MRR for BM25, vector-only and hybrid: `eval/retrieval_eval.py`,
  which needs judged questions (`eval/questions/README.md`). Both report 95%
  bootstrap CIs and Wilcoxon p-values (`eval/eval_stats.py`).
- RAGAS faithfulness and the scope-guard refusal rates need an API key and a
  question set; no harness is written for them yet.
- `backend/sample_data/cs201/` holds synthetic documents written to exercise
  the pipeline. They must not be used as evaluation data.

### 4.8 Removing Neo4j from the paper
The "dual graph-vector index" contribution still holds: the graph is in
PostgreSQL tables and the passages in Chroma, joined by the shared passage id.
What has to change:
- **Fig. 1:** replace the "Neo4j graph" cylinder with "Curriculum graph
  (PostgreSQL)", or merge it into the existing Postgres cylinder; keep the
  dotted "shared chunk_id" link, now between Chroma and the graph tables.
  Caption: "while the graph branch writes Course, Unit, Concept and
  ResourceChunk nodes to Neo4j" becomes "while the graph branch writes units,
  concepts, prerequisite edges and concept--passage links to PostgreSQL".
- **Fig. 2:** keep the diagram as an entity-relationship view (Course, Unit,
  Concept, passage; HAS UNIT, CONTAINS, EXTRACTED FROM, REQUIRES PREREQUISITE),
  and replace the caption's first two sentences with:
```latex
Data model. PostgreSQL holds the curriculum structure and prerequisite
edges as relational tables; an edge $a \rightarrow b$ labelled
REQUIRES\_PREREQUISITE means concept $a$ requires concept $b$ first.
Unique constraints on every identifier and on each concept pair make
re-ingestion idempotent.
```
  and change "the three stores join without translation tables" to "the two
  stores join without translation tables".
- **Sec. III-B:** "a graph database that records" (also in the abstract)
  becomes "relational tables that record".
- **Sec. III-D:** "the writer merges Course, Unit and Concept nodes and links
  each concept to the passages it was extracted from" becomes "the writer
  upserts unit and concept rows and links each concept to the passages it was
  extracted from".
- **Table II:** use the Graph store row in 4.5.
- **Sec. II-E / VII:** no change needed; GraphRAG and the RRF fusion argument
  don't depend on a graph database.
- A sentence for Sec. III-D, if a reviewer asks why not a graph database:
```latex
A course syllabus yields tens to a few hundred concepts, so the graph is
stored as relational tables and traversed in memory after a single query;
a dedicated graph database would add an operational dependency without
changing the result.
```
