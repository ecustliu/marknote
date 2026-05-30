/** 客户端可用的 Supabase 公钥：新版 publishable 或 legacy anon JWT */
export function isValidSupabaseAnonKey(key?: string): boolean {
  const k = key?.trim();
  if (!k || k.includes("YOUR_ANON")) return false;
  if (k.startsWith("sb_secret_")) return false;
  if (k.startsWith("sb_publishable_")) return k.length >= 30;
  if (k.startsWith("eyJ")) return k.length >= 50;
  return false;
}
