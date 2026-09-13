import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { createFile, listFilesForUser, listFoldersForUser } from "@/lib/db";
import { removeUpload, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";
const maximumSize = 10 * 1024 * 1024;
const allowedTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/json", "application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  return NextResponse.json({ files: listFilesForUser(user.id, { folderId: url.searchParams.get("folderId") ?? undefined, trash: url.searchParams.get("trash") === "true" }), folders: listFoldersForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > maximumSize) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "This file type is not supported yet." }, { status: 415 });
  const originalName = path.basename(file.name).trim().slice(0, 180);
  if (!originalName) return NextResponse.json({ error: "The file needs a name." }, { status: 400 });
  const storageKey = `${randomUUID()}${path.extname(originalName).toLowerCase()}`;
  await saveUpload(storageKey, await file.arrayBuffer());
  try {
    const stored = createFile(user.id, { folderId: typeof form.get("folderId") === "string" ? form.get("folderId") as string : undefined, originalName, storageKey, mimeType: file.type, sizeBytes: file.size });
    return NextResponse.json({ file: stored }, { status: 201 });
  } catch (error) {
    await removeUpload(storageKey);
    if (error instanceof Error && error.message === "Folder not found") return NextResponse.json({ error: "That folder is not available." }, { status: 404 });
    return NextResponse.json({ error: "The file could not be saved." }, { status: 500 });
  }
}