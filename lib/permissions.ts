export function hasPermission(
  permissions: string[] | undefined,
  permissionCode: string,
) {
  const list = permissions || [];

  if (list.length === 0) {
    return true;
  }

  if (list.includes("*")) {
    return true;
  }

  if (list.includes("SUPER_ADMIN")) {
    return true;
  }

  return list.includes(permissionCode);
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  requiredPermissions: string[],
) {
  if (!requiredPermissions.length) {
    return true;
  }

  const list = permissions || [];

  if (list.length === 0) {
    return true;
  }

  if (list.includes("*") || list.includes("SUPER_ADMIN")) {
    return true;
  }

  return requiredPermissions.some((permission) => list.includes(permission));
}

export function canShowMenuItem(
  permissions: string[] | undefined,
  requiredPermissions: string[],
) {
  return hasAnyPermission(permissions, requiredPermissions);
}

export const ADMIN_PORTAL_ROLES = [
  "SUPER_ADMIN",
  "GIAM_DOC",
  "PHO_GIAM_DOC",
  "CHU_TICH",
  "PHO_CHU_TICH",
  "HR",
  "KE_TOAN",
  "TRUONG_DON_VI",
  "PHO_DON_VI",
  "TRUONG_PHONG",
  "PHO_TRUONG_PHONG",
  "CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_CHI_NHANH",
  "TONG_CHU_NHIEM",
  "PHO_TONG_CHU_NHIEM",
  "CHANH_VAN_PHONG",
  "TRUONG_BAN",
  "PHO_CHANH_VAN_PHONG",
  "CHANH_VAN_PHONG_CHI_NHANH",
  "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHO_CHU_NHIEM_TT_CHI_NHANH",
  "PHO_TRUONG_BAN",
  "TRUONG_BAN_CHI_NHANH",
  "PHO_TRUONG_BAN_CHI_NHANH",
];

export const EMPLOYEE_ONLY_ROLES = [
  "CHUYEN_VIEN",
  "THUC_TAP_SINH",
  "TINH_NGUYEN_VIEN",
  "NGUOI_XEM",
  "THANH_VIEN",
];

const ADMIN_PORTAL_PERMISSIONS = [
  "admin.manage_users",
  "admin.manage_config",
  "people.view",
  "people.update",
  "attendance.view",
  "attendance.approve",
  "leave.view",
  "leave.approve",
  "payroll.view",
  "payroll.manage",
  "documents.view",
  "documents.manage",
];

const ROLE_ALIASES: Record<string, string> = {
  "QUẢN TRỊ TỐI CAO": "SUPER_ADMIN",
  "QUAN TRI TOI CAO": "SUPER_ADMIN",
  "GIÁM ĐỐC": "GIAM_DOC",
  "GIAM DOC": "GIAM_DOC",
  "PHÓ GIÁM ĐỐC": "PHO_GIAM_DOC",
  "PHO GIAM DOC": "PHO_GIAM_DOC",
  "CHỦ TỊCH": "CHU_TICH",
  "CHU TICH": "CHU_TICH",
  "PHÓ CHỦ TỊCH": "PHO_CHU_TICH",
  "PHO CHU TICH": "PHO_CHU_TICH",
  "TRƯỞNG ĐƠN VỊ": "TRUONG_DON_VI",
  "TRUONG DON VI": "TRUONG_DON_VI",
  "TRƯỞNG PHÒNG": "TRUONG_PHONG",
  "TRUONG PHONG": "TRUONG_PHONG",
  "QUẢN LÝ": "TRUONG_DON_VI",
  "QUAN LY": "TRUONG_DON_VI",
  QUAN_LY: "TRUONG_DON_VI",
  MANAGER: "TRUONG_DON_VI",
  CHANH_VP_BCN: "CHANH_VAN_PHONG",
  "CHANH VAN PHONG BAN CHU NHIEM NHOM": "CHANH_VAN_PHONG",
  "CHANH VAN PHONG BAN CHU NHIEM CHI NHANH":
    "CHANH_VAN_PHONG_CHI_NHANH",
  "PHO CHANH VAN PHONG BAN CHU NHIEM CHI NHANH":
    "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHÓ ĐƠN VỊ": "PHO_DON_VI",
  "PHO DON VI": "PHO_DON_VI",
  "PHÓ TRƯỞNG PHÒNG": "PHO_TRUONG_PHONG",
  "PHO TRUONG PHONG": "PHO_TRUONG_PHONG",
  THANH_VIEN: "TINH_NGUYEN_VIEN",
  "THÀNH VIÊN": "TINH_NGUYEN_VIEN",
  "THANH VIEN": "TINH_NGUYEN_VIEN",
  "TÌNH NGUYỆN VIÊN": "TINH_NGUYEN_VIEN",
  "TINH NGUYEN VIEN": "TINH_NGUYEN_VIEN",
  "PHÓ TỔNG CHỦ NHIỆM": "PHO_TONG_CHU_NHIEM",
  "PHO TONG CHU NHIEM": "PHO_TONG_CHU_NHIEM",
  "TRƯỞNG BAN THUỘC CHI NHÁNH": "TRUONG_BAN_CHI_NHANH",
  "TRUONG BAN THUOC CHI NHANH": "TRUONG_BAN_CHI_NHANH",
  "PHÓ TRƯỞNG BAN THUỘC CHI NHÁNH": "PHO_TRUONG_BAN_CHI_NHANH",
  "PHO TRUONG BAN THUOC CHI NHANH": "PHO_TRUONG_BAN_CHI_NHANH",
  "KẾ TOÁN": "KE_TOAN",
  "KE TOAN": "KE_TOAN",
  "NHÂN SỰ": "HR",
  "NHAN SU": "HR",
};

function normalizeRoleCode(role: string) {
  const text = String(role || "").trim().toUpperCase();

  return ROLE_ALIASES[text] || text;
}

export function canAccessAdminPortal(
  permissions: string[] | undefined,
  roles: string[] | undefined,
) {
  const permissionList = permissions || [];

  if (
    permissionList.includes("*") ||
    permissionList.includes("SUPER_ADMIN") ||
    ADMIN_PORTAL_PERMISSIONS.some((permission) =>
      permissionList.includes(permission),
    )
  ) {
    return true;
  }

  const roleList = (roles || []).map((role) => normalizeRoleCode(role));

  return roleList.some((role) => ADMIN_PORTAL_ROLES.includes(role));
}

export function canShowMenuItemForRoles(
  roles: string[] | undefined,
  allowedRoles: string[],
) {
  if (!allowedRoles.length) {
    return true;
  }

  const roleList = (roles || []).map((role) => normalizeRoleCode(role));

  return roleList.some((role) =>
    role === "SUPER_ADMIN" || allowedRoles.includes(role),
  );
}
