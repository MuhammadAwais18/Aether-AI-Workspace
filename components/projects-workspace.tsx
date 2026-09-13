"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, Check, ChevronRight, FolderKanban, LoaderCircle, Plus, Save, Users } from "lucide-react";

type Project = { id: string; name: string; project_key: string; description: string; status: "active" | "paused" | "completed" | "archived"; color: string; member_count: number; updated_at: string };
type Activity = { id: string; detail: string; created_at: string; user_name: string };
const statusOptions = [{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }];
const colors = ["#0e7770", "#e87862", "#d39b32", "#6876b5", "#8d628f"];

export function ProjectsWorkspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void loadProjects(); }, []);

  async function loadProjects() {
    const response = await fetch("/api/projects");
    const result = await response.json() as { projects?: Project[]; error?: string };
    if (!response.ok) { setError(result.error ?? "Unable to load projects."); setLoading(false); return; }
    setProjects(result.projects ?? []);
    if (result.projects?.[0]) await selectProject(result.projects[0].id); else setShowCreate(true);
    setLoading(false);
  }

  async function selectProject(id: string) {
    setSelectedId(id); setError("");
    const response = await fetch(`/api/projects/${id}`);
    const result = await response.json() as { project?: Project; activity?: Activity[]; error?: string };
    if (!response.ok || !result.project) { setError(result.error ?? "Unable to load project."); return; }
    setSelected(result.project); setActivity(result.activity ?? []); setShowCreate(false);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { project?: Project; error?: string };
    if (!response.ok || !result.project) { setError(result.error ?? "Unable to create project."); setSaving(false); return; }
    setProjects((current) => [result.project!, ...current]); setShowCreate(false); await selectProject(result.project.id); setSaving(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setSaving(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/projects/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { project?: Project; activity?: Activity[]; error?: string };
    if (!response.ok || !result.project) { setError(result.error ?? "Unable to save project."); setSaving(false); return; }
    setSelected(result.project); setActivity(result.activity ?? []); setProjects((current) => current.map((project) => project.id === result.project!.id ? result.project! : project)); setSaving(false);
  }

  async function archive() {
    if (!selected || !window.confirm(`Archive ${selected.name}?`)) return;
    const response = await fetch(`/api/projects/${selected.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Unable to archive this project."); return; }
    const remaining = projects.filter((project) => project.id !== selected.id); setProjects(remaining); setSelected(null); setSelectedId("");
    if (remaining[0]) await selectProject(remaining[0].id); else setShowCreate(true);
  }

  return <main className="projects-page"><section className="projects-sidebar"><div className="projects-heading"><div><div className="eyebrow">Workspace</div><h1>Projects</h1></div><button className="quick-action compact" onClick={() => { setShowCreate(true); setSelected(null); }}><Plus size={15} /> New</button></div><p className="projects-intro">A clear home for the work your team is moving forward.</p><div className="project-list">{projects.map((project) => <button className={`project-list-item ${selectedId === project.id ? "selected" : ""}`} key={project.id} onClick={() => void selectProject(project.id)}><span className="project-color" style={{ background: project.color }} /><span className="project-list-copy"><strong>{project.name}</strong><small>{project.project_key} · {project.status}</small></span><ChevronRight size={15} /></button>)}{!loading && !projects.length && <div className="projects-empty"><FolderKanban size={22} /><p>No projects yet. Give your next idea a place to land.</p></div>}</div></section><section className="project-detail">{loading ? <div className="project-loading"><LoaderCircle className="spin" size={20} /> Loading projects...</div> : showCreate ? <CreateProjectForm saving={saving} error={error} onSubmit={create} onCancel={() => { setShowCreate(false); if (projects[0]) void selectProject(projects[0].id); }} /> : selected ? <form className="project-editor" onSubmit={save}><div className="project-detail-head"><div><span className="project-key" style={{ color: selected.color }}>{selected.project_key}</span><h2>{selected.name}</h2><p>Created {new Date(selected.updated_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p></div><div className="project-detail-actions"><button className="icon-button" type="button" onClick={() => void archive()} aria-label="Archive project"><Archive size={16} /></button><button className="quick-action compact" disabled={saving}><Save size={15} /> {saving ? "Saving" : "Save changes"}</button></div></div><div className="project-fields"><label className="field"><span>Project name</span><input name="name" defaultValue={selected.name} maxLength={80} required /></label><label className="field"><span>Status</span><select name="status" defaultValue={selected.status}>{statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="field full"><span>Description</span><textarea name="description" defaultValue={selected.description} rows={4} maxLength={500} placeholder="What is this project trying to achieve?" /></label></div><div className="color-picker"><span>Project color</span><div>{colors.map((color) => <label key={color}><input type="radio" name="color" value={color} defaultChecked={selected.color === color} /><span style={{ background: color }} /></label>)}</div></div>{error && <div className="form-error">{error}</div>}<div className="project-detail-grid"><section className="panel project-status-card"><div className="panel-header"><h3>Project pulse</h3><span className={`status-pill ${selected.status}`}>{selected.status}</span></div><div className="project-metrics"><div><strong>{selected.member_count}</strong><span>Members</span></div><div><strong>0</strong><span>Tasks</span></div><div><strong>0%</strong><span>Complete</span></div></div></section><section className="panel project-activity"><div className="panel-header"><h3>Activity</h3><Users size={16} color="var(--muted)" /></div>{activity.length ? activity.map((item) => <div className="activity-row" key={item.id}><div className="activity-dot" style={{ background: selected.color }} /><div><p>{item.detail}</p><small>{item.user_name} · {new Date(item.created_at).toLocaleDateString()}</small></div></div>) : <div className="projects-empty">No activity yet.</div>}</section></div></form> : null}</section></main>;
}

function CreateProjectForm({ saving, error, onSubmit, onCancel }: { saving: boolean; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="create-project" onSubmit={onSubmit}><div className="eyebrow">New project</div><h2>Give the work a home.</h2><p>Projects keep your team aligned around one clear outcome.</p><label className="field"><span>Project name</span><input name="name" required maxLength={80} placeholder="Website refresh" autoFocus /></label><label className="field"><span>Project key</span><input name="projectKey" required maxLength={8} placeholder="WEB" /><small>Short identifier for this project, like WEB or APP2.</small></label><label className="field"><span>Description <em>Optional</em></span><textarea name="description" rows={4} maxLength={500} placeholder="What does success look like?" /></label><input type="hidden" name="color" value="#0e7770" />{error && <div className="form-error">{error}</div>}<div className="create-actions"><button className="text-button" type="button" onClick={onCancel}>Cancel</button><button className="quick-action compact" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} {saving ? "Creating" : "Create project"}</button></div></form>;
}