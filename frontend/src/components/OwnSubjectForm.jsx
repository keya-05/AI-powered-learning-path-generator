import { CloudUpload, FileText, Loader2, Plus, Presentation, X } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse, uploadResource } from "../services/api";

const MAX_BYTES = 25 * 1024 * 1024;
const MATERIAL_TYPES = [
  { value: "notes", label: "Notes" },
  { value: "ppt", label: "Slides" },
  { value: "pyq", label: "Past paper" },
];

function extension(file) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

// A first guess the student can change: slides by format, past papers by name.
function guessType(file) {
  if (extension(file) === "pptx") return "ppt";
  if (/pyq|question.?paper|exam|end.?sem|mid.?sem/i.test(file.name)) return "pyq";
  return "notes";
}

function toEntries(fileList, accept) {
  const rejected = [];
  const entries = [];
  for (const file of Array.from(fileList)) {
    if (!accept.includes(extension(file))) rejected.push(`${file.name} isn't a ${accept.join("/").toUpperCase()} file`);
    else if (file.size > MAX_BYTES) rejected.push(`${file.name} is over 25 MB`);
    else entries.push({ id: crypto.randomUUID(), file, type: guessType(file) });
  }
  return { entries, rejected };
}

function DropZone({ id, label, hint, accept, multiple, onFiles, compact }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <span id={`${id}-label`} className="label">{label}</span>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`flex w-full items-center gap-3 rounded-xl border border-dashed px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
          compact ? "py-3" : "py-4"
        } ${
          dragging
            ? "border-rose-400 bg-rose-50/70 dark:border-rose-500 dark:bg-rose-500/10"
            : "border-slate-300 hover:border-slate-400 hover:bg-white/50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/40"
        }`}
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <CloudUpload className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {dragging ? "Drop to add" : multiple ? "Drop files or browse" : "Drop a file or browse"}
          </span>
          <span id={`${id}-hint`} className="muted block text-xs">{hint}</span>
        </span>
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple={multiple}
        accept={accept.map((a) => `.${a}`).join(",")}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FileRow({ entry, status, onRemove, onTypeChange, busy }) {
  const Icon = extension(entry.file) === "pptx" ? Presentation : FileText;
  return (
    <li className="flex min-w-0 items-center gap-2.5 rounded-lg bg-white/60 py-1 pl-3 pr-1 dark:bg-slate-800/50">
      <Icon className="h-4 w-4 flex-none text-slate-400" strokeWidth={1.75} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-800 dark:text-slate-200">{entry.file.name}</span>
        {status && (
          <span
            className={`block text-xs ${
              status === "failed" ? "text-rose-700 dark:text-rose-400" : "muted"
            }`}
          >
            {status === "uploading" ? "Uploading…" : status === "done" ? "Uploaded" : "Upload failed"}
          </span>
        )}
      </span>
      {onTypeChange && (
        <select
          value={entry.type}
          onChange={(e) => onTypeChange(entry.id, e.target.value)}
          disabled={busy}
          aria-label={`Type of ${entry.file.name}`}
          className="input w-auto py-0.5 pl-2 pr-7 text-xs disabled:opacity-60"
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      )}
      {!busy && (
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="btn-ghost h-7 w-7 justify-center px-0 hover:text-rose-700"
          aria-label={`Remove ${entry.file.name}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

// For students studying without an instructor: name the subject, optionally
// list topics, and attach a syllabus and study material in one step. A
// syllabus is enough on its own: topics are extracted from it after upload.
export default function OwnSubjectForm() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState("");
  const [syllabus, setSyllabus] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [progress, setProgress] = useState({});
  const [notice, setNotice] = useState(null);
  const [state, setState] = useState({ busy: false, error: null, createdId: null });

  const busy = state.busy;
  const fileCount = (syllabus ? 1 : 0) + materials.length;

  const addSyllabus = (files) => {
    const { entries, rejected } = toEntries(files, ["pdf", "docx"]);
    if (entries[0]) setSyllabus({ ...entries[0], type: "syllabus" });
    setNotice(rejected.length ? rejected.join("; ") : null);
  };

  const addMaterials = (files) => {
    const { entries, rejected } = toEntries(files, ["pdf", "pptx", "docx"]);
    setMaterials((prev) => [...prev, ...entries]);
    setNotice(rejected.length ? rejected.join("; ") : null);
  };

  const reset = () => {
    setOpen(false);
    setTitle("");
    setDescription("");
    setTopics("");
    setSyllabus(null);
    setMaterials([]);
    setProgress({});
    setNotice(null);
    setState({ busy: false, error: null, createdId: null });
  };

  const uploadAll = async (courseId) => {
    const queue = [...(syllabus ? [syllabus] : []), ...materials].filter((e) => progress[e.id] !== "done");
    const results = {};
    // One at a time: each upload starts ingestion on the server.
    for (const entry of queue) {
      setProgress((p) => ({ ...p, [entry.id]: "uploading" }));
      try {
        await uploadResource(courseId, entry.file, entry.type);
        results[entry.id] = "done";
      } catch {
        results[entry.id] = "failed";
      }
      setProgress((p) => ({ ...p, [entry.id]: results[entry.id] }));
    }
    return Object.values(results).filter((r) => r === "failed").length;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState((s) => ({ ...s, busy: true, error: null }));
    let courseId = state.createdId;
    try {
      if (!courseId) {
        const course = await createCourse({
          title,
          description: description || null,
          topics: topics.split("\n").map((t) => t.trim()).filter(Boolean),
        });
        courseId = course.id;
      }
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't create the subject. Try again.", createdId: null });
      return;
    }
    const failed = await uploadAll(courseId);
    if (failed === 0) {
      navigate(`/materials?course=${courseId}`);
      return;
    }
    setState({
      busy: false,
      createdId: courseId,
      error: `The subject was created, but ${failed} file${failed === 1 ? "" : "s"} didn't upload. Retry, or add ${
        failed === 1 ? "it" : "them"
      } later on the Materials page.`,
    });
  };

  if (!open) {
    return (
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-xl">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            Studying on your own?
          </h2>
          <p className="muted mt-1 text-sm">
            Add a subject with its syllabus, notes and past papers. The AI Assistant answers questions about it from
            your files only, and you can build practice papers from its topics.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary flex-none">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add a subject
        </button>
      </section>
    );
  }

  const submitLabel = state.createdId
    ? "Retry failed uploads"
    : fileCount
      ? `Create subject and upload ${fileCount} file${fileCount === 1 ? "" : "s"}`
      : "Create subject";

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            Add your own subject
          </h2>
          <p className="muted mt-1 text-xs font-medium">Only you can see it. You can add more files later.</p>
        </div>
        <button type="button" onClick={reset} disabled={busy} className="btn-ghost px-2.5" aria-label="Cancel new subject">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <fieldset disabled={busy || !!state.createdId} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="subject-title" className="label">Subject name</label>
            <input
              id="subject-title"
              name="title"
              required
              maxLength={255}
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Organic Chemistry…"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="subject-description" className="label">
              What it covers <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="subject-description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="First-year module, exam in March…"
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="subject-topics" className="label">
            Topics{" "}
            <span className="font-normal text-slate-400">
              {syllabus ? "(optional, read from your syllabus)" : "(one per line)"}
            </span>
          </label>
          <textarea
            id="subject-topics"
            name="topics"
            rows={7}
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder={"Unit 1: Alkanes\nAlkenes\nUnit 2: Aromatic compounds"}
            className="input font-mono text-[13px]"
          />
          <p className="muted mt-1.5 text-xs">
            Start a line with “Unit 2:” to begin a new unit. Skip this if you upload a syllabus: its topics are added
            automatically.
          </p>
        </div>
      </fieldset>

      <div className="mt-6 border-t border-slate-900/10 pt-5 dark:border-white/10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            {syllabus ? (
              <>
                <span className="label">Syllabus</span>
                <ul>
                  <FileRow
                    entry={syllabus}
                    status={progress[syllabus.id]}
                    busy={busy || progress[syllabus.id] === "done"}
                    onRemove={() => setSyllabus(null)}
                  />
                </ul>
              </>
            ) : (
              <DropZone
                id="subject-syllabus"
                label={
                  <>
                    Syllabus <span className="font-normal text-slate-400">(optional)</span>
                  </>
                }
                hint="PDF or DOCX. Units and topics are read from it."
                accept={["pdf", "docx"]}
                onFiles={addSyllabus}
              />
            )}
          </div>
          <div>
            <DropZone
              id="subject-materials"
              label={
                <>
                  Study material <span className="font-normal text-slate-400">(optional)</span>
                </>
              }
              hint="Notes, slides or past papers. PDF, PPTX or DOCX, up to 25 MB each."
              accept={["pdf", "pptx", "docx"]}
              multiple
              onFiles={addMaterials}
            />
          </div>
        </div>

        {materials.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {materials.length} file{materials.length === 1 ? "" : "s"}
                <span className="muted font-normal">
                  {" · "}
                  {MATERIAL_TYPES.map((t) => [t.label, materials.filter((m) => m.type === t.value).length])
                    .filter(([, n]) => n)
                    .map(([label, n]) => `${n} ${label.toLowerCase()}`)
                    .join(", ")}
                </span>
              </p>
              {!busy && !state.createdId && (
                <div className="ml-auto flex items-center gap-2">
                  <label htmlFor="materials-set-all" className="muted text-xs">Set all to</label>
                  <select
                    id="materials-set-all"
                    value=""
                    onChange={(e) => setMaterials((prev) => prev.map((m) => ({ ...m, type: e.target.value })))}
                    className="input w-auto py-0.5 pl-2 pr-7 text-xs"
                  >
                    <option value="" disabled>Choose…</option>
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setMaterials([])} className="btn-ghost px-2 py-1 text-xs">
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <ul className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto overscroll-contain pr-1 lg:grid-cols-2">
              {materials.map((entry) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    status={progress[entry.id]}
                    busy={busy || progress[entry.id] === "done"}
                    onRemove={(id) => setMaterials((prev) => prev.filter((m) => m.id !== id))}
                    onTypeChange={(id, type) =>
                      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, type } : m)))
                    }
                  />
                ))}
            </ul>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400">
            Skipped: {notice}.
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="mt-4 text-sm font-medium text-rose-700 dark:text-rose-400">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? (fileCount ? "Uploading…" : "Creating…") : submitLabel}
        </button>
        {state.createdId ? (
          <button
            type="button"
            onClick={() => navigate(`/materials?course=${state.createdId}`)}
            disabled={busy}
            className="btn-secondary"
          >
            Go to materials
          </button>
        ) : (
          <button type="button" onClick={reset} disabled={busy} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
