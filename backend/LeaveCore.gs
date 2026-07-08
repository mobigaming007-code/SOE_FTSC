const LEAVE_STRUCTURE = {
  LeaveRequests: [
    'id',
    'person_id',
    'membership_id',
    'org_unit_id',
    'loai_nghi',
    'tu_ngay',
    'den_ngay',
    'buoi_tu',
    'buoi_den',
    'so_ngay',
    'ly_do',
    'nguoi_ban_giao',
    'file_minh_chung_id',
    'file_minh_chung_url',
    'trang_thai',
    'nguoi_duyet',
    'ngay_duyet',
    'ghi_chu_duyet',
    'created_by',
    'created_at',
    'updated_at',
    'cancelled_at',
    'cancel_reason'
  ],

  LeaveBalances: [
    'id',
    'person_id',
    'nam',
    'tong_phep',
    'da_dung',
    'dang_cho_duyet',
    'con_lai',
    'updated_at'
  ],

  LeaveApprovals: [
    'id',
    'leave_request_id',
    'nguoi_duyet',
    'hanh_dong',
    'ghi_chu',
    'thoi_gian'
  ]
};

function setupPhase4() {
  Object.keys(LEAVE_STRUCTURE).forEach(function (sheetName) {
    ensureSheetWithHeaders('CORE_HR', sheetName, LEAVE_STRUCTURE[sheetName]);
    Logger.log('Đã kiểm tra/tạo sheet: CORE_HR / ' + sheetName);
  });

  seedLeaveSystemConfig();

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'SETUP_PHASE_4',
    module: 'LEAVE',
    doi_tuong_type: 'PHASE',
    doi_tuong_id: 'PHASE_4',
    after: {
      message: 'Hoàn tất setup Giai đoạn 4: Nghỉ phép'
    }
  });

  Logger.log('Hoàn tất setup Giai đoạn 4.');
}

