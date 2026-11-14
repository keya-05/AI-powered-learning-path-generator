// Lays concepts out in one column per syllabus unit and draws prerequisite links
// (from the prerequisite to the concept that needs it) from the course graph.
import { MarkerType, Position } from "reactflow";

const COLUMN_WIDTH = 196;
const ROW_HEIGHT = 74;
const HEADER_OFFSET = 44;
const NODE_WIDTH = 156;

const PALETTES = {
  light: {
    high: { background: "#ecfdf5", border: "#6ee7b7", color: "#065f46" },
    mid: { background: "#fffbeb", border: "#fcd34d", color: "#92400e" },
    low: { background: "#fff1f2", border: "#fda4af", color: "#9f1239" },
    none: { background: "#f8fafc", border: "#cbd5e1", color: "#475569" },
    header: "#64748b",
    edge: "#64748b",
    edgeMuted: "#cbd5e1",
    edgeFocus: "#be185d",
  },
  dark: {
    high: { background: "#022c22", border: "#047857", color: "#a7f3d0" },
    mid: { background: "#2a1a04", border: "#b45309", color: "#fde68a" },
    low: { background: "#2a0a12", border: "#be123c", color: "#fecdd3" },
    none: { background: "#0f172a", border: "#334155", color: "#cbd5e1" },
    header: "#94a3b8",
    edge: "#94a3b8",
    edgeMuted: "#334155",
    edgeFocus: "#f472b6",
  },
};

/**
 * items: concepts with concept_id, unit_number and optionally position.
 * links: [{ id, from, to, kind }] where `from` is the prerequisite; kind is
 *   "active" (default), "pending" (dashed, e.g. an automatic link awaiting review)
 *   or "muted" (rejected / removed, drawn faint).
 * focusId: highlights the links touching that concept.
 * badgeOf(item): optional short text placed before the label (e.g. a plan step number).
 */
export function buildUnitGraph(items, { dark, levelOf, labelOf, links = [], focusId = null, badgeOf = null }) {
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
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach((item, row) => {
        const colors = palette[levelOf(item)];
        const badge = badgeOf ? badgeOf(item) : null;
        const focused = focusId === item.concept_id;
        nodes.push({
          id: item.concept_id,
          position: { x: column * COLUMN_WIDTH, y: HEADER_OFFSET + row * ROW_HEIGHT },
          data: { label: badge ? `${badge}  ${labelOf(item)}` : labelOf(item) },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            width: NODE_WIDTH,
            background: colors.background,
            border: `${focused ? 2 : 1}px solid ${focused ? palette.edgeFocus : colors.border}`,
            color: colors.color,
            borderRadius: 14,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.35,
            whiteSpace: "pre-line",
            boxShadow: "none",
          },
        });
      });
  });

  const known = new Set(items.map((item) => item.concept_id));
  const edges = links
    .filter((link) => known.has(link.from) && known.has(link.to))
    .map((link) => {
      const touching = focusId && (link.from === focusId || link.to === focusId);
      const kind = link.kind ?? "active";
      const color = touching ? palette.edgeFocus : kind === "muted" ? palette.edgeMuted : palette.edge;
      return {
        id: link.id,
        source: link.from,
        target: link.to,
        type: "default",
        animated: Boolean(touching) && kind === "active",
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        style: {
          stroke: color,
          strokeWidth: touching ? 2 : 1.25,
          strokeDasharray: kind === "pending" ? "5 4" : kind === "muted" ? "2 4" : undefined,
          opacity: focusId && !touching ? 0.35 : 1,
        },
      };
    });

  return { nodes, edges };
}
