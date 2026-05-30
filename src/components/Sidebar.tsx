import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder,
  FolderPlus,
  LogOut,
  Pencil,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import type { Folder as FolderType, Note, User } from "../types";

interface Props {
  user: User;
  notes: Note[];
  folders: FolderType[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (folderId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => Promise<FolderType>;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}

function userInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
}

function userDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

function NoteItem({
  note,
  activeId,
  search,
  onSelect,
  onDelete,
  indent = 0,
}: {
  note: Note;
  activeId: string | null;
  search: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  indent?: number;
}) {
  return (
    <li>
      <button
        onClick={() => onSelect(note.id)}
        style={{ paddingLeft: `${12 + indent * 16}px` }}
        className={`w-full text-left pr-3 py-2 rounded-lg transition-colors group relative ${
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
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="absolute right-2 top-2.5 hidden group-hover:flex p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </button>
    </li>
  );
}

function FolderRow({
  folder,
  folders,
  notes,
  activeId,
  search,
  expanded,
  onToggle,
  onSelect,
  onDelete,
  onCreate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  depth = 0,
}: {
  folder: FolderType;
  folders: FolderType[];
  notes: Note[];
  activeId: string | null;
  search: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (folderId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => Promise<FolderType>;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  depth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const isOpen = expanded.has(folder.id);
  const childFolders = folders.filter((f) => f.parentId === folder.id);
  const folderNotes = notes
    .filter((n) => n.folderId === folder.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) onRenameFolder(folder.id, trimmed);
    else setName(folder.name);
    setEditing(false);
  }

  return (
    <li>
      <div
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        className="flex items-center gap-0.5 group rounded-lg hover:bg-gray-50 pr-1"
      >
        <button
          onClick={() => onToggle(folder.id)}
          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setName(folder.name); setEditing(false); }
            }}
            className="flex-1 text-sm text-gray-700 outline-none bg-white border border-blue-300 rounded px-1 py-0.5 min-w-0"
          />
        ) : (
          <button
            onClick={() => onToggle(folder.id)}
            onDoubleClick={() => setEditing(true)}
            className="flex-1 text-left text-sm font-medium text-gray-700 truncate py-1.5"
          >
            {folder.name}
          </button>
        )}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onCreate(folder.id)}
            className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"
            title="在此文件夹新建笔记"
          >
            <FilePlus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onCreateFolder(folder.id)}
            className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600"
            title="新建子文件夹"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="重命名"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (confirm(`删除文件夹「${folder.name}」？其中的笔记将移至未分类。`)) {
                onDeleteFolder(folder.id);
              }
            }}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="删除文件夹"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {isOpen && (
        <ul className="space-y-0.5">
          {folderNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              activeId={activeId}
              search={search}
              onSelect={onSelect}
              onDelete={onDelete}
              indent={depth + 2}
            />
          ))}
          {childFolders.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              folders={folders}
              notes={notes}
              activeId={activeId}
              search={search}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
              onCreate={onCreate}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
            />
          ))}
          {folderNotes.length === 0 && childFolders.length === 0 && (
            <li className="text-xs text-gray-300 py-1" style={{ paddingLeft: `${28 + depth * 16}px` }}>
              空文件夹
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({
  user,
  notes,
  folders,
  activeId,
  onSelect,
  onCreate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDelete,
  onSignOut,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const f of folders) {
        if (!prev.has(f.id)) { next.add(f.id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [folders]);

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();
  const isFiltering = Boolean(search || filterTag);

  const filtered = notes.filter((n) => {
    const kw = search.toLowerCase();
    const matchText = !kw || n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw);
    const matchTag = !filterTag || n.tags.includes(filterTag);
    return matchText && matchTag;
  });

  const rootFolders = folders.filter((f) => !f.parentId);
  const uncategorized = notes
    .filter((n) => !n.folderId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function toggleFolder(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateFolder(parentId?: string | null) {
    const folder = await onCreateFolder(parentId);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(folder.id);
      if (parentId) next.add(parentId);
      return next;
    });
    return folder;
  }

  return (
    <aside className="h-full flex flex-col bg-white select-none min-w-0">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <span className="font-bold text-gray-800 text-base">Marknote</span>
        <div className="flex gap-1">
          <button
            onClick={() => onCreate(null)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
            title="新建笔记"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCreateFolder(null)}
            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
            title="新建文件夹"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/40 px-3 py-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm">
          {userInitials(user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{userDisplayName(user.email)}</p>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/80 text-gray-400 hover:text-red-500 transition-colors"
          title="退出登录"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

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

      <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {isFiltering ? (
          <>
            {filtered.length === 0 && (
              <li className="text-xs text-gray-400 text-center mt-8">没有匹配的笔记</li>
            )}
            {filtered.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                activeId={activeId}
                search={search}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </>
        ) : (
          <>
            {uncategorized.length > 0 && (
              <>
                {folders.length > 0 && (
                  <li className="px-3 pt-1 pb-0.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    未分类
                  </li>
                )}
                {uncategorized.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    activeId={activeId}
                    search={search}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                ))}
              </>
            )}
            {rootFolders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                folders={folders}
                notes={notes}
                activeId={activeId}
                search={search}
                expanded={expanded}
                onToggle={toggleFolder}
                onSelect={onSelect}
                onDelete={onDelete}
                onCreate={onCreate}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
              />
            ))}
            {notes.length === 0 && folders.length === 0 && (
              <li className="text-xs text-gray-400 text-center mt-8">
                还没有笔记，点击 + 新建
              </li>
            )}
          </>
        )}
      </ul>
    </aside>
  );
}
