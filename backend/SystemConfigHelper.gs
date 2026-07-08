function getSystemConfigValue(key, defaultValue) {
  const config = findOneObject('SYSTEM', 'SystemConfig', function (row) {
    return String(row.key || '') === String(key || '');
  });

  if (!config) {
    return defaultValue;
  }

  if (config.value === undefined || config.value === null || config.value === '') {
    return defaultValue;
  }

  return config.value;
}