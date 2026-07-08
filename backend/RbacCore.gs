function getUserRoleAssignments(userId) {
  if (!userId) {
    return [];
  }

  return findObjects('CORE_HR', 'UserRoleAssignments', function (row) {
    return String(row.user_id || '') === String(userId) &&
      String(row.trang_thai || '') === 'ACTIVE';
  });
}

function getEffectiveRoleAssignmentsForUser_(userId) {
  const assignments = getUserRoleAssignments(userId).slice();
  const user = findObjectById('CORE_HR', 'UserAccounts', userId);
  const personId = user ? String(user.person_id || '') : '';
  const seen = {};

  assignments.forEach(function (assignment) {
    const key = [
      normalizeRoleCodeForRbac_(assignment.role_code),
      String(assignment.org_unit_id || ''),
      String(assignment.scope_type || 'SELF')
    ].join('|');
    seen[key] = true;
  });

  if (!personId) {
    return assignments;
  }

  const memberships = findObjects('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === personId &&
      String(row.trang_thai || '') === 'ACTIVE';
  });

  memberships.forEach(function (membership) {
    const roleCode = getRoleCodeByPositionId_(membership.position_id || '');

    if (!roleCode) {
      return;
    }

    const scopeType = roleCode === 'CHUYEN_VIEN' ||
      roleCode === 'THUC_TAP_SINH' ||
      roleCode === 'TINH_NGUYEN_VIEN' ||
      roleCode === 'NGUOI_XEM'
      ? 'SELF'
      : 'ORG_TREE';
    const key = [
      roleCode,
      String(membership.org_unit_id || ''),
      scopeType
    ].join('|');

    if (!seen[key]) {
      seen[key] = true;
      assignments.push({
        id: 'POSITION_' + String(membership.id || membership.position_id || ''),
        user_id: userId,
        role_code: roleCode,
        org_unit_id: membership.org_unit_id || '',
        scope_type: scopeType,
        trang_thai: 'ACTIVE',
        source: 'POSITION'
      });
    }
  });

  return assignments;
}

function getRolePermissions(roleCode) {
  if (!roleCode) {
    return [];
  }

  roleCode = normalizeRoleCodeForRbac_(roleCode);

  const permissionSet = {};

  findObjects('CORE_HR', 'RolePermissions', function (row) {
    return String(row.role_code || '') === String(roleCode || '');
  }).map(function (row) {
    permissionSet[String(row.permission_code || '')] = true;
  });

  getDefaultRolePermissionsForRbac_(roleCode).forEach(function (permissionCode) {
    permissionSet[permissionCode] = true;
  });

  return Object.keys(permissionSet);
}

