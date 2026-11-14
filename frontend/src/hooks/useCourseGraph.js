import { useCallback, useEffect, useState } from "react";
import { fetchCourseGraph } from "../services/api";

export function useCourseGraph(courseId) {
  const [state, setState] = useState({ data: null, error: null, isLoading: Boolean(courseId) });

  const load = useCallback(async () => {
    if (!courseId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await fetchCourseGraph(courseId);
      setState({ data, error: null, isLoading: false });
    } catch (err) {
      setState({ data: null, error: err.response?.data?.detail || "Couldn't load the course graph.", isLoading: false });
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

// Graph edges as diagram links: from the prerequisite to the concept that needs it.
// `markSuggested` dashes automatic links the instructor hasn't confirmed (instructor views only).
export function graphLinks(graph, { includeInactive = false, markSuggested = false } = {}) {
  if (!graph) return [];
  return graph.edges
    .filter((edge) => includeInactive || edge.status === "active")
    .map((edge) => ({
      id: edge.id,
      from: edge.prerequisite_id,
      to: edge.concept_id,
      kind: edge.status !== "active" ? "muted" : markSuggested && edge.source === "auto" ? "pending" : "active",
    }));
}

// Concept position within its unit, by concept id, for laying out columns in syllabus order.
export function positionsById(graph) {
  return Object.fromEntries((graph?.concepts ?? []).map((c) => [c.id, c.position]));
}
