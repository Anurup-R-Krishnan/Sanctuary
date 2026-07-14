export async function calculateEpubHash(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  // Normalize to Uint8Array to bypass JSDOM/Node cross-realm ArrayBuffer issues during Vitest runs
  const data = (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer)) as BufferSource;
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
