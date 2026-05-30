import { ListTree } from "lucide-react";
import type { TocItem } from "../lib/headings";

interface Props {
  items: TocItem[];
  onSelect: (item: TocItem) => void;
}

export default function TocPanel({ items, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 text-xs font-medium text-gray-500">
        <ListTree className="w-3.5 h-3.5" />
        目录
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={`${item.id}-${item.index}`}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md px-2 py-1.5 transition-colors truncate"
                style={{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }}
                title={item.text}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
