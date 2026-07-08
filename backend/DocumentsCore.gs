const DOCUMENTS_STRUCTURE_PHASE6 = {
  Documents: [
    'id',
    'ma_van_ban',
    'ten_van_ban',
    'loai_van_ban',
    'org_unit_id',
    'muc_do_bao_mat',
    'trang_thai',
    'nguoi_tao',
    'ngay_tao',
    'updated_at'
  ],

  DocumentVersions: [
    'id',
    'document_id',
    'so_phien_ban',
    'file_id',
    'file_url',
    'nguoi_upload',
    'ghi_chu_thay_doi',
    'ngay_upload'
  ],

  DocumentPermissions: [
    'id',
    'document_id',
    'doi_tuong_type',
    'doi_tuong_id',
    'loai_quyen',
    'created_at',
    'updated_at'
  ],

  DocumentViewLogs: [
    'id',
    'document_id',
    'user_id',
    'hanh_dong',
    'ip',
    'user_agent',
    'thoi_gian'
  ],

  DocumentEmailLogs: [
    'id',
    'document_id',
    'nguoi_gui',
    'danh_sach_nhan',
    'subject',
    'trang_thai_gui',
    'loi_gui',
    'thoi_gian_gui'
  ]
};

function setupPhase6() {
  Object.keys(DOCUMENTS_STRUCTURE_PHASE6).forEach(function (sheetName) {
    ensureSheetWithHeaders('DOCUMENTS', sheetName, DOCUMENTS_STRUCTURE_PHASE6[sheetName]);
    Logger.log('Đã kiểm tra/tạo sheet: DOCUMENTS / ' + sheetName);
  });

  seedDocumentSystemConfig();

  writeAuditLog({
    user_id: 'SYSTEM',
    hanh_dong: 'SETUP_PHASE_6',
    module: 'DOCUMENTS',
    doi_tuong_type: 'PHASE',
    doi_tuong_id: 'PHASE_6',
    after: {
      message: 'Hoàn tất setup Giai đoạn 6: Quản lý văn bản'
    }
  });

  Logger.log('Hoàn tất setup Giai đoạn 6.');
}

