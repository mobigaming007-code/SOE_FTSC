type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  tone?: "sky" | "teal" | "gold" | "rose" | "navy";
};

const toneMap = {
  sky: {
    icon: "from-sky-500 to-cyan-400",
    glow: "shadow-sky-100",
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  teal: {
    icon: "from-teal-500 to-emerald-400",
    glow: "shadow-teal-100",
    badge: "bg-teal-50 text-teal-700 ring-teal-100",
  },
  gold: {
    icon: "from-amber-500 to-orange-400",
    glow: "shadow-amber-100",
    badge: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  rose: {
    icon: "from-rose-500 to-pink-400",
    glow: "shadow-rose-100",
    badge: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  navy: {
    icon: "from-slate-900 to-slate-600",
    glow: "shadow-slate-200",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon = "✨",
  tone = "sky",
}: StatCardProps) {
  const style = toneMap[tone];

  return (
    <div className="fts-card group rounded-[2rem] p-5 transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-500">{title}</p>

          <p className="mt-3 truncate text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          {subtitle ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div
          className={[
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-2xl text-white shadow-xl transition duration-200 group-hover:scale-105",
            style.icon,
            style.glow,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full w-2/3 rounded-full bg-gradient-to-r transition-all duration-500 group-hover:w-full",
            style.icon,
          ].join(" ")}
        />
      </div>

      <div className="mt-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${style.badge}`}
        >
          Fly To Sky
        </span>
      </div>
    </div>
  );
}
