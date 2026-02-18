export const tokens = {
  color: {
    bg: "#F5F1EA",
    surface: "#FFFDF8",
    text: "#1E1A16",
    muted: "#6B6257",
    accent: "#B37A4C",
    accentStrong: "#8E5A35",
    border: "#E5DCCF",
    darkBg: "#141210",
    darkSurface: "#1D1A17",
    darkText: "#F4EEE6",
    darkMuted: "#B5A998"
  },
  radius: { sm: 10, md: 16, lg: 24, xl: 32 },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
  type: {
    hero: 34,
    title: 24,
    body: 16,
    meta: 13
  }
};

export type Tokens = typeof tokens;
