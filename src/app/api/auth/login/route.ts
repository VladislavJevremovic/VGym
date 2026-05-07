import { setAuthCookie } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const key = `pin:${ip}`;

  const { allowed, retryAfterMs } = checkRateLimit(key);
  if (!allowed) {
    const minutes = Math.ceil((retryAfterMs ?? 0) / 60000);
    return Response.json(
      { error: `Too many attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const { pin } = await request.json();
  if (!pin) {
    return Response.json({ error: "PIN required" }, { status: 400 });
  }

  const ok = await setAuthCookie(pin);
  if (!ok) {
    recordFailedAttempt(key);
    return Response.json({ error: "Invalid PIN" }, { status: 401 });
  }

  clearAttempts(key);
  return Response.json({ success: true });
}
