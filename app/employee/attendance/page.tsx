"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import StatCard from "@/components/StatCard";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type {
  AttendanceListData,
  AttendanceLog,
  AttendanceSummary,
} from "@/types/api";

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatAttendanceType(value?: string) {
  const text = String(value || "").toUpperCase();

  if (text === "ATTENDANCE") {
    return "Chấm công";
  }

  if (text === "CHECKIN") {
    return "Check-in";
  }

  if (text === "CHECKOUT") {
    return "Check-out";
  }

  return value || "-";
}

function toNumber(value?: string | number) {
  const parsed = Number(value || 0);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDecimal(value?: string | number) {
  return toNumber(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

function parseDateTime(value?: string) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const vietnameseMatch = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (vietnameseMatch) {
    const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] =
      vietnameseMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text.replace(" ", "T"));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string) {
  const parsed = parseDateTime(value);

  if (!parsed) {
    return value || "-";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDateOnly(value?: string) {
  const parsed = parseDateTime(value);

  if (!parsed) {
    return value || "-";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatSummaryDateTime(summaryDate?: string, timeValue?: string) {
  const text = String(timeValue || "").trim();

  if (!text) {
    return "-";
  }

  if (/^\d{2}:\d{2}/.test(text) && summaryDate) {
    return formatDateTime(`${summaryDate} ${text}`);
  }

  return formatDateTime(text);
}

export default function EmployeeAttendancePage() {
  const router = useRouter();

  const [initialRange] = useState(currentMonthRange);

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async function loadData(targetFrom = from, targetTo = to) {
      setLoading(true);
      setError("");

      const response = await gasFetch<AttendanceListData>({
        path: "attendance/my",
        method: "GET",
        params: {
          from: targetFrom,
          to: targetTo,
        },
      });

      setLoading(false);

      if (!response.success || !response.data) {
        setError(response.message || "Không tải được bảng công của tôi.");
        return;
      }

      setLogs(response.data.items || []);
      setSummaries(response.data.summaries || []);
    },
    [from, to],
  );

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    void Promise.resolve().then(() =>
      loadData(initialRange.from, initialRange.to),
    );
  }, [initialRange.from, initialRange.to, loadData, router]);

  const approved = logs.filter(
    (item) => item.trang_thai_duyet === "APPROVED",
  ).length;
  const pending = logs.filter(
    (item) => item.trang_thai_duyet === "PENDING",
  ).length;
  const abnormal = logs.filter(
    (item) =>
      item.trang_thai_he_thong !== "VALID" &&
      item.trang_thai_he_thong !== "",
  ).length;
  const totalWorkHours = summaries.reduce(
    (total, item) => total + toNumber(item.so_gio_tinh_cong ?? item.so_gio),
    0,
  );
  const totalWorkDays = summaries.reduce(
    (total, item) => total + toNumber(item.so_cong_quan_tri ?? item.so_cong),
    0,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                My Attendance
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Bảng công của tôi
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Theo dõi các lần chấm công, trạng thái GPS và kết quả duyệt từ
                quản trị.
              </p>
            </div>

            <Link
              href="/employee/attendance/qr"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              Chấm công
            </Link>
          </div>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Từ ngày
              </label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="fts-input"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Đến ngày
              </label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="fts-input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadData(from, to)}
                className="fts-button-primary w-full md:w-auto"
              >
                Tải dữ liệu
              </button>
            </div>
          </div>
        </section>

        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải bảng công..." /> : null}

        {!loading ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng bản ghi"
                value={formatNumber(logs.length)}
                subtitle="Trong khoảng thời gian đã chọn"
                icon="BC"
                tone="sky"
              />

              <StatCard
                title="Chờ duyệt"
                value={formatNumber(pending)}
                subtitle="Chỉ tính công sau khi được duyệt"
                icon="CD"
                tone="gold"
              />

              <StatCard
                title="Số công"
                value={formatDecimal(totalWorkDays)}
                subtitle="Tổng công đã được quản trị duyệt"
                icon="DD"
                tone="teal"
              />

              <StatCard
                title="Giờ tính công"
                value={formatDecimal(totalWorkHours)}
                subtitle={`${approved} bản ghi đã duyệt, ${abnormal} bất thường`}
                icon="BT"
                tone="rose"
              />
            </section>

            <section className="fts-card overflow-hidden rounded-[2rem]">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Công đã tính
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ hiển thị các dòng đã được quản trị duyệt và ghi vào bảng công.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1240px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Ngày</th>
                      <th className="px-5 py-4">Giờ vào</th>
                      <th className="px-5 py-4">Giờ ra</th>
                      <th className="px-5 py-4">Giờ vào tính công</th>
                      <th className="px-5 py-4">Giờ ra tính công</th>
                      <th className="px-5 py-4">Số giờ nghỉ ngơi</th>
                      <th className="px-5 py-4">Số giờ tính công</th>
                      <th className="px-5 py-4">Số công</th>
                      <th className="px-5 py-4">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {summaries.map((summary) => (
                      <tr key={summary.id}>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">
                          {formatDateOnly(summary.ngay)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatSummaryDateTime(
                            summary.ngay,
                            summary.gio_vao || summary.checkin_at,
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatSummaryDateTime(
                            summary.ngay,
                            summary.gio_ra || summary.checkout_at,
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatSummaryDateTime(
                            summary.ngay,
                            summary.gio_vao_tinh_cong || summary.gio_vao || summary.checkin_at,
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatSummaryDateTime(
                            summary.ngay,
                            summary.gio_ra_tinh_cong || summary.gio_ra || summary.checkout_at,
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDecimal(summary.so_gio_nghi_ngoi)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDecimal(summary.so_gio_tinh_cong ?? summary.so_gio)}
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {formatDecimal(summary.so_cong_quan_tri ?? summary.so_cong)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={summary.trang_thai} />
                        </td>
                      </tr>
                    ))}

                    {summaries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có công đã tính trong khoảng thời gian này.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="fts-card overflow-hidden rounded-[2rem]">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Lịch sử chấm công
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tổng cộng {logs.length} bản ghi.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Thời gian</th>
                      <th className="px-5 py-4">Ngày</th>
                      <th className="px-5 py-4">Loại</th>
                      <th className="px-5 py-4">Hình thức</th>
                      <th className="px-5 py-4">Khoảng cách</th>
                      <th className="px-5 py-4">Hệ thống</th>
                      <th className="px-5 py-4">Duyệt</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">
                          {formatDateTime(log.thoi_gian)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDateOnly(log.ngay)}
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {formatAttendanceType(log.loai_cham_cong)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {log.hinh_thuc}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {log.khoang_cach_m || "-"}m
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={log.trang_thai_he_thong} />
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={log.trang_thai_duyet} />
                        </td>
                      </tr>
                    ))}

                    {logs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có bản ghi chấm công trong khoảng thời gian này.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Badge({ value }: { value?: string }) {
  const text = value || "-";

  const className =
    text === "APPROVED" || text === "VALID"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : text === "PENDING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : text === "REJECTED" || text === "INVALID"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(text)}
    </span>
  );
}
