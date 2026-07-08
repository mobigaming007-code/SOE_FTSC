function setupAll() {
  validateConfig();

  Object.keys(SPREADSHEET_STRUCTURE).forEach(function (spreadsheetCode) {
    const sheets = SPREADSHEET_STRUCTURE[spreadsheetCode];

    Object.keys(sheets).forEach(function (sheetName) {
      ensureSheetWithHeaders(spreadsheetCode, sheetName, sheets[sheetName]);

      Logger.log(
        "ÄÃ£ kiá»ƒm tra/táº¡o: " + spreadsheetCode + " / " + sheetName,
      );
    });
  });

  seedSystemConfig();
  seedDefaultRolesAndPermissions();

  writeAuditLog({
    user_id: "SYSTEM",
    hanh_dong: "SETUP_ALL",
    module: "SYSTEM",
    doi_tuong_type: "SPREADSHEET",
    doi_tuong_id: "ALL",
    after: {
      message: "Khá»Ÿi táº¡o cáº¥u trÃºc Giai Ä‘oạn 0 thành công",
    },
  });

  Logger.log("Hoàn tất setup Giai �‘oáº¡n 0.");
}

function validateConfig() {
  const requiredKeys = [
    "DRIVE_ROOT_FOLDER_ID",
    "CORE_HR_SPREADSHEET_ID",
    "SENSITIVE_HR_SPREADSHEET_ID",
    "ATTENDANCE_SPREADSHEET_ID",
    "DOCUMENTS_SPREADSHEET_ID",
    "SYSTEM_SPREADSHEET_ID",
    "TIMEZONE",
  ];

  requiredKeys.forEach(function (key) {
    getRequiredConfig(key);
  });

  Logger.log("Cáº¥u hÃ¬nh há»£p lá»‡.");
}

function seedSystemConfig() {
  const items = [
    {
      key: "APP_NAME",
      value: getRequiredConfig("APP_NAME"),
      value_type: "STRING",
      group: "APP",
      description: "Tên đầy đủ của hệ thống",
      is_secret: "FALSE",
      updated_at: nowIso(),
      updated_by: "SYSTEM",
    },
    {
      key: "APP_SHORT_NAME",
      value: getRequiredConfig("APP_SHORT_NAME"),
      value_type: "STRING",
      group: "APP",
      description: "Tên ngắn của hệ thống",
      is_secret: "FALSE",
      updated_at: nowIso(),
      updated_by: "SYSTEM",
    },
    {
      key: "DEFAULT_LEAVE_DAYS",
      value: "12",
      value_type: "NUMBER",
      group: "HRM",
      description: "Số ngày phép mặc định",
      is_secret: "FALSE",
      updated_at: nowIso(),
      updated_by: "SYSTEM",
    },
    {
      key: "QR_EXPIRE_SECONDS",
      value: "60",
      value_type: "NUMBER",
      group: "ATTENDANCE",
      description: "Thời gian hết hạn QR động",
      is_secret: "FALSE",
      updated_at: nowIso(),
      updated_by: "SYSTEM",
    },
    {
      key: "MAX_ATTENDANCE_PER_DAY",
      value: "10",
      value_type: "NUMBER",
      group: "ATTENDANCE",
      description: "Sá»‘ láº§n cháº¥m cÃ´ng tá»‘i Ä‘a má»—i ngày",
      is_secret: "FALSE",
      updated_at: nowIso(),
      updated_by: "SYSTEM",
    },
  ];

  const existing = readAllObjects("SYSTEM", "SystemConfig");
  const existingKeys = existing.map(function (item) {
    return String(item.key || "");
  });

  items.forEach(function (item) {
    if (existingKeys.indexOf(item.key) === -1) {
      appendObjectRow("SYSTEM", "SystemConfig", item);
    }
  });

  Logger.log("Đã seed SystemConfig.");
}

function seedDefaultRolesAndPermissions() {
  seedRoles();
  seedPermissions();
  seedRolePermissions();
  rebuildRbacAuditDetail();

  Logger.log("Đã seed Roles, Permissions, RolePermissions.");
}

