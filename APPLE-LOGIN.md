# Đăng nhập Apple — cấu hình trước khi bật

## Trạng thái hiện tại

Code đã chuẩn bị đăng nhập Apple qua Supabase OAuth trên web và qua
`expo-apple-authentication` trên iOS. Native gửi nonce SHA-256 tới Apple và nonce
gốc tới Supabase; token được Supabase xác minh. Nút native dùng giao diện hệ thống.
Nút Apple chỉ hiển thị khi `/auth/v1/settings` trả `external.apple = true`.
Hủy hộp thoại Apple không tạo phiên đăng nhập hoặc hiển thị lỗi.

**Dự án hiện chưa bật Apple provider, chưa có Apple Developer trả phí và chưa
kiểm thử đăng nhập Apple thật. Đây chưa phải bản sẵn sàng nộp App Store.**

## Cấu hình khi đã có Apple Developer

1. Trong Apple Developer → Certificates, Identifiers & Profiles, đăng ký App ID
   cho ứng dụng và bật Sign in with Apple. Chọn Bundle ID chính thức; thay
   `com.example.nepnha` trong `app.json` bằng ID đã đăng ký. Không dùng ID ví dụ
   cho bản phát hành.
2. Tạo Services ID cho web, liên kết với App ID ở trên. Cấu hình Website URLs:
   - Domain: `pcdbnvnjpvnrgzlazftw.supabase.co`
   - Return URL: `https://pcdbnvnjpvnrgzlazftw.supabase.co/auth/v1/callback`
3. Tạo key Sign in with Apple. Giữ file `.p8`, Key ID và Team ID an toàn. Sinh
   client secret JWT theo hướng dẫn Supabase; chỉ nhập secret trong cấu hình
   Apple provider của Supabase, không đưa vào code, GitHub hoặc chat.
4. Supabase → Authentication → Sign In / Providers → Apple: điền Client IDs,
   **Services ID đứng đầu**, Bundle ID native đứng sau, và secret của web OAuth.
   Giữ xác minh nonce bật; không bật tùy chọn bỏ kiểm tra nonce.
5. Auth → URL Configuration: cho phép địa chỉ quay lại
   `https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings`.
   Bật Allow manual linking để liên kết Apple vào tài khoản hiện có.
6. Hoàn tất mục xóa tài khoản bên dưới trước khi bật Apple cho người dùng thật.
   Sau đó bật provider, tải lại trang Cài đặt; nút Apple tự xuất hiện.
7. Build mới bằng EAS để áp dụng `usesAppleSignIn`, entitlement và config plugin;
   kiểm thử trên iPhone thật/TestFlight. Web trên iPhone vẫn dùng luồng OAuth web.

Apple web OAuth client secret hết hạn tối đa 6 tháng; cần thay trước ngày hết hạn.
Chỉ lưu khóa ký và secret ở hệ thống bí mật phía máy chủ. Không tạo secret mới
trong trình duyệt ứng dụng. Native-only không cần secret OAuth này.

## Giữ nguyên tài khoản, sổ và gia đình

Người đã có tài khoản phải đăng nhập cách cũ, vào Tài khoản → Phương thức đăng
nhập → Tiếp tục với Apple để **liên kết**. Luồng này gọi `linkIdentity`, không
đăng xuất và tạo tài khoản thay thế. Apple có thể cấp email relay khi chọn ẩn
email, nên không dựa vào việc email trùng nhau để giữ sổ cũ.

Tài khoản Apple mới vẫn phải đặt tên hiển thị trong Nếp Nhà. Không tự dùng tên
Apple làm tên thành viên; quyền giao dịch tiếp tục dựa trên user ID máy chủ.

## Những việc còn phải hoàn thành trước App Store

- Khi xóa tài khoản có Apple identity, cần triển khai thu hồi token Apple ở máy
  chủ theo hướng dẫn Apple, rồi mới xóa tài khoản Supabase. `delete_my_account`
  hiện xóa phiên và tài khoản Supabase, **chưa thu hồi token tại Apple**. Cần
  thiết kế trao đổi authorization code/lưu token nhà cung cấp an toàn hoặc tái
  xác thực để thu hồi; không chỉ gọi signOut và coi là đã thu hồi.
- Kiểm thử đăng nhập mới, tên bắt buộc, ẩn email, liên kết giữ nguyên user ID/sổ,
  hủy đăng nhập, mất mạng, đăng nhập lại và xóa tài khoản/thu hồi token.
- Hoàn thiện Google native, quyền riêng tư, thông tin hỗ trợ, ảnh chụp và ký số.
  Tích hợp Apple không tự bảo đảm Apple duyệt ứng dụng.

## Tài liệu

- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/
- https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion
