"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, FileText, LoaderCircle, MessageSquare, Plus, Send, Trash2, Upload } from "lucide-react";

type DocumentRecord = { id: string; title: string; mime_type: string; status: string; extracted_chars: number; chunk_count: number; created_at: string };
type Source = { id: string; title: string; chunkIndex: number; excerpt: string; citation: string };
type ChatMessage = { role: "user" | "assistant"; content: string; sources?: Source[] };

export function KnowledgeWorkspace() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadDocuments(); }, []);
  useEffect(() => { const query = searchParams.get("query"); if (query) setQuestion(query); }, [searchParams]);

  async function loadDocuments() {
    const response = await fetch("/api/knowledge/documents"); const result = await response.json() as { documents?: DocumentRecord[]; error?: string };
    if (!response.ok) setError(result.error ?? "Unable to load knowledge documents."); else setDocuments(result.documents ?? []);
    setLoading(false);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError("");
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/knowledge/documents", { method: "POST", body: form }); const result = await response.json() as { document?: DocumentRecord; error?: string };
    if (!response.ok || !result.document) setError(result.error ?? "Unable to index this document."); else setDocuments((current) => [result.document!, ...current]);
    setUploading(false); event.target.value = "";
  }

  async function remove(document: DocumentRecord) {
    if (!window.confirm(`Remove ${document.title} from the knowledge base?`)) return;
    const response = await fetch(`/api/knowledge/documents/${document.id}`, { method: "DELETE" }); if (!response.ok) { setError("Unable to remove document."); return; }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  }

  async function ask(event?: FormEvent) {
    event?.preventDefault(); const content = question.trim(); if (!content || asking) return;
    setQuestion(""); setError(""); setMessages((current) => [...current, { role: "user", content }]); setAsking(true);
    const response = await fetch("/api/knowledge/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: content }) }); const result = await response.json() as { answer?: string; sources?: Source[]; error?: string };
    if (!response.ok || !result.answer) setError(result.error ?? "Unable to answer from the knowledge base."); else setMessages((current) => [...current, { role: "assistant", content: result.answer!, sources: result.sources }]);
    setAsking(false);
  }

  return <main className="knowledge-page"><aside className="knowledge-library"><div className="knowledge-head"><div><div className="eyebrow">RAG knowledge base</div><h1>Sources</h1></div><button className="icon-button" onClick={() => inputRef.current?.click()} aria-label="Upload source"><Plus size={17} /></button></div><p className="knowledge-intro">Index your team’s documents and ask questions against the source material.</p><input ref={inputRef} type="file" hidden accept=".txt,.md,.csv,.json,.pdf" onChange={upload} /> <button className="knowledge-upload" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />} {uploading ? "Indexing document..." : "Upload and index"}</button><div className="knowledge-docs"><div className="knowledge-section-label">Indexed documents <span>{documents.length}</span></div>{loading ? <div className="knowledge-empty"><LoaderCircle size={18} className="spin" /></div> : documents.map((document) => <div className="knowledge-document" key={document.id}><span className="knowledge-doc-icon"><FileText size={15} /></span><div><strong>{document.title}</strong><small>{document.chunk_count} chunks · {formatChars(document.extracted_chars)}</small></div><button onClick={() => void remove(document)} aria-label={`Remove ${document.title}`}><Trash2 size={14} /></button></div>)}{!loading && !documents.length && <div className="knowledge-empty"><BookOpen size={22} /><p>Upload a document to create your first searchable source.</p></div>}</div></aside><section className="knowledge-chat"><header className="knowledge-chat-head"><div className="knowledge-orb"><BookOpen size={18} /></div><div><strong>Knowledge chat</strong><small>Answers grounded in your indexed sources</small></div></header><div className="knowledge-messages">{!messages.length ? <div className="knowledge-welcome"><div className="assistant-orb"><BookOpen size={24} /></div><h2>Ask what your sources know.</h2><p>Search across indexed documents and get an answer with the exact source excerpts that informed it.</p><div className="knowledge-prompts"><button onClick={() => setQuestion("What are the key points in the indexed documents?")}>Key points</button><button onClick={() => setQuestion("What decisions or requirements are described in the sources?")}>Find decisions</button></div></div> : messages.map((message, index) => <article className={`knowledge-message ${message.role}`} key={`${message.role}-${index}`}><div className="knowledge-message-avatar">{message.role === "assistant" ? <BookOpen size={14} /> : "You"}</div><div><div className="knowledge-message-name">{message.role === "assistant" ? "Knowledge chat" : "You"}</div><p>{message.content}</p>{message.sources?.length ? <div className="source-list"><span>Sources</span>{message.sources.map((source) => <div className="source-card" key={`${source.id}-${source.chunkIndex}`}><b>{source.citation}</b><div><strong>{source.title}</strong><small>{source.excerpt}</small></div></div>)}</div> : null}</div></article>)}{asking && <div className="knowledge-thinking"><LoaderCircle size={16} className="spin" /> Searching sources and composing an answer...</div>}{error && <div className="form-error knowledge-error">{error}</div>}</div><form className="knowledge-composer" onSubmit={ask}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder="Ask a question about your sources..." rows={1} disabled={asking} /><button className="send-button" disabled={!question.trim() || asking} aria-label="Ask knowledge base">{asking ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button><small><MessageSquare size={11} /> Answers include source references · Enter to send</small></form></section></main>;
}

function formatChars(value: number) { return value > 1000 ? `${(value / 1000).toFixed(1)}k chars` : `${value} chars`; }