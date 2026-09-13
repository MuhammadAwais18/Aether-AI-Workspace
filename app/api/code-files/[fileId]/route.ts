import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteCodeFile, getCodeFileForUser, updateCodeFile } from "@/lib/db";

type Context = { params: Promise<{ fileId: string }> };
const languages = new Set(["typescript", "javascript", "python", "json", "css", "html", "markdown", "sql"]);

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileId } = await context.params; const file = getCodeFileForUser(fileId, user.id);
  return file ? NextResponse.json({ file }) : NextResponse.json({ error: "Code file not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileId } = await context.params; const body = await request.json() as { name?: string; language?: string; content?: string };
  if (!body.name?.trim() || !body.language || !languages.has(body.language)) return NextResponse.json({ error: "A valid file name and language are required." }, { status: 400 });
  if ((body.content ?? "").length > 200000) return NextResponse.json({ error: "Code files must be 200,000 characters or fewer." }, { status: 413 });
  try { const file = updateCodeFile(fileId, user.id, { name: body.name, language: body.language, content: body.content ?? "" }); return file ? NextResponse.json({ file }) : NextResponse.json({ error: "Code file not found" }, { status: 404 }); }
  catch (error) { if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "A code file with that name already exists." }, { status: 409 }); return NextResponse.json({ error: "Unable to save code file." }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileId } = await context.params;
  return deleteCodeFile(fileId, user.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Code file not found" }, { status: 404 });
}