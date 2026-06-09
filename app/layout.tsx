import type { Metadata } from "next";
import "./globals.css";
import "@/styles/legacy/normalize.css";
import "@/styles/legacy/webflow-base.css";
import "@/styles/legacy/nebesa-style.css";

export const metadata: Metadata = {
  title: "NEBESA",
  description: "Ритуальные услуги NEBESA в Нарве"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

