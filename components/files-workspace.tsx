"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Archive, ChevronRight, FileArchive, FileCode2, FileImage, FileJson2, FileText, Folder, FolderPlus, Image as ImageIcon, LoaderCircle, RotateCcw, Trash2, Upload, X } from "lucide-react";

type FileRecord = { id: string; folder_id: string | null; original_name: string; mime_type: string; size_bytes: number; deleted_at: string | null; created_at: string; uploader_name?: string };
type FolderRecord = { id: string; name: string; parent_id: string | null };

export function FilesWorkspace() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [trash, setTrash] = useState(false);
  const [selected, setSelected] = useState<FileRecord | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadFiles(); }, [currentFolder, trash]);

  async function loadFiles() {
    setLoading(true); setError("");
    const params = new URLSearchParams(); if (currentFolder) params.set("folderId", currentFolder); if (trash) params.set("trash", "true");
    const response = await fetch(`/api/files?${params}`); const result = await response.json() as { files?: FileRecord[]; folders?: FolderRecord[]; error?: string };
    if (!response.ok) setError(result.error ?? "Unable to load files."); else { setFiles(result.files ?? []); setFolders(result.folders ?? []); }
    setLoading(false);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError("");
    const form = new FormData(); form.append("file", file); if (currentFolder) form.append("folderId", currentFolder);
    const response = await fetch("/api/files", { method: "POST", body: form }); const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Unable to upload file."); else await loadFiles();
    setUploading(false); event.target.value = "";
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/files/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.name, parentId: currentFolder || undefined }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Unable to create folder."); else { setShowFolderForm(false); await loadFiles(); }
  }

  async function changeFile(file: FileRecord, action: "trash" | "restore") {
    const response = await fetch(`/api/files/${file.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!response.ok) { setError("Unable to update this file."); return; }
    if (selected?.id === file.id) setSelected(null); await loadFiles();
  }

  async function preview(file: FileRecord) {
    setSelected(file); setPreviewText("");
    if (file.mime_type.startsWith("text/") || file.mime_type === "application/json") {
      const response = await fetch(`/api/files/${file.id}?content=true`); setPreviewText(await response.text());
    }
  }

  const currentName = folders.find((folder) => folder.id === currentFolder)?.name;
  const visibleFolders = folders.filter((folder) => folder.parent_id === (currentFolder || null));
  return <main className="files-page"><div className="files-toolbar"><div><div className="eyebrow">Workspace</div><h1>Files</h1><p>One reliable place for the source material behind your work.</p></div><div className="files-actions"><input ref={fileInput} type="file" hidden onChange={upload} accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.webp,.zip" /><button className="secondary-button" onClick={() => setShowFolderForm((value) => !value)}><FolderPlus size={16} /> New folder</button><button className="quick-action compact" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} {uploading ? "Uploading" : "Upload file"}</button></div></div><div className="files-tabs"><button className={!trash ? "active" : ""} onClick={() => { setTrash(false); setCurrentFolder(""); }}>All files</button><button className={trash ? "active" : ""} onClick={() => { setTrash(true); setCurrentFolder(""); }}><Trash2 size={14} /> Trash</button></div>{showFolderForm && !trash && <form className="folder-form" onSubmit={createFolder}><Folder size={16} /><input name="name" required maxLength={80} autoFocus placeholder="Folder name" /><button className="quick-action compact">Create</button><button type="button" className="icon-button" onClick={() => setShowFolderForm(false)} aria-label="Cancel"><X size={15} /></button></form>}{error && <div className="form-error files-error">{error}</div>}{!trash && currentFolder && <div className="file-breadcrumb"><button onClick={() => setCurrentFolder("")}>Files</button><ChevronRight size={14} /><strong>{currentName}</strong></div>}<div className="files-layout"><section className="files-list"><div className="files-list-head"><span>{trash ? "Recently deleted" : currentName ?? "All files"}</span><small>{files.length + visibleFolders.length} items</small></div>{loading ? <div className="files-empty"><LoaderCircle size={20} className="spin" /> Loading files...</div> : !files.length && !visibleFolders.length ? <div className="files-empty"><div className="empty-icon"><Folder size={19} /></div><strong>{trash ? "Trash is empty" : "Nothing here yet"}</strong><p>{trash ? "Deleted files will stay here until you restore them." : "Upload a file or create a folder to start building your workspace."}</p></div> : <div className="file-rows">{visibleFolders.map((folder) => <button className="file-row folder-row" key={folder.id} onClick={() => setCurrentFolder(folder.id)}><span className="file-type folder-type"><Folder size={18} /></span><span className="file-name"><strong>{folder.name}</strong><small>Folder</small></span><ChevronRight size={16} /></button>)}{files.map((file) => <div className="file-row" key={file.id}><button className="file-row-main" onClick={() => void preview(file)}><span className="file-type">{fileIcon(file.mime_type)}</span><span className="file-name"><strong>{file.original_name}</strong><small>{formatSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}</small></span></button><div className="file-row-actions">{trash ? <button onClick={() => void changeFile(file, "restore")} aria-label="Restore file"><RotateCcw size={15} /></button> : <button onClick={() => void changeFile(file, "trash")} aria-label="Move file to trash"><Trash2 size={15} /></button>}</div></div>)}</div>}</section>{selected && <aside className="file-preview"><div className="preview-head"><div><span className="eyebrow">Preview</span><h2>{selected.original_name}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close preview"><X size={16} /></button></div><div className="preview-meta"><span>{selected.mime_type}</span><span>{formatSize(selected.size_bytes)}</span></div>{selected.mime_type.startsWith("image/") ? <img className="preview-image" src={`/api/files/${selected.id}?content=true`} alt={selected.original_name} /> : selected.mime_type === "application/pdf" ? <iframe className="preview-frame" src={`/api/files/${selected.id}?content=true`} title={selected.original_name} /> : selected.mime_type.startsWith("text/") || selected.mime_type === "application/json" ? <pre className="preview-code">{previewText}</pre> : <div className="preview-unsupported"><FileArchive size={30} /><p>Preview is not available for this file type.</p></div>}</aside>}</div></main>;
}

function fileIcon(type: string) { if (type.startsWith("image/")) return <FileImage size={18} />; if (type === "application/json") return <FileJson2 size={18} />; if (type === "application/zip") return <FileArchive size={18} />; if (type.startsWith("text/")) return <FileCode2 size={18} />; return <FileText size={18} />; }
function formatSize(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }