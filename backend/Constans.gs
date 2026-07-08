const SPREADSHEET_STRUCTURE = {
  CORE_HR: {
    OrgUnits: [
      'id',
      'org_type',
      'ma_don_vi',
      'ten_don_vi',
      'parent_id',
      'cap_do',
      'loai_don_vi',
      'thu_tu',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    Positions: [
      'id',
      'org_unit_id',
      'ma_chuc_danh',
      'ten_chuc_danh',
      'nhom_chuc_danh',
      'cap_bac',
      'mo_ta',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    People: [
      'id',
      'ma_dinh_danh',
      'ho_ten',
      'ngay_sinh',
      'gioi_tinh',
      'sdt',
      'email',
      'dia_chi_thuong_tru',
      'noi_o_hien_tai',
      'anh_dai_dien_file_id',
      'anh_dai_dien_url',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    PersonOrgMemberships: [
      'id',
      'person_id',
      'org_type',
      'org_unit_id',
      'position_id',
      'loai_quan_he',
      'ngay_bat_dau',
      'ngay_ket_thuc',
      'trang_thai',
      'ghi_chu',
      'created_at',
      'updated_at'
    ],

    UserAccounts: [
      'id',
      'person_id',
      'username',
      'email_dang_nhap',
      'password_hash',
      'password_salt',
      'require_password_change',
      'two_factor_enabled',
      'trang_thai',
      'last_login_at',
      'created_at',
      'updated_at'
    ],

    Roles: [
      'id',
      'role_code',
      'role_name',
      'role_group',
      'mo_ta',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    Permissions: [
      'id',
      'permission_code',
      'module',
      'action',
      'mo_ta',
      'created_at',
      'updated_at'
    ],

    RolePermissions: [
      'id',
      'role_code',
      'permission_code',
      'created_at',
      'updated_at'
    ],

    RbacAuditSummary: [
      'role_code',
      'role_name',
      'role_exists',
      'expected_count',
      'has_count',
      'missing_count',
      'extra_count',
      'missing_permissions',
      'extra_permissions',
      'audit_note',
      'audited_at'
    ],

    RbacAuditDetail: [
      'id',
      'position_id',
      'ma_chuc_danh',
      'ten_chuc_danh',
      'role_code',
      'permission_code',
      'permission_source',
      'permission_status',
      'audit_note',
      'audited_at',
      'updated_at'
    ],

    UserRoleAssignments: [
      'id',
      'user_id',
      'role_code',
      'org_unit_id',
      'scope_type',
      'trang_thai',
      'created_at',
      'updated_at'
    ]
  },

  SENSITIVE_HR: {
    PersonCCCD: [
      'id',
      'person_id',
      'so_cccd_encrypted',
      'ngay_cap',
      'noi_cap',
      'file_id_mat_truoc',
      'file_url_mat_truoc',
      'file_id_mat_sau',
      'file_url_mat_sau',
      'created_at',
      'updated_at'
    ],

    PersonDocuments: [
      'id',
      'person_id',
      'doc_type',
      'ten_tai_lieu',
      'so_hieu',
      'ngay_cap',
      'noi_cap',
      'ngay_het_han',
      'file_id',
      'file_url',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    EmployeeContracts: [
      'id',
      'person_id',
      'membership_id',
      'loai_hop_dong',
      'so_hop_dong',
      'ngay_ky',
      'ngay_hieu_luc',
      'ngay_het_han',
      'muc_luong_encrypted',
      'file_id',
      'file_url',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    EmployeeBankAccounts: [
      'id',
      'person_id',
      'ten_ngan_hang',
      'chi_nhanh',
      'so_tai_khoan_encrypted',
      'chu_tai_khoan',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    EmployeeInsurance: [
      'id',
      'person_id',
      'so_bhxh_encrypted',
      'muc_dong',
      'ngay_bat_dau',
      'ghi_chu',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    EmployeeTax: [
      'id',
      'person_id',
      'mst_ca_nhan_encrypted',
      'so_nguoi_phu_thuoc',
      'ghi_chu',
      'created_at',
      'updated_at'
    ],

    PersonRelatives: [
      'id',
      'person_id',
      'ho_ten',
      'quan_he',
      'sdt',
      'dia_chi',
      'lien_he_khan_cap',
      'created_at',
      'updated_at'
    ],

    PayrollPeriods: [
      'id',
      'thang',
      'nam',
      'tu_ngay',
      'den_ngay',
      'trang_thai',
      'nguoi_tao',
      'ngay_tao',
      'ngay_chot',
      'ghi_chu'
    ],

    Payslips: [
      'id',
      'payroll_period_id',
      'person_id',
      'membership_id',
      'luong_co_ban_encrypted',
      'phu_cap',
      'tong_cong',
      'ot',
      'thuong',
      'khau_tru',
      'thuc_nhan_encrypted',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    PayslipItems: [
      'id',
      'payslip_id',
      'loai_khoan',
      'ten_khoan',
      'so_tien',
      'cong_thuc',
      'ghi_chu',
      'created_at',
      'updated_at'
    ]
  },

  ATTENDANCE: {
    Offices: [
      'id',
      'ma_diem',
      'ten_diem',
      'org_unit_id',
      'dia_chi',
      'lat',
      'lng',
      'ban_kinh_gps_m',
      'wifi_ssid',
      'ip_allowlist',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    WorkShifts: [
      'id',
      'ma_ca',
      'ten_ca',
      'org_unit_id',
      'gio_bat_dau',
      'gio_ket_thuc',
      'gio_checkin_som_nhat',
      'gio_checkin_muon_nhat',
      'gio_checkout_som_nhat',
      'gio_checkout_muon_nhat',
      'so_cong',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    QRTokens: [
      'id',
      'office_id',
      'token',
      'thoi_gian_tao',
      'het_han',
      'trang_thai',
      'created_at',
      'updated_at'
    ],

    AttendanceLogs: [
      'id',
      'person_id',
      'membership_id',
      'office_id',
      'shift_id',
      'thoi_gian',
      'ngay',
      'loai_cham_cong',
      'hinh_thuc',
      'lat',
      'lng',
      'khoang_cach_m',
      'qr_token',
      'device_id',
      'ip',
      'user_agent',
      'session_id',
      'idempotency_key',
      'trang_thai_he_thong',
      'trang_thai_duyet',
      'nguoi_duyet',
      'ghi_chu_duyet',
      'created_at',
      'updated_at'
    ],

    AttendanceSummary: [
      'id',
      'person_id',
      'membership_id',
      'ngay',
      'shift_id',
      'checkin_at',
      'checkout_at',
      'gio_vao',
      'gio_ra',
      'gio_vao_tinh_cong',
      'gio_ra_tinh_cong',
      'so_gio_nghi_ngoi',
      'so_gio_tinh_cong',
      'so_cong_quan_tri',
      'checkin_log_id',
      'checkout_log_id',
      'so_gio',
      'so_cong',
      'di_tre_phut',
      've_som_phut',
      'trang_thai',
      'ghi_chu',
      'created_at',
      'updated_at'
    ],

    AttendanceApprovals: [
      'id',
      'attendance_log_id',
      'nguoi_duyet',
      'hanh_dong',
      'ghi_chu',
      'thoi_gian_duyet'
    ]
  },

  DOCUMENTS: {
    Documents: [
      'id',
      'ma_van_ban',
      'ten_van_ban',
      'loai_van_ban',
      'org_unit_id',
      'muc_do_bao_mat',
      'trang_thai',
      'nguoi_tao',
      'ngay_tao',
      'updated_at'
    ],

    DocumentVersions: [
      'id',
      'document_id',
      'so_phien_ban',
      'file_id',
      'file_url',
      'nguoi_upload',
      'ghi_chu_thay_doi',
      'ngay_upload'
    ],

    DocumentPermissions: [
      'id',
      'document_id',
      'doi_tuong_type',
      'doi_tuong_id',
      'loai_quyen',
      'created_at',
      'updated_at'
    ],

    DocumentViewLogs: [
      'id',
      'document_id',
      'user_id',
      'hanh_dong',
      'ip',
      'user_agent',
      'thoi_gian'
    ],

    DocumentEmailLogs: [
      'id',
      'document_id',
      'nguoi_gui',
      'danh_sach_nhan',
      'subject',
      'trang_thai_gui',
      'loi_gui',
      'thoi_gian_gui'
    ]
  },

  SYSTEM: {
    SystemConfig: [
      'key',
      'value',
      'value_type',
      'group',
      'description',
      'is_secret',
      'updated_at',
      'updated_by'
    ],

    Sessions: [
      'id',
      'user_id',
      'token_hash',
      'refresh_token_hash',
      'ip',
      'user_agent',
      'created_at',
      'expires_at',
      'revoked_at',
      'trang_thai'
    ],

    AuditLog: [
      'id',
      'user_id',
      'hanh_dong',
      'module',
      'doi_tuong_type',
      'doi_tuong_id',
      'before_json',
      'after_json',
      'ip',
      'user_agent',
      'thoi_gian'
    ],

    ApiLogs: [
      'id',
      'request_id',
      'user_id',
      'method',
      'path',
      'status_code',
      'duration_ms',
      'ip',
      'user_agent',
      'error_message',
      'created_at'
    ],

    Notifications: [
      'id',
      'user_id',
      'title',
      'message',
      'type',
      'target_url',
      'read_at',
      'created_at'
    ],

    EmailQueue: [
      'id',
      'to_email',
      'cc',
      'bcc',
      'subject',
      'body_html',
      'body_text',
      'status',
      'retry_count',
      'error_message',
      'created_at',
      'sent_at'
    ],

    FileRegistry: [
      'id',
      'owner_type',
      'owner_id',
      'module',
      'file_type',
      'file_id',
      'file_url',
      'folder_id',
      'mime_type',
      'size_bytes',
      'uploaded_by',
      'created_at'
    ]
  }
};
