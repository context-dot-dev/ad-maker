import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Branda | Context.dev",
  description: "Create on-brand ads in seconds. Powered by the Context.dev Brand API.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
