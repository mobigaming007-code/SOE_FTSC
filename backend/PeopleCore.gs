function listPeopleHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.view');

  const keyword = normalizeText(getRequestParam(e, 'q', '')).toLowerCase();
  const status = normalizeText(getRequestParam(e, 'trang_thai', ''));
  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));

  let people = readAllObjects('CORE_HR', 'People')
    .filter(function (person) {
      return String(person.trang_thai || '') !== 'DELETED';
    });

  if (status) {
    people = people.filter(function (person) {
      return String(person.trang_thai || '') === status;
    });
  }

  if (keyword) {
    people = people.filter(function (person) {
      const text = [
        person.ma_dinh_danh,
        person.ho_ten,
        person.sdt,
        person.email
      ].join(' ').toLowerCase();

      return text.indexOf(keyword) !== -1;
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

    people = people.filter(function (person) {
      return allowedPersonIds[String(person.id || '')] === true;
    });
  }

  people = people.map(function (person) {
    return sanitizePerson(person);
  });

  return ok({
    total: people.length,
    items: people
  }, 'Lấy danh sách hồ sơ thành công.');
}

function getPersonDetailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.view');

  const personLookupKey = normalizeText(getRequestParam(e, 'id', ''));

  if (!personLookupKey) {
    return fail('Thiếu id hồ sơ.', 'MISSING_PERSON_ID');
  }

  const person = findObjectById('CORE_HR', 'People', personLookupKey) ||
    findOneObject('CORE_HR', 'People', function (row) {
      return String(row.ma_dinh_danh || '') === personLookupKey;
    });
  const personId = person ? String(person.id || '') : '';

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ.', 'PERSON_NOT_FOUND');
  }

  const memberships = findObjects('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === personId &&
      String(row.trang_thai || '') !== 'DELETED';
  });

  const userAccounts = findObjects('CORE_HR', 'UserAccounts', function (row) {
    return String(row.person_id || '') === personId &&
      String(row.trang_thai || '') !== 'DELETED';
  }).map(function (account) {
    return sanitizeUserAccount(account);
  });

  return ok({
    person: sanitizePerson(person),
    memberships: memberships,
    user_accounts: userAccounts,
    hrm: getPersonHrmData(personId)
  }, 'Lấy chi tiết hồ sơ thành công.');
}

function getMyPersonProfileHandler(e) {
  const user = requireAuth(e);
  const personId = normalizeText(user.person_id || '');

  if (!personId) {
    return fail('Tài khoản hiện tại chưa liên kết hồ sơ cá nhân.', 'PERSON_NOT_LINKED');
  }

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ cá nhân.', 'PERSON_NOT_FOUND');
  }

  const memberships = findObjects('CORE_HR', 'PersonOrgMemberships', function (row) {
    return String(row.person_id || '') === String(person.id || '') &&
      String(row.trang_thai || '') !== 'DELETED';
  }).map(enrichMembershipForProfile);

  const userAccounts = findObjects('CORE_HR', 'UserAccounts', function (row) {
    return String(row.person_id || '') === String(person.id || '') &&
      String(row.trang_thai || '') !== 'DELETED';
  }).map(function (account) {
    return sanitizeUserAccount(account);
  });

  return ok({
    person: sanitizePerson(person),
    memberships: memberships,
    user_accounts: userAccounts,
    hrm: getPersonHrmData(String(person.id || ''))
  }, 'Lấy hồ sơ cá nhân thành công.');
}

