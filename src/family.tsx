import React, { useEffect, useState } from "react";
import { Text, TextInput, View, Platform } from "react-native";
import { cloud, cloudCall } from "./cloud";
import { cloudConfig } from "./cloud-config";
import { useLedger } from "./store";
import { Card, colors, st } from "./ui";
import { SettingAction, SettingGroup, SettingRow } from "./settings-controls";
import { AppleSignInButton, signInWithApple } from "./apple-sign-in";
type Member = { user_id: string; display_name: string; is_owner: boolean };
export type AccountSection = "account" | "family" | "ai";
export function Family({
  section = "account",
  embedded = false,
  onBusyChange,
}: {
  section?: AccountSection;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { session, profile, household, reload, isOwner } = useLedger();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [editingName, setEditingName] = useState(false);
  const [appleEnabled, setAppleEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(cloudConfig.url + "/auth/v1/settings", {
      headers: { apikey: cloudConfig.publishableKey },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const settings = await response.json();
        if (!controller.signal.aborted)
          setAppleEnabled(settings.external?.apple === true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const [familyName, setFamilyName] = useState("Gia đình mình"),
    [invite, setInvite] = useState("");
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [members, setMembers] = useState<Member[]>([]),
    [selected, setSelected] = useState<Member | null>(null);
  const [advanced, setAdvanced] = useState(false),
    [working, setWorking] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{
    label: string;
    action: () => Promise<void>;
  } | null>(null);
  const familyId = household?.is_family ? household.id : "";
  useEffect(() => {
    let active = true;
    if (section === "family" && familyId)
      void cloudCall("list_my_family_members")
        .then((rows) => {
          if (active) setMembers(rows);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [section, familyId, household?.invite_code]);
  async function run(action: () => Promise<void>) {
    if (working) return;
    setWorking(true);
    onBusyChange?.(true);
    setError("");
    setMessage("");
    try {
      await action();
      await reload();
      if (section === "family" && familyId)
        setMembers(await cloudCall("list_my_family_members"));
      setConfirm(null);
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
      onBusyChange?.(false);
    }
  }
  async function google(link = false) {
    if (!cloud || Platform.OS !== "web")
      throw Error("Hãy mở Nếp Nhà trong trình duyệt để kết nối Google.");
    const response = await fetch(cloudConfig.url + "/auth/v1/settings", {
      headers: { apikey: cloudConfig.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw Error("Không kiểm tra được kết nối Google. Hãy thử lại.");
    const providers = await response.json();
    if (!providers.external?.google)
      throw Error(
        "Google chưa được bật trên máy chủ. Chủ ứng dụng cần lưu Google OAuth Client ID/Secret trong Supabase trước.",
      );
    const options = {
      redirectTo: "https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings",
    };
    const result = link
      ? await cloud.auth.linkIdentity({ provider: "google", options })
      : await cloud.auth.signInWithOAuth({ provider: "google", options });
    if (result.error)
      throw Error(
        result.error.message.includes("not enabled")
          ? "Google chưa được bật trên máy chủ. Chủ ứng dụng cần hoàn tất cấu hình Google OAuth."
          : result.error.message,
      );
  }

  if (!cloud) return <Text style={st.subtitle}>Chưa kết nối máy chủ.</Text>;
  const needsName = !!session && !profile?.display_name;
  const linked = session?.user.identities?.some(
    (identity) => identity.provider === "google",
  );
  const appleLinked = session?.user.identities?.some(
    (identity) => identity.provider === "apple",
  );
  const feedback = (
    <>
      {!!message && (
        <Text accessibilityRole="alert" style={st.subtitle}>
          {message}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
    </>
  );
  let content: React.ReactNode;
  if (confirm)
    content = (
      <View style={{ gap: 18 }}>
        <Text style={st.heading}>Xác nhận thao tác</Text>
        <Text style={st.subtitle}>{confirm.label}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <SettingAction
            title={working ? "Đang xử lý…" : "Xác nhận"}
            tone="danger"
            disabled={working}
            onPress={() => void run(confirm.action)}
          />
          <SettingAction
            title="Hủy"
            tone="secondary"
            disabled={working}
            onPress={() => setConfirm(null)}
          />
        </View>
        {feedback}
      </View>
    );
  else if (!session)
    content = (
      <View style={{ gap: 16 }}>
        <Text style={st.heading}>Đăng nhập Nếp Nhà</Text>
        <Text style={st.subtitle}>
          Đồng bộ sổ cá nhân, tham gia gia đình và dùng AI. Chưa đăng nhập vẫn
          ghi thu chi được trên thiết bị.
        </Text>
        <SettingAction
          title="Tiếp tục với Google"
          disabled={working}
          onPress={() => void run(() => google())}
        />
        {appleEnabled && (
          <AppleSignInButton
            disabled={working}
            onPress={() => void run(() => signInWithApple())}
          />
        )}
        {feedback}
      </View>
    );
  else if (section === "ai")
    content = (
      <View style={{ gap: 16 }}>
        <Text style={st.heading}>Quyền riêng tư AI</Text>
        {profile?.ai_consent ? (
          <>
            <Text style={st.subtitle}>
              Bạn dùng AI để ghi thu chi bằng giọng nói và hỏi về sổ đang mở.
              Không cần tài khoản ChatGPT hoặc API key riêng.
            </Text>
            <Text style={st.tiny}>
              Bạn có thể ngừng gửi yêu cầu tới OpenAI bất cứ lúc nào và tiếp tục
              nhập tay.
            </Text>
            <SettingAction
              title="Thu hồi đồng ý gửi dữ liệu"
              tone="secondary"
              disabled={working}
              onPress={() =>
                setConfirm({
                  label:
                    "Ngừng cho phép gửi yêu cầu tới OpenAI? Bạn vẫn có thể ghi giao dịch bằng tay.",
                  action: async () => {
                    await cloudCall("set_my_ai_consent", { p_enabled: false });
                  },
                })
              }
            />
          </>
        ) : (
          <Text style={st.subtitle}>
            Tài khoản của bạn được dùng AI để ghi thu chi và hỏi về sổ. Lần đầu
            gửi yêu cầu, Nếp Nhà sẽ hỏi bạn trước khi chuyển nội dung tới
            OpenAI. Không cần tài khoản ChatGPT hoặc API key riêng.
          </Text>
        )}
        {feedback}
      </View>
    );
  else if (section === "family" && !needsName)
    content = (
      <View style={{ gap: 16 }}>
        {household?.is_family ? (
          <>
            <Text style={st.heading}>{household.name}</Text>
            <Text style={st.tiny}>
              {isOwner ? "Bạn là chủ nhà" : "Bạn là thành viên"} · Sổ chung đã
              đồng bộ
            </Text>
            <View
              style={{
                gap: 10,
                padding: 14,
                borderRadius: 16,
                backgroundColor: colors.bg,
              }}
            >
              <Text style={st.label}>Mã mời gia đình</Text>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.ink,
                  fontWeight: "600",
                }}
              >
                {household.invite_code}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <SettingAction
                  title="Sao chép mã"
                  tone="secondary"
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      if (Platform.OS === "web" && navigator.clipboard) {
                        await navigator.clipboard.writeText(
                          household.invite_code,
                        );
                        setMessage("Đã sao chép mã mời.");
                      } else setMessage("Nhấn giữ mã phía trên để sao chép.");
                    })
                  }
                />
                {isOwner && (
                  <SettingAction
                    title="Đổi mã"
                    tone="secondary"
                    disabled={working}
                    onPress={() =>
                      setConfirm({
                        label:
                          "Đổi mã mời? Mã cũ không dùng để tham gia mới; thành viên hiện tại vẫn được giữ.",
                        action: async () => {
                          await cloudCall("rotate_invite_code");
                        },
                      })
                    }
                  />
                )}
              </View>
            </View>
            <Text style={st.heading}>
              Thành viên{members.length ? " · " + members.length : ""}
            </Text>
            <SettingGroup>
              {members.map((member) => (
                <SettingRow
                  key={member.user_id}
                  title={member.display_name}
                  detail={
                    (member.is_owner ? "Chủ nhà" : "Thành viên") +
                    (member.user_id === session.user.id ? " · Bạn" : "")
                  }
                  icon="users"
                  disabled={working || !isOwner || member.is_owner}
                  onPress={() =>
                    setSelected(
                      selected?.user_id === member.user_id ? null : member,
                    )
                  }
                />
              ))}
            </SettingGroup>
            {selected && isOwner && (
              <View
                style={{
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                }}
              >
                <Text style={st.heading}>Quản lý {selected.display_name}</Text>
                <SettingGroup>
                  <SettingRow
                    title="Xóa thành viên"
                    danger
                    disabled={working}
                    onPress={() =>
                      setConfirm({
                        label:
                          "Xóa " +
                          selected.display_name +
                          " khỏi gia đình? Giao dịch đã ghi vẫn được giữ. Mã cũ vẫn cho phép tham gia lại.",
                        action: async () => {
                          await cloudCall("remove_family_member", {
                            p_user_id: selected.user_id,
                            p_rotate: false,
                          });
                        },
                      })
                    }
                  />
                  <SettingRow
                    title="Xóa và đổi mã mời"
                    detail="Chặn tham gia lại bằng mã cũ"
                    danger
                    disabled={working}
                    onPress={() =>
                      setConfirm({
                        label:
                          "Xóa " +
                          selected.display_name +
                          " và đổi mã mời? Giao dịch đã ghi vẫn được giữ.",
                        action: async () => {
                          await cloudCall("remove_family_member", {
                            p_user_id: selected.user_id,
                            p_rotate: true,
                          });
                        },
                      })
                    }
                  />
                </SettingGroup>
              </View>
            )}
            <Text style={st.tiny}>
              Thành viên sửa/xóa khoản mình tạo. Chủ nhà quản lý toàn bộ.
            </Text>
            <SettingGroup>
              <SettingRow
                title={advanced ? "Ẩn tùy chọn gia đình" : "Tùy chọn gia đình"}
                icon="settings-outline"
                onPress={() => setAdvanced(!advanced)}
              />
              {advanced && (
                <SettingRow
                  title={isOwner ? "Giải tán gia đình" : "Thoát gia đình"}
                  danger
                  disabled={working}
                  onPress={() =>
                    setConfirm({
                      label: isOwner
                        ? "Giải tán gia đình? Thành viên mất quyền truy cập; toàn bộ sổ hiện có trở lại sổ cá nhân của bạn."
                        : "Rời gia đình và trở lại sổ cá nhân? Các giao dịch đã chia sẻ vẫn được giữ trong sổ chủ nhà.",
                      action: async () => {
                        await cloudCall(
                          isOwner ? "disband_my_family" : "leave_my_family",
                        );
                      },
                    })
                  }
                />
              )}
            </SettingGroup>
          </>
        ) : (
          <>
            {mode === "home" ? (
              <>
                <Text style={st.subtitle}>
                  Chia sẻ sổ của bạn hoặc tham gia sổ của người thân.
                </Text>
                <SettingGroup>
                  <SettingRow
                    title="Tạo gia đình"
                    detail="Chia sẻ sổ hiện tại, bạn là chủ nhà"
                    icon="home"
                    onPress={() => setMode("create")}
                  />
                  <SettingRow
                    title="Tham gia bằng mã mời"
                    detail="Sổ cá nhân của bạn vẫn được giữ riêng"
                    icon="users"
                    onPress={() => setMode("join")}
                  />
                </SettingGroup>
              </>
            ) : (
              <>
                <Text style={st.label}>
                  {mode === "create" ? "Tên gia đình" : "Mã mời từ chủ nhà"}
                </Text>
                <TextInput
                  accessibilityLabel={
                    mode === "create" ? "Tên gia đình" : "Mã mời gia đình"
                  }
                  value={mode === "create" ? familyName : invite}
                  onChangeText={mode === "create" ? setFamilyName : setInvite}
                  placeholder={
                    mode === "create" ? "Gia đình mình" : "Dán mã mời tại đây"
                  }
                  autoCapitalize="none"
                  maxLength={80}
                  style={st.input}
                />
                <Text style={st.tiny}>
                  {mode === "create"
                    ? "Sổ hiện tại của bạn sẽ được chia sẻ với thành viên tham gia."
                    : "Bạn sẽ mở sổ chung của chủ nhà. Sổ cá nhân cũ được giữ riêng."}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                >
                  <SettingAction
                    title={mode === "create" ? "Tạo gia đình" : "Tham gia"}
                    disabled={
                      working ||
                      !(mode === "create" ? familyName : invite).trim()
                    }
                    onPress={() =>
                      mode === "create"
                        ? setConfirm({
                            label:
                              "Tạo gia đình và chia sẻ toàn bộ sổ hiện tại của bạn?",
                            action: async () => {
                              await cloudCall("create_my_household", {
                                p_name: familyName.trim(),
                              });
                            },
                          })
                        : void run(async () => {
                            await cloudCall("join_household", {
                              p_code: invite.trim(),
                            });
                          })
                    }
                  />
                  <SettingAction
                    title="Quay lại"
                    tone="secondary"
                    disabled={working}
                    onPress={() => setMode("home")}
                  />
                </View>
              </>
            )}
          </>
        )}
        {feedback}
      </View>
    );
  else
    content = (
      <View style={{ gap: 16 }}>
        {(!embedded || needsName) && (
          <Text style={st.heading}>
            {needsName ? "Bạn muốn được gọi là gì?" : "Tài khoản"}
          </Text>
        )}
        <Text style={st.tiny}>{session.user.email}</Text>
        <Text style={st.label}>Tên hiển thị</Text>
        {needsName || editingName ? (
          <TextInput
            accessibilityLabel="Tên hiển thị"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!working}
            maxLength={80}
            placeholder="Ví dụ: Nam, Mẹ, Bố"
            style={st.input}
          />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Text style={[st.heading, { flex: 1 }]}>
              {profile?.display_name}
            </Text>
            <SettingAction
              title="Sửa"
              tone="secondary"
              disabled={working}
              onPress={() => {
                setDisplayName(profile?.display_name ?? "");
                setError("");
                setMessage("");
                setEditingName(true);
              }}
            />
          </View>
        )}
        <Text style={st.tiny}>
          Dùng mặc định khi ghi thu chi; bạn có thể sửa khi ghi hộ.
        </Text>
        {(needsName || editingName) && (
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <SettingAction
              title={
                working
                  ? "Đang lưu…"
                  : needsName
                    ? "Lưu tên và bắt đầu"
                    : "Lưu thay đổi"
              }
              disabled={
                working ||
                !displayName.trim() ||
                (!needsName && displayName.trim() === profile?.display_name)
              }
              onPress={() =>
                void run(async () => {
                  await cloudCall("set_my_name", {
                    p_name: displayName.trim(),
                  });
                  setEditingName(false);
                  setMessage("Đã lưu tên hiển thị.");
                })
              }
            />
            {!needsName && (
              <SettingAction
                title="Hủy"
                tone="secondary"
                disabled={working}
                onPress={() => {
                  setDisplayName(profile?.display_name ?? "");
                  setEditingName(false);
                  setError("");
                  setMessage("");
                }}
              />
            )}
          </View>
        )}
        {!needsName && (
          <>
            <Text style={st.heading}>Phương thức đăng nhập</Text>
            <Text style={st.subtitle}>
              {[
                linked && "Google · Đã liên kết",
                appleLinked && "Apple · Đã liên kết",
              ]
                .filter(Boolean)
                .join("\n") || "Email · Chưa liên kết Google"}
            </Text>
            {!linked && (
              <SettingAction
                title="Liên kết Google với tài khoản này"
                tone="secondary"
                disabled={working}
                onPress={() => void run(() => google(true))}
              />
            )}
            {appleEnabled && !appleLinked && (
              <View style={{ gap: 10 }}>
                <Text style={st.tiny}>
                  Liên kết Apple vào tài khoản này để tiếp tục dùng cùng sổ và
                  gia đình, kể cả khi bạn ẩn email.
                </Text>
                <AppleSignInButton
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      await signInWithApple(true);
                    })
                  }
                />
              </View>
            )}
          </>
        )}
        <SettingGroup>
          <SettingRow
            title={advanced ? "Ẩn quản lý tài khoản" : "Quản lý tài khoản"}
            icon="settings-outline"
            onPress={() => setAdvanced(!advanced)}
          />
          {advanced && (
            <>
              <SettingRow
                title="Đăng xuất thiết bị này"
                disabled={working}
                onPress={() =>
                  setConfirm({
                    label:
                      "Đăng xuất trên thiết bị này? Sổ đã đồng bộ vẫn được giữ trong tài khoản.",
                    action: async () => {
                      const result = await cloud!.auth.signOut({
                        scope: "local",
                      });
                      if (result.error) throw result.error;
                    },
                  })
                }
              />
              <SettingRow
                title="Xóa tài khoản"
                danger
                disabled={working}
                onPress={() => {
                  if (household?.is_family && isOwner) {
                    setError(
                      "Hãy giải tán gia đình trong mục Gia đình trước khi xóa tài khoản chủ nhà.",
                    );
                    return;
                  }
                  setConfirm({
                    label:
                      "Xóa vĩnh viễn tài khoản và sổ cá nhân? Không thể hoàn tác. Giao dịch trong sổ gia đình khác được giữ, tài khoản trong nhật ký được ẩn danh.",
                    action: async () => {
                      await cloudCall("delete_my_account");
                      await cloud!.auth.signOut({ scope: "local" });
                    },
                  });
                }}
              />
            </>
          )}
        </SettingGroup>
        {feedback}
      </View>
    );
  return embedded ? content : <Card>{content}</Card>;
}
