import { LegacyInteractions } from "./legacy-interactions";

export function LegacyPage({ html }: { html: string }) {
  return (
    <>
      <main className="legacy-page" dangerouslySetInnerHTML={{ __html: html }} />
      <LegacyInteractions />
    </>
  );
}

