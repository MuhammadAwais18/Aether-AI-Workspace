import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addMessage, getConversationForUser, updateConversationTitle } from "@/lib/db";
import { streamAssistant } from "@/lib/ai";

type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await context.params;
  const conversation = getConversationForUser(conversationId, user.id);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const body = await request.json() as { content?: string; model?: string };
  const content = body.content?.trim();
  if (!content || content.length > 12000) return NextResponse.json({ error: "Message must be between 1 and 12,000 characters." }, { status: 400 });

  addMessage({ conversationId, role: "user", content });
  if (conversation.conversation.title === "New conversation") updateConversationTitle(conversationId, user.id, content);
  const history = [...conversation.messages, { role: "user" as const, content }].slice(-20).map(({ role, content: messageContent }) => ({ role, content: messageContent }));
  const encoder = new TextEncoder();
  let fullResponse = "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const result = await streamAssistant(history, body.model, (delta) => { fullResponse += delta; send({ type: "delta", content: delta }); });
        addMessage({ conversationId, role: "assistant", content: result.content, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
        send({ type: "done", message: { content: result.content, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens } });
      } catch {
        const fallback = "I couldn’t reach the selected AI provider. Check your OpenRouter configuration and try again.";
        fullResponse = fallback;
        addMessage({ conversationId, role: "assistant", content: fallback, model: body.model ?? "provider-error" });
        send({ type: "error", content: fallback });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}