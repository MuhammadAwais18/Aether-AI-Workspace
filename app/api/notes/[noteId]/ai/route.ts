import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNoteForUser } from "@/lib/db";
import { completeAssistant } from "@/lib/ai";

type Context = { params: Promise<{ noteId: string }> };
const actions = { summarize: "summarize this note into a concise set of useful points", rewrite: "rewrite this note to be clearer while preserving its meaning", improve: "improve this note with better structure, wording, and actionable detail" } as const;

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { noteId } = await context.params;
  const note = getNoteForUser(noteId, user.id);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  const body = await request.json() as { action?: keyof typeof actions; model?: string };
  if (!body.action || !actions[body.action]) return NextResponse.json({ error: "Choose summarize, rewrite, or improve." }, { status: 400 });
  try {
    const result = await completeAssistant([{ role: "system", content: "You are an editor inside Aether AI Workspace. Return only the requested note content, with concise markdown when useful." }, { role: "user", content: `TASK: ${body.action} ${actions[body.action]}\n\nTitle: ${note.title}\n\nContent:\n${note.content}` }], body.model);
    return NextResponse.json({ action: body.action, content: result.content, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
  } catch { return NextResponse.json({ error: "The AI action could not be completed." }, { status: 502 }); }
}