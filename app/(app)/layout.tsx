import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <div className="app-shell"><Sidebar user={user} workspace={getWorkspaceForUser(user.id)} /><div className="main-area"><Topbar />{children}</div></div>;
}