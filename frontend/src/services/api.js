import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchCourses() {
  const { data } = await apiClient.get("/courses");
  return data;
}

export async function createCourse({ title, code, description, topics = [] }) {
  const { data } = await apiClient.post("/courses", { title, code: code || null, description, topics });
  return data;
}

export async function fetchAvailableCourses() {
  const { data } = await apiClient.get("/courses/available");
  return data;
}

export async function enrollInCourse(courseId) {
  const { data } = await apiClient.post(`/courses/${courseId}/enroll`);
  return data;
}

export async function uploadResource(courseId, file, resourceType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("resource_type", resourceType);

  const { data } = await apiClient.post(
    `/courses/${courseId}/resources`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchCourseResources(courseId) {
  const { data } = await apiClient.get(`/courses/${courseId}/resources`);
  return data;
}

export async function fetchCourseMaterials(courseId) {
  const { data } = await apiClient.get(`/courses/${courseId}/materials`);
  return data;
}

// Downloads with the auth header (a plain link can't send it), then hands the
// file to the browser.
export async function downloadMaterial(courseId, material) {
  const { data } = await apiClient.get(
    `/courses/${courseId}/resources/${material.id}/download`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = material.file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fetchCourseConcepts(courseId) {
  const { data } = await apiClient.get(`/courses/${courseId}/concepts`);
  return data;
}

// Curriculum graph: units, concepts and prerequisite links.
export async function fetchCourseGraph(courseId) {
  const { data } = await apiClient.get(`/courses/${courseId}/graph`);
  return data;
}

export async function rebuildCourseGraph(courseId) {
  const { data } = await apiClient.post(`/courses/${courseId}/graph/rebuild`);
  return data;
}

export async function addGraphEdge(courseId, conceptId, prerequisiteId) {
  const { data } = await apiClient.post(`/courses/${courseId}/graph/edges`, {
    concept_id: conceptId,
    prerequisite_id: prerequisiteId,
  });
  return data;
}

export async function reviewGraphEdge(courseId, edgeId, status) {
  const { data } = await apiClient.patch(`/courses/${courseId}/graph/edges/${edgeId}`, { status });
  return data;
}

export async function deleteGraphEdge(courseId, edgeId) {
  await apiClient.delete(`/courses/${courseId}/graph/edges/${edgeId}`);
}

// Study plan (Algorithm 2), recomputed from current mastery on every call.
export async function fetchLearningPath(courseId) {
  const { data } = await apiClient.get(`/learning-path/${courseId}`);
  return data;
}

export async function updateLearningPath(courseId, { objective, examDate, hoursPerDay, targetUnits }) {
  const { data } = await apiClient.put(`/learning-path/${courseId}`, {
    objective,
    exam_date: examDate || null,
    hours_per_day: hoursPerDay,
    target_units: targetUnits,
  });
  return data;
}

export async function retryMaterial(courseId, materialId) {
  const { data } = await apiClient.post(`/courses/${courseId}/resources/${materialId}/retry`);
  return data;
}

export async function deleteMaterial(courseId, materialId) {
  await apiClient.delete(`/courses/${courseId}/resources/${materialId}`);
}

export async function fetchAssignments(courseId) {
  const { data } = await apiClient.get("/assignments", { params: courseId ? { course_id: courseId } : {} });
  return data;
}

export async function fetchAssignment(id) {
  const { data } = await apiClient.get(`/assignments/${id}`);
  return data;
}

export async function createAssignment({ courseId, title, instructions, dueAt, questionCount, conceptIds }) {
  const { data } = await apiClient.post(
    "/assignments",
    {
      course_id: courseId,
      title,
      instructions: instructions || null,
      due_at: dueAt || null,
      question_count: questionCount,
      concept_ids: conceptIds,
    },
    { timeout: 180000 }
  );
  return data;
}

export async function deleteAssignment(id) {
  await apiClient.delete(`/assignments/${id}`);
}

export async function startAssignment(id) {
  const { data } = await apiClient.post(`/assignments/${id}/start`);
  return data;
}

export async function fetchAssessments() {
  const { data } = await apiClient.get("/assessments");
  return data;
}

export async function fetchAssessmentBlueprint({ courseId, mode, questionCount, conceptIds }) {
  const params = new URLSearchParams({ course_id: courseId, mode, question_count: questionCount });
  conceptIds.forEach((id) => params.append("concept_ids", id));
  const { data } = await apiClient.get("/assessments/blueprint", { params });
  return data;
}

export async function createAssessment({ courseId, mode, questionCount, conceptIds }) {
  const { data } = await apiClient.post(
    "/assessments",
    { course_id: courseId, mode, question_count: questionCount, concept_ids: conceptIds },
    { timeout: 180000 }
  );
  return data;
}

export async function fetchAssessment(id) {
  const { data } = await apiClient.get(`/assessments/${id}`);
  return data;
}

export async function submitAssessment(id, answers) {
  const { data } = await apiClient.post(`/assessments/${id}/submit`, { answers });
  return data;
}

export async function deleteAssessment(id) {
  await apiClient.delete(`/assessments/${id}`);
}

// A blob error body is unreadable as JSON, so pull the detail out of it.
export async function errorDetail(err, fallback) {
  const body = err.response?.data;
  if (body instanceof Blob) {
    try {
      return JSON.parse(await body.text()).detail || fallback;
    } catch {
      return fallback;
    }
  }
  return body?.detail || fallback;
}

export async function fetchInstructorOverview(courseId) {
  const { data } = await apiClient.get("/analytics/instructor", {
    params: courseId ? { course_id: courseId } : {},
  });
  return data;
}

export async function fetchStudentOverview(courseId) {
  const { data } = await apiClient.get("/analytics/student", {
    params: courseId ? { course_id: courseId } : {},
  });
  return data;
}

export async function askAssistant({ message, history, courseId }) {
  const { data } = await apiClient.post("/assistant/chat", {
    message,
    history,
    course_id: courseId || null,
  });
  return data;
}

export async function login(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function register(email, password, role = "student", { organizationCode, organizationName } = {}) {
  const { data } = await apiClient.post("/auth/register", {
    email,
    password,
    role,
    organization_code: organizationCode || null,
    organization_name: organizationName || null,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function joinOrganization(code) {
  const { data } = await apiClient.post("/auth/organization/join", { code });
  return data;
}

export async function createOrganization(name) {
  const { data } = await apiClient.post("/auth/organization", { name });
  return data;
}

export async function leaveOrganization() {
  const { data } = await apiClient.post("/auth/organization/leave");
  return data;
}

export async function joinCourseByCode(code) {
  const { data } = await apiClient.post("/courses/join", { code });
  return data;
}

export async function regenerateJoinCode(courseId) {
  const { data } = await apiClient.post(`/courses/${courseId}/join-code`);
  return data.join_code;
}

export default apiClient;
