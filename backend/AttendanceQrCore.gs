function checkinHandler(e) {
  return createAttendanceLogHandler(e, 'CHECKIN');
}

function checkoutHandler(e) {
  return createAttendanceLogHandler(e, 'CHECKOUT');
}

function generateQrTokenHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  ensureSheetWithHeaders('ATTENDANCE', 'QRTokens', SPREADSHEET_STRUCTURE.ATTENDANCE.QRTokens);

  const body = parseRequestBody(e);
  const officeId = normalizeText(requireBodyField(body, 'office_id', 'Địa điểm chấm công'));
  const expiresText = normalizeQrExpiry_(body.het_han || body.expires_at || '');
  const office = findObjectById('ATTENDANCE', 'Offices', officeId);

  if (!office || String(office.trang_thai || '') !== 'ACTIVE') {
    return fail('Địa điểm chấm công không hợp lệ.', 'OFFICE_NOT_ACTIVE');
  }

  const token = buildQrToken_(officeId, expiresText);
  const createdAt = nowIso();

  const qrToken = {
    id: generateId('QR'),
    office_id: officeId,
    token: token,
    thoi_gian_tao: createdAt,
    het_han: expiresText,
    trang_thai: 'ACTIVE',
    created_at: createdAt,
    updated_at: createdAt
  };

  appendObjectRowWithLock('ATTENDANCE', 'QRTokens', qrToken);

  return ok({
    qr_token: enrichQrTokenWithOffice_(qrToken),
    qr_payload: buildQrPayload_(qrToken),
    token: token
  }, 'Đã tạo QR token cho địa điểm chấm công.');
}

function getCurrentQrTokenHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.view');

  ensureSheetWithHeaders('ATTENDANCE', 'QRTokens', SPREADSHEET_STRUCTURE.ATTENDANCE.QRTokens);

  const officeId = normalizeText(getRequestParam(e, 'office_id', ''));
  let tokens = readAllObjects('ATTENDANCE', 'QRTokens').filter(function (row) {
    return String(row.trang_thai || '') === 'ACTIVE';
  });

  if (officeId) {
    tokens = tokens.filter(function (row) {
      return String(row.office_id || '') === officeId;
    });
  }

  tokens.sort(function (a, b) {
    const da = parseDateTimeValue(a.thoi_gian_tao || a.created_at);
    const db = parseDateTimeValue(b.thoi_gian_tao || b.created_at);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  const qrToken = tokens[0] || null;

  if (!qrToken) {
    return ok({
      qr_token: null,
      qr_payload: '',
      token: ''
    }, 'Chưa có QR đang hoạt động.');
  }

  return ok({
    qr_token: enrichQrTokenWithOffice_(qrToken),
    qr_payload: buildQrPayload_(qrToken),
    token: qrToken.token
  }, 'Lấy QR đang hoạt động thành công.');
}

function listQrTokensHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  ensureSheetWithHeaders('ATTENDANCE', 'QRTokens', SPREADSHEET_STRUCTURE.ATTENDANCE.QRTokens);

  const officeId = normalizeText(getRequestParam(e, 'office_id', ''));
  const status = normalizeText(getRequestParam(e, 'trang_thai', '')).toUpperCase();

  let tokens = readAllObjects('ATTENDANCE', 'QRTokens');

  if (officeId) {
    tokens = tokens.filter(function (row) {
      return String(row.office_id || '') === officeId;
    });
  }

  if (status) {
    tokens = tokens.filter(function (row) {
      return String(row.trang_thai || '').toUpperCase() === status;
    });
  }

  tokens.sort(function (a, b) {
    const da = parseDateTimeValue(a.thoi_gian_tao || a.created_at);
    const db = parseDateTimeValue(b.thoi_gian_tao || b.created_at);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  return ok({
    total: tokens.length,
    items: tokens.map(enrichQrTokenWithOffice_)
  }, 'Lấy lịch sử QR token thành công.');
}

function updateQrTokenStatusHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  ensureSheetWithHeaders('ATTENDANCE', 'QRTokens', SPREADSHEET_STRUCTURE.ATTENDANCE.QRTokens);

  const body = parseRequestBody(e);
  const id = normalizeText(requireBodyField(body, 'id', 'QR token'));
  const status = normalizeText(body.trang_thai || body.status || '').toUpperCase();

  if (['ACTIVE', 'LOCKED', 'DELETED'].indexOf(status) === -1) {
    return fail('Trạng thái QR token không hợp lệ.', 'INVALID_QR_STATUS');
  }

  const qrToken = updateObjectById('ATTENDANCE', 'QRTokens', id, {
    trang_thai: status,
    updated_at: nowIso()
  });

  return ok({
    qr_token: enrichQrTokenWithOffice_(qrToken),
    qr_payload: buildQrPayload_(qrToken),
    token: qrToken.token
  }, 'Đã cập nhật trạng thái QR token.');
}

function deleteQrTokenHandler(e) {
  const body = parseRequestBody(e);
  body.trang_thai = 'DELETED';
  e.postData = e.postData || {};
  e.postData.contents = JSON.stringify(body);
  return updateQrTokenStatusHandler(e);
}

function createAttendanceLogHandler(e, forcedType) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.checkin');

  const body = parseRequestBody(e);

  const personId = normalizeText(body.person_id || user.person_id);
  const attendanceType = normalizeAttendanceType(forcedType || body.loai_cham_cong);
  const method = normalizeAttendanceMethod(body.hinh_thuc || body.method || 'GPS');

  if (!personId) {
    return fail('Tài khoản hiện tại chưa liên kết hồ sơ cá nhân.', 'PERSON_NOT_LINKED');
  }

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') !== 'ACTIVE') {
    return fail('Hồ sơ cá nhân không tồn tại hoặc không hoạt động.', 'PERSON_NOT_ACTIVE');
  }

  const membershipId = normalizeText(body.membership_id || findDefaultMembershipId(personId));
  const officeId = normalizeText(requireBodyField(body, 'office_id', 'Địa điểm chấm công'));
  const shiftId = normalizeText(body.shift_id || findDefaultShiftIdForAttendance_(officeId));

  const office = findObjectById('ATTENDANCE', 'Offices', officeId);
  const shift = findObjectById('ATTENDANCE', 'WorkShifts', shiftId);

  if (!office || String(office.trang_thai || '') !== 'ACTIVE') {
    return fail('Địa điểm chấm công không hợp lệ.', 'OFFICE_NOT_ACTIVE');
  }

  if (shiftId && (!shift || String(shift.trang_thai || '') !== 'ACTIVE')) {
    return fail('Ca làm việc không hợp lệ.', 'SHIFT_NOT_ACTIVE');
  }

  const currentTime = normalizeAttendanceLogDateTime_(body.thoi_gian);
  const currentDate = formatDateOnly_(body.ngay || currentTime);

  const maxPerDay = toNumber(getSystemConfigValue('MAX_ATTENDANCE_PER_DAY', '10'), 10);
  const countToday = countAttendanceLogsOfDay(personId, currentDate);

  if (countToday >= maxPerDay) {
    return fail('Bạn đã vượt quá số lần chấm công tối đa trong ngày.', 'ATTENDANCE_LIMIT_EXCEEDED');
  }

  const duplicate = findRecentDuplicateAttendance(
    personId,
    currentDate,
    attendanceType,
    shiftId,
    3
  );

  if (duplicate) {
    return ok({
      duplicated: true,
      attendance_log: duplicate
    }, 'Bạn đã chấm công gần đây, hệ thống không ghi trùng.');
  }

  const validation = validateAttendanceInput({
    method: method,
    office: office,
    body: body
  });

  const systemStatus = validation.valid ? 'VALID' : validation.reason;
  const approvalStatus = attendanceType === 'ATTENDANCE'
    ? 'PENDING'
    : (validation.valid ? 'APPROVED' : 'PENDING');

  const attendanceLog = {
    id: generateId('ATT'),
    person_id: personId,
    membership_id: membershipId,
    office_id: officeId,
    shift_id: shiftId,
    thoi_gian: currentTime,
    ngay: currentDate,
    loai_cham_cong: attendanceType,
    hinh_thuc: method,
    lat: body.lat !== undefined ? toNumber(body.lat) : '',
    lng: body.lng !== undefined ? toNumber(body.lng) : '',
    khoang_cach_m: validation.distance_m !== undefined ? validation.distance_m : '',
    qr_token: normalizeText(body.qr_token || ''),
    device_id: normalizeText(body.device_id || ''),
    ip: normalizeText(body.ip || ''),
    user_agent: normalizeText(body.user_agent || ''),
    session_id: user.session ? user.session.id : '',
    idempotency_key: buildAttendanceIdempotencyKey(personId, currentDate, attendanceType, shiftId, method),
    trang_thai_he_thong: systemStatus,
    trang_thai_duyet: approvalStatus,
    nguoi_duyet: approvalStatus === 'APPROVED' ? 'SYSTEM' : '',
    ghi_chu_duyet: validation.message || '',
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('ATTENDANCE', 'AttendanceLogs', attendanceLog);

  if (approvalStatus === 'APPROVED') {
    rebuildAttendanceSummaryForPersonDate(personId, currentDate, shiftId);
  }

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_ATTENDANCE_' + attendanceType,
    module: 'ATTENDANCE',
    doi_tuong_type: 'ATTENDANCE_LOG',
    doi_tuong_id: attendanceLog.id,
    after: attendanceLog
  });

  return ok({
    attendance_log: attendanceLog,
    validation: validation
  }, approvalStatus === 'APPROVED'
    ? 'Chấm công thành công.'
    : 'Đã ghi nhận chấm công bất thường, chờ duyệt.');
}

