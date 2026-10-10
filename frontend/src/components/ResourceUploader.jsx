import { CloudUpload, FileText, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { uploadResource } from "../services/api";

const ACCEPTED_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const RESOURCE_TYPES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "pyq", label: "PYQ" },
  { value: "notes", label: "Notes" },
  { value: "ppt", label: "Slides" },
];

const STATUS_LABEL = {
  pending: "Ready to upload",
  uploading: "Uploading…",
  success: "Uploaded",
};

const STATUS_STYLE = {
  pending: "text-slate-400 dark:text-slate-500",
  uploading: "text-indigo-600 dark:text-indigo-400",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-rose-600 dark:text-rose-400",
};

function isAcceptedFile(file) {
  if (ACCEPTED_MIME_TYPES[file.type]) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "pptx", "docx"].includes(extension);
}

function PendingFileRow({ entry, onTypeChange, onRemove }) {
  const locked = entry.status === "uploading" || entry.status === "success";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <FileText className="h-4 w-4 flex-none text-slate-400" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{entry.file.name}</p>
        <p className={`text-xs ${STATUS_STYLE[entry.status]}`}>
          {entry.status === "error" ? entry.errorMessage : STATUS_LABEL[entry.status]}
        </p>
      </div>

      <select
        value={entry.resourceType}
        onChange={(event) => onTypeChange(entry.id, event.target.value)}
        disabled={locked}
        className="input w-auto py-1.5 disabled:opacity-50"
        aria-label="Resource type"
      >
        {RESOURCE_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      {!locked && (
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="btn-icon h-8 w-8 hover:text-rose-600 dark:hover:text-rose-400"
          aria-label={`Remove ${entry.file.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function ResourceUploader({ courseId, onUploadComplete }) {
  const [entries, setEntries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const accepted = Array.from(fileList).filter(isAcceptedFile);
    const newEntries = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      resourceType: "notes",
      status: "pending",
      errorMessage: null,
    }));
    setEntries((previous) => [...previous, ...newEntries]);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
    [addFiles]
  );

  const handleTypeChange = (id, resourceType) => {
    setEntries((previous) =>
      previous.map((entry) => (entry.id === id ? { ...entry, resourceType } : entry))
    );
  };

  const handleRemove = (id) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
  };

  const uploadEntry = async (entry) => {
    setEntries((previous) =>
      previous.map((item) => (item.id === entry.id ? { ...item, status: "uploading" } : item))
    );
    try {
      const uploaded = await uploadResource(courseId, entry.file, entry.resourceType);
      setEntries((previous) =>
        previous.map((item) => (item.id === entry.id ? { ...item, status: "success" } : item))
      );
      onUploadComplete?.(uploaded);
    } catch (err) {
      setEntries((previous) =>
        previous.map((item) =>
          item.id === entry.id
            ? { ...item, status: "error", errorMessage: err.response?.data?.detail || "Upload failed." }
            : item
        )
      );
    }
  };

  const handleUploadAll = () => {
    entries
      .filter((entry) => entry.status === "pending" || entry.status === "error")
      .forEach(uploadEntry);
  };

  const pendingCount = entries.filter((e) => e.status === "pending" || e.status === "error").length;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          isDragging
            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-500/10"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/40"
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <CloudUpload className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          Drop syllabi, notes, PYQs or slides here
        </p>
        <p className="muted mt-1 text-xs">PDF, PPTX or DOCX, or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <PendingFileRow
              key={entry.id}
              entry={entry}
              onTypeChange={handleTypeChange}
              onRemove={handleRemove}
            />
          ))}

          <button
            type="button"
            onClick={handleUploadAll}
            disabled={pendingCount === 0}
            className="btn-primary mt-2"
          >
            Upload{pendingCount > 0 ? ` ${pendingCount} file${pendingCount === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
