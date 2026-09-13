import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dataDirectory = path.join(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = process.env.DATABASE_PATH ?? path.join(dataDirectory, "aether.db");
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    PRIMARY KEY (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    project_key TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    color TEXT NOT NULL DEFAULT '#0e7770',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, project_key),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS project_activity (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, parent_id, name),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (parent_id) REFERENCES folders(id)
  );
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    folder_id TEXT,
    uploaded_by TEXT NOT NULL,
    original_name TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS note_folders (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, parent_id, name),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (parent_id) REFERENCES note_folders(id)
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    folder_id TEXT,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (folder_id) REFERENCES note_folders(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS code_files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'typescript',
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, name),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS workspace_invitations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (invited_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    source_file_id TEXT,
    uploaded_by TEXT NOT NULL,
    title TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'indexed' CHECK (status IN ('indexing', 'indexed', 'failed')),
    extracted_chars INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (source_file_id) REFERENCES files(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (document_id, chunk_index),
    FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts USING fts5(content, document_id UNINDEXED, chunk_id UNINDEXED);
`);

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function findUserByEmail(email: string) {
  return database.prepare("SELECT * FROM users WHERE email = ?").get(email) as (User & { password_hash: string }) | undefined;
}

export function findUserById(id: string) {
  return database.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(id) as User | undefined;
}

export function createUser(user: { id: string; name: string; email: string; passwordHash: string; workspaceId: string; workspaceName: string }) {
  const transaction = database.transaction(() => {
    database.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run(user.id, user.name, user.email, user.passwordHash);
    database.prepare("INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)").run(user.workspaceId, user.workspaceName, `${user.workspaceId}-workspace`, user.id);
    database.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')").run(user.workspaceId, user.id);
  });
  transaction();
}

export function getWorkspaceForUser(userId: string) {
  return database.prepare(`
    SELECT w.id, w.name, w.slug
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ?
    ORDER BY w.created_at ASC LIMIT 1
  `).get(userId) as { id: string; name: string; slug: string } | undefined;
}

export function getDashboardStats(userId: string) {
  const conversations = database.prepare("SELECT id, title, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 4").all(userId) as { id: string; title: string; updated_at: string }[];
  const projects = database.prepare("SELECT COUNT(*) as count FROM projects p INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id WHERE wm.user_id = ? AND p.status != 'archived'").get(userId) as { count: number };
  const files = database.prepare("SELECT COUNT(*) as count FROM files f INNER JOIN workspace_members wm ON wm.workspace_id = f.workspace_id WHERE wm.user_id = ? AND f.deleted_at IS NULL").get(userId) as { count: number };
  const notes = database.prepare("SELECT COUNT(*) as count FROM notes n INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id WHERE wm.user_id = ?").get(userId) as { count: number };
  const usage = database.prepare("SELECT COALESCE(SUM(output_tokens), 0) as tokens FROM messages m INNER JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ?").get(userId) as { tokens: number };
  return { conversations, counts: { conversations: conversations.length, files: files.count, notes: notes.count, projects: projects.count, aiCreditsUsed: Math.min(100, Math.round((usage.tokens / 100000) * 100)) } };
}

export type Conversation = { id: string; title: string; updated_at: string };
export type Message = { id: string; role: "user" | "assistant" | "system"; content: string; model: string | null; input_tokens: number; output_tokens: number; created_at: string };

export function listConversations(userId: string) {
  return database.prepare("SELECT id, title, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as Conversation[];
}

export function createConversation(userId: string, title = "New conversation") {
  const id = randomUUID();
  database.prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)").run(id, userId, title);
  return { id, title };
}

export function getConversationForUser(conversationId: string, userId: string) {
  const conversation = database.prepare("SELECT id, title, updated_at FROM conversations WHERE id = ? AND user_id = ?").get(conversationId, userId) as Conversation | undefined;
  if (!conversation) return null;
  const messages = database.prepare("SELECT id, role, content, model, input_tokens, output_tokens, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC").all(conversationId) as Message[];
  return { conversation, messages };
}

export function addMessage(message: { conversationId: string; role: Message["role"]; content: string; model?: string; inputTokens?: number; outputTokens?: number }) {
  const id = randomUUID();
  database.prepare("INSERT INTO messages (id, conversation_id, role, content, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, message.conversationId, message.role, message.content, message.model ?? null, message.inputTokens ?? 0, message.outputTokens ?? 0);
  database.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(message.conversationId);
  return id;
}

export function updateConversationTitle(conversationId: string, userId: string, title: string) {
  return database.prepare("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(title.trim().slice(0, 80), conversationId, userId).changes > 0;
}

export function deleteConversation(conversationId: string, userId: string) {
  return database.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").run(conversationId, userId).changes > 0;
}

export type Project = { id: string; workspace_id: string; owner_id: string; name: string; project_key: string; description: string; status: "active" | "paused" | "completed" | "archived"; color: string; created_at: string; updated_at: string; member_count?: number };
export type ProjectActivity = { id: string; event_type: string; detail: string; created_at: string; user_name: string };

export function listProjectsForUser(userId: string) {
  return database.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = ? AND p.status != 'archived'
    ORDER BY p.updated_at DESC
  `).all(userId) as Project[];
}