function validateAttendanceInput(params) {
  const method = params.method;
  const office = params.office;
  const body = params.body || {};

  if (method === 'QR') {
    const qrToken = normalizeText(body.qr_token || '');
    const qrResult = validateQrToken(qrToken, office.id);

    if (!qrResult.valid) {
      return {
        valid: false,
        reason: qrResult.reason,
        message: 'QR không hợp lệ hoặc đã hết hạn.'
      };
    }
  }

  if (method === 'GPS' || method === 'QR' || body.lat !== undefined || body.lng !== undefined) {
    const lat = toNumber(body.lat, null);
    const lng = toNumber(body.lng, null);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        valid: false,
        reason: 'GPS_MISSING',
        message: 'Thiếu tọa độ GPS.'
      };
    }

    const officeLat = toNumber(office.lat, null);
    const officeLng = toNumber(office.lng, null);

    if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng)) {
      return {
        valid: false,
        reason: 'OFFICE_GPS_MISSING',
        message: 'Địa điểm chưa cấu hình tọa độ GPS.'
      };
    }

    const distance = haversineDistanceMeters(lat, lng, officeLat, officeLng);
    const radius = toNumber(office.ban_kinh_gps_m, 100);

    if (distance > radius) {
      return {
        valid: false,
        reason: 'OUT_OF_GEOFENCE',
        message: 'Chấm công ngoài phạm vi cho phép.',
        distance_m: distance,
        radius_m: radius
      };
    }

    return {
      valid: true,
      reason: 'OK',
      message: 'GPS hợp lệ.',
      distance_m: distance,
      radius_m: radius
    };
  }

  if (method === 'MANUAL') {
    return {
      valid: false,
      reason: 'MANUAL_PENDING_APPROVAL',
      message: 'Chấm công thủ công cần người quản lý duyệt.'
    };
  }

  return {
    valid: true,
    reason: 'OK',
    message: 'Chấm công hợp lệ.'
  };
}

function normalizeAttendanceLogDateTime_(value) {
  const parsed = parseDateTimeFlexible_(value);

  if (parsed) {
    return Utilities.formatDate(parsed, getRequiredConfig('TIMEZONE'), 'yyyy-MM-dd HH:mm:ss');
  }

  return Utilities.formatDate(new Date(), getRequiredConfig('TIMEZONE'), 'yyyy-MM-dd HH:mm:ss');
}

function validateQrToken(rawToken, officeId) {
  const parsed = parseQrTokenPayload_(rawToken);
  const token = parsed.token;
  const payloadOfficeId = parsed.office_id;

  if (!token) {
    return {
      valid: false,
      reason: 'QR_TOKEN_MISSING'
    };
  }

  if (payloadOfficeId && String(payloadOfficeId) !== String(officeId || '')) {
    return {
      valid: false,
      reason: 'QR_OFFICE_MISMATCH'
    };
  }

  const stored = findOneObject('ATTENDANCE', 'QRTokens', function (row) {
    return String(row.office_id || '') === String(officeId || '') &&
      String(row.token || '') === String(token || '') &&
      String(row.trang_thai || '') === 'ACTIVE';
  });

  if (!stored) {
    return {
      valid: false,
      reason: 'QR_TOKEN_NOT_FOUND'
    };
  }

  const expiresText = normalizeText(stored.het_han || '');

  if (!expiresText || expiresText === 'STATIC' || expiresText === 'PERMANENT') {
    return {
      valid: true,
      reason: 'OK_STATIC'
    };
  }

  const expiresAt = parseDateTimeValue(expiresText);

  if (expiresAt && expiresAt.getTime() < new Date().getTime()) {
    return {
      valid: false,
      reason: 'QR_TOKEN_EXPIRED'
    };
  }

  return {
    valid: true,
    reason: 'OK'
  };
}

function parseQrTokenPayload_(rawToken) {
  const text = normalizeText(rawToken || '');

  if (!text) {
    return {
      token: '',
      office_id: ''
    };
  }

  try {
    const payload = JSON.parse(text);

    return {
      token: normalizeText(payload.token || payload.qr_token || ''),
      office_id: normalizeText(payload.office_id || '')
    };
  } catch (err) {
    return {
      token: text,
      office_id: ''
    };
  }
}

function buildStaticQrToken_(officeId) {
  return 'FTS_STATIC_QR_' + hashText('FTS_ATTENDANCE_QR:' + String(officeId || '')).substring(0, 24).toUpperCase();
}

function buildQrToken_(officeId, expiresText) {
  if (!expiresText || expiresText === 'STATIC' || expiresText === 'PERMANENT') {
    return buildStaticQrToken_(officeId);
  }

  return 'FTS_QR_' + hashText([
    officeId,
    expiresText,
    nowIso(),
    Utilities.getUuid()
  ].join(':')).substring(0, 32).toUpperCase();
}

function normalizeQrExpiry_(value) {
  const text = normalizeText(value || '');

  if (!text) {
    return 'STATIC';
  }

  const upper = text.toUpperCase();

  if (upper === 'STATIC' || upper === 'PERMANENT') {
    return 'STATIC';
  }

  return text;
}

function buildQrPayload_(qrToken) {
  return JSON.stringify({
    type: 'FTS_ATTENDANCE_QR',
    mode: normalizeQrExpiry_(qrToken.het_han) === 'STATIC' ? 'STATIC' : 'EXPIRING',
    office_id: qrToken.office_id,
    token: qrToken.token
  });
}

function enrichQrTokenWithOffice_(qrToken) {
  if (!qrToken) {
    return qrToken;
  }

  const copy = {};

  Object.keys(qrToken).forEach(function (key) {
    if (key !== '__rowNumber') {
      copy[key] = qrToken[key];
    }
  });

  const office = findObjectById('ATTENDANCE', 'Offices', qrToken.office_id);

  if (office) {
    copy.office_name = office.ten_diem || '';
    copy.office_code = office.ma_diem || '';
  }

  return copy;
}

