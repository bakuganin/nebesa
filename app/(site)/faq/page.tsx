import type { Metadata } from "next";
import { LegacyPage } from "@/components/site/legacy-page";
import { getStaticPage } from "@/content/static-pages";

export function generateMetadata(): Metadata {
  const page = getStaticPage("faq");
  return {
    title: page.title,
    description: page.description
  };
}

export default function FaqPage() {
  const page = getStaticPage("faq");
  return <LegacyPage html={page.html} />;
}

