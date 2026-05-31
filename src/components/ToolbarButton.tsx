import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  tip: string;
  active?: boolean;
  className?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

/** 工具栏按钮：悬停即时显示中文说明 */
export default function ToolbarButton({ label, tip, active, className = "", onMouseDown }: Props) {
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      onMouseDown={onMouseDown}
      className={`group relative px-2 py-1 rounded text-sm transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
      } ${className}`}
    >
      {label}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-normal text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {tip}
      </span>
    </button>
  );
}
