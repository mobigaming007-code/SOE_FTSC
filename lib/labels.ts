const statusLabels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  DELETED: "Đã xóa",
  DRAFT: "Bản nháp",
  CALCULATED: "Đã tính",
  FINALIZED: "Đã chốt",
  CLOSED: "Đã đóng",
  SENT: "Đã gửi",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  VALID: "Hợp lệ",
  INVALID: "Không hợp lệ",
  OUT_OF_GEOFENCE: "Ngoài phạm vi GPS",
  PUBLISHED: "Đã ban hành",
  ARCHIVED: "Lưu trữ",
  PUBLIC: "Công khai",
  INTERNAL: "Nội bộ",
  CONFIDENTIAL: "Mật",
  SECRET: "Tối mật",
  UNKNOWN: "Không xác định",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Quản trị tối cao",
  GIAM_DOC: "Giám đốc",
  PHO_GIAM_DOC: "Phó Giám đốc",
  CHU_TICH: "Chủ tịch",
  PHO_CHU_TICH: "Phó Chủ tịch",
  HR: "Nhân sự/HR",
  KE_TOAN: "Kế toán",
  TRUONG_DON_VI: "Trưởng đơn vị",
  PHO_DON_VI: "Phó đơn vị",
  TRUONG_PHONG: "Trưởng Phòng",
  PHO_TRUONG_PHONG: "Phó Trưởng Phòng",
  CHUYEN_VIEN: "Chuyên viên",
  THUC_TAP_SINH: "Thực tập sinh",
  NGUOI_XEM: "Người xem",
  CHU_NHIEM_CHI_NHANH: "Chủ nhiệm Chi nhánh",
  PHO_CHU_NHIEM_CHI_NHANH: "Phó Chủ nhiệm Chi nhánh",
  TINH_NGUYEN_VIEN: "Tình nguyện viên",
  THANH_VIEN: "Tình nguyện viên",
  TONG_CHU_NHIEM: "Tổng Chủ nhiệm",
  PHO_TONG_CHU_NHIEM: "Phó Tổng Chủ nhiệm",
  CHANH_VAN_PHONG: "Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  TRUONG_BAN: "Trưởng Ban",
  PHO_CHANH_VAN_PHONG: "Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  CHANH_VAN_PHONG_CHI_NHANH: "Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  PHO_CHANH_VAN_PHONG_CHI_NHANH: "Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  PHO_CHU_NHIEM_TT_CHI_NHANH: "Phó Chủ nhiệm Thường trực Chi nhánh",
  PHO_TRUONG_BAN: "Phó Trưởng Ban",
  TRUONG_BAN_CHI_NHANH: "Trưởng Ban thuộc Chi nhánh",
  PHO_TRUONG_BAN_CHI_NHANH: "Phó Trưởng Ban thuộc Chi nhánh",
};

const permissionLabels: Record<string, string> = {
  "people.view": "Xem hồ sơ nhân sự",
  "people.create": "Tạo hồ sơ nhân sự",
  "people.update": "Cập nhật hồ sơ nhân sự",
  "people.delete": "Xóa hồ sơ nhân sự",
  "org.view": "Xem cơ cấu tổ chức",
  "org.update": "Cập nhật cơ cấu tổ chức",
  "attendance.view": "Xem chấm công",
  "attendance.update": "Cập nhật chấm công",
  "attendance.approve": "Duyệt chấm công",
  "leave.view": "Xem nghỉ phép",
  "leave.approve": "Duyệt nghỉ phép",
  "payroll.view": "Xem lương",
  "payroll.update": "Cập nhật lương",
  "payroll.approve": "Duyệt/chốt lương",
  "documents.view": "Xem văn bản",
  "documents.create": "Tạo văn bản",
  "documents.update": "Cập nhật văn bản",
  "documents.approve": "Duyệt văn bản",
  "admin.config": "Quản trị cấu hình hệ thống",
  "admin.users": "Quản trị tài khoản",
  "audit.view": "Xem nhật ký hệ thống",
};

const documentPermissionLabels: Record<string, string> = {
  VIEW: "Xem",
  EDIT: "Sửa",
  APPROVE: "Duyệt",
  OWNER: "Chủ sở hữu",
};

const permissionTargetTypeLabels: Record<string, string> = {
  USER: "Người dùng",
  ROLE: "Vai trò",
  ORG_UNIT: "Đơn vị",
};

const payrollItemLabels: Record<string, string> = {
  BASE_SALARY: "Lương cơ bản",
  WORK_DAYS: "Công thực tế",
  PAID_LEAVE: "Phép tính lương",
  SALARY_BY_WORK: "Lương theo công",
  ALLOWANCE: "Phụ cấp",
  OT: "OT",
  BONUS: "Thưởng",
  DEDUCTION: "Khấu trừ",
  NET_PAY: "Thực nhận",
};

export function formatStatus(value?: string | number | null) {
  const key = String(value || "UNKNOWN").trim().toUpperCase();

  return statusLabels[key] || String(value || "-");
}

export function formatBooleanLabel(value?: string | boolean | null) {
  const text = String(value ?? "").trim().toUpperCase();

  if (value === true || text === "TRUE" || text === "YES" || text === "1") {
    return "Có";
  }

  if (value === false || text === "FALSE" || text === "NO" || text === "0") {
    return "Không";
  }

  return "-";
}

export function formatRole(value?: string | null) {
  const key = String(value || "").trim().toUpperCase();

  return roleLabels[key] || String(value || "-");
}

export function formatPermission(value?: string | null) {
  const key = String(value || "").trim();

  return permissionLabels[key] || String(value || "-");
}

export function formatDocumentPermission(value?: string | null) {
  const key = String(value || "").trim().toUpperCase();

  return documentPermissionLabels[key] || String(value || "-");
}

export function formatPermissionTargetType(value?: string | null) {
  const key = String(value || "").trim().toUpperCase();

  return permissionTargetTypeLabels[key] || String(value || "-");
}

export function formatPayrollItemType(value?: string | null) {
  const key = String(value || "").trim().toUpperCase();

  return payrollItemLabels[key] || String(value || "-");
}
