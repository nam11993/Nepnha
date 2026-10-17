# Voice và trợ lý thu chi

## Sử dụng
- Tổng quan → Ghi thu chi bằng giọng nói (nút đầu trang), hoặc mở từ biểu mẫu giao dịch. Chỉ cần đăng nhập Nếp Nhà.
- Có thể gõ hoặc dùng micro của bàn phím nếu trình duyệt không hỗ trợ Web Speech.
- Nói một giao dịch, ví dụ: “Hôm nay đi chợ 250 nghìn, chuyển khoản, mẹ chi”.
- Chọn Điền giao dịch → AI điền các trường → kiểm tra / sửa → Lưu giao dịch. Không lưu tự động.
- Có thể nói nhiều khoản, ví dụ “Mua nước ở Circle K 50k, cho ông bà 400k”. App hiện 2 khoản riêng (Ăn uống 50.000đ, Hiếu hỉ / biếu tặng 400.000đ), cho chỉnh / bỏ từng khoản rồi Lưu 2 giao dịch. Tối đa 8 khoản/câu, một lần tách tính một lượt AI.
- Tổng quan → Trợ lý thu chi, hoặc Báo cáo → Hỏi trợ lý bằng giọng nói.
- Hỏi tổng thu chi, chi nhiều nhất, ngân sách, hoặc so sánh với tháng trước.
- Có nút Nghe câu trả lời khi trình duyệt hỗ trợ đọc văn bản.

## Phạm vi chế độ Cơ bản
Đây là bộ phân tích câu mẫu và tính toán xác định trên thiết bị, chưa kết nối mô hình AI hội thoại. Không có API AI trả phí. Câu ngoài phạm vi phải báo chưa hiểu; không suy đoán số liệu.
Câu hỏi không nêu tháng dùng tháng đang chọn. “Tháng này” và “tháng trước” dùng lịch hiện tại; câu so sánh dùng tháng đang chọn và tháng liền trước, trừ khi câu chỉ rõ tháng cần so sánh. Chưa hỗ trợ khoảng ngày, tuần, quý, tổng cả năm hoặc đối chiếu hai tháng tùy ý.
Chênh lệch thu–chi chưa gồm số dư đầu kỳ. Tháng không có giao dịch chưa đủ để suy luận mức chi thực tế.
Số tiền chưa rõ đơn vị hoặc nhiều khoản trong một câu cần kiểm tra thủ công. Đề xuất danh mục chỉ chọn trong các danh mục đang có; không thêm hoặc đổi danh mục tự động.

## Giọng nói và dữ liệu
Web Speech Recognition chạy sau thao tác bấm, đặt ngôn ngữ vi-VN và tự dừng sau tối đa 25 giây. Dừng khi đóng cửa sổ, rời màn hình hoặc đưa app vào nền. Cần HTTPS (hoặc localhost), quyền micro và trình duyệt hỗ trợ; khả năng nhận tiếng Việt tùy thiết bị/dịch vụ trình duyệt.
Trình duyệt có thể gửi âm thanh tới dịch vụ nhận dạng của họ. Nếp Nhà không ghi âm, tải lên máy chủ riêng hoặc lưu lịch sử hội thoại. Nội dung đã điền vào trường Nội dung sẽ được lưu cùng giao dịch nếu người dùng bấm Lưu.
Trợ lý tổng hợp dữ liệu sổ hiện đang mở; không dùng service role, không thay đổi quyền dữ liệu hoặc gửi sổ tới dịch vụ AI. Khi dữ liệu đồng bộ thay đổi, câu trả lời được tính lại từ dữ liệu mới.

## Kiểm tra
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Tests kiểm tra số tiền tiếng Việt, đơn vị mơ hồ, nhiều khoản, ngày, danh mục riêng, tổng hợp theo tháng/thành viên, ngân sách, so sánh và câu hỏi ngoài phạm vi.
Kiểm tra trình duyệt thực hiện luồng qua nội dung văn bản tương đương bản chép lời; không thay thế kiểm tra thu âm trên iPhone thực tế.

## AI OpenAI
Có thêm chế độ AI OpenAI qua máy chủ Supabase. Xem AI.md về cách lưu khóa, quyền, hạn mức và các trường dữ liệu gửi tới OpenAI. Mô tả phân tích trên thiết bị ở trên chỉ áp dụng chế độ Cơ bản.
