import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-panel">
      <div className="auth-form">
        <div className="eyebrow">404</div>
        <h2>Page not found</h2>
        <p>The page you requested does not exist or is no longer available.</p>
        <Link className="primary-button" href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}
