import { NextResponse } from "next/server";
import { deleteKnowledgeDocument, getKnowledgeDocumentForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ documentId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { documentId } = await context.params;
  return deleteKnowledgeDocument(documentId, user.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Document not found" }, { status: 404 });
}

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { documentId } = await context.params; const document = getKnowledgeDocumentForUser(documentId, user.id);
  return document ? NextResponse.json({ document }) : NextResponse.json({ error: "Document not found" }, { status: 404 });
}