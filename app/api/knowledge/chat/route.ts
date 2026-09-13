import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchKnowledgeForUser } from "@/lib/db";
import { completeAssistant } from "@/lib/ai";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { question?: string; model?: string };
  const question = body.question?.trim();
  if (!question || question.length > 2000) return NextResponse.json({ error: "Ask a question between 1 and 2,000 characters." }, { status: 400 });
  const sources = searchKnowledgeForUser(user.id, question, 6);
  if (!sources.length) return NextResponse.json({ answer: "I could not find a relevant indexed source for that question.", sources: [] });
  const context = sources.map((source, index) => `[Source ${index + 1}: ${source.title}]\n${source.content}`).join("\n\n");
  try {
    const result = await completeAssistant([{ role: "system", content: "You answer questions using only the supplied source context. Cite sources inline as [Source 1], [Source 2]. If the context does not answer the question, say so." }, { role: "user", content: `TASK: knowledge\nQuestion: ${question}\n\nContext:\n${context}` }], body.model);
    return NextResponse.json({ answer: result.content, model: result.model, sources: sources.map((source, index) => ({ id: source.document_id, title: source.title, chunkIndex: source.chunk_index, excerpt: source.content.slice(0, 240), citation: `[Source ${index + 1}]` })) });
  } catch { return NextResponse.json({ error: "The knowledge-base answer could not be completed." }, { status: 502 }); }
}