function getDefaultRolePermissionsForRbac_(roleCode) {
  const normalizedRoleCode = normalizeRoleCodeForRbac_(roleCode);
  const employeePermissions = [
    'people.view',
    'attendance.checkin',
    'attendance.view',
    'leave.request',
    'leave.view',
    'documents.view',
    'payroll.view'
  ];
  const viewerPermissions = [
    'people.view',
    'attendance.view',
    'leave.view',
    'documents.view',
    'payroll.view'
  ];
  const attendanceApprovalPermissions = mergePermissionListsForRbac_([
    employeePermissions,
    [
    'people.view',
    'org.view',
    'attendance.view',
    'attendance.approve',
    'leave.view',
    'leave.approve',
    'documents.view'
    ]
  ]);
  const leadershipPermissions = mergePermissionListsForRbac_([
    attendanceApprovalPermissions,
    [
    'payroll.view',
    'documents.approve',
    'admin.view_audit'
    ]
  ]);
  const documentAdminPermissions = mergePermissionListsForRbac_([
    attendanceApprovalPermissions,
    [
    'documents.create',
    'documents.update',
    'documents.approve'
    ]
  ]);
  const defaults = {
    GIAM_DOC: leadershipPermissions,
    PHO_GIAM_DOC: leadershipPermissions,
    CHU_TICH: leadershipPermissions,
    PHO_CHU_TICH: leadershipPermissions,
    TONG_CHU_NHIEM: leadershipPermissions,
    PHO_TONG_CHU_NHIEM: leadershipPermissions,
    HR: [
      'people.view',
      'people.create',
      'people.update',
      'org.view',
      'attendance.view',
      'attendance.approve',
      'leave.view',
      'leave.approve',
      'documents.view'
    ],
    KE_TOAN: [
      'people.view',
      'attendance.view',
      'payroll.view',
      'payroll.manage',
      'documents.view'
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
    NGUOI_XEM: viewerPermissions
  };

  if (normalizedRoleCode === 'SUPER_ADMIN') {
    return readAllObjects('CORE_HR', 'Permissions').map(function (permission) {
      return String(permission.permission_code || '');
    });
  }

  return defaults[normalizedRoleCode] || [];
}

function mergePermissionListsForRbac_(groups) {
  const seen = {};
  const merged = [];

  groups.forEach(function (group) {
    (group || []).forEach(function (permissionCode) {
      const code = String(permissionCode || '');

      if (code && !seen[code]) {
        seen[code] = true;
        merged.push(code);
      }
    });
  });

  return merged;
}

function getRoleCodeByPositionId_(positionId) {
  const position = findObjectById('CORE_HR', 'Positions', positionId);

  if (!position) {
    return '';
  }

  return normalizeRoleCodeForRbac_(position.ma_chuc_danh || position.role_code || '');
}

function getPositionPermissions(positionId) {
  const position = findObjectById('CORE_HR', 'Positions', positionId);

  if (!position) {
    return {
      position: null,
      role_code: '',
      permissions: []
    };
  }

  const roleCode = normalizeRoleCodeForRbac_(position.ma_chuc_danh || position.role_code || '');

  return {
    position: position,
    role_code: roleCode,
    permissions: getRolePermissions(roleCode)
  };
}

function rebuildRbacAuditDetail() {
  ensureSheetWithHeaders('CORE_HR', 'RbacAuditDetail', SPREADSHEET_STRUCTURE.CORE_HR.RbacAuditDetail);

  const positions = readAllObjects('CORE_HR', 'Positions');
  const existing = readAllObjects('CORE_HR', 'RbacAuditDetail');
  const existingMap = {};
  const auditedAt = nowIso();

  existing.forEach(function (row) {
    existingMap[String(row.id || '')] = true;
  });

  positions.forEach(function (position) {
    const positionId = String(position.id || '');
    const roleCode = normalizeRoleCodeForRbac_(position.ma_chuc_danh || position.role_code || '');
    const permissions = getRolePermissions(roleCode);

    permissions.forEach(function (permissionCode) {
      const auditId = ['RBACD', positionId, roleCode, permissionCode]
        .join('_')
        .replace(/[^A-Za-z0-9_]/g, '_')
        .toUpperCase();

      const row = {
        id: auditId,
        position_id: positionId,
        ma_chuc_danh: position.ma_chuc_danh || '',
        ten_chuc_danh: position.ten_chuc_danh || '',
        role_code: roleCode,
        permission_code: permissionCode,
        permission_source: 'RolePermissions',
        permission_status: 'ACTIVE',
        audit_note: 'Quyền được suy ra từ chức danh -> role -> RolePermissions.',
        audited_at: auditedAt,
        updated_at: auditedAt
      };

      if (existingMap[auditId]) {
        updateObjectById('CORE_HR', 'RbacAuditDetail', auditId, row);
      } else {
        appendObjectRowWithLock('CORE_HR', 'RbacAuditDetail', row);
      }
    });
  });

  return ok({
    total_positions: positions.length
  }, 'Đã đồng bộ RbacAuditDetail theo chức danh và RolePermissions.');
}

function rebuildRbacAuditDetailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.manage_config');

  return rebuildRbacAuditDetail();
}

function getUserPermissions(userId) {
  const assignments = getEffectiveRoleAssignmentsForUser_(userId);
  const permissionSet = {};

  assignments.forEach(function (assignment) {
    const permissions = getRolePermissions(assignment.role_code);

    permissions.forEach(function (permissionCode) {
      permissionSet[permissionCode] = true;
    });
  });

  return Object.keys(permissionSet);
}

function userHasRole(userId, roleCode) {
  const assignments = getEffectiveRoleAssignmentsForUser_(userId);

  return assignments.some(function (assignment) {
    return normalizeRoleCodeForRbac_(assignment.role_code) === normalizeRoleCodeForRbac_(roleCode) &&
      String(assignment.trang_thai || '') === 'ACTIVE';
  });
}

function userHasPermission(userId, permissionCode, targetOrgUnitId) {
  const assignments = getEffectiveRoleAssignmentsForUser_(userId);

  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];
    const roleCode = normalizeRoleCodeForRbac_(assignment.role_code);
    const scopeType = String(assignment.scope_type || 'SELF');
    const assignmentOrgUnitId = String(assignment.org_unit_id || '');

    const rolePermissions = getRolePermissions(roleCode);

    if (rolePermissions.indexOf(permissionCode) === -1) {
      continue;
    }

    if (roleCode === 'SUPER_ADMIN' || scopeType === 'ALL') {
      return true;
    }

    if (!targetOrgUnitId) {
      return true;
    }

    if (scopeType === 'ORG_ONLY') {
      if (assignmentOrgUnitId && assignmentOrgUnitId === String(targetOrgUnitId)) {
        return true;
      }
    }

    if (scopeType === 'ORG_TREE') {
      if (isOrgUnitInScope(String(targetOrgUnitId), assignmentOrgUnitId)) {
        return true;
      }
    }

    if (scopeType === 'SELF') {
      return true;
    }
  }

  return false;
}

