import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeAssistant } from "@/lib/ai";

const actions = { explain: "explain this code clearly, including its purpose and important control flow", review: "review this code for bugs, security risks, and maintainability issues", refactor: "suggest a cleaner refactoring while preserving behavior", tests: "generate focused tests for this code", docs: "write concise documentation for this code" } as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { action?: keyof typeof actions; content?: string; language?: string; model?: string };
  if (!body.action || !actions[body.action]) return NextResponse.json({ error: "Choose a code action." }, { status: 400 });
  if (!body.content?.trim() || body.content.length > 200000) return NextResponse.json({ error: "Code is required and must be 200,000 characters or fewer." }, { status: 400 });
  try {
    const result = await completeAssistant([{ role: "system", content: "You are a senior software engineer in Aether AI Workspace. Return useful markdown with code fences where appropriate. Do not claim to have executed code." }, { role: "user", content: `TASK: ${actions[body.action]}\n\nLanguage: ${body.language ?? "unknown"}\n\nCode:\n${body.content}` }], body.model);
    return NextResponse.json({ action: body.action, content: result.content, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
  } catch { return NextResponse.json({ error: "The code action could not be completed." }, { status: 502 }); }
}