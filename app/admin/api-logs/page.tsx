"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type { ApiLog, ApiLogListData } from "@/types/api";

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function firstDateOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ApiLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [pathFilter, setPathFilter] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState("100");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");

    const response = await gasFetch<ApiLogListData>({
      path: "admin/logs/api",
      method: "GET",
      params: {
        path: pathFilter,
        status_code: statusCode,
        from,
        to,
        limit,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được ApiLogs.");
      return;
    }

    setLogs(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const first = firstDateOfMonth();
    const today = todayText();

    setFrom(first);
    setTo(today);

    setTimeout(() => {
      loadLogs();
    }, 0);
  }, []);

  const failed = logs.filter(
    (log) => Number(log.status_code || 0) >= 400,
  ).length;
  const success = logs.filter(
    (log) => Number(log.status_code || 0) < 400,
  ).length;
  const avgDuration =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + Number(log.duration_ms || 0), 0) /
        logs.length
      : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại Admin
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            API Logs
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Nhật ký API
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Theo dõi request, status code, thời gian xử lý và lỗi API.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MiniStat
            title="Request hiển thị"
            value={formatNumber(logs.length)}
          />
          <MiniStat
            title="Request lỗi"
            value={formatNumber(failed)}
            tone="rose"
          />
          <MiniStat
            title="Thời gian TB"
            value={`${formatNumber(Math.round(avgDuration))}ms`}
            tone="gold"
          />
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <InputField
              label="Path"
              value={pathFilter}
              onChange={setPathFilter}
              placeholder="payroll"
            />
            <InputField
              label="Status code"
              value={statusCode}
              onChange={setStatusCode}
              placeholder="400"
            />
            <InputField
              label="Từ ngày"
              type="date"
              value={from}
              onChange={setFrom}
            />
            <InputField
              label="Đến ngày"
              type="date"
              value={to}
              onChange={setTo}
            />
            <InputField
              label="Limit"
              value={limit}
              onChange={setLimit}
              placeholder="100"
            />

            <div className="flex items-end">
              <button
                onClick={loadLogs}
                className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600"
              >
                Tải log
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setStatusCode("400");
                setTimeout(loadLogs, 0);
              }}
              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100"
            >
              Lọc lỗi 400
            </button>

            <button
              onClick={() => {
                setStatusCode("500");
                setTimeout(loadLogs, 0);
              }}
              className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100"
            >
              Lọc lỗi 500
            </button>

            <button
              onClick={() => {
                setPathFilter("");
                setStatusCode("");
                setLimit("100");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock text="Đang tải ApiLogs..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách ApiLogs
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Thành công {success}, lỗi {failed}.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">Method</th>
                    <th className="px-5 py-4">Path</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Duration</th>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Error</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.created_at || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {log.method || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {log.path || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge code={Number(log.status_code || 0)} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatNumber(log.duration_ms || 0)}ms
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.user_id || "-"}
                      </td>

                      <td className="max-w-[360px] px-5 py-4 text-sm text-rose-600">
                        <div className="max-h-20 overflow-auto">
                          {log.error_message || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Không có API log phù hợp.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function MiniStat({
  title,
  value,
  tone = "sky",
}: {
  title: string;
  value: string;
  tone?: "sky" | "rose" | "gold";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "gold"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-sky-50 text-sky-700 ring-sky-100";

  return (
    <div className="fts-card rounded-3xl p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p
        className={`mt-3 inline-flex rounded-2xl px-4 py-2 text-2xl font-black ring-1 ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ code }: { code: number }) {
  const className =
    code >= 500
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : code >= 400
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-teal-50 text-teal-700 ring-teal-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {code || "-"}
    </span>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      />
    </div>
  );
}
