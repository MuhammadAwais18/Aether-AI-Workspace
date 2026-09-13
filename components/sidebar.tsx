"use client";

import { BriefcaseBusiness, Code2, FileText, FolderKanban, Gauge, Library, MessageSquare, Settings2, Sparkles, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navigation = [{ label: "Overview", href: "/dashboard", icon: Gauge }, { label: "AI Assistant", href: "/assistant", icon: MessageSquare }, { label: "Projects", href: "/projects", icon: FolderKanban }, { label: "Files", href: "/files", icon: BriefcaseBusiness }, { label: "Notes", href: "/notes", icon: FileText }, { label: "Developer", href: "/code", icon: Code2 }];
const library = [{ label: "Prompt library", href: "/prompts", icon: Library }, { label: "Knowledge base", href: "/knowledge", icon: Sparkles }, { label: "Team", href: "/team", icon: Users }];

export function Sidebar({ user, workspace }: { user: { name: string; email: string }; workspace: { name: string } | undefined }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const links = (items: typeof navigation) => items.map(({ label, href, icon: Icon }) => <a className={`nav-item ${pathname === href ? "active" : ""}`} href={href} key={href}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></a>);
  return <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✦</span><span>Aether</span></a><button className="workspace-switcher" onClick={() => router.push("/settings")}><span className="workspace-avatar">A</span><span>{workspace?.name ?? "Personal workspace"}</span></button><div className="nav-section">Workspace</div>{links(navigation)}<div className="nav-section">Explore</div>{links(library)}<div className="sidebar-footer"><a className="nav-item" href="/settings"><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></a><button className="user-chip" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }}><span className="avatar">{initials}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></button></div></aside>;
}