function listPeopleDirectoryHandler(e) {
  requireAuth(e);

  const keyword = normalizeText(getRequestParam(e, 'q', '')).toLowerCase();
  const people = readAllObjects('CORE_HR', 'People')
    .filter(function (person) {
      return String(person.trang_thai || '') === 'ACTIVE';
    });

  const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
    .filter(function (row) {
      return String(row.trang_thai || '') === 'ACTIVE';
    })
    .map(enrichMembershipForProfile);

  const membershipsByPerson = {};
  memberships.forEach(function (membership) {
    const personId = String(membership.person_id || '');

    if (!membershipsByPerson[personId]) {
      membershipsByPerson[personId] = [];
    }

    membershipsByPerson[personId].push(membership);
  });

  let items = people.map(function (person) {
    const personMemberships = membershipsByPerson[String(person.id || '')] || [];
    const primaryMembership = personMemberships[0] || {};

    return {
      person: sanitizePerson(person),
      memberships: personMemberships,
      primary_membership: primaryMembership,
      org_unit_id: primaryMembership.org_unit_id || '',
      ten_don_vi: primaryMembership.ten_don_vi || '',
      ma_don_vi: primaryMembership.ma_don_vi || '',
      loai_don_vi: primaryMembership.loai_don_vi || '',
      org_type: primaryMembership.org_type || '',
      position_id: primaryMembership.position_id || '',
      ten_chuc_danh: primaryMembership.ten_chuc_danh || '',
      ma_chuc_danh: primaryMembership.ma_chuc_danh || ''
    };
  });

  if (keyword) {
    items = items.filter(function (item) {
      const person = item.person || {};
      const text = [
        person.ma_dinh_danh,
        person.ho_ten,
        person.sdt,
        person.email,
        item.ten_chuc_danh,
        item.ten_don_vi,
        item.ma_don_vi
      ].join(' ').toLowerCase();

      return text.indexOf(keyword) !== -1;
    });
  }

  items.sort(function (a, b) {
    return String(a.ten_don_vi || '').localeCompare(String(b.ten_don_vi || '')) ||
      String((a.person || {}).ho_ten || '').localeCompare(String((b.person || {}).ho_ten || ''));
  });

  return ok({
    total: items.length,
    items: items
  }, 'Lấy danh bạ nhân viên thành công.');
}

function enrichMembershipForProfile(membership) {
  const output = stripRowNumber(membership);
  const orgUnit = output.org_unit_id
    ? findObjectById('CORE_HR', 'OrgUnits', output.org_unit_id)
    : null;
  const position = output.position_id
    ? findObjectById('CORE_HR', 'Positions', output.position_id)
    : null;

  output.ten_don_vi = orgUnit ? orgUnit.ten_don_vi : '';
  output.ma_don_vi = orgUnit ? orgUnit.ma_don_vi : '';
  output.loai_don_vi = orgUnit ? orgUnit.loai_don_vi : '';
  output.org_type = orgUnit ? orgUnit.org_type : output.org_type;
  output.ten_chuc_danh = position && position.ten_chuc_danh
    ? position.ten_chuc_danh
    : getPositionDisplayNameFallback_(output.position_id || '');
  output.ma_chuc_danh = position && position.ma_chuc_danh
    ? position.ma_chuc_danh
    : getPositionRoleCodeFallback_(output.position_id || '');

  return output;
}

