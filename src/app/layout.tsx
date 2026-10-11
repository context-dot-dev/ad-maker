import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Branda | Context.dev",
  description: "Create on-brand ads in seconds. Powered by the Context.dev Brand API.",
  icons: { icon: "/favicon.ico" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <head>
        <Script
          async
          src="https://cdn.databuddy.cc/databuddy.js"
          data-client-id="feba15e7-014a-4798-b073-1b575360af70"
          data-track-outgoing-links="true"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
