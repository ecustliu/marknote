**Marknote 技术文档**

跨端云笔记应用 · Web / Mac (Tauri) / iOS & Android (Capacitor)  
版本：0.1.0 · 一套 React 代码库，双存储模式（本地 / 云端）

## 1. 项目概述

Marknote 是一款支持 Markdown 的笔记应用，核心设计目标：

- **一套代码，多端运行**：Web 浏览器、Mac 桌面（Tauri）、移动端（Capacitor）
- **双模式存储**：未配置后端时用 localStorage 演示；配置 Supabase 后自动切换云端同步
- **Markdown 为单一数据源**：编辑器 WYSIWYG 编辑，底层存 Markdown 文本
- **适配器模式**：业务层只依赖 `DataAdapter` 接口，存储实现可替换

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript（函数组件 + Hooks） |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router 6 |
| 编辑器 | TipTap 2 + tiptap-markdown |
| Markdown 预览 | marked 14 |
| 数学公式 | KaTeX |
| 图表 | Mermaid 11 |
| PDF 导出 | html2canvas + jsPDF |
| 图标 | lucide-react |
| 云端后端 | Supabase（Auth + Postgres + Storage） |
| 本地存储 | localStorage |
| 桌面壳 | Tauri 2 |
| 移动壳 | Capacitor |

## 3. 系统架构

分层结构（自上而下）：

```
UI Layer       AuthPage · ForgotPasswordPage · ResetPasswordPage
               NotesPage · SharePage
               Sidebar · Editor · TocPanel · SharePanel · MarkdownPreview
     ↓
Context/Hooks  AuthContext · useNotes（800ms 防抖）· useSidebarLayout
     ↓
db.ts          isSupabaseConfigured ? supabaseAdapter : localAdapter
     ↓
localAdapter   localStorage
supabaseAdapter Supabase JS Client → Auth · Postgres · Storage
```

### 3.1 适配器切换逻辑

应用启动时读取 `.env.local`：

```typescript
// src/lib/db.ts
export const db = isSupabaseConfigured ? supabaseAdapter : localAdapter;
export const isCloud = db.mode === "supabase";
```

Supabase 配置校验（`src/lib/supabaseConfig.ts`）要求：

- URL 形如 `https://xxx.supabase.co`
- Key 为 `sb_publishable_...`（新版）或 `eyJ...`（legacy anon JWT）
- 拒绝 `sb_secret_...`（服务端密钥，不可用于前端）

## 4. 目录结构

```
marknote/
├── src/
│   ├── App.tsx                 # 路由 + 鉴权守卫
│   ├── main.tsx
│   ├── types.ts                # User / Folder / Note / DataAdapter
│   ├── components/
│   │   ├── AuthShell.tsx
│   │   ├── ChangePasswordDialog.tsx
│   │   ├── Editor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── SharePanel.tsx
│   │   ├── Sidebar.tsx
│   │   └── TocPanel.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useNotes.ts         # 800ms 防抖保存
│   │   └── useSidebarLayout.ts
│   ├── lib/
│   │   ├── avatar.ts           # 头像文件校验
│   │   ├── authErrors.ts
│   │   ├── db.ts
│   │   ├── exportPdf.ts
│   │   ├── headings.ts
│   │   ├── localAdapter.ts
│   │   ├── markdownRender.ts   # marked + KaTeX + Mermaid 预处理
│   │   ├── mathRender.ts
│   │   ├── mermaidDetect.ts
│   │   ├── mermaidRender.ts
│   │   ├── platform.ts
│   │   ├── savedLogin.ts
│   │   ├── shareErrors.ts
│   │   ├── shareToken.ts
│   │   ├── supabaseAdapter.ts
│   │   └── supabaseConfig.ts
│   └── pages/
│       ├── AuthPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── NotesPage.tsx
│       ├── ResetPasswordPage.tsx
│       └── SharePage.tsx
├── supabase/schema.sql         # 建表 + RLS + Storage + RPC
├── scripts/                    # check-supabase / setup-supabase
├── src-tauri/                  # Tauri 桌面壳
├── capacitor.config.ts
└── .env.example
```

## 5. 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/auth` | AuthPage | 登录 / 注册 |
| `/auth/forgot-password` | ForgotPasswordPage | 发送重置邮件（云端） |
| `/auth/reset-password` | ResetPasswordPage | 邮件链接设置新密码 |
| `/s/:token` | SharePage | 公开只读分享页 |
| `/*` | NotesPage | 笔记主页（RequireAuth） |

## 6. 数据模型

### 6.1 User（用户）

```typescript
interface User {
  id: string;
  email: string;
  avatarUrl?: string | null;  // 未设置时为 null
}
```

### 6.2 Folder（文件夹）

```typescript
interface Folder {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;    // null 表示根级
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 Note（笔记）

```typescript
interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;            // Markdown 源文本
  tags: string[];
  folderId: string | null;
  deletedAt: string | null;   // 软删除时间戳
  shareToken: string | null;  // 只读分享 token
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 SharedNote（分享页展示）

不含 `userId` 等敏感字段，由 `get_shared_note` RPC 返回。

