import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findUserById, type User } from "@/lib/db";

const cookieName = "aether_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "development-only-aether-secret-change-me");

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function destroySession() {
  (await cookies()).delete(cookieName);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "string" ? findUserById(payload.userId) ?? null : null;
  } catch {
    return null;
  }
}