import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./layouts/AppLayout";
import AIAssistantPage from "./pages/AIAssistantPage";
import AssessmentsPage from "./pages/AssessmentsPage";
import CourseContentManagerPage from "./pages/CourseContentManagerPage";
import DashboardPage from "./pages/DashboardPage";
import GapInsightsPage from "./pages/GapInsightsPage";
import LearningPathPage from "./pages/LearningPathPage";
import LoginPage from "./pages/LoginPage";
import MasterKnowledgeGraphPage from "./pages/MasterKnowledgeGraphPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route
                path="courses"
                element={
                  <RoleRoute role="student">
                    <MyCoursesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="learning-path"
                element={
                  <RoleRoute role="student">
                    <LearningPathPage />
                  </RoleRoute>
                }
              />
              <Route
                path="assessments"
                element={
                  <RoleRoute role="student">
                    <AssessmentsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="assistant"
                element={
                  <RoleRoute role="student">
                    <AIAssistantPage />
                  </RoleRoute>
                }
              />

              <Route
                path="content"
                element={
                  <RoleRoute role="instructor">
                    <CourseContentManagerPage />
                  </RoleRoute>
                }
              />
              <Route
                path="knowledge-graph"
                element={
                  <RoleRoute role="instructor">
                    <MasterKnowledgeGraphPage />
                  </RoleRoute>
                }
              />
              <Route
                path="gap-insights"
                element={
                  <RoleRoute role="instructor">
                    <GapInsightsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="question-bank"
                element={
                  <RoleRoute role="instructor">
                    <QuestionBankPage />
                  </RoleRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
