# Marknote 功能与路线图

> 跨端 Markdown 云笔记 · 版本 0.1.0  
> 本文档描述当前已实现功能、技术特性、已知限制及未来规划。

---

## 1. 项目定位

Marknote 是一款 **Markdown 云笔记应用**，核心理念：

- **一套 React 代码，多端运行**（Web / Mac / iOS / Android）
- **重 Web 编辑、轻移动查看**（桌面完整编辑，移动端规划为只读）
- **Markdown 为单一数据源**（WYSIWYG 编辑，底层存 Markdown 文本）
- **双存储模式**：未配置 Supabase 时用 localStorage 演示；配置后自动切换云端同步

---

## 2. 当前已实现功能

### 2.1 用户与认证

| 功能 | 说明 |
|------|------|
| 邮箱注册 / 登录 | 支持登录、注册切换 |
| 双适配器认证 | 本地模式（localStorage）与 Supabase Auth 两套实现 |
| Session 持久化 | 云端 JWT 自动刷新；本地 session 存浏览器 |
| 鉴权路由守卫 | 未登录跳转 `/auth`，已登录进入笔记主页 |
| 退出登录 | 侧边栏一键退出 |
| 错误提示 | 网络失败、邮箱未确认等友好文案 |
| 模式标识 | 登录页显示「云端同步已启用」或「本地模式（演示）」 |

### 2.2 笔记管理

| 功能 | 说明 |
|------|------|
| 笔记 CRUD | 新建、编辑、删除 |
| 自动保存 | 800ms 防抖，编辑时 UI 即时更新 |
| 标题编辑 | 独立标题字段，失焦保存 |
| 标签管理 | Enter / 逗号添加，可删除，随笔记持久化 |
| 列表排序 | 按 `updatedAt` 降序 |
| 状态栏 | 显示最后更新时间与字符数 |

### 2.3 侧边栏

| 功能 | 说明 |
|------|------|
| 全文搜索 | 标题 + 内容，关键词高亮 |
| Tag 筛选 | 点击标签过滤笔记 |
| 笔记切换 | 点击列表项切换当前笔记 |
| 新建 / 删除 | 快捷操作按钮 |

### 2.4 Markdown 编辑器（TipTap 2）

**文本格式**

- 粗体、斜体、删除线、行内代码
- 标题 H1 / H2 / H3
- 有序列表、无序列表
- 任务列表（支持嵌套）
- 引用块、代码块

**扩展能力**

- 链接插入（Link 扩展）
- 图片上传（文件选择）
- 粘贴图片（截图 / 剪贴板图片自动上传）
- 粘贴 Markdown 文本（块级解析插入）
- 表格（可调整列宽，增删行列，3×3 / 4×4 快速插入）
- 占位符提示

**视图模式**

- **编辑** — 纯 WYSIWYG
- **分屏** — 左编辑右预览
- **预览** — 纯 Markdown 渲染（marked）

**目录导航（TocPanel）**

- 从 Markdown 提取 H1–H3 生成目录
- 点击跳转到编辑区或预览区对应标题
- 按标题层级缩进显示

### 2.5 存储与同步

| 模式 | 用户 | 笔记 | 图片 |
|------|------|------|------|
| **本地模式** | localStorage（含演示用明文密码） | 全量 JSON 数组 | base64 嵌在 content |
| **云端模式** | Supabase Auth | Postgres + RLS | Storage `note-images` bucket |

**云端安全**

- RLS：用户只能读写自己的笔记
- Storage 按 `user_id` 目录隔离
- API Key 校验（拒绝 `sb_secret_`，支持新版 publishable key 与 legacy JWT）

**开发工具**

- `npm run supabase:setup` — 交互式配置 `.env.local`
- `npm run supabase:check` — 检查连接、表、bucket

### 2.6 跨端支持

| 平台 | 状态 |
|------|------|
| Web 浏览器 | ✅ 完整编辑 |
| Mac 桌面（Tauri 2） | ✅ 壳已配置，可 dev / build |
| iOS / Android（Capacitor） | ⚠️ 壳已配置，编辑能力未针对移动端优化 |
| 适配器模式 | ✅ `DataAdapter` 接口，存储可替换 |
| 零配置启动 | ✅ 无 `.env` 即可本地演示 |

---

## 3. 技术特性摘要

