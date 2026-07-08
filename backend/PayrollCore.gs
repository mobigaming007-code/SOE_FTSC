const PAYROLL_STRUCTURE = {
  PayrollAdjustments: [
    'id',
    'payroll_period_id',
    'person_id',
    'membership_id',
    'adjustment_type',
    'ten_khoan',
    'so_tien',
    'ghi_chu',
    'created_by',
    'created_at',
    'updated_at',
    'trang_thai'
  ]
};

function setupPhase5() {
  ensurePayrollSheets();

  Object.keys(PAYROLL_STRUCTURE).forEach(function (sheetName) {
    ensureSheetWithHeaders('SENSITIVE_HR', sheetName, PAYROLL_STRUCTURE[sheetName]);
    Logger.log('Đã kiểm tra/tạo sheet: SENSITIVE_HR / ' + sheetName);
  });

  seedPayrollSystemConfig();

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'SETUP_PHASE_5',
    module: 'PAYROLL',
    doi_tuong_type: 'PHASE',
    doi_tuong_id: 'PHASE_5',
    after: {
      message: 'Hoàn tất setup Giai đoạn 5: Lương / bảng công / phiếu lương'
    }
  });

  Logger.log('Hoàn tất setup Giai đoạn 5.');
}

function ensurePayrollSheets() {
  ['PayrollPeriods', 'Payslips', 'PayslipItems'].forEach(function (sheetName) {
    ensureSheetWithHeaders(
      'SENSITIVE_HR',
      sheetName,
      SPREADSHEET_STRUCTURE.SENSITIVE_HR[sheetName]
    );
    Logger.log('Đã kiểm tra/tạo sheet: SENSITIVE_HR / ' + sheetName);
  });

  Object.keys(PAYROLL_STRUCTURE).forEach(function (sheetName) {
    ensureSheetWithHeaders('SENSITIVE_HR', sheetName, PAYROLL_STRUCTURE[sheetName]);
    Logger.log('Đã kiểm tra/tạo sheet: SENSITIVE_HR / ' + sheetName);
  });
}

function seedPayrollSystemConfig() {
  const configs = [
    {
      key: 'PAYROLL_STANDARD_WORK_DAYS',
      value: '26',
      value_type: 'NUMBER',
      group: 'PAYROLL',
      description: 'Số ngày công chuẩn mặc định trong tháng',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'PAYROLL_DEFAULT_ALLOWANCE',
      value: '0',
      value_type: 'NUMBER',
      group: 'PAYROLL',
      description: 'Phụ cấp mặc định nếu chưa cấu hình riêng',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'PAYROLL_OT_RATE_NORMAL',
      value: '1.5',
      value_type: 'NUMBER',
      group: 'PAYROLL',
      description: 'Hệ số OT ngày thường',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'PAYROLL_OT_RATE_WEEKEND',
      value: '2',
      value_type: 'NUMBER',
      group: 'PAYROLL',
      description: 'Hệ số OT ngày nghỉ',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'PAYROLL_OT_RATE_HOLIDAY',
      value: '3',
      value_type: 'NUMBER',
      group: 'PAYROLL',
      description: 'Hệ số OT ngày lễ',
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

function createPayrollPeriodHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');
  ensurePayrollSheets();

  const body = parseRequestBody(e);

  const month = normalizeText(requireBodyField(body, 'thang', 'Tháng'));
  const year = normalizeText(requireBodyField(body, 'nam', 'Năm'));

  const tuNgay = normalizeText(body.tu_ngay || year + '-' + pad2(month) + '-01');
  const denNgay = normalizeText(body.den_ngay || getLastDateOfMonth(year, month));

  if (!isValidDateText(tuNgay) || !isValidDateText(denNgay)) {
    return fail('Ngày kỳ lương không hợp lệ. Dùng YYYY-MM-DD.', 'INVALID_PAYROLL_DATE');
  }

  if (tuNgay > denNgay) {
    return fail('Từ ngày không được lớn hơn đến ngày.', 'INVALID_PAYROLL_RANGE');
  }

  const duplicated = findOneObject('SENSITIVE_HR', 'PayrollPeriods', function (row) {
    return String(row.thang || '') === String(month) &&
      String(row.nam || '') === String(year) &&
      String(row.trang_thai || '') !== 'DELETED';
  });

  if (duplicated) {
    return fail('Kỳ lương tháng/năm này đã tồn tại.', 'PAYROLL_PERIOD_DUPLICATED', {
      payroll_period_id: duplicated.id
    });
  }

  const period = {
    id: generateId('PAYPER'),
    thang: month,
    nam: year,
    tu_ngay: tuNgay,
    den_ngay: denNgay,
    trang_thai: 'DRAFT',
    nguoi_tao: user.id,
    ngay_tao: nowIso(),
    ngay_chot: '',
    ghi_chu: normalizeText(body.ghi_chu || '')
  };

  appendObjectRowWithLock('SENSITIVE_HR', 'PayrollPeriods', period);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_PAYROLL_PERIOD',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYROLL_PERIOD',
    doi_tuong_id: period.id,
    after: period
  });

  return ok({
    payroll_period: period
  }, 'Tạo kỳ lương thành công.');
}

function listPayrollPeriodsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');
  ensurePayrollSheets();

  const year = normalizeText(getRequestParam(e, 'nam', ''));
  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));

  let periods = readAllObjects('SENSITIVE_HR', 'PayrollPeriods')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  if (year) {
    periods = periods.filter(function (row) {
      return String(row.nam || '') === year;
    });
  }

  if (status) {
    periods = periods.filter(function (row) {
      return String(row.trang_thai || '') === status;
    });
  }

  periods.sort(function (a, b) {
    const ak = String(a.nam || '') + '-' + pad2(a.thang || '');
    const bk = String(b.nam || '') + '-' + pad2(b.thang || '');
    return bk.localeCompare(ak);
  });

  return ok({
    total: periods.length,
    items: periods
  }, 'Lấy danh sách kỳ lương thành công.');
}

function getPayrollPeriodDetailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');

  const periodId = normalizeText(getRequestParam(e, 'id', ''));

  if (!periodId) {
    return fail('Thiếu id kỳ lương.', 'MISSING_PAYROLL_PERIOD_ID');
  }

  const period = findObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId);

  if (!period || String(period.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy kỳ lương.', 'PAYROLL_PERIOD_NOT_FOUND');
  }

  const payslips = findObjects('SENSITIVE_HR', 'Payslips', function (row) {
    return String(row.payroll_period_id || '') === periodId &&
      String(row.trang_thai || '') !== 'DELETED';
  });

  return ok({
    payroll_period: period,
    payslip_count: payslips.length,
    payslips: payslips
  }, 'Lấy chi tiết kỳ lương thành công.');
}

function updatePayrollPeriodStatusHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');

  const body = parseRequestBody(e);

  const periodId = normalizeText(requireBodyField(body, 'payroll_period_id', 'ID kỳ lương'));
  const status = normalizeText(requireBodyField(body, 'trang_thai', 'Trạng thái')).toUpperCase();

  const allowed = ['DRAFT', 'CALCULATED', 'FINALIZED', 'CLOSED', 'DELETED'];

  if (allowed.indexOf(status) === -1) {
    return fail('Trạng thái kỳ lương không hợp lệ.', 'INVALID_PAYROLL_STATUS');
  }

  const before = findObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId);

  if (!before) {
    return fail('Không tìm thấy kỳ lương.', 'PAYROLL_PERIOD_NOT_FOUND');
  }

  const patch = {
    trang_thai: status,
    ghi_chu: body.ghi_chu !== undefined ? normalizeText(body.ghi_chu) : before.ghi_chu
  };

  if (status === 'FINALIZED' || status === 'CLOSED') {
    patch.ngay_chot = nowIso();
  }

  const after = updateObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_PAYROLL_PERIOD_STATUS',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYROLL_PERIOD',
    doi_tuong_id: periodId,
    before: before,
    after: after
  });

  return ok({
    payroll_period: after
  }, 'Cập nhật trạng thái kỳ lương thành công.');
}

function addPayrollAdjustmentHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');

  const body = parseRequestBody(e);

  const periodId = normalizeText(requireBodyField(body, 'payroll_period_id', 'ID kỳ lương'));
  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const type = normalizeText(requireBodyField(body, 'adjustment_type', 'Loại điều chỉnh')).toUpperCase();
  const amount = toNumber(requireBodyField(body, 'so_tien', 'Số tiền'));

  const allowedTypes = ['ALLOWANCE', 'OT', 'BONUS', 'DEDUCTION', 'ADVANCE', 'OTHER_ADD', 'OTHER_DEDUCT'];

  if (allowedTypes.indexOf(type) === -1) {
    return fail('Loại điều chỉnh không hợp lệ.', 'INVALID_ADJUSTMENT_TYPE');
  }

  const period = findObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId);

  if (!period || String(period.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy kỳ lương.', 'PAYROLL_PERIOD_NOT_FOUND');
  }

  if (['FINALIZED', 'CLOSED'].indexOf(String(period.trang_thai || '')) !== -1) {
    return fail('Kỳ lương đã chốt, không thể thêm điều chỉnh.', 'PAYROLL_PERIOD_LOCKED');
  }

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ.', 'PERSON_NOT_FOUND');
  }

  const membership = findDefaultMembershipForPayroll(personId);

  const adjustment = {
    id: generateId('PADJ'),
    payroll_period_id: periodId,
    person_id: personId,
    membership_id: membership ? membership.id : '',
    adjustment_type: type,
    ten_khoan: normalizeText(body.ten_khoan || type),
    so_tien: amount,
    ghi_chu: normalizeText(body.ghi_chu || ''),
    created_by: user.id,
    created_at: nowIso(),
    updated_at: nowIso(),
    trang_thai: 'ACTIVE'
  };

  appendObjectRowWithLock('SENSITIVE_HR', 'PayrollAdjustments', adjustment);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'ADD_PAYROLL_ADJUSTMENT',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYROLL_ADJUSTMENT',
    doi_tuong_id: adjustment.id,
    after: adjustment
  });

  return ok({
    adjustment: adjustment
  }, 'Thêm điều chỉnh lương thành công.');
}

function deletePayrollAdjustmentHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');

  const body = parseRequestBody(e);

  const adjustmentId = normalizeText(requireBodyField(body, 'adjustment_id', 'ID điều chỉnh'));

  const before = findObjectById('SENSITIVE_HR', 'PayrollAdjustments', adjustmentId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy điều chỉnh lương.', 'PAYROLL_ADJUSTMENT_NOT_FOUND');
  }

  const after = updateObjectById('SENSITIVE_HR', 'PayrollAdjustments', adjustmentId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_PAYROLL_ADJUSTMENT',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYROLL_ADJUSTMENT',
    doi_tuong_id: adjustmentId,
    before: before,
    after: after
  });

  return ok({
    adjustment: after,
    deleted_id: adjustmentId
  }, 'Đã xóa điều chỉnh lương.');
}

function generatePayrollHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');
  ensurePayrollSheets();

  const body = parseRequestBody(e);

  const periodId = normalizeText(requireBodyField(body, 'payroll_period_id', 'ID kỳ lương'));
  const orgUnitId = normalizeText(body.org_unit_id || '');
  const overwrite = String(body.overwrite || 'FALSE').toUpperCase() === 'TRUE';
  const defaultBaseSalary = toNumber(body.default_luong_co_ban || 0);
  const defaultAllowance = toNumber(
    body.default_phu_cap !== undefined
      ? body.default_phu_cap
      : getSystemConfigValue('PAYROLL_DEFAULT_ALLOWANCE', '0')
  );
  const standardWorkDays = toNumber(
    body.so_cong_chuan || getSystemConfigValue('PAYROLL_STANDARD_WORK_DAYS', '26'),
    26
  );

  const period = findObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId);

  if (!period || String(period.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy kỳ lương.', 'PAYROLL_PERIOD_NOT_FOUND');
  }

  if (['FINALIZED', 'CLOSED'].indexOf(String(period.trang_thai || '')) !== -1) {
    return fail('Kỳ lương đã chốt, không thể tính lại.', 'PAYROLL_PERIOD_LOCKED');
  }

  if (overwrite) {
    deleteExistingPayslipsInPeriod(periodId);
  }

  const targetPeople = getPayrollTargetPeople(orgUnitId);

  const results = [];
  const skipped = [];

  targetPeople.forEach(function (person) {
    const existing = findOneObject('SENSITIVE_HR', 'Payslips', function (row) {
      return String(row.payroll_period_id || '') === periodId &&
        String(row.person_id || '') === String(person.id || '') &&
        String(row.trang_thai || '') !== 'DELETED';
    });

    if (existing && !overwrite) {
      skipped.push({
        person_id: person.id,
        reason: 'PAYSLIP_EXISTS',
        payslip_id: existing.id
      });
      return;
    }

    const payslip = calculatePayslipForPerson({
      period: period,
      person: person,
      default_base_salary: defaultBaseSalary,
      default_allowance: defaultAllowance,
      standard_work_days: standardWorkDays
    });

    appendObjectRowWithLock('SENSITIVE_HR', 'Payslips', payslip.main);

    payslip.items.forEach(function (item) {
      appendObjectRowWithLock('SENSITIVE_HR', 'PayslipItems', item);
    });

    results.push(payslip.main);
  });

  const updatedPeriod = updateObjectById('SENSITIVE_HR', 'PayrollPeriods', periodId, {
    trang_thai: 'CALCULATED'
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'GENERATE_PAYROLL',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYROLL_PERIOD',
    doi_tuong_id: periodId,
    after: {
      generated_count: results.length,
      skipped_count: skipped.length,
      org_unit_id: orgUnitId,
      overwrite: overwrite
    }
  });

  return ok({
    generated_count: results.length,
    skipped_count: skipped.length,
    payroll_period: updatedPeriod,
    payslips: results,
    skipped: skipped
  }, 'Tính bảng lương thành công.');
}

function calculatePayslipForPerson(params) {
  const period = params.period;
  const person = params.person;

  const membership = findDefaultMembershipForPayroll(person.id);

  const baseSalary = getCurrentBaseSalary(person.id, period.den_ngay, params.default_base_salary);
  const standardWorkDays = toNumber(params.standard_work_days, 26);

  const attendanceData = getAttendancePayrollData(person.id, period.tu_ngay, period.den_ngay);
  const leaveData = getLeavePayrollData(person.id, period.tu_ngay, period.den_ngay);

  const paidWorkDays = attendanceData.tong_cong + leaveData.phep_nam_duoc_duyet;

  const salaryByWork = standardWorkDays > 0
    ? Math.round(baseSalary * paidWorkDays / standardWorkDays)
    : 0;

  const adjustments = getPayrollAdjustments(period.id, person.id);

  const allowanceManual = sumAdjustmentsByTypes(adjustments, ['ALLOWANCE']);
  const otManual = sumAdjustmentsByTypes(adjustments, ['OT']);
  const bonusManual = sumAdjustmentsByTypes(adjustments, ['BONUS', 'OTHER_ADD']);
  const deductionManual = sumAdjustmentsByTypes(adjustments, ['DEDUCTION', 'ADVANCE', 'OTHER_DEDUCT']);

  const allowance = params.default_allowance + allowanceManual;
  const ot = otManual;
  const bonus = bonusManual;
  const deduction = deductionManual;

  const netPay = Math.max(0, salaryByWork + allowance + ot + bonus - deduction);

  const payslipId = generateId('PAYSLIP');

  const main = {
    id: payslipId,
    payroll_period_id: period.id,
    person_id: person.id,
    membership_id: membership ? membership.id : '',
    luong_co_ban_encrypted: baseSalary,
    phu_cap: allowance,
    tong_cong: paidWorkDays,
    ot: ot,
    thuong: bonus,
    khau_tru: deduction,
    thuc_nhan_encrypted: netPay,
    trang_thai: 'CALCULATED',
    created_at: nowIso(),
    updated_at: nowIso()
  };

  const items = [
    makePayslipItem(payslipId, 'BASE_SALARY', 'Lương cơ bản theo hợp đồng', baseSalary, 'Lương cơ bản dùng làm căn cứ tính'),
    makePayslipItem(payslipId, 'WORK_DAYS', 'Công thực tế', attendanceData.tong_cong, 'Tổng công từ AttendanceSummary'),
    makePayslipItem(payslipId, 'PAID_LEAVE', 'Phép năm được tính lương', leaveData.phep_nam_duoc_duyet, 'PHEP_NAM đã duyệt'),
    makePayslipItem(payslipId, 'SALARY_BY_WORK', 'Lương theo công thực tế', salaryByWork, paidWorkDays + '/' + standardWorkDays + ' công'),
    makePayslipItem(payslipId, 'ALLOWANCE', 'Phụ cấp', allowance, 'Phụ cấp mặc định + điều chỉnh'),
    makePayslipItem(payslipId, 'OT', 'OT', ot, 'Điều chỉnh OT thủ công'),
    makePayslipItem(payslipId, 'BONUS', 'Thưởng', bonus, 'Thưởng/khác cộng'),
    makePayslipItem(payslipId, 'DEDUCTION', 'Khấu trừ', deduction, 'Khấu trừ/tạm ứng/phạt'),
    makePayslipItem(payslipId, 'NET_PAY', 'Thực nhận', netPay, 'Tổng thực nhận')
  ];

  adjustments.forEach(function (adj) {
    items.push(makePayslipItem(
      payslipId,
      'ADJUSTMENT_' + adj.adjustment_type,
      adj.ten_khoan || adj.adjustment_type,
      adj.so_tien,
      adj.ghi_chu || ''
    ));
  });

  return {
    main: main,
    items: items
  };
}

