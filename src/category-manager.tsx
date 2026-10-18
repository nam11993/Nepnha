import React, { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { Kind, updateCategory } from "./domain";
import { Dialog } from "./dialog";
import { useLedger } from "./store";
import { Button, Chips, colors, st } from "./ui";

export function CategoryManager({
  initialKind = "expense",
  expectedRevision,
  onSaved,
  label = "Quản lý danh mục",
  renderTrigger,
}: {
  initialKind?: Kind;
  expectedRevision?: number;
  onSaved?: (kind: Kind, previous: string | null, name: string) => void;
  label?: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
}) {
  const { data, save, busy, isOwner } = useLedger();
  const scroll = useRef<ScrollView>(null);
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [previous, setPrevious] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const reset = () => {
    setPrevious(null);
    setName("");
    setError("");
    setMessage("");
  };
  async function submit() {
    try {
      setError("");
      const next = updateCategory(data, kind, previous, name);
      await save(next, expectedRevision);
      onSaved?.(kind, previous, name.trim());
      reset();
      if (onSaved) setVisible(false);
      else setMessage("Đã lưu danh mục.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!isOwner)
    return <Text style={st.tiny}>Chủ nhà quản lý danh mục chung.</Text>;
  const openManager = () => {
    reset();
    setKind(initialKind);
    setVisible(true);
  };
  return (
    <>
      {renderTrigger ? (
        renderTrigger(openManager)
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            reset();
            setKind(initialKind);
            setVisible(true);
          }}
          style={{ paddingVertical: 10, alignSelf: "flex-start" }}
        >
          <Text style={{ color: colors.green, fontWeight: "600" }}>
            {label}
          </Text>
        </Pressable>
      )}
      <Dialog
        scrollRef={scroll}
        visible={visible}
        title="Danh mục thu chi"
        onClose={() => {
          if (!busy) setVisible(false);
        }}
      >
        <Chips
          items={["Khoản chi", "Khoản thu"]}
          value={kind === "income" ? "Khoản thu" : "Khoản chi"}
          onChange={(v) => {
            reset();
            setKind(v === "Khoản thu" ? "income" : "expense");
          }}
        />
        <Text style={st.subtitle}>
          Thêm danh mục theo nhu cầu. Đổi tên sẽ cập nhật cả giao dịch và ngân
          sách đã dùng danh mục đó.
        </Text>
        <Text style={st.label}>
          {previous === null ? "Tên danh mục mới" : `Đổi tên: ${previous}`}
        </Text>
        <TextInput
          accessibilityLabel="Tên danh mục"
          style={st.input}
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder="Ví dụ: Thú cưng"
        />
        {!!error && (
          <Text accessibilityRole="alert" style={st.error}>
            {error}
          </Text>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={{ color: colors.green }}>
            {message}
          </Text>
        )}
        <Button
          title={
            busy
              ? "Đang lưu…"
              : previous === null
                ? "Thêm danh mục"
                : "Lưu tên danh mục"
          }
          disabled={busy || !name.trim()}
          onPress={() => void submit()}
        />
        {previous !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={reset}
            style={{ padding: 10 }}
          >
            <Text style={{ color: colors.green }}>Hủy đổi tên</Text>
          </Pressable>
        )}
        {data.categories[kind].map((category) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa danh mục ${category}`}
            disabled={busy}
            key={category}
            onPress={() => {
              setPrevious(category);
              setName(category);
              setError("");
              setMessage("");
              scroll.current?.scrollTo({ y: 0, animated: true });
            }}
            style={[
              st.row,
              {
                minHeight: 48,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              },
            ]}
          >
            <Text style={{ color: colors.ink, flex: 1 }}>{category}</Text>
            <Text style={{ color: colors.green }}>Sửa</Text>
          </Pressable>
        ))}
      </Dialog>
    </>
  );
}
