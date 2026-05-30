#!/usr/bin/env node
/**
 * 交互式配置 Supabase 云端模式。
 * 用法: npm run supabase:setup
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function printGuide() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Marknote · Supabase 云端模式配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

若还没有 Supabase 项目，请先在浏览器完成以下步骤：

  1. 打开 https://supabase.com/dashboard
  2. 点击 New project，填写名称、数据库密码、选区域（建议 Singapore 或 Tokyo）
  3. 等待项目创建完成（约 1–2 分钟）
  4. 左侧 Settings → API Keys，复制：
     - Project URL（或 https://<Project ID>.supabase.co）
     - Publishable key（以 sb_publishable_ 开头，可公开用于前端）
  5. 左侧 SQL Editor → New query
     粘贴项目根目录 supabase/schema.sql 的全部内容 → Run

可选（开发更方便）：
  Authentication → Providers → Email → 关闭 Confirm email

完成后回到终端继续输入。
`);
}

function isValidUrl(url) {
  return url.startsWith("https://") && url.includes(".supabase.co") && !url.includes("YOUR_PROJECT");
}

function isValidKey(key) {
  if (!key || key.includes("YOUR_ANON") || key.startsWith("sb_secret_")) return false;
  if (key.startsWith("sb_publishable_")) return key.length >= 30;
  if (key.startsWith("eyJ")) return key.length >= 50;
  return false;
}

async function prompt(rl, label, validate) {
  while (true) {
    const value = (await rl.question(label)).trim();
    if (validate(value)) return value;
    console.log("  ✗ 格式不对，请重新输入\n");
  }
}

async function verifyConnection(url, anonKey, bucket) {
  let notesOk = false;
  let bucketOk = false;

  const res = await fetch(`${url}/rest/v1/notes?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (res.status === 404 || res.status === 406) {
    console.log("\n✗ notes 表不存在，请先在 SQL Editor 执行 supabase/schema.sql");
    return false;
  }
  if (!res.ok) {
    console.log(`\n✗ 连接失败 (${res.status}): ${(await res.text()).slice(0, 150)}`);
    return false;
  }
  notesOk = true;

  const bucketRes = await fetch(`${url}/storage/v1/bucket/${bucket}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  bucketOk = bucketRes.ok;
  if (!bucketOk) {
    console.log(`\n⚠ Storage bucket「${bucket}」未找到，笔记和图片上传暂不可用`);
    console.log("  请在 SQL Editor 重新执行 supabase/schema.sql（含 Storage 部分）");
  }

  return notesOk;
}

function writeEnv(url, anonKey, bucket) {
  const content = `# Supabase 云端模式（由 npm run supabase:setup 生成）
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${anonKey}
VITE_SUPABASE_BUCKET=${bucket}
`;
  writeFileSync(envPath, content, "utf8");
}

printGuide();

const rl = readline.createInterface({ input, output });

try {
  const url = await prompt(rl, "Project URL: ", isValidUrl);
  const anonKey = await prompt(rl, "Publishable key（或 legacy anon key）: ", isValidKey);
  const bucket = "note-images";

  console.log("\n正在验证连接…");
  let ok = false;
  try {
    ok = await verifyConnection(url, anonKey, bucket);
  } catch (err) {
    console.log(`\n✗ 网络错误: ${err instanceof Error ? err.message : err}`);
  }

  if (!ok) {
    console.log("\n.env.local 未写入。请先执行 schema.sql，再重新运行 npm run supabase:setup");
    process.exit(1);
  }

  writeEnv(url, anonKey, bucket);
  console.log("\n✓ 已写入 .env.local");
  console.log("✓ notes 表验证通过");
  console.log("\n下一步:");
  console.log("  1. 重启 dev server（Ctrl+C 后 npm run dev）");
  console.log("  2. 登录页应显示「云端同步已启用」");
  console.log("  3. 注册新账号（云端账号与本地 localStorage 账号独立）\n");
} finally {
  rl.close();
}
