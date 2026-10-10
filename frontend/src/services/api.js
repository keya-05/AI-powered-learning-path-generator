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

export async function createCourse({ title, code, description }) {
  const { data } = await apiClient.post("/courses", { title, code, description });
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

export async function login(email, password) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function register(email, password, role = "student") {
  const { data } = await apiClient.post("/auth/register", { email, password, role });
  return data;
}

export default apiClient;
