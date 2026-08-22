import { useState } from "react";
import CourseDashboard from "../components/CourseDashboard";
import NavBar from "../components/NavBar";
import ResourceUploader from "../components/ResourceUploader";

export default function DashboardPage() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Your Learning Workspace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track mastery across courses and feed new material into your revision path.
        </p>

        <div className="mt-8">
          <CourseDashboard onSelectCourse={setSelectedCourse} />
        </div>

        {selectedCourse && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Upload resources for {selectedCourse.title}
            </h2>
            <ResourceUploader
              courseId={selectedCourse.id}
              onUploadComplete={() => setSelectedCourse(selectedCourse)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
