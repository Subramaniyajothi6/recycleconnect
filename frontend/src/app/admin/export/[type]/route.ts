import { passthrough } from "@/lib/passthrough";

const TYPES = ["COLLECTION_VOLUME", "WASTE_CATEGORIES", "CUSTOMER_ACTIVITY", "COLLECTOR_ACTIVITY", "PICKUP_COMPLETION",
  "FAILED_PICKUPS", "LOCATION_WISE"];

/** /admin/export/LOCATION_WISE?format=xlsx&from=…&to=… → the report file. */
export async function GET(req: Request, ctx: RouteContext<"/admin/export/[type]">) {
  const { type } = await ctx.params;
  if (!TYPES.includes(type)) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const q = new URLSearchParams();
  for (const k of ["format", "from", "to", "zoneId", "categoryId"]) {
    const v = url.searchParams.get(k);
    if (v && /^[\w-]+$/.test(v)) q.set(k, v);
  }
  return passthrough(`/api/admin/reports/${type}/export?${q}`);
}
