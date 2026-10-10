import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useChartTheme } from "../../lib/chartTheme";
import WidgetCard from "./WidgetCard";

export default function MasteryRadarWidget({ units }) {
  const chart = useChartTheme();
  const data = units.map((unit) => ({ unit: unit.label, mastery: Math.round(unit.mastery * 100) }));

  return (
    <WidgetCard title="Mastery by Unit" subtitle="Average of your assessed concepts in each unit">
      <div className="h-64">
        {data.length < 3 ? (
          <p className="muted text-sm">Not enough units assessed to chart yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke={chart.grid} />
              <PolarAngleAxis dataKey="unit" tick={{ fontSize: 11, fill: chart.axis }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Mastery"
                dataKey="mastery"
                stroke={chart.accent}
                fill={chart.accent}
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Mastery"]}
                contentStyle={chart.tooltip.contentStyle}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetCard>
  );
}
