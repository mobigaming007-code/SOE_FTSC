function listMembershipsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.view');

  const personId = normalizeText(getRequestParam(e, 'person_id', ''));
  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));

  let memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  if (personId) {
    memberships = memberships.filter(function (row) {
      return String(row.person_id || '') === personId;
    });
  }

  if (orgUnitId) {
    memberships = memberships.filter(function (row) {
      return String(row.org_unit_id || '') === orgUnitId;
    });
  }

  return ok({
    total: memberships.length,
    items: memberships
  }, 'Lấy danh sách quan hệ tổ chức thành công.');
}

function createMembershipHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const orgType = normalizeText(requireBodyField(body, 'org_type', 'Loại tổ chức'));
  const orgUnitId = normalizeText(requireBodyField(body, 'org_unit_id', 'Đơn vị'));
  const positionId = normalizeText(body.position_id || '');
  const loaiQuanHe = normalizeText(body.loai_quan_he || 'MEMBER');

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ.', 'PERSON_NOT_FOUND');
  }

  const orgUnit = findObjectById('CORE_HR', 'OrgUnits', orgUnitId);

  if (!orgUnit || String(orgUnit.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy đơn vị tổ chức.', 'ORG_UNIT_NOT_FOUND');
  }

  if (positionId) {
    const position = findObjectById('CORE_HR', 'Positions', positionId);

    if (!position || String(position.trang_thai || '') === 'DELETED') {
      return fail('Không tìm thấy chức danh.', 'POSITION_NOT_FOUND');
    }
  }

  const membershipId = generateId('MEM');

  const membership = {
    id: membershipId,
    person_id: personId,
    org_type: orgType,
    org_unit_id: orgUnitId,
    position_id: positionId,
    loai_quan_he: loaiQuanHe,
    ngay_bat_dau: normalizeText(body.ngay_bat_dau || todayDate()),
    ngay_ket_thuc: normalizeText(body.ngay_ket_thuc || ''),
    trang_thai: normalizeText(body.trang_thai || 'ACTIVE'),
    ghi_chu: normalizeText(body.ghi_chu || ''),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('CORE_HR', 'PersonOrgMemberships', membership);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_MEMBERSHIP',
    module: 'PEOPLE',
    doi_tuong_type: 'MEMBERSHIP',
    doi_tuong_id: membershipId,
    after: membership
  });

  return ok({
    membership: membership
  }, 'Thêm quan hệ tổ chức thành công.');
}

function updateMembershipHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);
  const membershipId = normalizeText(requireBodyField(body, 'id', 'ID quan hệ tổ chức'));

  const before = findObjectById('CORE_HR', 'PersonOrgMemberships', membershipId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy quan hệ tổ chức.', 'MEMBERSHIP_NOT_FOUND');
  }

  const allowedFields = [
    'org_type',
    'org_unit_id',
    'position_id',
    'loai_quan_he',
    'ngay_bat_dau',
    'ngay_ket_thuc',
    'trang_thai',
    'ghi_chu'
  ];

  const patch = {};

  allowedFields.forEach(function (field) {
    if (body[field] !== undefined) {
      patch[field] = normalizeText(body[field]);
    }
  });

  patch.updated_at = nowIso();

  const after = updateObjectById('CORE_HR', 'PersonOrgMemberships', membershipId, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_MEMBERSHIP',
    module: 'PEOPLE',
    doi_tuong_type: 'MEMBERSHIP',
    doi_tuong_id: membershipId,
    before: before,
    after: after
  });

  return ok({
    membership: after
  }, 'Cập nhật quan hệ tổ chức thành công.');
}

function deleteMembershipHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);
  const membershipId = normalizeText(requireBodyField(body, 'id', 'ID quan hệ tổ chức'));

  const before = findObjectById('CORE_HR', 'PersonOrgMemberships', membershipId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy quan hệ tổ chức.', 'MEMBERSHIP_NOT_FOUND');
  }

  const after = updateObjectById('CORE_HR', 'PersonOrgMemberships', membershipId, {
    trang_thai: 'DELETED',
    ngay_ket_thuc: body.ngay_ket_thuc || todayDate(),
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_MEMBERSHIP',
    module: 'PEOPLE',
    doi_tuong_type: 'MEMBERSHIP',
    doi_tuong_id: membershipId,
    before: before,
    after: after
  });

  return ok({
    membership: after,
    deleted_id: membershipId
  }, 'Đã xóa quan hệ tổ chức.');
}
