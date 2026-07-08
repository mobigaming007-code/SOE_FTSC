export type ApiResponse<T = unknown> = {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  detail?: unknown;
};

export type LoginData = {
  token: string;
  expires_at: string;
  user: {
    id: string;
    person_id?: string;
    username: string;
    email_dang_nhap: string;
    trang_thai: string;
    require_password_change?: string;
  };
  permissions?: Array<string | PermissionLike>;
  roles?: Array<string | RoleAssignmentLike>;
};

export type DashboardOverview = {
  period: {
    month: string;
    from: string;
    to: string;
  };
  people: {
    total_people: number;
    active_people: number;
    company_memberships: number;
    club_memberships: number;
    total_users: number;
    active_users: number;
    locked_users: number;
  };
  attendance: {
    total_logs: number;
    approved_logs: number;
    pending_logs: number;
    rejected_logs: number;
    completed_days: number;
    total_work_days: number;
    total_hours: number;
    late_minutes: number;
    early_leave_minutes: number;
  };
  leave: {
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    cancelled_requests: number;
    approved_days: number;
    pending_days: number;
  };
  payroll: {
    payroll_periods: number;
    payslips: number;
    total_base_salary: number;
    total_allowance: number;
    total_bonus: number;
    total_deduction: number;
    total_net_pay: number;
  };
  documents: {
    total_documents: number;
    published_documents: number;
    draft_documents: number;
    archived_documents: number;
    uploaded_versions_in_period: number;
    views_in_period: number;
    emails_in_period: number;
    sent_emails: number;
    failed_emails: number;
  };
  system: {
    audit_logs_in_period: number;
    api_requests_in_period: number;
    failed_api_requests: number;
  };
};
export type Person = {
  id: string;
  ma_dinh_danh: string;
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  sdt: string;
  email: string;
  dia_chi_thuong_tru: string;
  noi_o_hien_tai: string;
  anh_dai_dien_file_id?: string;
  anh_dai_dien_url?: string;
  trang_thai: string;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  person_id: string;
  org_type: string;
  org_unit_id: string;
  position_id: string;
  loai_quan_he: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai: string;
  ghi_chu: string;
  created_at: string;
  updated_at: string;
};

export type UserAccount = {
  id: string;
  person_id: string;
  username: string;
  email_dang_nhap: string;
  require_password_change: string;
  two_factor_enabled: string;
  trang_thai: string;
  last_login_at: string;
  created_at: string;
  updated_at: string;
};

export type PersonCccd = {
  id?: string;
  person_id?: string;
  so_cccd_encrypted?: string;
  ngay_cap?: string;
  noi_cap?: string;
  file_id_mat_truoc?: string;
  file_url_mat_truoc?: string;
  file_id_mat_sau?: string;
  file_url_mat_sau?: string;
};

export type PersonDocument = {
  id?: string;
  person_id?: string;
  doc_type: string;
  ten_tai_lieu: string;
  so_hieu?: string;
  ngay_cap?: string;
  noi_cap?: string;
  ngay_het_han?: string;
  file_id?: string;
  file_url?: string;
  trang_thai?: string;
};

export type EmployeeContract = {
  id?: string;
  person_id?: string;
  membership_id?: string;
  loai_hop_dong?: string;
  so_hop_dong?: string;
  ngay_ky?: string;
  ngay_hieu_luc?: string;
  ngay_het_han?: string;
  muc_luong_encrypted?: string | number;
  file_id?: string;
  file_url?: string;
  trang_thai?: string;
};

export type EmployeeBankAccount = {
  id?: string;
  person_id?: string;
  ten_ngan_hang?: string;
  chi_nhanh?: string;
  so_tai_khoan_encrypted?: string;
  chu_tai_khoan?: string;
  trang_thai?: string;
};

export type EmployeeInsurance = {
  id?: string;
  person_id?: string;
  so_bhxh_encrypted?: string;
  muc_dong?: string | number;
  ngay_bat_dau?: string;
  ghi_chu?: string;
  trang_thai?: string;
};

export type EmployeeTax = {
  id?: string;
  person_id?: string;
  mst_ca_nhan_encrypted?: string;
  so_nguoi_phu_thuoc?: string | number;
  ghi_chu?: string;
};

export type PersonRelative = {
  id?: string;
  person_id?: string;
  ho_ten?: string;
  quan_he?: string;
  sdt?: string;
  dia_chi?: string;
  lien_he_khan_cap?: string;
};

