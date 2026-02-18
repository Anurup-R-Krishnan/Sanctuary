import { SanctuaryApiClient } from "@sanctuary/core";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8788";

export const api = new SanctuaryApiClient({
  baseUrl: API_BASE,
  getToken: async () => null
});
