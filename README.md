# Nếp Nhà — quản lý thu chi trên iPhone

Ứng dụng React Native / Expo bằng tiếng Việt. Bản web đã kết nối Supabase `pcdbnvnjpvnrgzlazftw` để lưu sổ chung. Website công khai tại https://nep-nha-thu-chi.lunargem512.chatgpt.site; dữ liệu chung yêu cầu đăng nhập. Không tự nhập dữ liệu từ file Excel.

## Chức năng

- Thêm, sửa, xóa thu chi; phân loại nguồn thu và khoản chi; ghi ngày, thành viên, cách thanh toán và nội dung.
- Tổng quan theo tháng; lọc/tìm giao dịch; biểu đồ tròn thu nhập và chi tiêu.
- Biểu đồ so sánh thu–chi 12 tháng và bảng chi tiết theo năm.
- Ngân sách theo từng tháng; phân biệt chưa đặt hạn mức với hạn mức 0.
- Thêm và đổi tên danh mục thu / chi ở Cài đặt hoặc màn hình nhập giao dịch. Đổi tên cập nhật giao dịch và ngân sách, giữ nguyên số tiền. Danh mục đồng bộ cùng sổ chung và nằm trong bản sao lưu.
- Chạm tiêu đề tháng để chọn tháng / năm bằng lịch; chọn ngày giao dịch bằng lịch ngày. Biểu đồ năm tự cuộn tới tháng có dữ liệu, ưu tiên tháng hiện tại.
- Xuất/khôi phục JSON; xác nhận trước khi thay thế dữ liệu. Giao dịch mới chỉ được hiển thị là đã lưu sau khi ghi bộ nhớ thành công.
- Đăng nhập bằng liên kết email, tạo sổ chung, tham gia bằng mã mời, đổi mã mời và xóa tài khoản. Thành viên có toàn quyền sửa sổ chung. Mỗi tài khoản tham gia một nhóm.
- Làm mới dữ liệu chung mỗi 15 giây khi app đang mở và khi quay lại app. Lưu cần Internet; chưa hỗ trợ hàng đợi sửa offline. Khi có cập nhật đồng thời, yêu cầu tải lại thay vì âm thầm ghi đè.
- Ghi thu chi bằng giọng nói và AI OpenAI: tách tối đa 8 giao dịch trong một câu, đối chiếu số tiền với lời nói, chỉnh sửa / bỏ từng khoản rồi lưu cả danh sách một lần. Người dùng chỉ cần đăng nhập Nếp Nhà. Hạn mức mặc định 20 lượt/ngày/tài khoản, cấu hình riêng được lưu ở máy chủ.
- Trợ lý hỏi đáp thu chi: AI hiểu câu hỏi, máy chủ tính tiền từ sổ của người gọi. Có chế độ Cơ bản không gọi API. Xem [AI.md](AI.md) và [VOICE.md](VOICE.md).
- Báo cáo có trục tiền cố định khi vuốt ngang, chọn năm và chỉ liệt kê các tháng có dữ liệu.

## Thiết lập AI trên máy chủ

Sau khi thiết lập Supabase theo hướng dẫn bên dưới:

1. Chạy lần lượt `supabase/ai-access.sql` và `supabase/ai-user-access.sql`.
2. Đặt `OPENAI_API_KEY` trong Supabase Edge Function Secrets; không nhập khóa vào mã nguồn hoặc biến `EXPO_PUBLIC_*`.
3. Triển khai Edge Function `nep-nha-ai` từ `supabase/functions/nep-nha-ai/index.ts`, kèm các module được import trong thư mục `src`. Xem [AI.md](AI.md) về xác thực token và hạn mức.
4. Khi dùng tên miền riêng, cập nhật origin cho phép trong `supabase/functions/nep-nha-ai/handler.ts`, URL chuyển hướng đăng nhập Supabase và cấu hình `src/cloud-config.ts` / `.env`.

Khóa publishable Supabase trong mã là khóa công khai của ứng dụng, không phải khóa quản trị. Khóa OpenAI thật không nằm trong repository. Chi phí gọi AI do tài khoản API đã cấu hình trên máy chủ chịu.

Đây là bản mã nguồn tương ứng website đã triển khai, gồm React Native / Expo, backend Supabase, tài liệu và kiểm thử. Dữ liệu thu chi, tài khoản đăng nhập và secrets trên Supabase không được xuất vào GitHub.

## Dùng tài khoản chung trên web

1. Mở Cài đặt, nhập cùng email chủ dự án Supabase trên mỗi thiết bị và chọn Gửi liên kết đăng nhập.
2. Mở liên kết email trong trình duyệt muốn dùng. Dịch vụ email mặc định chỉ gửi tới email thành viên tổ chức Supabase và có giới hạn tần suất. Muốn dùng email bên ngoài tổ chức cần SMTP riêng.
3. Chọn Tạo sổ dùng chung một lần. Những thiết bị đăng nhập cùng email tự mở cùng sổ; làm mới mỗi 15 giây khi đang mở web.
4. Sổ riêng trên mỗi thiết bị vẫn được giữ. Xuất sổ riêng trước khi đăng nhập, rồi khôi phục vào sổ chung nếu muốn chuyển dữ liệu.

URL quay về sau đăng nhập: `https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings`. Khóa trong `src/cloud-config.ts` là publishable key công khai, không phải khóa quản trị.

## Thiết lập một dự án khác

