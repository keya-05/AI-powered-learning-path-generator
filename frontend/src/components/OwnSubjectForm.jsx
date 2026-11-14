import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse } from "../services/api";

// For students studying without an instructor: they set up a subject, then
// upload their own notes to it on the Materials page.
export default function OwnSubjectForm() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState("");
  const [state, setState] = useState({ busy: false, error: null });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: null });
    try {
      const course = await createCourse({
        title,
        description: description || null,
        topics: topics.split("\n").map((t) => t.trim()).filter(Boolean),
      });
      navigate(`/materials?course=${course.id}`);
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't create the subject. Try again." });
    }
  };

  if (!open) {
    return (
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-xl">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            Studying on your own?
          </h2>
          <p className="muted mt-1 text-sm">
            Add a subject and upload your own notes and past papers. The AI Assistant answers questions about it from
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

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            Add your own subject
          </h2>
          <p className="muted mt-1 text-xs font-medium">Only you can see it. You'll upload files on the next screen.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2.5" aria-label="Cancel new subject">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
            Topics <span className="font-normal text-slate-400">(one per line)</span>
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
            Start a line with “Unit 2:” to begin a new unit. Topics are used to track mastery and build practice papers.
          </p>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 text-sm font-medium text-rose-700 dark:text-rose-400">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={state.busy} className="btn-primary">
          {state.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {state.busy ? "Creating…" : "Create subject"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
