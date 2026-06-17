import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Jobilly.ai</h1>
      <p className="max-w-md text-center text-muted-foreground">
        From Graduation to First Job — Guided by AI. Phase 0 scaffold:
        routing, auth, database, and service layer are wired up. Feature
        dashboards land in Phase 1.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
