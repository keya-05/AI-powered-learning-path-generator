import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";

export default function LearningPathPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Personalized Learning Path
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Drag, zoom, and pan the graph to explore prerequisites for every concept in your course.
        </p>
      </div>

      <ConceptGraphWidget interactive height={560} />
    </div>
  );
}
