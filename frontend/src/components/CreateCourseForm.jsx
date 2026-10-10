import { useState } from "react";

export default function CreateCourseForm({ onCreate, onCancel }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate({ title, code, description: description || null });
      setTitle("");
      setCode("");
      setDescription("");
      onCancel();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6 p-5 sm:p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">New course</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="course-title" className="label">
            Title
          </label>
          <input
            id="course-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Data Structures & Algorithms"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="course-code" className="label">
            Course code
          </label>
          <input
            id="course-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CS201"
            className="input"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="course-description" className="label">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="course-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input"
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Creating…" : "Create course"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
