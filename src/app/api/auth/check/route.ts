import { hasPinSet, isAuthenticated } from "@/lib/auth";

export async function GET() {
  const pinSet = await hasPinSet();
  const authed = await isAuthenticated();
  return Response.json({ pinSet, authed });
}
