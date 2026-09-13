"use client";

import { Bell, Menu, Search, Sun } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter(); const [notifications, setNotifications] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { const saved = window.localStorage.getItem("aether-theme") === "dim"; setDark(saved); document.documentElement.dataset.theme = saved ? "dim" : "light"; }, []);
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const value = new FormData(event.currentTarget).get("query")?.toString().trim(); if (value) router.push(`/knowledge?query=${encodeURIComponent(value)}`); }
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dim" : "light"; window.localStorage.setItem("aether-theme", next ? "dim" : "light"); }
  return <header className="topbar"><button className="icon-button mobile-menu" onClick={() => document.body.classList.toggle("nav-open")} aria-label="Open navigation"><Menu size={19} /></button><form className="search" onSubmit={search}><Search size={17} /><input name="query" aria-label="Search workspace" placeholder="Search your knowledge base" /></form><div className="top-actions"><button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <Sun size={17} /> : "◐"}</button><div className="notification-wrap"><button className="icon-button" onClick={() => setNotifications((value) => !value)} aria-label="Notifications"><Bell size={17} /></button>{notifications && <div className="notification-popover"><strong>Notifications</strong><p>No new workspace notifications.</p></div>}</div></div></header>;
}