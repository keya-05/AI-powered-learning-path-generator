import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import WidgetCard from "./WidgetCard";

function readinessColor(score) {
  if (score >= 75) return "#22c55e";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

export default function ExamReadinessGauge({ score = 62, sample = true }) {
  const data = [{ name: "readiness", value: score, fill: readinessColor(score) }];

  return (
    <WidgetCard title="Exam Readiness" subtitle="Based on PYQs and topic completion" sample={sample}>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" background={{ fill: "#e2e8f0" }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">{score}%</span>
          <span className="text-xs text-gray-500 dark:text-slate-400">ready</span>
        </div>
      </div>
    </WidgetCard>
  );
}
