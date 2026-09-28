import type { ReactNode } from "react";

import { useAuthedCoverUrl } from "@/hooks/useAuthedCoverUrl";

interface CoverImageProps {
  alt?: string;
  className?: string;
  /** Rendered while an authenticated cover is loading, or when it has none. */
  fallback?: ReactNode;
  url: string | null | undefined;
}

/** `<img>` for a book cover that may live behind the authenticated API. */
export function CoverImage({ alt = "", className, fallback = null, url }: CoverImageProps) {
  const src = useAuthedCoverUrl(url);
  if (!src) return <>{fallback}</>;
  return <img alt={alt} aria-hidden={alt === "" ? true : undefined} className={className} src={src} />;
}
