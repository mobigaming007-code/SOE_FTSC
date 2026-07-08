export default function LoadingBlock({
  text = "Đang tải dữ liệu...",
}: {
  text?: string;
}) {
  return (
    <div className="fts-card flex items-center gap-4 rounded-[2rem] p-5">
      <div className="relative h-12 w-12 shrink-0">
        <div className="absolute inset-0 rounded-full border-4 border-sky-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-500" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400" />
      </div>

      <div>
        <p className="font-black text-slate-950">{text}</p>
        <p className="mt-1 text-sm text-slate-500">
          Hệ thống đang xử lý, vui lòng đợi trong giây lát.
        </p>
      </div>
    </div>
  );
}