1. Tạo dự án Supabase riêng và chạy lần lượt `supabase/schema.sql`, `supabase/custom-categories.sql` trong SQL Editor. Các tệp tạo bảng, bật RLS, chặn truy cập bảng trực tiếp và cấp quyền cho RPC đã xác thực. Danh mục cũ được nhận tự động khi đọc; chưa thay đổi dữ liệu sổ đã lưu.
2. Bật đăng nhập Email, cấu hình Site URL và Redirect URL về trang `/settings` của website. Dùng liên kết email mặc định; cấu hình SMTP riêng nếu cần gửi cho email ngoài tổ chức.
3. Sao chép `.env.example` thành `.env`, điền URL và publishable key của dự án. Không dùng service_role/secret key trong app.
4. Đặt hai biến tương tự trong môi trường EAS trước khi build; các biến EXPO_PUBLIC là công khai trong app. Phân quyền máy chủ phải giữ nguyên.
5. Chạy lại app. Vào Cài đặt, đăng nhập, tạo gia đình. Người thứ hai đăng nhập bằng email riêng và nhập mã mời.
6. Nhóm bắt đầu với sổ chung rỗng; sổ riêng được giữ riêng tại thiết bị. Có thể xuất sổ riêng rồi khôi phục vào sổ chung sau khi xác nhận thay thế.

Schema đã được triển khai. Kiểm thử trực tiếp trên máy chủ xác nhận lưu và đọc lại, cách ly tài khoản, từ chối ghi đè phiên bản cũ và chặn truy cập chưa đăng nhập; dữ liệu kiểm thử được rollback. Cần kiểm thử liên kết đăng nhập thật và đồng bộ trên hai iPhone trước phát hành App Store. Xóa tài khoản chủ nhóm sẽ xóa cả sổ gia đình; giao diện yêu cầu xác nhận. Hệ thống hiện chưa có phân quyền chỉ xem hoặc chức năng loại thành viên khỏi nhóm.

Advisors báo các RPC SECURITY DEFINER cho authenticated và RLS không có policy: đây là mô hình chủ đích. Truy cập bảng trực tiếp bị thu hồi; chỉ RPC có kiểm tra auth.uid và tư cách thành viên được phép truy cập sổ. Không cấp EXECUTE cho anon/PUBLIC.

## Chạy thử

Yêu cầu Node.js 22.13 trở lên. Tại thư mục này:

```sh
npm ci
npm start
```

Quét mã QR bằng iPhone với Expo Go tương thích SDK 57. Nếu Expo Go không tương thích hoặc không có module yêu cầu, dùng development build qua EAS. iOS tối thiểu của SDK này là 16.4.

```sh
npm run web
npm run typecheck
npm run lint
npm test
npm run build
```

Bản web và thiết bị dùng cùng tài khoản, cùng dự án Supabase sẽ mở cùng sổ chung. Sổ riêng tại thiết bị được lưu độc lập.

## Tạo bản iOS và đưa lên App Store

1. Chốt tên hiển thị, biểu tượng và mã định danh ứng dụng. Mã `com.example.nepnha` trong app.json chỉ là giá trị tạm; thay bằng mã duy nhất của bạn.
2. Đăng ký tài khoản Expo và Apple Developer. Không lưu mật khẩu, chứng chỉ hay API key vào mã nguồn.
3. Chạy `npx eas-cli@latest login`, sau đó `npx eas-cli@latest build:configure`. Công cụ gắn dự án vào tài khoản Expo của bạn.
4. Chạy `npx eas-cli@latest build --platform ios --profile production`. EAS tạo bản iOS trên máy Mac đám mây, không cần máy Mac tại nhà.
5. Tạo hồ sơ ứng dụng trong App Store Connect với đúng Bundle ID. Chạy `npx eas-cli@latest submit --platform ios --latest` để tải bản build lên.
6. Kiểm thử qua TestFlight trên iPhone thật, đặc biệt lưu dữ liệu sau khi tắt/mở app, bàn phím, sao lưu/khôi phục và biểu đồ.
7. Chuẩn bị ảnh chụp iPhone thật, mô tả, URL hỗ trợ, URL chính sách riêng tư, thông tin độ tuổi và khai báo quyền riêng tư phù hợp bản phát hành cuối cùng. Gửi Apple xét duyệt từ App Store Connect.

`eas submit` chỉ tải bản build lên, không đồng nghĩa đã được duyệt hay phát hành. Các bước đăng ký Apple Developer, ký bản build và gửi App Store cần tài khoản của chủ ứng dụng; chúng chưa được thực hiện. Tính năng AI gọi API có phí khi máy chủ đã được cấu hình.

## Trạng thái kiểm thử

Kiểm tra TypeScript, lint, kiểm thử logic và xuất bundle được thực hiện trên Windows. Bài kiểm thử PostgreSQL chạy bằng PGlite, giả lập danh tính Supabase để kiểm tra cách ly nhóm, quyền RPC, xung đột phiên bản và xóa tài khoản; chưa thay thế cho kiểm thử dịch vụ Supabase thật. Chưa xác nhận chạy native trên iPhone, chưa tạo IPA ký số, chưa có bản TestFlight và chưa gửi App Store.

`npm audit` hiện báo các cảnh báo từ cây phụ thuộc Expo/Metro (braces, node-forge, uuid và decode-uri-component). Cần xem lại bản vá tương thích trước khi phát hành; không dùng `npm audit fix --force` vì đề xuất có thể hạ SDK về phiên bản cũ không tương thích. Bản này là bản phát triển, chưa phải bản sẵn sàng nộp App Store.

## Tài liệu chính thức

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/submit/ios/
- https://developer.apple.com/help/account/membership/program-enrollment/
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
