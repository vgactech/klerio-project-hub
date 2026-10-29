import { createFileRoute } from "@tanstack/react-router";
import { verifyUserId } from "@/lib/verify-user.server";
import { checkInternet } from "@/lib/internet.server";

export const Route = createFileRoute("/api/internet")({ server: { handlers: { GET: async ({ request }) => {
  if (!await verifyUserId(request)) return Response.json({ error: "Session expirée." }, { status: 401 });
  const { available, checkedAt } = await checkInternet(process.env["LOVABLE_API_KEY"] ?? "", process.env["FIRECRAWL_API_KEY"] ?? "", request.signal);
  return Response.json({ available, checkedAt }, { headers: { "Cache-Control": "private, no-store" } });
} } } });