export type PersonHrmData = {
  cccd: PersonCccd;
  documents: PersonDocument[];
  contracts: EmployeeContract[];
  bank_accounts: EmployeeBankAccount[];
  insurance: EmployeeInsurance;
  tax: EmployeeTax;
  relatives: PersonRelative[];
};

export type PeopleListData = {
  total: number;
  items: Person[];
};

export type PersonDetailData = {
  person: Person;
  memberships: Membership[];
  user_accounts: UserAccount[];
  hrm?: PersonHrmData;
};

export type SavePersonHrmData = {
  person: Person;
  hrm: PersonHrmData;
};

export type EmployeeProfileMembership = Membership & {
  ten_don_vi?: string;
  ma_don_vi?: string;
  loai_don_vi?: string;
  org_type?: string;
  ten_chuc_danh?: string;
  ma_chuc_danh?: string;
};

export type EmployeeProfileData = {
  person: Person;
  memberships: EmployeeProfileMembership[];
  user_accounts: UserAccount[];
  hrm: PersonHrmData;
};

export type PeopleDirectoryItem = {
  person: Person;
  memberships: EmployeeProfileMembership[];
  primary_membership?: EmployeeProfileMembership;
  org_unit_id?: string;
  ten_don_vi?: string;
  ma_don_vi?: string;
  loai_don_vi?: string;
  org_type?: string;
  position_id?: string;
  ten_chuc_danh?: string;
  ma_chuc_danh?: string;
};

export type PeopleDirectoryData = {
  total: number;
  items: PeopleDirectoryItem[];
};

export type OrgUnitNode = {
  id: string;
  org_type: string;
  ma_don_vi: string;
  ten_don_vi: string;
  parent_id: string;
  cap_do: string;
  loai_don_vi: string;
  thu_tu: string;
  trang_thai: string;
  children?: OrgUnitNode[];
};

export type OrgTreeData = {
  items?: OrgUnitNode[];
  tree?: OrgUnitNode[];
};

export type CreatePersonData = {
  person: Person;
};

export type CreateMembershipData = {
  membership: Membership;
};

export type CreateUserAccountData = {
  user: UserAccount;
  temporary_password: string;
};

export type Office = {
  id: string;
  ma_diem: string;
  ten_diem: string;
  org_unit_id: string;
  dia_chi: string;
  lat: string | number;
  lng: string | number;
  ban_kinh_gps_m: string | number;
  wifi_ssid: string;
  ip_allowlist: string;
  trang_thai: string;
  created_at: string;
  updated_at: string;
};

