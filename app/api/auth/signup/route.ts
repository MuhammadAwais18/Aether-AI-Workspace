import { NextResponse } from "next/server";
import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";
import { createUser, findUserByEmail } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!name || !email || password.length < 8) return NextResponse.json({ error: "Enter a name, email, and password of at least 8 characters." }, { status: 400 });
    if (findUserByEmail(email)) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    const id = randomUUID();
    createUser({ id, name, email, passwordHash: await hash(password), workspaceId: randomUUID(), workspaceName: `${name}'s workspace` });
    await createSession(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "We could not create your account. Please try again." }, { status: 500 });
  }
}