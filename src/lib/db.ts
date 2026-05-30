import type { DataAdapter } from "../types";
import { localAdapter } from "./localAdapter";
import { isSupabaseConfigured, supabaseAdapter } from "./supabaseAdapter";

// 单一入口：配置了 Supabase 就用云端，否则回退到本地存储。
// 整个应用只依赖 DataAdapter 接口，三端 / 双模式无感切换。
export const db: DataAdapter = isSupabaseConfigured ? supabaseAdapter : localAdapter;

export const isCloud = db.mode === "supabase";