function seedLeaveSystemConfig() {
  const configs = [
    {
      key: 'LEAVE_DEFAULT_ANNUAL_DAYS',
      value: '12',
      value_type: 'NUMBER',
      group: 'LEAVE',
      description: 'Số ngày phép năm mặc định',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'LEAVE_WORKING_DAYS',
      value: '1,2,3,4,5',
      value_type: 'STRING',
      group: 'LEAVE',
      description: 'Ngày làm việc trong tuần, theo Date.getDay(): 1=T2 ... 5=T6',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'LEAVE_REQUIRE_APPROVAL',
      value: 'TRUE',
      value_type: 'BOOLEAN',
      group: 'LEAVE',
      description: 'Đơn nghỉ cần duyệt hay không',
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

function createLeaveRequestHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.request');

  const body = parseRequestBody(e);

  const personId = normalizeText(body.person_id || user.person_id);

  if (!personId) {
    return fail('Tài khoản hiện tại chưa liên kết hồ sơ cá nhân.', 'PERSON_NOT_LINKED');
  }

  if (String(personId) !== String(user.person_id || '')) {
    requirePermission(user, 'leave.approve');
  }

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') !== 'ACTIVE') {
    return fail('Không tìm thấy hồ sơ nhân sự hợp lệ.', 'PERSON_NOT_ACTIVE');
  }

  const loaiNghi = normalizeText(requireBodyField(body, 'loai_nghi', 'Loại nghỉ'));
  const tuNgay = normalizeText(requireBodyField(body, 'tu_ngay', 'Từ ngày'));
  const denNgay = normalizeText(requireBodyField(body, 'den_ngay', 'Đến ngày'));
  const lyDo = normalizeText(requireBodyField(body, 'ly_do', 'Lý do'));

  const buoiTu = normalizeText(body.buoi_tu || 'FULL');
  const buoiDen = normalizeText(body.buoi_den || 'FULL');

  if (!isValidDateText(tuNgay) || !isValidDateText(denNgay)) {
    return fail('Ngày nghỉ không hợp lệ. Dùng định dạng YYYY-MM-DD.', 'INVALID_DATE');
  }

  if (tuNgay > denNgay) {
    return fail('Từ ngày không được lớn hơn đến ngày.', 'INVALID_DATE_RANGE');
  }

  const membership = body.membership_id
    ? findObjectById('CORE_HR', 'PersonOrgMemberships', normalizeText(body.membership_id))
    : findDefaultMembershipForLeave(personId);

  const membershipId = membership ? membership.id : '';
  const orgUnitId = membership ? membership.org_unit_id : '';

  const soNgay = body.so_ngay !== undefined && body.so_ngay !== ''
    ? toNumber(body.so_ngay)
    : calculateLeaveDays(tuNgay, denNgay, buoiTu, buoiDen);

  if (soNgay <= 0) {
    return fail('Số ngày nghỉ phải lớn hơn 0.', 'INVALID_LEAVE_DAYS');
  }

  const conflict = findOverlappingLeaveRequest(personId, tuNgay, denNgay);

  if (conflict) {
    return fail('Bạn đã có đơn nghỉ trùng khoảng thời gian này.', 'LEAVE_OVERLAPPED', {
      existing_request_id: conflict.id,
      existing_status: conflict.trang_thai
    });
  }

  const year = getYearFromDateText(tuNgay);

  if (isAnnualLeaveType(loaiNghi)) {
    const balance = recalcLeaveBalance(personId, year);

    if (soNgay > Number(balance.con_lai || 0)) {
      return fail('Số ngày phép còn lại không đủ.', 'LEAVE_BALANCE_NOT_ENOUGH', {
        con_lai: balance.con_lai,
        so_ngay_de_nghi: soNgay
      });
    }
  }

  const leaveId = generateId('LEAVE');

  const leaveRequest = {
    id: leaveId,
    person_id: personId,
    membership_id: membershipId,
    org_unit_id: orgUnitId,
    loai_nghi: loaiNghi,
    tu_ngay: tuNgay,
    den_ngay: denNgay,
    buoi_tu: buoiTu,
    buoi_den: buoiDen,
    so_ngay: soNgay,
    ly_do: lyDo,
    nguoi_ban_giao: normalizeText(body.nguoi_ban_giao || ''),
    file_minh_chung_id: normalizeText(body.file_minh_chung_id || ''),
    file_minh_chung_url: normalizeText(body.file_minh_chung_url || ''),
    trang_thai: 'PENDING',
    nguoi_duyet: '',
    ngay_duyet: '',
    ghi_chu_duyet: '',
    created_by: user.id,
    created_at: nowIso(),
    updated_at: nowIso(),
    cancelled_at: '',
    cancel_reason: ''
  };

  appendObjectRowWithLock('CORE_HR', 'LeaveRequests', leaveRequest);

  if (isAnnualLeaveType(loaiNghi)) {
    recalcLeaveBalance(personId, year);
  }

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_LEAVE_REQUEST',
    module: 'LEAVE',
    doi_tuong_type: 'LEAVE_REQUEST',
    doi_tuong_id: leaveId,
    after: leaveRequest
  });

  return ok({
    leave_request: leaveRequest,
    balance: isAnnualLeaveType(loaiNghi) ? recalcLeaveBalance(personId, year) : null
  }, 'Tạo đơn nghỉ thành công, đang chờ duyệt.');
}

function listMyLeaveRequestsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.view');

  const personId = normalizeText(getRequestParam(e, 'person_id', user.person_id));
  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));
  const fromDate = normalizeText(getRequestParam(e, 'from', ''));
  const toDate = normalizeText(getRequestParam(e, 'to', ''));

  if (String(personId) !== String(user.person_id || '')) {
    requirePermission(user, 'leave.approve');
  }

  let requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '') &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  if (status) {
    requests = requests.filter(function (row) {
      return String(row.trang_thai || '') === status;
    });
  }

  if (fromDate) {
    requests = requests.filter(function (row) {
      return String(row.den_ngay || '') >= fromDate;
    });
  }

  if (toDate) {
    requests = requests.filter(function (row) {
      return String(row.tu_ngay || '') <= toDate;
    });
  }

  requests.sort(function (a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return ok({
    total: requests.length,
    items: requests
  }, 'Lấy danh sách đơn nghỉ thành công.');
}

function getLeaveRequestDetailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.view');

  const leaveId = normalizeText(getRequestParam(e, 'id', ''));

  if (!leaveId) {
    return fail('Thiếu id đơn nghỉ.', 'MISSING_LEAVE_ID');
  }

  const request = findObjectById('CORE_HR', 'LeaveRequests', leaveId);

  if (!request || String(request.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy đơn nghỉ.', 'LEAVE_NOT_FOUND');
  }

  if (String(request.person_id || '') !== String(user.person_id || '')) {
    requirePermission(user, 'leave.approve');
  }

  const approvals = findObjects('CORE_HR', 'LeaveApprovals', function (row) {
    return String(row.leave_request_id || '') === leaveId;
  });

  return ok({
    leave_request: request,
    approvals: approvals
  }, 'Lấy chi tiết đơn nghỉ thành công.');
}

function listPendingLeaveRequestsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.approve');

  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));
  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));
  const fromDate = normalizeText(getRequestParam(e, 'from', ''));
  const toDate = normalizeText(getRequestParam(e, 'to', ''));

  let requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  if (status && status !== 'ALL') {
    requests = requests.filter(function (row) {
      return String(row.trang_thai || '') === status;
    });
  }

  if (orgUnitId) {
    requests = requests.filter(function (row) {
      return String(row.org_unit_id || '') === orgUnitId;
    });
  }

  if (fromDate) {
    requests = requests.filter(function (row) {
      return String(row.den_ngay || '') >= fromDate;
    });
  }

  if (toDate) {
    requests = requests.filter(function (row) {
      return String(row.tu_ngay || '') <= toDate;
    });
  }

  requests.sort(function (a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return ok({
    total: requests.length,
    items: requests
  }, 'Lấy danh sách đơn nghỉ chờ duyệt thành công.');
}

function approveLeaveRequestHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.approve');

  const body = parseRequestBody(e);

  const leaveId = normalizeText(requireBodyField(body, 'leave_request_id', 'ID đơn nghỉ'));
  const action = normalizeText(requireBodyField(body, 'action', 'Hành động')).toUpperCase();
  const note = normalizeText(body.ghi_chu || '');

  const before = findObjectById('CORE_HR', 'LeaveRequests', leaveId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy đơn nghỉ.', 'LEAVE_NOT_FOUND');
  }

  if (String(before.trang_thai || '') !== 'PENDING') {
    return fail('Chỉ có thể duyệt/từ chối đơn đang chờ duyệt.', 'LEAVE_STATUS_INVALID', {
      current_status: before.trang_thai
    });
  }

  let newStatus = '';

  if (action === 'APPROVE' || action === 'APPROVED') {
    newStatus = 'APPROVED';
  } else if (action === 'REJECT' || action === 'REJECTED') {
    newStatus = 'REJECTED';
  } else {
    return fail('Hành động không hợp lệ. Dùng APPROVE hoặc REJECT.', 'INVALID_APPROVAL_ACTION');
  }

  const after = updateObjectById('CORE_HR', 'LeaveRequests', leaveId, {
    trang_thai: newStatus,
    nguoi_duyet: user.id,
    ngay_duyet: nowIso(),
    ghi_chu_duyet: note,
    updated_at: nowIso()
  });

  appendObjectRowWithLock('CORE_HR', 'LeaveApprovals', {
    id: generateId('LAPP'),
    leave_request_id: leaveId,
    nguoi_duyet: user.id,
    hanh_dong: newStatus,
    ghi_chu: note,
    thoi_gian: nowIso()
  });

  const year = getYearFromDateText(after.tu_ngay);
  const balance = isAnnualLeaveType(after.loai_nghi)
    ? recalcLeaveBalance(after.person_id, year)
    : null;

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'APPROVE_LEAVE_' + newStatus,
    module: 'LEAVE',
    doi_tuong_type: 'LEAVE_REQUEST',
    doi_tuong_id: leaveId,
    before: before,
    after: after
  });

  return ok({
    leave_request: after,
    balance: balance
  }, newStatus === 'APPROVED' ? 'Đã duyệt đơn nghỉ.' : 'Đã từ chối đơn nghỉ.');
}

function cancelLeaveRequestHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.request');

  const body = parseRequestBody(e);

  const leaveId = normalizeText(requireBodyField(body, 'leave_request_id', 'ID đơn nghỉ'));
  const reason = normalizeText(body.reason || body.ly_do_huy || '');

  const before = findObjectById('CORE_HR', 'LeaveRequests', leaveId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy đơn nghỉ.', 'LEAVE_NOT_FOUND');
  }

  const isOwner = String(before.person_id || '') === String(user.person_id || '');

  if (!isOwner) {
    requirePermission(user, 'leave.approve');
  }

  const currentStatus = String(before.trang_thai || '');

  if (['REJECTED', 'CANCELLED'].indexOf(currentStatus) !== -1) {
    return fail('Không thể hủy đơn ở trạng thái hiện tại.', 'LEAVE_CANNOT_CANCEL', {
      current_status: currentStatus
    });
  }

  const after = updateObjectById('CORE_HR', 'LeaveRequests', leaveId, {
    trang_thai: 'CANCELLED',
    cancelled_at: nowIso(),
    cancel_reason: reason,
    updated_at: nowIso()
  });

  appendObjectRowWithLock('CORE_HR', 'LeaveApprovals', {
    id: generateId('LAPP'),
    leave_request_id: leaveId,
    nguoi_duyet: user.id,
    hanh_dong: 'CANCELLED',
    ghi_chu: reason,
    thoi_gian: nowIso()
  });

  const year = getYearFromDateText(after.tu_ngay);
  const balance = isAnnualLeaveType(after.loai_nghi)
    ? recalcLeaveBalance(after.person_id, year)
    : null;

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CANCEL_LEAVE_REQUEST',
    module: 'LEAVE',
    doi_tuong_type: 'LEAVE_REQUEST',
    doi_tuong_id: leaveId,
    before: before,
    after: after
  });

  return ok({
    leave_request: after,
    balance: balance
  }, 'Đã hủy đơn nghỉ.');
}

function getLeaveBalanceHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.view');

  const personId = normalizeText(getRequestParam(e, 'person_id', user.person_id));
  const year = normalizeText(getRequestParam(e, 'nam', String(new Date().getFullYear())));

  if (String(personId) !== String(user.person_id || '')) {
    requirePermission(user, 'leave.approve');
  }

  const balance = recalcLeaveBalance(personId, year);

  return ok({
    balance: balance
  }, 'Lấy số dư phép thành công.');
}

function updateLeaveBalanceHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'leave.approve');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const year = normalizeText(body.nam || String(new Date().getFullYear()));
  const totalDays = toNumber(requireBodyField(body, 'tong_phep', 'Tổng phép năm'));

  const before = getLeaveBalanceRow(personId, year);
  const balance = ensureLeaveBalance(personId, year, totalDays);

  updateObjectById('CORE_HR', 'LeaveBalances', balance.id, {
    tong_phep: totalDays,
    updated_at: nowIso()
  });

  const after = recalcLeaveBalance(personId, year);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_LEAVE_BALANCE',
    module: 'LEAVE',
    doi_tuong_type: 'LEAVE_BALANCE',
    doi_tuong_id: after.id,
    before: before,
    after: after
  });

  return ok({
    balance: after
  }, 'Cập nhật tổng phép năm thành công.');
}

function recalcLeaveBalance(personId, year) {
  const balance = ensureLeaveBalance(personId, year);

  const requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '') &&
        String(row.trang_thai || '') !== 'DELETED' &&
        isAnnualLeaveType(row.loai_nghi) &&
        getYearFromDateText(row.tu_ngay) === String(year);
    });

  let used = 0;
  let pending = 0;

  requests.forEach(function (row) {
    const days = toNumber(row.so_ngay);

    if (String(row.trang_thai || '') === 'APPROVED') {
      used += days;
    }

    if (String(row.trang_thai || '') === 'PENDING') {
      pending += days;
    }
  });

  const total = toNumber(balance.tong_phep, getDefaultAnnualLeaveDays());
  const remaining = Math.max(0, total - used - pending);

  updateObjectById('CORE_HR', 'LeaveBalances', balance.id, {
    da_dung: used,
    dang_cho_duyet: pending,
    con_lai: remaining,
    updated_at: nowIso()
  });

  return findObjectById('CORE_HR', 'LeaveBalances', balance.id);
}

