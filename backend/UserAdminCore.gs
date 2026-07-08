function listUsersHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'admin.manage_users');

  const keyword = normalizeText(getRequestParam(e, 'q', '')).toLowerCase();

  let accounts = readAllObjects('CORE_HR', 'UserAccounts')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  if (keyword) {
    accounts = accounts.filter(function (account) {
      const text = [
        account.username,
        account.email_dang_nhap,
        account.person_id
      ].join(' ').toLowerCase();

      return text.indexOf(keyword) !== -1;
    });
  }

  const items = accounts.map(function (account) {
    const roles = getUserRoleAssignments(account.id);
    const person = account.person_id
      ? findObjectById('CORE_HR', 'People', account.person_id)
      : null;

    const sanitized = sanitizeUserAccount(account);
    sanitized.person = sanitizePerson(person);
    sanitized.roles = roles;

    return sanitized;
  });

  return ok({
    total: items.length,
    items: items
  }, 'Lấy danh sách tài khoản thành công.');
}

function createUserAccountHandler(e) {
  const currentUser = requireAuth(e);
  requirePermission(currentUser, 'admin.manage_users');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const emailLogin = normalizeEmailValue(requireBodyField(body, 'email_dang_nhap', 'Email đăng nhập'));
  const username = normalizeText(body.username || emailLogin);

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ để tạo tài khoản.', 'PERSON_NOT_FOUND');
  }

  const duplicated = findOneObject('CORE_HR', 'UserAccounts', function (row) {
    const rowUsername = String(row.username || '').toLowerCase();
    const rowEmail = String(row.email_dang_nhap || '').toLowerCase();

    return rowUsername === username.toLowerCase() ||
      rowEmail === emailLogin.toLowerCase();
  });

  if (duplicated) {
    return fail('Username hoặc email đăng nhập đã tồn tại.', 'USER_DUPLICATED');
  }

  const userId = generateId('USER');
  const rawPassword = body.password
    ? String(body.password)
    : generateTempPassword();

  const salt = makePasswordSalt();
  const passwordHash = hashPassword(rawPassword, salt);

  const account = {
    id: userId,
    person_id: personId,
    username: username,
    email_dang_nhap: emailLogin,
    password_hash: passwordHash,
    password_salt: salt,
    require_password_change: 'TRUE',
    two_factor_enabled: 'FALSE',
    trang_thai: 'ACTIVE',
    last_login_at: '',
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('CORE_HR', 'UserAccounts', account);

  if (body.role_code) {
    createRoleAssignmentInternal({
      user_id: userId,
      role_code: normalizeText(body.role_code),
      org_unit_id: normalizeText(body.org_unit_id || ''),
      scope_type: normalizeText(body.scope_type || 'SELF')
    });
  }

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'CREATE_USER_ACCOUNT',
    module: 'ADMIN',
    doi_tuong_type: 'USER',
    doi_tuong_id: userId,
    after: {
      id: userId,
      username: username,
      email_dang_nhap: emailLogin
    }
  });

  return ok({
    user: sanitizeUserAccount(account),
    temporary_password: rawPassword
  }, 'Tạo tài khoản thành công. Mật khẩu tạm chỉ hiển thị một lần.');
}

function updateUserStatusHandler(e) {
  const currentUser = requireAuth(e);
  requirePermission(currentUser, 'admin.manage_users');

  const body = parseRequestBody(e);

  const userId = normalizeText(requireBodyField(body, 'user_id', 'ID tài khoản'));
  const status = normalizeText(requireBodyField(body, 'trang_thai', 'Trạng thái'));

  const before = findObjectById('CORE_HR', 'UserAccounts', userId);

  if (!before) {
    return fail('Không tìm thấy tài khoản.', 'USER_NOT_FOUND');
  }

  const after = updateObjectById('CORE_HR', 'UserAccounts', userId, {
    trang_thai: status,
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'UPDATE_USER_STATUS',
    module: 'ADMIN',
    doi_tuong_type: 'USER',
    doi_tuong_id: userId,
    before: sanitizeUserAccount(before),
    after: sanitizeUserAccount(after)
  });

  return ok({
    user: sanitizeUserAccount(after)
  }, 'Cập nhật trạng thái tài khoản thành công.');
}

