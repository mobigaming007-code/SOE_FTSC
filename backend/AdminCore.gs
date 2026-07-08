const FIRST_SUPER_ADMIN = {
  ho_ten: 'Quản trị hệ thống',
  email: 'admin@flytosky.vn',
  username: 'admin@flytosky.vn',
  initial_password: 'ChangeMe@123456'
};

function setupPhase1() {
  seedInitialOrgUnits();
  seedInitialPositions();
  bootstrapSuperAdminOnce();

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'SETUP_PHASE_1',
    module: 'SYSTEM',
    doi_tuong_type: 'PHASE',
    doi_tuong_id: 'PHASE_1',
    after: {
      message: 'Hoàn tất Giai đoạn 1: Org + Auth + RBAC'
    }
  });

  Logger.log('Hoàn tất setup Giai đoạn 1.');
}

function seedInitialOrgUnits() {
  const units = [
    // Root
    ['ORG_COMPANY_ROOT', 'COMPANY', 'CTY', 'Công ty TNHH DNXH Từ thiện và Hỗ trợ phát triển cộng đồng Fly To Sky', '', 1, 'CONG_TY', 1],
    ['ORG_CLUB_ROOT', 'CLUB', 'CLB', 'Nhóm từ thiện Fly To Sky', '', 1, 'CLB', 2],

    // Company
    ['ORG_COMPANY_HDTV', 'COMPANY', 'HDTV', 'Hội đồng thành viên', 'ORG_COMPANY_ROOT', 2, 'HOI_DONG', 1],
    ['ORG_COMPANY_GD', 'COMPANY', 'BGD', 'Ban Giám đốc', 'ORG_COMPANY_ROOT', 2, 'BAN_GIAM_DOC', 2],
    ['ORG_COMPANY_TC_KT', 'COMPANY', 'TC_KT', 'Phòng Tài chính - Kế toán', 'ORG_COMPANY_ROOT', 2, 'PHONG_BAN', 3],
    ['ORG_COMPANY_TC_HC', 'COMPANY', 'TC_HC', 'Phòng Tổ chức - Hành chính', 'ORG_COMPANY_ROOT', 2, 'PHONG_BAN', 4],
    ['ORG_COMPANY_KH_DA', 'COMPANY', 'KH_DA', 'Phòng Kế hoạch - Dự án', 'ORG_COMPANY_ROOT', 2, 'PHONG_BAN', 5],
    ['ORG_COMPANY_TT_DN', 'COMPANY', 'TT_DN', 'Phòng Truyền thông - Đối ngoại', 'ORG_COMPANY_ROOT', 2, 'PHONG_BAN', 6],
    ['ORG_COMPANY_KD', 'COMPANY', 'KD', 'Phòng Kinh doanh', 'ORG_COMPANY_ROOT', 2, 'PHONG_BAN', 7],
    ['ORG_COMPANY_VP_HN', 'COMPANY', 'VP_HN', 'Văn phòng Hệ thống tại Hà Nội', 'ORG_COMPANY_ROOT', 2, 'VAN_PHONG', 8],

    // Club root departments
    ['ORG_CLUB_BCN', 'CLUB', 'BCN', 'Ban Chủ nhiệm Nhóm', 'ORG_CLUB_ROOT', 2, 'BAN_CHU_NHIEM', 1],
    ['ORG_CLUB_KH_DA', 'CLUB', 'CLB_KH_DA', 'Ban Kế hoạch - Dự án', 'ORG_CLUB_ROOT', 2, 'BAN', 2],
    ['ORG_CLUB_VP_BCN', 'CLUB', 'CLB_VP_BCN', 'Văn phòng Ban Chủ nhiệm Nhóm', 'ORG_CLUB_ROOT', 2, 'BAN', 3],
    ['ORG_CLUB_CO_VAN', 'CLUB', 'CLB_CO_VAN', 'Ban Cố vấn', 'ORG_CLUB_ROOT', 2, 'BAN', 4],
    ['ORG_CLUB_NS', 'CLUB', 'CLB_NS', 'Ban Nhân sự', 'ORG_CLUB_ROOT', 2, 'BAN', 5],
    ['ORG_CLUB_TT', 'CLUB', 'CLB_TT', 'Ban Truyền thông', 'ORG_CLUB_ROOT', 2, 'BAN', 6],
    ['ORG_CLUB_DN', 'CLUB', 'CLB_DN', 'Ban Đối ngoại', 'ORG_CLUB_ROOT', 2, 'BAN', 7],
    ['ORG_CLUB_CN', 'CLUB', 'CLB_CN', 'Chi nhánh trực thuộc', 'ORG_CLUB_ROOT', 2, 'NHOM_CHI_NHANH', 8],

    // Club branches
    ['ORG_CLUB_CN_GL', 'CLUB', 'CN_GL', 'Chi nhánh Gia Lai', 'ORG_CLUB_CN', 3, 'CHI_NHANH', 1],
    ['ORG_CLUB_CN_TPHCM', 'CLUB', 'CN_TPHCM', 'Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN', 3, 'CHI_NHANH', 2],
    ['ORG_CLUB_CN_MB', 'CLUB', 'CN_MB', 'Chi nhánh Miền Bắc', 'ORG_CLUB_CN', 3, 'CHI_NHANH', 3],

    // Gia Lai branch
    ['ORG_CLUB_CN_GL_VP', 'CLUB', 'CN_GL_VP', 'Văn phòng BCN Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 1],
    ['ORG_CLUB_CN_GL_TT', 'CLUB', 'CN_GL_TT', 'Ban Truyền thông Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 2],
    ['ORG_CLUB_CN_GL_DN', 'CLUB', 'CN_GL_DN', 'Ban Đối ngoại Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 3],
    ['ORG_CLUB_CN_GL_KHDA', 'CLUB', 'CN_GL_KHDA', 'Ban Kế hoạch - Dự án Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 4],
    ['ORG_CLUB_CN_GL_HC', 'CLUB', 'CN_GL_HC', 'Ban Hậu cần Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 5],
    ['ORG_CLUB_CN_GL_NS', 'CLUB', 'CN_GL_NS', 'Ban Nhân sự Chi nhánh Gia Lai', 'ORG_CLUB_CN_GL', 4, 'BAN', 6],

    // TPHCM branch
    ['ORG_CLUB_CN_TPHCM_VP', 'CLUB', 'CN_TPHCM_VP', 'Văn phòng BCN Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 1],
    ['ORG_CLUB_CN_TPHCM_TT', 'CLUB', 'CN_TPHCM_TT', 'Ban Truyền thông Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 2],
    ['ORG_CLUB_CN_TPHCM_DN', 'CLUB', 'CN_TPHCM_DN', 'Ban Đối ngoại Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 3],
    ['ORG_CLUB_CN_TPHCM_KHDA', 'CLUB', 'CN_TPHCM_KHDA', 'Ban Kế hoạch - Dự án Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 4],
    ['ORG_CLUB_CN_TPHCM_HC', 'CLUB', 'CN_TPHCM_HC', 'Ban Hậu cần Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 5],
    ['ORG_CLUB_CN_TPHCM_NS', 'CLUB', 'CN_TPHCM_NS', 'Ban Nhân sự Chi nhánh TP. Hồ Chí Minh', 'ORG_CLUB_CN_TPHCM', 4, 'BAN', 6],

    // Miền Bắc branch
    ['ORG_CLUB_CN_MB_VP', 'CLUB', 'CN_MB_VP', 'Văn phòng BCN Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 1],
    ['ORG_CLUB_CN_MB_TT', 'CLUB', 'CN_MB_TT', 'Ban Truyền thông Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 2],
    ['ORG_CLUB_CN_MB_DN', 'CLUB', 'CN_MB_DN', 'Ban Đối ngoại Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 3],
    ['ORG_CLUB_CN_MB_KHDA', 'CLUB', 'CN_MB_KHDA', 'Ban Kế hoạch - Dự án Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 4],
    ['ORG_CLUB_CN_MB_HC', 'CLUB', 'CN_MB_HC', 'Ban Hậu cần Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 5],
    ['ORG_CLUB_CN_MB_NS', 'CLUB', 'CN_MB_NS', 'Ban Nhân sự Chi nhánh Miền Bắc', 'ORG_CLUB_CN_MB', 4, 'BAN', 6]
  ];

  units.forEach(function (u) {
    const exists = findObjectById('CORE_HR', 'OrgUnits', u[0]);

    if (!exists) {
      appendObjectRowWithLock('CORE_HR', 'OrgUnits', {
        id: u[0],
        org_type: u[1],
        ma_don_vi: u[2],
        ten_don_vi: u[3],
        parent_id: u[4],
        cap_do: u[5],
        loai_don_vi: u[6],
        thu_tu: u[7],
        trang_thai: 'ACTIVE',
        created_at: nowIso(),
        updated_at: nowIso()
      });
    }
  });

  Logger.log('Đã seed OrgUnits.');
}

function seedInitialPositions() {
  const positions = [
    ['POS_SUPER_ADMIN', '', 'SUPER_ADMIN', 'Quản trị tối cao', 'SYSTEM', 0],
    ['POS_DIRECTOR', 'ORG_COMPANY_GD', 'GIAM_DOC', 'Giám đốc', 'COMPANY', 1],
    ['POS_CHAIRMAN', 'ORG_COMPANY_GD', 'CHU_TICH', 'Chủ tịch', 'COMPANY', 1],
    ['POS_DEPUTY_DIRECTOR', 'ORG_COMPANY_GD', 'PHO_GIAM_DOC', 'Phó Giám đốc', 'COMPANY', 2],
    ['POS_VICE_CHAIRMAN', 'ORG_COMPANY_GD', 'PHO_CHU_TICH', 'Phó Chủ tịch', 'COMPANY', 2],
    ['POS_HR', 'ORG_COMPANY_TC_HC', 'HR', 'Nhân sự/HR', 'COMPANY', 3],
    ['POS_ACCOUNTANT', 'ORG_COMPANY_TC_KT', 'KE_TOAN', 'Kế toán', 'COMPANY', 3],
    ['POS_DEPARTMENT_MANAGER', '', 'TRUONG_PHONG', 'Trưởng Phòng', 'COMPANY', 3],
    ['POS_DEPUTY_DEPARTMENT_MANAGER', '', 'PHO_TRUONG_PHONG', 'Phó Trưởng Phòng', 'COMPANY', 4],
    ['POS_MANAGER', '', 'TRUONG_DON_VI', 'Trưởng đơn vị', 'GENERAL', 3],
    ['POS_DEPUTY_MANAGER', '', 'PHO_DON_VI', 'Phó đơn vị', 'GENERAL', 4],
    ['POS_SPECIALIST', '', 'CHUYEN_VIEN', 'Chuyên viên', 'GENERAL', 5],
    ['POS_INTERN', '', 'THUC_TAP_SINH', 'Thực tập sinh', 'GENERAL', 6],
    ['POS_VIEWER', '', 'NGUOI_XEM', 'Người xem', 'GENERAL', 9],

    ['POS_CLUB_GENERAL_LEADER', 'ORG_CLUB_BCN', 'TONG_CHU_NHIEM', 'Tổng Chủ nhiệm', 'CLUB', 1],
    ['POS_CLUB_DEPUTY_GENERAL_LEADER', 'ORG_CLUB_BCN', 'PHO_TONG_CHU_NHIEM', 'Phó Tổng Chủ nhiệm', 'CLUB', 2],
    ['POS_CLUB_OFFICE_CHIEF', 'ORG_CLUB_VP_BCN', 'CHANH_VAN_PHONG', 'Chánh Văn phòng Ban Chủ nhiệm Nhóm', 'CLUB', 3],
    ['POS_CLUB_OFFICE_DEPUTY', 'ORG_CLUB_VP_BCN', 'PHO_CHANH_VAN_PHONG', 'Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm', 'CLUB', 4],
    ['POS_CLUB_DEPARTMENT_MANAGER', '', 'TRUONG_PHONG', 'Trưởng Phòng', 'CLUB', 4],
    ['POS_CLUB_DEPUTY_DEPARTMENT_MANAGER', '', 'PHO_TRUONG_PHONG', 'Phó Trưởng Phòng', 'CLUB', 5],
    ['POS_CLUB_DEPARTMENT_HEAD', '', 'TRUONG_BAN', 'Trưởng Ban', 'CLUB', 5],
    ['POS_CLUB_DEPARTMENT_DEPUTY', '', 'PHO_TRUONG_BAN', 'Phó Trưởng Ban', 'CLUB', 6],
    ['POS_CLUB_BRANCH_LEADER', '', 'CHU_NHIEM_CHI_NHANH', 'Chủ nhiệm Chi nhánh', 'CLUB', 3],
    ['POS_CLUB_BRANCH_STANDING_DEPUTY', '', 'PHO_CHU_NHIEM_TT_CHI_NHANH', 'Phó Chủ nhiệm Thường trực Chi nhánh', 'CLUB', 4],
    ['POS_CLUB_BRANCH_DEPUTY', '', 'PHO_CHU_NHIEM_CHI_NHANH', 'Phó Chủ nhiệm Chi nhánh', 'CLUB', 4],
    ['POS_CLUB_BRANCH_OFFICE_CHIEF', '', 'CHANH_VAN_PHONG_CHI_NHANH', 'Chánh Văn phòng Ban Chủ nhiệm Chi nhánh', 'CLUB', 5],
    ['POS_CLUB_BRANCH_OFFICE_DEPUTY', '', 'PHO_CHANH_VAN_PHONG_CHI_NHANH', 'Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh', 'CLUB', 6],
    ['POS_CLUB_BRANCH_DEPARTMENT_HEAD', '', 'TRUONG_BAN_CHI_NHANH', 'Trưởng Ban thuộc Chi nhánh', 'CLUB', 6],
    ['POS_CLUB_BRANCH_DEPARTMENT_DEPUTY', '', 'PHO_TRUONG_BAN_CHI_NHANH', 'Phó Trưởng Ban thuộc Chi nhánh', 'CLUB', 7],
    ['POS_CLUB_VOLUNTEER', '', 'TINH_NGUYEN_VIEN', 'Tình nguyện viên', 'CLUB', 9]
  ];

  positions.forEach(function (p) {
    const exists = findObjectById('CORE_HR', 'Positions', p[0]);

    const positionPatch = {
      org_unit_id: p[1],
      ma_chuc_danh: p[2],
      ten_chuc_danh: p[3],
      nhom_chuc_danh: p[4],
      cap_bac: p[5],
      mo_ta: exists ? exists.mo_ta || '' : '',
      trang_thai: 'ACTIVE',
      updated_at: nowIso()
    };

    if (exists) {
      updateObjectById('CORE_HR', 'Positions', p[0], positionPatch);
    } else {
      positionPatch.id = p[0];
      positionPatch.created_at = nowIso();
      appendObjectRowWithLock('CORE_HR', 'Positions', positionPatch);
    }
  });

  Logger.log('Đã seed Positions.');
}

function bootstrapSuperAdminOnce() {
  const email = String(FIRST_SUPER_ADMIN.email || '').toLowerCase();

  if (!email) {
    throw new Error('Chưa cấu hình email SuperAdmin đầu tiên.');
  }

  const existingUser = findOneObject('CORE_HR', 'UserAccounts', function (row) {
    return String(row.email_dang_nhap || '').toLowerCase() === email;
  });

  if (existingUser) {
    Logger.log('SuperAdmin đã tồn tại, bỏ qua tạo mới.');
    return;
  }

  const personId = generateId('PERSON');
  const userId = generateId('USER');
  const membershipId = generateId('MEM');

  appendObjectRowWithLock('CORE_HR', 'People', {
    id: personId,
    ma_dinh_danh: 'FTS-ADMIN-0001',
    ho_ten: FIRST_SUPER_ADMIN.ho_ten,
    ngay_sinh: '',
    gioi_tinh: '',
    sdt: '',
    email: FIRST_SUPER_ADMIN.email,
    dia_chi_thuong_tru: '',
    noi_o_hien_tai: '',
    anh_dai_dien_file_id: '',
    anh_dai_dien_url: '',
    trang_thai: 'ACTIVE',
    created_at: nowIso(),
    updated_at: nowIso()
  });

  appendObjectRowWithLock('CORE_HR', 'PersonOrgMemberships', {
    id: membershipId,
    person_id: personId,
    org_type: 'SYSTEM',
    org_unit_id: '',
    position_id: 'POS_SUPER_ADMIN',
    loai_quan_he: 'MANAGER',
    ngay_bat_dau: todayDate(),
    ngay_ket_thuc: '',
    trang_thai: 'ACTIVE',
    ghi_chu: 'Tài khoản SuperAdmin đầu tiên',
    created_at: nowIso(),
    updated_at: nowIso()
  });

  const salt = makePasswordSalt();
  const passwordHash = hashPassword(FIRST_SUPER_ADMIN.initial_password, salt);

  appendObjectRowWithLock('CORE_HR', 'UserAccounts', {
    id: userId,
    person_id: personId,
    username: FIRST_SUPER_ADMIN.username,
    email_dang_nhap: FIRST_SUPER_ADMIN.email,
    password_hash: passwordHash,
    password_salt: salt,
    require_password_change: 'TRUE',
    two_factor_enabled: 'FALSE',
    trang_thai: 'ACTIVE',
    last_login_at: '',
    created_at: nowIso(),
    updated_at: nowIso()
  });

  appendObjectRowWithLock('CORE_HR', 'UserRoleAssignments', {
    id: generateId('URA'),
    user_id: userId,
    role_code: 'SUPER_ADMIN',
    org_unit_id: '',
    scope_type: 'ALL',
    trang_thai: 'ACTIVE',
    created_at: nowIso(),
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'BOOTSTRAP_SUPER_ADMIN',
    module: 'ADMIN',
    doi_tuong_type: 'USER',
    doi_tuong_id: userId,
    after: {
      email: FIRST_SUPER_ADMIN.email,
      username: FIRST_SUPER_ADMIN.username
    }
  });

  Logger.log('Đã tạo SuperAdmin đầu tiên: ' + FIRST_SUPER_ADMIN.email);
}
