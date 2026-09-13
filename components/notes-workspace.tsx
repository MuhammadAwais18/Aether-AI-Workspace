"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Check, FileText, Folder, FolderPlus, LoaderCircle, Plus, Search, Sparkles, Trash2 } from "lucide-react";

type Note = { id: string; folder_id: string | null; title: string; content: string; updated_at: string };
type NoteFolder = { id: string; name: string; parent_id: string | null };
type AiAction = "summarize" | "rewrite" | "improve";

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [folderId, setFolderId] = useState("");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiAction, setAiAction] = useState<AiAction | "">("");
  const [error, setError] = useState("");

  useEffect(() => { void loadNotes(); }, [folderId]);

  async function loadNotes(nextSearch = search) {
    setLoading(true); setError(""); const params = new URLSearchParams(); if (folderId) params.set("folderId", folderId); if (nextSearch.trim()) params.set("search", nextSearch.trim());
    const response = await fetch(`/api/notes?${params}`); const result = await response.json() as { notes?: Note[]; folders?: NoteFolder[]; error?: string };
    if (!response.ok) setError(result.error ?? "Unable to load notes."); else { setNotes(result.notes ?? []); setFolders(result.folders ?? []); if (selected && result.notes?.some((note) => note.id === selected.id)) { const current = result.notes.find((note) => note.id === selected.id); if (current && saved) setSelected(current); } else if (!selected && result.notes?.[0]) setSelected(result.notes[0]); }
    setLoading(false);
  }

  async function createNote() {
    const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Untitled note", content: "", folderId: folderId || undefined }) });
    const result = await response.json() as { note?: Note; error?: string };
    if (!response.ok || !result.note) { setError(result.error ?? "Unable to create note."); return; }
    setNotes((current) => [result.note!, ...current]); setSelected(result.note); setSaved(true); setPreview(false);
  }

  async function saveNote(event?: FormEvent) {
    event?.preventDefault(); if (!selected) return; setSaving(true); setError("");
    const response = await fetch(`/api/notes/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: selected.title, content: selected.content, folderId: selected.folder_id || undefined }) });
    const result = await response.json() as { note?: Note; error?: string };
    if (!response.ok || !result.note) setError(result.error ?? "Unable to save note."); else { setSelected(result.note); setNotes((current) => current.map((note) => note.id === result.note!.id ? result.note! : note)); setSaved(true); }
    setSaving(false);
  }

  async function deleteSelected() {
    if (!selected || !window.confirm("Delete this note? This cannot be undone.")) return;
    const response = await fetch(`/api/notes/${selected.id}`, { method: "DELETE" }); if (!response.ok) { setError("Unable to delete note."); return; }
    const remaining = notes.filter((note) => note.id !== selected.id); setNotes(remaining); setSelected(remaining[0] ?? null); setSaved(true);
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/notes/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.name }) }); const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Unable to create folder."); else { setShowFolderForm(false); await loadNotes(); }
  }

  async function runAi(action: AiAction) {
    if (!selected || !selected.content.trim()) { setError("Add some note content before using an AI action."); return; }
    setAiAction(action); setError(""); const response = await fetch(`/api/notes/${selected.id}/ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const result = await response.json() as { content?: string; error?: string };
    if (!response.ok || !result.content) setError(result.error ?? "Unable to run that AI action."); else { setSelected((current) => current ? { ...current, content: result.content! } : current); setSaved(false); setPreview(false); }
    setAiAction("");
  }

  return <main className="notes-page"><aside className="notes-sidebar"><div className="notes-side-head"><div><div className="eyebrow">Workspace</div><h1>Notes</h1></div><button className="icon-button" onClick={() => void createNote()} aria-label="New note"><Plus size={17} /></button></div><label className="notes-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); void loadNotes(event.target.value); }} placeholder="Search notes" /></label><div className="notes-nav"><button className={!folderId ? "active" : ""} onClick={() => setFolderId("")}><FileText size={15} /> All notes <span>{notes.length}</span></button>{folders.map((folder) => <button className={folderId === folder.id ? "active" : ""} key={folder.id} onClick={() => setFolderId(folder.id)}><Folder size={15} /> {folder.name}</button>)}<button className="notes-folder-add" onClick={() => setShowFolderForm((value) => !value)}><FolderPlus size={15} /> New folder</button></div>{showFolderForm && <form className="note-folder-form" onSubmit={createFolder}><input name="name" required maxLength={80} autoFocus placeholder="Folder name" /><button className="quick-action compact">Add</button></form>}<div className="notes-list">{loading ? <div className="notes-list-empty"><LoaderCircle size={17} className="spin" /></div> : notes.map((note) => <button className={`note-list-item ${selected?.id === note.id ? "selected" : ""}`} key={note.id} onClick={() => { setSelected(note); setSaved(true); setPreview(false); }}><span className="note-list-icon"><FileText size={14} /></span><span><strong>{note.title || "Untitled note"}</strong><small>{note.content.slice(0, 58) || "Empty note"}</small></span></button>)}{!loading && !notes.length && <div className="notes-list-empty">No notes match this view.</div>}</div></aside><section className="note-editor">{selected ? <><header className="note-editor-head"><div><span className="eyebrow">{saved ? "Saved note" : "Unsaved changes"}</span><input className="note-title" value={selected.title} onChange={(event) => { setSelected({ ...selected, title: event.target.value }); setSaved(false); }} aria-label="Note title" /></div><div className="note-head-actions"><button className="icon-button" onClick={() => void deleteSelected()} aria-label="Delete note"><Trash2 size={16} /></button><button className="quick-action compact" disabled={saving || saved} onClick={() => void saveNote()}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} {saving ? "Saving" : saved ? "Saved" : "Save"}</button></div></header><div className="note-toolbar"><div className="note-mode"><button className={!preview ? "active" : ""} onClick={() => setPreview(false)}>Write</button><button className={preview ? "active" : ""} onClick={() => setPreview(true)}>Preview</button></div><div className="note-ai-actions"><span><Sparkles size={13} /> AI tools</span><button disabled={!!aiAction} onClick={() => void runAi("summarize")}>{aiAction === "summarize" ? "Summarizing..." : "Summarize"}</button><button disabled={!!aiAction} onClick={() => void runAi("rewrite")}>{aiAction === "rewrite" ? "Rewriting..." : "Rewrite"}</button><button disabled={!!aiAction} onClick={() => void runAi("improve")}>{aiAction === "improve" ? "Improving..." : "Improve"}</button></div></div>{error && <div className="form-error note-error">{error}</div>}{preview ? <div className="note-preview"><MarkdownPreview content={selected.content} /></div> : <textarea className="note-content" value={selected.content} onChange={(event) => { setSelected({ ...selected, content: event.target.value }); setSaved(false); }} placeholder="Start writing in markdown..." spellCheck />}</> : <div className="notes-empty"><div className="empty-icon"><FileText size={20} /></div><h2>A quieter place for thinking.</h2><p>Create a note to capture a decision, a draft, or the idea you are not ready to lose.</p><button className="quick-action compact" onClick={() => void createNote()}><Plus size={15} /> New note</button></div>}</section></main>;
}

function MarkdownPreview({ content }: { content: string }) { return <div className="markdown-preview">{content.split("\n").map((line, index) => { if (line.startsWith("# ")) return <h1 key={index}>{line.slice(2)}</h1>; if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>; if (line.startsWith("- ")) return <li key={index}>{line.slice(2)}</li>; return <p key={index}>{line || "\u00a0"}</p>; })}</div>; }