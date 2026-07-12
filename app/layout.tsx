import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TakaPay — Social Listening",
  description:
    "What people are actually saying about TakaPay: sentiment, the issues doing the most damage, and who is switching to the competitor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f9f9f7] text-[#0b0b0b]">{children}</body>
    </html>
  );
}