export function createProject(userId: string, project: { name: string; projectKey: string; description: string; color: string }) {
  const workspace = getWorkspaceForUser(userId);
  if (!workspace) throw new Error("Workspace not found");
  const id = randomUUID();
  const transaction = database.transaction(() => {
    database.prepare("INSERT INTO projects (id, workspace_id, owner_id, name, project_key, description, color) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, workspace.id, userId, project.name, project.projectKey, project.description, project.color);
    database.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')").run(id, userId);
    database.prepare("INSERT INTO project_activity (id, project_id, user_id, event_type, detail) VALUES (?, ?, ?, 'created', ?)").run(randomUUID(), id, userId, `Created ${project.name}`);
  });
  transaction();
  return getProjectForUser(id, userId);
}

export function getProjectForUser(projectId: string, userId: string) {
  const project = database.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = ? AND wm.user_id = ?
  `).get(projectId, userId) as Project | undefined;
  if (!project) return null;
  const activity = database.prepare(`SELECT pa.*, u.name as user_name FROM project_activity pa INNER JOIN users u ON u.id = pa.user_id WHERE pa.project_id = ? ORDER BY pa.created_at DESC, pa.rowid DESC LIMIT 12`).all(projectId) as ProjectActivity[];
  return { project, activity };
}

export function updateProject(projectId: string, userId: string, changes: { name: string; description: string; status: Project["status"]; color: string }) {
  const current = getProjectForUser(projectId, userId);
  if (!current) return null;
  database.prepare("UPDATE projects SET name = ?, description = ?, status = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(changes.name, changes.description, changes.status, changes.color, projectId);
  if (current.project.status !== changes.status) database.prepare("INSERT INTO project_activity (id, project_id, user_id, event_type, detail) VALUES (?, ?, ?, 'status_changed', ?)").run(randomUUID(), projectId, userId, `Moved project to ${changes.status}`);
  return getProjectForUser(projectId, userId);
}

export function archiveProject(projectId: string, userId: string) {
  const current = getProjectForUser(projectId, userId);
  if (!current) return false;
  database.prepare("UPDATE projects SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(projectId);
  database.prepare("INSERT INTO project_activity (id, project_id, user_id, event_type, detail) VALUES (?, ?, ?, 'archived', ?)").run(randomUUID(), projectId, userId, `Archived ${current.project.name}`);
  return true;
}

export type Folder = { id: string; name: string; parent_id: string | null; created_at: string };
export type StoredFile = { id: string; folder_id: string | null; original_name: string; storage_key: string; mime_type: string; size_bytes: number; deleted_at: string | null; created_at: string; updated_at: string; uploader_name?: string };

function workspaceForResource(userId: string) {
  return getWorkspaceForUser(userId);
}

function folderForUser(folderId: string, userId: string) {
  return database.prepare("SELECT f.id, f.workspace_id FROM folders f INNER JOIN workspace_members wm ON wm.workspace_id = f.workspace_id WHERE f.id = ? AND wm.user_id = ?").get(folderId, userId) as { id: string; workspace_id: string } | undefined;
}

export function listFoldersForUser(userId: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  return database.prepare("SELECT id, name, parent_id, created_at FROM folders WHERE workspace_id = ? ORDER BY name COLLATE NOCASE ASC").all(workspace.id) as Folder[];
}

export function createFolder(userId: string, name: string, parentId?: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  if (parentId && !folderForUser(parentId, userId)) throw new Error("Folder not found");
  const id = randomUUID();
  database.prepare("INSERT INTO folders (id, workspace_id, name, parent_id) VALUES (?, ?, ?, ?)").run(id, workspace.id, name.trim().slice(0, 80), parentId || null);
  return database.prepare("SELECT id, name, parent_id, created_at FROM folders WHERE id = ?").get(id) as Folder;
}

export function listFilesForUser(userId: string, options: { folderId?: string; trash?: boolean } = {}) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  const conditions = ["f.workspace_id = ?", options.trash ? "f.deleted_at IS NOT NULL" : "f.deleted_at IS NULL"];
  const values: (string | null)[] = [workspace.id];
  if (options.folderId) { conditions.push("f.folder_id = ?"); values.push(options.folderId); }
  return database.prepare(`SELECT f.*, u.name as uploader_name FROM files f INNER JOIN users u ON u.id = f.uploaded_by WHERE ${conditions.join(" AND ")} ORDER BY f.created_at DESC`).all(...values) as StoredFile[];
}

export function createFile(userId: string, file: { folderId?: string; originalName: string; storageKey: string; mimeType: string; sizeBytes: number }) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  if (file.folderId && !folderForUser(file.folderId, userId)) throw new Error("Folder not found");
  const id = randomUUID();
  database.prepare("INSERT INTO files (id, workspace_id, folder_id, uploaded_by, original_name, storage_key, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, workspace.id, file.folderId || null, userId, file.originalName, file.storageKey, file.mimeType, file.sizeBytes);
  return getFileForUser(id, userId);
}

export function getFileForUser(fileId: string, userId: string) {
  return database.prepare("SELECT f.*, u.name as uploader_name FROM files f INNER JOIN workspace_members wm ON wm.workspace_id = f.workspace_id INNER JOIN users u ON u.id = f.uploaded_by WHERE f.id = ? AND wm.user_id = ?").get(fileId, userId) as StoredFile | undefined;
}

export function updateFileDeleted(fileId: string, userId: string, deleted: boolean) {
  const file = getFileForUser(fileId, userId);
  if (!file) return null;
  database.prepare("UPDATE files SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(deleted ? new Date().toISOString() : null, fileId);
  return getFileForUser(fileId, userId);
}

export type NoteFolder = { id: string; name: string; parent_id: string | null; created_at: string };
export type Note = { id: string; folder_id: string | null; author_id: string; title: string; content: string; created_at: string; updated_at: string };

function noteFolderForUser(folderId: string, userId: string) {
  return database.prepare("SELECT nf.id, nf.workspace_id FROM note_folders nf INNER JOIN workspace_members wm ON wm.workspace_id = nf.workspace_id WHERE nf.id = ? AND wm.user_id = ?").get(folderId, userId) as { id: string; workspace_id: string } | undefined;
}

export function listNoteFoldersForUser(userId: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  return database.prepare("SELECT id, name, parent_id, created_at FROM note_folders WHERE workspace_id = ? ORDER BY name COLLATE NOCASE ASC").all(workspace.id) as NoteFolder[];
}

export function createNoteFolder(userId: string, name: string, parentId?: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  if (parentId && !noteFolderForUser(parentId, userId)) throw new Error("Note folder not found");
  const id = randomUUID();
  database.prepare("INSERT INTO note_folders (id, workspace_id, name, parent_id) VALUES (?, ?, ?, ?)").run(id, workspace.id, name.trim().slice(0, 80), parentId || null);
  return database.prepare("SELECT id, name, parent_id, created_at FROM note_folders WHERE id = ?").get(id) as NoteFolder;
}

export function listNotesForUser(userId: string, options: { folderId?: string; search?: string } = {}) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  const conditions = ["n.workspace_id = ?"];
  const values: (string | null)[] = [workspace.id];
  if (options.folderId) { conditions.push("n.folder_id = ?"); values.push(options.folderId); }
  if (options.search?.trim()) { conditions.push("(n.title LIKE ? OR n.content LIKE ?)"); const term = `%${options.search.trim()}%`; values.push(term, term); }
  return database.prepare(`SELECT n.id, n.folder_id, n.author_id, n.title, n.content, n.created_at, n.updated_at FROM notes n INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id WHERE ${conditions.join(" AND ")} ORDER BY n.updated_at DESC`).all(...values) as Note[];
}

export function createNote(userId: string, note: { title: string; content: string; folderId?: string }) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  if (note.folderId && !noteFolderForUser(note.folderId, userId)) throw new Error("Note folder not found");
  const id = randomUUID();
  database.prepare("INSERT INTO notes (id, workspace_id, folder_id, author_id, title, content) VALUES (?, ?, ?, ?, ?, ?)").run(id, workspace.id, note.folderId || null, userId, note.title.trim().slice(0, 160), note.content.slice(0, 50000));
  return getNoteForUser(id, userId);
}

export function getNoteForUser(noteId: string, userId: string) {
  return database.prepare("SELECT n.id, n.folder_id, n.author_id, n.title, n.content, n.created_at, n.updated_at FROM notes n INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id WHERE n.id = ? AND wm.user_id = ?").get(noteId, userId) as Note | undefined;
}

export function updateNote(noteId: string, userId: string, note: { title: string; content: string; folderId?: string }) {
  const current = getNoteForUser(noteId, userId);
  if (!current) return null;
  if (note.folderId && !noteFolderForUser(note.folderId, userId)) throw new Error("Note folder not found");
  database.prepare("UPDATE notes SET title = ?, content = ?, folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(note.title.trim().slice(0, 160), note.content.slice(0, 50000), note.folderId || null, noteId);
  return getNoteForUser(noteId, userId);
}

export function deleteNote(noteId: string, userId: string) {
  return database.prepare("DELETE FROM notes WHERE id = ? AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)").run(noteId, userId).changes > 0;
}

export type CodeFile = { id: string; name: string; language: string; content: string; created_at: string; updated_at: string };

export function listCodeFilesForUser(userId: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  return database.prepare("SELECT id, name, language, content, created_at, updated_at FROM code_files WHERE workspace_id = ? ORDER BY name COLLATE NOCASE ASC").all(workspace.id) as CodeFile[];
}

export function createCodeFile(userId: string, file: { name: string; language: string; content: string }) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  const id = randomUUID();
  database.prepare("INSERT INTO code_files (id, workspace_id, owner_id, name, language, content) VALUES (?, ?, ?, ?, ?, ?)").run(id, workspace.id, userId, file.name.trim().slice(0, 120), file.language, file.content.slice(0, 200000));
  return getCodeFileForUser(id, userId);
}

export function getCodeFileForUser(fileId: string, userId: string) {
  return database.prepare("SELECT cf.id, cf.name, cf.language, cf.content, cf.created_at, cf.updated_at FROM code_files cf INNER JOIN workspace_members wm ON wm.workspace_id = cf.workspace_id WHERE cf.id = ? AND wm.user_id = ?").get(fileId, userId) as CodeFile | undefined;
}

export function updateCodeFile(fileId: string, userId: string, file: { name: string; language: string; content: string }) {
  if (!getCodeFileForUser(fileId, userId)) return null;
  database.prepare("UPDATE code_files SET name = ?, language = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(file.name.trim().slice(0, 120), file.language, file.content.slice(0, 200000), fileId);
  return getCodeFileForUser(fileId, userId);
}

export function deleteCodeFile(fileId: string, userId: string) {
  return database.prepare("DELETE FROM code_files WHERE id = ? AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)").run(fileId, userId).changes > 0;
}

export type Prompt = { id: string; title: string; content: string; category: string; favorite: number; author_id: string; created_at: string; updated_at: string };
export function listPromptsForUser(userId: string, search = "") { const workspace = workspaceForResource(userId); if (!workspace) return []; if (!search.trim()) return database.prepare("SELECT id, title, content, category, favorite, author_id, created_at, updated_at FROM prompts WHERE workspace_id = ? ORDER BY favorite DESC, updated_at DESC").all(workspace.id) as Prompt[]; const term = `%${search.trim()}%`; return database.prepare("SELECT id, title, content, category, favorite, author_id, created_at, updated_at FROM prompts WHERE workspace_id = ? AND (title LIKE ? OR content LIKE ? OR category LIKE ?) ORDER BY favorite DESC, updated_at DESC").all(workspace.id, term, term, term) as Prompt[]; }
export function createPrompt(userId: string, prompt: { title: string; content: string; category: string }) { const workspace = workspaceForResource(userId); if (!workspace) throw new Error("Workspace not found"); const id = randomUUID(); database.prepare("INSERT INTO prompts (id, workspace_id, author_id, title, content, category) VALUES (?, ?, ?, ?, ?, ?)").run(id, workspace.id, userId, prompt.title.slice(0, 120), prompt.content.slice(0, 20000), prompt.category.slice(0, 50)); return getPromptForUser(id, userId); }
export function getPromptForUser(promptId: string, userId: string) { return database.prepare("SELECT p.id, p.title, p.content, p.category, p.favorite, p.author_id, p.created_at, p.updated_at FROM prompts p INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id WHERE p.id = ? AND wm.user_id = ?").get(promptId, userId) as Prompt | undefined; }
export function updatePrompt(promptId: string, userId: string, prompt: { title: string; content: string; category: string; favorite: boolean }) { if (!getPromptForUser(promptId, userId)) return null; database.prepare("UPDATE prompts SET title = ?, content = ?, category = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(prompt.title.slice(0, 120), prompt.content.slice(0, 20000), prompt.category.slice(0, 50), prompt.favorite ? 1 : 0, promptId); return getPromptForUser(promptId, userId); }
export function deletePrompt(promptId: string, userId: string) { return database.prepare("DELETE FROM prompts WHERE id = ? AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)").run(promptId, userId).changes > 0; }
export function listWorkspaceMembers(userId: string) { const workspace = workspaceForResource(userId); if (!workspace) return { workspace: null, members: [], invitations: [] }; const members = database.prepare("SELECT u.id, u.name, u.email, wm.role, u.created_at FROM workspace_members wm INNER JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? ORDER BY wm.role DESC, u.name COLLATE NOCASE ASC").all(workspace.id); const invitations = database.prepare("SELECT id, email, role, status, created_at FROM workspace_invitations WHERE workspace_id = ? ORDER BY created_at DESC").all(workspace.id); return { workspace, members, invitations }; }
export function createInvitation(userId: string, email: string, role: string) { const workspace = workspaceForResource(userId); if (!workspace) throw new Error("Workspace not found"); const id = randomUUID(); database.prepare("INSERT INTO workspace_invitations (id, workspace_id, invited_by, email, role) VALUES (?, ?, ?, ?, ?)").run(id, workspace.id, userId, email, role === "admin" ? "admin" : "member"); return database.prepare("SELECT id, email, role, status, created_at FROM workspace_invitations WHERE id = ?").get(id); }
export function updateUserProfile(userId: string, name: string) { database.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim().slice(0, 80), userId); return findUserById(userId); }

export type KnowledgeDocument = { id: string; source_file_id: string | null; title: string; mime_type: string; status: "indexing" | "indexed" | "failed"; extracted_chars: number; chunk_count: number; error: string | null; created_at: string; updated_at: string };
export type KnowledgeChunk = { id: string; document_id: string; chunk_index: number; content: string; start_char: number; end_char: number; title: string };

export function listKnowledgeDocumentsForUser(userId: string) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  return database.prepare("SELECT id, source_file_id, title, mime_type, status, extracted_chars, chunk_count, error, created_at, updated_at FROM knowledge_documents WHERE workspace_id = ? ORDER BY updated_at DESC").all(workspace.id) as KnowledgeDocument[];
}

export function createKnowledgeDocument(userId: string, document: { title: string; mimeType: string; sourceFileId?: string; text: string; chunks: string[] }) {
  const workspace = workspaceForResource(userId);
  if (!workspace) throw new Error("Workspace not found");
  const documentId = randomUUID();
  const transaction = database.transaction(() => {
    database.prepare("INSERT INTO knowledge_documents (id, workspace_id, source_file_id, uploaded_by, title, mime_type, extracted_chars, chunk_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(documentId, workspace.id, document.sourceFileId ?? null, userId, document.title.slice(0, 180), document.mimeType, document.text.length, document.chunks.length);
    const insertChunk = database.prepare("INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, start_char, end_char) VALUES (?, ?, ?, ?, ?, ?)");
    const insertSearch = database.prepare("INSERT INTO knowledge_chunks_fts (rowid, content, document_id, chunk_id) VALUES (?, ?, ?, ?)");
    document.chunks.forEach((content, index) => { const chunkId = randomUUID(); const start = document.text.indexOf(content); const row = database.prepare("SELECT COALESCE(MAX(rowid), 0) + 1 as next_id FROM knowledge_chunks_fts").get() as { next_id: number }; const rowId = Number(row.next_id); insertChunk.run(chunkId, documentId, index, content, Math.max(0, start), Math.max(0, start) + content.length); insertSearch.run(rowId, content, documentId, chunkId); });
  });
  transaction();
  return getKnowledgeDocumentForUser(documentId, userId);
}

export function getKnowledgeDocumentForUser(documentId: string, userId: string) {
  return database.prepare("SELECT kd.id, kd.source_file_id, kd.title, kd.mime_type, kd.status, kd.extracted_chars, kd.chunk_count, kd.error, kd.created_at, kd.updated_at FROM knowledge_documents kd INNER JOIN workspace_members wm ON wm.workspace_id = kd.workspace_id WHERE kd.id = ? AND wm.user_id = ?").get(documentId, userId) as KnowledgeDocument | undefined;
}

export function searchKnowledgeForUser(userId: string, query: string, limit = 6) {
  const workspace = workspaceForResource(userId);
  if (!workspace) return [];
  const terms = query.toLowerCase().match(/[a-z0-9_]{2,}/g)?.slice(0, 10) ?? [];
  if (!terms.length) return [];
  const matchQuery = terms.map((term) => `"${term.replace(/"/g, "")}"*`).join(" OR ");
  return database.prepare(`
    SELECT kc.id, kc.document_id, kc.chunk_index, kc.content, kc.start_char, kc.end_char, kd.title
    FROM knowledge_chunks_fts fts
    INNER JOIN knowledge_chunks kc ON kc.id = fts.chunk_id
    INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE knowledge_chunks_fts MATCH ? AND kd.workspace_id = ? AND kd.status = 'indexed'
    ORDER BY bm25(knowledge_chunks_fts) LIMIT ?
  `).all(matchQuery, workspace.id, limit) as KnowledgeChunk[];
}

export function deleteKnowledgeDocument(documentId: string, userId: string) {
  const document = getKnowledgeDocumentForUser(documentId, userId);
  if (!document) return false;
  const transaction = database.transaction(() => { database.prepare("DELETE FROM knowledge_chunks_fts WHERE document_id = ?").run(documentId); database.prepare("DELETE FROM knowledge_documents WHERE id = ?").run(documentId); });
  transaction();
  return true;
}