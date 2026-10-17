import { Family } from "../../family";
import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { useLedger } from "../../store";
import { Ledger } from "../../domain";
import { exportBackup, readBackup } from "../../backup";
import { Button, Card, colors, Page, st } from "../../ui";
import { CategoryManager } from "../../category-manager";
export default function Settings() {
  const { data, save, busy } = useLedger(),
    [pending, setPending] = useState<Ledger | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [working, setWorking] = useState(false);
  async function action(fn: () => Promise<void>) {
    try {
      setWorking(true);
      setError("");
      setStatus("");
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <Page title="Cài đặt" subtitle="Dữ liệu của nhà mình, do mình giữ.">
      <Family />
      <Card>
        <Text style={st.heading}>Danh mục của bạn</Text>
        <Text style={st.subtitle}>
          Tùy chỉnh danh mục thu và chi, dùng chung trong giao dịch, ngân sách
          và báo cáo.
        </Text>
        <CategoryManager />
      </Card>
      <Card>
        <Text style={st.heading}>Sổ riêng và sổ gia đình</Text>
        <Text style={st.subtitle}>
          Khi chưa tham gia nhóm, dữ liệu được lưu riêng trên máy. Khi tham gia
          gia đình, bạn đang dùng sổ chung trên máy chủ. Dùng tên thành viên để
          ghi nhận người thu / chi.
        </Text>
        <Text style={st.tiny}>{data.entries.length} giao dịch đã lưu</Text>
      </Card>
      <Card>
        <Text style={st.heading}>Sao lưu và khôi phục</Text>
        <Text style={st.subtitle}>
          Lưu tệp sao lưu vào Files hoặc iCloud Drive trước khi đổi điện thoại
          hay gỡ ứng dụng. Tệp chứa dữ liệu thu chi của bạn.
        </Text>
        <Button
          title="Xuất tệp sao lưu"
          disabled={working || busy}
          onPress={() =>
            void action(async () => {
              await exportBackup(data);
              setStatus("Đã mở tùy chọn lưu / chia sẻ tệp.");
            })
          }
        />
        <Button
          title="Chọn tệp để khôi phục"
          disabled={working || busy}
          onPress={() =>
            void action(async () => {
              setPending(await readBackup());
            })
          }
        />
        {pending && (
          <>
            <Text style={st.error}>
              Tệp có {pending.entries.length} giao dịch. Khôi phục sẽ thay thế
              toàn bộ sổ đang mở (kể cả sổ chung nếu đã tham gia gia đình):{" "}
              {data.entries.length} giao dịch và ngân sách hiện tại. Hãy sao lưu
              trước nếu cần giữ dữ liệu cũ.
            </Text>
            <Button
              title="Xác nhận thay thế dữ liệu"
              disabled={busy || working}
              onPress={() =>
                void action(async () => {
                  await save(pending);
                  setPending(null);
                  setStatus("Đã khôi phục dữ liệu.");
                })
              }
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPending(null)}
            >
              <Text style={{ color: colors.green, padding: 10 }}>
                Hủy khôi phục
              </Text>
            </Pressable>
          </>
        )}
      </Card>
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
      {!!status && <Text style={{ color: colors.green }}>{status}</Text>}
      <Card>
        <Text style={st.heading}>Quyền riêng tư</Text>
        <Text style={st.subtitle}>
          Khi dùng sổ gia đình, email đăng nhập và dữ liệu thu chi được xử lý
          bởi dịch vụ Supabase. Thành viên đã tham gia nhóm được truy cập sổ
          chung. Không có quảng cáo hoặc công cụ theo dõi. Khi xuất sao lưu, bạn
          tự chọn nơi lưu hoặc người nhận.
        </Text>
        <Text style={st.subtitle}>
          Bản sao lưu hệ thống của iPhone có thể bao gồm dữ liệu ứng dụng tùy
          cài đặt của bạn. Số liệu trên ứng dụng là các khoản bạn đã nhập, không
          kết nối ngân hàng.
        </Text>
      </Card>
      <Text style={[st.tiny, { textAlign: "center" }]}>
        Nếp Nhà · Phiên bản 1.0.0
      </Text>
    </Page>
  );
}
