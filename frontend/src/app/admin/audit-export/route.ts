import { passthrough } from "@/lib/passthrough";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = new URLSearchParams();
  for (const k of ["q", "role", "action", "from", "to", "format"]) {
    const v = url.searchParams.get(k);
    if (v) q.set(k, v.slice(0, 100));
  }
  return passthrough(`/api/admin/audit/export?${q}`);
}
