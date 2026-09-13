import { NextResponse } from "next/server";
import { verify } from "@node-rs/argon2";
import { createSession } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string };
  const user = body.email ? findUserByEmail(body.email.trim().toLowerCase()) : undefined;
  if (!user || !body.password || !(await verify(user.password_hash, body.password))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}