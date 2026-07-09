import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Branda — Context.dev",
  description: "Create on-brand ads in seconds. Powered by the Context.dev Brand API.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
