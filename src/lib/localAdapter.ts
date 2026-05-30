import type { DataAdapter, Folder, Note, User } from "../types";

// 本地存储适配器：无需任何后端即可跑通「登录 + 笔记 CRUD + 图片」主线。
// 数据存浏览器 localStorage，图片转 base64 内联。仅用于开发/演示，
// 配置 Supabase 环境变量后会自动切换到云端适配器。

const USERS_KEY = "marknote.users";
const SESSION_KEY = "marknote.session";
const NOTES_KEY = "marknote.notes";
const FOLDERS_KEY = "marknote.folders";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type StoredUser = User & { password: string };

const authListeners = new Set<(u: User | null) => void>();
function emitAuth(user: User | null) {
  authListeners.forEach((cb) => cb(user));
}

export const localAdapter: DataAdapter = {
  mode: "local",

  async getCurrentUser() {
    return read<User | null>(SESSION_KEY, null);
  },

  async signIn(email, password) {
    const users = read<StoredUser[]>(USERS_KEY, []);
    const found = users.find((u) => u.email === email);
    if (!found) throw new Error("账号不存在，请先注册");
    if (found.password !== password) throw new Error("密码错误");
    const user: User = { id: found.id, email: found.email };
    write(SESSION_KEY, user);
    emitAuth(user);
    return user;
  },

  async signUp(email, password) {
    const users = read<StoredUser[]>(USERS_KEY, []);
    if (users.some((u) => u.email === email)) throw new Error("该邮箱已注册");
    const stored: StoredUser = { id: uid("u_"), email, password };
    users.push(stored);
    write(USERS_KEY, users);
    const user: User = { id: stored.id, email: stored.email };
    write(SESSION_KEY, user);
    emitAuth(user);
    return user;
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emitAuth(null);
  },

  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },

  async listNotes(userId) {
    const all = read<Note[]>(NOTES_KEY, []);
    return all
      .filter((n) => n.userId === userId)
      .map((n) => ({ ...n, folderId: n.folderId ?? null }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createNote(userId, partial) {
    const all = read<Note[]>(NOTES_KEY, []);
    const now = new Date().toISOString();
    const note: Note = {
      id: uid("n_"),
      userId,
      title: partial?.title ?? "未命名笔记",
      content: partial?.content ?? "",
      tags: partial?.tags ?? [],
      folderId: partial?.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    all.push(note);
    write(NOTES_KEY, all);
    return note;
  },

  async updateNote(id, patch) {
    const all = read<Note[]>(NOTES_KEY, []);
    const idx = all.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error("笔记不存在");
    const updated: Note = {
      ...all[idx],
      ...patch,
      id,
      folderId: patch.folderId !== undefined ? patch.folderId : (all[idx].folderId ?? null),
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    write(NOTES_KEY, all);
    return updated;
  },

  async deleteNote(id) {
    const all = read<Note[]>(NOTES_KEY, []);
    write(
      NOTES_KEY,
      all.filter((n) => n.id !== id)
    );
  },

  async listFolders(userId) {
    const all = read<Folder[]>(FOLDERS_KEY, []);
    return all
      .filter((f) => f.userId === userId)
      .map((f) => ({ ...f, parentId: f.parentId ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  },

  async createFolder(userId, partial) {
    const all = read<Folder[]>(FOLDERS_KEY, []);
    const now = new Date().toISOString();
    const folder: Folder = {
      id: uid("f_"),
      userId,
      name: partial?.name ?? "新建文件夹",
      parentId: partial?.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    all.push(folder);
    write(FOLDERS_KEY, all);
    return folder;
  },

  async updateFolder(id, patch) {
    const all = read<Folder[]>(FOLDERS_KEY, []);
    const idx = all.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("文件夹不存在");
    const updated: Folder = {
      ...all[idx],
      ...patch,
      id,
      parentId: patch.parentId !== undefined ? patch.parentId : (all[idx].parentId ?? null),
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    write(FOLDERS_KEY, all);
    return updated;
  },

  async deleteFolder(id) {
    const folders = read<Folder[]>(FOLDERS_KEY, []);
    const notes = read<Note[]>(NOTES_KEY, []);
    const target = folders.find((f) => f.id === id);
    if (!target) return;

    const parentId = target.parentId ?? null;
    write(
      FOLDERS_KEY,
      folders.filter((f) => f.id !== id).map((f) => (f.parentId === id ? { ...f, parentId } : f))
    );
    write(
      NOTES_KEY,
      notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n))
    );
  },

  async uploadImage(_userId, file) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  },
};
