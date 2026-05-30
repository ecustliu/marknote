**Marknote 技术文档**

跨端云笔记应用 · Web / Mac (Tauri) / iOS & Android (Capacitor)  
版本：0.1.0 · 一套 React 代码库，双存储模式（本地 / 云端）

## 1. 项目概述

Marknote 是一款支持 Markdown 的笔记应用，核心设计目标：

- **一套代码，多端运行**：Web 浏览器、Mac 桌面（Tauri）、移动端（Capacitor）
- **双模式存储**：未配置后端时用 localStorage 演示；配置 Supabase 后自动切换云端同步
- **Markdown 为单一数据源**：编辑器 WYSIWYG 编辑，底层存 Markdown 文本
- **适配器模式**：业务层只依赖 DataAdapter 接口，存储实现可替换

## 2. 技术栈

- **前端框架**：React 18 + TypeScript（函数组件 + Hooks）
- **构建工具**：Vite 5（开发服务器 + 生产打包）
- **样式**：Tailwind CSS 3
- **路由**：React Router 6（/auth 登录页，通配路由笔记主页）
- **编辑器**：TipTap 2 + tiptap-markdown（WYSIWYG，导出 Markdown）
- **Markdown 预览**：marked 14（分屏 / 纯预览模式渲染）
- **图标**：lucide-react
- **云端后端**：Supabase（Auth + Postgres + Storage）
- **本地存储**：localStorage（零配置演示模式）
- **桌面壳**：Tauri 2（Mac .app 打包）
- **移动壳**：Capacitor（iOS / Android 原生壳）

## 3. 系统架构

分层结构（自上而下）：

- **UI Layer**：AuthPage · NotesPage · Sidebar · Editor
- **Context / Hooks**：AuthContext（认证状态）· useNotes（笔记 CRUD + 防抖保存）
- **db.ts（统一入口）**：isSupabaseConfigured ? supabaseAdapter : localAdapter
- **localAdapter**：localStorage（本地演示）
- **supabaseAdapter**：Supabase JS Client → Supabase Cloud（Auth · Postgres · Storage）

## 3.1 适配器切换逻辑

应用启动时读取 .env.local：

```typescript
// src/lib/db.ts
export const db = isSupabaseConfigured ? supabaseAdapter : localAdapter;
export const isCloud = db.mode === "supabase";
```

Supabase 配置校验（src/lib/supabaseConfig.ts）要求：

- URL 形如 https://xxx.supabase.co
- Key 为 sb_publishable_...（新版）或 eyJ...（legacy anon JWT）
- 拒绝 sb_secret_...（服务端密钥，不可用于前端）

## 4. 目录结构