function findDefaultMembershipId(personId) {
  const membership = findOneObject('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.trang_thai || '') === 'ACTIVE';
  });

  return membership ? membership.id : '';
}

function findDefaultShiftIdForAttendance_(officeId) {
  const office = officeId ? findObjectById('ATTENDANCE', 'Offices', officeId) : null;
  const officeOrgUnitId = office ? String(office.org_unit_id || '') : '';

  const shifts = readAllObjects('ATTENDANCE', 'WorkShifts')
    .filter(function (row) {
      if (String(row.trang_thai || '') !== 'ACTIVE') {
        return false;
      }

      if (!officeOrgUnitId) {
        return true;
      }

      return !row.org_unit_id || String(row.org_unit_id || '') === officeOrgUnitId;
    });

  shifts.sort(function (a, b) {
    return String(a.gio_bat_dau || '').localeCompare(String(b.gio_bat_dau || ''));
  });

  return shifts.length > 0 ? shifts[0].id : '';
}

function countAttendanceLogsOfDay(personId, dateText) {
  return findObjects('ATTENDANCE', 'AttendanceLogs', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.ngay || '') === String(dateText || '');
  }).length;
}

function findRecentDuplicateAttendance(personId, dateText, attendanceType, shiftId, windowMinutes) {
  const nowTime = new Date().getTime();
  const windowMs = Number(windowMinutes || 3) * 60000;

  const logs = findObjects('ATTENDANCE', 'AttendanceLogs', function (row) {
    if (String(row.person_id || '') !== String(personId || '')) {
      return false;
    }

    if (String(row.ngay || '') !== String(dateText || '')) {
      return false;
    }

    if (String(row.loai_cham_cong || '') !== String(attendanceType || '')) {
      return false;
    }

    if (String(row.shift_id || '') !== String(shiftId || '')) {
      return false;
    }

    const created = parseDateTimeValue(row.created_at || row.thoi_gian);

    if (!created) {
      return false;
    }

    return Math.abs(nowTime - created.getTime()) <= windowMs;
  });

  logs.sort(function (a, b) {
    const da = parseDateTimeValue(a.created_at || a.thoi_gian);
    const db = parseDateTimeValue(b.created_at || b.thoi_gian);

    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  return logs.length > 0 ? logs[0] : null;
}

function buildAttendanceIdempotencyKey(personId, dateText, attendanceType, shiftId, method) {
  const bucket = Utilities.formatDate(
    new Date(),
    getRequiredConfig('TIMEZONE'),
    'yyyyMMddHHmm'
  );

  return hashText([
    personId,
    dateText,
    attendanceType,
    shiftId,
    method,
    bucket
  ].join('|'));
}

function listMyAttendanceHandler(e) {
  const user = requireAuth(e);
  ensureSheetWithHeaders('ATTENDANCE', 'AttendanceSummary', SPREADSHEET_STRUCTURE.ATTENDANCE.AttendanceSummary);

  const requestedPersonId = normalizeText(getRequestParam(e, 'person_id', user.person_id));
  const ownPersonId = normalizeText(user.person_id || '');
  const canViewAttendance = userHasPermission(user.id, 'attendance.view');

  if (requestedPersonId && ownPersonId && String(requestedPersonId) !== String(ownPersonId)) {
    requirePermission(user, 'attendance.view');
  } else if (!canViewAttendance) {
    requireAnyPermission(user, ['attendance.view', 'attendance.checkin']);
  }

  const personId = requestedPersonId || ownPersonId;
  const fromDate = normalizeText(getRequestParam(e, 'from', ''));
  const toDate = normalizeText(getRequestParam(e, 'to', ''));

  let logs = readAllObjects('ATTENDANCE', 'AttendanceLogs')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '');
    });

  if (fromDate) {
    logs = logs.filter(function (row) {
      return String(row.ngay || '') >= fromDate;
    });
  }

  if (toDate) {
    logs = logs.filter(function (row) {
      return String(row.ngay || '') <= toDate;
    });
  }

  let summaries = readAllObjects('ATTENDANCE', 'AttendanceSummary')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '');
    });

  if (fromDate) {
    summaries = summaries.filter(function (row) {
      return formatDateOnly_(row.ngay) >= fromDate;
    });
  }

  if (toDate) {
    summaries = summaries.filter(function (row) {
      return formatDateOnly_(row.ngay) <= toDate;
    });
  }

  summaries.sort(function (a, b) {
    return String(b.ngay || '').localeCompare(String(a.ngay || ''));
  });

  logs.sort(function (a, b) {
    const da = parseDateTimeValue(a.thoi_gian);
    const db = parseDateTimeValue(b.thoi_gian);

    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  return ok({
    total: logs.length,
    items: logs,
    summaries: summaries
  }, 'Lấy lịch sử chấm công thành công.');
}

function listTeamAttendanceHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.view');

  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));
  const dateText = normalizeText(getRequestParam(e, 'ngay', ''));
  const status = normalizeText(getRequestParam(e, 'trang_thai_duyet', '')).toUpperCase();

  let logs = readAllObjects('ATTENDANCE', 'AttendanceLogs');

  if (dateText) {
    logs = logs.filter(function (row) {
      return sameAttendanceDate_(row.ngay, dateText);
    });
  }

  if (status) {
    logs = logs.filter(function (row) {
      return String(row.trang_thai_duyet || '').trim().toUpperCase() === status;
    });
  }

  if (orgUnitId) {
    const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
      .filter(function (m) {
        return String(m.org_unit_id || '') === orgUnitId &&
          String(m.trang_thai || '') === 'ACTIVE';
      });

    const allowedPersonIds = {};
    memberships.forEach(function (m) {
      allowedPersonIds[String(m.person_id || '')] = true;
    });

    logs = logs.filter(function (row) {
      return allowedPersonIds[String(row.person_id || '')] === true;
    });
  }

  logs.sort(function (a, b) {
    const da = parseDateTimeValue(a.thoi_gian);
    const db = parseDateTimeValue(b.thoi_gian);

    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  logs = enrichAttendanceLogsWithPeople_(logs);

  return ok({
    total: logs.length,
    items: logs
  }, 'Lấy danh sách chấm công theo đội/đơn vị thành công.');
}

function approveAttendanceHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);

  const logIds = normalizeAttendanceApprovalLogIds_(body);
  const action = normalizeText(requireBodyField(body, 'action', 'Hành động')).toUpperCase();
  const note = normalizeText(body.ghi_chu || '');

  let newStatus = '';

  if (action === 'APPROVE' || action === 'APPROVED') {
    newStatus = 'APPROVED';
  } else if (action === 'REJECT' || action === 'REJECTED') {
    newStatus = 'REJECTED';
  } else {
    return fail('Hành động duyệt không hợp lệ. Dùng APPROVE hoặc REJECT.', 'INVALID_APPROVAL_ACTION');
  }

  if (logIds.length > 1) {
    return approveAttendanceLogPair_(user, logIds, newStatus, note, body);
  }

  const logId = logIds[0];
  const before = findObjectById('ATTENDANCE', 'AttendanceLogs', logId);

  if (!before) {
    return fail('Không tìm thấy bản ghi chấm công.', 'ATTENDANCE_LOG_NOT_FOUND');
  }

  const after = updateObjectById('ATTENDANCE', 'AttendanceLogs', logId, {
    trang_thai_duyet: newStatus,
    nguoi_duyet: user.id,
    ghi_chu_duyet: note,
    updated_at: nowIso()
  });

  appendObjectRowWithLock('ATTENDANCE', 'AttendanceApprovals', {
    id: generateId('APPROVAL'),
    attendance_log_id: logId,
    nguoi_duyet: user.id,
    hanh_dong: newStatus,
    ghi_chu: note,
    thoi_gian_duyet: nowIso()
  });

  if (newStatus === 'APPROVED') {
    rebuildAttendanceSummaryForPersonDate(
      after.person_id,
      after.ngay,
      after.shift_id
    );
  }

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'APPROVE_ATTENDANCE_' + newStatus,
    module: 'ATTENDANCE',
    doi_tuong_type: 'ATTENDANCE_LOG',
    doi_tuong_id: logId,
    before: before,
    after: after
  });

  return ok({
    attendance_log: after,
    attendance_logs: [after]
  }, newStatus === 'APPROVED'
    ? 'Đã duyệt bản ghi chấm công.'
    : 'Đã từ chối bản ghi chấm công.');
}

