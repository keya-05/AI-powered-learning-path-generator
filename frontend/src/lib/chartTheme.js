import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    dark,
    grid: dark ? "#1e293b" : "#f1f5f9",
    axis: dark ? "#64748b" : "#94a3b8",
    accent: dark ? "#818cf8" : "#4f46e5",
    track: dark ? "#1e293b" : "#f1f5f9",
    tooltip: {
      contentStyle: {
        fontSize: 12,
        borderRadius: 10,
        border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
        background: dark ? "#0f172a" : "#ffffff",
        color: dark ? "#e2e8f0" : "#0f172a",
        boxShadow: "0 4px 12px rgb(15 23 42 / 0.08)",
      },
      cursor: { fill: dark ? "#1e293b" : "#f8fafc" },
    },
  };
}
