import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { archiveProject, getProjectForUser, updateProject, type Project } from "@/lib/db";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const result = getProjectForUser(projectId, user.id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Project not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const body = await request.json() as { name?: string; description?: string; status?: Project["status"]; color?: string };
  if (!body.name?.trim() || !body.status || !["active", "paused", "completed", "archived"].includes(body.status)) return NextResponse.json({ error: "Name and a valid status are required." }, { status: 400 });
  const result = updateProject(projectId, user.id, { name: body.name.trim().slice(0, 80), description: body.description?.trim().slice(0, 500) ?? "", status: body.status, color: body.color ?? "#0e7770" });
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Project not found" }, { status: 404 });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  return archiveProject(projectId, user.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Project not found" }, { status: 404 });
}