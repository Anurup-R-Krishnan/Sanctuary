export interface OpdsFeed {
  entries: OpdsEntry[];
  icon?: string;
  id?: string;
  navigationLinks: OpdsLink[];
  searchLink?: string;
  title: string;
  updated?: string;
}

export interface OpdsLink {
  href: string;
  rel: string;
  title?: string;
  type?: string;
}

export interface OpdsEntry {
  acquisitionUrl?: string;
  author?: string;
  coverUrl?: string;
  format?: string;
  id: string;
  published?: string;
  summary?: string;
  thumbnailUrl?: string;
  title: string;
}

export interface CatalogSource {
  authType?: "basic" | "bearer" | "none";
  bearerToken?: string;
  id: string;
  isDefault?: boolean;
  name: string;
  password?: string;
  url: string;
  username?: string;
}
