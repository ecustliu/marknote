/** Supabase 未部署 get_shared_note RPC 时抛出 */
export class ShareNotConfiguredError extends Error {
  constructor() {
    super("分享 RPC 未配置");
    this.name = "ShareNotConfiguredError";
  }
}
