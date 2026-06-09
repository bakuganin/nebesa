export function LightboxImage({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} className="w-inline-block w-lightbox">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
    </a>
  );
}
