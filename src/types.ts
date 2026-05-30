export interface User {
  id: string;
  email: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  /** Markdown 源文本，作为单一数据源 */
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 数据层统一接口：local 适配器与 Supabase 适配器都实现它，三端共用 */
export interface DataAdapter {
  readonly mode: "local" | "supabase";

  // 认证
  getCurrentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  onAuthChange(cb: (user: User | null) => void): () => void;

  // 笔记 CRUD
  listNotes(userId: string): Promise<Note[]>;
  createNote(userId: string, partial?: Partial<Note>): Promise<Note>;
  updateNote(id: string, patch: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  // 图片上传，返回可访问 URL
  uploadImage(userId: string, file: File): Promise<string>;
}
