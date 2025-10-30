export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum View {
  LIBRARY = 'library',
  READER = 'reader',
  SETTINGS = 'settings',
}

export interface Book {
  id: string; // Using UUID
  title: string;
  author: string;
  coverUrl: string; // This will be a Blob URL
  epubBlob: Blob;
  progress: number; // Percentage 0-100
  lastLocation: string; // ePub CFI string for last read location
}
