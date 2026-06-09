import type { Metadata } from "next";
import { LegacyPage } from "@/components/site/legacy-page";
import { getStaticPage } from "@/content/static-pages";

export function generateMetadata(): Metadata {
  const page = getStaticPage("home");
  return {
    title: page.title,
    description: page.description
  };
}

export default function HomePage() {
  const page = getStaticPage("home");
  return <LegacyPage html={page.html} />;
}

