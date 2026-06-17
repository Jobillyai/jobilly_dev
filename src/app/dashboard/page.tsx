import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { logoutAction } from "@/server/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold tracking-tight">
        You&#x2019;re in, {data.user.email}
      </h1>
      <p className="max-w-md text-center text-muted-foreground">
        This is the placeholder dashboard. Career Advisory, Growth School,
        Mock Interviews, and Job Applications land here in upcoming phases.
      </p>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
