import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createProject, listProjectsForUser } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ projects: listProjectsForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; projectKey?: string; description?: string; color?: string };
  const name = body.name?.trim();
  const projectKey = body.projectKey?.trim().toUpperCase();
  if (!name || !projectKey || projectKey.length > 8) return NextResponse.json({ error: "Project name and a key of up to 8 characters are required." }, { status: 400 });
  if (!/^[A-Z0-9]+$/.test(projectKey)) return NextResponse.json({ error: "Project key can only contain letters and numbers." }, { status: 400 });
  try {
    const result = createProject(user.id, { name: name.slice(0, 80), projectKey, description: body.description?.trim().slice(0, 500) ?? "", color: body.color ?? "#0e7770" });
    return NextResponse.json({ project: result?.project }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "That project key is already in use in this workspace." }, { status: 409 });
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}