function requirePermission(user, permissionCode, targetOrgUnitId) {
  if (!user || !user.id) {
    throw new Error('Chưa đăng nhập.');
  }

  const allowed = userHasPermission(user.id, permissionCode, targetOrgUnitId);

  if (!allowed) {
    throw new Error('Bạn không có quyền: ' + permissionCode);
  }

  return true;
}

function userHasAnyPermission(userId, permissionCodes, targetOrgUnitId) {
  for (let i = 0; i < permissionCodes.length; i++) {
    if (userHasPermission(userId, permissionCodes[i], targetOrgUnitId)) {
      return true;
    }
  }

  return false;
}

function requireAnyPermission(user, permissionCodes, targetOrgUnitId) {
  if (!user || !user.id) {
    throw new Error('Chua dang nhap.');
  }

  if (!userHasAnyPermission(user.id, permissionCodes, targetOrgUnitId)) {
    throw new Error('Ban khong co quyen: ' + permissionCodes.join(' hoac '));
  }

  return true;
}

function isOrgUnitInScope(targetOrgUnitId, rootOrgUnitId) {
  if (!targetOrgUnitId || !rootOrgUnitId) {
    return false;
  }

  if (String(targetOrgUnitId) === String(rootOrgUnitId)) {
    return true;
  }

  const orgUnits = readAllObjects('CORE_HR', 'OrgUnits');

  const map = {};
  orgUnits.forEach(function (org) {
    map[String(org.id || '')] = org;
  });

  let current = map[String(targetOrgUnitId)];

  while (current) {
    const parentId = String(current.parent_id || '');

    if (!parentId) {
      return false;
    }

    if (parentId === String(rootOrgUnitId)) {
      return true;
    }

    current = map[parentId];
  }

  return false;
}

function normalizeRoleCodeForRbac_(roleCode) {
  const text = String(roleCode || '').trim().toUpperCase();
  const aliases = {
    'GIÁM ĐỐC': 'GIAM_DOC',
    'GIAM DOC': 'GIAM_DOC',
    'PHÓ GIÁM ĐỐC': 'PHO_GIAM_DOC',
    'PHO GIAM DOC': 'PHO_GIAM_DOC',
    'CHỦ TỊCH': 'CHU_TICH',
    'CHU TICH': 'CHU_TICH',
    'PHÓ CHỦ TỊCH': 'PHO_CHU_TICH',
    'PHO CHU TICH': 'PHO_CHU_TICH',
    'TRƯỞNG PHÒNG': 'TRUONG_PHONG',
    'TRUONG PHONG': 'TRUONG_PHONG',
    'PHÓ TRƯỞNG PHÒNG': 'PHO_TRUONG_PHONG',
    'PHO TRUONG PHONG': 'PHO_TRUONG_PHONG',
    'QUẢN LÝ': 'TRUONG_DON_VI',
    'QUAN LY': 'TRUONG_DON_VI',
    'QUAN_LY': 'TRUONG_DON_VI',
    'MANAGER': 'TRUONG_DON_VI',
    'CHANH_VP_BCN': 'CHANH_VAN_PHONG',
    'CHANH VAN PHONG BAN CHU NHIEM NHOM': 'CHANH_VAN_PHONG',
    'CHANH VAN PHONG BAN CHU NHIEM CHI NHANH': 'CHANH_VAN_PHONG_CHI_NHANH',
    'PHO CHANH VAN PHONG BAN CHU NHIEM CHI NHANH': 'PHO_CHANH_VAN_PHONG_CHI_NHANH',
    'THANH_VIEN': 'TINH_NGUYEN_VIEN',
    'THÀNH VIÊN': 'TINH_NGUYEN_VIEN',
    'THANH VIEN': 'TINH_NGUYEN_VIEN',
    'TÌNH NGUYỆN VIÊN': 'TINH_NGUYEN_VIEN',
    'TINH NGUYEN VIEN': 'TINH_NGUYEN_VIEN',
    'PHÓ TỔNG CHỦ NHIỆM': 'PHO_TONG_CHU_NHIEM',
    'PHO TONG CHU NHIEM': 'PHO_TONG_CHU_NHIEM',
    'TRƯỞNG BAN THUỘC CHI NHÁNH': 'TRUONG_BAN_CHI_NHANH',
    'TRUONG BAN THUOC CHI NHANH': 'TRUONG_BAN_CHI_NHANH',
    'PHÓ TRƯỞNG BAN THUỘC CHI NHÁNH': 'PHO_TRUONG_BAN_CHI_NHANH',
    'PHO TRUONG BAN THUOC CHI NHANH': 'PHO_TRUONG_BAN_CHI_NHANH',
    'KẾ TOÁN': 'KE_TOAN',
    'KE TOAN': 'KE_TOAN',
    'NHÂN SỰ': 'HR',
    'NHAN SU': 'HR'
  };

  return aliases[text] || text;
}
