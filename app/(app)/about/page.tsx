import { ShieldCheck, Sparkles } from "lucide-react";
import { teamConcept } from "@/lib/team-concept";

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-md bg-slate-900 p-5 text-white shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300">Concept</p>
        <h2 className="mt-2 text-2xl font-black leading-8">{teamConcept.title}</h2>
        <p className="mt-4 text-xl font-black text-red-200">{teamConcept.subtitle}</p>
        <p className="mt-1 text-sm font-bold text-slate-200">{teamConcept.tagline}</p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 font-black">
          <Sparkles size={18} />
          チームコンセプト
        </h3>
        <div className="mt-4 space-y-4 text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
          {teamConcept.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-5 rounded-md bg-red-50 p-3 text-lg font-black leading-7 text-red-800 dark:bg-red-950 dark:text-red-100">
          {teamConcept.lead}
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 font-black">
          <ShieldCheck size={18} />
          KTTTの掟
        </h3>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
          {teamConcept.rulesIntro}
        </p>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
          {teamConcept.rulesMission}
        </p>
      </section>

      <div className="space-y-3">
        {teamConcept.rules.map((rule) => (
          <article
            key={rule.title}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent dark:text-red-300">
              {rule.title}
            </p>
            <h4 className="mt-2 font-black leading-6">{rule.heading}</h4>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{rule.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