export type WorkShift = {
  id: string;
  ma_ca: string;
  ten_ca: string;
  org_unit_id: string;
  gio_bat_dau: string;
  gio_ket_thuc: string;
  gio_checkin_som_nhat: string;
  gio_checkin_muon_nhat: string;
  gio_checkout_som_nhat: string;
  gio_checkout_muon_nhat: string;
  so_cong: string | number;
  trang_thai: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceLog = {
  id: string;
  person_id: string;
  ho_ten?: string;
  ma_dinh_danh?: string;
  ten_nhan_su?: string;
  membership_id: string;
  office_id: string;
  shift_id: string;
  ten_ca?: string;
  gio_bat_dau_ca?: string;
  gio_ket_thuc_ca?: string;
  thoi_gian: string;
  ngay: string;
  loai_cham_cong: "CHECKIN" | "CHECKOUT" | string;
  hinh_thuc: "GPS" | "QR" | "MANUAL" | string;
  lat: string | number;
  lng: string | number;
  khoang_cach_m: string | number;
  qr_token: string;
  device_id: string;
  ip: string;
  user_agent: string;
  session_id: string;
  idempotency_key: string;
  trang_thai_he_thong: string;
  trang_thai_duyet: string;
  nguoi_duyet: string;
  ghi_chu_duyet: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceSummary = {
  id: string;
  person_id: string;
  membership_id: string;
  ngay: string;
  shift_id: string;
  checkin_at: string;
  checkout_at: string;
  gio_vao?: string;
  gio_ra?: string;
  gio_vao_tinh_cong?: string;
  gio_ra_tinh_cong?: string;
  so_gio_nghi_ngoi?: string | number;
  so_gio_tinh_cong?: string | number;
  so_cong_quan_tri?: string | number;
  checkin_log_id?: string;
  checkout_log_id?: string;
  so_gio: string | number;
  so_cong: string | number;
  di_tre_phut: string | number;
  ve_som_phut: string | number;
  trang_thai: string;
  ghi_chu: string;
  created_at: string;
  updated_at: string;
};

export type OfficeListData = {
  total: number;
  items: Office[];
};

export type ShiftListData = {
  total: number;
  items: WorkShift[];
};

export type AttendanceListData = {
  total: number;
  items: AttendanceLog[];
  summaries?: AttendanceSummary[];
};

export type AttendanceActionData = {
  attendance_log: AttendanceLog;
  attendance_logs?: AttendanceLog[];
  summary?: AttendanceSummary;
  validation?: {
    valid: boolean;
    reason: string;
    message?: string;
    distance_m?: number;
    radius_m?: number;
  };
  duplicated?: boolean;
};

export type QrToken = {
  id: string;
  office_id: string;
  office_name?: string;
  office_code?: string;
  token: string;
  thoi_gian_tao: string;
  het_han: string;
  trang_thai: string;
  created_at: string;
  updated_at?: string;
};

export type QrTokenData = {
  qr_token: QrToken | null;
  qr_payload: string;
  token?: string;
};

export type QrTokenListData = {
  total: number;
  items: QrToken[];
};

export type CreateOfficeData = {
  office: Office;
};

export type CreateShiftData = {
  shift: WorkShift;
};

export type LeaveRequest = {
  id: string;
  person_id: string;
  ho_ten?: string;
  ma_dinh_danh?: string;
  ten_nhan_su?: string;
  membership_id: string;
  org_unit_id: string;
  loai_nghi: string;
  tu_ngay: string;
  den_ngay: string;
  buoi_tu: string;
  buoi_den: string;
  so_ngay: string | number;
  ly_do: string;
  nguoi_ban_giao: string;
  file_minh_chung_id: string;
  file_minh_chung_url: string;
  trang_thai: string;
  nguoi_duyet: string;
  ngay_duyet: string;
  ghi_chu_duyet: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string;
  cancel_reason: string;
};

export type LeaveBalance = {
  id: string;
  person_id: string;
  nam: string | number;
  tong_phep: string | number;
  da_dung: string | number;
  dang_cho_duyet: string | number;
  con_lai: string | number;
  updated_at: string;
};

export type LeaveListData = {
  total: number;
  items: LeaveRequest[];
};

export type LeaveBalanceData = {
  balance: LeaveBalance;
};

export type CreateLeaveRequestData = {
  leave_request: LeaveRequest;
  balance?: LeaveBalance;
};

export type ApproveLeaveData = {
  leave_request: LeaveRequest;
  balance?: LeaveBalance;
};

export type UpdateLeaveBalanceData = {
  balance: LeaveBalance;
};

export type PayrollPeriod = {
  id: string;
  thang: string | number;
  nam: string | number;
  tu_ngay: string;
  den_ngay: string;
  trang_thai: string;
  nguoi_tao: string;
  ngay_tao: string;
  ngay_chot: string;
  ghi_chu: string;
};

export type Payslip = {
  id: string;
  payroll_period_id: string;
  person_id: string;
  ho_ten?: string;
  ma_dinh_danh?: string;
  ten_nhan_su?: string;
  membership_id: string;
  luong_co_ban_encrypted: string | number;
  phu_cap: string | number;
  tong_cong: string | number;
  ot: string | number;
  thuong: string | number;
  khau_tru: string | number;
  thuc_nhan_encrypted: string | number;
  trang_thai: string;
  created_at: string;
  updated_at: string;
};

export type PayslipItem = {
  id: string;
  payslip_id: string;
  loai_khoan: string;
  ten_khoan: string;
  so_tien: string | number;
  cong_thuc: string;
  ghi_chu: string;
  created_at: string;
  updated_at: string;
};

export type PayrollAdjustment = {
  id: string;
  payroll_period_id: string;
  person_id: string;
  membership_id: string;
  adjustment_type: string;
  ten_khoan: string;
  so_tien: string | number;
  ghi_chu: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  trang_thai: string;
};

export type PayrollDashboardData = {
  summary: {
    payroll_periods: number;
    payslips: number;
    total_base_salary: number;
    total_allowance: number;
    total_bonus: number;
    total_deduction: number;
    total_net_pay: number;
  };
  by_status: {
    trang_thai: string;
    total: number;
    total_net_pay: number;
  }[];
};

export type PayrollPeriodListData = {
  total: number;
  items: PayrollPeriod[];
};

export type PayrollPeriodDetailData = {
  payroll_period: PayrollPeriod;
  payslip_count: number;
  payslips: Payslip[];
};

export type CreatePayrollPeriodData = {
  payroll_period: PayrollPeriod;
};

export type PayrollAdjustmentData = {
  adjustment: PayrollAdjustment;
};

export type GeneratePayrollData = {
  generated_count: number;
  skipped_count: number;
  payslips: Payslip[];
  skipped: {
    person_id: string;
    reason: string;
    payslip_id?: string;
  }[];
};

export type PayslipListData = {
  total: number;
  items: Payslip[];
};

export type PayslipDetailData = {
  payroll_period: PayrollPeriod;
  person: Person;
  payslip: Payslip;
  items: PayslipItem[];
};

export type UpdatePayslipStatusData = {
  payslip: Payslip;
};

export type UpdatePayrollPeriodStatusData = {
  payroll_period: PayrollPeriod;
};

export type DocumentRecord = {
  id: string;
  ma_van_ban: string;
  ten_van_ban: string;
  loai_van_ban: string;
  org_unit_id: string;
  muc_do_bao_mat: string;
  trang_thai: string;
  nguoi_tao: string;
  ngay_tao: string;
  updated_at: string;
  latest_version?: DocumentVersion | null;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  so_phien_ban: string | number;
  file_id: string;
  file_url: string;
  nguoi_upload: string;
  ghi_chu_thay_doi: string;
  ngay_upload: string;
};

export type DocumentPermission = {
  id: string;
  document_id: string;
  doi_tuong_type: string;
  doi_tuong_id: string;
  loai_quyen: string;
  created_at: string;
  updated_at: string;
};

export type DocumentViewLog = {
  id: string;
  document_id: string;
  user_id: string;
  hanh_dong: string;
  ip: string;
  user_agent: string;
  thoi_gian: string;
};

export type DocumentEmailLog = {
  id: string;
  document_id: string;
  nguoi_gui: string;
  danh_sach_nhan: string;
  subject: string;
  trang_thai_gui: string;
  loi_gui: string;
  thoi_gian_gui: string;
};

export type DocumentListData = {
  total: number;
  items: DocumentRecord[];
};

export type DocumentDetailData = {
  document: DocumentRecord;
  versions: DocumentVersion[];
  permissions: DocumentPermission[];
};

export type CreateDocumentData = {
  document: DocumentRecord;
};

export type UploadDocumentVersionData = {
  version: DocumentVersion;
};

export type SetDocumentPermissionData = {
  permission: DocumentPermission;
};

export type DocumentViewLogListData = {
  total: number;
  items: DocumentViewLog[];
};

export type SendDocumentEmailData = {
  status: string;
};
export type SystemConfig = {
  key: string;
  value: string;
  value_type: string;
  group: string;
  description: string;
  is_secret: string;
  updated_at: string;
  updated_by: string;
};

export type AuditLog = {
  id: string;
  user_id: string;
  hanh_dong: string;
  module: string;
  doi_tuong_type: string;
  doi_tuong_id: string;
  before_json: string;
  after_json: string;
  ip: string;
  user_agent: string;
  thoi_gian: string;
};

export type ApiLog = {
  id: string;
  request_id: string;
  user_id: string;
  method: string;
  path: string;
  status_code: string | number;
  duration_ms: string | number;
  ip: string;
  user_agent: string;
  error_message: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  target_url: string;
  read_at: string;
  created_at: string;
};

export type SystemConfigListData = {
  total: number;
  items: SystemConfig[];
};

export type UpdateSystemConfigData = {
  config: SystemConfig;
};

export type AuditLogListData = {
  total: number;
  items: AuditLog[];
};

export type ApiLogListData = {
  total: number;
  items: ApiLog[];
};

export type NotificationListData = {
  total: number;
  unread: number;
  items: NotificationItem[];
};

export type CreateNotificationData = {
  notification: NotificationItem;
};

export type MarkNotificationReadData = {
  notification: NotificationItem;
};

export type MarkAllNotificationReadData = {
  updated_count: number;
};
export type AuthUser = {
  id: string;
  person_id?: string;
  username: string;
  email_dang_nhap: string;
  trang_thai: string;
  require_password_change?: string;
  last_login_at?: string;
};

export type RoleAssignmentLike = {
  id?: string;
  user_id?: string;
  role_code?: string;
  role_name?: string;
  org_unit_id?: string;
  scope_type?: string;
  trang_thai?: string;
  created_at?: string;
  updated_at?: string;
  __rowNumber?: number;
};

export type PermissionLike = {
  id?: string;
  permission_code?: string;
  code?: string;
  module?: string;
  action?: string;
};

export type AuthMeData = {
  user: AuthUser;
  permissions?: Array<string | PermissionLike>;
  roles?: Array<string | RoleAssignmentLike>;
};

export type ChangePasswordData = {
  user?: AuthUser;
};

export type MenuPermission = {
  code: string;
};
