import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useChartTheme } from "../../lib/chartTheme";
import { MASTERY_HEX, masteryLevel, toPercent } from "../../lib/mastery";
import WidgetCard from "./WidgetCard";

export default function ExamReadinessGauge({ score, assessed, total }) {
  const chart = useChartTheme();
  const pct = toPercent(score) ?? 0;
  const data = [{ name: "mastery", value: pct, fill: MASTERY_HEX[masteryLevel(score)] }];

  return (
    <WidgetCard title="Overall Mastery" subtitle="Average across every concept you've been assessed on">
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="74%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: chart.track }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
            {score === null ? "—" : `${pct}%`}
          </span>
          <span className="muted mt-0.5 text-xs">
            {assessed} of {total} concepts
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}