function getPositionDisplayNameFallback_(positionId) {
  const map = {
    POS_DIRECTOR: 'Giám đốc',
    POS_DEPUTY_DIRECTOR: 'Phó Giám đốc',
    POS_CHAIRMAN: 'Chủ tịch',
    POS_VICE_CHAIRMAN: 'Phó Chủ tịch',
    POS_HR: 'Nhân sự/HR',
    POS_ACCOUNTANT: 'Kế toán',
    POS_DEPARTMENT_MANAGER: 'Trưởng Phòng',
    POS_DEPUTY_DEPARTMENT_MANAGER: 'Phó Trưởng Phòng',
    POS_MANAGER: 'Quản lý/Trưởng đơn vị',
    POS_SPECIALIST: 'Chuyên viên',
    POS_INTERN: 'Thực tập sinh',
    POS_CLUB_GENERAL_LEADER: 'Tổng Chủ nhiệm',
    POS_CLUB_DEPUTY_GENERAL_LEADER: 'Phó Tổng Chủ nhiệm',
    POS_CLUB_DEPARTMENT_HEAD: 'Trưởng Ban',
    POS_CLUB_DEPARTMENT_DEPUTY: 'Phó Trưởng Ban',
    POS_CLUB_OFFICE_CHIEF: 'Chánh Văn phòng Ban Chủ nhiệm Nhóm',
    POS_CLUB_OFFICE_DEPUTY: 'Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm',
    POS_CLUB_DEPARTMENT_MANAGER: 'Trưởng Phòng',
    POS_CLUB_DEPUTY_DEPARTMENT_MANAGER: 'Phó Trưởng Phòng',
    POS_CLUB_BRANCH_LEADER: 'Chủ nhiệm Chi nhánh',
    POS_CLUB_BRANCH_DEPUTY: 'Phó Chủ nhiệm Chi nhánh',
    POS_CLUB_BRANCH_STANDING_DEPUTY: 'Phó Chủ nhiệm Thường trực Chi nhánh',
    POS_CLUB_BRANCH_OFFICE_CHIEF: 'Chánh Văn phòng Ban Chủ nhiệm Chi nhánh',
    POS_CLUB_BRANCH_OFFICE_DEPUTY: 'Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh',
    POS_CLUB_BRANCH_DEPARTMENT_HEAD: 'Trưởng Ban thuộc Chi nhánh',
    POS_CLUB_BRANCH_DEPARTMENT_DEPUTY: 'Phó Trưởng Ban thuộc Chi nhánh',
    POS_CLUB_VOLUNTEER: 'Tình nguyện viên'
  };

  return map[String(positionId || '')] || '';
}

function getPositionRoleCodeFallback_(positionId) {
  const map = {
    POS_DIRECTOR: 'GIAM_DOC',
    POS_DEPUTY_DIRECTOR: 'PHO_GIAM_DOC',
    POS_CHAIRMAN: 'CHU_TICH',
    POS_VICE_CHAIRMAN: 'PHO_CHU_TICH',
    POS_HR: 'HR',
    POS_ACCOUNTANT: 'KE_TOAN',
    POS_DEPARTMENT_MANAGER: 'TRUONG_PHONG',
    POS_DEPUTY_DEPARTMENT_MANAGER: 'PHO_TRUONG_PHONG',
    POS_MANAGER: 'TRUONG_DON_VI',
    POS_SPECIALIST: 'CHUYEN_VIEN',
    POS_INTERN: 'THUC_TAP_SINH',
    POS_CLUB_GENERAL_LEADER: 'TONG_CHU_NHIEM',
    POS_CLUB_DEPUTY_GENERAL_LEADER: 'PHO_TONG_CHU_NHIEM',
    POS_CLUB_DEPARTMENT_HEAD: 'TRUONG_BAN',
    POS_CLUB_DEPARTMENT_DEPUTY: 'PHO_TRUONG_BAN',
    POS_CLUB_OFFICE_CHIEF: 'CHANH_VAN_PHONG',
    POS_CLUB_OFFICE_DEPUTY: 'PHO_CHANH_VAN_PHONG',
    POS_CLUB_DEPARTMENT_MANAGER: 'TRUONG_PHONG',
    POS_CLUB_DEPUTY_DEPARTMENT_MANAGER: 'PHO_TRUONG_PHONG',
    POS_CLUB_BRANCH_LEADER: 'CHU_NHIEM_CHI_NHANH',
    POS_CLUB_BRANCH_DEPUTY: 'PHO_CHU_NHIEM_CHI_NHANH',
    POS_CLUB_BRANCH_STANDING_DEPUTY: 'PHO_CHU_NHIEM_TT_CHI_NHANH',
    POS_CLUB_BRANCH_OFFICE_CHIEF: 'CHANH_VAN_PHONG_CHI_NHANH',
    POS_CLUB_BRANCH_OFFICE_DEPUTY: 'PHO_CHANH_VAN_PHONG_CHI_NHANH',
    POS_CLUB_BRANCH_DEPARTMENT_HEAD: 'TRUONG_BAN_CHI_NHANH',
    POS_CLUB_BRANCH_DEPARTMENT_DEPUTY: 'PHO_TRUONG_BAN_CHI_NHANH',
    POS_CLUB_VOLUNTEER: 'TINH_NGUYEN_VIEN'
  };

  return map[String(positionId || '')] || '';
}

