import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
import type { Folder, Note } from "../types";

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([db.listNotes(userId), db.listFolders(userId)])
      .then(([notesResult, foldersResult]) => {
        if (!active) return;
        if (notesResult.status === "fulfilled") setNotes(notesResult.value);
        else console.error("加载笔记失败:", notesResult.reason);
        if (foldersResult.status === "fulfilled") setFolders(foldersResult.value);
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [userId]);

  const createNote = useCallback(async (folderId?: string | null) => {
    const note = await db.createNote(userId, { folderId: folderId ?? null });
    setNotes((prev) => [note, ...prev]);
    return note;
  }, [userId]);

  const deleteNote = useCallback(async (id: string) => {
    await db.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const saveNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      db.updateNote(id, patch).then((updated) => {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      });
    }, 800);
  }, []);

  const createFolder = useCallback(async (parentId?: string | null) => {
    const folder = await db.createFolder(userId, { parentId: parentId ?? null });
    setFolders((prev) => [...prev, folder]);
    return folder;
  }, [userId]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const updated = await db.updateFolder(id, { name });
    setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await db.deleteFolder(id);
    setFolders((prev) => {
      const deleted = prev.find((d) => d.id === id);
      const parentId = deleted?.parentId ?? null;
      return prev
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId } : f));
    });
    setNotes((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)));
  }, []);

  return {
    notes,
    folders,
    loading,
    createNote,
    deleteNote,
    saveNote,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}
