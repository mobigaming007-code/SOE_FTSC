function nowIso() {
  return Utilities.formatDate(
    new Date(),
    getRequiredConfig('TIMEZONE'),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

function todayDate() {
  return Utilities.formatDate(
    new Date(),
    getRequiredConfig('TIMEZONE'),
    'yyyy-MM-dd'
  );
}

function generateId(prefix) {
  const uuid = Utilities.getUuid().replace(/-/g, '');
  return String(prefix || 'ID') + '_' + uuid.substring(0, 20).toUpperCase();
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(normalizeResponseDates(value || {}));
  } catch (err) {
    return JSON.stringify({
      error: 'JSON_STRINGIFY_FAILED',
      message: String(err)
    });
  }
}

function getHeaderMap(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return {};
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach(function (header, index) {
    if (header) {
      map[String(header).trim()] = index + 1;
    }
  });

  return map;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hashText(text) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );

  return raw.map(function (byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}
function normalizeEmailValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneValue(value) {
  let phone = String(value || '').trim();
  phone = phone.replace(/\s+/g, '');
  phone = phone.replace(/[^\d+]/g, '');

  if (/^\d{9}$/.test(phone)) {
    phone = '0' + phone;
  }

  return phone;
}

function normalizeCccdValue(value) {
  let cccd = String(value || '').trim();
  cccd = cccd.replace(/\s+/g, '');
  cccd = cccd.replace(/\D/g, '');

  if (/^\d{11}$/.test(cccd)) {
    cccd = '0' + cccd;
  }

  return cccd;
}

function requireBodyField(body, fieldName, label) {
  const value = body ? body[fieldName] : '';

  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error('Thiếu trường bắt buộc: ' + (label || fieldName));
  }

  return value;
}

function getRequestParam(e, key, defaultValue) {
  if (e && e.parameter && e.parameter[key] !== undefined) {
    return e.parameter[key];
  }

  return defaultValue || '';
}

function generatePersonCode() {
  const datePart = Utilities.formatDate(
    new Date(),
    getRequiredConfig('TIMEZONE'),
    'yyyyMMdd'
  );

  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return 'FTS-' + datePart + '-' + randomPart;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  let password = 'Fts@';

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}
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
function formatDateOnly_(value) {
  if (!value) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const text = String(value).trim();

  if (!text) {
    return '';
  }

  // Nếu dạng 2026-07-03 08:28:16 thì lấy phần ngày
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.substring(0, 10);
  }

  const parsed = new Date(text);

  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return text;
}

function parseDateTimeFlexible_(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  // Google Sheet của bạn đang lưu: 2026-07-03 08:28:16
  // JS parse ổn hơn nếu đổi thành: 2026-07-03T08:28:16
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    text = text.replace(' ', 'T');
  }

  const parsed = new Date(text);

  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeUpper_(value) {
  return String(value || '').trim().toUpperCase();
}

function minutesDiff_(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

function hoursDiff_(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const minutes = minutesDiff_(startDate, endDate);

  return Math.round((minutes / 60) * 100) / 100;
}

function combineDateAndTime_(dateText, timeText) {
  if (!dateText || !timeText) {
    return null;
  }

  const parsed = new Date(String(dateText) + 'T' + String(timeText));

  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}
