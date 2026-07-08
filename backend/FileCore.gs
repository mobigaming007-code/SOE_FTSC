function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(folderName);
}

function getCoreAvatarFolder() {
  const rootFolderId = getRequiredConfig('DRIVE_ROOT_FOLDER_ID');
  const rootFolder = DriveApp.getFolderById(rootFolderId);

  const coreFolder = getOrCreateFolder(rootFolder, '01_Core_HR');
  const avatarFolder = getOrCreateFolder(coreFolder, 'Avatars');

  return avatarFolder;
}

function getCoreHrmFileFolder(personId) {
  const rootFolderId = getRequiredConfig('DRIVE_ROOT_FOLDER_ID');
  const rootFolder = DriveApp.getFolderById(rootFolderId);

  const coreFolder = getOrCreateFolder(rootFolder, '01_Core_HR');
  const hrmFolder = getOrCreateFolder(coreFolder, 'HRM_Files');

  return getOrCreateFolder(hrmFolder, personId);
}

function sanitizeDriveFileName(fileName) {
  const cleanName = normalizeText(fileName || 'hrm-file')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 180);

  return cleanName || 'hrm-file';
}

function uploadAvatarHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID hồ sơ'));
  const fileName = normalizeText(body.file_name || 'avatar.png');
  const mimeType = normalizeText(body.mime_type || 'image/png');
  let base64Data = String(requireBodyField(body, 'base64_data', 'Dữ liệu file base64'));

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Không tìm thấy hồ sơ.', 'PERSON_NOT_FOUND');
  }

  if (base64Data.indexOf(',') !== -1) {
    base64Data = base64Data.split(',').pop();
  }

  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType, personId + '_' + fileName);

  const folder = getCoreAvatarFolder();
  const file = folder.createFile(blob);

  const fileId = file.getId();
  const fileUrl = file.getUrl();

  const updatedPerson = updateObjectById('CORE_HR', 'People', personId, {
    anh_dai_dien_file_id: fileId,
    anh_dai_dien_url: fileUrl,
    updated_at: nowIso()
  });

  appendObjectRowWithLock('SYSTEM', 'FileRegistry', {
    id: generateId('FILE'),
    owner_type: 'PERSON',
    owner_id: personId,
    module: 'PEOPLE',
    file_type: 'AVATAR',
    file_id: fileId,
    file_url: fileUrl,
    folder_id: folder.getId(),
    mime_type: mimeType,
    size_bytes: bytes.length,
    uploaded_by: user.id,
    created_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPLOAD_AVATAR',
    module: 'PEOPLE',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    after: {
      file_id: fileId,
      file_url: fileUrl
    }
  });

  return ok({
    file_id: fileId,
    file_url: fileUrl,
    person: sanitizePerson(updatedPerson)
  }, 'Upload ảnh đại diện thành công.');
}

function uploadHrmFileHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'people.update');

  const body = parseRequestBody(e);

  const personId = normalizeText(requireBodyField(body, 'person_id', 'ID ho so'));
  const fileType = normalizeText(body.file_type || 'HRM_FILE').toUpperCase();
  const fileName = sanitizeDriveFileName(body.file_name || 'hrm-file');
  const mimeType = normalizeText(body.mime_type || 'application/octet-stream');
  let base64Data = String(requireBodyField(body, 'base64_data', 'Du lieu file base64'));

  const person = findObjectById('CORE_HR', 'People', personId);

  if (!person || String(person.trang_thai || '') === 'DELETED') {
    return fail('Khong tim thay ho so.', 'PERSON_NOT_FOUND');
  }

  if (base64Data.indexOf(',') !== -1) {
    base64Data = base64Data.split(',').pop();
  }

  const bytes = Utilities.base64Decode(base64Data);

  if (bytes.length > 20 * 1024 * 1024) {
    return fail('File vuot qua gioi han 20MB.', 'FILE_TOO_LARGE');
  }

  const folder = getCoreHrmFileFolder(personId);
  const blob = Utilities.newBlob(bytes, mimeType, personId + '_' + fileType + '_' + fileName);
  const file = folder.createFile(blob);

  const fileId = file.getId();
  const fileUrl = file.getUrl();

  ensureSheetWithHeaders('SYSTEM', 'FileRegistry', SPREADSHEET_STRUCTURE.SYSTEM.FileRegistry);

  appendObjectRowWithLock('SYSTEM', 'FileRegistry', {
    id: generateId('FILE'),
    owner_type: 'PERSON',
    owner_id: personId,
    module: 'HRM',
    file_type: fileType,
    file_id: fileId,
    file_url: fileUrl,
    folder_id: folder.getId(),
    mime_type: mimeType,
    size_bytes: bytes.length,
    uploaded_by: user.id,
    created_at: nowIso()
  });

  writeAuditLog({
    user_id: user.id,
    hanh_dong: 'UPLOAD_HRM_FILE',
    module: 'HRM',
    doi_tuong_type: 'PERSON',
    doi_tuong_id: personId,
    after: {
      file_type: fileType,
      file_id: fileId,
      file_url: fileUrl
    }
  });

  return ok({
    file_id: fileId,
    file_url: fileUrl,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: bytes.length
  }, 'Upload file ho so thanh cong.');
}