function getPersonHrmData(personId) {
  ensureHrmSheets();

  const activeForPerson = function (row) {
    return String(row.person_id || '') === personId &&
      String(row.trang_thai || '') !== 'DELETED';
  };

  return {
    cccd: stripRowNumber(findOneObject('SENSITIVE_HR', 'PersonCCCD', activeForPerson) || {}),
    documents: findObjects('SENSITIVE_HR', 'PersonDocuments', activeForPerson).map(stripRowNumber),
    contracts: findObjects('SENSITIVE_HR', 'EmployeeContracts', activeForPerson).map(stripRowNumber),
    bank_accounts: findObjects('SENSITIVE_HR', 'EmployeeBankAccounts', activeForPerson).map(stripRowNumber),
    insurance: stripRowNumber(findOneObject('SENSITIVE_HR', 'EmployeeInsurance', activeForPerson) || {}),
    tax: stripRowNumber(findOneObject('SENSITIVE_HR', 'EmployeeTax', activeForPerson) || {}),
    relatives: findObjects('SENSITIVE_HR', 'PersonRelatives', function (row) {
      return String(row.person_id || '') === personId;
    }).map(stripRowNumber)
  };
}

function savePersonHrmHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');
  ensureHrmSheets();

  const body = parseRequestBody(e);
  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const beforePerson = findObjectById('CORE_HR', 'People', personId);

  if (!beforePerson || String(beforePerson.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ cần cập nhật.', 'PERSON_NOT_FOUND');
  }

  const savedPerson = body.person
    ? savePersonBasicInfo(personId, body.person)
    : beforePerson;

  const hrm = body.hrm || {};
  applyDefaultTaxFromCccd(hrm);

  upsertSensitiveSingle('PersonCCCD', 'CCCD', personId, hrm.cccd || {}, [
    'so_cccd_encrypted',
    'ngay_cap',
    'noi_cap',
    'file_id_mat_truoc',
    'file_url_mat_truoc',
    'file_id_mat_sau',
    'file_url_mat_sau'
  ]);

  upsertSensitiveList('PersonDocuments', 'DOC', personId, hrm.documents || [], [
    'doc_type',
    'ten_tai_lieu',
    'so_hieu',
    'ngay_cap',
    'noi_cap',
    'ngay_het_han',
    'file_id',
    'file_url',
    'trang_thai'
  ]);

  upsertSensitiveList('EmployeeContracts', 'CONTRACT', personId, hrm.contracts || [], [
    'membership_id',
    'loai_hop_dong',
    'so_hop_dong',
    'ngay_ky',
    'ngay_hieu_luc',
    'ngay_het_han',
    'muc_luong_encrypted',
    'file_id',
    'file_url',
    'trang_thai'
  ]);

  upsertSensitiveList('EmployeeBankAccounts', 'BANK', personId, hrm.bank_accounts || [], [
    'ten_ngan_hang',
    'chi_nhanh',
    'so_tai_khoan_encrypted',
    'chu_tai_khoan',
    'trang_thai'
  ]);

  upsertSensitiveSingle('EmployeeInsurance', 'INS', personId, hrm.insurance || {}, [
    'so_bhxh_encrypted',
    'muc_dong',
    'ngay_bat_dau',
    'ghi_chu',
    'trang_thai'
  ]);

  upsertSensitiveSingle('EmployeeTax', 'TAX', personId, hrm.tax || {}, [
    'mst_ca_nhan_encrypted',
    'so_nguoi_phu_thuoc',
    'ghi_chu'
  ]);

  upsertSensitiveList('PersonRelatives', 'REL', personId, hrm.relatives || [], [
    'ho_ten',
    'quan_he',
    'sdt',
    'dia_chi',
    'lien_he_khan_cap'
  ]);

  const afterHrm = getPersonHrmData(personId);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'SAVE_PERSON_HRM',
    module: 'PEOPLE',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    after: {
      person: savedPerson,
      hrm: afterHrm
    }
  });

  return ok({
    person: sanitizePerson(savedPerson),
    hrm: afterHrm
  }, 'Đã lưu toàn bộ hồ sơ HRM.');
}