function makePayslipItem(payslipId, type, name, amount, note) {
  return {
    id: generateId('PITEM'),
    payslip_id: payslipId,
    loai_khoan: type,
    ten_khoan: name,
    so_tien: amount,
    cong_thuc: '',
    ghi_chu: note || '',
    created_at: nowIso(),
    updated_at: nowIso()
  };
}

function getPayrollTargetPeople(orgUnitId) {
  let people = readAllObjects('CORE_HR', 'People')
    .filter(function (person) {
      return String(person.trang_thai || '') === 'ACTIVE';
    });

  if (!orgUnitId) {
    return people;
  }

  const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
    .filter(function (m) {
      return String(m.org_unit_id || '') === String(orgUnitId || '') &&
        String(m.trang_thai || '') === 'ACTIVE';
    });

  const allowed = {};
  memberships.forEach(function (m) {
    allowed[String(m.person_id || '')] = true;
  });

  return people.filter(function (person) {
    return allowed[String(person.id || '')] === true;
  });
}

function getCurrentBaseSalary(personId, dateText, fallbackSalary) {
  const contracts = readAllObjects('SENSITIVE_HR', 'EmployeeContracts')
    .filter(function (contract) {
      if (String(contract.person_id || '') !== String(personId || '')) {
        return false;
      }

      if (String(contract.trang_thai || '') !== 'ACTIVE') {
        return false;
      }

      const start = String(contract.ngay_hieu_luc || contract.ngay_ky || '');
      const end = String(contract.ngay_het_han || '');

      if (start && start > dateText) {
        return false;
      }

      if (end && end < dateText) {
        return false;
      }

      return true;
    });

  contracts.sort(function (a, b) {
    return String(b.ngay_hieu_luc || b.ngay_ky || '').localeCompare(String(a.ngay_hieu_luc || a.ngay_ky || ''));
  });

  if (contracts.length > 0) {
    return toNumber(contracts[0].muc_luong_encrypted, fallbackSalary || 0);
  }

  return toNumber(fallbackSalary || 0);
}

