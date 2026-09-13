type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const defaultModel = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";

function localResponse(prompt: string) {
  const subject = prompt.trim().replace(/\s+/g, " ");
  if (subject.startsWith("TASK: summarize")) {
    const source = subject.split("Content:").slice(1).join("Content:").trim();
    const points = source.split(/\s*[-\n]\s*/).map((line) => line.trim()).filter(Boolean).slice(0, 4);
    return `Local summary:\n\n${points.map((point) => `- ${point.slice(0, 180)}`).join("\n")}\n\nConfigure \`OPENROUTER_API_KEY\` for a model-generated summary.`;
  }
  if (subject.startsWith("TASK: rewrite")) {
    const source = subject.split("Content:").slice(1).join("Content:").trim();
    return `${source.slice(0, 5000)}\n\nConfigure \`OPENROUTER_API_KEY\` for an AI rewrite.`;
  }
  if (subject.startsWith("TASK: improve")) {
    const source = subject.split("Content:").slice(1).join("Content:").trim();
    return `${source.slice(0, 5000)}\n\nConfigure \`OPENROUTER_API_KEY\` for AI improvement suggestions.`;
  }
  if (subject.startsWith("TASK: review")) return `## Local review\n\n- The code is concise and easy to follow.\n- Add input and output type documentation if this function is part of a public API.\n- Confirm the desired behavior for empty values and nullish items with a focused test.\n\nConfigure \`OPENROUTER_API_KEY\` for a provider-backed review of the full file.`;
  if (subject.startsWith("TASK: refactor")) {
    const source = subject.split("Code:").slice(1).join("Code:").trim();
    return `## Refactoring direction\n\nKeep the current implementation small and extract domain-specific validation if this grows.\n\n\`\`\`text\n${source.slice(0, 5000)}\n\`\`\``;
  }
  if (subject.startsWith("TASK: tests")) return `## Focused tests\n\n\`\`\`text\n- returns the expected result for valid input\n- handles an empty collection\n- covers nullish values according to the intended contract\n\`\`\``;
  if (subject.startsWith("TASK: docs")) return `## Function documentation\n\nDescribe the function's purpose, its input contract, its return value, and the behavior for empty or invalid input. Add an example that matches the project's test conventions.`;
  if (subject.startsWith("TASK: knowledge")) {
    const context = subject.split("Context:").slice(1).join("Context:").trim();
    return context ? `Based on the indexed sources:\n\n${context.slice(0, 1200)}\n\nThis answer is from Aether's local retrieval mode. Configure \`OPENROUTER_API_KEY\` for a model-synthesized answer grounded in these sources.` : "I could not find a relevant indexed source for that question.";
  }
  return `I’m running in local mode because no OpenRouter key is configured yet.\n\nYou asked: **${subject.slice(0, 240)}**\n\nAdd \`OPENROUTER_API_KEY\` to your environment to connect Aether to a hosted model. The conversation is already being saved, so you can continue here after configuring it.`;
}

export async function completeAssistant(messages: ChatMessage[], model?: string) {
  let content = "";
  const result = await streamAssistant(messages, model, (delta) => { content += delta; });
  return { ...result, content };
}

export async function streamAssistant(messages: ChatMessage[], model = defaultModel, onDelta: (text: string) => void) {
  if (!process.env.OPENROUTER_API_KEY) {
    const response = localResponse(messages.at(-1)?.content ?? "");
    for (const part of response.match(/.{1,24}(?:\s|$)/g) ?? [response]) {
      onDelta(part);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    return { content: response, model: "local-fallback", inputTokens: 0, outputTokens: response.split(/\s+/).length };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000", "X-Title": "Aether AI Workspace" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!response.ok || !response.body) throw new Error(`AI provider returned ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content as string | undefined;
        if (delta) { content += delta; onDelta(delta); }
      } catch { /* Ignore incomplete provider frames. */ }
    }
    if (done) break;
  }
  return { content, model, inputTokens: messages.reduce((total, message) => total + message.content.split(/\s+/).length, 0), outputTokens: content.split(/\s+/).length };
}