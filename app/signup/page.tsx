import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="auth-shell"><section className="auth-visual"><a className="brand" href="/"><span className="brand-mark">✦</span><span>Aether</span></a><div className="auth-copy"><div className="eyebrow">A workspace with a point of view</div><h1>Turn scattered ideas into momentum.</h1><p>Think alongside AI, keep your context close, and give every project a place to grow.</p></div><div className="quote">Designed for curious teams who care about the quality of the work.</div></section><section className="auth-panel"><AuthForm mode="signup" /></section></main>;
}