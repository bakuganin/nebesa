import type { Metadata } from "next";
import { SmoothScrollProvider } from "@/components/site/smooth-scroll-provider";
import "./globals.css";
import "@/styles/legacy/normalize.css";
import "@/styles/legacy/webflow-base.css";
import "@/styles/legacy/nebesa-style.css";
import "./overrides.css";

export const metadata: Metadata = {
  title: "NEBESA",
  description: "Ритуальные услуги NEBESA в Нарве"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Legacy Webflow CSS references these exact Google font family names. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:300,300italic,400,400italic,600,600italic,700,700italic,800,800italic%7CMontserrat:100,100italic,200,200italic,300,300italic,400,400italic,500,500italic,600,600italic,700,700italic,800,800italic,900,900italic%7CChanga+One:400,400italic%7COswald:200,300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
