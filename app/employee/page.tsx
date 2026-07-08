"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import StatCard from "@/components/StatCard";
import ModuleCard from "@/components/ModuleCard";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getCurrentUser, getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type {
  AttendanceListData,
  AuthUser,
  LeaveBalanceData,
  LeaveListData,
  LeaveRequest,
  NotificationItem,
  NotificationListData,
  Payslip,
  PayslipListData,
} from "@/types/api";

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthText() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function EmployeeWorkspacePage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<
    LeaveBalanceData["balance"] | null
  >(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => todayText(), []);
  const currentMonth = useMemo(() => currentMonthText(), []);

  const loadWorkspace = useCallback(async function loadWorkspace() {
    setLoading(true);
    setError("");

    const currentUser = getCurrentUser<AuthUser>();
    setUser(currentUser);

    const [
      attendanceResponse,
      leaveResponse,
      balanceResponse,
      payslipResponse,
      notificationResponse,
    ] = await Promise.all([
      gasFetch<AttendanceListData>({
        path: "attendance/my",
        method: "GET",
        params: {
          ngay: today,
        },
      }),
      gasFetch<LeaveListData>({
        path: "leave/my",
        method: "GET",
      }),
      gasFetch<LeaveBalanceData>({
        path: "leave/balance",
        method: "GET",
        params: {
          nam: String(new Date().getFullYear()),
        },
      }),
      gasFetch<PayslipListData>({
        path: "payroll/payslips/my",
        method: "GET",
      }),
      gasFetch<NotificationListData>({
        path: "notifications",
        method: "GET",
        params: {
          unread_only: "FALSE",
        },
      }),
    ]);

    setLoading(false);

    if (attendanceResponse.success && attendanceResponse.data) {
      setAttendanceCount(attendanceResponse.data.items?.length || 0);
    }

    if (leaveResponse.success && leaveResponse.data) {
      setLeaveRequests(leaveResponse.data.items || []);
    }

    if (balanceResponse.success && balanceResponse.data) {
      setLeaveBalance(balanceResponse.data.balance);
    }

    if (payslipResponse.success && payslipResponse.data) {
      setPayslips(payslipResponse.data.items || []);
    }

    if (notificationResponse.success && notificationResponse.data) {
      setNotifications(notificationResponse.data.items || []);
      setUnreadNotifications(notificationResponse.data.unread || 0);
    }

    const failedMessages = [
      attendanceResponse.success ? "" : attendanceResponse.message,
      leaveResponse.success ? "" : leaveResponse.message,
      balanceResponse.success ? "" : balanceResponse.message,
      payslipResponse.success ? "" : payslipResponse.message,
      notificationResponse.success ? "" : notificationResponse.message,
    ].filter(Boolean);

    if (failedMessages.length > 0) {
      setError(
        "Một số dữ liệu cá nhân chưa tải được. Bạn vẫn có thể dùng các chức năng khác.",
      );
    }
  }, [today]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadWorkspace();
    });
  }, [loadWorkspace, router]);

  const pendingLeave = leaveRequests.filter(
    (item) => item.trang_thai === "PENDING",
  ).length;

  const latestPayslip = payslips[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-black text-sky-50 ring-1 ring-white/20">
                Employee Workspace
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
                Xin chào, {user?.username || user?.email_dang_nhap || "bạn"} 
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50 md:text-base">
                Đây là không gian làm việc cá nhân của bạn. Bạn có thể chấm
                công, xin nghỉ, xem phép, xem phiếu lương, đọc văn bản và theo
                dõi thông báo.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20">
                  Hôm nay: {today}
                </span>
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20">
                  Tháng: {currentMonth}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/employee/attendance/qr"
                className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
              >
                Chấm công ngay
              </Link>

              <Link
                href="/employee/leave/request"
                className="rounded-2xl bg-white/15 px-5 py-3 text-center text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/25"
              >
                Tạo đơn nghỉ
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingBlock text="Đang tải không gian làm việc..." />
        ) : null}

        {error ? <ErrorBox message={error} /> : null}

        {!loading ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Chấm công hôm nay"
                value={formatNumber(attendanceCount)}
                subtitle={
                  attendanceCount > 0
                    ? "Đã có bản ghi chấm công hôm nay"
                    : "Chưa có bản ghi hôm nay"
                }
                icon="CC"
                tone={attendanceCount > 0 ? "teal" : "gold"}
              />

              <StatCard
                title="Phép còn lại"
                value={formatNumber(leaveBalance?.con_lai || 0)}
                subtitle={`${formatNumber(leaveBalance?.dang_cho_duyet || 0)} ngày đang chờ duyệt`}
                icon="PN"
                tone="sky"
              />

              <StatCard
                title="Đơn nghỉ chờ duyệt"
                value={formatNumber(pendingLeave)}
                subtitle={`${formatNumber(leaveRequests.length)} đơn nghỉ của tôi`}
                icon="CD"
                tone="gold"
              />

              <StatCard
                title="Thông báo chưa đọc"
                value={formatNumber(unreadNotifications)}
                subtitle={`${formatNumber(notifications.length)} thông báo`}
                icon="TB"
                tone={unreadNotifications > 0 ? "rose" : "teal"}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Việc cần làm nhanh
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ModuleCard
                    title="Chấm công"
                    description="Check-in, check-out bằng GPS hoặc QR."
                    href="/employee/attendance/qr"
                    icon="QR"
                    accent="from-sky-500 to-teal-400"
                  />

                  <ModuleCard
                    title="Xin nghỉ"
                    description="Tạo đơn nghỉ phép, nghỉ không lương hoặc công tác."
                    href="/employee/leave/request"
                    icon="NP"
                    accent="from-amber-500 to-orange-400"
                  />

                  <ModuleCard
                    title="Bảng công của tôi"
                    description="Xem lịch sử công, đi trễ, về sớm và trạng thái chấm công."
                    href="/employee/attendance"
                    icon="BC"
                    accent="from-indigo-500 to-sky-400"
                  />

                  <ModuleCard
                    title="Phiếu lương"
                    description="Xem phiếu lương cá nhân và chi tiết thực nhận."
                    href="/employee/payroll"
                    icon="PL"
                    accent="from-slate-800 to-slate-500"
                  />

                  <ModuleCard
                    title="Văn bản của tôi"
                    description="Xem các văn bản đã ban hành mà bạn được phân quyền truy cập."
                    href="/employee/documents"
                    icon="VB"
                    accent="from-indigo-500 to-sky-400"
                  />

                  <ModuleCard
                    title="Thông báo"
                    description="Đọc thông báo nội bộ được gửi tới tài khoản của bạn."
                    href="/employee/notifications"
                    icon="TB"
                    accent="from-rose-500 to-amber-400"
                  />

                  <ModuleCard
                    title="Hồ sơ cá nhân"
                    description="Xem thông tin tài khoản, vai trò và quyền truy cập hiện tại."
                    href="/employee/profile"
                    icon="HS"
                    accent="from-teal-500 to-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="fts-card rounded-[2rem] p-6">
                  <h2 className="text-xl font-black text-slate-950">
                    Phiếu lương mới nhất
                  </h2>

                  {latestPayslip ? (
                    <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                      <p className="text-sm font-bold text-slate-500">
                        Thực nhận
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950">
                        {formatCurrency(latestPayslip.thuc_nhan_encrypted)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Công: {formatNumber(latestPayslip.tong_cong)} · Trạng
                        thái: <b>{formatStatus(latestPayslip.trang_thai)}</b>
                      </p>

                      <Link
                        href="/employee/payroll"
                        className="mt-5 inline-flex rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100"
                      >
                        Xem phiếu lương →
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                      Chưa có phiếu lương.
                    </div>
                  )}
                </div>

                <div className="fts-card rounded-[2rem] p-6">
                  <h2 className="text-xl font-black text-slate-950">
                    Thông báo mới
                  </h2>

                  <div className="mt-5 space-y-3">
                    {notifications.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl bg-white p-4 ring-1 ring-slate-100"
                      >
                        <p className="text-sm font-black text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                          {item.message}
                        </p>
                      </div>
                    ))}

                    {notifications.length === 0 ? (
                      <p className="rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                        Chưa có thông báo.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

