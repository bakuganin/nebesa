import Link from "next/link";

type PaginationProps = {
  page: number;
  pageCount: number;
  basePath: string;
  query?: Record<string, string | undefined>;
};

function hrefFor(basePath: string, page: number, query: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, pageCount, basePath, query }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Навигация по страницам">
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((entry) => (
        <Link
          key={entry}
          href={hrefFor(basePath, entry, query)}
          className={`inline-flex h-10 min-w-10 items-center justify-center rounded border px-3 text-sm ${
            entry === page
              ? "border-ink bg-ink text-white"
              : "border-black/10 bg-white text-ink hover:border-moss"
          }`}
        >
          {entry}
        </Link>
      ))}
    </nav>
  );
}
