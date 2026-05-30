import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
import type { Note } from "../types";

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    db.listNotes(userId)
      .then((list) => active && setNotes(list))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId]);

  const createNote = useCallback(async () => {
    const note = await db.createNote(userId);
    setNotes((prev) => [note, ...prev]);
    return note;
  }, [userId]);

  const deleteNote = useCallback(async (id: string) => {
    await db.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 节流保存：停止输入 800ms 后才真正写入，避免频繁请求
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

  return { notes, loading, createNote, deleteNote, saveNote };
}
