/// <reference types="vite/client" />

declare module 'epubjs' {
  export interface Locations {
    length(): number;
    cfiFromPercentage(percentage: number): string;
    generate(chars: number): Promise<string[]>;
  }

  export interface NavItem {
    href: string;
    label: string;
    id?: string;
  }

  export interface Navigation {
    toc: NavItem[];
  }

  export interface PackagingMetadataObject {
    title: string;
    creator: string;
    description?: string;
    publisher?: string;
    language?: string;
  }

  export interface Location {
    start: {
      cfi: string;
      href: string;
      percentage: number;
    };
    end: {
      cfi: string;
      href: string;
      percentage: number;
    };
  }

  export interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    destroy(): void;
    on(event: string, callback: (data: any) => void): void;
    off(event: string, callback: (data: any) => void): void;
    themes: {
      default(styles: Record<string, Record<string, string>>): void;
      register(name: string, styles: Record<string, Record<string, string>>): void;
      select(name: string): void;
    };
    location?: Location;
  }

  export interface Book {
    ready: Promise<void>;
    loaded: {
      metadata: Promise<PackagingMetadataObject>;
    };
    navigation?: Navigation;
    locations: Locations;
    coverUrl(): Promise<string | null>;
    renderTo(element: HTMLElement, options?: {
      width?: string | number;
      height?: string | number;
      flow?: string;
      manager?: string;
      spread?: string;
    }): Rendition;
    destroy(): void;
  }

  function ePub(input: ArrayBuffer | string): Book;
  export default ePub;
}
