function makePasswordSalt() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function hashPassword(password, salt) {
  return hashText(String(salt || '') + '::' + String(password || ''));
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = hashPassword(password, salt);
  return String(actualHash) === String(expectedHash);
}

function makeRawToken() {
  return Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
}

function hashToken(rawToken) {
  return hashText(String(rawToken || ''));
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function getClientMeta(e) {
  return {
    ip: '',
    user_agent: e && e.parameter && e.parameter.user_agent
      ? String(e.parameter.user_agent)
      : ''
  };
}

function getTokenFromRequest(e) {
  const body = parseRequestBody(e);

  if (body.token) {
    return String(body.token);
  }

  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token);
  }

  return '';
}

function createSessionForUser(user, e) {
  const rawToken = makeRawToken();
  const tokenHash = hashToken(rawToken);

  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 ngày

  const meta = getClientMeta(e);

  const session = {
    id: generateId('SESS'),
    user_id: user.id,
    token_hash: tokenHash,
    refresh_token_hash: '',
    ip: meta.ip,
    user_agent: meta.user_agent,
    created_at: nowIso(),
    expires_at: Utilities.formatDate(
      expires,
      getRequiredConfig('TIMEZONE'),
      "yyyy-MM-dd'T'HH:mm:ss"
    ),
    revoked_at: '',
    trang_thai: 'ACTIVE'
  };

  appendObjectRowWithLock('SYSTEM', 'Sessions', session);

  return {
    token: rawToken,
    expires_at: session.expires_at
  };
}

function findActiveSessionByToken(rawToken) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const nowTime = new Date().getTime();

  return findOneObject('SYSTEM', 'Sessions', function (session) {
    if (String(session.token_hash || '') !== tokenHash) {
      return false;
    }

    if (String(session.trang_thai || '') !== 'ACTIVE') {
      return false;
    }

    if (session.revoked_at) {
      return false;
    }

    const expiresAt = new Date(session.expires_at).getTime();

    if (Number.isFinite(expiresAt) && expiresAt < nowTime) {
      return false;
    }

    return true;
  });
}

function verifySession(rawToken) {
  const session = findActiveSessionByToken(rawToken);

  if (!session) {
    return null;
  }

  const user = findObjectById('CORE_HR', 'UserAccounts', session.user_id);

  if (!user) {
    return null;
  }

  if (String(user.trang_thai || '') !== 'ACTIVE') {
    return null;
  }

  const person = user.person_id
    ? findObjectById('CORE_HR', 'People', user.person_id)
    : null;

  return {
    id: user.id,
    person_id: user.person_id,
    username: user.username,
    email_dang_nhap: user.email_dang_nhap,
    trang_thai: user.trang_thai,
    require_password_change: user.require_password_change,
    two_factor_enabled: user.two_factor_enabled,
    person: person,
    session: session
  };
}

function requireAuth(e) {
  const token = getTokenFromRequest(e);
  const user = verifySession(token);

  if (!user) {
    throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  return user;
}

function loginHandler(e) {
  const body = parseRequestBody(e);

  const usernameOrEmail = normalizeText(body.username || body.email || body.email_dang_nhap);
  const password = String(body.password || '');

  if (!usernameOrEmail || !password) {
    return fail('Vui lòng nhập tài khoản và mật khẩu.', 'AUTH_MISSING_CREDENTIALS');
  }

  const user = findOneObject('CORE_HR', 'UserAccounts', function (row) {
    const username = String(row.username || '').toLowerCase();
    const email = String(row.email_dang_nhap || '').toLowerCase();
    const input = usernameOrEmail.toLowerCase();

    return username === input || email === input;
  });

  if (!user) {
    return fail('Tài khoản hoặc mật khẩu không đúng.', 'AUTH_INVALID');
  }

  if (String(user.trang_thai || '') !== 'ACTIVE') {
    return fail('Tài khoản đang bị khóa hoặc không hoạt động.', 'AUTH_INACTIVE');
  }

  const valid = verifyPassword(
    password,
    user.password_salt,
    user.password_hash
  );

  if (!valid) {
    writeAuditLog({
      user_id: user.id || 'UNKNOWN',
      hanh_dong: 'LOGIN_FAILED',
      module: 'AUTH',
      doi_tuong_type: 'USER',
      doi_tuong_id: user.id || '',
      after: {
        username: usernameOrEmail,
        reason: 'INVALID_PASSWORD'
      }
    });

    return fail('Tài khoản hoặc mật khẩu không đúng.', 'AUTH_INVALID');
  }

  const sessionData = createSessionForUser(user, e);

  updateObjectById('CORE_HR', 'UserAccounts', user.id, {
    last_login_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'LOGIN_SUCCESS',
    module: 'AUTH',
    doi_tuong_type: 'USER',
    doi_tuong_id: user.id,
    after: {
      username: user.username,
      email: user.email_dang_nhap
    }
  });

  const fullUser = verifySession(sessionData.token);

  return ok({
    token: sessionData.token,
    expires_at: sessionData.expires_at,
    user: sanitizeUser(fullUser)
  }, 'Đăng nhập thành công.');
}

function logoutHandler(e) {
  const token = getTokenFromRequest(e);

  if (!token) {
    return ok(null, 'Đã đăng xuất.');
  }

  const session = findActiveSessionByToken(token);

  if (session) {
    updateObjectByRowNumber('SYSTEM', 'Sessions', session.__rowNumber, {
      revoked_at: nowIso(),
      trang_thai: 'REVOKED'
    });

    writeAuditLog({
      user_id: session.user_id,
      hanh_dong: 'LOGOUT',
      module: 'AUTH',
      doi_tuong_type: 'SESSION',
      doi_tuong_id: session.id
    });
  }

  return ok(null, 'Đã đăng xuất.');
}

function meHandler(e) {
  const user = requireAuth(e);

  return ok({
    user: sanitizeUser(user),
    roles: getUserRoleAssignments(user.id),
    permissions: getUserPermissions(user.id)
  }, 'Lấy thông tin người dùng thành công.');
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    person_id: user.person_id,
    username: user.username,
    email_dang_nhap: user.email_dang_nhap,
    trang_thai: user.trang_thai,
    require_password_change: user.require_password_change,
    two_factor_enabled: user.two_factor_enabled,
    person: user.person ? {
      id: user.person.id,
      ma_dinh_danh: user.person.ma_dinh_danh,
      ho_ten: user.person.ho_ten,
      email: user.person.email,
      sdt: user.person.sdt,
      trang_thai: user.person.trang_thai
    } : null
  };
}