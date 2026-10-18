import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Ledger, validateLedger } from "./domain";
import { cloudConfig } from "./cloud-config";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || cloudConfig.url;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  cloudConfig.publishableKey;
export const cloud =
  url && key
    ? createClient(url, key, {
        auth: {
          storage:
            typeof window === "undefined"
              ? {
                  getItem: async () => null,
                  setItem: async () => {},
                  removeItem: async () => {},
                }
              : AsyncStorage,
          autoRefreshToken: true,
          flowType: "pkce",
          persistSession: true,
          detectSessionInUrl: typeof window !== "undefined",
        },
      })
    : null;
export type Household = {
  is_family: boolean;
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  revision: number;
  ledger: Ledger;
};
export type Profile = {
  user_id: string;
  display_name: string;
  ai_consent: boolean;
};
export async function readAccount(): Promise<{
  profile: Profile;
  book: Household;
}> {
  const row = await cloudCall("get_my_account");
  return {
    ...row,
    book: { ...row.book, ledger: validateLedger(row.book.ledger) },
  };
}
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
        : ((
            {
              entry_permission_denied:
                "Bạn chỉ được sửa hoặc xóa giao dịch mình tạo.",
              owner_required: "Chức năng này dành cho chủ nhà.",
              name_required: "Hãy nhập tên trước khi sử dụng.",
              book_changed: "Sổ đang dùng đã thay đổi. Hãy tải lại trang.",
              invalid_invite_code: "Mã mời không hợp lệ hoặc đã được đổi.",
              already_in_household: "Bạn cần rời gia đình hiện tại trước.",
              disband_before_account_deletion:
                "Hãy giải tán gia đình trước khi xóa tài khoản chủ nhà.",
            } as Record<string, string>
          )[error.message] ?? error.message),
    );
  return data;
}
export async function readHousehold(): Promise<Household | null> {
  const row = await cloudCall("get_my_household");
  return row ? { ...row, ledger: validateLedger(row.ledger) } : null;
}
