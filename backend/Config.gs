const INITIAL_CONFIG = {
  APP_NAME: 'Fly To Sky Office',
  APP_SHORT_NAME: 'FTS Office',
  TIMEZONE: 'Asia/Ho_Chi_Minh',

  DRIVE_ROOT_FOLDER_ID: '1GV1Fadho1IdPPahFQVDE08vfVz2FSeHY',

  CORE_HR_SPREADSHEET_ID: '1PAmp2Qaiya3bvz6ZL9TiD3atEUhyFmaKKV8HMQkDhOs',
  SENSITIVE_HR_SPREADSHEET_ID: '1P5oEqqQkF4-2gAYS0vULNg20CQxiFOSGWG7ISvLLJD0',
  ATTENDANCE_SPREADSHEET_ID: '1zFMAtQiyTH4glC4451i-aV7x2NoeAABp5wDWAhd31HM',
  DOCUMENTS_SPREADSHEET_ID: '1_JXR8K5ke3li0LStbyrL59e5CCu5tXPBR_9HXmksm_Y',
  SYSTEM_SPREADSHEET_ID: '1AOLn6Lgqt4y1R3TfuGJt-_Q4sxPX5SnyOTp_axgtzro'
};

function setInitialConfig() {
  const props = PropertiesService.getScriptProperties();

  Object.keys(INITIAL_CONFIG).forEach(function (key) {
    props.setProperty(key, String(INITIAL_CONFIG[key]));
  });

  Logger.log('Đã lưu cấu hình ban đầu vào Script Properties.');
}

function getConfig(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getRequiredConfig(key) {
  const value = getConfig(key);

  if (!value) {
    throw new Error('Thiếu cấu hình bắt buộc: ' + key);
  }

  return value;
}

function getSpreadsheetIdByCode(code) {
  const map = {
    CORE_HR: 'CORE_HR_SPREADSHEET_ID',
    SENSITIVE_HR: 'SENSITIVE_HR_SPREADSHEET_ID',
    ATTENDANCE: 'ATTENDANCE_SPREADSHEET_ID',
    DOCUMENTS: 'DOCUMENTS_SPREADSHEET_ID',
    SYSTEM: 'SYSTEM_SPREADSHEET_ID'
  };

  if (!map[code]) {
    throw new Error('Mã spreadsheet không hợp lệ: ' + code);
  }

  return getRequiredConfig(map[code]);
}