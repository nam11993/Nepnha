import { useCallback, useEffect, useState } from "react";
import { cloud } from "./cloud";
import { cloudConfig } from "./cloud-config";
import { useLedger } from "./store";
import type { VoiceDraft } from "./assistant-domain";
import type { BatchVoiceDraft } from "./ai-contract";
export type AIStatus = {
  configured: boolean;
  model?: string;
  used?: number;
  limit?: number;
  message: string;
  loading?: boolean;
};
export type AIResult = {
  engine: "openai";
  model: string;
  householdId: string;
  revision: number;
  used: number;
  limit: number;
  draft?: VoiceDraft;
  drafts?: BatchVoiceDraft[];
  clarification?: string;
  answer?: { text: string; supported: boolean; scope: string | null };
};
export async function requestAI(
  body: Record<string, unknown>,
  expected?: { id: string; revision: number },
  signal?: AbortSignal,
): Promise<AIResult & { configured?: boolean }> {
  if (!cloud) throw Error("Chưa kết nối máy chủ.");
  const { data, error } = await cloud.auth.getSession();
  if (error || !data.session)
    throw Error("Đăng nhập Nếp Nhà trong Cài đặt để dùng AI.");
  const response = await fetch(cloudConfig.url + "/functions/v1/nep-nha-ai", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: cloudConfig.publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(60000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error("Máy chủ AI chưa trả lời được. Hãy dùng chế độ cơ bản.");
  }
  if (!response.ok)
    throw Error(
      typeof result?.error === "string"
        ? result.error
        : "Không gọi được AI. Hãy kiểm tra kết nối hoặc đăng nhập lại.",
    );
  if (
    body.mode !== "status" &&
    (result.engine !== "openai" || typeof result.model !== "string")
  )
    throw Error("Máy chủ trả về thông tin AI chưa hợp lệ.");
  if (
    expected &&
    (result.householdId !== expected.id ||
      result.revision !== expected.revision)
  )
    throw Error(
      "Sổ gia đình vừa thay đổi. Hãy làm mới rồi hỏi hoặc tách thông tin lại.",
    );
  return result;
}
export function useAIStatus() {
  const { session, household } = useLedger();
  const key = (session?.user.id ?? "") + ":" + (household?.id ?? "");
  const [saved, setSaved] = useState<{ key: string; status: AIStatus } | null>(
    null,
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!session) return;
      try {
        const result = await requestAI({ mode: "status" }, undefined, signal);
        if (!signal?.aborted)
          setSaved({
            key,
            status: {
              configured: !!result.configured,
              model: result.model,
              used: result.used,
              limit: result.limit,
              message: result.configured
                ? "AI đã sẵn sàng cho tài khoản của bạn."
                : "AI chưa sẵn sàng. Vui lòng thử lại sau.",
            },
          });
      } catch (error) {
        if (!signal?.aborted)
          setSaved({
            key,
            status: { configured: false, message: (error as Error).message },
          });
      }
    },
    [key, session],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));
    return () => controller.abort();
  }, [refresh]);
  const status: AIStatus = !session
    ? {
        configured: false,
        message:
          "Đăng nhập Nếp Nhà để dùng AI. Không cần tài khoản hay khóa AI riêng.",
      }
    : saved?.key === key
      ? saved.status
      : {
          configured: false,
          loading: true,
          message: "Đang kiểm tra kết nối AI…",
        };
  return { status, refresh: () => void refresh() };
}
