declare module 'epubjs' {
  export interface Locations {
    cfiFromPercentage(percentage: number): string;
    generate(chars: number): Promise<string[]>;
    length(): number;
  }

  export interface NavItem {
    href: string;
    id?: string;
    label: string;
  }

  export interface Navigation {
    toc: NavItem[];
  }

  export interface PackagingMetadataObject {
    creator: string;
    description?: string;
    language?: string;
    publisher?: string;
    title: string;
  }

  export interface Location {
    end: {
      cfi: string;
      href: string;
      percentage: number;
    };
    start: {
      cfi: string;
      href: string;
      percentage: number;
    };
  }

  export interface Rendition {
    destroy(): void;
    display(target?: string): Promise<void>;
    location?: Location;
    next(): Promise<void>;
    off(event: string, callback: (data: unknown) => void): void;
    on(event: string, callback: (data: unknown) => void): void;
    prev(): Promise<void>;
    themes: {
      default(styles: Record<string, Record<string, string>>): void;
      register(name: string, styles: Record<string, Record<string, string>>): void;
      select(name: string): void;
    };
  }

  export interface Book {
    coverUrl(): Promise<string | null>;
    destroy(): void;
    loaded: {
      metadata: Promise<PackagingMetadataObject>;
    };
    locations: Locations;
    navigation?: Navigation;
    ready: Promise<void>;
    renderTo(element: HTMLElement, options?: {
      width?: string | number;
      height?: string | number;
      flow?: string;
      manager?: string;
      spread?: string;
    }): Rendition;
  }

  function ePub(input: ArrayBuffer | string): Book;
  export default ePub;
}
