import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
import type { Folder, Note } from "../types";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatches = useRef<Map<string, Partial<Note>>>(new Map());

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([db.listNotes(userId), db.listFolders(userId), db.listTrashedNotes(userId)])
      .then(([notesResult, foldersResult, trashResult]) => {
        if (!active) return;
        if (notesResult.status === "fulfilled") setNotes(notesResult.value);
        else console.error("加载笔记失败:", notesResult.reason);
        if (foldersResult.status === "fulfilled") setFolders(foldersResult.value);
        if (trashResult.status === "fulfilled") setTrashedNotes(trashResult.value);
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [userId]);

  const persistNote = useCallback(async (id: string) => {
    const patch = pendingPatches.current.get(id);
    if (!patch || Object.keys(patch).length === 0) return;

    pendingPatches.current.delete(id);
    setSaveState("saving");
    try {
      const updated = await db.updateNote(id, patch);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setSaveState("saved");
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      console.error("保存笔记失败:", err);
      pendingPatches.current.set(id, { ...patch, ...pendingPatches.current.get(id) });
      setSaveState("error");
    }
  }, []);

  const createNote = useCallback(async (folderId?: string | null) => {
    const note = await db.createNote(userId, { folderId: folderId ?? null });
    setNotes((prev) => [note, ...prev]);
    return note;
  }, [userId]);

  const deleteNote = useCallback(async (id: string) => {
    let removed: Note | undefined;
    setNotes((prev) => {
      removed = prev.find((n) => n.id === id);
      return prev.filter((n) => n.id !== id);
    });
    pendingPatches.current.delete(id);
    await db.deleteNote(id);
    if (removed) {
      setTrashedNotes((prev) => [
        { ...removed!, deletedAt: new Date().toISOString() },
        ...prev.filter((n) => n.id !== id),
      ]);
    }
  }, []);

  const restoreNote = useCallback(async (id: string) => {
    const restored = await db.restoreNote(id);
    setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
    setNotes((prev) => [restored, ...prev.filter((n) => n.id !== id)]);
    return restored;
  }, []);

  const permanentlyDeleteNote = useCallback(async (id: string) => {
    await db.permanentlyDeleteNote(id);
    setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const emptyTrash = useCallback(async () => {
    await db.emptyTrash(userId);
    setTrashedNotes([]);
  }, [userId]);

  const saveNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
    );
    pendingPatches.current.set(id, { ...pendingPatches.current.get(id), ...patch });
    setSaveState("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistNote(id), 800);
  }, [persistNote]);

  const flushSave = useCallback(async (id: string, patch?: Partial<Note>) => {
    if (patch) {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
      );
      pendingPatches.current.set(id, { ...pendingPatches.current.get(id), ...patch });
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persistNote(id);
  }, [persistNote]);

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

  const moveNoteToFolder = useCallback(async (id: string, folderId: string | null) => {
    setNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (!note || note.folderId === folderId) return prev;
      return prev.map((n) =>
        n.id === id ? { ...n, folderId, updatedAt: new Date().toISOString() } : n
      );
    });
    const updated = await db.updateNote(id, { folderId });
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }, []);

  const enableShare = useCallback(async (id: string) => {
    const updated = await db.enableShare(id);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const disableShare = useCallback(async (id: string) => {
    const updated = await db.disableShare(id);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  return {
    notes,
    trashedNotes,
    folders,
    loading,
    saveState,
    createNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    emptyTrash,
    saveNote,
    flushSave,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNoteToFolder,
    enableShare,
    disableShare,
  };
}
