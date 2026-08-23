import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import WidgetCard from "./WidgetCard";

const SAMPLE_UNITS = [
  { unit: "Arrays", mastery: 88 },
  { unit: "Linked Lists", mastery: 76 },
  { unit: "Trees", mastery: 42 },
  { unit: "Graphs", mastery: 30 },
  { unit: "Sorting", mastery: 70 },
  { unit: "DP", mastery: 25 },
];

export default function MasteryRadarWidget({ data = SAMPLE_UNITS, sample = true }) {
  return (
    <WidgetCard
      title="Skill Mastery by Unit"
      subtitle="Coverage across syllabus units"
      sample={sample}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="65%" margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="unit"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-gray-500 dark:text-slate-400"
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Mastery"
              dataKey="mastery"
              stroke="#4f46e5"
              fill="#6366f1"
              fillOpacity={0.35}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Mastery"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