function ensureLeaveBalance(personId, year, totalDays) {
  const existing = getLeaveBalanceRow(personId, year);

  if (existing) {
    return existing;
  }

  const balance = {
    id: generateId('LBAL'),
    person_id: personId,
    nam: String(year),
    tong_phep: totalDays !== undefined ? toNumber(totalDays) : getDefaultAnnualLeaveDays(),
    da_dung: 0,
    dang_cho_duyet: 0,
    con_lai: totalDays !== undefined ? toNumber(totalDays) : getDefaultAnnualLeaveDays(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('CORE_HR', 'LeaveBalances', balance);

  return balance;
}

function getLeaveBalanceRow(personId, year) {
  return findOneObject('CORE_HR', 'LeaveBalances', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.nam || '') === String(year || '');
  });
}

function findDefaultMembershipForLeave(personId) {
  return findOneObject('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.trang_thai || '') === 'ACTIVE';
  });
}

function findOverlappingLeaveRequest(personId, startDate, endDate) {
  return findOneObject('CORE_HR', 'LeaveRequests', function (row) {
    if (String(row.person_id || '') !== String(personId || '')) {
      return false;
    }

    if (['PENDING', 'APPROVED'].indexOf(String(row.trang_thai || '')) === -1) {
      return false;
    }

    const rowStart = String(row.tu_ngay || '');
    const rowEnd = String(row.den_ngay || '');

    return rowStart <= endDate && rowEnd >= startDate;
  });
}

function calculateLeaveDays(startDate, endDate, startSession, endSession) {
  const start = parseDateTextOnly(startDate);
  const end = parseDateTextOnly(endDate);

  if (!start || !end) {
    return 0;
  }

  const workingDays = getWorkingDaysConfig();
  let count = 0;

  const current = new Date(start.getTime());

  while (current.getTime() <= end.getTime()) {
    const day = current.getDay();

    if (workingDays.indexOf(day) !== -1) {
      count += 1;
    }

    current.setDate(current.getDate() + 1);
  }

  if (count <= 0) {
    return 0;
  }

  const sameDay = startDate === endDate;

  const s = String(startSession || 'FULL').toUpperCase();
  const e2 = String(endSession || 'FULL').toUpperCase();

  if (sameDay) {
    if (s === 'AM' && e2 === 'AM') {
      return 0.5;
    }

    if (s === 'PM' && e2 === 'PM') {
      return 0.5;
    }

    return count;
  }

  if (s === 'PM') {
    count -= 0.5;
  }

  if (e2 === 'AM') {
    count -= 0.5;
  }

  return Math.max(0, count);
}

function parseDateTextOnly(value) {
  const text = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const parts = text.split('-');

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

function isValidDateText(value) {
  return parseDateTextOnly(value) !== null;
}

function getYearFromDateText(value) {
  const text = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text.substring(0, 4);
  }

  return String(new Date().getFullYear());
}

function getWorkingDaysConfig() {
  const value = String(getSystemConfigValue('LEAVE_WORKING_DAYS', '1,2,3,4,5') || '1,2,3,4,5');

  return value.split(',')
    .map(function (item) {
      return Number(String(item).trim());
    })
    .filter(function (num) {
      return Number.isFinite(num);
    });
}

function getDefaultAnnualLeaveDays() {
  return toNumber(getSystemConfigValue('LEAVE_DEFAULT_ANNUAL_DAYS', '12'), 12);
}

function isAnnualLeaveType(type) {
  const text = String(type || '').trim().toUpperCase();

  return [
    'PHEP_NAM',
    'ANNUAL',
    'ANNUAL_LEAVE',
    'NGHI_PHEP_NAM',
    'PHÉP NĂM',
    'PHEP NAM'
  ].indexOf(text) !== -1;
}
