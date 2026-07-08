"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getCurrentMonth, formatCurrency, formatNumber } from "@/lib/format";
import { getToken } from "@/lib/auth";
import type { DashboardOverview } from "@/types/api";

export default function DashboardPage() {
  const router = useRouter();

  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(targetMonth = month) {
    setLoading(true);
    setError("");

    const response = await gasFetch<DashboardOverview>({
      path: "admin/dashboard/overview",
      method: "GET",
      params: {
        month: targetMonth,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "KhÃ´ng táº£i Ä‘Æ°á»£c dashboard.");
      return;
    }

    setData(response.data);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    loadDashboard(month);
  }, []);

  function changeMonth(value: string) {
    setMonth(value);
    loadDashboard(value);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-sky-500 to-teal-400 p-6 text-white shadow-2xl shadow-sky-100 md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">
                Fly To Sky Office
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Tổng quan hệ thống
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Theo dõi nhanh nhân sự, chấm công, nghỉ phép, bảng lương, văn
                bản và hoạt động hệ thống trong một màn hình.
              </p>
            </div>

            <div className="rounded-3xl bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-sky-50">
                Tháng dữ liệu
              </label>
              <input
                type="month"
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
                className="rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none"
              />
            </div>
          </div>
        </section>

        {loading ? <LoadingBlock /> : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-5 text-sm font-semibold text-rose-600 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Nhân sự đang hoạt động"
                value={formatNumber(data.people.active_people)}
                subtitle={`${formatNumber(data.people.total_users)} tài khoản hệ thống`}
                icon="👤"
                tone="sky"
              />

              <StatCard
                title="Công đã ghi nhận"
                value={formatNumber(data.attendance.total_work_days)}
                subtitle={`${formatNumber(data.attendance.pending_logs)} bản ghi chờ duyệt`}
                icon="📅"
                tone="teal"
              />

              <StatCard
                title="Đơn nghỉ chờ duyệt"
                value={formatNumber(data.leave.pending_requests)}
                subtitle={`${formatNumber(data.leave.pending_days)} ngày đang chờ`}
                icon="📝"
                tone="gold"
              />

              <StatCard
                title="Tổng thu nhập"
                value={formatCurrency(data.payroll.total_net_pay)}
                subtitle={`${formatNumber(data.payroll.payslips)} phiếu lương`}
                icon="💰"
                tone="navy"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="fts-card rounded-[2rem] p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Tổng hợp vận hành
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Giai đoạn {data.period.from} đến {data.period.to}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100">
                    <p className="text-sm font-bold text-sky-700">Chấm công</p>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                      {formatNumber(data.attendance.total_logs)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatNumber(data.attendance.approved_logs)} hợp lệ,{" "}
                      {formatNumber(data.attendance.rejected_logs)} từ chối
                    </p>
                  </div>

                  <div className="rounded-3xl bg-teal-50 p-5 ring-1 ring-teal-100">
                    <p className="text-sm font-bold text-teal-700">Văn bản</p>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                      {formatNumber(data.documents.total_documents)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatNumber(data.documents.published_documents)} đã ban
                      hành, {formatNumber(data.documents.draft_documents)} bản
                      nháp
                    </p>
                  </div>

                  <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100">
                    <p className="text-sm font-bold text-amber-700">
                      Nghỉ phép
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                      {formatNumber(data.leave.total_requests)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatNumber(data.leave.approved_requests)} đã duyệt,{" "}
                      {formatNumber(data.leave.rejected_requests)} từ chối
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-100 p-5 ring-1 ring-slate-200">
                    <p className="text-sm font-bold text-slate-700">Hệ thống</p>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                      {formatNumber(data.system.api_requests_in_period)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatNumber(data.system.failed_api_requests)} request
                      lỗi
                    </p>
                  </div>
                </div>
              </div>

              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Tình trạng nhanh
                </h2>

                <div className="mt-6 space-y-4">
                  <StatusRow
                    label="Tài khoản hoạt động"
                    value={data.people.active_users}
                    total={data.people.total_users}
                  />
                  <StatusRow
                    label="Chấm công đã duyệt"
                    value={data.attendance.approved_logs}
                    total={Math.max(data.attendance.total_logs, 1)}
                  />
                  <StatusRow
                    label="Văn bản đã ban hành"
                    value={data.documents.published_documents}
                    total={Math.max(data.documents.total_documents, 1)}
                  />
                  <StatusRow
                    label="Email văn bản đã gửi thành công"
                    value={data.documents.sent_emails}
                    total={Math.max(data.documents.emails_in_period, 1)}
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-xl font-black text-slate-950">
                  Module quản lý
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Các phân hệ chính của Văn phòng số Fly To Sky.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ModuleCard
                  title="Nhân sự"
                  description="Quản lý hồ sơ cá nhân, tài khoản, vai trò và quan hệ Công ty/CLB."
                  icon="👤"
                  href="/people"
                  accent="from-sky-500 to-blue-500"
                />
                <ModuleCard
                  title="Chấm công GPS/QR"
                  description="Quản lý địa điểm, ca làm, check-in/check-out và duyệt bản ghi bất thường."
                  icon="📅"
                  href="/attendance"
                  accent="from-teal-500 to-cyan-400"
                />
                <ModuleCard
                  title="Nghỉ phép"
                  description="Tạo đơn nghỉ, duyệt phép, hủy đơn và theo dõi số dư phép năm."
                  icon="📖"
                  href="/leave"
                  accent="from-amber-500 to-orange-400"
                />
                <ModuleCard
                  title="Lương"
                  description="Tạo kỳ lương, tính công, phụ cấp, thưởng, khấu trừ và phiếu lương."
                  icon="💰"
                  href="/payroll"
                  accent="from-slate-700 to-slate-500"
                />
                <ModuleCard
                  title="Văn bản"
                  description="Quản lý hồ sơ văn bản, phiên bản file, phân quyền và gửi email."
                  icon="📄"
                  href="/documents"
                  accent="from-indigo-500 to-sky-400"
                />
                <ModuleCard
                  title="Quản trị"
                  description="Cấu hình hệ thống, xem audit log, API log và thông báo nội bộ."
                  icon="⚙️"
                  href="/admin"
                  accent="from-rose-500 to-amber-400"
                />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatusRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = Math.min(
    100,
    Math.round((Number(value || 0) / Number(total || 1)) * 100),
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-sm font-black text-slate-950">{percent}%</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
