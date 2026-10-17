# Kết nối OpenAI cho Nếp Nhà

## Thiết lập
1. Tạo OpenAI API key trong dự án API của bạn và thiết lập credit tại OpenAI Platform.
2. Supabase project pcdbnvnjpvnrgzlazftw → Edge Functions → Secrets: lưu OPENAI_API_KEY. Không đặt khóa vào mã web, EXPO_PUBLIC_*, chat hoặc kho Git.
3. Chạy supabase/ai-access.sql rồi supabase/ai-user-access.sql. Bản sau thay quyền theo gia đình bằng quyền tự động cho mọi tài khoản đăng nhập.
4. Triển khai Edge Function nep-nha-ai với các file entrypoint, handler và module src/ai-contract.ts, src/domain.ts, src/assistant-domain.ts. Hàm tự xác thực mọi token qua Supabase Auth, nên verify_jwt của gateway là false.
5. Người dùng chỉ đăng nhập Nếp Nhà, không phải cung cấp API key. Tổng quan → Ghi thu chi bằng giọng nói → Điền giao dịch → kiểm tra → Lưu giao dịch. Hỏi số liệu vẫn cần mở sổ gia đình để máy chủ đọc đúng dữ liệu.

## Thiết kế
Model: gpt-6-luna. Mỗi thao tác dùng một Responses API request, store:false, tối đa 4000 output tokens khi tách nhiều giao dịch (1800 với hỏi đáp/luồng cũ), không tự retry. OpenAI tính phí theo sử dụng, độc lập với gói ChatGPT.
- Ghi giao dịch: AI nhận nội dung người dùng cùng danh mục/thành viên, trả đề xuất có cấu trúc. Máy chủ kiểm tra kiểu dữ liệu, giới hạn tiền, ngày, danh mục và thanh toán. Người dùng kiểm tra rồi tự bấm Lưu.
- extract_batch trả tối đa 8 giao dịch theo thứ tự, gồm source và amountText nguyên văn. Máy chủ kiểm tra đoạn gốc không bị bịa/trùng, đối chiếu biểu thức tiền bằng bộ phân tích xác định; tiền không khớp bị bỏ trống kèm cảnh báo. Không coi tổng cộng là giao dịch; không chia số tiền mơ hồ. Danh mục theo hoạt động (mua nước uống khác tiền nước sinh hoạt); người nhận tiền khác thành viên thực hiện.
- Nhiều khoản mở danh sách xem lại: chỉnh mọi trường, chọn lịch, bỏ khoản, Lưu N giao dịch. Toàn bộ danh sách được validate rồi gọi save một lần với revision hiện tại; không ghi một phần. Một câu nhiều khoản vẫn chỉ tính một lượt AI. Trong màn sửa giao dịch cũ chỉ nhận một khoản, không vô tình tạo thêm khoản.
- Hỏi thu chi: AI chỉ lập kế hoạch lọc ngày, loại giao dịch, danh mục và thành viên. Không gửi danh sách giao dịch, ghi chú hay số tiền trong sổ cho AI. Sau đó máy chủ tính số liệu chính xác từ sổ của người gọi, không dùng số tiền do mô hình tự viết. Hỗ trợ tổng hợp, top danh mục, ngân sách và so sánh khoảng thời gian.
- Câu hỏi ngoài phạm vi phải yêu cầu làm rõ. Đây không phải chatbot đa mục đích; câu trả lời được định dạng từ kết quả tính toán.

## Quyền và hạn mức
- Không dùng service role hoặc API key OpenAI trong client.
- Mọi tài khoản Supabase đã đăng nhập được dùng AI, không cần allowlist. Máy chủ vẫn xác thực mỗi yêu cầu; không được đọc sổ của tài khoản khác.
- Mặc định 20 lượt thử/ngày/tài khoản, đặt lại theo Asia/Ho_Chi_Minh. Tối thiểu 2 giây giữa các lượt. Lượt lỗi upstream vẫn tính vào hạn mức để chặn retry liên tục.
- nepnha_ai.user_limits cho phép quản trị đặt daily_limit/enabled theo user_id sau này; chưa có giao diện cấu hình. User không có dòng riêng nhận mặc định 20. Bảng access/usage cũ chỉ giữ lịch sử, không dùng cấp quyền nữa.
- Tài khoản chưa có gia đình vẫn ghi giọng nói được, máy chủ dùng danh mục mặc định. Với sổ gia đình, dùng danh mục hiện có trên máy chủ. Không tự tạo sổ hoặc di chuyển dữ liệu cục bộ.
- Quota được cập nhật nguyên tử trong database; không dựa vào RAM của Edge Function.
- Các bảng nepnha_ai.* không được cấp quyền cho anon/authenticated. Các wrapper SECURITY DEFINER công khai chỉ có EXECUTE cho authenticated và xác thực auth.uid(); helper ở schema riêng, search_path rỗng, không nhận user_id hay household_id từ client.
- Cảnh báo advisor về authenticated SECURITY DEFINER là chủ đích của hai RPC quyền/hạn mức; tests kiểm tra user không đọc/sửa bảng riêng hoặc dùng quyền của gia đình khác. RLS không policy trên các bảng này chủ đích chặn đọc trực tiếp. Xem https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Kiểm tra
npm run typecheck; npm run lint; npm test; npm run build.
Tests kiểm tra xác thực, quyền, quota, không lộ khóa, không gửi giao dịch/ghi chú lên model, lỗi billing, JSON thiếu/sai, tính tiền và phạm vi ngày/thành viên.
Kiểm tra production khi có phiên đăng nhập sổ gia đình: một câu hỏi tổng chi và một câu nhập giao dịch thử. Không bấm Lưu giao dịch thử nếu không muốn ghi dữ liệu vào sổ thật.
