import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { createFile, createKnowledgeDocument, getFileForUser, listKnowledgeDocumentsForUser } from "@/lib/db";
import { extractDocumentText, normalizeDocumentText, chunkDocumentText, supportedKnowledgeTypes } from "@/lib/knowledge";
import { readUpload, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";
const maxDocumentSize = 10 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ documents: listKnowledgeDocumentsForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = request.headers.get("content-type") ?? "";
  let sourceFileId: string | undefined;
  let title = "";
  let mimeType = "";
  let data: Buffer;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData(); const upload = form.get("file");
    if (!(upload instanceof File)) return NextResponse.json({ error: "Choose a document to index." }, { status: 400 });
    title = path.basename(upload.name).trim().slice(0, 180); mimeType = upload.type; data = Buffer.from(await upload.arrayBuffer());
    if (data.length > maxDocumentSize) return NextResponse.json({ error: "Documents must be 10 MB or smaller." }, { status: 413 });
    if (!supportedKnowledgeTypes.has(mimeType)) return NextResponse.json({ error: "Supported types are TXT, Markdown, CSV, JSON, and PDF." }, { status: 415 });
    const storageKey = `${randomUUID()}${path.extname(title).toLowerCase()}`;
    await saveUpload(storageKey, data);
    const source = createFile(user.id, { originalName: title, storageKey, mimeType, sizeBytes: data.length });
    sourceFileId = source?.id;
  } else {
    const body = await request.json() as { fileId?: string };
    if (!body.fileId) return NextResponse.json({ error: "Provide an uploaded file or fileId." }, { status: 400 });
    const source = getFileForUser(body.fileId, user.id);
    if (!source || source.deleted_at) return NextResponse.json({ error: "File not found." }, { status: 404 });
    if (!supportedKnowledgeTypes.has(source.mime_type)) return NextResponse.json({ error: "That file type cannot be indexed." }, { status: 415 });
    sourceFileId = source.id; title = source.original_name; mimeType = source.mime_type; data = await readUpload(source.storage_key);
  }
  try {
    const text = normalizeDocumentText(await extractDocumentText(data, mimeType));
    if (!text) return NextResponse.json({ error: "No readable text was found in this document." }, { status: 422 });
    const chunks = chunkDocumentText(text);
    const document = createKnowledgeDocument(user.id, { title, mimeType, sourceFileId, text, chunks });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document indexing failed." }, { status: 422 });
  }
}