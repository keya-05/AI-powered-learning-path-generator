import { Download, FileText, Loader2, Presentation, RotateCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceUploader from "../components/ResourceUploader";
import { StatusBadge } from "../components/ResourceTable";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { deleteMaterial, downloadMaterial, errorDetail, fetchCourseMaterials, retryMaterial } from "../services/api";

// Syllabus first, then teaching material, then past papers.
const GROUPS = [
  { type: "syllabus", label: "Syllabus" },
  { type: "ppt", label: "Lecture slides" },
  { type: "notes", label: "Notes" },
  { type: "pyq", label: "Previous year papers" },
];

const FILE_ICON = { pdf: FileText, docx: FileText, pptx: Presentation };

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

function MaterialRow({ material, courseId, onDelete, onChanged }) {
  const [state, setState] = useState({ busy: false, error: null });
  const Icon = FILE_ICON[material.file_type] ?? FileText;

  const handleDownload = async () => {
    setState({ busy: true, error: null });
    try {
      await downloadMaterial(courseId, material);
      setState({ busy: false, error: null });
    } catch (err) {
      setState({ busy: false, error: await errorDetail(err, "Download failed. Try again.") });
    }
  };

  const handleRetry = async () => {
    setState({ busy: true, error: null });
    try {
      await retryMaterial(courseId, material.id);
      setState({ busy: false, error: null });
      onChanged?.();
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't retry the file. Try again." });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${material.file_name}? The AI Assistant will stop using it.`)) return;
    setState({ busy: true, error: null });
    try {
      await deleteMaterial(courseId, material.id);
      onDelete(material.id);
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't remove the file. Try again." });
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="tile flex h-11 w-11 flex-none items-center justify-center text-indigo-700 dark:text-indigo-300">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{material.file_name}</p>
          <p className="muted mt-0.5 text-xs">
            <span className="uppercase">{material.file_type}</span> · Added{" "}
            {dateFormatter.format(new Date(material.created_at))}
          </p>
          {state.error && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
              {state.error}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">
        {onDelete && material.processing_status && material.processing_status !== "indexed" && (
          <StatusBadge status={material.processing_status} />
        )}
        {onDelete && material.processing_status === "failed" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={state.busy}
            className="btn-secondary py-1.5 text-xs"
            aria-label={`Retry indexing ${material.file_name}`}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
        {material.available ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={state.busy}
            className="btn-secondary py-1.5 text-xs"
            aria-label={`Download ${material.file_name}`}
          >
            {state.busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {state.busy ? "Working…" : "Download"}
          </button>
        ) : (
          <span className="badge bg-slate-900/5 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            File not on server
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={state.busy}
            className="rounded-full p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
            aria-label={`Remove ${material.file_name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

export default function MaterialsPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const [state, setState] = useState({ materials: null, error: null });
  const [searchParams] = useSearchParams();

  // Arriving from "Add a subject" (or a link) opens that course.
  useEffect(() => {
    const wanted = searchParams.get("course");
    if (wanted && courses.some((c) => c.id === wanted)) setCourseId(wanted);
  }, [courses, searchParams, setCourseId]);

  // Refreshes in place (no loading flash), so the uploader keeps its queue.
  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      setState({ materials: await fetchCourseMaterials(courseId), error: null });
    } catch (err) {
      setState({ materials: null, error: err.response?.data?.detail || "Couldn't load the course material." });
    }
  }, [courseId]);

  useEffect(() => {
    setState({ materials: null, error: null });
    load();
  }, [load]);

  // While an upload is still being indexed, check again every few seconds.
  const indexing = state.materials?.some((m) => m.processing_status === "pending" || m.processing_status === "processing");
  useEffect(() => {
    if (!indexing) return undefined;
    const timer = setTimeout(load, 3000);
    return () => clearTimeout(timer);
  }, [indexing, state.materials, load]);

  const course = courses.find((c) => c.id === courseId);
  const own = Boolean(course?.is_personal);
  const removeMaterial = (id) =>
    setState((prev) => ({ ...prev, materials: prev.materials.filter((m) => m.id !== id) }));
  const groups = state.materials
    ? GROUPS.map((group) => ({
        ...group,
        items: state.materials.filter((m) => m.resource_type === group.type),
      })).filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Materials"
        description={
          own
            ? "Your own files for this subject. The AI Assistant answers from these only."
            : "Syllabus, slides, notes and past papers your instructors have uploaded."
        }
        actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course from My Courses to see its material here."
        />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : !state.materials ? (
        <LoadingState label="Loading material…" />
      ) : (
        <>
          {own && (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                Upload to {course.title}
              </h2>
              <p className="muted mb-4 mt-1 text-xs font-medium">
                PDF, PPTX or DOCX. Files are indexed in a few seconds, then the assistant can use them.
              </p>
              <ResourceUploader key={course.id} courseId={course.id} onUploadComplete={load} />
            </section>
          )}
          {groups.length === 0 ? (
            <EmptyState
              title={own ? "No files yet" : `Nothing uploaded for ${course?.code ?? "this course"} yet`}
              description={
                own
                  ? "Upload your notes, slides or past papers above to start asking questions about them."
                  : "Your instructor's files will appear here as soon as they're uploaded."
              }
            />
          ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.type} className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                  {group.label}
                </h2>
                <span className="eyebrow tabular-nums">
                  {group.items.length} file{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-slate-900/10 dark:divide-white/10">
                {group.items.map((material) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    courseId={courseId}
                    onDelete={own ? removeMaterial : undefined}
                    onChanged={load}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}
