import React, { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { type VoiceDraft } from "./assistant-domain";
import { useLedger } from "./store";
import { Button, colors, st } from "./ui";
import { Dialog } from "./dialog";
import { SpeechInput } from "./speech";
import { Icon } from "./icon";
import { requestAI, useAIStatus } from "./ai-client";
import type { BatchVoiceDraft } from "./ai-contract";
import { VoiceBatchReview } from "./voice-batch-review";
export function VoiceEntry({
  onApply,
  initiallyOpen = false,
  allowMultiple = true,
  onBatchSaved,
}: {
  onApply: (draft: VoiceDraft) => void;
  initiallyOpen?: boolean;
  allowMultiple?: boolean;
  onBatchSaved?: () => void;
}) {
  const { month, household, session, busy } = useLedger();
  const { status, refresh } = useAIStatus();
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const scope = `${session?.user.id ?? ""}:${household?.id ?? ""}:${household?.revision ?? 0}`;
  const currentScope = useRef(scope);
  useEffect(() => {
    currentScope.current = scope;
  }, [scope]);
  const scroll = useRef<ScrollView>(null);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);
  function close() {
    if (busy) return;
    running.current?.abort();
    running.current = null;
    setWorking(false);
    setBatch(null);
    setOpen(false);
  }
  const [open, setOpen] = useState(initiallyOpen),
    [text, setText] = useState("");
  const [batch, setBatch] = useState<{
    drafts: BatchVoiceDraft[];
    clarification: string;
  } | null>(null);
  async function extract() {
    if (working) return;
    setError("");
    if (!session) {
      setError("Đăng nhập Nếp Nhà để dùng AI.");
      return;
    }
    setWorking(true);
    const controller = new AbortController();
    running.current = controller;
    try {
      const result = await requestAI(
        { mode: "extract_batch", text, month },
        household ?? undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (currentScope.current !== scope)
        throw Error("Tài khoản hoặc sổ vừa thay đổi. Hãy thử lại.");
      if (!result.drafts?.length)
        throw Error(
          result.clarification ||
            "Chưa nhận ra giao dịch. Hãy nói rõ từng khoản và số tiền.",
        );
      if (result.drafts.length > 1) {
        if (!allowMultiple)
          throw Error(
            "Bạn đang sửa một giao dịch. Hãy đóng và mở Ghi thu chi bằng giọng nói từ Tổng quan để thêm nhiều khoản.",
          );
        setBatch({
          drafts: result.drafts,
          clarification: result.clarification ?? "",
        });
        return;
      }
      onApply({
        ...result.drafts[0],
        warnings: [
          ...result.drafts[0].warnings,
          ...(result.clarification ? [result.clarification] : []),
        ],
      });
      setOpen(false);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (running.current === controller) {
        running.current = null;
        setWorking(false);
        refresh();
      }
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ghi thu chi bằng giọng nói"
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          padding: 14,
          borderRadius: 15,
          backgroundColor: colors.lavender,
        }}
      >
        <Icon name="mic" color={colors.violet} size={21} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontWeight: "600", color: colors.violet }}>
            Ghi thu chi bằng giọng nói
          </Text>
          <Text style={st.tiny}>AI điền sẵn, bạn kiểm tra rồi bấm Lưu.</Text>
        </View>
      </Pressable>
      {open && (
        <Dialog
          scrollRef={scroll}
          visible
          title={batch ? "Kiểm tra các khoản" : "Nói để ghi thu chi"}
          onClose={close}
        >
          {batch ? (
            <VoiceBatchReview
              drafts={batch.drafts}
              clarification={batch.clarification}
              onBack={() => {
                setBatch(null);
                setError("");
              }}
              onSaved={() => {
                setBatch(null);
                setOpen(false);
                onBatchSaved?.();
              }}
            />
          ) : (
            <>
              <Text style={st.subtitle}>
                Nói một hoặc nhiều khoản. Ví dụ: “Mua nước ở Circle K 50k, cho
                ông bà 400k”. AI tách từng giao dịch để bạn kiểm tra.
              </Text>
              {!session && (
                <Button
                  title="Đăng nhập để sử dụng"
                  onPress={() => {
                    close();
                    router.push("/settings");
                  }}
                />
              )}
              <SpeechInput
                disabled={working || !session}
                label="Nội dung giọng nói"
                placeholder="Ví dụ: Mua nước 50k, biếu ông bà 400k…"
                value={text}
                onChange={(value) => {
                  setText(value);
                  setError("");
                }}
              />
              <Text style={st.tiny}>
                Khi bấm Điền giao dịch, câu nói cùng tên danh mục và thành viên
                được gửi đến OpenAI để phân tích. Bạn kiểm tra biểu mẫu rồi bấm
                Lưu giao dịch.
              </Text>
              <Button
                tone="violet"
                title={working ? "AI đang điền giao dịch…" : "Điền giao dịch"}
                disabled={!session || !text.trim() || working || status.loading}
                onPress={() => void extract()}
              />
              <Text style={st.tiny}>
                {!session
                  ? "Đăng nhập Nếp Nhà để dùng AI. Không cần tài khoản hay khóa AI riêng."
                  : status.configured
                    ? `Còn ${Math.max(0, (status.limit ?? 20) - (status.used ?? 0))} lượt hôm nay`
                    : status.message}
              </Text>
              {!!error && (
                <Text accessibilityRole="alert" style={st.error}>
                  {error}
                </Text>
              )}
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
