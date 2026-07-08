"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type { AttendanceListData, AttendanceLog } from "@/types/api";

type AttendanceDashboardData = {
  summary: {
    total_logs: number;
    approved_logs: number;
    pending_logs: number;
    rejected_logs: number;
    completed_days: number;
    total_work_days: number;
    total_hours: number;
    late_minutes: number;
    early_leave_minutes: number;
  };
};

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function formatEmployeeLabel(log: AttendanceLog) {
  const name = log.ho_ten || log.ten_nhan_su || "";
  const code = log.ma_dinh_danh || "";

  if (name && code) {
    return `${name} - ${code}`;
  }

  return name || code || log.person_id;
}

export default function AttendancePage() {
  const router = useRouter();

  const [from, setFrom] = useState(todayText());
  const [to, setTo] = useState(todayText());
  const [dashboard, setDashboard] = useState<AttendanceDashboardData | null>(
    null,
  );
  const [todayLogs, setTodayLogs] = useState<AttendanceListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async function loadData(
    targetFrom = from,
    targetTo = to,
  ) {
    setLoading(true);
    setError("");

    const [dashboardResponse, logsResponse] = await Promise.all([
      gasFetch<AttendanceDashboardData>({
        path: "admin/dashboard/attendance",
        method: "GET",
        params: {
          from: targetFrom,
          to: targetTo,
        },
      }),
      gasFetch<AttendanceListData>({
        path: "attendance/team",
        method: "GET",
        params: {
          ngay: todayText(),
        },
      }),
    ]);

    setLoading(false);

    if (!dashboardResponse.success || !dashboardResponse.data) {
      setError(
        dashboardResponse.message || "Không tải được dashboard bảng công.",
      );
      return;
    }

    setDashboard(dashboardResponse.data);

    if (logsResponse.success && logsResponse.data) {
      setTodayLogs(logsResponse.data);
    }
  }, [from, to]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadData(from, to);
    });
  }, [from, loadData, router, to]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                Attendance Administration
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Bảng công nhân viên
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Xem toàn bộ bảng công, quản trị ca làm, địa điểm làm việc và
                duyệt các bản ghi bất thường. Check-in/check-out nằm ở cổng nhân viên.
              </p>
            </div>
          </div>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <FilterDate label="Từ ngày" value={from} onChange={setFrom} />
            <FilterDate label="Đến ngày" value={to} onChange={setTo} />

            <div className="flex items-end">
              <button
                onClick={() => loadData(from, to)}
                className="fts-button-primary w-full md:w-auto"
              >
                Lọc dữ liệu
              </button>
            </div>
          </div>
        </section>

        {loading ? <LoadingBlock text="Đang tải dữ liệu bảng công..." /> : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng bản ghi"
                value={formatNumber(dashboard.summary.total_logs)}
                subtitle={`${formatNumber(dashboard.summary.approved_logs)} đã duyệt`}
                icon="BG"
                tone="sky"
              />

              <StatCard
                title="Chờ duyệt"
                value={formatNumber(dashboard.summary.pending_logs)}
                subtitle="Bản ghi bất thường"
                icon="CL"
                tone="gold"
              />

              <StatCard
                title="Tổng công"
                value={formatNumber(dashboard.summary.total_work_days)}
                subtitle={`${formatNumber(dashboard.summary.total_hours)} giờ`}
                icon="TC"
                tone="teal"
              />

              <StatCard
                title="Đi muộn"
                value={`${formatNumber(dashboard.summary.late_minutes)} phút`}
                subtitle={`${formatNumber(dashboard.summary.early_leave_minutes)} phút về sớm`}
                icon="DM"
                tone="rose"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Nghiệp vụ bảng công
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cổng quản trị chỉ xem dữ liệu, duyệt/từ chối và cấu hình vận hành.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ModuleCard
                    title="Duyệt bất thường"
                    description="Duyệt hoặc từ chối các bản ghi ngoài vùng GPS, thiếu dữ liệu hoặc cần xác nhận."
                    href="/attendance/approvals"
                    icon="DC"
                    accent="from-amber-500 to-orange-400"
                  />

                  <ModuleCard
                    title="Địa điểm làm việc"
                    description="Thêm, sửa, xóa và cấu hình các địa điểm được phép chấm công."
                    href="/attendance/offices"
                    icon="DD"
                    accent="from-indigo-500 to-sky-400"
                  />

                  <ModuleCard
                    title="Ca làm"
                    description="Quản trị khung giờ làm, quy đổi công và quy định đi muộn/về sớm."
                    href="/attendance/shifts"
                    icon="CA"
                    accent="from-slate-700 to-slate-500"
                  />

                  <ModuleCard
                    title="QR chấm công"
                    description="Tạo QR theo địa điểm, chọn ngày hết hạn và quản lý lịch sử token đang hoạt động."
                    href="/attendance/qr"
                    icon="QR"
                    accent="from-emerald-500 to-teal-400"
                  />
                </div>
              </div>

              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Bản ghi công hôm nay
                </h2>

                <div className="mt-5 space-y-3">
                  {(todayLogs?.items || []).slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {formatEmployeeLabel(log)} · {log.loai_cham_cong}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {log.hinh_thuc} · {log.thoi_gian}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Khoảng cách: {log.khoang_cach_m || "-"}m
                          </p>
                        </div>

                        <StatusBadge status={log.trang_thai_duyet} />
                      </div>
                    </div>
                  ))}

                  {!todayLogs?.items?.length ? (
                    <div className="rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                      Hôm nay chưa có bản ghi công.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      />
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "APPROVED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "PENDING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "REJECTED"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
