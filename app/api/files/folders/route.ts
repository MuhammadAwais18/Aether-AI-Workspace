import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createFolder } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; parentId?: string };
  if (!body.name?.trim() || body.name.trim().length > 80) return NextResponse.json({ error: "Folder name is required and must be 80 characters or fewer." }, { status: 400 });
  try { return NextResponse.json({ folder: createFolder(user.id, body.name, body.parentId) }, { status: 201 }); }
  catch (error) { if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "A folder with that name already exists here." }, { status: 409 }); if (error instanceof Error && error.message === "Folder not found") return NextResponse.json({ error: "That parent folder is not available." }, { status: 404 }); return NextResponse.json({ error: "Unable to create folder." }, { status: 500 }); }
}