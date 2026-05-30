import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataAdapter, Note } from "../types";
import { isValidSupabaseAnonKey } from "./supabaseConfig";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string) || "note-images";

function isValidSupabaseConfig(rawUrl?: string, rawKey?: string): boolean {
  const u = rawUrl?.trim();
  const k = rawKey?.trim();
  if (!u || !k) return false;
  if (u.includes("YOUR_PROJECT") || k.includes("YOUR_ANON")) return false;
  if (!u.startsWith("https://") || !u.includes(".supabase.co")) return false;
  return isValidSupabaseAnonKey(k);
}

export const isSupabaseConfigured = isValidSupabaseConfig(url, anonKey);

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured) throw new Error("Supabase 未配置");
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export class RegistrationPendingError extends Error {
  constructor(message = "注册成功，请查收确认邮件后再登录") {
    super(message);
    this.name = "RegistrationPending";
  }
}

// 数据库行 -> 应用模型
interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    content: r.content ?? "",
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const supabaseAdapter: DataAdapter = {
  mode: "supabase",

  async getCurrentUser() {
    const { data } = await db().auth.getSession();
    return data.session?.user
      ? { id: data.session.user.id, email: data.session.user.email ?? "" }
      : null;
  },

  async signIn(email, password) {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { id: data.user!.id, email: data.user!.email ?? "" };
  },

  async signUp(email, password) {
    const { data, error } = await db().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new RegistrationPendingError();
    return { id: data.user!.id, email: data.user!.email ?? "" };
  },

  async signOut() {
    await db().auth.signOut();
  },

  onAuthChange(cb) {
    const { data } = db().auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async listNotes(userId) {
    const { data, error } = await db()
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as NoteRow[]).map(rowToNote);
  },

  async createNote(userId, partial) {
    const { data, error } = await db()
      .from("notes")
      .insert({
        user_id: userId,
        title: partial?.title ?? "未命名笔记",
        content: partial?.content ?? "",
        tags: partial?.tags ?? [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToNote(data as NoteRow);
  },

  async updateNote(id, patch) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.content !== undefined) payload.content = patch.content;
    if (patch.tags !== undefined) payload.tags = patch.tags;
    const { data, error } = await db()
      .from("notes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToNote(data as NoteRow);
  },

  async deleteNote(id) {
    const { error } = await db().from("notes").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async uploadImage(userId, file) {
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await db().storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data } = db().storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
