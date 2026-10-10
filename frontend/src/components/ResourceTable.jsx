import { FileText, Presentation } from "lucide-react";

const FILE_ICON = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
};

const RESOURCE_TYPE_LABEL = {
  syllabus: "Syllabus",
  pyq: "PYQ",
  notes: "Notes",
  ppt: "Slides",
};

const STATUS_STYLE = {
  indexed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  processing: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  failed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export function StatusBadge({ status }) {
  return <span className={`badge capitalize ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>{status}</span>;
}

export default function ResourceTable({ resources, showCourse = false }) {
  if (resources.length === 0) {
    return <p className="muted py-4 text-sm">No resources uploaded yet.</p>;
  }

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <th className="eyebrow px-5 pb-3 font-medium sm:px-6">File</th>
            {showCourse && <th className="eyebrow pb-3 pr-4 font-medium">Course</th>}
            <th className="eyebrow pb-3 pr-4 font-medium">Type</th>
            <th className="eyebrow pb-3 pr-4 font-medium">Status</th>
            <th className="eyebrow pb-3 pr-5 text-right font-medium sm:pr-6">Uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {resources.map((resource) => {
            const Icon = FILE_ICON[resource.file_type] ?? FileText;
            return (
              <tr key={resource.id}>
                <td className="px-5 py-3 sm:px-6">
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 flex-none text-slate-400" strokeWidth={1.75} />
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {resource.file_name}
                    </span>
                  </span>
                </td>
                {showCourse && <td className="muted py-3 pr-4">{resource.course_code}</td>}
                <td className="muted py-3 pr-4">{RESOURCE_TYPE_LABEL[resource.resource_type]}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={resource.processing_status} />
                </td>
                <td className="muted whitespace-nowrap py-3 pr-5 text-right tabular-nums sm:pr-6">
                  {dateFormatter.format(new Date(resource.created_at))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
