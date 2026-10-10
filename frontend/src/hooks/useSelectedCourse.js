import { useEffect, useState } from "react";

// Keeps a selected course id in sync with a (possibly still loading) course list,
// defaulting to the first course once the list arrives.
export function useSelectedCourse(courses) {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (courses.length === 0) return;
    if (!courses.some((course) => course.id === selectedId)) {
      setSelectedId(courses[0].id);
    }
  }, [courses, selectedId]);

  return [selectedId, setSelectedId];
}
