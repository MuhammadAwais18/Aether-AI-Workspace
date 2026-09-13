import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="auth-shell"><section className="auth-visual"><a className="brand" href="/"><span className="brand-mark">✦</span><span>Aether</span></a><div className="auth-copy"><div className="eyebrow">The intelligent work layer</div><h1>Make room for deeper work.</h1><p>Aether brings your conversations, code, knowledge and projects into one thoughtful workspace.</p></div><div className="quote">“The best tools disappear into the way you think.”</div></section><section className="auth-panel"><AuthForm mode="login" /></section></main>;
}