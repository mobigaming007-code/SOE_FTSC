import Link from "next/link";

type ModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: string;
  accent?: string;
};

export default function ModuleCard({
  title,
  description,
  href,
  icon = "✨",
  accent = "from-sky-500 to-teal-400",
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/80 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-2xl hover:shadow-sky-100"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />

      <div className="relative z-10">
        <div
          className={[
            "mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br text-2xl text-white shadow-xl shadow-sky-100 transition duration-200 group-hover:scale-105",
            accent,
          ].join(" ")}
        >
          {icon}
        </div>

        <h3 className="text-base font-black text-slate-950">{title}</h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
          {description}
        </p>

        <div className="mt-5 flex items-center gap-2 text-sm font-black text-sky-600">
          Mở module
          <span className="transition duration-200 group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
