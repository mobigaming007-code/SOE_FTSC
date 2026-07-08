"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type { PayrollDashboardData, PayrollPeriodListData } from "@/types/api";

function currentMonthText() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const router = useRouter();

  const [month, setMonth] = useState("");
  const [dashboard, setDashboard] = useState<PayrollDashboardData | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriodListData["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async function loadData(targetMonth: string) {
    setLoading(true);
    setError("");

    const year = targetMonth.slice(0, 4);

    const [dashboardResponse, periodsResponse] = await Promise.all([
      gasFetch<PayrollDashboardData>({
        path: "admin/dashboard/payroll",
        method: "GET",
        params: {
          month: targetMonth,
        },
      }),
      gasFetch<PayrollPeriodListData>({
        path: "payroll/periods",
        method: "GET",
        params: {
          nam: year,
        },
      }),
    ]);

    setLoading(false);

    if (!dashboardResponse.success || !dashboardResponse.data) {
      setError(dashboardResponse.message || "Không tải được dashboard lương.");
      return;
    }

    setDashboard(dashboardResponse.data);

    if (periodsResponse.success && periodsResponse.data) {
      setPeriods(periodsResponse.data.items || []);
    }
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const m = currentMonthText();
    queueMicrotask(() => {
      setMonth(m);
      loadData(m);
    });
  }, [loadData, router]);

  function changeMonth(value: string) {
    setMonth(value);
    loadData(value);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                Payroll
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Bảng lương tháng
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Xuất bảng lương theo tháng, lưu trữ từng kỳ lương, theo dõi công,
                phụ cấp, OT, thưởng, khấu trừ và phiếu lương nhân viên.
              </p>
            </div>

            <a
              href="/payroll/generate"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              Xuất bảng lương tháng
            </a>
          </div>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Tháng
              </label>
              <input
                type="month"
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadData(month)}
                className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 md:w-auto"
              >
                Tải dữ liệu
              </button>
            </div>
          </div>
        </section>

        {loading ? <LoadingBlock text="Đang tải dữ liệu lương..." /> : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Kỳ lương"
                value={formatNumber(dashboard.summary.payroll_periods)}
                subtitle={`Tháng ${month || "-"}`}
                icon="📅"
                tone="sky"
              />

              <StatCard
                title="Phiếu lương"
                value={formatNumber(dashboard.summary.payslips)}
                subtitle="Phiếu đã tạo"
                icon="💳"
                tone="teal"
              />

              <StatCard
                title="Tổng thực nhận"
                value={formatCurrency(dashboard.summary.total_net_pay)}
                subtitle="Tổng chi trả"
                icon="💰"
                tone="gold"
              />

              <StatCard
                title="Khấu trừ"
                value={formatCurrency(dashboard.summary.total_deduction)}
                subtitle="Tổng khấu trừ"
                icon="➖"
                tone="rose"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Lối tắt module lương
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ModuleCard
                    title="Kỳ lương"
                    description="Tạo kỳ lương theo tháng, lưu trạng thái và chốt kỳ để lưu trữ."
                    href="/payroll/periods"
                    icon="KY"
                    accent="from-sky-500 to-teal-400"
                  />

                  <ModuleCard
                    title="Xuất bảng lương"
                    description="Tạo bảng lương tháng từ công, phép, phụ cấp, OT, thưởng và khấu trừ."
                    href="/payroll/generate"
                    icon="XL"
                    accent="from-amber-500 to-orange-400"
                  />

                  <ModuleCard
                    title="Lưu trữ phiếu lương"
                    description="Xem danh sách phiếu lương đã tạo và lưu theo từng kỳ tháng."
                    href="/payroll/payslips"
                    icon="PL"
                    accent="from-indigo-500 to-sky-400"
                  />

                  <ModuleCard
                    title="Điều chỉnh lương"
                    description="Nhập phụ cấp, OT, thưởng, khấu trừ hoặc tạm ứng trước khi xuất bảng lương."
                    href="/payroll/generate"
                    icon="DC"
                    accent="from-slate-700 to-slate-500"
                  />
                </div>
              </div>

              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Trạng thái phiếu lương
                </h2>

                <div className="mt-5 space-y-3">
                  {dashboard.by_status?.map((item) => (
                    <div
                      key={item.trang_thai}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-950">
                            {formatStatus(item.trang_thai)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatNumber(item.total)} phiếu
                          </p>
                        </div>

                        <p className="text-sm font-black text-slate-950">
                          {formatCurrency(item.total_net_pay)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {!dashboard.by_status?.length ? (
                    <div className="rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                      Chưa có phiếu lương trong tháng này.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="fts-card overflow-hidden rounded-[2rem]">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Kỳ lương gần đây
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tổng cộng {periods.length} kỳ trong năm.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Tháng</th>
                      <th className="px-5 py-4">Khoảng thời gian</th>
                      <th className="px-5 py-4">Trạng thái</th>
                      <th className="px-5 py-4">Ngày tạo</th>
                      <th className="px-5 py-4">Ghi chú</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {periods.slice(0, 8).map((period) => (
                      <tr key={period.id}>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {period.thang}/{period.nam}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {period.tu_ngay} → {period.den_ngay}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={period.trang_thai} />
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {period.ngay_tao || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {period.ghi_chu || "-"}
                        </td>
                      </tr>
                    ))}

                    {periods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có kỳ lương.
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

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "FINALIZED" || value === "CLOSED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "CALCULATED"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : value === "DRAFT"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
