import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFileForUser, updateFileDeleted } from "@/lib/db";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";
type Context = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileId } = await context.params;
  const file = getFileForUser(fileId, user.id);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if (new URL(request.url).searchParams.get("content") !== "true") return NextResponse.json({ file });
  try {
    const content = await readUpload(file.storage_key);
    return new Response(content, { headers: { "Content-Type": file.mime_type, "Content-Disposition": `inline; filename="${file.original_name.replace(/"/g, "")}"`, "Cache-Control": "private, max-age=60" } });
  } catch { return NextResponse.json({ error: "Stored file is unavailable." }, { status: 410 }); }
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileId } = await context.params;
  const body = await request.json() as { action?: "restore" | "trash" };
  if (body.action !== "restore" && body.action !== "trash") return NextResponse.json({ error: "A valid file action is required." }, { status: 400 });
  const file = updateFileDeleted(fileId, user.id, body.action === "trash");
  return file ? NextResponse.json({ file }) : NextResponse.json({ error: "File not found" }, { status: 404 });
}