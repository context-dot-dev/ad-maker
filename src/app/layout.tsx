import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        {/* Privacy-friendly analytics by Plausible */}
        <Script
          async
          src="https://plausible.io/js/pa-U79aNuUfB8trciDeasOIw.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </head>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
