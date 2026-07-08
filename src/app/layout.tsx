import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ad Maker — Context.dev",
  description: "Create on-brand ads in seconds. Powered by the Context.dev Brand API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
