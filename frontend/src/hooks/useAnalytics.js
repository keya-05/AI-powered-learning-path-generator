import { useCallback, useEffect, useState } from "react";
import { fetchInstructorOverview, fetchStudentOverview } from "../services/api";

function useOverview(fetcher, courseId, enabled) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetcher(courseId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, courseId]);

  useEffect(() => {
    if (enabled) load();
  }, [load, enabled]);

  return { data, isLoading: enabled ? isLoading : true, error, refresh: load };
}

export function useInstructorOverview(courseId, { enabled = true } = {}) {
  return useOverview(fetchInstructorOverview, courseId, enabled);
}

export function useStudentOverview(courseId, { enabled = true } = {}) {
  return useOverview(fetchStudentOverview, courseId, enabled);
}
