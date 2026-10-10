import { useCallback, useEffect, useState } from "react";
import { createCourse, fetchCourses } from "../services/api";

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load courses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const addCourse = useCallback(
    async (courseInput) => {
      const newCourse = await createCourse(courseInput);
      setCourses((previous) => [...previous, { ...newCourse, overall_mastery: 0, total_concepts: 0, weak_concept_count: 0, enrolled_count: 0 }]);
      return newCourse;
    },
    []
  );

  return { courses, isLoading, error, refresh: loadCourses, addCourse };
}
