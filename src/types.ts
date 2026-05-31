export interface User {
  id: string;
  email: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  /** 父文件夹 ID，null 表示根级 */
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  /** Markdown 源文本，作为单一数据源 */
  content: string;
  tags: string[];
  /** 所属文件夹，null 表示未分类 */
  folderId: string | null;
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
  /** 发送密码重置邮件（云端模式） */
  requestPasswordReset(email: string): Promise<void>;
  /** 修改密码；已登录修改需传 currentPassword，邮件重置链接进入时不传 */
  updatePassword(newPassword: string, currentPassword?: string): Promise<void>;
  onAuthChange(cb: (user: User | null) => void): () => void;

  // 笔记 CRUD
  listNotes(userId: string): Promise<Note[]>;
  createNote(userId: string, partial?: Partial<Note>): Promise<Note>;
  updateNote(id: string, patch: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  // 文件夹 CRUD
  listFolders(userId: string): Promise<Folder[]>;
  createFolder(userId: string, partial?: Partial<Folder>): Promise<Folder>;
  updateFolder(id: string, patch: Partial<Folder>): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;

  // 图片上传，返回可访问 URL
  uploadImage(userId: string, file: File): Promise<string>;
}
