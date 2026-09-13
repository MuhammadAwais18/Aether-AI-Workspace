import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNote, getNoteForUser, updateNote } from "@/lib/db";

type Context = { params: Promise<{ noteId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { noteId } = await context.params;
  const note = getNoteForUser(noteId, user.id);
  return note ? NextResponse.json({ note }) : NextResponse.json({ error: "Note not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { noteId } = await context.params;
  const body = await request.json() as { title?: string; content?: string; folderId?: string };
  if (!body.title?.trim()) return NextResponse.json({ error: "A note title is required." }, { status: 400 });
  if ((body.content ?? "").length > 50000) return NextResponse.json({ error: "Notes must be 50,000 characters or fewer." }, { status: 413 });
  try { const note = updateNote(noteId, user.id, { title: body.title, content: body.content ?? "", folderId: body.folderId }); return note ? NextResponse.json({ note }) : NextResponse.json({ error: "Note not found" }, { status: 404 }); }
  catch (error) { if (error instanceof Error && error.message === "Note folder not found") return NextResponse.json({ error: "That note folder is not available." }, { status: 404 }); return NextResponse.json({ error: "Unable to save note." }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { noteId } = await context.params;
  return deleteNote(noteId, user.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Note not found" }, { status: 404 });
}