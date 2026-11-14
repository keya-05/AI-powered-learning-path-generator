import { Check, Loader2, Plus, RefreshCw, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import AggregateHeatmapGraph from "../components/widgets/AggregateHeatmapGraph";
import WidgetCard from "../components/widgets/WidgetCard";
import { useInstructorOverview } from "../hooks/useAnalytics";
import { useCourseGraph } from "../hooks/useCourseGraph";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { addGraphEdge, deleteGraphEdge, rebuildCourseGraph, reviewGraphEdge } from "../services/api";

const FILTERS = [
  { id: "review", label: "To review" },
  { id: "active", label: "In use" },
  { id: "removed", label: "Removed" },
];

const SOURCE_LABEL = { auto: "Suggested", instructor: "Confirmed" };

function edgeGroup(edge) {
  if (edge.status !== "active") return "removed";
  return edge.source === "auto" ? "review" : "active";
}

function BuildStatus({ status, onRebuild, busy }) {
  const d = status.details ?? {};
  const running = status.state === "building" || status.state === "queued";
  const facts = [
    d.concepts != null && `${d.concepts} concepts`,
    d.passages != null && `${d.passages} passages`,
    d.links != null && `${d.links} concept–passage links`,
    d.pyq_questions ? `${d.pyq_mapped}/${d.pyq_questions} past-paper questions mapped` : null,
  ].filter(Boolean);
  const method = {
    llm: "Claude",
    heading_rules: "syllabus headings",
    phrase_rules: "phrase rules",
  };
  return (
    <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-live="polite">
      <div className="min-w-0">
        <p className="eyebrow">Graph build</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {running
            ? "Rebuilding from your course files…"
            : status.state === "failed"
              ? "The last build failed."
              : status.state === "ready"
                ? facts.join(" · ")
                : "Not built yet. Upload a syllabus, or build now."}
        </p>
        {status.state === "ready" && (
          <p className="muted mt-1 text-xs">
            {d.extraction?.method && `Concepts read from ${method[d.extraction.method] ?? d.extraction.method}. `}
            {d.explicit_method && `Prerequisite language judged by ${method[d.explicit_method] ?? d.explicit_method}. `}
            {d.cycles_removed > 0 && `${d.cycles_removed} link${d.cycles_removed === 1 ? "" : "s"} removed to break a loop. `}
          </p>
        )}
        {status.state === "failed" && d.error && <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{d.error}</p>}
      </div>
      <button type="button" className="btn-secondary flex-none" onClick={onRebuild} disabled={busy || running}>
        {running || busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
        Rebuild graph
      </button>
    </section>
  );
}

function Signal({ label, value }) {
  return (
    <span className="tabular-nums">
      <span className="muted">{label}</span> {value}
    </span>
  );
}

function EdgeRow({ edge, titles, onAction, busy, focused, onFocus }) {
  const group = edgeGroup(edge);
  return (
    <li
      className={`rounded-[20px] p-3.5 transition ${focused ? "bg-raised shadow-tile ring-2 ring-indigo-700/30 dark:shadow-none" : "hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onFocus(edge.concept_id)}
          className="min-w-0 text-left text-sm focus:outline-none focus-visible:underline"
        >
          <span className="font-bold text-slate-950 dark:text-white">{titles[edge.concept_id]}</span>
          <span className="muted"> needs </span>
          <span className="font-bold text-slate-950 dark:text-white">{titles[edge.prerequisite_id]}</span>
        </button>
        <div className="flex flex-none gap-1">
          {group === "review" && (
            <button type="button" className="btn-icon h-9 w-9" aria-label="Confirm this link" title="Confirm" disabled={busy} onClick={() => onAction(edge, "approve")}>
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {group !== "removed" ? (
            <button
              type="button"
              className="btn-icon h-9 w-9"
              aria-label="Remove this link"
              title="Remove"
              disabled={busy}
              onClick={() => onAction(edge, "remove")}
            >
              {group === "review" ? <X className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          ) : (
            <button type="button" className="btn-icon h-9 w-9" aria-label="Restore this link" title="Restore" disabled={busy} onClick={() => onAction(edge, "approve")}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {edge.status === "cycle" ? "Removed: broke a loop" : edge.status === "rejected" ? "Removed by you" : SOURCE_LABEL[edge.source]}
        </span>
        <Signal label="confidence" value={edge.confidence.toFixed(2)} />
        {edge.source === "auto" || edge.status !== "active" ? (
          <>
            <Signal label="stated" value={edge.explicit ? "yes" : "no"} />
            <Signal label="order" value={edge.order} />
            <Signal label="co-occurrence" value={edge.cooccurrence.toFixed(2)} />
          </>
        ) : null}
      </div>
      {edge.evidence && <p className="muted mt-1.5 line-clamp-2 text-xs italic">“{edge.evidence}”</p>}
    </li>
  );
}

function AddEdgeForm({ concepts, onAdd, busy }) {
  const [concept, setConcept] = useState("");
  const [prerequisite, setPrerequisite] = useState("");
  const options = concepts.map((c) => (
    <option key={c.id} value={c.id}>
      U{c.unit_number} · {c.title}
    </option>
  ));
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onAdd(concept, prerequisite)) {
          setConcept("");
          setPrerequisite("");
        }
      }}
    >
      <div>
        <label htmlFor="edge-concept" className="label">
          Concept
        </label>
        <select id="edge-concept" className="input" required value={concept} onChange={(e) => setConcept(e.target.value)}>
          <option value="">Choose…</option>
          {options}
        </select>
      </div>
      <div>
        <label htmlFor="edge-prereq" className="label">
          Needs first
        </label>
        <select id="edge-prereq" className="input" required value={prerequisite} onChange={(e) => setPrerequisite(e.target.value)}>
          <option value="">Choose…</option>
          {options}
        </select>
      </div>
      <button type="submit" className="btn-primary min-h-[44px]" disabled={busy || !concept || !prerequisite || concept === prerequisite}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add link
      </button>
    </form>
  );
}

export default function MasterKnowledgeGraphPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { data, error, refresh } = useInstructorOverview(courseId, { enabled: Boolean(courseId) });
  const graph = useCourseGraph(courseId);
  const [filter, setFilter] = useState("review");
  const [focus, setFocus] = useState(null);
  const [action, setAction] = useState({ busy: false, error: null });

  useEffect(() => setFocus(null), [courseId]);

  // Poll while a build runs, then refresh the analytics so new concepts show up.
  const state = graph.data?.status.state;
  const refreshGraph = graph.refresh;
  useEffect(() => {
    if (state !== "building" && state !== "queued") return undefined;
    const timer = setInterval(refreshGraph, 2500);
    return () => {
      clearInterval(timer);
      refresh();
    };
  }, [state, refreshGraph, refresh]);

  const titles = useMemo(() => Object.fromEntries((graph.data?.concepts ?? []).map((c) => [c.id, c.title])), [graph.data]);
  const groups = useMemo(() => {
    const out = { review: [], active: [], removed: [] };
    (graph.data?.edges ?? []).forEach((e) => out[edgeGroup(e)].push(e));
    return out;
  }, [graph.data]);
  const shown = groups[filter];

  const run = async (fn) => {
    setAction({ busy: true, error: null });
    try {
      await fn();
      await graph.refresh();
      setAction({ busy: false, error: null });
      return true;
    } catch (err) {
      setAction({ busy: false, error: err.response?.data?.detail || "That didn't work. Try again." });
      return false;
    }
  };

  const onEdgeAction = (edge, kind) =>
    run(() =>
      kind === "approve" ? reviewGraphEdge(courseId, edge.id, "active") : deleteGraphEdge(courseId, edge.id)
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge Graph"
        description="The prerequisite structure the study planner follows, with class-wide failure points overlaid."
        actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create a course to build its knowledge graph." />
      ) : error || graph.error ? (
        <ErrorState message={error || graph.error} onRetry={() => { refresh(); graph.refresh(); }} />
      ) : !data || !graph.data ? (
        <LoadingState />
      ) : (
        <>
          <BuildStatus
            status={graph.data.status}
            busy={action.busy}
            onRebuild={() => run(() => rebuildCourseGraph(courseId))}
          />

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
            <AggregateHeatmapGraph
              key={courseId}
              courseId={courseId}
              graph={graph.data}
              concepts={data.concepts}
              interactive
              height={560}
              focusId={focus}
              onSelect={(id) => setFocus((cur) => (cur === id ? null : id))}
            />

            <WidgetCard
              title="Prerequisite links"
              subtitle="Suggested links come from your files. Confirm or remove them; rebuilds keep your decisions."
            >
              <div role="tablist" aria-label="Link status" className="inline-flex rounded-full bg-raised p-1 shadow-well">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    type="button"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold tabular-nums transition ${
                      filter === f.id
                        ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950"
                        : "muted hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {f.label} {groups[f.id].length}
                  </button>
                ))}
              </div>

              {action.error && (
                <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
                  {action.error}
                </p>
              )}

              {shown.length === 0 ? (
                <p className="muted py-8 text-center text-sm">
                  {filter === "review"
                    ? "Nothing waiting for review."
                    : filter === "active"
                      ? "No confirmed links yet. Confirm suggestions or add your own below."
                      : "No removed links."}
                </p>
              ) : (
                <ul className="mt-3 max-h-[440px] space-y-1 overflow-y-auto pr-1">
                  {shown.map((edge) => (
                    <EdgeRow
                      key={edge.id}
                      edge={edge}
                      titles={titles}
                      busy={action.busy}
                      onAction={onEdgeAction}
                      focused={focus === edge.concept_id || focus === edge.prerequisite_id}
                      onFocus={(id) => setFocus((cur) => (cur === id ? null : id))}
                    />
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-slate-900/10 pt-5 dark:border-white/10">
                <AddEdgeForm
                  concepts={graph.data.concepts}
                  busy={action.busy}
                  onAdd={(concept, prerequisite) => run(() => addGraphEdge(courseId, concept, prerequisite))}
                />
              </div>
            </WidgetCard>
          </div>
        </>
      )}
    </div>
  );
}
