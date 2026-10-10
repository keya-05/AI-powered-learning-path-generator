export default function CourseSelect({ courses, value, onChange, includeAll = false }) {
  if (courses.length === 0) return null;

  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      className="input w-auto min-w-[14rem] py-1.5"
      aria-label="Select course"
    >
      {includeAll && <option value="">All courses</option>}
      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          {course.code} · {course.title}
        </option>
      ))}
    </select>
  );
}
