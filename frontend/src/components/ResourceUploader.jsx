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
  { value: "ppt", label: "PPT" },
];

function isAcceptedFile(file) {
  if (ACCEPTED_MIME_TYPES[file.type]) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "pptx", "docx"].includes(extension);
}

function PendingFileRow({ entry, onTypeChange, onRemove }) {
  const statusStyles = {
    pending: "text-gray-400",
    uploading: "text-indigo-500",
    success: "text-emerald-600",
    error: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{entry.file.name}</p>
        <p className={`text-xs ${statusStyles[entry.status]}`}>
          {entry.status === "error" ? entry.errorMessage : entry.status}
        </p>
      </div>

      <select
        value={entry.resourceType}
        onChange={(event) => onTypeChange(entry.id, event.target.value)}
        disabled={entry.status === "uploading" || entry.status === "success"}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
      >
        {RESOURCE_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      {entry.status !== "uploading" && entry.status !== "success" && (
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="text-sm text-gray-400 hover:text-red-500"
          aria-label={`Remove ${entry.file.name}`}
        >
          ✕
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
      previous.map((item) =>
        item.id === entry.id ? { ...item, status: "uploading" } : item
      )
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
            ? {
                ...item,
                status: "error",
                errorMessage: err.response?.data?.detail || "Upload failed.",
              }
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
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <p className="text-sm font-medium text-gray-700">
          Drag & drop syllabi, notes, PYQs, or slides here
        </p>
        <p className="mt-1 text-xs text-gray-400">PDF, PPTX, or DOCX — or click to browse</p>
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
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
