function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(normalizeResponseDates(payload)))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data, message) {
  return {
    success: true,
    message: message || 'OK',
    data: data || null
  };
}

function fail(message, code, detail) {
  return {
    success: false,
    code: code || 'ERROR',
    message: message || 'Có lỗi xảy ra',
    detail: detail || null
  };
}

function normalizeResponseDates(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return formatResponseDateObject(value);
  }

  if (Array.isArray(value)) {
    return value.map(function (item) {
      return normalizeResponseDates(item);
    });
  }

  if (typeof value === 'object') {
    const output = {};

    Object.keys(value).forEach(function (key) {
      if (key === '__rowNumber') {
        return;
      }

      output[key] = normalizeResponseDates(value[key]);
    });

    return output;
  }

  if (typeof value === 'string') {
    return formatResponseDateString(value);
  }

  return value;
}

function formatResponseDateObject(value) {
  const timezone = getRequiredConfig('TIMEZONE');
  const hours = Number(Utilities.formatDate(value, timezone, 'H'));
  const minutes = Number(Utilities.formatDate(value, timezone, 'm'));
  const seconds = Number(Utilities.formatDate(value, timezone, 's'));
  const pattern = hours || minutes || seconds
    ? 'dd/MM/yyyy HH:mm'
    : 'dd/MM/yyyy';

  return Utilities.formatDate(value, timezone, pattern);
}

function formatResponseDateString(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?$/);

  if (!match) {
    return value;
  }

  const dateText = match[3] + '/' + match[2] + '/' + match[1];

  if (match[4] && match[5]) {
    return dateText + ' ' + match[4] + ':' + match[5];
  }

  return dateText;
}
