import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createConversation, listConversations } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ conversations: listConversations(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { title?: string };
  return NextResponse.json({ conversation: createConversation(user.id, body.title?.trim() || "New conversation") }, { status: 201 });
}