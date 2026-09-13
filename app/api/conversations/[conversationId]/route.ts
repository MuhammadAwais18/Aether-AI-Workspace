import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteConversation, getConversationForUser, updateConversationTitle } from "@/lib/db";

type Context = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await context.params;
  const result = getConversationForUser(conversationId, user.id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await context.params;
  const body = await request.json() as { title?: string };
  if (!body.title?.trim()) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  return updateConversationTitle(conversationId, user.id, body.title) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await context.params;
  return deleteConversation(conversationId, user.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}