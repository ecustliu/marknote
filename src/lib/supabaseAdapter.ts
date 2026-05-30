import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataAdapter, Folder, Note } from "../types";
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
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
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
    folderId: r.folder_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToFolder(r: FolderRow): Folder {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    parentId: r.parent_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** 检测是否已执行 folders 迁移（folders 表 + notes.folder_id） */
let foldersSchemaReady: boolean | null = null;
async function hasFoldersSchema(): Promise<boolean> {
  if (foldersSchemaReady !== null) return foldersSchemaReady;
  const { error } = await db().from("folders").select("id").limit(0);
  foldersSchemaReady = !error;
  return foldersSchemaReady;
}

function foldersNotReadyError(): Error {
  return new Error("文件夹功能需要先执行 supabase/schema.sql 数据库迁移");
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
    const row: Record<string, unknown> = {
      user_id: userId,
      title: partial?.title ?? "未命名笔记",
      content: partial?.content ?? "",
      tags: partial?.tags ?? [],
    };
    if (await hasFoldersSchema()) {
      row.folder_id = partial?.folderId ?? null;
    }
    const { data, error } = await db().from("notes").insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToNote(data as NoteRow);
  },

  async updateNote(id, patch) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.content !== undefined) payload.content = patch.content;
    if (patch.tags !== undefined) payload.tags = patch.tags;
    if (patch.folderId !== undefined && (await hasFoldersSchema())) {
      payload.folder_id = patch.folderId;
    }
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

  async listFolders(userId) {
    if (!(await hasFoldersSchema())) return [];
    const { data, error } = await db()
      .from("folders")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    if (error) throw new Error(error.message);
    return (data as FolderRow[]).map(rowToFolder);
  },

  async createFolder(userId, partial) {
    if (!(await hasFoldersSchema())) throw foldersNotReadyError();
    const { data, error } = await db()
      .from("folders")
      .insert({
        user_id: userId,
        name: partial?.name ?? "新建文件夹",
        parent_id: partial?.parentId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToFolder(data as FolderRow);
  },

  async updateFolder(id, patch) {
    if (!(await hasFoldersSchema())) throw foldersNotReadyError();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.parentId !== undefined) payload.parent_id = patch.parentId;
    const { data, error } = await db()
      .from("folders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToFolder(data as FolderRow);
  },

  async deleteFolder(id) {
    if (!(await hasFoldersSchema())) throw foldersNotReadyError();
    const { data: folder, error: fetchErr } = await db()
      .from("folders")
      .select("parent_id")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const parentId = (folder as { parent_id: string | null }).parent_id;

    const { error: notesErr } = await db()
      .from("notes")
      .update({ folder_id: null })
      .eq("folder_id", id);
    if (notesErr) throw new Error(notesErr.message);

    const { error: childErr } = await db()
      .from("folders")
      .update({ parent_id: parentId })
      .eq("parent_id", id);
    if (childErr) throw new Error(childErr.message);

    const { error } = await db().from("folders").delete().eq("id", id);
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