function normalizeAttendanceApprovalLogIds_(body) {
  let raw = body.attendance_log_ids || body.log_ids || body.attendance_logs || '';

  if (!raw && body.attendance_log_id) {
    raw = [body.attendance_log_id];
  }

  if (typeof raw === 'string') {
    raw = raw.split(',');
  }

  if (!raw || !raw.length) {
    throw new Error('Thiếu ID bản ghi chấm công.');
  }

  const seen = {};
  const logIds = [];

  raw.forEach(function (value) {
    const id = normalizeText(value || '');

    if (id && !seen[id]) {
      seen[id] = true;
      logIds.push(id);
    }
  });

  if (logIds.length === 0) {
    throw new Error('Thiếu ID bản ghi chấm công.');
  }

  return logIds;
}

function approveAttendanceLogPair_(user, logIds, newStatus, note, body) {
  if (newStatus === 'APPROVED' && logIds.length !== 2) {
    return fail('Vui lòng chọn đúng 2 bản ghi để duyệt thành một công.', 'INVALID_ATTENDANCE_PAIR');
  }

  const beforeLogs = logIds.map(function (id) {
    return findObjectById('ATTENDANCE', 'AttendanceLogs', id);
  });

  const missingIndex = beforeLogs.findIndex(function (row) {
    return !row;
  });

  if (missingIndex !== -1) {
    return fail('Không tìm thấy bản ghi chấm công: ' + logIds[missingIndex], 'ATTENDANCE_LOG_NOT_FOUND');
  }

  const personId = String(beforeLogs[0].person_id || '').trim();
  const dateText = formatDateOnly_(beforeLogs[0].ngay);
  const shiftId = String(beforeLogs[0].shift_id || '').trim();
  const hasDifferentScope = beforeLogs.some(function (row) {
    return String(row.person_id || '').trim() !== personId ||
      formatDateOnly_(row.ngay) !== dateText ||
      String(row.shift_id || '').trim() !== shiftId;
  });

  if (hasDifferentScope) {
    return fail('Hai bản ghi được chọn phải cùng nhân viên, cùng ngày và cùng ca.', 'ATTENDANCE_PAIR_SCOPE_MISMATCH');
  }

  const afterLogs = beforeLogs.map(function (before) {
    const after = updateObjectById('ATTENDANCE', 'AttendanceLogs', before.id, {
      trang_thai_duyet: newStatus,
      nguoi_duyet: user.id,
      ghi_chu_duyet: note,
      updated_at: nowIso()
    });

    appendObjectRowWithLock('ATTENDANCE', 'AttendanceApprovals', {
      id: generateId('APPROVAL'),
      attendance_log_id: before.id,
      nguoi_duyet: user.id,
      hanh_dong: newStatus,
      ghi_chu: note,
      thoi_gian_duyet: nowIso()
    });

    return after;
  });

  let summary = null;

  if (newStatus === 'APPROVED') {
    summary = upsertAttendanceSummaryFromApprovedPair_(
      afterLogs,
      parseAttendanceDecimal_(body.so_gio_nghi_ngoi || body.so_gio_nghi || 0),
      parseAttendanceDecimal_(body.so_cong_quan_tri || body.so_cong || 0),
      body.gio_vao_tinh_cong || body.work_start_at || '',
      body.gio_ra_tinh_cong || body.work_end_at || '',
      note
    );
  }

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'APPROVE_ATTENDANCE_PAIR_' + newStatus,
    module: 'ATTENDANCE',
    doi_tuong_type: 'ATTENDANCE_LOG',
    doi_tuong_id: logIds.join(','),
    before: beforeLogs,
    after: {
      logs: afterLogs,
      summary: summary
    }
  });

  return ok({
    attendance_logs: afterLogs,
    summary: summary
  }, newStatus === 'APPROVED'
    ? 'Đã duyệt 2 bản ghi và cập nhật bảng công.'
    : 'Đã từ chối các bản ghi chấm công.');
}

