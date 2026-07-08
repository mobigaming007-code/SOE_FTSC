"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { DashboardOverview, NotificationListData } from "@/types/api";

function getCurrentMonthText() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminPage() {
  const router = useRouter();

  const [month, setMonth] = useState("");
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [notifications, setNotifications] =
    useState<NotificationListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAdminData(targetMonth: string) {
    setLoading(true);
    setError("");

    const [dashboardResponse, notificationResponse] = await Promise.all([
      gasFetch<DashboardOverview>({
        path: "admin/dashboard/overview",
        method: "GET",
        params: {
          month: targetMonth,
        },
      }),
      gasFetch<NotificationListData>({
        path: "notifications",
        method: "GET",
      }),
    ]);

    setLoading(false);

    if (!dashboardResponse.success || !dashboardResponse.data) {
      setError(
        dashboardResponse.message || "Không tải được dashboard quản trị.",
      );
      return;
    }

    setDashboard(dashboardResponse.data);

    if (notificationResponse.success && notificationResponse.data) {
      setNotifications(notificationResponse.data);
    }
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const currentMonth = getCurrentMonthText();
    queueMicrotask(() => {
      setMonth(currentMonth);
      loadAdminData(currentMonth);
    });
  }, [router]);

  function changeMonth(value: string) {
    setMonth(value);
    loadAdminData(value);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                Admin Console
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Quản trị hệ thống
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Quản lý cấu hình, nhật ký hệ thống, thông báo nội bộ và theo dõi
                trạng thái vận hành.
              </p>
            </div>

            <div className="rounded-3xl bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-sky-50">
                Tháng dữ liệu
              </label>
              <input
                type="month"
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
                className="rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none"
              />
            </div>
          </div>
        </section>

        {loading ? <LoadingBlock text="Đang tải Admin Console..." /> : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Nhân sự hoạt động"
                value={formatNumber(dashboard.people.active_people)}
                subtitle={`${formatNumber(dashboard.people.active_users)} tài khoản đang mở`}
                icon="👥"
                tone="sky"
              />

              <StatCard
                title="API requests"
                value={formatNumber(dashboard.system.api_requests_in_period)}
                subtitle={`${formatNumber(dashboard.system.failed_api_requests)} request lỗi`}
                icon="🛰️"
                tone="navy"
              />

              <StatCard
                title="Audit logs"
                value={formatNumber(dashboard.system.audit_logs_in_period)}
                subtitle="Hoạt động được ghi nhận"
                icon="🧾"
                tone="gold"
              />

              <StatCard
                title="Thông báo chưa đọc"
                value={formatNumber(notifications?.unread || 0)}
                subtitle={`${formatNumber(notifications?.total || 0)} thông báo`}
                icon="🔔"
                tone="teal"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Không gian quản trị và nghiệp vụ
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dành cho lãnh đạo, nhân sự, kế toán và người được phân quyền xử lý dữ liệu toàn hệ thống.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ModuleCard
                    title="Xem tổng quan"
                    description="Theo dõi nhân sự, công, nghỉ phép, lương, văn bản và trạng thái hệ thống."
                    href="/dashboard"
                    icon="TQ"
                    accent="from-slate-900 to-slate-600"
                  />

                  <ModuleCard
                    title="Bổ sung, chỉnh sửa hồ sơ"
                    description="Tạo hồ sơ nhân sự, cập nhật thông tin cá nhân và mở tài khoản đăng nhập."
                    href="/people"
                    icon="NS"
                    accent="from-sky-500 to-blue-500"
                  />

                  <ModuleCard
                    title="Xem bảng công"
                    description="Xem dữ liệu chấm công theo ngày, kiểm tra công đã ghi nhận và trạng thái duyệt."
                    href="/attendance"
                    icon="BC"
                    accent="from-teal-500 to-cyan-400"
                  />

                  <ModuleCard
                    title="Duyệt chấm công"
                    description="Xử lý các bản ghi bất thường, ngoài vùng GPS hoặc cần người quản lý xác nhận."
                    href="/attendance/approvals"
                    icon="DC"
                    accent="from-amber-500 to-orange-400"
                  />

                  <ModuleCard
                    title="Phát hành văn bản"
                    description="Tạo văn bản, phân quyền xem, quản lý phiên bản file và phát hành nội bộ."
                    href="/documents/create"
                    icon="VB"
                    accent="from-indigo-500 to-sky-400"
                  />

                  <ModuleCard
                    title="Xuất phiếu lương"
                    description="Tạo kỳ lương, tính công, bổ sung phụ cấp/khấu trừ và phát hành phiếu lương."
                    href="/payroll/generate"
                    icon="PL"
                    accent="from-slate-700 to-slate-500"
                  />

                  <ModuleCard
                    title="Duyệt nghỉ phép"
                    description="Xem đơn nghỉ, duyệt hoặc từ chối yêu cầu nghỉ phép của nhân viên."
                    href="/leave/approvals"
                    icon="NP"
                    accent="from-emerald-500 to-teal-400"
                  />

                  <ModuleCard
                    title="Thông báo nội bộ"
                    description="Tạo thông báo cho người dùng và theo dõi thông báo gần đây."
                    href="/admin/notifications"
                    icon="TB"
                    accent="from-rose-500 to-amber-400"
                  />
                </div>
              </div>

              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Tình trạng hệ thống
                </h2>

                <div className="mt-5 space-y-4">
                  <InfoRow
                    label="Request API trong kỳ"
                    value={formatNumber(
                      dashboard.system.api_requests_in_period,
                    )}
                    note={`${formatNumber(dashboard.system.failed_api_requests)} lỗi`}
                  />

                  <InfoRow
                    label="Văn bản"
                    value={formatNumber(dashboard.documents.total_documents)}
                    note={`${formatNumber(dashboard.documents.published_documents)} đã ban hành`}
                  />

                  <InfoRow
                    label="Phiếu lương"
                    value={formatNumber(dashboard.payroll.payslips)}
                    note={formatCurrency(dashboard.payroll.total_net_pay)}
                  />

                  <InfoRow
                    label="Chấm công chờ duyệt"
                    value={formatNumber(dashboard.attendance.pending_logs)}
                    note={`${formatNumber(dashboard.attendance.total_logs)} bản ghi`}
                  />

                  <InfoRow
                    label="Đơn nghỉ chờ duyệt"
                    value={formatNumber(dashboard.leave.pending_requests)}
                    note={`${formatNumber(dashboard.leave.total_requests)} đơn nghỉ`}
                  />
                </div>
              </div>
            </section>

            <section className="fts-card rounded-[2rem] p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Thông báo gần đây
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Hiển thị 5 thông báo mới nhất của tài khoản hiện tại.
                  </p>
                </div>

                <a
                  href="/admin/notifications"
                  className="rounded-2xl bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                >
                  Mở thông báo →
                </a>
              </div>

              <div className="mt-5 grid gap-3">
                {(notifications?.items || []).slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.message}
                        </p>
                      </div>

                      <NotificationBadge read={Boolean(item.read_at)} />
                    </div>
                  </div>
                ))}

                {!notifications?.items?.length ? (
                  <div className="rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                    Chưa có thông báo.
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function InfoRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <p className="text-2xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function NotificationBadge({ read }: { read: boolean }) {
  const className = read
    ? "bg-slate-100 text-slate-600 ring-slate-200"
    : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {read ? "Đã đọc" : "Chưa đọc"}
    </span>
  );
}
