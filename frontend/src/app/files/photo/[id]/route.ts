import { passthrough } from "@/lib/passthrough";

export async function GET(_req: Request, ctx: RouteContext<"/files/photo/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  return passthrough(`/api/files/photos/${id}`);
}