- **marknote/**
  - **src/** — 前端源码
    - App.tsx — 路由 + 鉴权守卫
    - main.tsx — 入口
    - types.ts — User / Note / DataAdapter 类型
    - **components/** — Editor、Sidebar
    - **context/** — AuthContext
    - **hooks/** — useNotes（800ms 防抖保存）
    - **lib/** — db、localAdapter、supabaseAdapter、platform
    - **pages/** — AuthPage、NotesPage
  - **supabase/** — schema.sql 建表 + RLS + Storage
  - **scripts/** — check-supabase.mjs、setup-supabase.mjs
  - **src-tauri/** — Tauri 桌面壳
  - capacitor.config.ts — Capacitor 配置
  - .env.example — 环境变量模板

## 5. 数据模型

### 5.1 User（用户）

```typescript
interface User {
  id: string;
  email: string;
}
```

### 5.2 Note（笔记）

```typescript
interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;      // Markdown 源文本
  tags: string[];
  createdAt: string;    // ISO 8601
  updatedAt: string;
}
```

### 5.3 Postgres 表结构（云端）

- **id**（uuid）— 主键，自动生成
- **user_id**（uuid）— 关联 auth.users
- **title**（text）— 标题
- **content**（text）— Markdown 正文
- **tags**（text[]）— 标签数组
- **created_at**（timestamptz）— 创建时间
- **updated_at**（timestamptz）— 更新时间（触发器自动维护）

**安全策略（RLS）**：每个用户只能读写 user_id = auth.uid() 的笔记。

## 6. 存储与持久化

### 6.1 本地模式（localAdapter）

- **用户列表** → marknote.users（含明文密码，仅演示）
- **当前会话** → marknote.session
- **笔记** → marknote.notes（全量 JSON 数组）
- **图片** → 嵌在 content 中（base64 Data URL）

**特点**：零配置、刷新不丢数据，但仅限本浏览器，清缓存即丢失。

### 6.2 云端模式（supabaseAdapter）

- **账户** → Supabase Auth（JWT Session，自动刷新）
- **笔记** → Postgres notes 表（RLS 隔离）
- **图片** → Storage note-images bucket（公开读，按 user_id 目录隔离写）

**环境变量**（.env.local）：

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SUPABASE_BUCKET=note-images
```

### 6.3 自动保存机制

useNotes 采用 **800ms 防抖**：

1. 编辑时立即更新 React 状态（UI 无延迟）
2. 停止输入 800ms 后调用 db.updateNote() 持久化
3. 本地模式写 localStorage；云端模式发 Supabase REST 请求

## 7. 认证流程

1. 用户打开应用
2. AuthContext.getCurrentUser() 检查 session
3. **有 session** → 进入 NotesPage
4. **无 session** → 跳转 /auth → 登录或注册
5. 调用 db.signIn / db.signUp
   - 本地模式：localAdapter 读写 localStorage
   - 云端模式：supabaseAdapter 调用 Supabase Auth API

**常见错误处理**（AuthPage）：

- **Failed to fetch** → 检查 .env.local 与 schema.sql
- **Email not confirmed** → 查收确认邮件，或关闭 Confirm email

## 8. 编辑器能力

基于 **TipTap 2**，支持以下 Markdown 能力：

### 8.1 文本格式

- **粗体**、*斜体*、~~删除线~~、行内代码
- 标题 H1 / H2 / H3
- 有序列表、无序列表
- 任务列表（可嵌套）
- 引用块、代码块

### 8.2 扩展功能

- 链接插入
- 图片上传（本地 base64 / 云端 Storage）
- 表格（可调整列宽，支持增删行列）
- 三种视图模式：**编辑** / **分屏** / **预览**

### 8.3 数据流

1. TipTap 编辑
2. tiptap-markdown → getMarkdown()
3. onSave({ content, title, tags })
4. useNotes.saveNote() → db.updateNote()

## 9. 侧边栏功能

- 笔记列表（按 updatedAt 降序）
- 全文搜索（标题 + 内容，关键词高亮）
- Tag 筛选（点击 Tag 按钮过滤）
- 新建 / 删除笔记
- 退出登录

## 10. 平台策略

platform.ts 定义能力分级：

- **桌面浏览器** — 完整编辑 ✅
- **Tauri 桌面** — 完整编辑 ✅
- **手机浏览器（小于 640px）** — 只读 ❌
- **Capacitor 原生** — 只读（二期完善）❌

## 11. 开发与部署命令

```bash
npm install
npm run dev
npm run build
npm run preview
npm run supabase:setup
npm run supabase:check
npm run tauri:dev
npm run tauri:build
npm run build && npm run cap:sync
npm run cap:ios
npm run cap:android
```

## 12. Supabase 接入步骤

1. 在 supabase.com/dashboard 创建项目
2. Settings → API Keys 复制 Project URL 和 Publishable key
3. SQL Editor 执行 supabase/schema.sql
4. （推荐）Authentication → Providers → Email 关闭 Confirm email
5. 运行 npm run supabase:setup 或手动填写 .env.local
6. 重启 npm run dev，登录页显示「云端同步已启用」

## 13. DataAdapter 接口

所有存储实现必须满足：

```typescript
interface DataAdapter {
  readonly mode: "local" | "supabase";

  getCurrentUser(): Promise<User | null>;
  signIn(email, password): Promise<User>;
  signUp(email, password): Promise<User>;
  signOut(): Promise<void>;
  onAuthChange(cb): () => void;

  listNotes(userId): Promise<Note[]>;
  createNote(userId, partial?): Promise<Note>;
  updateNote(id, patch): Promise<Note>;
  deleteNote(id): Promise<void>;

  uploadImage(userId, file): Promise<string>;
}
```

扩展新后端（如微信登录、自建 API）只需新增 Adapter 实现，UI 层无需改动。

## 14. 功能路线图

- ✅ 邮箱登录、笔记 CRUD、TipTap 编辑器、表格、分屏预览
- ✅ Tag 管理、全文搜索、Supabase 云端同步
- ✅ Tauri / Capacitor 壳配置
- 🔲 二期：移动端只读渲染视图、PWA
- 🔲 三期：实时协作 / CRDT、微信登录

## 15. Markdown 渲染测试区

本节用于测试编辑器对 Markdown 的解析与渲染效果。

### 15.1 代码块

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
ORDER BY updated_at DESC;
```

### 15.2 列表对比

- **本地模式**：localStorage，不支持跨设备
- **云端模式**：Supabase Auth + Postgres，支持跨设备

### 15.3 任务列表

- [x] 项目初始化
- [x] Supabase 云端接入
- [x] 表格编辑器
- [ ] 微信 OAuth 登录
- [ ] 离线同步

### 15.4 引用与链接

> 好的架构不是预测未来，而是让变化变得廉价。  
> —— 适配器模式的核心价值

相关链接：[Supabase 文档](https://supabase.com/docs) · [TipTap 文档](https://tiptap.dev)

### 15.5 混排示例

**Marknote** 是一款 React + TypeScript 笔记应用，支持 ~~本地演示~~ **云端同步**，使用 sb_publishable_ 或 eyJ 格式的 API Key 连接 Supabase。

*文档生成时间：2026-05-30 · Marknote v0.1.0*
