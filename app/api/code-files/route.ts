import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCodeFile, listCodeFilesForUser } from "@/lib/db";

const languages = new Set(["typescript", "javascript", "python", "json", "css", "html", "markdown", "sql"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ files: listCodeFilesForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; language?: string; content?: string };
  if (!body.name?.trim() || body.name.trim().length > 120) return NextResponse.json({ error: "A file name of up to 120 characters is required." }, { status: 400 });
  if (!body.language || !languages.has(body.language)) return NextResponse.json({ error: "Choose a supported language." }, { status: 400 });
  try { return NextResponse.json({ file: createCodeFile(user.id, { name: body.name, language: body.language, content: body.content ?? "" }) }, { status: 201 }); }
  catch (error) { if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "A code file with that name already exists." }, { status: 409 }); return NextResponse.json({ error: "Unable to create code file." }, { status: 500 }); }
}