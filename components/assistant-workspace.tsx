"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Copy, Ellipsis, LoaderCircle, MessageSquare, Plus, RefreshCw, Send, Trash2 } from "lucide-react";

type Conversation = { id: string; title: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant" | "system"; content: string; model: string | null; input_tokens: number; output_tokens: number; created_at: string };
type StreamMessage = { content: string; model: string; inputTokens: number; outputTokens: number };

const models = [{ id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" }, { id: "openai/gpt-4o-mini", label: "GPT-4o mini" }, { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" }];

export function AssistantWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState(models[0].id);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  async function loadConversations() {
    const response = await fetch("/api/conversations");
    if (!response.ok) { setError("Your session has expired. Refresh and sign in again."); setLoading(false); return; }
    const result = await response.json() as { conversations: Conversation[] };
    setConversations(result.conversations);
    if (result.conversations[0]) await selectConversation(result.conversations[0].id);
    else await createConversation();
    setLoading(false);
  }

  async function createConversation() {
    const response = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const result = await response.json() as { conversation: Conversation };
    setConversations((current) => [result.conversation, ...current]);
    setSelectedId(result.conversation.id);
    setMessages([]);
    setShowMenu(false);
  }

  async function selectConversation(id: string) {
    setSelectedId(id);
    setShowMenu(false);
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) return;
    const result = await response.json() as { messages: Message[] };
    setMessages(result.messages);
  }

  async function submit(event?: FormEvent, contentOverride?: string) {
    event?.preventDefault();
    const content = (contentOverride ?? draft).trim();
    if (!content || sending || !selectedId) return;
    setDraft(""); setError(""); setSending(true);
    const optimistic: Message = { id: `optimistic-${Date.now()}`, role: "user", content, model: null, input_tokens: 0, output_tokens: 0, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic, { id: `assistant-${Date.now()}`, role: "assistant", content: "", model, input_tokens: 0, output_tokens: 0, created_at: new Date().toISOString() }]);
    try {
      const response = await fetch(`/api/conversations/${selectedId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, model }) });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null) as { error?: string } | null)?.error ?? "Unable to send message.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let finalMessage: StreamMessage | null = null;
      while (true) {
        const { done, value } = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: ")); if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as { type: string; content?: string; message?: StreamMessage };
          if (payload.type === "delta") setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: item.content + (payload.content ?? "") } : item));
          if (payload.type === "done") finalMessage = payload.message ?? null;
          if (payload.type === "error") throw new Error(payload.content ?? "The AI provider returned an error.");
        }
        if (done) break;
      }
      if (finalMessage) setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...finalMessage, input_tokens: finalMessage?.inputTokens ?? 0, output_tokens: finalMessage?.outputTokens ?? 0 } : item));
      const updated = await fetch("/api/conversations").then((result) => result.json()) as { conversations: Conversation[] };
      setConversations(updated.conversations);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send message."); setMessages((current) => current.slice(0, -1)); }
    setSending(false);
  }

  async function regenerate() {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser && !sending) { setMessages((current) => current.slice(0, -1)); setDraft(lastUser.content); setTimeout(() => void submit(undefined, lastUser.content), 0); }
  }

  async function rename() {
    const conversation = conversations.find((item) => item.id === selectedId); if (!conversation) return;
    const title = window.prompt("Rename conversation", conversation.title); if (!title?.trim()) return;
    await fetch(`/api/conversations/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, title: title.trim() } : item)); setShowMenu(false);
  }

  async function remove() {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    await fetch(`/api/conversations/${selectedId}`, { method: "DELETE" });
    const remaining = conversations.filter((item) => item.id !== selectedId); setConversations(remaining);
    if (remaining[0]) await selectConversation(remaining[0].id); else await createConversation();
  }

  return <main className="assistant-page"><aside className="conversation-panel"><div className="assistant-panel-head"><div><div className="eyebrow">AI assistant</div><h1>Conversations</h1></div><button className="icon-button" onClick={() => void createConversation()} aria-label="New conversation"><Plus size={17} /></button></div><div className="conversation-list">{conversations.map((conversation) => <button className={`conversation-item ${selectedId === conversation.id ? "selected" : ""}`} key={conversation.id} onClick={() => void selectConversation(conversation.id)}><MessageSquare size={15} /><span>{conversation.title}</span></button>)}{!conversations.length && !loading && <p className="conversation-empty">Start a new thread to keep your thinking together.</p>}</div></aside><section className="chat-panel"><header className="chat-head"><div><span className="status-dot" /> <strong>Aether Assistant</strong><small>Context-aware workspace copilot</small></div><div className="chat-controls"><select aria-label="AI model" value={model} onChange={(event) => setModel(event.target.value)}>{models.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select><button className="icon-button" onClick={() => setShowMenu((value) => !value)} aria-label="Conversation actions"><Ellipsis size={18} /></button>{showMenu && <div className="chat-menu"><button onClick={() => void rename()}>Rename conversation</button><button onClick={() => void remove()}><Trash2 size={14} /> Delete conversation</button></div>}</div></header><div className="message-scroll" ref={scrollRef}>{loading ? <div className="chat-loading"><LoaderCircle size={20} className="spin" /> Loading your conversations...</div> : messages.length ? messages.map((message, index) => <MessageBubble key={message.id} message={message} last={index === messages.length - 1} onCopy={(value) => void navigator.clipboard.writeText(value)} onRegenerate={regenerate} />) : <div className="assistant-empty"><div className="assistant-orb">✦</div><h2>What are you working through?</h2><p>Ask for a plan, unpack a tricky idea, review code, or turn rough thoughts into something clear.</p><div className="starter-grid"><button onClick={() => setDraft("Help me break down a complex problem into a clear plan.")}>Make a plan</button><button onClick={() => setDraft("Explain how I can improve my team’s workflow.")}>Improve a workflow</button></div></div>}{error && <div className="form-error chat-error">{error}</div>}</div><form className="composer" onSubmit={submit}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Message Aether..." rows={1} disabled={sending} /><button className="send-button" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button><small>Enter to send · Shift + Enter for a new line</small></form></section></main>;
}

function MessageBubble({ message, last, onCopy, onRegenerate }: { message: Message; last: boolean; onCopy: (value: string) => void; onRegenerate: () => void }) {
  const assistant = message.role === "assistant";
  return <article className={`message ${assistant ? "assistant-message" : "user-message"}`}><div className="message-avatar">{assistant ? "✦" : "You"}</div><div className="message-body"><div className="message-meta">{assistant ? "Aether" : "You"}<span>{assistant && message.model ? message.model.replace(/^.*\//, "") : ""}</span></div><div className="message-content">{assistant ? <RichMessage content={message.content} /> : <p>{message.content}</p>}</div>{assistant && message.content && <div className="message-actions"><button onClick={() => onCopy(message.content)}><Copy size={13} /> Copy</button>{last && <button onClick={onRegenerate}><RefreshCw size={13} /> Regenerate</button>}</div>}</div></article>;
}

function RichMessage({ content }: { content: string }) {
  return <>{content.split(/(```[\s\S]*?```)/g).map((part, index) => part.startsWith("```") ? <pre key={index}><code>{part.replace(/^```\w*\n?/, "").replace(/```$/, "")}</code></pre> : <p key={index}>{part.split(/(\*\*[^*]+\*\*)/g).map((piece, pieceIndex) => piece.startsWith("**") ? <strong key={pieceIndex}>{piece.slice(2, -2)}</strong> : piece)}</p>)}</>;
}