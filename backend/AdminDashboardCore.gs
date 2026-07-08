function setupPhase7() {
  seedAdminDashboardSystemConfig();

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'SETUP_PHASE_7',
    module: 'ADMIN',
    doi_tuong_type: 'PHASE',
    doi_tuong_id: 'PHASE_7',
    after: {
      message: 'Hoàn tất setup Giai đoạn 7: Admin Console + Dashboard'
    }
  });

  Logger.log('Hoàn tất setup Giai đoạn 7.');
}

function seedAdminDashboardSystemConfig() {
  const configs = [
    {
      key: 'DASHBOARD_DEFAULT_MONTH',
      value: Utilities.formatDate(new Date(), getRequiredConfig('TIMEZONE'), 'yyyy-MM'),
      value_type: 'STRING',
      group: 'DASHBOARD',
      description: 'Tháng mặc định khi mở dashboard',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'ADMIN_LOG_PAGE_SIZE',
      value: '100',
      value_type: 'NUMBER',
      group: 'ADMIN',
      description: 'Số dòng log mặc định trả về',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'NOTIFICATION_DEFAULT_TYPE',
      value: 'INFO',
      value_type: 'STRING',
      group: 'NOTIFICATION',
      description: 'Loại thông báo mặc định',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    }
  ];

  const existing = readAllObjects('SYSTEM', 'SystemConfig');
  const existingKeys = existing.map(function (item) {
    return String(item.key || '');
  });

  configs.forEach(function (item) {
    if (existingKeys.indexOf(item.key) === -1) {
      appendObjectRowWithLock('SYSTEM', 'SystemConfig', item);
    }
  });
}

/**
 * =========================
 * DASHBOARD TỔNG QUAN
 * =========================
 */

function adminDashboardOverviewHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.view_audit');

  const month = normalizeText(getRequestParam(
    e,
    'month',
    Utilities.formatDate(new Date(), getRequiredConfig('TIMEZONE'), 'yyyy-MM')
  ));

  const fromDate = normalizeText(getRequestParam(e, 'from', month + '-01'));
  const toDate = normalizeText(getRequestParam(e, 'to', getLastDateOfMonth(month.substring(0, 4), month.substring(5, 7))));

  const data = {
    period: {
      month: month,
      from: fromDate,
      to: toDate
    },
    people: buildPeopleDashboard(),
    attendance: buildAttendanceDashboard(fromDate, toDate),
    leave: buildLeaveDashboard(fromDate, toDate),
    payroll: buildPayrollDashboard(month),
    documents: buildDocumentsDashboard(fromDate, toDate),
    system: buildSystemDashboard(fromDate, toDate)
  };

  return ok(data, 'Lấy dashboard tổng quan thành công.');
}

function buildPeopleDashboard() {
  const people = readAllObjects('CORE_HR', 'People');
  const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships');
  const users = readAllObjects('CORE_HR', 'UserAccounts');

  const activePeople = people.filter(function (p) {
    return String(p.trang_thai || '') === 'ACTIVE';
  });

  const companyMembers = memberships.filter(function (m) {
    return String(m.org_type || '') === 'COMPANY' &&
      String(m.trang_thai || '') === 'ACTIVE';
  });

  const clubMembers = memberships.filter(function (m) {
    return String(m.org_type || '') === 'CLUB' &&
      String(m.trang_thai || '') === 'ACTIVE';
  });

  const activeUsers = users.filter(function (u) {
    return String(u.trang_thai || '') === 'ACTIVE';
  });

  const lockedUsers = users.filter(function (u) {
    return String(u.trang_thai || '') === 'LOCKED';
  });

  return {
    total_people: people.length,
    active_people: activePeople.length,
    company_memberships: companyMembers.length,
    club_memberships: clubMembers.length,
    total_users: users.length,
    active_users: activeUsers.length,
    locked_users: lockedUsers.length
  };
}

