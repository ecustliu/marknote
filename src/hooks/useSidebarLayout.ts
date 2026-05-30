import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "marknote-sidebar";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

interface SidebarLayout {
  width: number;
  collapsed: boolean;
}

function loadLayout(): SidebarLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { width: DEFAULT_WIDTH, collapsed: false };
    const parsed = JSON.parse(raw) as Partial<SidebarLayout>;
    const width = typeof parsed.width === "number"
      ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width))
      : DEFAULT_WIDTH;
    return { width, collapsed: Boolean(parsed.collapsed) };
  } catch {
    return { width: DEFAULT_WIDTH, collapsed: false };
  }
}

function saveLayout(layout: SidebarLayout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function useSidebarLayout() {
  const [layout, setLayout] = useState<SidebarLayout>(loadLayout);
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const setWidth = useCallback((width: number) => {
    setLayout((prev) => ({
      ...prev,
      width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)),
    }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setLayout((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);

  const startResize = useCallback(
    (clientX: number) => {
      if (layout.collapsed) return;
      startX.current = clientX;
      startWidth.current = layout.width;
      setResizing(true);
    },
    [layout.collapsed, layout.width]
  );

  useEffect(() => {
    if (!resizing) return;

    function onMove(e: MouseEvent) {
      setWidth(startWidth.current + e.clientX - startX.current);
    }

    function onUp() {
      setResizing(false);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.classList.add("sidebar-resizing");

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.classList.remove("sidebar-resizing");
    };
  }, [resizing, setWidth]);

  return {
    width: layout.width,
    collapsed: layout.collapsed,
    resizing,
    toggleCollapsed,
    startResize,
    MIN_WIDTH,
    MAX_WIDTH,
  };
}
