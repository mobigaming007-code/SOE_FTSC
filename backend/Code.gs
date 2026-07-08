function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  const startedAt = new Date();
  let path = '';

  try {
    path = e && e.parameter && e.parameter.path
      ? String(e.parameter.path)
      : '';

    let result;

    if (path === 'health') {
      result = ok({
        app: getRequiredConfig('APP_NAME'),
        time: nowIso(),
        status: 'RUNNING'
      });
      return jsonResponse(result);
    }

    if (path === 'setup/check') {
      result = ok({
        message: 'Apps Script backend đã hoạt động',
        time: nowIso()
      });
      return jsonResponse(result);
    }

    // Auth
    if (path === 'auth/login' && method === 'POST') {
      result = loginHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'auth/logout' && method === 'POST') {
      result = logoutHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'auth/me') {
      result = meHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'auth/change-password' && method === 'POST') {
      result = changeMyPasswordHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Org
    if (path === 'org/tree') {
      result = getOrgTreeHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // People
    if (path === 'people' && method === 'GET') {
      result = listPeopleHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/me' && method === 'GET') {
      result = getMyPersonProfileHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/directory' && method === 'GET') {
      result = listPeopleDirectoryHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/detail' && method === 'GET') {
      result = getPersonDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/create' && method === 'POST') {
      result = createPersonHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/update' && method === 'POST') {
      result = updatePersonHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/hrm/save' && method === 'POST') {
      result = savePersonHrmHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'people/delete' && method === 'POST') {
      result = deletePersonHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Memberships
    if (path === 'memberships' && method === 'GET') {
      result = listMembershipsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'memberships/create' && method === 'POST') {
      result = createMembershipHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'memberships/update' && method === 'POST') {
      result = updateMembershipHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'memberships/delete' && method === 'POST') {
      result = deleteMembershipHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Users
    if (path === 'users' && method === 'GET') {
      result = listUsersHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'users/create' && method === 'POST') {
      result = createUserAccountHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'users/status' && method === 'POST') {
      result = updateUserStatusHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'users/reset-password' && method === 'POST') {
      result = resetUserPasswordHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'users/assign-role' && method === 'POST') {
      result = assignUserRoleHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'users/revoke-role' && method === 'POST') {
      result = revokeUserRoleHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Files
    if (path === 'files/upload-avatar' && method === 'POST') {
      result = uploadAvatarHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'files/upload-hrm' && method === 'POST') {
      result = uploadHrmFileHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Attendance config: Offices
    if (path === 'attendance/offices' && method === 'GET') {
      result = listOfficesHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/offices/create' && method === 'POST') {
      result = createOfficeHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/offices/update' && method === 'POST') {
      result = updateOfficeHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/offices/delete' && method === 'POST') {
      result = deleteOfficeHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Attendance config: WorkShifts
    if (path === 'attendance/shifts' && method === 'GET') {
      result = listWorkShiftsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/shifts/create' && method === 'POST') {
      result = createWorkShiftHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/shifts/update' && method === 'POST') {
      result = updateWorkShiftHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/shifts/delete' && method === 'POST') {
      result = deleteWorkShiftHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // QR
    if (path === 'attendance/qr/generate' && method === 'POST') {
      result = generateQrTokenHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/qr/current' && method === 'GET') {
      result = getCurrentQrTokenHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/qr/list' && method === 'GET') {
      result = listQrTokensHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/qr/status' && method === 'POST') {
      result = updateQrTokenStatusHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/qr/delete' && method === 'POST') {
      result = deleteQrTokenHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Attendance logs
    if (path === 'attendance/checkin' && method === 'POST') {
      result = checkinHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/mark' && method === 'POST') {
      result = createAttendanceLogHandler(e, 'ATTENDANCE');
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/checkout' && method === 'POST') {
      result = checkoutHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/my' && method === 'GET') {
      result = listMyAttendanceHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/team' && method === 'GET') {
      result = listTeamAttendanceHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/approve' && method === 'POST') {
      result = approveAttendanceHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

        // Leave
    if (path === 'leave/request' && method === 'POST') {
      result = createLeaveRequestHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/my' && method === 'GET') {
      result = listMyLeaveRequestsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/detail' && method === 'GET') {
      result = getLeaveRequestDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/pending' && method === 'GET') {
      result = listPendingLeaveRequestsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/approve' && method === 'POST') {
      result = approveLeaveRequestHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/cancel' && method === 'POST') {
      result = cancelLeaveRequestHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/balance' && method === 'GET') {
      result = getLeaveBalanceHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'leave/balance/update' && method === 'POST') {
      result = updateLeaveBalanceHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

        // Payroll
    if (path === 'payroll/periods' && method === 'GET') {
      result = listPayrollPeriodsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/periods/create' && method === 'POST') {
      result = createPayrollPeriodHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/periods/detail' && method === 'GET') {
      result = getPayrollPeriodDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/periods/status' && method === 'POST') {
      result = updatePayrollPeriodStatusHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/adjustments/create' && method === 'POST') {
      result = addPayrollAdjustmentHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/adjustments/delete' && method === 'POST') {
      result = deletePayrollAdjustmentHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/generate' && method === 'POST') {
      result = generatePayrollHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/payslips' && method === 'GET') {
      result = listPayslipsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/payslips/detail' && method === 'GET') {
      result = getPayslipDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/payslips/my' && method === 'GET') {
      result = getMyPayslipsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'payroll/payslips/status' && method === 'POST') {
      result = finalizePayslipHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

        // Documents
    if (path === 'employee/documents' && method === 'GET') {
      result = listEmployeeDocumentsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents' && method === 'GET') {
      result = listDocumentsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/create' && method === 'POST') {
      result = createDocumentHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/detail' && method === 'GET') {
      result = getDocumentDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/update' && method === 'POST') {
      result = updateDocumentHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/delete' && method === 'POST') {
      result = deleteDocumentHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/versions/upload' && method === 'POST') {
      result = uploadDocumentVersionHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/permissions/set' && method === 'POST') {
      result = setDocumentPermissionHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/permissions/remove' && method === 'POST') {
      result = removeDocumentPermissionHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/view-logs' && method === 'GET') {
      result = listDocumentViewLogsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'documents/email/send' && method === 'POST') {
      result = sendDocumentEmailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

        // Admin Dashboard
    if (path === 'admin/dashboard/overview' && method === 'GET') {
      result = adminDashboardOverviewHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/dashboard/people' && method === 'GET') {
      result = adminPeopleDashboardHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/dashboard/attendance' && method === 'GET') {
      result = adminAttendanceDashboardHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/dashboard/leave' && method === 'GET') {
      result = adminLeaveDashboardHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/dashboard/payroll' && method === 'GET') {
      result = adminPayrollDashboardHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/dashboard/documents' && method === 'GET') {
      result = adminDocumentsDashboardHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // System Config
    if (path === 'admin/config' && method === 'GET') {
      result = listSystemConfigHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/config/update' && method === 'POST') {
      result = updateSystemConfigHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Logs
    if (path === 'admin/logs/audit' && method === 'GET') {
      result = listAuditLogsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/logs/api' && method === 'GET') {
      result = listApiLogsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'admin/rbac/audit/rebuild' && method === 'POST') {
      result = rebuildRbacAuditDetailHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    // Notifications
    if (path === 'notifications' && method === 'GET') {
      result = listMyNotificationsHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'notifications/create' && method === 'POST') {
      result = createNotificationHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'notifications/read' && method === 'POST') {
      result = markNotificationReadHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'notifications/read-all' && method === 'POST') {
      result = markAllNotificationsReadHandler(e);
      logApiRequest(e, method, path, result, startedAt);
      return jsonResponse(result);
    }

    if (path === 'attendance/summary/rebuild' && method === 'POST') {
  result = rebuildAttendanceSummaryHandler(e);
  logApiRequest(e, method, path, result, startedAt);
  return jsonResponse(result);
}

    result = fail(
      'Đường dẫn API chưa được hỗ trợ: ' + path,
      'NOT_FOUND'
    );

    logApiRequest(e, method, path, result, startedAt);

    return jsonResponse(result);

  } catch (err) {
    const result = fail(
      String(err.message || err),
      'SERVER_ERROR',
      {
        stack: String(err.stack || ''),
        duration_ms: new Date() - startedAt
      }
    );

    try {
      logApiRequest(e, method, path, result, startedAt);
    } catch (logErr) {}

    return jsonResponse(result);
  }
}

function logApiRequest(e, method, path, result, startedAt) {
  const user = tryGetUserForLog(e);
  const meta = getClientMeta(e);

  appendObjectRowWithLock('SYSTEM', 'ApiLogs', {
    id: generateId('API'),
    request_id: generateId('REQ'),
    user_id: user ? user.id : '',
    method: method,
    path: path,
    status_code: result && result.success ? 200 : 400,
    duration_ms: new Date() - startedAt,
    ip: meta.ip,
    user_agent: meta.user_agent,
    error_message: result && result.success ? '' : String(result.message || ''),
    created_at: nowIso()
  });
}

function tryGetUserForLog(e) {
  try {
    const token = getTokenFromRequest(e);

    if (!token) {
      return null;
    }

    return verifySession(token);
  } catch (err) {
    return null;
  }
}