function buildAttendanceDashboard(fromDate, toDate) {
  const logs = readAllObjects('ATTENDANCE', 'AttendanceLogs')
    .filter(function (row) {
      return String(row.ngay || '') >= String(fromDate || '') &&
        String(row.ngay || '') <= String(toDate || '');
    });

  const summaries = readAllObjects('ATTENDANCE', 'AttendanceSummary')
    .filter(function (row) {
      return String(row.ngay || '') >= String(fromDate || '') &&
        String(row.ngay || '') <= String(toDate || '');
    });

  const approved = logs.filter(function (row) {
    return String(row.trang_thai_duyet || '') === 'APPROVED';
  });

  const pending = logs.filter(function (row) {
    return String(row.trang_thai_duyet || '') === 'PENDING';
  });

  const rejected = logs.filter(function (row) {
    return String(row.trang_thai_duyet || '') === 'REJECTED';
  });

  const completed = summaries.filter(function (row) {
    return String(row.trang_thai || '') === 'COMPLETED';
  });

  let totalWorkDays = 0;
  let totalHours = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;

  completed.forEach(function (row) {
    totalWorkDays += toNumber(row.so_cong);
    totalHours += toNumber(row.so_gio);
    lateMinutes += toNumber(row.di_tre_phut);
    earlyLeaveMinutes += toNumber(row.ve_som_phut);
  });

  return {
    total_logs: logs.length,
    approved_logs: approved.length,
    pending_logs: pending.length,
    rejected_logs: rejected.length,
    completed_days: completed.length,
    total_work_days: Math.round(totalWorkDays * 100) / 100,
    total_hours: Math.round(totalHours * 100) / 100,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes
  };
}

function buildLeaveDashboard(fromDate, toDate) {
  const requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED' &&
        String(row.tu_ngay || '') <= String(toDate || '') &&
        String(row.den_ngay || '') >= String(fromDate || '');
    });

  const pending = requests.filter(function (row) {
    return String(row.trang_thai || '') === 'PENDING';
  });

  const approved = requests.filter(function (row) {
    return String(row.trang_thai || '') === 'APPROVED';
  });

  const rejected = requests.filter(function (row) {
    return String(row.trang_thai || '') === 'REJECTED';
  });

  const cancelled = requests.filter(function (row) {
    return String(row.trang_thai || '') === 'CANCELLED';
  });

  let approvedDays = 0;
  let pendingDays = 0;

  approved.forEach(function (row) {
    approvedDays += toNumber(row.so_ngay);
  });

  pending.forEach(function (row) {
    pendingDays += toNumber(row.so_ngay);
  });

  return {
    total_requests: requests.length,
    pending_requests: pending.length,
    approved_requests: approved.length,
    rejected_requests: rejected.length,
    cancelled_requests: cancelled.length,
    approved_days: approvedDays,
    pending_days: pendingDays
  };
}