function seedDocumentSystemConfig() {
  const configs = [
    {
      key: 'DOCUMENT_DEFAULT_SECURITY_LEVEL',
      value: 'INTERNAL',
      value_type: 'STRING',
      group: 'DOCUMENTS',
      description: 'Mức độ bảo mật mặc định của văn bản',
      is_secret: 'FALSE',
      updated_at: nowIso(),
      updated_by: 'SYSTEM'
    },
    {
      key: 'DOCUMENT_MAX_UPLOAD_MB',
      value: '20',
      value_type: 'NUMBER',
      group: 'DOCUMENTS',
      description: 'Dung lượng upload văn bản tối đa tính theo MB',
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

function createDocumentHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.create');

  const body = parseRequestBody(e);

  const tenVanBan = normalizeText(requireBodyField(body, 'ten_van_ban', 'Tên văn bản'));
  const loaiVanBan = normalizeText(requireBodyField(body, 'loai_van_ban', 'Loại văn bản'));
  const orgUnitId = normalizeText(body.org_unit_id || '');
  const mucDoBaoMat = normalizeText(
    body.muc_do_bao_mat || getSystemConfigValue('DOCUMENT_DEFAULT_SECURITY_LEVEL', 'INTERNAL')
  );

  const documentId = generateId('DOC');

  const documentRow = {
    id: documentId,
    ma_van_ban: normalizeText(body.ma_van_ban || generateDocumentCode(loaiVanBan)),
    ten_van_ban: tenVanBan,
    loai_van_ban: loaiVanBan,
    org_unit_id: orgUnitId,
    muc_do_bao_mat: mucDoBaoMat,
    trang_thai: normalizeText(body.trang_thai || 'DRAFT'),
    nguoi_tao: user.id,
    ngay_tao: nowIso(),
    updated_at: nowIso()
  };

  appendObjectRowWithLock('DOCUMENTS', 'Documents', documentRow);

  // Người tạo mặc định là OWNER.
  appendObjectRowWithLock('DOCUMENTS', 'DocumentPermissions', {
    id: generateId('DPERM'),
    document_id: documentId,
    doi_tuong_type: 'USER',
    doi_tuong_id: user.id,
    loai_quyen: 'OWNER',
    created_at: nowIso(),
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'CREATE_DOCUMENT',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT',
    doi_tuong_id: documentId,
    after: documentRow
  });

  return ok({
    document: documentRow
  }, 'Tạo hồ sơ văn bản thành công.');
}

function listDocumentsHandler(e) {
  const user = requireAuth(e);

  return listDocumentsForUser(e, user, {});
}

function listEmployeeDocumentsHandler(e) {
  const user = requireAuth(e);

  return listDocumentsForUser(e, user, {
    status: 'PUBLISHED',
    securityLevel: 'PUBLIC'
  });
}

function listDocumentsForUser(e, user, options) {
  options = options || {};
  const keyword = normalizeText(getRequestParam(e, 'q', '')).toLowerCase();
  const loaiVanBan = normalizeText(getRequestParam(e, 'loai_van_ban', ''));
  const orgUnitId = normalizeText(getRequestParam(e, 'org_unit_id', ''));
  const status = normalizeText(options.status || getRequestParam(e, 'trang_thai', ''));
  const securityLevel = normalizeText(options.securityLevel || getRequestParam(e, 'muc_do_bao_mat', ''));

  let documents = readAllObjects('DOCUMENTS', 'Documents')
    .filter(function (doc) {
      return String(doc.trang_thai || '') !== 'DELETED';
    });

  if (keyword) {
    documents = documents.filter(function (doc) {
      const text = [
        doc.ma_van_ban,
        doc.ten_van_ban,
        doc.loai_van_ban
      ].join(' ').toLowerCase();

      return text.indexOf(keyword) !== -1;
    });
  }

  if (loaiVanBan) {
    documents = documents.filter(function (doc) {
      return String(doc.loai_van_ban || '') === loaiVanBan;
    });
  }

  if (orgUnitId) {
    documents = documents.filter(function (doc) {
      return String(doc.org_unit_id || '') === orgUnitId;
    });
  }

  if (status) {
    documents = documents.filter(function (doc) {
      return String(doc.trang_thai || '') === status;
    });
  }

  if (securityLevel) {
    documents = documents.filter(function (doc) {
      return String(doc.muc_do_bao_mat || '') === securityLevel;
    });
  }

  documents = documents.filter(function (doc) {
    return canUserAccessDocument(user, doc, 'VIEW');
  });

  const latestVersionMap = getLatestDocumentVersionMap();

  const items = documents.map(function (doc) {
    const latest = latestVersionMap[String(doc.id || '')] || null;

    return {
      id: doc.id,
      ma_van_ban: doc.ma_van_ban,
      ten_van_ban: doc.ten_van_ban,
      loai_van_ban: doc.loai_van_ban,
      org_unit_id: doc.org_unit_id,
      muc_do_bao_mat: doc.muc_do_bao_mat,
      trang_thai: doc.trang_thai,
      nguoi_tao: doc.nguoi_tao,
      ngay_tao: doc.ngay_tao,
      updated_at: doc.updated_at,
      latest_version: latest
    };
  });

  items.sort(function (a, b) {
    return String(b.updated_at || b.ngay_tao || '').localeCompare(String(a.updated_at || a.ngay_tao || ''));
  });

  return ok({
    total: items.length,
    items: items
  }, 'Lấy danh sách văn bản thành công.');
}

function getDocumentDetailHandler(e) {
  const user = requireAuth(e);

  const documentId = normalizeText(getRequestParam(e, 'id', ''));

  if (!documentId) {
    return fail('Thiếu id văn bản.', 'MISSING_DOCUMENT_ID');
  }

  const documentRow = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!documentRow || String(documentRow.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, documentRow, 'VIEW')) {
    return fail('Bạn không có quyền xem văn bản này.', 'DOCUMENT_ACCESS_DENIED');
  }

  writeDocumentViewLog(e, user, documentId, 'VIEW');

  const versions = findObjects('DOCUMENTS', 'DocumentVersions', function (row) {
    return String(row.document_id || '') === documentId;
  }).sort(function (a, b) {
    return Number(b.so_phien_ban || 0) - Number(a.so_phien_ban || 0);
  });

  const permissions = findObjects('DOCUMENTS', 'DocumentPermissions', function (row) {
    return String(row.document_id || '') === documentId;
  });

  return ok({
    document: documentRow,
    versions: versions,
    permissions: permissions
  }, 'Lấy chi tiết văn bản thành công.');
}

function updateDocumentHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);
  const documentId = normalizeText(requireBodyField(body, 'id', 'ID văn bản'));

  const before = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, before, 'EDIT')) {
    return fail('Bạn không có quyền sửa văn bản này.', 'DOCUMENT_EDIT_DENIED');
  }

  const allowedFields = [
    'ma_van_ban',
    'ten_van_ban',
    'loai_van_ban',
    'org_unit_id',
    'muc_do_bao_mat',
    'trang_thai'
  ];

  const patch = {};

  allowedFields.forEach(function (field) {
    if (body[field] !== undefined) {
      patch[field] = normalizeText(body[field]);
    }
  });

  patch.updated_at = nowIso();

  const after = updateObjectById('DOCUMENTS', 'Documents', documentId, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPDATE_DOCUMENT',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT',
    doi_tuong_id: documentId,
    before: before,
    after: after
  });

  return ok({
    document: after
  }, 'Cập nhật văn bản thành công.');
}

function deleteDocumentHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);
  const documentId = normalizeText(requireBodyField(body, 'id', 'ID văn bản'));

  const before = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!before || String(before.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, before, 'OWNER')) {
    return fail('Chỉ chủ sở hữu hoặc người có quyền quản trị mới được xóa văn bản.', 'DOCUMENT_DELETE_DENIED');
  }

  const after = updateObjectById('DOCUMENTS', 'Documents', documentId, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'DELETE_DOCUMENT',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT',
    doi_tuong_id: documentId,
    before: before,
    after: after
  });

  return ok({
    document: after,
    deleted_id: documentId
  }, 'Đã xóa văn bản.');
}

function uploadDocumentVersionHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);

  const documentId = normalizeText(requireBodyField(body, 'document_id', 'ID văn bản'));
  const fileName = normalizeText(requireBodyField(body, 'file_name', 'Tên file'));
  const mimeType = normalizeText(body.mime_type || 'application/octet-stream');
  let base64Data = String(requireBodyField(body, 'base64_data', 'Dữ liệu file base64'));

  const documentRow = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!documentRow || String(documentRow.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, documentRow, 'EDIT')) {
    return fail('Bạn không có quyền upload phiên bản cho văn bản này.', 'DOCUMENT_UPLOAD_DENIED');
  }

  if (base64Data.indexOf(',') !== -1) {
    base64Data = base64Data.split(',').pop();
  }

  const bytes = Utilities.base64Decode(base64Data);

  const maxUploadMb = toNumber(getSystemConfigValue('DOCUMENT_MAX_UPLOAD_MB', '20'), 20);
  const maxBytes = maxUploadMb * 1024 * 1024;

  if (bytes.length > maxBytes) {
    return fail('File vượt quá dung lượng cho phép: ' + maxUploadMb + 'MB.', 'DOCUMENT_FILE_TOO_LARGE');
  }

  const folder = getDocumentFolderByType(documentRow.loai_van_ban);
  const safeFileName = documentId + '_v' + getNextDocumentVersionNumber(documentId) + '_' + fileName;
  const blob = Utilities.newBlob(bytes, mimeType, safeFileName);
  const file = folder.createFile(blob);

  const versionNumber = getNextDocumentVersionNumber(documentId);

  const version = {
    id: generateId('DVER'),
    document_id: documentId,
    so_phien_ban: versionNumber,
    file_id: file.getId(),
    file_url: file.getUrl(),
    nguoi_upload: user.id,
    ghi_chu_thay_doi: normalizeText(body.ghi_chu_thay_doi || ''),
    ngay_upload: nowIso()
  };

  appendObjectRowWithLock('DOCUMENTS', 'DocumentVersions', version);

  const updatedDocument = updateObjectById('DOCUMENTS', 'Documents', documentId, {
    updated_at: nowIso(),
    trang_thai: String(documentRow.trang_thai || '') === 'DRAFT' ? 'PUBLISHED' : documentRow.trang_thai
  });

  appendObjectRowWithLock('SYSTEM', 'FileRegistry', {
    id: generateId('FILE'),
    owner_type: 'DOCUMENT',
    owner_id: documentId,
    module: 'DOCUMENTS',
    file_type: 'DOCUMENT_VERSION',
    file_id: file.getId(),
    file_url: file.getUrl(),
    folder_id: folder.getId(),
    mime_type: mimeType,
    size_bytes: bytes.length,
    uploaded_by: user.id,
    created_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPLOAD_DOCUMENT_VERSION',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT_VERSION',
    doi_tuong_id: version.id,
    after: version
  });

  return ok({
    version: version,
    document: updatedDocument
  }, 'Upload phiên bản văn bản thành công.');
}

function setDocumentPermissionHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);

  const documentId = normalizeText(requireBodyField(body, 'document_id', 'ID văn bản'));
  const targetType = normalizeText(requireBodyField(body, 'doi_tuong_type', 'Loại đối tượng')).toUpperCase();
  const targetId = normalizeText(requireBodyField(body, 'doi_tuong_id', 'ID đối tượng'));
  const permissionType = normalizeText(requireBodyField(body, 'loai_quyen', 'Loại quyền')).toUpperCase();

  const documentRow = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!documentRow || String(documentRow.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, documentRow, 'OWNER')) {
    return fail('Bạn không có quyền phân quyền văn bản này.', 'DOCUMENT_PERMISSION_DENIED');
  }

  const allowedTargetTypes = ['USER', 'ORG_UNIT', 'ROLE'];
  const allowedPermissionTypes = ['VIEW', 'EDIT', 'APPROVE', 'OWNER'];

  if (allowedTargetTypes.indexOf(targetType) === -1) {
    return fail('Loại đối tượng phân quyền không hợp lệ.', 'INVALID_PERMISSION_TARGET');
  }

  if (allowedPermissionTypes.indexOf(permissionType) === -1) {
    return fail('Loại quyền không hợp lệ.', 'INVALID_PERMISSION_TYPE');
  }

  const existing = findOneObject('DOCUMENTS', 'DocumentPermissions', function (row) {
    return String(row.document_id || '') === documentId &&
      String(row.doi_tuong_type || '') === targetType &&
      String(row.doi_tuong_id || '') === targetId;
  });

  let permissionRow;

  if (existing) {
    const patch = {
      loai_quyen: permissionType,
      updated_at: nowIso()
    };

    updateObjectByRowNumber('DOCUMENTS', 'DocumentPermissions', existing.__rowNumber, patch);
    permissionRow = mergeObjectPatch(existing, patch);
  } else {
    permissionRow = {
      id: generateId('DPERM'),
      document_id: documentId,
      doi_tuong_type: targetType,
      doi_tuong_id: targetId,
      loai_quyen: permissionType,
      created_at: nowIso(),
      updated_at: nowIso()
    };

    appendObjectRowWithLock('DOCUMENTS', 'DocumentPermissions', permissionRow);
  }

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'SET_DOCUMENT_PERMISSION',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT_PERMISSION',
    doi_tuong_id: permissionRow.id,
    after: permissionRow
  });

  return ok({
    permission: permissionRow
  }, 'Cập nhật phân quyền văn bản thành công.');
}

function removeDocumentPermissionHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);

  const permissionId = normalizeText(requireBodyField(body, 'permission_id', 'ID phân quyền'));

  const before = findObjectById('DOCUMENTS', 'DocumentPermissions', permissionId);

  if (!before) {
    return fail('Không tìm thấy phân quyền.', 'DOCUMENT_PERMISSION_NOT_FOUND');
  }

  const documentRow = findObjectById('DOCUMENTS', 'Documents', before.document_id);

  if (!documentRow) {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, documentRow, 'OWNER')) {
    return fail('Bạn không có quyền xóa phân quyền văn bản này.', 'DOCUMENT_PERMISSION_DENIED');
  }

  const patch = {
    doi_tuong_type: 'DELETED',
    updated_at: nowIso()
  };
  const after = mergeObjectPatch(before, patch);

  updateObjectByRowNumber('DOCUMENTS', 'DocumentPermissions', before.__rowNumber, patch);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'REMOVE_DOCUMENT_PERMISSION',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT_PERMISSION',
    doi_tuong_id: permissionId,
    before: before,
    after: after
  });

  return ok({
    permission: after,
    deleted_id: permissionId
  }, 'Đã xóa phân quyền văn bản.');
}

function listDocumentViewLogsHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.approve');

  const documentId = normalizeText(getRequestParam(e, 'document_id', ''));

  let logs = readAllObjects('DOCUMENTS', 'DocumentViewLogs');

  if (documentId) {
    logs = logs.filter(function (row) {
      return String(row.document_id || '') === documentId;
    });
  }

  logs.sort(function (a, b) {
    return String(b.thoi_gian || '').localeCompare(String(a.thoi_gian || ''));
  });

  return ok({
    total: logs.length,
    items: logs
  }, 'Lấy lịch sử xem văn bản thành công.');
}

function sendDocumentEmailHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'documents.update');

  const body = parseRequestBody(e);

  const documentId = normalizeText(requireBodyField(body, 'document_id', 'ID văn bản'));
  const toEmail = normalizeText(requireBodyField(body, 'to_email', 'Email người nhận'));
  const cc = normalizeText(body.cc || '');
  const bcc = normalizeText(body.bcc || '');
  const subject = normalizeText(body.subject || 'Văn bản từ hệ thống Fly To Sky');
  const bodyText = String(body.body_text || 'Kính gửi anh/chị,\n\nHệ thống gửi kèm văn bản để anh/chị xem thông tin.\n\nTrân trọng.');
  const bodyHtml = String(body.body_html || '').trim();

  const documentRow = findObjectById('DOCUMENTS', 'Documents', documentId);

  if (!documentRow || String(documentRow.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy văn bản.', 'DOCUMENT_NOT_FOUND');
  }

  if (!canUserAccessDocument(user, documentRow, 'VIEW')) {
    return fail('Bạn không có quyền gửi văn bản này.', 'DOCUMENT_SEND_DENIED');
  }

  const latestVersion = getLatestDocumentVersion(documentId);

  if (!latestVersion) {
    return fail('Văn bản chưa có file phiên bản để gửi.', 'DOCUMENT_VERSION_NOT_FOUND');
  }

  let status = 'SENT';
  let errorMessage = '';

  try {
    const file = DriveApp.getFileById(latestVersion.file_id);
    const options = {
      attachments: [file.getBlob()]
    };

    if (cc) {
      options.cc = cc;
    }

    if (bcc) {
      options.bcc = bcc;
    }

    if (bodyHtml) {
      options.htmlBody = bodyHtml;
    }

    MailApp.sendEmail(
      toEmail,
      subject,
      bodyText,
      options
    );
  } catch (err) {
    status = 'FAILED';
    errorMessage = String(err.message || err);
  }

  const emailLog = {
    id: generateId('DEMAIL'),
    document_id: documentId,
    nguoi_gui: user.id,
    danh_sach_nhan: toEmail,
    subject: subject,
    trang_thai_gui: status,
    loi_gui: errorMessage,
    thoi_gian_gui: nowIso()
  };

  appendObjectRowWithLock('DOCUMENTS', 'DocumentEmailLogs', emailLog);

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'SEND_DOCUMENT_EMAIL',
    module: 'DOCUMENTS',
    doi_tuong_type: 'DOCUMENT',
    doi_tuong_id: documentId,
    after: {
      to_email: toEmail,
      status: status,
      error: errorMessage
    }
  });

  if (status === 'FAILED') {
    return fail('Gửi email thất bại.', 'DOCUMENT_EMAIL_FAILED', {
      error: errorMessage
    });
  }

  return ok({
    status: status,
    email_log: emailLog
  }, 'Gửi email văn bản thành công.');
}

function getDocumentFolderByType(type) {
  const rootFolderId = getRequiredConfig('DRIVE_ROOT_FOLDER_ID');
  const rootFolder = DriveApp.getFolderById(rootFolderId);

  const documentsFolder = getOrCreateFolder(rootFolder, '04_Documents');

  const normalizedType = String(type || '').trim().toUpperCase();

  let folderName = 'Khac';

  if (normalizedType === 'CONG_VAN') {
    folderName = 'CongVan';
  } else if (normalizedType === 'QUY_DINH' || normalizedType === 'QUY_CHE') {
    folderName = 'QuyDinh_QuyChe';
  } else if (normalizedType === 'BIEN_BAN_HOP') {
    folderName = 'BienBanHop';
  } else if (normalizedType === 'HOP_DONG_DOI_TAC' || normalizedType === 'HOP_DONG_DU_AN') {
    folderName = 'HopDong_DoiTac_DuAn';
  } else if (normalizedType === 'QUY_TRINH_NOI_BO') {
    folderName = 'QuyTrinhNoiBo';
  }

  return getOrCreateFolder(documentsFolder, folderName);
}