```
UI 层          AuthPage · NotesPage · Sidebar · Editor · TocPanel
     ↓
业务层         AuthContext · useNotes（800ms 防抖）
     ↓
存储层         db.ts → localAdapter | supabaseAdapter
                    → Supabase Auth · Postgres + RLS · Storage
```

| 类别 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 |
| 路由 | React Router 6（`/auth` + 通配主页） |
| 编辑器 | TipTap 2 + tiptap-markdown |
| 预览 | marked 14 |
| 桌面壳 | Tauri 2 |
| 移动壳 | Capacitor |
| 后端 | Supabase（Auth + Postgres + Storage） |

> **说明**：Postgres 已建全文索引（`to_tsvector`），但当前搜索仍为客户端过滤，未调用服务端 FTS。

---

## 4. 已知限制

以下在文档或代码中有设计，但尚未完整落地：

| 项 | 现状 |
|----|------|
| 移动端只读视图 | `platform.ts` 有 `canFullEdit()`，但未被 Editor 引用，窄屏 / 原生端仍会加载完整编辑器 |
| PWA | 无 manifest / Service Worker |
| 服务端全文搜索 | DB 有 FTS 索引，前端未用 Supabase RPC |
| 文件夹 / 笔记本 | 扁平笔记列表，无层级 |
| 离线同步 | 云端模式需联网 |
| 实时协作 | 未实现 |
| 微信 / OAuth 登录 | 未实现 |

---

## 5. 未来规划

### 5.1 二期

| 优先级 | 功能 | 说明 |
|--------|------|------|
| 🔴 高 | 移动端只读渲染 | 接入 `canFullEdit()`，窄屏 / Capacitor 只显示 Markdown 预览 + 列表 |
| 🔴 高 | PWA | manifest、离线缓存、可安装到主屏幕 |
| 🟡 中 | 响应式布局 | 移动端侧栏抽屉、触控优化 |
| 🟡 中 | 导出 / 导入 | 单篇或批量导出 `.md`，从文件导入 |
| 🟡 中 | 笔记置顶 / 收藏 | 常用笔记快速访问 |
| 🟢 低 | 深色模式 | 跟随系统或手动切换 |

### 5.2 三期

| 优先级 | 功能 | 说明 |
|--------|------|------|
| 🔴 高 | 离线同步 | IndexedDB 本地缓存 + 冲突合并策略 |
| 🔴 高 | 实时协作 / CRDT | 多人编辑同一笔记（Yjs / Automerge 等） |
| 🟡 中 | 微信 OAuth 登录 | 新增 Adapter 或 Supabase Provider |
| 🟡 中 | 服务端全文搜索 | 利用已有 FTS 索引，Supabase RPC |
| 🟡 中 | 文件夹 / 笔记本 | 笔记分组、树形侧栏 |
| 🟢 低 | 版本历史 | 笔记修订记录与回滚 |
| 🟢 低 | 分享链接 | 只读公开链接（需 RLS / 公开表扩展） |

### 5.3 编辑器与体验增强

- 快捷键（Cmd+S 保存提示、Markdown 快捷输入）
- 代码块语法高亮（预览侧）
- 数学公式（KaTeX / MathJax）
- Mermaid 图表渲染
- 附件上传（非图片文件）
- 回收站 / 软删除
- 多设备冲突提示（保存失败重试）

### 5.4 工程与运维

- 单元 / E2E 测试（编辑器、Adapter、Auth 流程）
- CI/CD（build + lint + supabase:check）
- 环境分离（dev / staging / prod）
- 图片压缩与大小限制
- Capacitor 热更新配置（dev server 已预留注释）

---

## 6. 功能完成度

| 模块 | 完成度 | 备注 |
|------|--------|------|
| 认证与账户 | 80% | 缺 OAuth、密码重置 |
| 笔记 CRUD | 90% | 缺文件夹、回收站 |
| 编辑器 | 85% | 缺公式、Mermaid、快捷键 |
| 搜索与组织 | 60% | 客户端搜索，无文件夹 |
| 跨端 | 50% | 壳就绪，移动端体验未完善 |
| 云端同步 | 70% | 无离线、无冲突处理 |
| 协作与分享 | 0% | 规划中 |

---

## 7. 相关文档

- [TECH.md](./TECH.md) — 技术架构、数据模型、开发与部署
- [README.md](../README.md) — 快速开始与目录结构

---

*文档更新时间：2026-05-30 · Marknote v0.1.0*
