import { SanctuaryApiClient } from "@sanctuary/core";
import { useMemo } from "react";

import { useSanctuaryAuth } from "../auth/useSanctuaryAuth";

export function useSanctuaryApi() {
  const { getToken } = useSanctuaryAuth();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

  const api = useMemo(() => {
    return new SanctuaryApiClient({
      baseUrl,
      getToken,
    });
  }, [baseUrl, getToken]);

  return api;
}
