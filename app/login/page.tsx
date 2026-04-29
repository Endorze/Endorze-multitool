import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="landing-shell min-h-screen text-white">
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-6">
        <section className="landing-card w-full max-w-xl rounded-[32px] p-8 sm:p-10">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
            Google sign-in
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-3 text-base leading-7 text-white/60">
            Use your Google account to access your planner, reminders, timer,
            alarms, and music workspace.
          </p>

          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              className="w-full rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
              type="submit"
            >
              Continue with Google
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}