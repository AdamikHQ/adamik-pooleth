// Adamik API Service
// ------------------
// This module centralizes all Adamik API logic for blockchain data, transaction encoding, etc.

/**
 * Proxy Adamik API requests through the Next.js API route.
 * Used for blockchain queries, transaction encoding, etc.
 */
export async function makeProxyRequest(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: any
): Promise<any> {
  const proxyRequest = await fetch("/api/adamik", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      body,
      method,
    }),
  });
  return await proxyRequest.json();
}
