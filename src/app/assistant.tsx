import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { answerLedger } from "../assistant-domain";
import { useLedger } from "../store";
import { Button, Card, Chips, colors, MonthPicker, Page, st } from "../ui";
import { ReadAloud, SpeechInput } from "../speech";
import { requestAI, useAIStatus, type AIResult } from "../ai-client";
import { AIConnection } from "../ai-connection";
export default function Assistant() {
  const { data, month, household, session } = useLedger(),
    { status, refresh } = useAIStatus();
  const scroll = useRef<ScrollView>(null),
    pendingScroll = useRef(false);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);
  const [question, setQuestion] = useState(""),
    [asked, setAsked] = useState(""),
    [preference, setPreference] = useState<string | null>(null),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [remote, setRemote] = useState<(AIResult & { userId: string }) | null>(
      null,
    ),
    [answeredEngine, setAnsweredEngine] = useState("Cơ bản");
  const engine = preference ?? (status.configured ? "AI OpenAI" : "Cơ bản");
  async function ask(text: string) {
    if (working || !text.trim()) return;
    setError("");
    setRemote(null);
    setAsked(text);
    setAnsweredEngine(engine);
    if (text === asked) scroll.current?.scrollToEnd({ animated: true });
    if (engine === "Cơ bản") {
      pendingScroll.current = true;
      return;
    }
    if (!household || !session) {
      setError("Đăng nhập và mở sổ gia đình để dùng AI.");
      return;
    }
    setWorking(true);
    const controller = new AbortController();
    running.current = controller;
    try {
      const result = await requestAI(
        { mode: "ask", text, month },
        household,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (!result.answer) throw Error("AI chưa trả đủ thông tin.");
      pendingScroll.current = true;
      setRemote({ ...result, userId: session.user.id });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError((e as Error).message);
      pendingScroll.current = true;
    } finally {
      if (!controller.signal.aborted) {
        running.current = null;
        setWorking(false);
        refresh();
      }
    }
  }
  const stale =
    remote &&
    (remote.householdId !== household?.id ||
      remote.revision !== household?.revision ||
      remote.userId !== session?.user.id);
  const answer = asked
    ? answeredEngine === "Cơ bản"
      ? answerLedger(asked, data, month)
      : remote && !stale
        ? remote.answer
        : null
    : null;
  const examples = [
    "Tháng này chi bao nhiêu?",
    "Khoản chi nào nhiều nhất?",
    "So sánh chi tiêu với tháng trước",
    "Ngân sách còn bao nhiêu?",
  ];
  return (
    <Page
      title="Trợ lý thu chi"
      subtitle="Nói để hỏi, xem số liệu từ sổ của bạn."
      scrollRef={scroll}
      onContentSizeChange={() => {
        if (pendingScroll.current) {
          pendingScroll.current = false;
          scroll.current?.scrollToEnd({ animated: true });
        }
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      >
        <Text style={{ color: colors.green, fontWeight: "600" }}>Quay lại</Text>
      </Pressable>
      <Card>
        <Text style={st.heading}>Hỏi sổ của nhà mình</Text>
        <Chips
          items={["Cơ bản", "AI OpenAI"]}
          value={engine}
          onChange={(value) => {
            if (!working) {
              setPreference(value);
              setAsked("");
              setRemote(null);
              setError("");
            }
          }}
        />
        <AIConnection status={status} refresh={refresh} />
        <Text style={st.subtitle}>
          {engine === "AI OpenAI"
            ? "Khi bạn bấm Hỏi AI, câu hỏi cùng tên danh mục, thành viên và các tháng có dữ liệu được gửi đến OpenAI để hiểu yêu cầu. Nếp Nhà tự tính số tiền trên máy chủ; không gửi danh sách giao dịch, nội dung ghi chú hoặc số tiền trong sổ đến AI."
            : "Chế độ cơ bản tổng hợp trên thiết bị theo câu mẫu, không gọi OpenAI."}
        </Text>
        <Text style={st.tiny}>
          {household
            ? `Sổ gia đình: ${household.name}`
            : "Sổ riêng trên thiết bị"}
          . Không nêu tháng dùng tháng đang chọn. “Tháng này” theo lịch hiện
          tại. So sánh mặc định với tháng liền trước của tháng đang chọn.
        </Text>
      </Card>
      <MonthPicker />
      <Card>
        <SpeechInput
          disabled={working}
          label="Câu hỏi về thu chi"
          placeholder="Ví dụ: Tuần này ăn uống hết bao nhiêu?"
          value={question}
          onChange={setQuestion}
        />
        <Button
          title={
            working
              ? "AI đang đọc câu hỏi…"
              : engine === "AI OpenAI"
                ? "Hỏi AI"
                : "Xem trả lời"
          }
          disabled={!question.trim() || working}
          onPress={() => void ask(question.trim())}
        />
        <View style={{ gap: 8 }}>
          {examples.map((text) => (
            <Pressable
              key={text}
              disabled={working}
              accessibilityRole="button"
              onPress={() => {
                setQuestion(text);
                void ask(text);
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.bg,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 20 }}>
                {text}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {!!error && (
        <Card>
          <Text accessibilityRole="alert" style={st.error}>
            {error}
          </Text>
          <Text style={st.tiny}>
            Bạn vẫn có thể chọn Cơ bản để xem số liệu mà không gọi API.
          </Text>
        </Card>
      )}
      {!!stale && (
        <Card>
          <Text style={st.subtitle}>
            Sổ vừa thay đổi. Hãy hỏi lại để nhận số liệu mới.
          </Text>
        </Card>
      )}
      {answer && (
        <Card>
          <Text style={st.tiny}>
            {answeredEngine === "Cơ bản"
              ? "Trợ lý cơ bản"
              : `OpenAI · ${remote?.model}`}{" "}
            · Câu hỏi: {asked}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontSize: 15, color: colors.ink, lineHeight: 25 }}
          >
            {answer.text}
          </Text>
          <ReadAloud
            key={answer.text + month + (household?.id ?? "local")}
            text={answer.text}
          />
          <Text style={st.tiny}>
            Chỉ dựa trên giao dịch đã ghi. Trợ lý không thêm, sửa hoặc xóa giao
            dịch.
          </Text>
        </Card>
      )}
    </Page>
  );
}