function buildPayrollDashboard(monthText) {
  const parts = String(monthText || '').split('-');
  const year = parts[0] || String(new Date().getFullYear());
  const month = parts[1] || String(new Date().getMonth() + 1);

  const periods = readAllObjects('SENSITIVE_HR', 'PayrollPeriods')
    .filter(function (row) {
      return String(row.nam || '') === String(year) &&
        pad2(row.thang) === pad2(month) &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  const periodIds = {};
  periods.forEach(function (p) {
    periodIds[String(p.id || '')] = true;
  });

  const payslips = readAllObjects('SENSITIVE_HR', 'Payslips')
    .filter(function (row) {
      return periodIds[String(row.payroll_period_id || '')] === true &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  let totalNetPay = 0;
  let totalBaseSalary = 0;
  let totalAllowance = 0;
  let totalBonus = 0;
  let totalDeduction = 0;

  payslips.forEach(function (row) {
    totalNetPay += toNumber(row.thuc_nhan_encrypted);
    totalBaseSalary += toNumber(row.luong_co_ban_encrypted);
    totalAllowance += toNumber(row.phu_cap);
    totalBonus += toNumber(row.thuong);
    totalDeduction += toNumber(row.khau_tru);
  });

  return {
    payroll_periods: periods.length,
    payslips: payslips.length,
    total_base_salary: totalBaseSalary,
    total_allowance: totalAllowance,
    total_bonus: totalBonus,
    total_deduction: totalDeduction,
    total_net_pay: totalNetPay
  };
}

function buildDocumentsDashboard(fromDate, toDate) {
  const documents = readAllObjects('DOCUMENTS', 'Documents')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  const versions = readAllObjects('DOCUMENTS', 'DocumentVersions')
    .filter(function (row) {
      const uploaded = String(row.ngay_upload || '').substring(0, 10);
      return uploaded >= String(fromDate || '') && uploaded <= String(toDate || '');
    });

  const views = readAllObjects('DOCUMENTS', 'DocumentViewLogs')
    .filter(function (row) {
      const viewed = String(row.thoi_gian || '').substring(0, 10);
      return viewed >= String(fromDate || '') && viewed <= String(toDate || '');
    });

  const emails = readAllObjects('DOCUMENTS', 'DocumentEmailLogs')
    .filter(function (row) {
      const sent = String(row.thoi_gian_gui || '').substring(0, 10);
      return sent >= String(fromDate || '') && sent <= String(toDate || '');
    });

  const published = documents.filter(function (row) {
    return String(row.trang_thai || '') === 'PUBLISHED';
  });

  const drafts = documents.filter(function (row) {
    return String(row.trang_thai || '') === 'DRAFT';
  });

  const archived = documents.filter(function (row) {
    return String(row.trang_thai || '') === 'ARCHIVED';
  });

  const sentEmails = emails.filter(function (row) {
    return String(row.trang_thai_gui || '') === 'SENT';
  });

  const failedEmails = emails.filter(function (row) {
    return String(row.trang_thai_gui || '') === 'FAILED';
  });

  return {
    total_documents: documents.length,
    published_documents: published.length,
    draft_documents: drafts.length,
    archived_documents: archived.length,
    uploaded_versions_in_period: versions.length,
    views_in_period: views.length,
    emails_in_period: emails.length,
    sent_emails: sentEmails.length,
    failed_emails: failedEmails.length
  };
}

function buildSystemDashboard(fromDate, toDate) {
  const auditLogs = readAllObjects('SYSTEM', 'AuditLog')
    .filter(function (row) {
      const date = String(row.thoi_gian || '').substring(0, 10);
      return date >= String(fromDate || '') && date <= String(toDate || '');
    });

  const apiLogs = readAllObjects('SYSTEM', 'ApiLogs')
    .filter(function (row) {
      const date = String(row.created_at || '').substring(0, 10);
      return date >= String(fromDate || '') && date <= String(toDate || '');
    });

  const failedApis = apiLogs.filter(function (row) {
    return Number(row.status_code || 0) >= 400;
  });

  return {
    audit_logs_in_period: auditLogs.length,
    api_requests_in_period: apiLogs.length,
    failed_api_requests: failedApis.length
  };
}

/**
 * =========================
 * DASHBOARD CHI TIẾT
 * =========================
 */

function adminPeopleDashboardHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.view');

  const orgUnits = readAllObjects('CORE_HR', 'OrgUnits');
  const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
    .filter(function (row) {
      return String(row.trang_thai || '') === 'ACTIVE';
    });

  const orgMap = {};
  orgUnits.forEach(function (org) {
    orgMap[String(org.id || '')] = org;
  });

  const byOrg = {};

  memberships.forEach(function (m) {
    const orgId = String(m.org_unit_id || '');

    if (!byOrg[orgId]) {
      byOrg[orgId] = {
        org_unit_id: orgId,
        org_unit_name: orgMap[orgId] ? orgMap[orgId].ten_don_vi : '',
        org_type: m.org_type,
        total: 0
      };
    }

    byOrg[orgId].total += 1;
  });

  const items = Object.keys(byOrg).map(function (key) {
    return byOrg[key];
  }).sort(function (a, b) {
    return b.total - a.total;
  });

  return ok({
    summary: buildPeopleDashboard(),
    by_org_unit: items
  }, 'Lấy dashboard nhân sự thành công.');
}

function adminAttendanceDashboardHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.view');

  const fromDate = normalizeText(getRequestParam(e, 'from', todayDate()));
  const toDate = normalizeText(getRequestParam(e, 'to', todayDate()));

  const logs = readAllObjects('ATTENDANCE', 'AttendanceLogs')
    .filter(function (row) {
      return String(row.ngay || '') >= fromDate &&
        String(row.ngay || '') <= toDate;
    });

  const byDate = {};

  logs.forEach(function (row) {
    const date = String(row.ngay || '');

    if (!byDate[date]) {
      byDate[date] = {
        ngay: date,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
    }

    byDate[date].total += 1;

    if (String(row.trang_thai_duyet || '') === 'APPROVED') {
      byDate[date].approved += 1;
    }

    if (String(row.trang_thai_duyet || '') === 'PENDING') {
      byDate[date].pending += 1;
    }

    if (String(row.trang_thai_duyet || '') === 'REJECTED') {
      byDate[date].rejected += 1;
    }
  });

  const items = Object.keys(byDate).map(function (key) {
    return byDate[key];
  }).sort(function (a, b) {
    return String(a.ngay).localeCompare(String(b.ngay));
  });

  return ok({
    summary: buildAttendanceDashboard(fromDate, toDate),
    by_date: items
  }, 'Lấy dashboard chấm công thành công.');
}

function adminLeaveDashboardHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.view');

  const fromDate = normalizeText(getRequestParam(e, 'from', todayDate()));
  const toDate = normalizeText(getRequestParam(e, 'to', todayDate()));

  const requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED' &&
        String(row.tu_ngay || '') <= toDate &&
        String(row.den_ngay || '') >= fromDate;
    });

  const byType = {};

  requests.forEach(function (row) {
    const type = String(row.loai_nghi || 'KHAC');

    if (!byType[type]) {
      byType[type] = {
        loai_nghi: type,
        total_requests: 0,
        total_days: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      };
    }

    byType[type].total_requests += 1;
    byType[type].total_days += toNumber(row.so_ngay);

    const status = String(row.trang_thai || '');

    if (status === 'PENDING') {
      byType[type].pending += 1;
    }

    if (status === 'APPROVED') {
      byType[type].approved += 1;
    }

    if (status === 'REJECTED') {
      byType[type].rejected += 1;
    }

    if (status === 'CANCELLED') {
      byType[type].cancelled += 1;
    }
  });

  const items = Object.keys(byType).map(function (key) {
    return byType[key];
  }).sort(function (a, b) {
    return b.total_requests - a.total_requests;
  });

  return ok({
    summary: buildLeaveDashboard(fromDate, toDate),
    by_type: items
  }, 'Lấy dashboard nghỉ phép thành công.');
}

function adminPayrollDashboardHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');

  const month = normalizeText(getRequestParam(
    e,
    'month',
    Utilities.formatDate(new Date(), getRequiredConfig('TIMEZONE'), 'yyyy-MM')
  ));

  const data = buildPayrollDashboard(month);

  const parts = month.split('-');
  const year = parts[0];
  const monthNumber = parts[1];

  const periods = readAllObjects('SENSITIVE_HR', 'PayrollPeriods')
    .filter(function (row) {
      return String(row.nam || '') === String(year) &&
        pad2(row.thang) === pad2(monthNumber) &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  const periodIds = {};
  periods.forEach(function (p) {
    periodIds[String(p.id || '')] = true;
  });

  const payslips = readAllObjects('SENSITIVE_HR', 'Payslips')
    .filter(function (row) {
      return periodIds[String(row.payroll_period_id || '')] === true &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  const byStatus = {};

  payslips.forEach(function (row) {
    const status = String(row.trang_thai || 'UNKNOWN');

    if (!byStatus[status]) {
      byStatus[status] = {
        trang_thai: status,
        total: 0,
        total_net_pay: 0
      };
    }

    byStatus[status].total += 1;
    byStatus[status].total_net_pay += toNumber(row.thuc_nhan_encrypted);
  });

  return ok({
    summary: data,
    by_status: Object.keys(byStatus).map(function (key) {
      return byStatus[key];
    })
  }, 'Lấy dashboard lương thành công.');
}

function adminDocumentsDashboardHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.view');

  const fromDate = normalizeText(getRequestParam(e, 'from', todayDate()));
  const toDate = normalizeText(getRequestParam(e, 'to', todayDate()));

  const documents = readAllObjects('DOCUMENTS', 'Documents')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  const byType = {};

  documents.forEach(function (doc) {
    const type = String(doc.loai_van_ban || 'KHAC');

    if (!byType[type]) {
      byType[type] = {
        loai_van_ban: type,
        total: 0,
        draft: 0,
        published: 0,
        archived: 0
      };
    }

    byType[type].total += 1;

    if (String(doc.trang_thai || '') === 'DRAFT') {
      byType[type].draft += 1;
    }

    if (String(doc.trang_thai || '') === 'PUBLISHED') {
      byType[type].published += 1;
    }

    if (String(doc.trang_thai || '') === 'ARCHIVED') {
      byType[type].archived += 1;
    }
  });

  return ok({
    summary: buildDocumentsDashboard(fromDate, toDate),
    by_type: Object.keys(byType).map(function (key) {
      return byType[key];
    })
  }, 'Lấy dashboard văn bản thành công.');
}

/**
 * =========================
 * SYSTEM CONFIG
 * =========================
 */

function listSystemConfigHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.manage_config');

  const group = normalizeText(getRequestParam(e, 'group', ''));

  let configs = readAllObjects('SYSTEM', 'SystemConfig');

  if (group) {
    configs = configs.filter(function (row) {
      return String(row.group || '') === group;
    });
  }

  configs = configs.map(function (row) {
    const isSecret = String(row.is_secret || '').toUpperCase() === 'TRUE';

    return {
      key: row.key,
      value: isSecret ? '********' : row.value,
      value_type: row.value_type,
      group: row.group,
      description: row.description,
      is_secret: row.is_secret,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  });

  return ok({
    total: configs.length,
    items: configs
  }, 'Lấy cấu hình hệ thống thành công.');
}

function updateSystemConfigHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.manage_config');

  const body = parseRequestBody(e);

  const key = normalizeText(requireBodyField(body, 'key', 'Key cấu hình'));
  const value = body.value !== undefined ? String(body.value) : '';
  const valueType = normalizeText(body.value_type || 'STRING');
  const group = normalizeText(body.group || 'GENERAL');
  const description = normalizeText(body.description || '');
  const isSecret = normalizeText(body.is_secret || 'FALSE');

  const existing = findOneObject('SYSTEM', 'SystemConfig', function (row) {
    return String(row.key || '') === key;
  });

  let configRow;

  if (existing) {
    const before = existing;

    const patch = {
      value: value,
      value_type: valueType,
      group: group,
      description: description || existing.description,
      is_secret: isSecret,
      updated_at: nowIso(),
      updated_by: user.id
    };

    updateObjectByRowNumber('SYSTEM', 'SystemConfig', existing.__rowNumber, patch);
    configRow = mergeObjectPatch(existing, patch);

    writeAuditLog({
      user_id: user.id,
      hanh_dong: 'UPDATE_SYSTEM_CONFIG',
      module: 'ADMIN',
      doi_tuong_type: 'SYSTEM_CONFIG',
      doi_tuong_id: key,
      before: sanitizeConfigForAudit(before),
      after: sanitizeConfigForAudit(configRow)
    });
  } else {
    configRow = {
      key: key,
      value: value,
      value_type: valueType,
      group: group,
      description: description,
      is_secret: isSecret,
      updated_at: nowIso(),
      updated_by: user.id
    };

    appendObjectRowWithLock('SYSTEM', 'SystemConfig', configRow);

    writeAuditLog({
      user_id: user.id,
      hanh_dong: 'CREATE_SYSTEM_CONFIG',
      module: 'ADMIN',
      doi_tuong_type: 'SYSTEM_CONFIG',
      doi_tuong_id: key,
      after: sanitizeConfigForAudit(configRow)
    });
  }

  return ok({
    config: sanitizeConfigForResponse(configRow)
  }, 'Cập nhật cấu hình hệ thống thành công.');
}

function sanitizeConfigForResponse(row) {
  const isSecret = String(row.is_secret || '').toUpperCase() === 'TRUE';

  return {
    key: row.key,
    value: isSecret ? '********' : row.value,
    value_type: row.value_type,
    group: row.group,
    description: row.description,
    is_secret: row.is_secret,
    updated_at: row.updated_at,
    updated_by: row.updated_by
  };
}

function sanitizeConfigForAudit(row) {
  const copy = Object.assign({}, row || {});

  if (String(copy.is_secret || '').toUpperCase() === 'TRUE') {
    copy.value = '********';
  }

  return copy;
}

/**
 * =========================
 * LOGS
 * =========================
 */

function listAuditLogsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.view_audit');

  const moduleName = normalizeText(getRequestParam(e, 'module', ''));
  const action = normalizeText(getRequestParam(e, 'hanh_dong', ''));
  const userId = normalizeText(getRequestParam(e, 'user_id', ''));
  const fromDate = normalizeText(getRequestParam(e, 'from', ''));
  const toDate = normalizeText(getRequestParam(e, 'to', ''));
  const limit = toNumber(getRequestParam(e, 'limit', getSystemConfigValue('ADMIN_LOG_PAGE_SIZE', '100')), 100);

  let logs = readAllObjects('SYSTEM', 'AuditLog');

  if (moduleName) {
    logs = logs.filter(function (row) {
      return String(row.module || '') === moduleName;
    });
  }

  if (action) {
    logs = logs.filter(function (row) {
      return String(row.hanh_dong || '') === action;
    });
  }

  if (userId) {
    logs = logs.filter(function (row) {
      return String(row.user_id || '') === userId;
    });
  }

  if (fromDate) {
    logs = logs.filter(function (row) {
      return String(row.thoi_gian || '').substring(0, 10) >= fromDate;
    });
  }

  if (toDate) {
    logs = logs.filter(function (row) {
      return String(row.thoi_gian || '').substring(0, 10) <= toDate;
    });
  }

  logs.sort(function (a, b) {
    return String(b.thoi_gian || '').localeCompare(String(a.thoi_gian || ''));
  });

  return ok({
    total: logs.length,
    items: logs.slice(0, limit)
  }, 'Lấy AuditLog thành công.');
}

function listApiLogsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.view_audit');

  const pathFilter = normalizeText(getRequestParam(e, 'path', ''));
  const statusCode = normalizeText(getRequestParam(e, 'status_code', ''));
  const fromDate = normalizeText(getRequestParam(e, 'from', ''));
  const toDate = normalizeText(getRequestParam(e, 'to', ''));
  const limit = toNumber(getRequestParam(e, 'limit', getSystemConfigValue('ADMIN_LOG_PAGE_SIZE', '100')), 100);

  let logs = readAllObjects('SYSTEM', 'ApiLogs');

  if (pathFilter) {
    logs = logs.filter(function (row) {
      return String(row.path || '').indexOf(pathFilter) !== -1;
    });
  }

  if (statusCode) {
    logs = logs.filter(function (row) {
      return String(row.status_code || '') === statusCode;
    });
  }

  if (fromDate) {
    logs = logs.filter(function (row) {
      return String(row.created_at || '').substring(0, 10) >= fromDate;
    });
  }

  if (toDate) {
    logs = logs.filter(function (row) {
      return String(row.created_at || '').substring(0, 10) <= toDate;
    });
  }

  logs.sort(function (a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return ok({
    total: logs.length,
    items: logs.slice(0, limit)
  }, 'Lấy ApiLogs thành công.');
}

/**
 * =========================
 * NOTIFICATIONS
 * =========================
 */

function createNotificationHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.manage_config');

  const body = parseRequestBody(e);

  const targetUserId = normalizeText(requireBodyField(body, 'user_id', 'ID người nhận'));
  const title = normalizeText(requireBodyField(body, 'title', 'Tiêu đề'));
  const message = normalizeText(requireBodyField(body, 'message', 'Nội dung'));

  const notification = {
    id: generateId('NOTI'),
    user_id: targetUserId,
    title: title,
    message: message,
    type: normalizeText(body.type || getSystemConfigValue('NOTIFICATION_DEFAULT_TYPE', 'INFO')),
    target_url: normalizeText(body.target_url || ''),
    read_at: '',
    created_at: nowIso()
  };

  appendObjectRowWithLock('SYSTEM', 'Notifications', notification);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_NOTIFICATION',
    module: 'ADMIN',
    doi_tuong_type: 'NOTIFICATION',
    doi_tuong_id: notification.id,
    after: notification
  });

  return ok({
    notification: notification
  }, 'Tạo thông báo thành công.');
}

