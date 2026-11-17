import { NextResponse } from "next/server";

export function projectStorageConfigurationError(): NextResponse | null {
  if (process.env.DATABASE_URL) return null;
  return NextResponse.json(
    { error: "Project saving is unavailable: DATABASE_URL is not configured. Configure PostgreSQL and restart the server." },
    { status: 503 },
  );
}