function seedRoles() {
  const roles = [
    ["SUPER_ADMIN", "Quản trị tối cao", "SYSTEM", "Toàn quyền hệ thống"],
    ["GIAM_DOC", "Giám đốc", "COMPANY", "Quản trị và phê duyệt cấp đơn vị"],
    ["CHU_TICH", "Chủ tịch", "COMPANY", "Quản trị và phê duyệt cấp công ty"],
    [
      "PHO_CHU_TICH",
      "Phó Chủ tịch",
      "COMPANY",
      "Quản trị và phê duyệt cấp công ty",
    ],
    [
      "PHO_GIAM_DOC",
      "Phó Giám đốc",
      "COMPANY",
      "Quản trị và phê duyệt cấp đơn vị",
    ],
    [
      "HR",
      "Nhân sự/HR",
      "COMPANY",
      "Quản lý hồ sơ nhân sự, chấm công, nghỉ phép",
    ],
    ["KE_TOAN", "Kế toán", "COMPANY", "Quản lý lương và thông tin thanh toán"],
    [
      "TRUONG_DON_VI",
      "Trưởng đơn vị",
      "GENERAL",
      "Quản lý phạm vi đơn vị được giao",
    ],
    [
      "TRUONG_PHONG",
      "Trưởng Phòng",
      "GENERAL",
      "Quản lý phạm vi phòng được giao",
    ],
    [
      "PHO_TRUONG_PHONG",
      "Phó Trưởng Phòng",
      "GENERAL",
      "Quản lý phạm vi phòng được giao",
    ],
    ["PHO_DON_VI", "Phó đơn vị", "GENERAL", "Quản lý phạm vi đơn vị được giao"],
    ["CHUYEN_VIEN", "Chuyên viên", "COMPANY", "Người dùng nội bộ công ty"],
    ["THUC_TAP_SINH", "Thực tập sinh", "COMPANY", "Người dùng thực tập nội bộ"],
    ["NGUOI_XEM", "Người xem", "GENERAL", "Chỉ xem dữ liệu được cấp quyền"],
    ["CHU_NHIEM_CHI_NHANH", "Chủ nhiệm Chi nhánh", "CLUB", "Quản lý chi nhánh"],
    [
      "PHO_CHU_NHIEM_CHI_NHANH",
      "Phó Chủ nhiệm Chi nhánh",
      "CLUB",
      "Quản lý chi nhánh",
    ],
    ["TINH_NGUYEN_VIEN", "Tình nguyện viên", "CLUB", "Tình nguyện viên"],
    ["TONG_CHU_NHIEM", "Tổng Chủ nhiệm", "CLUB", "Quản trị cấp Ban Chủ nhiệm"],
    [
      "PHO_TONG_CHU_NHIEM",
      "Phó Tổng Chủ nhiệm",
      "CLUB",
      "Quản trị cấp Ban Chủ nhiệm",
    ],
    [
      "CHANH_VAN_PHONG",
      "Chánh Văn phòng Ban Chủ nhiệm Nhóm",
      "CLUB",
      "Quản trị văn phòng Ban Chủ nhiệm",
    ],
    ["TRUONG_BAN", "Trưởng Ban", "CLUB", "Quản lý ban chuyên môn"],
    [
      "PHO_CHANH_VAN_PHONG",
      "Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm",
      "CLUB",
      "Quản trị văn phòng Ban Chủ nhiệm",
    ],
    [
      "CHANH_VAN_PHONG_CHI_NHANH",
      "Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
      "CLUB",
      "Quản trị văn phòng Ban Chủ nhiệm Chi nhánh",
    ],
    [
      "PHO_CHANH_VAN_PHONG_CHI_NHANH",
      "Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
      "CLUB",
      "Quản trị văn phòng Ban Chủ nhiệm Chi nhánh",
    ],
    [
      "PHO_CHU_NHIEM_TT_CHI_NHANH",
      "Phó Chủ nhiệm Thường trực Chi nhánh",
      "CLUB",
      "Quản lý chi nhánh",
    ],
    ["PHO_TRUONG_BAN", "Phó Trưởng Ban", "CLUB", "Quản lý ban chuyên môn"],
    [
      "TRUONG_BAN_CHI_NHANH",
      "Trưởng Ban thuộc Chi nhánh",
      "CLUB",
      "Quản lý ban chuyên môn thuộc Chi nhánh",
    ],
    [
      "PHO_TRUONG_BAN_CHI_NHANH",
      "Phó Trưởng Ban thuộc Chi nhánh",
      "CLUB",
      "Quản lý ban chuyên môn thuộc Chi nhánh",
    ],
  ];

  const existing = readAllObjects("CORE_HR", "Roles");
  const existingCodes = existing.map(function (r) {
    return String(r.role_code || "");
  });

  roles.forEach(function (r) {
    if (existingCodes.indexOf(r[0]) !== -1) {
      const existingRole = findOneObject("CORE_HR", "Roles", function (row) {
        return String(row.role_code || "") === String(r[0]);
      });

      if (existingRole && existingRole.id) {
        updateObjectById("CORE_HR", "Roles", existingRole.id, {
          role_name: r[1],
          role_group: r[2],
          mo_ta: r[3],
          trang_thai: "ACTIVE",
          updated_at: nowIso(),
        });
      }
    } else {
      appendObjectRow("CORE_HR", "Roles", {
        id: generateId("ROLE"),
        role_code: r[0],
        role_name: r[1],
        role_group: r[2],
        mo_ta: r[3],
        trang_thai: "ACTIVE",
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
  });
}

function seedPermissions() {
  const permissions = [
    ["people.view", "people", "view", "Xem há»“ sÆ¡ cÃ¡ nhÃ¢n"],
    ["people.create", "people", "create", "Táº¡o há»“ sơ cá nhân"],
    ["people.update", "people", "update", "Cập nhật h�“ sÆ¡ cÃ¡ nhÃ¢n"],
    ["people.delete", "people", "delete", "XÃ³a há»“ sÆ¡ cÃ¡ nhÃ¢n"],

    ["org.view", "org", "view", "Xem cÃ¢y tá»• chá»©c"],
    ["org.manage", "org", "manage", "Quáº£n lÃ½ cÃ¢y tá»• chức"],

    ["attendance.checkin", "attendance", "checkin", "Chấm công"],
    ["attendance.view", "attendance", "view", "Xem chấm công"],
    ["attendance.approve", "attendance", "approve", "Duy�‡t cháº¥m cÃ´ng"],

    ["leave.request", "leave", "request", "Táº¡o Ä‘Æ¡n nghá»‰"],
    ["leave.view", "leave", "view", "Xem Ä‘Æ¡n nghá»‰"],
    ["leave.approve", "leave", "approve", "Duyá»‡t Ä‘Æ¡n nghá»‰"],

    ["payroll.view", "payroll", "view", "Xem bảng lương"],
    ["payroll.manage", "payroll", "manage", "Quản lý bảng lương"],

    ["documents.view", "documents", "view", "Xem v�ƒn báº£n"],
    ["documents.create", "documents", "create", "Táº¡o vÄƒn báº£n"],
    ["documents.update", "documents", "update", "Cáº­p nháº­t vÄƒn báº£n"],
    ["documents.approve", "documents", "approve", "Duyá»‡t vÄƒn bản"],

    ["admin.manage_users", "admin", "manage_users", "Quản lý tài khoản"],
    ["admin.manage_config", "admin", "manage_config", "Quản lý cấu hình"],
    ["admin.view_audit", "admin", "view_audit", "Xem nhật ký h�‡ thá»‘ng"],
  ];

  const existing = readAllObjects("CORE_HR", "Permissions");
  const existingCodes = existing.map(function (p) {
    return String(p.permission_code || "");
  });

  permissions.forEach(function (p) {
    if (existingCodes.indexOf(p[0]) === -1) {
      appendObjectRow("CORE_HR", "Permissions", {
        id: generateId("PERM"),
        permission_code: p[0],
        module: p[1],
        action: p[2],
        mo_ta: p[3],
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
  });
}

function seedRolePermissions() {
  const allPermissions = readAllObjects("CORE_HR", "Permissions").map(
    function (p) {
      return String(p.permission_code || "");
    },
  );

  const employeePermissions = [
    "people.view",
    "attendance.checkin",
    "attendance.view",
    "leave.request",
    "leave.view",
    "documents.view",
    "payroll.view",
  ];

  const viewerPermissions = [
    "people.view",
    "attendance.view",
    "leave.view",
    "documents.view",
    "payroll.view",
  ];

  const attendanceApprovalPermissions = mergePermissionLists_([
    employeePermissions,
    [
      "people.view",
      "org.view",
      "attendance.view",
      "attendance.approve",
      "leave.view",
      "leave.approve",
      "documents.view",
    ],
  ]);

  const leadershipPermissions = mergePermissionLists_([
    attendanceApprovalPermissions,
    ["payroll.view", "documents.approve", "admin.view_audit"],
  ]);

  const documentAdminPermissions = mergePermissionLists_([
    attendanceApprovalPermissions,
    ["documents.create", "documents.update", "documents.approve"],
  ]);

  const defaultMap = {
    SUPER_ADMIN: allPermissions,

    GIAM_DOC: leadershipPermissions,
    PHO_GIAM_DOC: leadershipPermissions,
    CHU_TICH: leadershipPermissions,
    PHO_CHU_TICH: leadershipPermissions,
    TONG_CHU_NHIEM: leadershipPermissions,
    PHO_TONG_CHU_NHIEM: leadershipPermissions,

    HR: [
      "people.view",
      "people.create",
      "people.update",
      "org.view",
      "attendance.view",
      "attendance.approve",
      "leave.view",
      "leave.approve",
      "documents.view",
    ],

    KE_TOAN: [
      "people.view",
      "attendance.view",
      "payroll.view",
      "payroll.manage",
      "documents.view",
    ],

    TRUONG_DON_VI: attendanceApprovalPermissions,
    PHO_DON_VI: attendanceApprovalPermissions,
    TRUONG_PHONG: attendanceApprovalPermissions,
    PHO_TRUONG_PHONG: attendanceApprovalPermissions,
    CHU_NHIEM_CHI_NHANH: attendanceApprovalPermissions,
    PHO_CHU_NHIEM_CHI_NHANH: attendanceApprovalPermissions,
    PHO_CHU_NHIEM_TT_CHI_NHANH: attendanceApprovalPermissions,
    TRUONG_BAN: attendanceApprovalPermissions,
    PHO_TRUONG_BAN: attendanceApprovalPermissions,
    TRUONG_BAN_CHI_NHANH: attendanceApprovalPermissions,
    PHO_TRUONG_BAN_CHI_NHANH: attendanceApprovalPermissions,

    CHANH_VAN_PHONG: documentAdminPermissions,
    PHO_CHANH_VAN_PHONG: documentAdminPermissions,
    CHANH_VAN_PHONG_CHI_NHANH: documentAdminPermissions,
    PHO_CHANH_VAN_PHONG_CHI_NHANH: documentAdminPermissions,

    CHUYEN_VIEN: employeePermissions,
    THUC_TAP_SINH: employeePermissions,
    TINH_NGUYEN_VIEN: employeePermissions,
    THANH_VIEN: employeePermissions,
    NGUOI_XEM: viewerPermissions,
  };

  const existing = readAllObjects("CORE_HR", "RolePermissions");
  const existingKeys = existing.map(function (item) {
    return (
      String(item.role_code || "") + "|" + String(item.permission_code || "")
    );
  });

  Object.keys(defaultMap).forEach(function (roleCode) {
    defaultMap[roleCode].forEach(function (permissionCode) {
      const key = roleCode + "|" + permissionCode;

      if (existingKeys.indexOf(key) === -1) {
        appendObjectRow("CORE_HR", "RolePermissions", {
          id: generateId("RP"),
          role_code: roleCode,
          permission_code: permissionCode,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    });
  });
}

function mergePermissionLists_(groups) {
  const seen = {};
  const merged = [];

  groups.forEach(function (group) {
    (group || []).forEach(function (permissionCode) {
      const code = String(permissionCode || "");

      if (code && !seen[code]) {
        seen[code] = true;
        merged.push(code);
      }
    });
  });

  return merged;
}
