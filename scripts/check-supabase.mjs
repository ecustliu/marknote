#!/usr/bin/env node
/**
 * 验证 Supabase 环境变量与数据库/Storage 是否就绪。
 * 用法: npm run supabase:check
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const bucket = env.VITE_SUPABASE_BUCKET || "note-images";

console.log("Marknote · Supabase 连接检测\n");

if (!existsSync(envPath)) {
  console.log("✗ 未找到 .env.local");
  console.log("  请复制 .env.example → .env.local 并填入 Supabase 项目信息\n");
  console.log("快速步骤:");
  console.log("  1. 打开 https://supabase.com/dashboard 创建项目");
  console.log("  2. Settings → API Keys 复制 Project URL 和 Publishable key");
  console.log("  3. SQL Editor 粘贴执行 supabase/schema.sql");
  console.log("  4. Authentication → Providers → Email 可关闭 Confirm email（开发更方便）");
  process.exit(1);
}

if (!url || !anonKey) {
  console.log("✗ .env.local 中 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 为空");
  process.exit(1);
}

if (url.includes("YOUR_PROJECT") || anonKey.includes("YOUR_ANON")) {
  console.log("✗ .env.local 仍是模板占位符，请填入真实的 Supabase URL 和 anon key");
  console.log("  Dashboard → Settings → API Keys → Publishable key");
  process.exit(1);
}

console.log(`✓ 环境变量已配置`);
console.log(`  URL:    ${url}`);
console.log(`  Bucket: ${bucket}\n`);

let res;
try {
  res = await fetch(`${url}/rest/v1/notes?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
} catch (err) {
  console.log(`✗ 无法连接 Supabase: ${err instanceof Error ? err.message : err}`);
  console.log("  请检查 URL 是否正确、网络是否可达");
  process.exit(1);
}

if (res.status === 404 || res.status === 406) {
  console.log("✗ notes 表不存在或 schema 未执行");
  console.log("  请在 Supabase SQL Editor 执行 supabase/schema.sql");
  process.exit(1);
}

if (!res.ok) {
  const body = await res.text();
  console.log(`✗ 连接失败 (${res.status}): ${body.slice(0, 200)}`);
  process.exit(1);
}

console.log("✓ notes 表可访问");

const bucketRes = await fetch(`${url}/storage/v1/bucket/${bucket}`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
});

if (bucketRes.ok) {
  const info = await bucketRes.json();
  console.log(`✓ Storage bucket「${bucket}」已创建 (public: ${info.public})`);
} else {
  console.log(`✗ Storage bucket「${bucket}」未找到`);
  console.log("  请重新执行 supabase/schema.sql 中的 Storage 部分");
  process.exit(1);
}

console.log("\n全部就绪！重启 dev server 后将以云端模式运行:");
console.log("  npm run dev\n");