function upsertAttendanceSummaryFromApprovedPair_(logs, restHours, manualWorkDays, workStartValue, workEndValue, note) {
  const sorted = logs
    .map(function (row) {
      return {
        row: row,
        time: parseDateTimeFlexible_(row.thoi_gian)
      };
    })
    .filter(function (item) {
      return item.time;
    })
    .sort(function (a, b) {
      return a.time.getTime() - b.time.getTime();
    });

  if (sorted.length !== 2) {
    throw new Error('Không đọc được thời gian của 2 bản ghi chấm công.');
  }

  const first = sorted[0];
  const last = sorted[1];
  const workStart = parseAttendanceWorkDateTime_(workStartValue, first.row.ngay) || first.time;
  const workEnd = parseAttendanceWorkDateTime_(workEndValue, first.row.ngay) || last.time;
  const totalHours = hoursDiff_(workStart, workEnd);
  const normalizedRestHours = Math.max(0, parseAttendanceDecimal_(restHours));
  const workHours = Math.max(0, Math.round((totalHours - normalizedRestHours) * 100) / 100);
  const workDays = parseAttendanceDecimal_(manualWorkDays);

  return upsertAttendanceSummary_(first.row.person_id, first.row.membership_id, first.row.shift_id, first.row.ngay, {
    checkin_at: formatAttendanceDateTime_(first.time),
    checkout_at: formatAttendanceDateTime_(last.time),
    gio_vao: formatAttendanceTime_(first.time),
    gio_ra: formatAttendanceTime_(last.time),
    gio_vao_tinh_cong: formatAttendanceTime_(workStart),
    gio_ra_tinh_cong: formatAttendanceTime_(workEnd),
    so_gio_nghi_ngoi: normalizedRestHours,
    so_gio_tinh_cong: workHours,
    so_cong_quan_tri: workDays,
    checkin_log_id: first.row.id,
    checkout_log_id: last.row.id,
    so_gio: workHours,
    so_cong: workDays,
    di_tre_phut: 0,
    ve_som_phut: 0,
    trang_thai: 'COMPLETED',
    ghi_chu: note || 'Duyệt theo cặp bản ghi chấm công.'
  });
}

function parseAttendanceWorkDateTime_(value, fallbackDate) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{2}:\d{2}/.test(text)) {
    return parseDateTimeFlexible_(formatDateOnly_(fallbackDate) + ' ' + text.substring(0, 5) + ':00');
  }

  return parseDateTimeFlexible_(text);
}

