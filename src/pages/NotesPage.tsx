import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotes } from "../hooks/useNotes";
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
  } = useNotes(user!.id);
  const [activeId, setActiveId] = useState<string | null>(null);

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
        onSignOut={signOut}
      />

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
  );
}
