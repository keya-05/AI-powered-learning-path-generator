import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartTheme } from "../../lib/chartTheme";
import { GAP_THRESHOLD, MASTERY_HEX, MASTERY_TEXT, formatPercent, masteryLevel } from "../../lib/mastery";
import MasteryBar from "../ui/MasteryBar";
import WidgetCard from "./WidgetCard";

const LIST_LIMIT = 4;

export default function ClassPerformanceBar({ overview }) {
  const chart = useChartTheme();
  const unitData = overview.unit_mastery.map((unit) => ({
    unit: unit.label,
    mastery: Math.round(unit.mastery * 100),
    level: masteryLevel(unit.mastery),
  }));
  const struggling = overview.students
    .filter((student) => student.mastery !== null && student.mastery < GAP_THRESHOLD)
    .slice(0, LIST_LIMIT);
  const hardest = [...overview.concepts]
    .filter((concept) => concept.students_assessed > 0)
    .sort((a, b) => b.struggling_pct - a.struggling_pct)
    .slice(0, LIST_LIMIT);

  return (
    <WidgetCard title="Class Performance" subtitle="Average mastery per unit across enrolled students">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="h-64 lg:col-span-3">
          {unitData.length === 0 ? (
            <p className="muted text-sm">No units to chart yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} margin={{ left: -24, right: 4, top: 4 }} barCategoryGap="28%">
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="unit"
                  tick={{ fontSize: 11, fill: chart.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: chart.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Avg. mastery"]}
                  contentStyle={chart.tooltip.contentStyle}
                  cursor={chart.tooltip.cursor}
                />
                <Bar dataKey="mastery" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {unitData.map((entry) => (
                    <Cell key={entry.unit} fill={MASTERY_HEX[entry.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div>
            <p className="eyebrow mb-3">Students below {Math.round(GAP_THRESHOLD * 100)}%</p>
            {struggling.length === 0 ? (
              <p className="muted text-sm">Every student is above the gap threshold.</p>
            ) : (
              <ul className="space-y-2.5">
                {struggling.map((student) => (
                  <li key={student.student_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800 dark:text-slate-200">
                        {student.display_name}
                      </span>
                      <span className="muted block truncate text-xs">
                        {student.weak_concept_count} weak concept
                        {student.weak_concept_count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${MASTERY_TEXT[masteryLevel(student.mastery)]}`}
                    >
                      {formatPercent(student.mastery)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="eyebrow mb-3">Most difficult concepts</p>
            <ul className="space-y-3">
              {hardest.map((concept) => (
                <li key={concept.concept_id}>
                  <MasteryBar
                    size="sm"
                    label={concept.title}
                    score={concept.average_mastery}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
