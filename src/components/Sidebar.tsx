import { useState } from "react";
import { FilePlus, LogOut, Search, Tag, Trash2 } from "lucide-react";
import type { Note, User } from "../types";

interface Props {
  user: User;
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}

function highlight(text: string, kw: string) {
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<mark class="bg-yellow-200 rounded">${text.slice(idx, idx + kw.length)}</mark>` +
    text.slice(idx + kw.length)
  );
}

export default function Sidebar({ user, notes, activeId, onSelect, onCreate, onDelete, onSignOut }: Props) {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // 所有出现过的 tag
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  const filtered = notes.filter((n) => {
    const kw = search.toLowerCase();
    const matchText = !kw || n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw);
    const matchTag = !filterTag || n.tags.includes(filterTag);
    return matchText && matchTag;
  });

  return (
    <aside className="w-64 h-full flex flex-col bg-white border-r border-gray-100 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <span className="font-bold text-gray-800 text-base">Marknote</span>
        <div className="flex gap-1">
          <button
            onClick={onCreate}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
            title="新建笔记"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="px-4 py-2 text-xs text-gray-400 truncate">{user.email}</div>

      {/* 搜索 */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或内容…"
            className="bg-transparent text-sm flex-1 outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Tag 筛选 */}
      {allTags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                filterTag === tag
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-500 border-gray-200 hover:border-blue-300"
              }`}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 笔记列表 */}
      <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {filtered.length === 0 && (
          <li className="text-xs text-gray-400 text-center mt-8">
            {search || filterTag ? "没有匹配的笔记" : "还没有笔记，点击 + 新建"}
          </li>
        )}
        {filtered.map((note) => (
          <li key={note.id}>
            <button
              onClick={() => onSelect(note.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group relative ${
                activeId === note.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <p
                className="text-sm font-medium truncate leading-snug"
                dangerouslySetInnerHTML={{ __html: highlight(note.title || "未命名笔记", search) }}
              />
              <p
                className="text-xs text-gray-400 truncate mt-0.5 leading-snug"
                dangerouslySetInnerHTML={{
                  __html: highlight(note.content.replace(/[#*`>_[\]]/g, "").slice(0, 60), search),
                }}
              />
              {note.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {note.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs px-1.5 py-0 rounded-full bg-gray-100 text-gray-500">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {/* 删除按钮（hover 显示） */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="absolute right-2 top-2.5 hidden group-hover:flex p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
