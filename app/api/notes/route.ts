import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createNote, listNoteFoldersForUser, listNotesForUser } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  return NextResponse.json({ notes: listNotesForUser(user.id, { folderId: url.searchParams.get("folderId") ?? undefined, search: url.searchParams.get("search") ?? undefined }), folders: listNoteFoldersForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { title?: string; content?: string; folderId?: string };
  if (!body.title?.trim()) return NextResponse.json({ error: "A note title is required." }, { status: 400 });
  if ((body.content ?? "").length > 50000) return NextResponse.json({ error: "Notes must be 50,000 characters or fewer." }, { status: 413 });
  try { return NextResponse.json({ note: createNote(user.id, { title: body.title, content: body.content ?? "", folderId: body.folderId }) }, { status: 201 }); }
  catch (error) { if (error instanceof Error && error.message === "Note folder not found") return NextResponse.json({ error: "That note folder is not available." }, { status: 404 }); return NextResponse.json({ error: "Unable to create note." }, { status: 500 }); }
}