### 6.5 Postgres 表结构（云端）

**folders**

| 列 | 类型 | 说明 |
|----|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 auth.users |
| name | text | 文件夹名 |
| parent_id | uuid | 父文件夹，可 null |
| created_at / updated_at | timestamptz | 时间戳 |

**notes**

| 列 | 类型 | 说明 |
|----|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 auth.users |
| title | text | 标题 |
| content | text | Markdown 正文 |
| tags | text[] | 标签 |
| folder_id | uuid | 所属文件夹，可 null |
| deleted_at | timestamptz | 回收站时间戳，null 表示未删除 |
| share_token | text | 分享 token，唯一索引（partial） |
| created_at / updated_at | timestamptz | 时间戳 |

**索引**

- `notes_fts` — GIN 全文索引（`to_tsvector`，前端尚未使用）
- `notes_user_active` / `notes_user_trash` — 活跃笔记与回收站列表

**RPC**

- `get_shared_note(p_token)` — SECURITY DEFINER，按 token 只读返回分享笔记

**RLS**：用户只能读写 `user_id = auth.uid()` 的笔记与文件夹。

## 7. 存储与持久化

### 7.1 本地模式（localAdapter）

| 键名 | 内容 |
|------|------|
| `marknote.users` | 用户列表（含明文密码、avatarUrl，仅演示） |
| `marknote.session` | 当前登录用户 |
| `marknote.notes` | 笔记全量 JSON 数组 |
| `marknote.folders` | 文件夹全量 JSON 数组 |
| `marknote-sidebar` | 侧栏宽度与收起状态 |

- **图片**：base64 Data URL 嵌入 `content`
- **头像**：base64 存在 `users[].avatarUrl`

### 7.2 云端模式（supabaseAdapter）

| 资源 | 存储 |
|------|------|
| 账户 | Supabase Auth（JWT，自动刷新） |
| 笔记 / 文件夹 | Postgres + RLS |
| 笔记图片 | Storage `note-images` bucket，`{userId}/{timestamp}-{random}.{ext}` |
| 头像 | 同 bucket，`{userId}/avatar.{ext}`；URL 写入 `user_metadata.avatar_url` |

Storage 策略：公开读；写操作限制为 `authenticated` 且路径首段等于 `auth.uid()`。

**环境变量**（`.env.local`）：

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SUPABASE_BUCKET=note-images

# 可选：分享链接的公开域名，留空则用 window.location.origin
VITE_PUBLIC_URL=https://your-deployed-site.com
```

### 7.3 自动保存机制

`useNotes` 采用 **800ms 防抖**：

1. 编辑时立即更新 React 状态
2. 停止输入 800ms 后调用 `db.updateNote()` 持久化
3. 本地写 localStorage；云端发 Supabase REST 请求

> 当前无 saving / saved / failed 状态反馈，保存失败时静默（见已知限制）。

## 8. 认证流程

1. `AuthContext.getCurrentUser()` 检查 session
2. 有 session → `NotesPage`；无 session → `/auth`
3. `db.signIn` / `db.signUp` 按适配器读写 session
4. **忘记密码**：`requestPasswordReset` → 邮件链接 → `/auth/reset-password` → `updatePassword`（不传 currentPassword）
5. **修改密码**：侧边栏 `ChangePasswordDialog` → `updatePassword(new, current)`
6. **头像**：`uploadAvatar` → Storage（云端）或 base64（本地）→ 更新 session

**常见错误**（`AuthPage` / `formatAuthError`）：

- `Failed to fetch` → 检查 `.env.local` 与网络
- `Email not confirmed` → 查收确认邮件，或关闭 Confirm email

## 9. 编辑器与预览

### 9.1 TipTap 扩展

StarterKit、Markdown、Image、Link、Placeholder、TaskList/TaskItem、Table 系列、自定义粘贴插件（图片上传 + Markdown 块级解析）。

### 9.2 预览渲染管线

```
Markdown 源文本
  → markdownRender.ts
      preprocessMarkdownForMermaid
      preprocessMath（KaTeX 占位）
      marked（自定义 heading id、Mermaid code 块）
      applyMathToHtml
  → MarkdownPreview 组件
      renderMermaidIn（客户端渲染 Mermaid SVG）
