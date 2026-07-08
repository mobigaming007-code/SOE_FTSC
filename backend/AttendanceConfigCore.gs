function toNumber(value, defaultValue) {
  const num = Number(value);

  if (Number.isFinite(num)) {
    return num;
  }

  return defaultValue || 0;
}

function parseDateTimeValue(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const normalized = text.indexOf('T') === -1
    ? text.replace(' ', 'T')
    : text;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function minutesBetween(startValue, endValue) {
  const start = parseDateTimeValue(startValue);
  const end = parseDateTimeValue(endValue);

  if (!start || !end) {
    return 0;
  }

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function getDatePartFromIso(isoValue) {
  const date = parseDateTimeValue(isoValue);

  if (!date) {
    return todayDate();
  }

  return Utilities.formatDate(
    date,
    getRequiredConfig('TIMEZONE'),
    'yyyy-MM-dd'
  );
}

function buildDateTimeFromDateAndTime(dateText, timeText) {
  if (!dateText || !timeText) {
    return null;
  }

  const cleanTime = String(timeText).trim();

  if (!cleanTime) {
    return null;
  }

  return String(dateText).trim() + 'T' + cleanTime.substring(0, 5) + ':00';
}

function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;

  const p1 = toNumber(lat1) * Math.PI / 180;
  const p2 = toNumber(lat2) * Math.PI / 180;
  const deltaP = (toNumber(lat2) - toNumber(lat1)) * Math.PI / 180;
  const deltaL = (toNumber(lng2) - toNumber(lng1)) * Math.PI / 180;

  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(deltaL / 2) * Math.sin(deltaL / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

function normalizeAttendanceType(value) {
  const text = String(value || '').trim().toUpperCase();

  if (text === 'ATTENDANCE' || text === 'CHAM_CONG' || text === 'MARK') {
    return 'ATTENDANCE';
  }

  if (text === 'CHECKOUT' || text === 'RA' || text === 'OUT') {
    return 'CHECKOUT';
  }

  return 'CHECKIN';
}

function normalizeAttendanceMethod(value) {
  const text = String(value || '').trim().toUpperCase();

  if (['GPS', 'QR', 'WIFI', 'FACE', 'MANUAL'].indexOf(text) !== -1) {
    return text;
  }

  return 'GPS';
}

function listOfficesHandler(e) {
  const user = requireAuth(e);
  const canViewAttendance = userHasPermission(user.id, 'attendance.view');
  const canCheckin = userHasPermission(user.id, 'attendance.checkin');

  if (!canViewAttendance && !canCheckin) {
    requireAnyPermission(user, ['attendance.view', 'attendance.checkin']);
  }

  ensureSheetWithHeaders('ATTENDANCE', 'Offices', SPREADSHEET_STRUCTURE.ATTENDANCE.Offices);

  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));
  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));

  let items = readAllObjects('ATTENDANCE', 'Offices');

  if (status) {
    items = items.filter(function (row) {
      return String(row.trang_thai || '').toUpperCase() === status.toUpperCase();
    });
  }

  if (!canViewAttendance && canCheckin) {
    items = items.filter(function (row) {
      return String(row.trang_thai || '').toUpperCase() === 'ACTIVE';
    });
  }

  if (orgUnitId) {
    items = items.filter(function (row) {
      return String(row.org_unit_id || '') === orgUnitId;
    });
  }

  items.sort(function (a, b) {
    return String(a.ten_diem || a.ma_diem || '').localeCompare(String(b.ten_diem || b.ma_diem || ''));
  });

  return ok({
    total: items.length,
    items: items
  }, 'Lấy danh sách địa điểm chấm công thành công.');
}

function createOfficeHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  ensureSheetWithHeaders('ATTENDANCE', 'Offices', SPREADSHEET_STRUCTURE.ATTENDANCE.Offices);

  const body = parseRequestBody(e);
  const office = {
    id: generateId('OFFICE'),
    ma_diem: normalizeText(requireBodyField(body, 'ma_diem', 'Mã điểm')),
    ten_diem: normalizeText(requireBodyField(body, 'ten_diem', 'Tên điểm')),
    org_unit_id: normalizeText(body.org_unit_id || ''),
    dia_chi: normalizeText(body.dia_chi || ''),
    lat: normalizeText(body.lat || ''),
    lng: normalizeText(body.lng || ''),
    ban_kinh_gps_m: normalizeText(body.ban_kinh_gps_m || '150'),
    wifi_ssid: normalizeText(body.wifi_ssid || ''),
    ip_allowlist: normalizeText(body.ip_allowlist || ''),
    trang_thai: normalizeText(body.trang_thai || 'ACTIVE'),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('ATTENDANCE', 'Offices', office);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_ATTENDANCE_OFFICE',
    module: 'ATTENDANCE',
    doi_tuong_type: 'OFFICE',
    doi_tuong_id: office.id,
    after: office
  });

  return ok({
    office: office
  }, 'Tạo địa điểm chấm công thành công.');
}

function updateOfficeHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);
  const officeId = normalizeText(requireBodyField(body, 'id', 'ID địa điểm'));
  const before = findObjectById('ATTENDANCE', 'Offices', officeId);

  if (!before) {
    return fail('Không tìm thấy địa điểm chấm công.', 'OFFICE_NOT_FOUND');
  }

  const patch = buildAttendanceConfigPatch_(body, [
    'ma_diem',
    'ten_diem',
    'org_unit_id',
    'dia_chi',
    'lat',
    'lng',
    'ban_kinh_gps_m',
    'wifi_ssid',
    'ip_allowlist',
    'trang_thai'
  ]);

  patch.updated_at = nowIso();

  const office = updateObjectById('ATTENDANCE', 'Offices', officeId, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_ATTENDANCE_OFFICE',
    module: 'ATTENDANCE',
    doi_tuong_type: 'OFFICE',
    doi_tuong_id: officeId,
    before: before,
    after: office
  });

  return ok({
    office: office
  }, 'Cập nhật địa điểm chấm công thành công.');
}

function deleteOfficeHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);
  const officeId = normalizeText(requireBodyField(body, 'id', 'ID địa điểm'));
  const before = findObjectById('ATTENDANCE', 'Offices', officeId);

  if (!before) {
    return fail('Không tìm thấy địa điểm chấm công.', 'OFFICE_NOT_FOUND');
  }

  const office = updateObjectById('ATTENDANCE', 'Offices', officeId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_ATTENDANCE_OFFICE',
    module: 'ATTENDANCE',
    doi_tuong_type: 'OFFICE',
    doi_tuong_id: officeId,
    before: before,
    after: office
  });

  return ok({
    office: office
  }, 'Đã xóa địa điểm chấm công.');
}

function listWorkShiftsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.view');

  ensureSheetWithHeaders('ATTENDANCE', 'WorkShifts', SPREADSHEET_STRUCTURE.ATTENDANCE.WorkShifts);

  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));
  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));

  let items = readAllObjects('ATTENDANCE', 'WorkShifts');

  if (status) {
    items = items.filter(function (row) {
      return String(row.trang_thai || '').toUpperCase() === status.toUpperCase();
    });
  }

  if (orgUnitId) {
    items = items.filter(function (row) {
      return String(row.org_unit_id || '') === orgUnitId;
    });
  }

  items.sort(function (a, b) {
    return String(a.gio_bat_dau || '').localeCompare(String(b.gio_bat_dau || ''));
  });

  return ok({
    total: items.length,
    items: items
  }, 'Lấy danh sách ca làm thành công.');
}

function createWorkShiftHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  ensureSheetWithHeaders('ATTENDANCE', 'WorkShifts', SPREADSHEET_STRUCTURE.ATTENDANCE.WorkShifts);

  const body = parseRequestBody(e);
  const shift = {
    id: generateId('SHIFT'),
    ma_ca: normalizeText(requireBodyField(body, 'ma_ca', 'Mã ca')),
    ten_ca: normalizeText(requireBodyField(body, 'ten_ca', 'Tên ca')),
    org_unit_id: normalizeText(body.org_unit_id || ''),
    gio_bat_dau: normalizeText(body.gio_bat_dau || '08:00'),
    gio_ket_thuc: normalizeText(body.gio_ket_thuc || '17:00'),
    gio_checkin_som_nhat: normalizeText(body.gio_checkin_som_nhat || ''),
    gio_checkin_muon_nhat: normalizeText(body.gio_checkin_muon_nhat || ''),
    gio_checkout_som_nhat: normalizeText(body.gio_checkout_som_nhat || ''),
    gio_checkout_muon_nhat: normalizeText(body.gio_checkout_muon_nhat || ''),
    so_cong: normalizeText(body.so_cong || '1'),
    trang_thai: normalizeText(body.trang_thai || 'ACTIVE'),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('ATTENDANCE', 'WorkShifts', shift);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_WORK_SHIFT',
    module: 'ATTENDANCE',
    doi_tuong_type: 'WORK_SHIFT',
    doi_tuong_id: shift.id,
    after: shift
  });

  return ok({
    shift: shift
  }, 'Tạo ca làm thành công.');
}

function updateWorkShiftHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);
  const shiftId = normalizeText(requireBodyField(body, 'id', 'ID ca làm'));
  const before = findObjectById('ATTENDANCE', 'WorkShifts', shiftId);

  if (!before) {
    return fail('Không tìm thấy ca làm.', 'SHIFT_NOT_FOUND');
  }

  const patch = buildAttendanceConfigPatch_(body, [
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
    'trang_thai'
  ]);

  patch.updated_at = nowIso();

  const shift = updateObjectById('ATTENDANCE', 'WorkShifts', shiftId, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_WORK_SHIFT',
    module: 'ATTENDANCE',
    doi_tuong_type: 'WORK_SHIFT',
    doi_tuong_id: shiftId,
    before: before,
    after: shift
  });

  return ok({
    shift: shift
  }, 'Cập nhật ca làm thành công.');
}

function deleteWorkShiftHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'attendance.approve');

  const body = parseRequestBody(e);
  const shiftId = normalizeText(requireBodyField(body, 'id', 'ID ca làm'));
  const before = findObjectById('ATTENDANCE', 'WorkShifts', shiftId);

  if (!before) {
    return fail('Không tìm thấy ca làm.', 'SHIFT_NOT_FOUND');
  }

  const shift = updateObjectById('ATTENDANCE', 'WorkShifts', shiftId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_WORK_SHIFT',
    module: 'ATTENDANCE',
    doi_tuong_type: 'WORK_SHIFT',
    doi_tuong_id: shiftId,
    before: before,
    after: shift
  });

  return ok({
    shift: shift
  }, 'Đã xóa ca làm.');
}

function buildAttendanceConfigPatch_(body, fields) {
  const patch = {};

  fields.forEach(function (field) {
    if (body[field] !== undefined) {
      patch[field] = normalizeText(body[field]);
    }
  });

  return patch;
}
