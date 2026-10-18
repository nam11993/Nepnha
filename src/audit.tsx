import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { cloudCall } from "./cloud";
import { useLedger } from "./store";
import { Button, Card, st } from "./ui";
import { money, type Entry } from "./domain";
type AuditRow = {
  id: number;
  actor_name: string;
  action: string;
  occurred_at: string;
  entry_id: string | null;
  before_value: Partial<Entry> | null;
  after_value: Partial<Entry> | null;
};
const describe = (entry: Partial<Entry> | null) =>
  entry
    ? [
        entry.note || entry.category,
        typeof entry.amount === "number" ? money(entry.amount) : null,
        entry.date,
        entry.member,
        entry.payment,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
export function Audit({ embedded = false }: { embedded?: boolean }) {
  const { session } = useLedger();
  const [rows, setRows] = useState<AuditRow[]>([]),
    [loaded, setLoaded] = useState(false),
    [working, setWorking] = useState(true),
    [error, setError] = useState(""),
    [more, setMore] = useState(false);
  async function load(append = false) {
    setWorking(true);
    setError("");
    try {
      const items: AuditRow[] = await cloudCall("get_my_audit", {
        p_before: append ? rows.at(-1)?.id : null,
      });
      setRows((old) => (append ? [...old, ...items] : items));
      setLoaded(true);
      setMore(items.length === 30);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  useEffect(() => {
    let active = true;
    void cloudCall("get_my_audit", { p_before: null })
      .then((items: AuditRow[]) => {
        if (active) {
          setRows(items);
          setLoaded(true);
          setMore(items.length === 30);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setWorking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const Container = embedded ? React.Fragment : Card;
  if (!session) return null;
  return (
    <Container>
      {!embedded && <Text style={st.heading}>Lịch sử chỉnh sửa</Text>}
      <Text style={st.subtitle}>
        Ghi nhận tài khoản thao tác và nội dung trước/sau. Tên người thu/chi
        không quyết định quyền sở hữu giao dịch.
      </Text>
      <Button
        title={working ? "Đang tải…" : "Xem / làm mới lịch sử"}
        disabled={working}
        onPress={() => void load()}
      />
      {loaded && !rows.length && (
        <Text style={st.tiny}>Chưa có thay đổi kể từ khi nâng cấp.</Text>
      )}
      {rows.map((row) => (
        <View key={row.id} style={{ gap: 6, paddingVertical: 10 }}>
          <Text style={st.heading}>
            {row.actor_name} ·{" "}
            {(
              {
                create: "Thêm",
                update: "Sửa",
                delete: "Xóa",
                settings: "Đổi danh mục / ngân sách",
              } as Record<string, string>
            )[row.action] ?? row.action}
          </Text>
          <Text style={st.tiny}>
            {new Date(row.occurred_at).toLocaleString("vi-VN")}
          </Text>
          {!!row.before_value && row.action !== "settings" && (
            <Text style={st.subtitle}>Trước: {describe(row.before_value)}</Text>
          )}
          {!!row.after_value && row.action !== "settings" && (
            <Text style={st.subtitle}>Sau: {describe(row.after_value)}</Text>
          )}
          {row.action === "settings" && (
            <>
              <Text selectable style={st.tiny}>
                Trước: {JSON.stringify(row.before_value)}
              </Text>
              <Text selectable style={st.tiny}>
                Sau: {JSON.stringify(row.after_value)}
              </Text>
            </>
          )}
        </View>
      ))}
      {more && (
        <Button
          title="Xem cũ hơn"
          disabled={working}
          onPress={() => void load(true)}
        />
      )}
      {!!error && <Text style={st.error}>{error}</Text>}
    </Container>
  );
}
