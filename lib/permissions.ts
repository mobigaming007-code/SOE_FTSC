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

function hasAnyExplicitPermission(
  permissions: string[] | undefined,
  requiredPermissions: string[],
) {
  if (!requiredPermissions.length) {
    return false;
  }

  const list = permissions || [];

  if (list.length === 0) {
    return false;
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

export const COMPANY_ADMIN_ROLES = [
  "GIAM_DOC",
  "PHO_GIAM_DOC",
  "CHU_TICH",
  "PHO_CHU_TICH",
  "HR",
  "KE_TOAN",
  "TRUONG_PHONG",
  "PHO_TRUONG_PHONG",
  "TRUONG_DON_VI",
  "PHO_DON_VI",
];

export const CLUB_TOTAL_ADMIN_ROLES = [
  "TONG_CHU_NHIEM",
  "PHO_TONG_CHU_NHIEM",
  "TRUONG_BAN",
  "PHO_TRUONG_BAN",
  "CHANH_VAN_PHONG",
  "PHO_CHANH_VAN_PHONG",
  "TRUONG_PHONG",
  "PHO_TRUONG_PHONG",
];

export const CLUB_BRANCH_ADMIN_ROLES = [
  "CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_TT_CHI_NHANH",
  "CHANH_VAN_PHONG_CHI_NHANH",
  "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "TRUONG_BAN_CHI_NHANH",
  "PHO_TRUONG_BAN_CHI_NHANH",
];

export const ADMIN_PORTAL_ROLES = Array.from(
  new Set([
    "SUPER_ADMIN",
    ...COMPANY_ADMIN_ROLES,
    ...CLUB_TOTAL_ADMIN_ROLES,
    ...CLUB_BRANCH_ADMIN_ROLES,
  ]),
);

export const EMPLOYEE_ONLY_ROLES = [
  "CHUYEN_VIEN",
  "THUC_TAP_SINH",
  "TINH_NGUYEN_VIEN",
  "NGUOI_XEM",
  "THANH_VIEN",
];

export const ADMIN_PORTAL_PERMISSIONS = [
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
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPERADMIN: "SUPER_ADMIN",
  "SUPER ADMIN": "SUPER_ADMIN",
  ROOT: "SUPER_ADMIN",
  "QUẢN TRỊ TỐI CAO": "SUPER_ADMIN",
  "QUAN TRI TOI CAO": "SUPER_ADMIN",

  CHU_TICH: "CHU_TICH",
  "CHỦ TỊCH": "CHU_TICH",
  "CHU TICH": "CHU_TICH",

  PHO_CHU_TICH: "PHO_CHU_TICH",
  "PHÓ CHỦ TỊCH": "PHO_CHU_TICH",
  "PHO CHU TICH": "PHO_CHU_TICH",

  GIAM_DOC: "GIAM_DOC",
  "GIÁM ĐỐC": "GIAM_DOC",
  "GIAM DOC": "GIAM_DOC",

  PHO_GIAM_DOC: "PHO_GIAM_DOC",
  "PHÓ GIÁM ĐỐC": "PHO_GIAM_DOC",
  "PHO GIAM DOC": "PHO_GIAM_DOC",

  HR: "HR",
  "NHÂN SỰ": "HR",
  "NHAN SU": "HR",
  "NHÂN SỰ HR": "HR",
  "NHAN SU HR": "HR",
  "NHÂN SỰ/HR": "HR",
  "NHÂN SỰ/ HR": "HR",
  "NHAN SU/HR": "HR",
  "NHAN SU/ HR": "HR",

  KE_TOAN: "KE_TOAN",
  "KẾ TOÁN": "KE_TOAN",
  "KE TOAN": "KE_TOAN",

  TRUONG_PHONG: "TRUONG_PHONG",
  "TRƯỞNG PHÒNG": "TRUONG_PHONG",
  "TRUONG PHONG": "TRUONG_PHONG",

  PHO_TRUONG_PHONG: "PHO_TRUONG_PHONG",
  "PHÓ TRƯỞNG PHÒNG": "PHO_TRUONG_PHONG",
  "PHO TRUONG PHONG": "PHO_TRUONG_PHONG",

  TRUONG_DON_VI: "TRUONG_DON_VI",
  "TRƯỞNG ĐƠN VỊ": "TRUONG_DON_VI",
  "TRUONG DON VI": "TRUONG_DON_VI",
  "QUẢN LÝ": "TRUONG_DON_VI",
  "QUAN LY": "TRUONG_DON_VI",
  "QUẢN LÝ TRƯỞNG ĐƠN VỊ": "TRUONG_DON_VI",
  "QUAN LY TRUONG DON VI": "TRUONG_DON_VI",
  "QUẢN LÝ/ TRƯỞNG ĐƠN VỊ": "TRUONG_DON_VI",
  "QUAN LY/ TRUONG DON VI": "TRUONG_DON_VI",

  PHO_DON_VI: "PHO_DON_VI",
  "PHÓ ĐƠN VỊ": "PHO_DON_VI",
  "PHO DON VI": "PHO_DON_VI",

  TONG_CHU_NHIEM: "TONG_CHU_NHIEM",
  "TỔNG CHỦ NHIỆM": "TONG_CHU_NHIEM",
  "TONG CHU NHIEM": "TONG_CHU_NHIEM",

  PHO_TONG_CHU_NHIEM: "PHO_TONG_CHU_NHIEM",
  "PHÓ TỔNG CHỦ NHIỆM": "PHO_TONG_CHU_NHIEM",
  "PHO TONG CHU NHIEM": "PHO_TONG_CHU_NHIEM",

  TRUONG_BAN: "TRUONG_BAN",
  "TRƯỞNG BAN": "TRUONG_BAN",
  "TRUONG BAN": "TRUONG_BAN",

  PHO_TRUONG_BAN: "PHO_TRUONG_BAN",
  "PHÓ TRƯỞNG BAN": "PHO_TRUONG_BAN",
  "PHO TRUONG BAN": "PHO_TRUONG_BAN",

  CHANH_VAN_PHONG: "CHANH_VAN_PHONG",
  "CHÁNH VĂN PHÒNG": "CHANH_VAN_PHONG",
  "CHANH VAN PHONG": "CHANH_VAN_PHONG",
  "CHÁNH VĂN PHÒNG BAN CHỦ NHIỆM NHÓM": "CHANH_VAN_PHONG",
  "CHANH VAN PHONG BAN CHU NHIEM NHOM": "CHANH_VAN_PHONG",
  "CHÁNH VP BCN NHÓM": "CHANH_VAN_PHONG",
  "CHANH VP BCN NHOM": "CHANH_VAN_PHONG",
  CHANH_VP_BCN: "CHANH_VAN_PHONG",

  PHO_CHANH_VAN_PHONG: "PHO_CHANH_VAN_PHONG",
  "PHÓ CHÁNH VĂN PHÒNG": "PHO_CHANH_VAN_PHONG",
  "PHO CHANH VAN PHONG": "PHO_CHANH_VAN_PHONG",
  "PHÓ CHÁNH VĂN PHÒNG BAN CHỦ NHIỆM NHÓM": "PHO_CHANH_VAN_PHONG",
  "PHO CHANH VAN PHONG BAN CHU NHIEM NHOM": "PHO_CHANH_VAN_PHONG",
  "PHÓ CHÁNH VP BCN NHÓM": "PHO_CHANH_VAN_PHONG",
  "PHO CHANH VP BCN NHOM": "PHO_CHANH_VAN_PHONG",

  CHU_NHIEM_CHI_NHANH: "CHU_NHIEM_CHI_NHANH",
  "CHỦ NHIỆM CHI NHÁNH": "CHU_NHIEM_CHI_NHANH",
  "CHU NHIEM CHI NHANH": "CHU_NHIEM_CHI_NHANH",

  PHO_CHU_NHIEM_CHI_NHANH: "PHO_CHU_NHIEM_CHI_NHANH",
  "PHÓ CHỦ NHIỆM CHI NHÁNH": "PHO_CHU_NHIEM_CHI_NHANH",
  "PHO CHU NHIEM CHI NHANH": "PHO_CHU_NHIEM_CHI_NHANH",

  PHO_CHU_NHIEM_TT_CHI_NHANH: "PHO_CHU_NHIEM_TT_CHI_NHANH",
  "PHÓ CHỦ NHIỆM THƯỜNG TRỰC CHI NHÁNH": "PHO_CHU_NHIEM_TT_CHI_NHANH",
  "PHO CHU NHIEM THUONG TRUC CHI NHANH": "PHO_CHU_NHIEM_TT_CHI_NHANH",

  CHANH_VAN_PHONG_CHI_NHANH: "CHANH_VAN_PHONG_CHI_NHANH",
  "CHÁNH VĂN PHÒNG BAN CHỦ NHIỆM CHI NHÁNH": "CHANH_VAN_PHONG_CHI_NHANH",
  "CHANH VAN PHONG BAN CHU NHIEM CHI NHANH": "CHANH_VAN_PHONG_CHI_NHANH",
  "CHÁNH VĂN PHÒNG CHI NHÁNH": "CHANH_VAN_PHONG_CHI_NHANH",
  "CHANH VAN PHONG CHI NHANH": "CHANH_VAN_PHONG_CHI_NHANH",

  PHO_CHANH_VAN_PHONG_CHI_NHANH: "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHÓ CHÁNH VĂN PHÒNG BAN CHỦ NHIỆM CHI NHÁNH": "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHO CHANH VAN PHONG BAN CHU NHIEM CHI NHANH": "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHÓ CHÁNH VĂN PHÒNG CHI NHÁNH": "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "PHO CHANH VAN PHONG CHI NHANH": "PHO_CHANH_VAN_PHONG_CHI_NHANH",

  TRUONG_BAN_CHI_NHANH: "TRUONG_BAN_CHI_NHANH",
  "TRƯỞNG BAN THUỘC CHI NHÁNH": "TRUONG_BAN_CHI_NHANH",
  "TRUONG BAN THUOC CHI NHANH": "TRUONG_BAN_CHI_NHANH",
  "TRƯỞNG BAN CHI NHÁNH": "TRUONG_BAN_CHI_NHANH",
  "TRUONG BAN CHI NHANH": "TRUONG_BAN_CHI_NHANH",

  PHO_TRUONG_BAN_CHI_NHANH: "PHO_TRUONG_BAN_CHI_NHANH",
  "PHÓ TRƯỞNG BAN THUỘC CHI NHÁNH": "PHO_TRUONG_BAN_CHI_NHANH",
  "PHO TRUONG BAN THUOC CHI NHANH": "PHO_TRUONG_BAN_CHI_NHANH",
  "PHÓ TRƯỞNG BAN CHI NHÁNH": "PHO_TRUONG_BAN_CHI_NHANH",
  "PHO TRUONG BAN CHI NHANH": "PHO_TRUONG_BAN_CHI_NHANH",

  CHUYEN_VIEN: "CHUYEN_VIEN",
  "CHUYÊN VIÊN": "CHUYEN_VIEN",
  "CHUYEN VIEN": "CHUYEN_VIEN",

  THUC_TAP_SINH: "THUC_TAP_SINH",
  "THỰC TẬP SINH": "THUC_TAP_SINH",
  "THUC TAP SINH": "THUC_TAP_SINH",

  TINH_NGUYEN_VIEN: "TINH_NGUYEN_VIEN",
  "TÌNH NGUYỆN VIÊN": "TINH_NGUYEN_VIEN",
  "TINH NGUYEN VIEN": "TINH_NGUYEN_VIEN",

  NGUOI_XEM: "NGUOI_XEM",
  "NGƯỜI XEM": "NGUOI_XEM",
  "NGUOI XEM": "NGUOI_XEM",

  THANH_VIEN: "THANH_VIEN",
  "THÀNH VIÊN": "THANH_VIEN",
  "THANH VIEN": "THANH_VIEN",
};

function stripVietnameseMarks(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d");
}

function normalizeRoleLookupKey(role: string) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\\/|,;:.()\[\]{}\-]+/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRoleCode(role: string) {
  const original = String(role || "").trim();
  const upper = original.toUpperCase();
  const codeLike = upper.replace(/\s+/g, "_");
  const key = normalizeRoleLookupKey(original);
  const unsignedKey = normalizeRoleLookupKey(stripVietnameseMarks(original));
  const underscoreKey = key.replace(/\s+/g, "_");
  const unsignedUnderscoreKey = unsignedKey.replace(/\s+/g, "_");

  return (
    ROLE_ALIASES[upper] ||
    ROLE_ALIASES[codeLike] ||
    ROLE_ALIASES[key] ||
    ROLE_ALIASES[unsignedKey] ||
    ROLE_ALIASES[underscoreKey] ||
    ROLE_ALIASES[unsignedUnderscoreKey] ||
    unsignedUnderscoreKey
  );
}

export function normalizeRoleList(roles: string[] | undefined) {
  return Array.from(
    new Set((roles || []).map((role) => normalizeRoleCode(role)).filter(Boolean)),
  );
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

  const roleList = normalizeRoleList(roles);

  return roleList.some((role) => ADMIN_PORTAL_ROLES.includes(role));
}

export function canShowMenuItemForRoles(
  roles: string[] | undefined,
  allowedRoles: string[],
) {
  if (!allowedRoles.length) {
    return true;
  }

  const roleList = normalizeRoleList(roles);

  return roleList.some((role) =>
    role === "SUPER_ADMIN" || allowedRoles.includes(role),
  );
}

export function canShowAdminMenuItem(
  permissions: string[] | undefined,
  roles: string[] | undefined,
  allowedRoles: string[],
  requiredPermissions: string[] = [],
) {
  if ((permissions || []).includes("*") || (permissions || []).includes("SUPER_ADMIN")) {
    return true;
  }

  if (hasAnyExplicitPermission(permissions, requiredPermissions)) {
    return true;
  }

  return canShowMenuItemForRoles(roles, allowedRoles);
}
