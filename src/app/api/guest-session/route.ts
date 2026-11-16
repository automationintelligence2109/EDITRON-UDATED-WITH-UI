import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/auth-mode";
import {
  createGuestToken,
  GUEST_SESSION_COOKIE,
  verifyGuestToken,
} from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST() {
  if (AUTH_ENABLED) {
    return NextResponse.json({ error: "Guest mode is disabled." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const currentId = verifyGuestToken(cookieStore.get(GUEST_SESSION_COOKIE)?.value);
  const guestId = currentId || randomUUID();

  const response = NextResponse.json({ ready: true });
  response.cookies.set({
    name: GUEST_SESSION_COOKIE,
    value: createGuestToken(guestId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