function savePersonBasicInfo(personId, input) {
  const allowedFields = [
    'ma_dinh_danh',
    'ho_ten',
    'ngay_sinh',
    'gioi_tinh',
    'sdt',
    'email',
    'dia_chi_thuong_tru',
    'noi_o_hien_tai',
    'trang_thai'
  ];

  const patch = {};

  allowedFields.forEach(function (field) {
    if (input[field] !== undefined) {
      if (field === 'email') {
        patch[field] = normalizeEmailValue(input[field]);
      } else if (field === 'sdt') {
        patch[field] = normalizePhoneValue(input[field]);
      } else {
        patch[field] = normalizeText(input[field]);
      }
    }
  });

  if (Object.keys(patch).length === 0) {
    return findObjectById('CORE_HR', 'People', personId);
  }

  patch.updated_at = nowIso();
  return updateObjectById('CORE_HR', 'People', personId, patch);
}

function savePersonHrmPayload(personId, hrm) {
  ensureHrmSheets();
  hrm = hrm || {};
  applyDefaultTaxFromCccd(hrm);

  upsertSensitiveSingle('PersonCCCD', 'CCCD', personId, hrm.cccd || {}, [
    'so_cccd_encrypted',
    'ngay_cap',
    'noi_cap',
    'file_id_mat_truoc',
    'file_url_mat_truoc',
    'file_id_mat_sau',
    'file_url_mat_sau'
  ]);

  upsertSensitiveList('PersonDocuments', 'DOC', personId, hrm.documents || [], [
    'doc_type',
    'ten_tai_lieu',
    'so_hieu',
    'ngay_cap',
    'noi_cap',
    'ngay_het_han',
    'file_id',
    'file_url',
    'trang_thai'
  ]);

  upsertSensitiveList('EmployeeContracts', 'CONTRACT', personId, hrm.contracts || [], [
    'membership_id',
    'loai_hop_dong',
    'so_hop_dong',
    'ngay_ky',
    'ngay_hieu_luc',
    'ngay_het_han',
    'muc_luong_encrypted',
    'file_id',
    'file_url',
    'trang_thai'
  ]);

  upsertSensitiveList('EmployeeBankAccounts', 'BANK', personId, hrm.bank_accounts || [], [
    'ten_ngan_hang',
    'chi_nhanh',
    'so_tai_khoan_encrypted',
    'chu_tai_khoan',
    'trang_thai'
  ]);

  upsertSensitiveSingle('EmployeeInsurance', 'INS', personId, hrm.insurance || {}, [
    'so_bhxh_encrypted',
    'muc_dong',
    'ngay_bat_dau',
    'ghi_chu',
    'trang_thai'
  ]);

  upsertSensitiveSingle('EmployeeTax', 'TAX', personId, hrm.tax || {}, [
    'mst_ca_nhan_encrypted',
    'so_nguoi_phu_thuoc',
    'ghi_chu'
  ]);

  upsertSensitiveList('PersonRelatives', 'REL', personId, hrm.relatives || [], [
    'ho_ten',
    'quan_he',
    'sdt',
    'dia_chi',
    'lien_he_khan_cap'
  ]);

  return getPersonHrmData(personId);
}

function applyDefaultTaxFromCccd(hrm) {
  if (!hrm) {
    return hrm;
  }

  const cccd = normalizeCccdValueForPeople(hrm.cccd && hrm.cccd.so_cccd_encrypted);

  if (!cccd) {
    return hrm;
  }

  hrm.tax = hrm.tax || {};

  if (!normalizeText(hrm.tax.mst_ca_nhan_encrypted || '')) {
    hrm.tax.mst_ca_nhan_encrypted = cccd;
  }

  return hrm;
}