function generateDocumentCode(type) {
  const prefix = String(type || 'DOC').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const datePart = Utilities.formatDate(new Date(), getRequiredConfig('TIMEZONE'), 'yyyyMMdd');
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return prefix + '-' + datePart + '-' + randomPart;
}

function getNextDocumentVersionNumber(documentId) {
  const versions = findObjects('DOCUMENTS', 'DocumentVersions', function (row) {
    return String(row.document_id || '') === String(documentId || '');
  });

  let maxVersion = 0;

  versions.forEach(function (v) {
    maxVersion = Math.max(maxVersion, Number(v.so_phien_ban || 0));
  });

  return maxVersion + 1;
}

function getLatestDocumentVersion(documentId) {
  const versions = findObjects('DOCUMENTS', 'DocumentVersions', function (row) {
    return String(row.document_id || '') === String(documentId || '');
  });

  versions.sort(function (a, b) {
    return Number(b.so_phien_ban || 0) - Number(a.so_phien_ban || 0);
  });

  return versions.length > 0 ? versions[0] : null;
}

function getLatestDocumentVersionMap() {
  const versions = readAllObjects('DOCUMENTS', 'DocumentVersions');
  const map = {};

  versions.forEach(function (version) {
    const documentId = String(version.document_id || '');
    const current = map[documentId];

    if (!current || Number(version.so_phien_ban || 0) > Number(current.so_phien_ban || 0)) {
      map[documentId] = version;
    }
  });

  return map;
}

function writeDocumentViewLog(e, user, documentId, action) {
  const meta = getClientMeta(e);

  appendObjectRowWithLock('DOCUMENTS', 'DocumentViewLogs', {
    id: generateId('DVIEW'),
    document_id: documentId,
    user_id: user.id,
    hanh_dong: action || 'VIEW',
    ip: meta.ip,
    user_agent: meta.user_agent,
    thoi_gian: nowIso()
  });
}

function canUserAccessDocument(user, documentRow, requiredPermission) {
  if (!user || !documentRow) {
    return false;
  }

  const required = String(requiredPermission || 'VIEW').toUpperCase();

  if (userHasRole(user.id, 'SUPER_ADMIN')) {
    return true;
  }

  if (userHasPermission(user.id, 'documents.approve')) {
    return true;
  }

  if (String(documentRow.nguoi_tao || '') === String(user.id || '')) {
    return true;
  }

  if (required === 'VIEW' &&
    String(documentRow.trang_thai || '') === 'PUBLISHED' &&
    String(documentRow.muc_do_bao_mat || '') === 'PUBLIC') {
    return true;
  }

  const permissions = findObjects('DOCUMENTS', 'DocumentPermissions', function (row) {
    return String(row.document_id || '') === String(documentRow.id || '') &&
      String(row.doi_tuong_type || '') !== 'DELETED';
  });

  const userRoles = getUserRoleAssignments(user.id);
  const roleCodes = {};
  userRoles.forEach(function (role) {
    roleCodes[String(role.role_code || '')] = true;
  });

  const memberships = readAllObjects('CORE_HR', 'PersonOrgMemberships')
    .filter(function (m) {
      return String(m.person_id || '') === String(user.person_id || '') &&
        String(m.trang_thai || '') === 'ACTIVE';
    });

  for (let i = 0; i < permissions.length; i++) {
    const permission = permissions[i];
    const targetType = String(permission.doi_tuong_type || '').toUpperCase();
    const targetId = String(permission.doi_tuong_id || '');
    const permissionValue = String(permission.loai_quyen || '').toUpperCase();

    if (!permissionCovers(permissionValue, required)) {
      continue;
    }

    if (targetType === 'USER' && targetId === String(user.id || '')) {
      return true;
    }

    if (targetType === 'ROLE' && roleCodes[targetId]) {
      return true;
    }

    if (targetType === 'ORG_UNIT') {
      const matched = memberships.some(function (m) {
        const userOrgUnitId = String(m.org_unit_id || '');

        return userOrgUnitId === targetId || isOrgUnitInScope(userOrgUnitId, targetId);
      });

      if (matched) {
        return true;
      }
    }
  }

  return false;
}

function permissionCovers(actualPermission, requiredPermission) {
  const order = {
    VIEW: 1,
    EDIT: 2,
    APPROVE: 3,
    OWNER: 4
  };

  const actual = order[String(actualPermission || '').toUpperCase()] || 0;
  const required = order[String(requiredPermission || '').toUpperCase()] || 1;

  return actual >= required;
}
