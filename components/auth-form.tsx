"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return <form className="auth-form" onSubmit={submit}>
    <div className="eyebrow">{mode === "login" ? "Welcome back" : "Start your workspace"}</div>
    <h2>{mode === "login" ? "Good to see you again." : "Build better, together."}</h2>
    <p>{mode === "login" ? "Pick up where your thinking left off." : "A calm, capable home for your team’s best work."}</p>
    {mode === "signup" && <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required autoComplete="name" placeholder="Alex Morgan" /></div>}
    <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" required type="email" autoComplete="email" placeholder="alex@company.com" /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" required type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="8 characters minimum" /></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="primary-button" disabled={loading}>{loading ? "Opening your workspace..." : mode === "login" ? "Sign in" : "Create workspace"}</button>
    <div className="auth-foot">{mode === "login" ? <>New to Aether? <a href="/signup">Create an account</a></> : <>Already have an account? <a href="/login">Sign in</a></>}</div>
  </form>;
}