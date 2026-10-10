// Lays concepts out in one column per syllabus unit. Prerequisite edges live in Neo4j,
// which the frontend doesn't read yet, so the graph only shows unit structure for now.

const COLUMN_WIDTH = 168;
const ROW_HEIGHT = 66;
const HEADER_OFFSET = 44;
const NODE_WIDTH = 148;

const PALETTES = {
  light: {
    high: { background: "#ecfdf5", border: "#6ee7b7", color: "#065f46" },
    mid: { background: "#fffbeb", border: "#fcd34d", color: "#92400e" },
    low: { background: "#fff1f2", border: "#fda4af", color: "#9f1239" },
    none: { background: "#f8fafc", border: "#cbd5e1", color: "#475569" },
    header: "#64748b",
  },
  dark: {
    high: { background: "#022c22", border: "#047857", color: "#a7f3d0" },
    mid: { background: "#2a1a04", border: "#b45309", color: "#fde68a" },
    low: { background: "#2a0a12", border: "#be123c", color: "#fecdd3" },
    none: { background: "#0f172a", border: "#334155", color: "#cbd5e1" },
    header: "#94a3b8",
  },
};

export function buildUnitGraph(items, { dark, levelOf, labelOf }) {
  const palette = PALETTES[dark ? "dark" : "light"];
  const units = [...new Set(items.map((item) => item.unit_number))].sort((a, b) => a - b);

  const nodes = [];
  units.forEach((unit, column) => {
    nodes.push({
      id: `unit-${unit}`,
      position: { x: column * COLUMN_WIDTH, y: 0 },
      data: { label: `Unit ${unit}` },
      draggable: false,
      selectable: false,
      style: {
        width: NODE_WIDTH,
        background: "transparent",
        border: "none",
        boxShadow: "none",
        color: palette.header,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      },
    });

    items
      .filter((item) => item.unit_number === unit)
      .forEach((item, row) => {
        const colors = palette[levelOf(item)];
        nodes.push({
          id: item.concept_id,
          position: { x: column * COLUMN_WIDTH, y: HEADER_OFFSET + row * ROW_HEIGHT },
          data: { label: labelOf(item) },
          style: {
            width: NODE_WIDTH,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.color,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.35,
            whiteSpace: "pre-line",
            boxShadow: "none",
          },
        });
      });
  });

  return { nodes, edges: [] };
}
