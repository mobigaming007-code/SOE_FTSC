export function PageLoading({
  title = "Đang tải dữ liệu...",
  description = "Vui lòng đợi trong giây lát.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-100">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function ErrorBox({
  title = "Đã có lỗi xảy ra",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl bg-rose-50 p-5 text-sm ring-1 ring-rose-100">
      <p className="font-black text-rose-700">{title}</p>
      <p className="mt-1 font-semibold text-rose-600">{message}</p>
    </div>
  );
}

export function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-3xl bg-teal-50 p-5 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
      {message}
    </div>
  );
}

export function EmptyState({
  title = "Chưa có dữ liệu",
  description = "Không tìm thấy dữ liệu phù hợp.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-2xl ring-1 ring-sky-100">
        🗂️
      </div>
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
