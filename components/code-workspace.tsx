"use client";

import Editor from "@monaco-editor/react";
import { FormEvent, useEffect, useState } from "react";
import { Check, Code2, FilePlus2, LoaderCircle, Play, Save, Sparkles, Trash2, X } from "lucide-react";

type CodeFile = { id: string; name: string; language: string; content: string; updated_at: string };
type CodeAction = "explain" | "review" | "refactor" | "tests" | "docs";
const languages = [{ id: "typescript", label: "TypeScript" }, { id: "javascript", label: "JavaScript" }, { id: "python", label: "Python" }, { id: "json", label: "JSON" }, { id: "css", label: "CSS" }, { id: "html", label: "HTML" }, { id: "markdown", label: "Markdown" }, { id: "sql", label: "SQL" }];
const actions: { id: CodeAction; label: string }[] = [{ id: "explain", label: "Explain" }, { id: "review", label: "Review" }, { id: "refactor", label: "Refactor" }, { id: "tests", label: "Generate tests" }, { id: "docs", label: "Documentation" }];

export function CodeWorkspace() {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selected, setSelected] = useState<CodeFile | null>(null);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [saved, setSaved] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState<CodeAction | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void loadFiles(); }, []);

  async function loadFiles() {
    setLoading(true); const response = await fetch("/api/code-files"); const result = await response.json() as { files?: CodeFile[]; error?: string };
    if (!response.ok) setError(result.error ?? "Unable to load code files."); else { setFiles(result.files ?? []); if (!selected && result.files?.[0]) openFile(result.files[0]); }
    setLoading(false);
  }

  function openFile(file: CodeFile) { setSelected(file); setDraft(file.content); setLanguage(file.language); setSaved(true); setAiResult(""); setError(""); }

  async function createFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/code-files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.name, language: values.language, content: starterContent(String(values.language)) }) }); const result = await response.json() as { file?: CodeFile; error?: string };
    if (!response.ok || !result.file) setError(result.error ?? "Unable to create code file."); else { setFiles((current) => [...current, result.file!]); openFile(result.file); setShowCreate(false); }
  }

  async function saveFile() {
    if (!selected) return; setSaving(true); setError("");
    const response = await fetch(`/api/code-files/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: selected.name, language, content: draft }) }); const result = await response.json() as { file?: CodeFile; error?: string };
    if (!response.ok || !result.file) setError(result.error ?? "Unable to save code file."); else { setSelected(result.file); setFiles((current) => current.map((file) => file.id === result.file!.id ? result.file! : file)); setDraft(result.file.content); setSaved(true); }
    setSaving(false);
  }

  async function deleteFile() {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    const response = await fetch(`/api/code-files/${selected.id}`, { method: "DELETE" }); if (!response.ok) { setError("Unable to delete code file."); return; }
    const remaining = files.filter((file) => file.id !== selected.id); setFiles(remaining); if (remaining[0]) openFile(remaining[0]); else setSelected(null);
  }

  async function runAction(action: CodeAction) {
    if (!selected || !draft.trim()) { setError("Open a code file with content before running an AI action."); return; }
    setAiAction(action); setAiResult(""); setError(""); const response = await fetch("/api/code-files/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, language, content: draft }) }); const result = await response.json() as { content?: string; error?: string };
    if (!response.ok || !result.content) setError(result.error ?? "Unable to run that code action."); else setAiResult(result.content);
    setAiAction("");
  }

  return <main className="code-page"><aside className="code-sidebar"><div className="code-side-head"><div><div className="eyebrow">Developer workspace</div><h1>Code</h1></div><button className="icon-button" onClick={() => setShowCreate(true)} aria-label="New code file"><FilePlus2 size={17} /></button></div><div className="code-file-list">{loading ? <div className="code-empty"><LoaderCircle size={18} className="spin" /></div> : files.map((file) => <button className={`code-file-item ${selected?.id === file.id ? "selected" : ""}`} key={file.id} onClick={() => openFile(file)}><Code2 size={15} /><span><strong>{file.name}</strong><small>{file.language}</small></span></button>)}{!loading && !files.length && <div className="code-empty"><Code2 size={24} /><p>Create a file to start working in the browser.</p><button className="quick-action compact" onClick={() => setShowCreate(true)}><FilePlus2 size={14} /> New file</button></div>}</div>{showCreate && <form className="code-create-form" onSubmit={createFile}><div className="eyebrow">New code file</div><input name="name" required maxLength={120} autoFocus placeholder="server.ts" /><select name="language" defaultValue="typescript">{languages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div><button className="text-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className="quick-action compact">Create file</button></div></form>}</aside><section className="code-main">{selected ? <><header className="code-header"><div><div className="eyebrow">Workspace editor</div><h2>Build with context.</h2></div><div className="code-actions"><button className="icon-button" onClick={() => void deleteFile()} aria-label="Delete code file"><Trash2 size={16} /></button><button className="quick-action compact" disabled={saving || saved} onClick={() => void saveFile()}>{saving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} {saving ? "Saving" : saved ? "Saved" : "Save"}</button></div></header><div className="code-tabs">{files.map((file) => <button className={selected.id === file.id ? "active" : ""} key={file.id} onClick={() => openFile(file)}>{file.name}{selected.id === file.id && !saved ? <span>●</span> : null}</button>)}</div><div className="code-editor-bar"><select value={language} onChange={(event) => { setLanguage(event.target.value); setSaved(false); }} aria-label="Code language">{languages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span>{saved ? "All changes saved" : "Unsaved changes"}</span></div><div className="monaco-shell"><Editor height="calc(100vh - 310px)" language={language} value={draft} onChange={(value) => { setDraft(value ?? ""); setSaved(false); }} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", padding: { top: 18 }, scrollBeyondLastLine: false, automaticLayout: true }} /></div><div className="code-ai"><div className="code-ai-title"><span><Sparkles size={14} /> AI code tools</span><small>Review the current file without leaving your workspace.</small></div><div className="code-ai-actions">{actions.map((action) => <button key={action.id} disabled={!!aiAction} onClick={() => void runAction(action.id)}>{aiAction === action.id ? <LoaderCircle size={13} className="spin" /> : <Play size={12} />}{aiAction === action.id ? "Working" : action.label}</button>)}</div></div>{error && <div className="form-error code-error">{error}</div>}{aiResult && <section className="code-result"><div><strong>AI result</strong><button className="icon-button" onClick={() => setAiResult("")} aria-label="Close AI result"><X size={15} /></button></div><pre>{aiResult}</pre><button className="secondary-button" onClick={() => { setDraft(aiResult); setSaved(false); setAiResult(""); }}><Check size={14} /> Apply result to editor</button></section>}</> : <div className="code-empty-main"><div className="empty-icon"><Code2 size={20} /></div><h2>A focused place to build.</h2><p>Open a code file or create one to use the browser editor and AI review tools.</p><button className="quick-action compact" onClick={() => setShowCreate(true)}><FilePlus2 size={15} /> Create code file</button></div>}</section></main>;
}

function starterContent(language: string) { if (language === "python") return "def main():\n    print(\"Hello from Aether\")\n\nif __name__ == \"__main__\":\n    main()\n"; if (language === "json") return "{\n  \"name\": \"aether-workspace\"\n}\n"; if (language === "html") return "<!doctype html>\n<html>\n  <body>\n    <h1>Hello from Aether</h1>\n  </body>\n</html>\n"; return "export function hello(): string {\n  return \"Hello from Aether\";\n}\n"; }