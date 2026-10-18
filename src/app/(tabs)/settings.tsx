import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Family, type AccountSection } from "../../family";
import { Audit } from "../../audit";
import { useLedger } from "../../store";
import { type Ledger } from "../../domain";
import { exportBackup, readBackup } from "../../backup";
import { colors, Page, st } from "../../ui";
import { CategoryManager } from "../../category-manager";
import { Dialog } from "../../dialog";
import { Icon } from "../../icon";
import {
  SettingAction,
  SettingGroup,
  SettingRow,
} from "../../settings-controls";
type Panel = AccountSection | "backup" | "audit";
const titles: Record<Panel, string> = {
  account: "Tài khoản",
  family: "Gia đình",
  ai: "Quyền riêng tư AI",
  backup: "Sao lưu & khôi phục",
  audit: "Lịch sử chỉnh sửa",
};
export default function Settings() {
  const { data, save, busy, session, profile, household, isOwner } =
    useLedger();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [accountWorking, setAccountWorking] = useState(false);
  const [pending, setPending] = useState<Ledger | null>(null),
    [working, setWorking] = useState(false);
  const [revision, setRevision] = useState<number | undefined>();
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const name = profile?.display_name || "Chào bạn";
  const bookLabel = household?.is_family
    ? household.name
    : session
      ? "Sổ cá nhân · Đã đồng bộ"
      : "Sổ trên thiết bị";
  function open(next: Panel) {
    setError("");
    setStatus("");
    setPending(null);
    setPanel(next);
  }
  function close() {
    if (working || busy || accountWorking) return;
    setPanel(null);
    setPending(null);
    setError("");
    setStatus("");
  }
  async function action(fn: () => Promise<void>) {
    if (working || busy) return;
    setWorking(true);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  const groupLabel = (text: string) => (
    <Text
      style={{
        fontSize: 11,
        letterSpacing: 1.1,
        fontWeight: "700",
        color: colors.muted,
        marginLeft: 4,
        marginBottom: 8,
      }}
    >
      {text}
    </Text>
  );
  return (
    <Page title="Cài đặt" subtitle="Mọi thứ của bạn, gọn trong một chỗ.">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={session ? "Mở tài khoản" : "Đăng nhập Nếp Nhà"}
        onPress={() => open("account")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 18,
          borderRadius: 22,
          backgroundColor: pressed ? colors.mint : colors.white,
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.mint,
          }}
        >
          <Text
            style={{ fontSize: 23, fontWeight: "700", color: colors.green }}
          >
            {session ? name.trim().charAt(0).toLocaleUpperCase("vi") : "N"}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.heading}>{session ? name : "Đăng nhập Nếp Nhà"}</Text>
          <Text style={st.tiny}>
            {session ? session.user.email : "Đồng bộ dữ liệu và dùng AI"}
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 17, color: colors.green }}>
            {bookLabel}
            {household?.is_family
              ? isOwner
                ? " · Chủ nhà"
                : " · Thành viên"
              : ""}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <View>
        {groupLabel("GIA ĐÌNH & AI")}
        <SettingGroup>
          <SettingRow
            title="Gia đình"
            detail={
              household?.is_family
                ? "Mã mời, thành viên và quyền trong nhóm"
                : "Tạo gia đình hoặc tham gia bằng mã mời"
            }
            icon="users"
            onPress={() => open("family")}
          />
          <SettingRow
            title="Quyền riêng tư AI"
            detail={
              !session
                ? "Đăng nhập để sử dụng"
                : profile?.ai_consent
                  ? "Quản lý đồng ý gửi dữ liệu tới OpenAI"
                  : "Thông tin xử lý dữ liệu với OpenAI"
            }
            icon="mic"
            onPress={() => open("ai")}
          />
        </SettingGroup>
      </View>
      <View>
        {groupLabel("SỔ THU CHI")}
        <SettingGroup>
          {isOwner ? (
            <CategoryManager
              renderTrigger={(onPress) => (
                <SettingRow
                  title="Danh mục thu & chi"
                  detail="Thêm và đổi tên danh mục"
                  icon="grid-outline"
                  onPress={onPress}
                />
              )}
            />
          ) : (
            <SettingRow
              title="Danh mục thu & chi"
              detail="Danh mục chung do chủ nhà quản lý"
              icon="grid-outline"
              disabled
              onPress={() => {}}
            />
          )}
          <SettingRow
            title="Lịch sử chỉnh sửa"
            detail="Ai đã thêm, sửa hoặc xóa giao dịch"
            icon="calendar-outline"
            disabled={!session}
            onPress={() => open("audit")}
          />
          <SettingRow
            title="Sao lưu & khôi phục"
            detail={data.entries.length + " giao dịch trong sổ đang mở"}
            icon="wallet-outline"
            onPress={() => open("backup")}
          />
        </SettingGroup>
      </View>
      <View>
        {groupLabel("THÔNG TIN")}
        <SettingGroup>
          <SettingRow
            title="Quyền riêng tư & dữ liệu"
            detail="Cách lưu, chia sẻ và xóa dữ liệu"
            icon="leaf-outline"
            onPress={() => router.push("/privacy")}
          />
        </SettingGroup>
      </View>
      <Text style={[st.tiny, { textAlign: "center", marginTop: 4 }]}>
        Nếp Nhà · Phiên bản 1.0.0
      </Text>
      {panel && (
        <Dialog visible title={titles[panel]} onClose={close}>
          {(panel === "account" || panel === "family" || panel === "ai") && (
            <Family section={panel} embedded onBusyChange={setAccountWorking} />
          )}
          {panel === "audit" && <Audit embedded />}
          {panel === "backup" && (
            <>
              <Text style={st.subtitle}>
                Sao lưu sổ đang mở vào Files hoặc iCloud Drive. Tệp chứa dữ liệu
                thu chi; bạn tự chọn nơi lưu.
              </Text>
              <SettingGroup>
                <SettingRow
                  title="Xuất tệp sao lưu"
                  detail="Lưu một bản dữ liệu hiện tại"
                  icon="arrow-down-outline"
                  disabled={working || busy}
                  onPress={() =>
                    void action(async () => {
                      await exportBackup(data);
                      setStatus("Đã mở tùy chọn lưu / chia sẻ tệp.");
                    })
                  }
                />
                <SettingRow
                  title="Khôi phục từ tệp"
                  detail={
                    isOwner
                      ? "Chọn tệp để kiểm tra trước khi thay thế"
                      : "Chỉ chủ nhà được thay thế sổ chung"
                  }
                  icon="arrow-up-outline"
                  disabled={working || busy || !isOwner}
                  onPress={() =>
                    void action(async () => {
                      setRevision(household?.revision);
                      setPending(await readBackup());
                    })
                  }
                />
              </SettingGroup>
              {pending && (
                <View
                  style={{
                    gap: 12,
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: colors.rose,
                  }}
                >
                  <Text style={st.heading}>Thay thế sổ đang mở?</Text>
                  <Text style={st.subtitle}>
                    Tệp có {pending.entries.length} giao dịch, sẽ thay thế{" "}
                    {data.entries.length} giao dịch và ngân sách hiện tại
                    {household?.is_family ? " của cả gia đình" : ""}. Hãy giữ
                    một bản sao trước nếu cần.
                  </Text>
                  <View
                    style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                  >
                    <SettingAction
                      title="Xác nhận khôi phục"
                      tone="danger"
                      disabled={working || busy}
                      onPress={() =>
                        void action(async () => {
                          await save(pending, revision);
                          setPending(null);
                          setStatus("Đã khôi phục dữ liệu.");
                        })
                      }
                    />
                    <SettingAction
                      title="Hủy"
                      tone="secondary"
                      disabled={working || busy}
                      onPress={() => setPending(null)}
                    />
                  </View>
                </View>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={st.error}>
                  {error}
                </Text>
              )}
              {!!status && (
                <Text accessibilityRole="alert" style={st.subtitle}>
                  {status}
                </Text>
              )}
            </>
          )}
        </Dialog>
      )}
    </Page>
  );
}
