import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link href="/" className="mb-8 text-xl font-bold tracking-tight">
        Jobilly.ai
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
