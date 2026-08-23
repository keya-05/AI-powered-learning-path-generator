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
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Title
          </label>
          <input
            id="course-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Data Structures & Algorithms"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label htmlFor="course-code" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Course code
          </label>
          <input
            id="course-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CS201"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Description (optional)
        </label>
        <textarea
          id="course-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create course"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