```

### 9.3 数据流

1. TipTap 编辑 → `editor.storage.markdown.getMarkdown()`
2. `onSave({ content, title, tags, folderId })`
3. `useNotes.saveNote()` → 800ms 防抖 → `db.updateNote()`

### 9.4 PDF 导出

`exportPdf.ts`：将 Markdown 渲染为 HTML 后通过 html2canvas 截图，jsPDF 生成 PDF。

## 10. 分享机制

1. 用户在编辑器开启分享 → `enableShare(noteId)` 生成 32 位 hex `shareToken` 写入笔记
2. `buildShareUrl(token)` 拼接 `{VITE_PUBLIC_URL || origin}/s/{token}`
3. 访客访问 `SharePage` → `db.getSharedNote(token)` → 云端调用 `get_shared_note` RPC
4. 关闭分享 → `disableShare` 将 `shareToken` 置 null

本地模式同样支持分享 token，但链接仅在本机有效。

## 11. 侧边栏与布局

- 树形文件夹（展开/折叠、嵌套、重命名、删除）
- 笔记拖拽到文件夹（`application/x-marknote-note-id` MIME）
- 客户端全文搜索 + Tag 筛选
- 回收站视图（恢复 / 彻底删除 / 清空）
- `useSidebarLayout`：宽度 200–480px、收起状态持久化到 localStorage

## 12. 平台策略

`platform.ts` 定义能力分级：

| 环境 | `canFullEdit()` | 实际行为 |
|------|-----------------|----------|
| 桌面浏览器 | true | 完整编辑器 ✅ |
| Tauri 桌面 | true | 完整编辑器 ✅ |
| 手机浏览器（< 640px） | false | 仍加载完整编辑器 ⚠️ 未接入 |
| Capacitor 原生 | false | 仍加载完整编辑器 ⚠️ 未接入 |

## 13. 开发与部署命令

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run supabase:setup
npm run supabase:check
npm run tauri:dev
npm run tauri:build
npm run build && npm run cap:sync
npm run cap:ios
npm run cap:android
```

## 14. Supabase 接入步骤

1. 在 [supabase.com/dashboard](https://supabase.com/dashboard) 创建项目
2. Settings → API Keys 复制 Project URL 和 Publishable key
3. SQL Editor 执行 `supabase/schema.sql`
4. （推荐）Authentication → Providers → Email 关闭 Confirm email
5. Authentication → URL Configuration 添加 `{origin}/auth/reset-password` 为 Redirect URL
6. 运行 `npm run supabase:setup` 或手动填写 `.env.local`
7. `npm run supabase:check` 验证连接、表、bucket
8. 重启 `npm run dev`，登录页显示「云端同步已启用」

## 15. DataAdapter 接口

所有存储实现必须满足（节选）：

```typescript
interface DataAdapter {
  readonly mode: "local" | "supabase";

  // 认证
  getCurrentUser(): Promise<User | null>;
  signIn(email, password): Promise<User>;
  signUp(email, password): Promise<User>;
  signOut(): Promise<void>;
  requestPasswordReset(email): Promise<void>;
  updatePassword(newPassword, currentPassword?): Promise<void>;
  uploadAvatar(userId, file): Promise<User>;
  onAuthChange(cb): () => void;

  // 笔记
  listNotes(userId): Promise<Note[]>;
  listTrashedNotes(userId): Promise<Note[]>;
  createNote(userId, partial?): Promise<Note>;
  updateNote(id, patch): Promise<Note>;
  deleteNote(id): Promise<void>;           // 软删除
  restoreNote(id): Promise<Note>;
  permanentlyDeleteNote(id): Promise<void>;
  emptyTrash(userId): Promise<void>;

  // 文件夹
  listFolders(userId): Promise<Folder[]>;
  createFolder(userId, partial?): Promise<Folder>;
  updateFolder(id, patch): Promise<Folder>;
  deleteFolder(id): Promise<void>;

  // 媒体与分享
  uploadImage(userId, file): Promise<string>;
  enableShare(noteId): Promise<Note>;
  disableShare(noteId): Promise<Note>;
  getSharedNote(token): Promise<SharedNote | null>;
}
```

扩展新后端（OAuth、自建 API）只需新增 Adapter 实现，UI 层无需改动。

## 16. 已知限制与路线图

**已知限制**

- 保存无状态反馈，失败静默；无多设备冲突检测
- 无 `/notes/:id` deep link
- 搜索为客户端全量过滤，FTS 索引未用
- 无 `.md` 导入导出（已有 PDF 导出）
- 云端模式需联网，无 PWA / IndexedDB 离线缓存
- `canFullEdit()` 未接入 Editor
- 预览代码块无语法高亮；无自动化测试

**路线图摘要**（详见 [FEATURES.md](./FEATURES.md)）

- 🔲 二期：保存反馈、笔记 URL、Markdown 导入导出、移动端只读、PWA、服务端 FTS
- 🔲 三期：离线同步、冲突提示、实时协作、OAuth、版本历史

## 17. Markdown 渲染测试区

本节用于测试编辑器对 Markdown 的解析与渲染效果。

### 17.1 代码块

```javascript
const saveNote = (id, patch) => {
  clearTimeout(timer);
  timer = setTimeout(() => db.updateNote(id, patch), 800);
};
```

```sql
SELECT id, title, updated_at
FROM notes
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
ORDER BY updated_at DESC;
```

### 17.2 数学公式（KaTeX）

行内：$E = mc^2$

块级：

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

### 17.3 任务列表

- [x] 项目初始化
- [x] Supabase 云端接入
- [x] 文件夹与回收站
- [x] 只读分享链接
- [x] KaTeX 与 Mermaid 预览
- [ ] 服务端全文搜索
- [ ] 离线同步

### 17.4 引用与链接

> 好的架构不是预测未来，而是让变化变得廉价。  
> —— 适配器模式的核心价值

相关链接：[Supabase 文档](https://supabase.com/docs) · [TipTap 文档](https://tiptap.dev)

---

*文档更新时间：2026-05-31 · Marknote v0.1.0*
