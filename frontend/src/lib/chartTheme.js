import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Chart colours per role, matching the CSS variable palettes in index.css.
const PALETTES = {
  student: {
    light: { grid: "#f3d0de", axis: "#a0607c", accent: "#1f8080", track: "#f4c4d6", surface: "#feeff5", border: "#e4b2c6", text: "#2d1624", cursor: "#fae6ee" },
    dark: { grid: "#3a1e30", axis: "#c4849e", accent: "#5ec8c0", track: "#3a1e30", surface: "#2c1624", border: "#623549", text: "#fdf2f6", cursor: "#3a1e30" },
  },
  instructor: {
    light: { grid: "#cfded6", axis: "#637d70", accent: "#1f523e", track: "#c4d8cd", surface: "#e8f1ec", border: "#b1c7bc", text: "#19241f", cursor: "#e4ede8" },
    dark: { grid: "#23342c", axis: "#86a093", accent: "#81bda1", track: "#23342c", surface: "#192620", border: "#394d43", text: "#f1f6f3", cursor: "#23342c" },
  },
};

export function useChartTheme() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = theme === "dark";
  const role = user?.role === "instructor" ? "instructor" : "student";
  const p = PALETTES[role][dark ? "dark" : "light"];

  return {
    dark,
    grid: p.grid,
    axis: p.axis,
    accent: p.accent,
    track: p.track,
    tooltip: {
      contentStyle: {
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 14,
        border: `1px solid ${p.border}`,
        background: p.surface,
        color: p.text,
        boxShadow: "0 10px 24px -12px rgb(20 20 40 / 0.35)",
      },
      cursor: { fill: p.cursor },
    },
  };
}
