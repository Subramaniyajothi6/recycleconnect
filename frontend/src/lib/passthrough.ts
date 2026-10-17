import "server-only";

import { raw } from "./backend";
import { getToken } from "./session";

/**
 * Streams a file from the API to the browser with the user's session. The API decides who may see it;
 * this only forwards the token, which never reaches the browser.
 */
export async function passthrough(apiPath: string): Promise<Response> {
  const token = await getToken();
  if (!token) return new Response("Sign in to continue.", { status: 401 });
  const res = await raw(apiPath, { token });
  if (!res.ok) return new Response(res.status === 404 ? "Not found" : "Not available", { status: res.status });
  const headers = new Headers();
  for (const h of ["content-type", "content-disposition"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(res.body, { status: 200, headers });
}
