import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";
export async function PATCH(request: Request) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json() as { name?: string }; if (!body.name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 }); return NextResponse.json({ user: updateUserProfile(user.id, body.name) }); }