import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  AppState,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, st } from "./ui";
import { Icon } from "./icon";
import { useFocusEffect } from "expo-router";
import { createSpeechSession, type Recognition } from "./speech-session";

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const subscribeCapability = () => () => {};
const noCapability = () => false;
const recognitionAvailable = () =>
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.isSecureContext &&
  !!(
    (window as SpeechWindow).SpeechRecognition ||
    (window as SpeechWindow).webkitSpeechRecognition
  );
const synthesisAvailable = () =>
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  "speechSynthesis" in window;
export function SpeechInput({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) {
  const supported = useSyncExternalStore(
    subscribeCapability,
    recognitionAvailable,
    noCapability,
  );
  const [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  const abort = useCallback(() => {
    session.current?.abort();
    session.current = null;
  }, []);
  useEffect(() => {
    if (disabled) {
      session.current?.stop();
      abort();
    }
  }, [disabled, abort]);
  useFocusEffect(
    useCallback(
      () => () => {
        abort();
        setListening(false);
      },
      [abort],
    ),
  );
  useEffect(() => {
    const available = supported;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        abort();
        setListening(false);
      }
    });
    const hidden = () => {
      if (document.hidden) {
        abort();
        setListening(false);
      }
    };
    if (available) document.addEventListener("visibilitychange", hidden);
    return () => {
      abort();
      subscription.remove();
      if (available) document.removeEventListener("visibilitychange", hidden);
    };
  }, [supported, abort]);
  function start() {
    Keyboard.dismiss();
    setError("");
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    session.current = createSpeechSession({
      create: () => new Constructor(),
      prefix: value,
      onText: (text) => change.current(text),
      onListening: setListening,
      onError: (code) => {
        const errors: Record<string, string> = {
          "not-allowed":
            "Chưa được phép dùng micro. Hãy cấp quyền micro cho trang hoặc dùng micro của bàn phím.",
          "service-not-allowed":
            "Trình duyệt chưa cho phép nhận giọng nói. Bạn có thể dùng micro của bàn phím.",
          "audio-capture":
            "Không tìm thấy micro. Kiểm tra thiết bị hoặc nhập bằng bàn phím.",
          network:
            "Không kết nối được dịch vụ giọng nói. Lời nói đã nhận vẫn được giữ lại; kiểm tra mạng rồi bấm Nói tiếp.",
          "language-not-supported":
            "Trình duyệt chưa hỗ trợ tiếng Việt. Hãy dùng micro của bàn phím.",
          "restart-unavailable":
            "Trình duyệt đã ngắt hoặc chưa nghe thấy tiếng nói sau nhiều lần nối lại. Nội dung đã nhận vẫn còn. Bấm Nói để tiếp tục.",
          "text-limit":
            "Đã đủ 500 ký tự cho một lượt. Hãy kiểm tra các khoản trước khi nói thêm.",
        };
        if (code !== "aborted")
          setError(
            errors[code] ||
              "Không mở lại được micro. Nội dung đã nhận vẫn còn; bấm Nói để tiếp tục hoặc dùng micro bàn phím.",
          );
      },
    });
    session.current.start();
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={st.tiny}>
        Bấm Nói để bắt đầu, bấm Dừng khi nói xong (tối đa 500 ký tự/lượt). Micro
        dừng khi rời trang. Trình duyệt có thể gửi âm thanh đến dịch vụ nhận
        giọng nói của họ. Nếp Nhà không lưu bản ghi âm.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? "Dừng nghe" : "Nói tiếng Việt"}
        disabled={!supported || disabled}
        onPress={() => (listening ? session.current?.stop() : start())}
        style={[
          st.row,
          {
            alignSelf: "flex-start",
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: listening ? colors.rose : colors.mint,
            opacity: supported ? 1 : 0.55,
          },
        ]}
      >
        <Icon
          name={listening ? "stop" : "mic"}
          size={20}
          color={listening ? colors.orange : colors.green}
        />
        <Text
          style={{
            color: listening ? colors.orange : colors.green,
            fontWeight: "600",
          }}
        >
          {listening ? "Đang nghe · Dừng" : "Nói tiếng Việt"}
        </Text>
      </Pressable>
      {!supported && (
        <Text style={st.tiny}>
          Trình duyệt này chưa có nhận giọng nói trực tiếp. Chạm ô bên dưới rồi
          dùng micro trên bàn phím, hoặc gõ nội dung.
        </Text>
      )}
      <TextInput
        accessibilityLabel={label}
        multiline
        editable={!listening && !disabled}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setError("");
        }}
        maxLength={500}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[
          st.input,
          { minHeight: 100, textAlignVertical: "top", lineHeight: 23 },
        ]}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function ReadAloud({ text }: { text: string }) {
  const supported = useSyncExternalStore(
    subscribeCapability,
    synthesisAvailable,
    noCapability,
  );
  const [speaking, setSpeaking] = useState(false);
  useFocusEffect(
    useCallback(
      () => () => {
        if (synthesisAvailable()) window.speechSynthesis.cancel();
        setSpeaking(false);
      },
      [],
    ),
  );
  useEffect(() => {
    const available = supported;
    const hidden = () => {
      if (document.hidden && available) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
    };
    if (available) document.addEventListener("visibilitychange", hidden);
    return () => {
      if (available) {
        window.speechSynthesis.cancel();
        document.removeEventListener("visibilitychange", hidden);
      }
    };
  }, [text, supported]);
  if (!supported) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={speaking ? "Dừng đọc" : "Nghe câu trả lời"}
      style={{ alignSelf: "flex-start", paddingVertical: 10 }}
      onPress={() => {
        window.speechSynthesis.cancel();
        if (speaking) {
          setSpeaking(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";
        utterance.rate = 0.95;
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.lang.toLowerCase().startsWith("vi"));
        if (voice) utterance.voice = voice;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }}
    >
      <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
        <Icon name="speaker" size={18} color={colors.green} />
        <Text style={{ color: colors.green, fontWeight: "600" }}>
          {speaking ? "Dừng đọc" : "Nghe câu trả lời"}
        </Text>
      </View>
    </Pressable>
  );
}
