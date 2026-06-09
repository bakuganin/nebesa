import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/site/legacy-page";
import { getStaticPage, isServicePageSlug, servicePageSlugs } from "@/content/static-pages";

type PageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return servicePageSlugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  if (!isServicePageSlug(params.slug)) return {};
  const page = getStaticPage(params.slug);
  return {
    title: page.title,
    description: page.description
  };
}

export default function ServicePage({ params }: PageProps) {
  if (!isServicePageSlug(params.slug)) notFound();
  const page = getStaticPage(params.slug);
  return <LegacyPage html={page.html} />;
}