function normalizeCccdValueForPeople(value) {
  let cccd = String(value || '').trim();
  cccd = cccd.replace(/\s+/g, '');
  cccd = cccd.replace(/\D/g, '');

  if (/^\d{11}$/.test(cccd)) {
    cccd = '0' + cccd;
  }

  return cccd;
}

function upsertSensitiveSingle(sheetName, idPrefix, personId, data, allowedFields) {
  if (!hasAnyAllowedValue(data, allowedFields)) {
    return null;
  }

  const existing = data.id
    ? findObjectById('SENSITIVE_HR', sheetName, data.id)
    : findOneObject('SENSITIVE_HR', sheetName, function (row) {
      return String(row.person_id || '') === personId &&
        String(row.trang_thai || '') !== 'DELETED';
    });

  const patch = buildAllowedPatch(data, allowedFields);
  patch.person_id = personId;
  patch.updated_at = nowIso();

  if (existing) {
    return updateObjectById('SENSITIVE_HR', sheetName, existing.id, patch);
  }

  patch.id = generateId(idPrefix);
  patch.created_at = nowIso();

  if (allowedFields.indexOf('trang_thai') !== -1 && !patch.trang_thai) {
    patch.trang_thai = 'ACTIVE';
  }

  appendObjectRowWithLock('SENSITIVE_HR', sheetName, patch);
  return patch;
}

function upsertSensitiveList(sheetName, idPrefix, personId, records, allowedFields) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter(function (record) {
      return record && hasAnyAllowedValue(record, allowedFields);
    })
    .map(function (record) {
      const patch = buildAllowedPatch(record, allowedFields);
      patch.person_id = personId;
      patch.updated_at = nowIso();

      if (record.id) {
        const existing = findObjectById('SENSITIVE_HR', sheetName, record.id);

        if (existing) {
          return updateObjectById('SENSITIVE_HR', sheetName, record.id, patch);
        }
      }

      patch.id = generateId(idPrefix);
      patch.created_at = nowIso();

      if (allowedFields.indexOf('trang_thai') !== -1 && !patch.trang_thai) {
        patch.trang_thai = 'ACTIVE';
      }

      appendObjectRowWithLock('SENSITIVE_HR', sheetName, patch);
      return patch;
    });
}

function buildAllowedPatch(input, allowedFields) {
  const patch = {};

  allowedFields.forEach(function (field) {
    if (input && input[field] !== undefined) {
      if (field === 'sdt') {
        patch[field] = normalizePhoneValue(input[field]);
      } else if (field === 'so_cccd_encrypted' || field === 'mst_ca_nhan_encrypted') {
        patch[field] = normalizeCccdValueForPeople(input[field]);
      } else {
        patch[field] = normalizeText(input[field]);
      }
    }
  });

  return patch;
}

function hasAnyAllowedValue(input, allowedFields) {
  if (!input) {
    return false;
  }

  return allowedFields.some(function (field) {
    return input[field] !== undefined && String(input[field] || '').trim() !== '';
  });
}

function stripRowNumber(row) {
  const output = {};

  Object.keys(row || {}).forEach(function (key) {
    if (key !== '__rowNumber') {
      output[key] = row[key];
    }
  });

  return output;
}

function ensureHrmSheets() {
  [
    'PersonCCCD',
    'PersonDocuments',
    'EmployeeContracts',
    'EmployeeBankAccounts',
    'EmployeeInsurance',
    'EmployeeTax',
    'PersonRelatives'
  ].forEach(function (sheetName) {
    ensureSheetWithHeaders(
      'SENSITIVE_HR',
      sheetName,
      SPREADSHEET_STRUCTURE.SENSITIVE_HR[sheetName]
    );
  });
}

function createPersonHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.create');

  const body = parseRequestBody(e);

  const hoTen = normalizeText(requireBodyField(body, 'ho_ten', 'Họ và tên'));
  const email = normalizeEmailValue(body.email || '');
  const sdt = normalizePhoneValue(body.sdt || '');

  const personId = generateId('PERSON');

  const person = {
    id: personId,
    ma_dinh_danh: normalizeText(body.ma_dinh_danh || '') || generatePersonCode(),
    ho_ten: hoTen,
    ngay_sinh: normalizeText(body.ngay_sinh || ''),
    gioi_tinh: normalizeText(body.gioi_tinh || ''),
    sdt: sdt,
    email: email,
    dia_chi_thuong_tru: normalizeText(body.dia_chi_thuong_tru || ''),
    noi_o_hien_tai: normalizeText(body.noi_o_hien_tai || ''),
    anh_dai_dien_file_id: '',
    anh_dai_dien_url: '',
    trang_thai: normalizeText(body.trang_thai || 'ACTIVE'),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('CORE_HR', 'People', person);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_PERSON',
    module: 'PEOPLE',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    after: person
  });

  return ok({
    person: sanitizePerson(person)
  }, 'Tạo hồ sơ thành công.');
}

function updatePersonHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);
  const personId = normalizeText(requireBodyField(body, 'id', 'ID hồ sơ'));

  const before = findObjectById('CORE_HR', 'People', personId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ cần cập nhật.', 'PERSON_NOT_FOUND');
  }

  const allowedFields = [
    'ma_dinh_danh',
    'ho_ten',
    'ngay_sinh',
    'gioi_tinh',
    'sdt',
    'email',
    'dia_chi_thuong_tru',
    'noi_o_hien_tai',
    'trang_thai'
  ];

  const patch = {};

  allowedFields.forEach(function (field) {
    if (body[field] !== undefined) {
      if (field === 'email') {
        patch[field] = normalizeEmailValue(body[field]);
      } else if (field === 'sdt') {
        patch[field] = normalizePhoneValue(body[field]);
      } else {
        patch[field] = normalizeText(body[field]);
      }
    }
  });

  patch.updated_at = nowIso();

  const after = updateObjectById('CORE_HR', 'People', personId, patch);
  const afterHrm = body.hrm ? savePersonHrmPayload(personId, body.hrm) : null;

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_PERSON',
    module: 'PEOPLE',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    before: before,
    after: afterHrm
      ? {
        person: after,
        hrm: afterHrm
      }
      : after
  });

  const responseData = {
    person: sanitizePerson(after)
  };

  if (afterHrm) {
    responseData.hrm = afterHrm;
  }

  return ok(responseData, 'Cập nhật hồ sơ thành công.');
}

function deletePersonHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.delete');

  const body = parseRequestBody(e);
  const personId = normalizeText(requireBodyField(body, 'id', 'ID hồ sơ'));

  const before = findObjectById('CORE_HR', 'People', personId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ cần xóa.', 'PERSON_NOT_FOUND');
  }

  const after = updateObjectById('CORE_HR', 'People', personId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_PERSON',
    module: 'PEOPLE',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    before: before,
    after: after
  });

  return ok({
    person: sanitizePerson(after),
    deleted_id: personId
  }, 'Đã xóa hồ sơ.');
}

function sanitizePerson(person) {
  if (!person) {
    return null;
  }

  return {
    id: person.id,
    ma_dinh_danh: person.ma_dinh_danh,
    ho_ten: person.ho_ten,
    ngay_sinh: person.ngay_sinh,
    gioi_tinh: person.gioi_tinh,
    sdt: person.sdt,
    email: person.email,
    dia_chi_thuong_tru: person.dia_chi_thuong_tru,
    noi_o_hien_tai: person.noi_o_hien_tai,
    anh_dai_dien_file_id: person.anh_dai_dien_file_id,
    anh_dai_dien_url: person.anh_dai_dien_url,
    trang_thai: person.trang_thai,
    created_at: person.created_at,
    updated_at: person.updated_at
  };
}
