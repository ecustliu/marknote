import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListTree, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { TocItem } from "../lib/headings";

interface TocNode {
  item: TocItem;
  children: TocNode[];
}

interface Props {
  items: TocItem[];
  onSelect: (item: TocItem) => void;
}

const PANEL_COLLAPSED_KEY = "marknote-toc-panel-collapsed";

function buildTocTree(items: TocItem[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: { level: number; node: TocNode }[] = [];

  for (const item of items) {
    const node: TocNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ level: item.level, node });
  }
  return root;
}

function loadPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function TocTreeNode({
  node,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: TocNode;
  collapsed: Set<number>;
  onToggle: (index: number) => void;
  onSelect: (item: TocItem) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.item.index);

  return (
    <li>
      <div
        className="flex items-center min-w-0 rounded-md hover:bg-blue-50 group"
        style={{ paddingLeft: `${(node.item.level - 1) * 10 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.item.index);
            }}
            className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600"
            aria-label={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.item)}
          className="flex-1 min-w-0 text-left text-xs text-gray-600 group-hover:text-blue-600 py-1.5 pr-2 transition-colors truncate"
          title={node.item.text}
        >
          {node.item.text}
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <TocTreeNode
              key={`${child.item.id}-${child.item.index}`}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TocPanel({ items, onSelect }: Props) {
  const [panelCollapsed, setPanelCollapsed] = useState(loadPanelCollapsed);
  const [nodeCollapsed, setNodeCollapsed] = useState<Set<number>>(() => new Set());
  const tree = useMemo(() => buildTocTree(items), [items]);

  useEffect(() => {
    setNodeCollapsed(new Set());
  }, [items]);

  useEffect(() => {
    localStorage.setItem(PANEL_COLLAPSED_KEY, panelCollapsed ? "1" : "0");
  }, [panelCollapsed]);

  function toggleNode(index: number) {
    setNodeCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (items.length === 0) return null;

  if (panelCollapsed) {
    return (
      <aside className="w-9 shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col items-center py-3">
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="展开目录"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-3 border-b border-gray-100 text-xs font-medium text-gray-500">
        <ListTree className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">目录</span>
        <button
          type="button"
          onClick={() => setPanelCollapsed(true)}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="收起目录"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-1">
        <ul className="space-y-0.5">
          {tree.map((node) => (
            <TocTreeNode
              key={`${node.item.id}-${node.item.index}`}
              node={node}
              collapsed={nodeCollapsed}
              onToggle={toggleNode}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
