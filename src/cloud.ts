import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Ledger, validateLedger } from "./domain";
import { cloudConfig } from "./cloud-config";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || cloudConfig.url;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || cloudConfig.publishableKey;
export const cloud =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: typeof window === "undefined" ? {
            getItem: async () => null,
            setItem: async () => {},
            removeItem: async () => {},
          } : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: typeof window !== "undefined",
        },
      })
    : null;
export type Household = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  revision: number;
  ledger: Ledger;
};
export async function cloudCall(
  name: string,
  args: Record<string, unknown> = {},
) {
  if (!cloud) throw Error("Chưa cấu hình máy chủ đồng bộ.");
  const { data, error } = await cloud.rpc(name, args);
  if (error)
    throw Error(
      error.message.includes("revision_conflict")
        ? "Một thành viên vừa cập nhật dữ liệu. Đóng màn hình này, làm mới rồi thử lại để tránh ghi đè."
        : error.message,
    );
  return data;
}
export async function readHousehold(): Promise<Household | null> {
  const row = await cloudCall("get_my_household");
  return row ? { ...row, ledger: validateLedger(row.ledger) } : null;
}
