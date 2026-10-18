import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useLedger } from "./store";
import { cloudCall } from "./cloud";
import { Button, st } from "./ui";

// Shown only when a user requests AI processing.
export function AIConsent({
  onContinue,
  onCancel,
  onBusyChange,
}: {
  onContinue: () => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { reload } = useLedger();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return (
    <View style={{ gap: 14 }}>
      <Text style={st.heading}>Trước khi dùng AI lần đầu</Text>
      <Text style={st.subtitle}>
        Nội dung bạn nhập hoặc nói sẽ được gửi tới OpenAI để xử lý, nội dung có
        thể chứa thông tin cá nhân. Nếp Nhà không gửi thông tin khác và sẽ không
        lưu dữ liệu âm thanh.
      </Text>
      <Text style={st.tiny}>
        Lựa chọn được ghi nhớ theo tài khoản. Bạn có thể thu hồi trong Cài đặt →
        Quyền riêng tư AI và tiếp tục nhập tay. Dịch vụ giọng nói của trình
        duyệt có thể xử lý âm thanh riêng.
      </Text>
      <Button
        title={working ? "Đang lưu…" : "Đồng ý và tiếp tục"}
        disabled={working}
        onPress={() => {
          if (working) return;
          setWorking(true);
          onBusyChange?.(true);
          setError("");
          void cloudCall("set_my_ai_consent", { p_enabled: true })
            .then(async () => {
              await reload();
              if (active.current) {
                onBusyChange?.(false);
                onContinue();
              }
            })
            .catch((e) => {
              if (active.current) setError(e.message);
            })
            .finally(() => {
              if (active.current) {
                setWorking(false);
                onBusyChange?.(false);
              }
            });
        }}
      />
      <Button title="Để sau" disabled={working} onPress={onCancel} />
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
