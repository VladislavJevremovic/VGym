import { getDb } from "./db";
import { settings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { PIN_COOKIE, PIN_MAX_AGE } from "./auth-constants";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable is required in production");
    }
    return "dev-secret-change-in-production";
  }
  return secret;
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createAuthToken(): Promise<string> {
  const secret = getAuthSecret();
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToHex(tokenBytes.buffer as ArrayBuffer);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return `${token}:${bytesToHex(sig)}`;
}

export async function hasPinSet(): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, "pin_hash"));
  return !!row;
}

export async function setPin(pin: string): Promise<void> {
  const hash = await bcrypt.hash(pin, 10);
  const db = getDb();
  await db.insert(settings).values({ key: "pin_hash", value: hash }).onConflictDoUpdate({
    target: settings.key,
    set: { value: hash },
  });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, "pin_hash"));
  if (!row) return false;
  return bcrypt.compare(pin, row.value);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function verifyAuthCookie(value: string): Promise<boolean> {
  const [token, sig] = value.split(":");
  if (!token || !sig || sig.length !== 64) return false;
  try {
    const secret = getAuthSecret();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(sig),
      new TextEncoder().encode(token)
    );
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PIN_COOKIE)?.value;
  return value ? verifyAuthCookie(value) : false;
}

export async function setAuthCookie(pin: string): Promise<boolean> {
  const valid = await verifyPin(pin);
  if (!valid) return false;
  const cookieValue = await createAuthToken();
  const cookieStore = await cookies();
  cookieStore.set(PIN_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_MAX_AGE,
  });
  return true;
}

export { PIN_COOKIE };
