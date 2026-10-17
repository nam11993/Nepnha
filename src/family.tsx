import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { cloud, cloudCall } from "./cloud";
import { useLedger } from "./store";
import { Button, Card, colors, st } from "./ui";
export function Family() {
  const { session, household, reload } = useLedger();
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false),
    [name, setName] = useState("Gia đình mình"),
    [invite, setInvite] = useState(""),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  async function run(fn: () => Promise<void>) {
    setWorking(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  if (!cloud)
    return (
      <Card>
        <Text style={st.heading}>Đồng bộ gia đình</Text>
        <Text style={st.subtitle}>
          Bản thử hiện lưu trên thiết bị. Tính năng nhóm gia đình sẽ hoạt động
          sau khi kết nối máy chủ đồng bộ.
        </Text>
      </Card>
    );
  return (
    <Card>
      <Text style={st.heading}>Tài khoản chung & đồng bộ</Text>
      {!session ? (
        <>
          <Text style={st.subtitle}>
            Cả nhà đăng nhập cùng một email để dùng chung sổ thu chi trên các
            thiết bị. Mở liên kết gửi về email đó trên thiết bị cần đăng nhập.
            Bản miễn phí hiện hỗ trợ email chủ dự án Supabase.
          </Text>
          <TextInput
            accessibilityLabel="Email đăng nhập"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setSent(false);
            }}
            placeholder="Email của bạn"
            keyboardType="email-address"
            autoCapitalize="none"
            style={st.input}
          />
          <Button
            title={sent ? "Gửi lại liên kết" : "Gửi liên kết đăng nhập"}
            disabled={working || !email.trim()}
            onPress={() =>
              void run(async () => {
                const { error } = await cloud!.auth.signInWithOtp({
                  email: email.trim(),
                  options: {
                    emailRedirectTo: "https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings",
                  },
                });
                if (error) throw error;
                setSent(true);
              })
            }
          />
          {sent && <Text accessibilityRole="alert" style={st.subtitle}>
            Đã yêu cầu gửi email. Kiểm tra Hộp thư đến hoặc Thư rác, rồi mở liên kết
            trên thiết bị này. Không chuyển tiếp liên kết đăng nhập ra ngoài gia đình.
          </Text>}
        </>
      ) : (
        <>
          <Text style={st.tiny}>{session.user.email}</Text>
          {household ? (
            <>
              <Text style={st.heading}>{household.name}</Text>
              <Text style={st.subtitle}>
                Thành viên cùng nhóm có thể xem, thêm, sửa và xóa thu chi. Cần
                Internet để lưu; tự làm mới mỗi 15 giây khi đang mở app.
              </Text>
              <Text style={st.label}>
                Mã mời — chỉ gửi cho người trong gia đình
              </Text>
              <Text
                selectable
                style={{ fontSize: 15, color: colors.green, fontWeight: "600" }}
              >
                {household.invite_code}
              </Text>
              <Button
                title="Làm mới dữ liệu nhóm"
                disabled={working}
                onPress={() => void reload()}
              />
              {household.owner_id === session.user.id && (
                <Button
                  title="Đổi mã mời"
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      await cloudCall("rotate_invite_code");
                      await reload();
                    })
                  }
                />
              )}
            </>
          ) : (
            <>
              <Text style={st.subtitle}>
                Bấm Tạo sổ dùng chung một lần. Các thiết bị đăng nhập cùng email
                sẽ tự mở sổ này. Sổ chung bắt đầu trống; dữ liệu riêng trên máy
                vẫn được giữ. Dùng Sao lưu và khôi phục để chuyển sổ riêng nếu cần.
              </Text>
              <TextInput
                accessibilityLabel="Tên gia đình"
                value={name}
                onChangeText={setName}
                maxLength={80}
                style={st.input}
              />
              <Button
                title="Tạo sổ dùng chung"
                disabled={working || !name.trim()}
                onPress={() =>
                  void run(async () => {
                    await cloudCall("create_my_household", {
                      p_name: name.trim(),
                    });
                    await reload();
                  })
                }
              />
              <TextInput
                accessibilityLabel="Mã mời gia đình"
                value={invite}
                onChangeText={setInvite}
                placeholder="Mã mời từ người thân"
                autoCapitalize="none"
                style={st.input}
              />
              <Button
                title="Tham gia gia đình"
                disabled={working || !invite.trim()}
                onPress={() =>
                  void run(async () => {
                    await cloudCall("join_household", {
                      p_code: invite.trim(),
                    });
                    await reload();
                  })
                }
              />
            </>
          )}
          <Button
            title="Đăng xuất"
            disabled={working}
            onPress={() =>
              void run(async () => {
                const { error } = await cloud!.auth.signOut();
                if (error) throw error;
                await reload();
              })
            }
          />
          {deleting ? (
            <View style={{ gap: 12 }}>
              <Text style={st.error}>
                Xóa vĩnh viễn tài khoản? Nếu bạn tạo nhóm, toàn bộ sổ chung của
                gia đình cũng bị xóa. Hãy xuất bản sao trước. Không thể hoàn
                tác.
              </Text>
              <Button
                title="Xác nhận xóa tài khoản"
                disabled={working}
                onPress={() =>
                  void run(async () => {
                    await cloudCall("delete_my_account");
                    await cloud!.auth.signOut({ scope: "local" });
                    setDeleting(false);
                    await reload();
                  })
                }
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeleting(false)}
              >
                <Text style={st.subtitle}>Hủy</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDeleting(true)}
            >
              <Text style={st.error}>Xóa tài khoản</Text>
            </Pressable>
          )}
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
    </Card>
  );
}
