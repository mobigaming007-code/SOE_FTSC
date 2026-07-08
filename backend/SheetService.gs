function openSpreadsheetByCode(spreadsheetCode) {
  const spreadsheetId = getSpreadsheetIdByCode(spreadsheetCode);
  return SpreadsheetApp.openById(spreadsheetId);
}

function getSheetByCode(spreadsheetCode, sheetName) {
  const ss = openSpreadsheetByCode(spreadsheetCode);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Không tìm thấy sheet: ' + spreadsheetCode + ' / ' + sheetName);
  }

  return sheet;
}

function ensureSheetWithHeaders(spreadsheetCode, sheetName, headers) {
  const ss = openSpreadsheetByCode(spreadsheetCode);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getValues()[0]
      .map(function (h) {
        return String(h || '').trim();
      });

    const missingHeaders = headers.filter(function (h) {
      return currentHeaders.indexOf(h) === -1;
    });

    if (missingHeaders.length > 0) {
      const startColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }

  sheet.setFrozenRows(1);

  const finalLastColumn = sheet.getLastColumn();

  if (finalLastColumn > 0) {
    const headerRange = sheet.getRange(1, 1, 1, finalLastColumn);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e8f0fe');
    sheet.autoResizeColumns(1, finalLastColumn);
  }

  return sheet;
}

function appendObjectRow(spreadsheetCode, sheetName, objectData) {
  const sheet = getSheetByCode(spreadsheetCode, sheetName);
  const headerMap = getHeaderMap(sheet);
  const headers = Object.keys(headerMap);

  const row = headers.map(function (header) {
    return objectData.hasOwnProperty(header) ? objectData[header] : '';
  });

  sheet.appendRow(row);

  return {
    sheetName: sheetName,
    rowNumber: sheet.getLastRow()
  };
}

function readAllObjects(spreadsheetCode, sheetName) {
  const sheet = getSheetByCode(spreadsheetCode, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0];

  return values.slice(1).map(function (row) {
    const obj = {};

    headers.forEach(function (header, index) {
      if (header) {
        obj[String(header).trim()] = row[index];
      }
    });

    return obj;
  });
}
function findObjects(spreadsheetCode, sheetName, predicate) {
  const sheet = getSheetByCode(spreadsheetCode, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0];

  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};

    headers.forEach(function (header, index) {
      if (header) {
        obj[String(header).trim()] = row[index];
      }
    });

    obj.__rowNumber = i + 1;

    if (predicate(obj)) {
      results.push(obj);
    }
  }

  return results;
}

function findOneObject(spreadsheetCode, sheetName, predicate) {
  const results = findObjects(spreadsheetCode, sheetName, predicate);
  return results.length > 0 ? results[0] : null;
}

function findObjectById(spreadsheetCode, sheetName, id) {
  return findOneObject(spreadsheetCode, sheetName, function (row) {
    return String(row.id || '') === String(id || '');
  });
}

function appendObjectRowWithLock(spreadsheetCode, sheetName, objectData) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
    return appendObjectRow(spreadsheetCode, sheetName, objectData);
  } finally {
    lock.releaseLock();
  }
}

function updateObjectByRowNumber(spreadsheetCode, sheetName, rowNumber, patchData) {
  const sheet = getSheetByCode(spreadsheetCode, sheetName);
  const headerMap = getHeaderMap(sheet);

  Object.keys(patchData).forEach(function (key) {
    const col = headerMap[key];

    if (col) {
      sheet.getRange(rowNumber, col).setValue(patchData[key]);
    }
  });

  return patchData;
}

function updateObjectById(spreadsheetCode, sheetName, id, patchData) {
  const target = findObjectById(spreadsheetCode, sheetName, id);

  if (!target) {
    throw new Error('Không tìm thấy bản ghi cần cập nhật: ' + sheetName + ' / ' + id);
  }

  patchData.updated_at = patchData.updated_at || nowIso();

  updateObjectByRowNumber(spreadsheetCode, sheetName, target.__rowNumber, patchData);

  return mergeObjectPatch(target, patchData);
}

function mergeObjectPatch(target, patchData) {
  const updated = {};

  Object.keys(target).forEach(function (key) {
    if (key !== '__rowNumber') {
      updated[key] = target[key];
    }
  });

  Object.keys(patchData).forEach(function (key) {
    updated[key] = patchData[key];
  });

  return updated;
}

function softDeleteObjectById(spreadsheetCode, sheetName, id) {
  return updateObjectById(spreadsheetCode, sheetName, id, {
    trang_thai: 'DELETED',
    updated_at: nowIso()
  });
}

function objectExists(spreadsheetCode, sheetName, predicate) {
  return findOneObject(spreadsheetCode, sheetName, predicate) !== null;
}
