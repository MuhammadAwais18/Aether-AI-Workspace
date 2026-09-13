import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats, getWorkspaceForUser } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user, workspace: getWorkspaceForUser(user.id), ...getDashboardStats(user.id) });
}