function parseAttendanceDecimal_(value) {
  const normalized = String(value || '')
    .trim()
    .replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAttendanceDateTime_(date) {
  if (!date) {
    return '';
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatAttendanceTime_(date) {
  if (!date) {
    return '';
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
}

function rebuildAttendanceSummaryForPersonDate(personId, ngay, shiftId) {
  const targetPersonId = String(personId || '').trim();
  const targetDate = formatDateOnly_(ngay);
  const targetShiftId = String(shiftId || '').trim();

  if (!targetPersonId || !targetDate) {
    throw new Error('Thiếu person_id hoặc ngày khi tính lại AttendanceSummary.');
  }

  const allLogs = readAllObjects('ATTENDANCE', 'AttendanceLogs');

  let logs = allLogs.filter(function (row) {
    const rowPersonId = String(row.person_id || '').trim();
    const rowDate = formatDateOnly_(row.ngay);
    const rowStatus = normalizeUpper_(row.trang_thai_duyet);
    const rowSystemStatus = normalizeUpper_(row.trang_thai_he_thong);
    const rowShiftId = String(row.shift_id || '').trim();

    const samePerson = rowPersonId === targetPersonId;
    const sameDate = rowDate === targetDate;
    const approved = rowStatus === 'APPROVED';
    const validSystem = rowSystemStatus === 'VALID' || rowSystemStatus === '';

    const sameShift = targetShiftId ? rowShiftId === targetShiftId : true;

    return samePerson && sameDate && approved && validSystem && sameShift;
  });

  if (logs.length === 0) {
    return upsertAttendanceSummary_(targetPersonId, '', targetShiftId, targetDate, {
      checkin_at: '',
      checkout_at: '',
      so_gio: 0,
      so_cong: 0,
      di_tre_phut: 0,
      ve_som_phut: 0,
      trang_thai: 'MISSING',
      ghi_chu: 'Không có log APPROVED hợp lệ trong ngày.'
    });
  }

  // Nếu không truyền shiftId thì lấy shift_id đầu tiên trong logs
  const finalShiftId = targetShiftId || String(logs[0].shift_id || '').trim();
  const membershipId = String(logs[0].membership_id || '').trim();

  const checkinLogs = logs
    .filter(function (row) {
      return normalizeUpper_(row.loai_cham_cong) === 'CHECKIN';
    })
    .map(function (row) {
      return {
        row: row,
        time: parseDateTimeFlexible_(row.thoi_gian)
      };
    })
    .filter(function (item) {
      return item.time;
    })
    .sort(function (a, b) {
      return a.time.getTime() - b.time.getTime();
    });

  const checkoutLogs = logs
    .filter(function (row) {
      return normalizeUpper_(row.loai_cham_cong) === 'CHECKOUT';
    })
    .map(function (row) {
      return {
        row: row,
        time: parseDateTimeFlexible_(row.thoi_gian)
      };
    })
    .filter(function (item) {
      return item.time;
    })
    .sort(function (a, b) {
      return b.time.getTime() - a.time.getTime();
    });

  const attendanceLogs = logs
    .filter(function (row) {
      return normalizeUpper_(row.loai_cham_cong) === 'ATTENDANCE';
    })
    .map(function (row) {
      return {
        row: row,
        time: parseDateTimeFlexible_(row.thoi_gian)
      };
    })
    .filter(function (item) {
      return item.time;
    })
    .sort(function (a, b) {
      return a.time.getTime() - b.time.getTime();
    });

  const checkin = checkinLogs.length > 0 ? checkinLogs[0].time : null;
  const checkout = checkoutLogs.length > 0 ? checkoutLogs[0].time : null;
  const attendanceMark = attendanceLogs.length > 0 ? attendanceLogs[0].time : null;

  let status = 'COMPLETED';
  let note = 'Đủ check-in/check-out.';
  let totalHours = 0;
  let workDays = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;

  const shift = finalShiftId
    ? findObjectById('ATTENDANCE', 'WorkShifts', finalShiftId)
    : null;

  if (attendanceMark) {
    status = 'COMPLETED';
    note = 'Đã duyệt chấm công một nút.';
    workDays = shift && shift.so_cong !== ''
      ? Number(shift.so_cong || 1)
      : 1;
  } else if (!checkin && !checkout) {
    status = 'MISSING';
    note = 'Thiếu cả check-in và check-out.';
  } else if (!checkin) {
    status = 'MISSING_CHECKIN';
    note = 'Thiếu check-in.';
  } else if (!checkout) {
    status = 'MISSING_CHECKOUT';
    note = 'Thiếu check-out.';
  } else {
    totalHours = hoursDiff_(checkin, checkout);

    if (totalHours < 0) {
      totalHours = 0;
      status = 'INVALID';
      note = 'Check-out nhỏ hơn check-in.';
    } else {
      workDays = shift && shift.so_cong !== ''
        ? Number(shift.so_cong || 1)
        : 1;
    }
  }

  if (shift && checkin) {
    const startTime = String(shift.gio_bat_dau || '').trim();

    if (startTime) {
      const shiftStart = combineDateAndTime_(targetDate, startTime);

      if (shiftStart && checkin.getTime() > shiftStart.getTime()) {
        lateMinutes = minutesDiff_(shiftStart, checkin);
      }
    }
  }

  if (shift && checkout) {
    const endTime = String(shift.gio_ket_thuc || '').trim();

    if (endTime) {
      const shiftEnd = combineDateAndTime_(targetDate, endTime);

      if (shiftEnd && checkout.getTime() < shiftEnd.getTime()) {
        earlyLeaveMinutes = minutesDiff_(checkout, shiftEnd);
      }
    }
  }

  return upsertAttendanceSummary_(targetPersonId, membershipId, finalShiftId, targetDate, {
    checkin_at: attendanceMark ? Utilities.formatDate(attendanceMark, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : (checkin ? Utilities.formatDate(checkin, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : ''),
    checkout_at: checkout ? Utilities.formatDate(checkout, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
    so_gio: totalHours,
    so_cong: workDays,
    di_tre_phut: lateMinutes,
    ve_som_phut: earlyLeaveMinutes,
    trang_thai: status,
    ghi_chu: note
  });
}
function upsertAttendanceSummary_(personId, membershipId, shiftId, ngay, calculated) {
  ensureSheetWithHeaders('ATTENDANCE', 'AttendanceSummary', SPREADSHEET_STRUCTURE.ATTENDANCE.AttendanceSummary);

  const now = nowIso();

  const existing = findOneObject('ATTENDANCE', 'AttendanceSummary', function (row) {
    return String(row.person_id || '').trim() === String(personId || '').trim() &&
      formatDateOnly_(row.ngay) === formatDateOnly_(ngay) &&
      String(row.shift_id || '').trim() === String(shiftId || '').trim();
  });

  const payload = {
    person_id: personId,
    membership_id: membershipId || '',
    ngay: formatDateOnly_(ngay),
    shift_id: shiftId || '',
    checkin_at: calculated.checkin_at || '',
    checkout_at: calculated.checkout_at || '',
    gio_vao: calculated.gio_vao || calculated.checkin_at || '',
    gio_ra: calculated.gio_ra || calculated.checkout_at || '',
    gio_vao_tinh_cong: calculated.gio_vao_tinh_cong || calculated.gio_vao || calculated.checkin_at || '',
    gio_ra_tinh_cong: calculated.gio_ra_tinh_cong || calculated.gio_ra || calculated.checkout_at || '',
    so_gio_nghi_ngoi: calculated.so_gio_nghi_ngoi || 0,
    so_gio_tinh_cong: calculated.so_gio_tinh_cong || calculated.so_gio || 0,
    so_cong_quan_tri: calculated.so_cong_quan_tri || calculated.so_cong || 0,
    checkin_log_id: calculated.checkin_log_id || '',
    checkout_log_id: calculated.checkout_log_id || '',
    so_gio: calculated.so_gio || 0,
    so_cong: calculated.so_cong || 0,
    di_tre_phut: calculated.di_tre_phut || 0,
    ve_som_phut: calculated.ve_som_phut || 0,
    trang_thai: calculated.trang_thai || 'MISSING',
    ghi_chu: calculated.ghi_chu || '',
    updated_at: now
  };

  if (existing && existing.id) {
    updateObjectById('ATTENDANCE', 'AttendanceSummary', existing.id, payload);

    return {
      id: existing.id,
      ...existing,
      ...payload
    };
  }

  const newRow = {
    id: generateId('ASUM'),
    ...payload,
    created_at: now
  };

  appendObjectRowWithLock('ATTENDANCE', 'AttendanceSummary', newRow);

  return newRow;
}
function rebuildAttendanceSummaryHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID nhân sự'));
  const ngay = normalizeText(requireBodyField(body, 'ngay', 'Ngày'));
  const shiftId = normalizeText(body.shift_id || '');

  const summary = rebuildAttendanceSummaryForPersonDate(personId, ngay, shiftId);

  return ok({
    summary: summary
  }, 'Đã tính lại bảng công.');
}

function sameAttendanceDate_(leftValue, rightValue) {
  const left = normalizeAttendanceDateKey_(leftValue);
  const right = normalizeAttendanceDateKey_(rightValue);

  if (!left || !right) {
    return String(leftValue || '') === String(rightValue || '');
  }

  return left === right;
}

function normalizeAttendanceDateKey_(value) {
  if (!value) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, getRequiredConfig('TIMEZONE'), 'yyyy-MM-dd');
  }

  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return match[1] + '-' + match[2] + '-' + match[3];
  }

  match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    return match[3] + '-' + match[2] + '-' + match[1];
  }

  return text;
}

function enrichAttendanceLogsWithPeople_(logs) {
  if (!logs || !logs.length) {
    return logs || [];
  }

  const peopleById = {};
  const shiftsById = {};

  readAllObjects('CORE_HR', 'People').forEach(function (person) {
    peopleById[String(person.id || '')] = person;
  });

  readAllObjects('ATTENDANCE', 'WorkShifts').forEach(function (shift) {
    shiftsById[String(shift.id || '')] = shift;
  });

  return logs.map(function (log) {
    const person = peopleById[String(log.person_id || '')] || {};
    const shift = shiftsById[String(log.shift_id || '')] || {};

    log.ho_ten = person.ho_ten || '';
    log.ma_dinh_danh = person.ma_dinh_danh || '';
    log.ten_nhan_su = person.ho_ten || log.person_id || '';
    log.ten_ca = shift.ten_ca || '';
    log.gio_bat_dau_ca = shift.gio_bat_dau || '';
    log.gio_ket_thuc_ca = shift.gio_ket_thuc || '';

    return log;
  });
}
