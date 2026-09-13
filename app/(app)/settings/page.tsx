import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/utility-workspaces";
import { getCurrentUser } from "@/lib/auth";
export default async function SettingsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); return <SettingsWorkspace user={user} />; }