function resetUserPasswordHandler(e) {
  const currentUser = requireAuth(e);
  requirePermission(currentUser, 'admin.manage_users');

  const body = parseRequestBody(e);

  const userId = normalizeText(requireBodyField(body, 'user_id', 'ID tài khoản'));
  const account = findObjectById('CORE_HR', 'UserAccounts', userId);

  if (!account || String(account.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy tài khoản.', 'USER_NOT_FOUND');
  }

  const newPassword = body.new_password
    ? String(body.new_password)
    : generateTempPassword();

  const salt = makePasswordSalt();
  const passwordHash = hashPassword(newPassword, salt);

  const after = updateObjectById('CORE_HR', 'UserAccounts', userId, {
    password_hash: passwordHash,
    password_salt: salt,
    require_password_change: 'TRUE',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'RESET_USER_PASSWORD',
    module: 'ADMIN',
    doi_tuong_type: 'USER',
    doi_tuong_id: userId,
    after: {
      require_password_change: 'TRUE'
    }
  });

  return ok({
    user: sanitizeUserAccount(after),
    user_id: userId,
    temporary_password: newPassword
  }, 'Đặt lại mật khẩu thành công. Mật khẩu tạm chỉ hiển thị một lần.');
}

function changeMyPasswordHandler(e) {
  const currentUser = requireAuth(e);

  const body = parseRequestBody(e);

  const oldPassword = String(requireBodyField(body, 'old_password', 'Mật khẩu cũ'));
  const newPassword = String(requireBodyField(body, 'new_password', 'Mật khẩu mới'));

  if (newPassword.length < 8) {
    return fail('Mật khẩu mới phải có ít nhất 8 ký tự.', 'PASSWORD_TOO_SHORT');
  }

  const account = findObjectById('CORE_HR', 'UserAccounts', currentUser.id);

  if (!account) {
    return fail('Không tìm thấy tài khoản.', 'USER_NOT_FOUND');
  }

  const valid = verifyPassword(
    oldPassword,
    account.password_salt,
    account.password_hash
  );

  if (!valid) {
    return fail('Mật khẩu cũ không đúng.', 'INVALID_OLD_PASSWORD');
  }

  const salt = makePasswordSalt();
  const passwordHash = hashPassword(newPassword, salt);

  const after = updateObjectById('CORE_HR', 'UserAccounts', currentUser.id, {
    password_hash: passwordHash,
    password_salt: salt,
    require_password_change: 'FALSE',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'CHANGE_MY_PASSWORD',
    module: 'AUTH',
    doi_tuong_type: 'USER',
    doi_tuong_id: currentUser.id
  });

  return ok({
    user: sanitizeUserAccount(after)
  }, 'Đổi mật khẩu thành công.');
}

function assignUserRoleHandler(e) {
  const currentUser = requireAuth(e);
  requirePermission(currentUser, 'admin.manage_users');

  const body = parseRequestBody(e);

  const assignment = createRoleAssignmentInternal({
    user_id: normalizeText(requireBodyField(body, 'user_id', 'ID tài khoản')),
    role_code: normalizeText(requireBodyField(body, 'role_code', 'Vai trò')),
    org_unit_id: normalizeText(body.org_unit_id || ''),
    scope_type: normalizeText(body.scope_type || 'SELF')
  });

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'ASSIGN_USER_ROLE',
    module: 'ADMIN',
    doi_tuong_type: 'USER_ROLE_ASSIGNMENT',
    doi_tuong_id: assignment.id,
    after: assignment
  });

  return ok({
    assignment: assignment
  }, 'Gán vai trò thành công.');
}

function revokeUserRoleHandler(e) {
  const currentUser = requireAuth(e);
  requirePermission(currentUser, 'admin.manage_users');

  const body = parseRequestBody(e);
  const assignmentId = normalizeText(requireBodyField(body, 'assignment_id', 'ID phân quyền'));

  const before = findObjectById('CORE_HR', 'UserRoleAssignments', assignmentId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy phân quyền.', 'ROLE_ASSIGNMENT_NOT_FOUND');
  }

  const after = updateObjectById('CORE_HR', 'UserRoleAssignments', assignmentId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: currentUser.id,
    hanh_dong: 'REVOKE_USER_ROLE',
    module: 'ADMIN',
    doi_tuong_type: 'USER_ROLE_ASSIGNMENT',
    doi_tuong_id: assignmentId,
    before: before,
    after: after
  });

  return ok({
    assignment: after,
    deleted_id: assignmentId
  }, 'Đã thu hồi vai trò.');
}

function createRoleAssignmentInternal(params) {
  const userId = normalizeText(params.user_id);
  const roleCode = normalizeText(params.role_code);
  const orgUnitId = normalizeText(params.org_unit_id || '');
  const scopeType = normalizeText(params.scope_type || 'SELF');

  const account = findObjectById('CORE_HR', 'UserAccounts', userId);

  if (!account || String(account.trang_thai || '') === 'DELETED') {
    throw new Error('Không tìm thấy tài khoản để gán quyền.');
  }

  const role = findOneObject('CORE_HR', 'Roles', function (row) {
    return String(row.role_code || '') === roleCode &&
      String(row.trang_thai || '') === 'ACTIVE';
  });

  if (!role) {
    throw new Error('Vai trò không hợp lệ: ' + roleCode);
  }

  if (orgUnitId) {
    const orgUnit = findObjectById('CORE_HR', 'OrgUnits', orgUnitId);

    if (!orgUnit || String(orgUnit.trang_thai || '') === 'DELETED') {
      throw new Error('Đơn vị phân quyền không tồn tại.');
    }
  }

  const duplicated = findOneObject('CORE_HR', 'UserRoleAssignments', function (row) {
    return String(row.user_id || '') === userId &&
      String(row.role_code || '') === roleCode &&
      String(row.org_unit_id || '') === orgUnitId &&
      String(row.scope_type || '') === scopeType &&
      String(row.trang_thai || '') === 'ACTIVE';
  });

  if (duplicated) {
    return duplicated;
  }

  const assignment = {
    id: generateId('URA'),
    user_id: userId,
    role_code: roleCode,
    org_unit_id: orgUnitId,
    scope_type: scopeType,
    trang_thai: 'ACTIVE',
    created_at: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('CORE_HR', 'UserRoleAssignments', assignment);

  return assignment;
}

function sanitizeUserAccount(account) {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    person_id: account.person_id,
    username: account.username,
    email_dang_nhap: account.email_dang_nhap,
    require_password_change: account.require_password_change,
    two_factor_enabled: account.two_factor_enabled,
    trang_thai: account.trang_thai,
    last_login_at: account.last_login_at,
    created_at: account.created_at,
    updated_at: account.updated_at
  };
}
