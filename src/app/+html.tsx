import React, { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";
export default function HTML({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F5F7FC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Nếp Nhà" />
        <meta
          name="description"
          content="Quản lý thu nhập, chi tiêu, ngân sách và báo cáo gia đình trên điện thoại."
        />
        <title>Nếp Nhà — Thu chi gia đình</title>
        <ScrollViewStyleReset />
        <style>{`
  input[data-testid="amount-input"] {
    outline: none !important;
    -webkit-appearance: none;
    appearance: none;
    box-shadow: none;
  }
`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
