export const buildAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

export const encodeId = (id: string): string => encodeURIComponent(id);
