"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getCurrentUser } from "@/lib/auth";
import type { AuthUser } from "@/types/api";

type TopbarProps = {
  onOpenSidebar?: () => void;
};

const pageTitleMap: Record<string, string> = {
  "/attendance/qr": "QR chấm công",
  "/employee/attendance": "Bảng công của tôi",
  "/employee/leave": "Nghỉ phép của tôi",
  "/employee/payroll": "Phiếu lương của tôi",
  "/employee/documents": "Văn bản của tôi",
  "/employee/directory": "Danh bạ nhân viên",
  "/employee/notifications": "Thông báo của tôi",
  "/employee/profile": "Hồ sơ cá nhân",
  "/employee/attendance/qr": "Quét QR chấm công",
  "/employee": "Trang nhân viên",
  "/attendance/checkin": "Sinh QR chấm công",
  "/employee/leave/request": "Tạo đơn nghỉ",
  "/payroll/my": "Phiếu lương của tôi",
  "/dashboard": "Tổng quan quản trị",
  "/people": "Quản lý nhân sự",
  "/attendance/approvals": "Duyệt chấm công",
  "/attendance": "Bảng công",
  "/leave/approvals": "Duyệt nghỉ phép",
  "/leave": "Quản lý nghỉ phép",
  "/payroll/generate": "Xuất phiếu lương",
  "/payroll": "Quản lý lương",
  "/documents/create": "Phát hành văn bản",
  "/documents": "Quản lý văn bản",
  "/admin": "Trang quản trị",
  "/profile": "Hồ sơ cá nhân",
  "/change-password": "Đổi mật khẩu",
};

const employeePortalPrefixes = [
  "/employee",
  "/change-password",
  "/employee/leave/request",
  "/payroll/my",
];

function getPageTitle(pathname: string) {
  const found = Object.keys(pageTitleMap)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname === key || pathname.startsWith(key + "/"));

  return found ? pageTitleMap[found] : "Văn phòng số";
}

function isEmployeePortal(pathname: string) {
  return employeePortalPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setUser(getCurrentUser<AuthUser>());
    });
  }, []);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const employeePortal = isEmployeePortal(pathname);
  const notificationHref = employeePortal
    ? "/employee/notifications"
    : "/admin/notifications";

  const displayName = mounted
    ? user?.username || user?.email_dang_nhap || "Người dùng"
    : "Người dùng";

  const displayEmail = mounted
    ? user?.email_dang_nhap || "Đang đăng nhập"
    : "Đang đăng nhập";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 lg:hidden"
            aria-label="Mở menu"
          >
            â˜°
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "h-2 w-2 rounded-full shadow-lg",
                  employeePortal
                    ? "bg-teal-400 shadow-teal-200"
                    : "bg-slate-950 shadow-slate-300",
                ].join(" ")}
              />
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                {employeePortal ? "Cổng nhân viên" : "Cổng quản trị"}
              </p>
            </div>

            <h2 className="mt-1 truncate text-xl font-black text-slate-950">
              {getPageTitle(pathname)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={notificationHref}
            className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-lg text-amber-700 ring-1 ring-amber-100 transition hover:bg-amber-100 md:flex"
            title="Thông báo"
          >
            !
          </a>

          <a
            href={employeePortal ? "/employee/profile" : "/profile"}
            className="hidden rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 md:inline-flex"
          >
            Hồ sơ
          </a>

          <div className="hidden rounded-2xl bg-white px-4 py-2 text-right ring-1 ring-slate-200 sm:block">
            <p className="max-w-[180px] truncate text-sm font-black text-slate-950">
              {displayName}
            </p>
            <p className="max-w-[180px] truncate text-xs text-slate-500">
              {displayEmail}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}

