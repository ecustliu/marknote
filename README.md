# Marknote · 跨端云笔记

> Web / Mac (Tauri) / iOS & Android (Capacitor) 三端统一，一套 React 代码库。

## 技术栈

| 层 | 技术 |
|---|---|
| UI / 业务逻辑 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS |
| Markdown 编辑器 | TipTap 2 + tiptap-markdown |
| 桌面壳 (Mac) | Tauri 2 |
| 移动壳 (iOS/Android) | Capacitor |
| 后端 / 认证 / 存储 | Supabase (Postgres + Auth + Storage) |
| 离线 / 演示模式 | localStorage 适配器（无需后端即可跑通） |

## 快速开始（Web 模式）

```bash
cd marknote
npm install
npm run dev          # http://localhost:5173
```

首次运行不需要配置任何后端，直接注册/登录即可，数据存在浏览器本地存储。

## 接入 Supabase（云端同步）

1. 在 [supabase.com](https://supabase.com) 创建项目，进入 SQL Editor 执行 `supabase/schema.sql`
2. 在 Storage 页面创建名为 `note-images` 的 bucket，设为 **public**
3. 复制 `.env.example` 为 `.env.local`，填入你的 URL 和 anon key
4. 重启 `npm run dev`，此时数据会同步到云端

## 桌面端 (Mac) — 需先安装 Rust

```bash
# 1. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Tauri CLI
cargo install tauri-cli

# 3. 开发模式（同时启动 Vite + Tauri 窗口）
npm run tauri:dev

# 4. 打包 .app
npm run tauri:build
```

## 移动端 (iOS / Android) — 需先安装 Capacitor 依赖

```bash
# 1. 安装 Capacitor CLI 及平台包（一次性）
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. 初始化平台（首次执行）
npx cap add ios
npx cap add android

# 3. 构建 Web 产物并同步到原生项目
npm run build
npm run cap:sync

# 4. 用 Xcode / Android Studio 打开
npm run cap:ios      # 需要 Mac + Xcode + Apple Developer 账号
npm run cap:android  # 需要 Android Studio
```

## 目录结构

```
marknote/
├── src/
│   ├── components/       # Sidebar, Editor
│   ├── context/          # AuthContext
│   ├── hooks/            # useNotes（节流自动保存）
│   ├── lib/
│   │   ├── db.ts         # 统一入口（自动选 local / supabase 适配器）
│   │   ├── localAdapter.ts   # localStorage 适配器
│   │   ├── supabaseAdapter.ts
│   │   └── platform.ts   # 平台探测（Tauri / Capacitor / 浏览器）
│   ├── pages/            # AuthPage, NotesPage
│   └── types.ts
├── src-tauri/            # Tauri 桌面壳（Rust）
├── supabase/schema.sql   # 数据库建表 SQL
├── capacitor.config.ts   # Capacitor 移动端配置
└── .env.example
```

## 功能清单

- [x] 邮箱注册 / 登录（本地演示 & Supabase 两套适配器）
- [x] 笔记 CRUD（节流自动保存，800ms 防抖）
- [x] 完整 Markdown 编辑器（TipTap，WYSIWYG）
- [x] 图片上传（本地模式转 base64，Supabase 模式上传 R2/Storage）
- [x] Tag 标签管理（增删、侧栏筛选）
- [x] 全文搜索（标题 + 内容，实时高亮）
- [x] Tauri 桌面壳配置（Mac .app 打包）
- [x] Capacitor 移动壳配置（iOS / Android）
- [ ] 移动端只读渲染视图（二期）
- [ ] PWA manifest（二期）
- [ ] 实时协作 / CRDT（三期）
