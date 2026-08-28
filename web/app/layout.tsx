import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "newen.D — 소셜데이터 X Claude",
  description: "키워드와 기간으로 소셜데이터를 검색하고 Claude로 바로 가져가세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