function listMyNotificationsHandler(e) {
  const user = requireAuth(e);

  const unreadOnly = String(getRequestParam(e, 'unread_only', 'FALSE')).toUpperCase() === 'TRUE';

  let notifications = readAllObjects('SYSTEM', 'Notifications')
    .filter(function (row) {
      return String(row.user_id || '') === String(user.id || '');
    });

  if (unreadOnly) {
    notifications = notifications.filter(function (row) {
      return !row.read_at;
    });
  }

  notifications.sort(function (a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return ok({
    total: notifications.length,
    unread: notifications.filter(function (row) {
      return !row.read_at;
    }).length,
    items: notifications
  }, 'Lấy danh sách thông báo thành công.');
}

function markNotificationReadHandler(e) {
  const user = requireAuth(e);

  const body = parseRequestBody(e);
  const notificationId = normalizeText(requireBodyField(body, 'notification_id', 'ID thông báo'));

  const notification = findObjectById('SYSTEM', 'Notifications', notificationId);

  if (!notification) {
    return fail('Không tìm thấy thông báo.', 'NOTIFICATION_NOT_FOUND');
  }

  if (String(notification.user_id || '') !== String(user.id || '')) {
    return fail('Bạn không có quyền cập nhật thông báo này.', 'NOTIFICATION_ACCESS_DENIED');
  }

  const after = updateObjectById('SYSTEM', 'Notifications', notificationId, {
    read_at: nowIso()
  });

  return ok({
    notification: after
  }, 'Đã đánh dấu thông báo là đã đọc.');
}

function markAllNotificationsReadHandler(e) {
  const user = requireAuth(e);

  const notifications = findObjects('SYSTEM', 'Notifications', function (row) {
    return String(row.user_id || '') === String(user.id || '') &&
      !row.read_at;
  });

  const updatedItems = notifications.map(function (row) {
    const patch = {
      read_at: nowIso()
    };

    updateObjectByRowNumber('SYSTEM', 'Notifications', row.__rowNumber, patch);
    return mergeObjectPatch(row, patch);
  });

  return ok({
    updated_count: updatedItems.length,
    items: updatedItems
  }, 'Đã đánh dấu tất cả thông báo là đã đọc.');
}
