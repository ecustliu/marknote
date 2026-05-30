import { useState } from "react";
import { BookOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotes } from "../hooks/useNotes";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import Sidebar from "../components/Sidebar";
import Editor from "../components/Editor";
import type { Note } from "../types";

export default function NotesPage() {
  const { user, signOut } = useAuth();
  const {
    notes,
    folders,
    loading,
    createNote,
    deleteNote,
    saveNote,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNoteToFolder,
  } = useNotes(user!.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { width, collapsed, resizing, toggleCollapsed, startResize } = useSidebarLayout();

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  async function handleCreate(folderId?: string | null) {
    const note = await createNote(folderId);
    setActiveId(note.id);
  }

  async function handleDelete(id: string) {
    await deleteNote(id);
    if (activeId === id) setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
  }

  return (
    <div className="flex h-full bg-white">
      {!collapsed && (
        <div
          className="relative flex-shrink-0 h-full border-r border-gray-100"
          style={{ width }}
        >
          <Sidebar
            user={user!}
            notes={notes}
            folders={folders}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreate}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDelete={handleDelete}
            onMoveNote={moveNoteToFolder}
            onSignOut={signOut}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧边栏宽度"
            onMouseDown={(e) => {
              e.preventDefault();
              startResize(e.clientX);
            }}
            className={`absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize group ${
              resizing ? "bg-blue-100" : ""
            }`}
          >
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full transition-colors ${
                resizing ? "bg-blue-400" : "bg-gray-200 group-hover:bg-blue-300"
              }`}
            />
          </div>
        </div>
      )}

      <div className="relative flex flex-1 min-w-0 flex-col">
        <button
          onClick={toggleCollapsed}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-colors"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-300">加载中…</div>
          ) : activeNote ? (
            <Editor
              note={activeNote}
              userId={user!.id}
              folders={folders}
              onSave={(patch: Partial<Note>) => saveNote(activeNote.id, patch)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
              <BookOpen className="w-12 h-12" />
              <p className="text-sm">从左侧选择笔记，或点击 + 新建</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
