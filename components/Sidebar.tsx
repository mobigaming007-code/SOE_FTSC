"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_PORTAL_ROLES,
  canAccessAdminPortal,
  canShowMenuItemForRoles,
} from "@/lib/permissions";

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
  permissions?: string[];
  roles?: string[];
};

type MenuItem = {
  label: string;
  href: string;
  marker: string;
  roles: string[];
};

const leadershipRoles = [
  "CHU_TICH",
  "PHO_CHU_TICH",
  "GIAM_DOC",
  "PHO_GIAM_DOC",
  "TONG_CHU_NHIEM",
  "PHO_TONG_CHU_NHIEM",
  "CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_TT_CHI_NHANH",
];

const unitManagerRoles = [
  "TRUONG_DON_VI",
  "PHO_DON_VI",
  "TRUONG_PHONG",
  "PHO_TRUONG_PHONG",
  "TRUONG_BAN",
  "PHO_TRUONG_BAN",
  "TRUONG_BAN_CHI_NHANH",
  "PHO_TRUONG_BAN_CHI_NHANH",
  "CHANH_VAN_PHONG",
  "PHO_CHANH_VAN_PHONG",
  "CHANH_VAN_PHONG_CHI_NHANH",
  "PHO_CHANH_VAN_PHONG_CHI_NHANH",
];

const attendanceAdminRoles = [
  "SUPER_ADMIN",
  "HR",
  ...leadershipRoles,
  ...unitManagerRoles,
];

const leaveAdminRoles = attendanceAdminRoles;
const peopleAdminRoles = ["SUPER_ADMIN", "HR", ...leadershipRoles, ...unitManagerRoles];
const payrollAdminRoles = [
  "SUPER_ADMIN",
  "CHU_TICH",
  "PHO_CHU_TICH",
  "GIAM_DOC",
  "PHO_GIAM_DOC",
  "KE_TOAN",
  "HR",
];
const documentAdminRoles = [
  "SUPER_ADMIN",
  "HR",
  ...leadershipRoles,
  ...unitManagerRoles,
];
const configAdminRoles = ["SUPER_ADMIN"];

const employeeItems: MenuItem[] = [
  {
    label: "Trang nhân viên",
    href: "/employee",
    marker: "NV",
    roles: [],
  },
  {
    label: "Chấm công",
    href: "/employee/attendance/qr",
    marker: "CC",
    roles: [],
  },
  {
    label: "Bảng công của tôi",
    href: "/employee/attendance",
    marker: "BC",
    roles: [],
  },
  {
    label: "Nghỉ phép của tôi",
    href: "/employee/leave",
    marker: "NP",
    roles: [],
  },
  {
    label: "Văn bản của tôi",
    href: "/employee/documents",
    marker: "VB",
    roles: [],
  },
  {
    label: "Danh bạ",
    href: "/employee/directory",
    marker: "DB",
    roles: [],
  },
  {
    label: "Thông báo",
    href: "/employee/notifications",
    marker: "TB",
    roles: [],
  },
  {
    label: "Phiếu lương",
    href: "/employee/payroll",
    marker: "PL",
    roles: [],
  },
  {
    label: "Hồ sơ cá nhân",
    href: "/employee/profile",
    marker: "HS",
    roles: [],
  },
];

const adminItems: MenuItem[] = [
  {
    label: "Trang quản trị",
    href: "/admin",
    marker: "QT",
    roles: ADMIN_PORTAL_ROLES,
  },
  {
    label: "Tổng quan",
    href: "/dashboard",
    marker: "TQ",
    roles: ADMIN_PORTAL_ROLES,
  },
  {
    label: "Nhân sự",
    href: "/people",
    marker: "NS",
    roles: peopleAdminRoles,
  },
  {
    label: "Bảng công",
    href: "/attendance",
    marker: "BC",
    roles: attendanceAdminRoles,
  },
  {
    label: "Duyệt chấm công",
    href: "/attendance/approvals",
    marker: "DC",
    roles: attendanceAdminRoles,
  },
  {
    label: "QR chấm công",
    href: "/attendance/qr",
    marker: "QR",
    roles: attendanceAdminRoles,
  },
  {
    label: "Nghỉ phép",
    href: "/leave",
    marker: "NP",
    roles: leaveAdminRoles,
  },
  {
    label: "Lương",
    href: "/payroll",
    marker: "LG",
    roles: payrollAdminRoles,
  },
  {
    label: "Văn bản",
    href: "/documents",
    marker: "VB",
    roles: documentAdminRoles,
  },
  {
    label: "Cấu hình",
    href: "/admin/config",
    marker: "CH",
    roles: configAdminRoles,
  },
];

const employeePortalPrefixes = [
  "/employee",
  "/change-password",
  "/employee/leave/request",
  "/payroll/my",
];

function getPortal(pathname: string, canUseAdmin: boolean) {
  if (employeePortalPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return "employee";
  }

  return canUseAdmin ? "admin" : "employee";
}

function isRouteMatch(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function getActiveHref(pathname: string, items: MenuItem[]) {
  const matches = items
    .filter((item) => isRouteMatch(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length);

  return matches[0]?.href || "";
}

export default function Sidebar({
  mobile = false,
  onNavigate,
  permissions = [],
  roles = [],
}: SidebarProps) {
  const pathname = usePathname();
  const canUseAdmin = canAccessAdminPortal(permissions, roles);
  const portal = getPortal(pathname, canUseAdmin);
  const isAdminPortal = portal === "admin";

  const visibleItems = (isAdminPortal ? adminItems : employeeItems).filter(
    (item) => canShowMenuItemForRoles(roles, item.roles),
  );
  const activeHref = getActiveHref(pathname, visibleItems);

  return (
    <aside
      className={[
        mobile
          ? "flex h-full w-80 flex-col overflow-y-auto bg-white px-5 py-6 shadow-2xl"
          : "hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-5 py-6 shadow-xl shadow-slate-200/50 lg:flex lg:flex-col",
      ].join(" ")}
    >
      <div className="mb-6">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Fly To Sky"
              width={52}
              height={52}
              className="h-[52px] w-[52px] rounded-2xl bg-slate-50 p-2 object-contain ring-1 ring-slate-200"
              priority
            />

            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">Fly To Sky</p>
              <p className="text-xs font-bold text-slate-500">
                {isAdminPortal ? "Cổng quản trị" : "Cổng nhân viên"}
              </p>
            </div>
          </div>

          {canUseAdmin ? (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <PortalLink
                href="/employee"
                active={!isAdminPortal}
                onNavigate={onNavigate}
              >
                Nhân viên
              </PortalLink>
              <PortalLink
                href="/admin"
                active={isAdminPortal}
                onNavigate={onNavigate}
              >
                Quản trị
              </PortalLink>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {isAdminPortal ? "Khu vận hành" : "Khu cá nhân"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isAdminPortal
            ? "Dành cho lãnh đạo, nhân sự, kế toán và người duyệt nghiệp vụ."
            : "Dành cho nhân viên chấm công, xem dữ liệu cá nhân và thông báo."}
        </p>
      </div>

      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={[
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100",
                active
                  ? "bg-sky-50 text-sky-800 ring-1 ring-sky-100 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-100",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black transition duration-200",
                  active
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-slate-700",
                ].join(" ")}
              >
                {item.marker}
              </span>

              <span className="min-w-0 flex-1 truncate">{item.label}</span>

              {active ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function PortalLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "rounded-xl px-3 py-2 text-center text-xs font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100",
        active
          ? "bg-white text-sky-800 shadow-sm ring-1 ring-sky-100"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-950 active:bg-white/80",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}


