import { useCallback, useEffect, useRef, useState } from "react";
import { applyNodeChanges } from "reactflow";

// React Flow keeps a node hidden until it has measured it, and it drops those
// measurements whenever the `nodes` prop is replaced. Holding the nodes in state
// (so dimension changes are written back) and merging each recomputed layout
// into it keeps the diagram visible when styles, links or focus change.
export function useFlowNodes(computed) {
  const [nodes, setNodes] = useState(computed);
  const dragged = useRef(new Set());

  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return computed.map((node) => {
        const old = byId.get(node.id);
        if (!old) return node;
        return {
          ...node,
          width: old.width,
          height: old.height,
          position: dragged.current.has(node.id) ? old.position : node.position,
        };
      });
    });
  }, [computed]);

  const onNodesChange = useCallback((changes) => {
    changes.forEach((c) => c.type === "position" && c.dragging && dragged.current.add(c.id));
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  return [nodes, onNodesChange];
}
