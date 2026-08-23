import { useCallback, useEffect, useState } from "react";
import { enrollInCourse, fetchAvailableCourses } from "../services/api";

export function useAvailableCourses() {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAvailableCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAvailableCourses();
      setAvailableCourses(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load available courses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableCourses();
  }, [loadAvailableCourses]);

  const enroll = useCallback(async (courseId) => {
    await enrollInCourse(courseId);
    setAvailableCourses((previous) => previous.filter((course) => course.id !== courseId));
  }, []);

  return { availableCourses, isLoading, error, refresh: loadAvailableCourses, enroll };
}
