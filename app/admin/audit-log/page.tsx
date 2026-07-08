"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AuditLog, AuditLogListData } from "@/types/api";

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function firstDateOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function AuditLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState("100");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");

    const response = await gasFetch<AuditLogListData>({
      path: "admin/logs/audit",
      method: "GET",
      params: {
        module: moduleName,
        hanh_dong: action,
        user_id: userId,
        from,
        to,
        limit,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được AuditLog.");
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

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Audit Logs
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Nhật ký thao tác
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            Theo dõi các hành động quan trọng: tạo, sửa, xóa, duyệt, gửi email,
            đăng nhập và cập nhật cấu hình.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <InputField
              label="Module"
              value={moduleName}
              onChange={setModuleName}
              placeholder="PAYROLL"
            />
            <InputField
              label="Hành động"
              value={action}
              onChange={setAction}
              placeholder="CREATE_PERSON"
            />
            <InputField
              label="User ID"
              value={userId}
              onChange={setUserId}
              placeholder="USER_xxx"
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
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={loadLogs}
              className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600"
            >
              Tải AuditLog
            </button>

            <button
              onClick={() => {
                setModuleName("");
                setAction("");
                setUserId("");
                setLimit("100");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
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
          <LoadingBlock text="Đang tải AuditLog..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách AuditLog
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {logs.length} dòng.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Module</th>
                    <th className="px-5 py-4">Hành động</th>
                    <th className="px-5 py-4">Đối tượng</th>
                    <th className="px-5 py-4">ID đối tượng</th>
                    <th className="px-5 py-4 text-right">Chi tiết</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.thoi_gian || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {log.user_id || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                          {log.module || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {log.hanh_dong || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.doi_tuong_type || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.doi_tuong_id || "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Không có log phù hợp.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedLog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-sky-600">
                    AuditLog Detail
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedLog.hanh_dong}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"
                >
                  Đóng
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <JsonBox title="Before JSON" value={selectedLog.before_json} />
                <JsonBox title="After JSON" value={selectedLog.after_json} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
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

function JsonBox({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-700">{title}</p>
      <pre className="max-h-[520px] overflow-auto rounded-3xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {formatJson(value)}
      </pre>
    </div>
  );
}

function formatJson(value: string) {
  if (!value) return "-";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