function getAttendancePayrollData(personId, fromDate, toDate) {
  const summaries = readAllObjects('ATTENDANCE', 'AttendanceSummary')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '') &&
        String(row.ngay || '') >= String(fromDate || '') &&
        String(row.ngay || '') <= String(toDate || '') &&
        String(row.trang_thai || '') === 'COMPLETED';
    });

  let tongCong = 0;
  let tongGio = 0;
  let diTrePhut = 0;
  let veSomPhut = 0;

  summaries.forEach(function (row) {
    tongCong += toNumber(row.so_cong);
    tongGio += toNumber(row.so_gio);
    diTrePhut += toNumber(row.di_tre_phut);
    veSomPhut += toNumber(row.ve_som_phut);
  });

  return {
    tong_cong: tongCong,
    tong_gio: Math.round(tongGio * 100) / 100,
    di_tre_phut: diTrePhut,
    ve_som_phut: veSomPhut,
    summaries_count: summaries.length
  };
}

function getLeavePayrollData(personId, fromDate, toDate) {
  const requests = readAllObjects('CORE_HR', 'LeaveRequests')
    .filter(function (row) {
      return String(row.person_id || '') === String(personId || '') &&
        String(row.trang_thai || '') === 'APPROVED' &&
        String(row.tu_ngay || '') <= String(toDate || '') &&
        String(row.den_ngay || '') >= String(fromDate || '');
    });

  let annualPaid = 0;
  let unpaid = 0;
  let businessTrip = 0;
  let other = 0;

  requests.forEach(function (row) {
    const days = toNumber(row.so_ngay);

    if (isAnnualLeaveType(row.loai_nghi)) {
      annualPaid += days;
    } else if (String(row.loai_nghi || '').toUpperCase() === 'NGHI_KHONG_LUONG') {
      unpaid += days;
    } else if (String(row.loai_nghi || '').toUpperCase() === 'CONG_TAC') {
      businessTrip += days;
    } else {
      other += days;
    }
  });

  return {
    phep_nam_duoc_duyet: annualPaid,
    nghi_khong_luong: unpaid,
    cong_tac: businessTrip,
    nghi_khac: other
  };
}

function getPayrollAdjustments(periodId, personId) {
  return readAllObjects('SENSITIVE_HR', 'PayrollAdjustments')
    .filter(function (row) {
      return String(row.payroll_period_id || '') === String(periodId || '') &&
        String(row.person_id || '') === String(personId || '') &&
        String(row.trang_thai || '') === 'ACTIVE';
    });
}

function sumAdjustmentsByTypes(adjustments, types) {
  let sum = 0;

  adjustments.forEach(function (adj) {
    if (types.indexOf(String(adj.adjustment_type || '').toUpperCase()) !== -1) {
      sum += toNumber(adj.so_tien);
    }
  });

  return sum;
}

function listPayslipsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');
  ensurePayrollSheets();

  const periodId = normalizeText(getRequestParam(e, 'payroll_period_id', ''));
  const personId = normalizeText(getRequestParam(e, 'person_id', ''));

  let payslips = readAllObjects('SENSITIVE_HR', 'Payslips')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  if (periodId) {
    payslips = payslips.filter(function (row) {
      return String(row.payroll_period_id || '') === periodId;
    });
  }

  if (personId) {
    payslips = payslips.filter(function (row) {
      return String(row.person_id || '') === personId;
    });
  }

  payslips = enrichPayslipsWithPeople_(payslips);

  return ok({
    total: payslips.length,
    items: payslips
  }, 'Lấy danh sách phiếu lương thành công.');
}

function getPayslipDetailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');

  const payslipId = normalizeText(getRequestParam(e, 'id', ''));

  if (!payslipId) {
    return fail('Thiếu id phiếu lương.', 'MISSING_PAYSLIP_ID');
  }

  const payslip = findObjectById('SENSITIVE_HR', 'Payslips', payslipId);

  if (!payslip || String(payslip.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy phiếu lương.', 'PAYSLIP_NOT_FOUND');
  }

  const isOwner = String(payslip.person_id || '') === String(user.person_id || '');

  if (!isOwner) {
    requirePermission(user, 'payroll.manage');
  }

  const items = findObjects('SENSITIVE_HR', 'PayslipItems', function (row) {
    return String(row.payslip_id || '') === payslipId;
  });

  const period = findObjectById('SENSITIVE_HR', 'PayrollPeriods', payslip.payroll_period_id);
  const person = findObjectById('CORE_HR', 'People', payslip.person_id);
  const enrichedPayslip = enrichPayslipsWithPeople_([payslip])[0] || payslip;

  return ok({
    payroll_period: period,
    person: sanitizePerson(person),
    payslip: enrichedPayslip,
    items: items
  }, 'Lấy chi tiết phiếu lương thành công.');
}

function getMyPayslipsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.view');

  if (!user.person_id) {
    return fail('Tài khoản chưa liên kết hồ sơ cá nhân.', 'PERSON_NOT_LINKED');
  }

  let payslips = readAllObjects('SENSITIVE_HR', 'Payslips')
    .filter(function (row) {
      return String(row.person_id || '') === String(user.person_id || '') &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  payslips.sort(function (a, b) {
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  payslips = enrichPayslipsWithPeople_(payslips);

  return ok({
    total: payslips.length,
    items: payslips
  }, 'Lấy phiếu lương của tôi thành công.');
}

function finalizePayslipHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'payroll.manage');

  const body = parseRequestBody(e);
  const payslipId = normalizeText(requireBodyField(body, 'payslip_id', 'ID phiếu lương'));
  const status = normalizeText(body.trang_thai || 'FINALIZED').toUpperCase();

  const allowed = ['CALCULATED', 'FINALIZED', 'SENT', 'DELETED'];

  if (allowed.indexOf(status) === -1) {
    return fail('Trạng thái phiếu lương không hợp lệ.', 'INVALID_PAYSLIP_STATUS');
  }

  const before = findObjectById('SENSITIVE_HR', 'Payslips', payslipId);

  if (!before) {
    return fail('Không tìm thấy phiếu lương.', 'PAYSLIP_NOT_FOUND');
  }

  const after = updateObjectById('SENSITIVE_HR', 'Payslips', payslipId, {
    trang_thai: status,
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_PAYSLIP_STATUS',
    module: 'PAYROLL',
    doi_tuong_type: 'PAYSLIP',
    doi_tuong_id: payslipId,
    before: before,
    after: after
  });

  return ok({
    payslip: enrichPayslipsWithPeople_([after])[0] || after
  }, 'Cập nhật trạng thái phiếu lương thành công.');
}

function enrichPayslipsWithPeople_(payslips) {
  if (!payslips || !payslips.length) {
    return payslips || [];
  }

  const peopleById = {};

  readAllObjects('CORE_HR', 'People').forEach(function (person) {
    peopleById[String(person.id || '')] = person;
  });

  return payslips.map(function (payslip) {
    const person = peopleById[String(payslip.person_id || '')] || {};

    payslip.ho_ten = person.ho_ten || '';
    payslip.ma_dinh_danh = person.ma_dinh_danh || '';
    payslip.ten_nhan_su = person.ho_ten || payslip.person_id || '';

    return payslip;
  });
}

function deleteExistingPayslipsInPeriod(periodId) {
  const payslips = findObjects('SENSITIVE_HR', 'Payslips', function (row) {
    return String(row.payroll_period_id || '') === String(periodId || '') &&
      String(row.trang_thai || '') !== 'DELETED';
  });

  payslips.forEach(function (payslip) {
    updateObjectByRowNumber('SENSITIVE_HR', 'Payslips', payslip.__rowNumber, {
      trang_thai: 'DELETED',
      updated_at: nowIso()
    });
  });
}

function findDefaultMembershipForPayroll(personId) {
  return findOneObject('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.trang_thai || '') === 'ACTIVE' &&
      ['EMPLOYEE', 'CONTRACTOR', 'MANAGER'].indexOf(String(row.loai_quan_he || '').toUpperCase()) !== -1;
  }) || findOneObject('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === String(personId || '') &&
      String(row.trang_thai || '') === 'ACTIVE';
  });
}

function pad2(value) {
  return ('0' + String(value || '')).slice(-2);
}

function getLastDateOfMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  const date = new Date(y, m, 0);

  return Utilities.formatDate(
    date,
    getRequiredConfig('TIMEZONE'),
    'yyyy-MM-dd'
  );
}
