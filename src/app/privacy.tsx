import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Card, Page, st } from "../ui";
export default function Privacy() {
  return (
    <Page title="Quyền riêng tư" subtitle="Nếp Nhà · Cập nhật 18/10/2026">
      <Button
        title="Quay lại"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/settings")
        }
      />
      <Card>
        <Text style={st.heading}>Tài khoản và nơi lưu dữ liệu</Text>
        <Text style={st.subtitle}>
          Google hoặc Apple (khi được bật) xác thực đăng nhập. Nếp Nhà sử dụng
          mã tài khoản, email và tên hiển thị; không yêu cầu quyền truy cập
          Gmail, danh bạ hay tài khoản ngân hàng. Khi chưa đăng nhập, sổ lưu
          trong trình duyệt/thiết bị. Khi đăng nhập, sổ cá nhân được lưu trên
          Supabase để đồng bộ; không tự nhập sổ trên thiết bị vào tài khoản.
        </Text>
      </Card>
      <Card>
        <Text style={st.heading}>Chia sẻ trong gia đình</Text>
        <Text style={st.subtitle}>
          Tạo gia đình nghĩa là chia sẻ sổ hiện tại với người có mã mời hợp lệ
          và đã đăng nhập. Thành viên xem toàn bộ sổ chung. Người tạo giao dịch
          và chủ nhà được sửa/xóa khoản đó; nhật ký lưu tài khoản thao tác, thời
          điểm và dữ liệu trước/sau. Tên người thu/chi có thể khác tài khoản ghi
          hộ. Rời nhóm hoặc bị xóa sẽ mất quyền truy cập, các giao dịch và lịch
          sử đã chia sẻ vẫn thuộc sổ chủ nhà. Không thể thu hồi các bản xuất
          hoặc ảnh chụp người khác đã lưu.
        </Text>
      </Card>
      <Card>
        <Text style={st.heading}>Giọng nói và AI OpenAI</Text>
        <Text style={st.subtitle}>
          Micro chỉ hoạt động khi bạn bấm Nói, có chỉ báo và nút Dừng; dừng khi
          rời trang hoặc chuyển nền. Trình duyệt có thể gửi âm thanh đến dịch vụ
          nhận giọng nói của họ. Nếp Nhà không lưu bản ghi âm. Sau khi bạn đồng
          ý riêng và yêu cầu AI, văn bản nhập/câu hỏi, tên danh mục, tên thành
          viên và tháng có dữ liệu được gửi tới OpenAI. Không gửi toàn bộ sổ,
          danh sách số tiền hoặc ghi chú có sẵn trong sổ. Riêng số tiền/thông
          tin bạn nói hoặc gõ trong yêu cầu mới có trong văn bản gửi đi. Yêu cầu
          API đặt store=false; việc lưu giữ phía nhà cung cấp còn phụ thuộc
          chính sách dịch vụ của họ. Bạn không cần cung cấp API key cá nhân;
          lượt dùng được ghi theo tài khoản. Có thể thu hồi đồng ý tại Cài đặt,
          vẫn nhập tay bình thường.
        </Text>
      </Card>
      <Card>
        <Text style={st.heading}>Xóa và lưu giữ</Text>
        <Text style={st.subtitle}>
          Xóa giao dịch sẽ bỏ khỏi báo cáo, nhưng lưu bản trước trong nhật ký để
          kiểm tra thay đổi. Giải tán gia đình chỉ ngừng chia sẻ, dữ liệu trở
          lại sổ cá nhân của chủ nhà. Xóa tài khoản trong Cài đặt sẽ xóa sổ cá
          nhân và đăng xuất; chủ nhà phải giải tán nhóm trước. Giao dịch đã ghi
          trong sổ của gia đình khác được giữ lại, mã tài khoản tác giả được gỡ
          và tên tài khoản trong nhật ký được ẩn danh. Tên người thu/chi và nội
          dung ghi hộ là một phần của bản ghi được chia sẻ. Bản sao lưu người
          dùng đã xuất không tự bị xóa; bản sao phục hồi hạ tầng có thể tồn tại
          theo thời hạn của nhà cung cấp.
        </Text>
      </Card>
    </Page>
  );
}
