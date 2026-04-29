import Link from "next/link";
import { CalendarClock, BellRing, CheckCircle2, Music4 } from "lucide-react";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="landing-shell min-h-screen text-white">
      <div className="w-full px-4 py-4 lg:px-6 lg:py-6">
        <section className="landing-hero rounded-[36px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-12">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
            Desktop-ready planner
          </div>

          <div className="mt-6 max-w-5xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Calendar planning, recurring routines, timers, alarms, and music
              in one workspace.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
              Sign in with Google, manage your schedule, send reminders by push
              or email, and grow it into a real desktop utility app.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="rounded-2xl bg-gradient-to-br from-emerald-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              {session ? "Open dashboard" : "Start with Google"}
            </Link>

            <a
              href="#features"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              See features
            </a>
          </div>
        </section>

        <section id="features" className="mt-6 grid gap-5 xl:grid-cols-4">
          <article className="landing-card rounded-[28px] p-6">
            <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-200">
              <CalendarClock size={22} />
            </div>
            <h2 className="text-xl font-semibold">Calendar workflow</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Date-based planning with recurring events and day-by-day task
              control.
            </p>
          </article>

          <article className="landing-card rounded-[28px] p-6">
            <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-200">
              <BellRing size={22} />
            </div>
            <h2 className="text-xl font-semibold">Reminder control</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Choose push only, email only, both, or none depending on the task.
            </p>
          </article>

          <article className="landing-card rounded-[28px] p-6">
            <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-200">
              <CheckCircle2 size={22} />
            </div>
            <h2 className="text-xl font-semibold">Fast completion</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Complete tasks fast, keep history where useful, and clear finished
              items when needed.
            </p>
          </article>

          <article className="landing-card rounded-[28px] p-6">
            <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-200">
              <Music4 size={22} />
            </div>
            <h2 className="text-xl font-semibold">Utility direction</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Timers, alarms, and a persistent music player make it feel like a
              real desktop tool.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}