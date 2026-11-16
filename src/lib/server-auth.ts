import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUTH_ENABLED } from "@/lib/auth-mode";

export const GUEST_SESSION_COOKIE = "editron_guest_session";

function guestSessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "editron-local-guest-session-only";
  throw new Error("NEXTAUTH_SECRET must be configured for guest sessions.");
}

function signGuestId(id: string): string {
  return createHmac("sha256", guestSessionSecret()).update(id).digest("hex");
}

export function verifyGuestToken(token: string | undefined): string | null {
  if (!token) return null;
  const [id, signature, extra] = token.split(".");
  if (!id || !signature || extra || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const expected = Buffer.from(signGuestId(id), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return id;
}

export function createGuestToken(id: string): string {
  return `${id}.${signGuestId(id)}`;
}

export async function ensureGuestUser(userId: string): Promise<void> {
  const guestId = userId.startsWith("guest_") ? userId.slice("guest_".length) : "";
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) {
    throw new Error("Invalid guest workspace identity.");
  }

  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `guest-${guestId}@guest.editron.invalid`,
      name: "Guest workspace",
    },
  });
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  if (AUTH_ENABLED) {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  }

  const cookieStore = await cookies();
  const guestId = verifyGuestToken(cookieStore.get(GUEST_SESSION_COOKIE)?.value);
  return guestId ? `guest_${guestId}` : null;
}
