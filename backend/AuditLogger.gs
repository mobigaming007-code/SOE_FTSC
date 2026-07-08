function writeAuditLog(params) {
  const data = {
    id: generateId('AUDIT'),
    user_id: params.user_id || 'SYSTEM',
    hanh_dong: params.hanh_dong || '',
    module: params.module || '',
    doi_tuong_type: params.doi_tuong_type || '',
    doi_tuong_id: params.doi_tuong_id || '',
    before_json: safeJsonStringify(params.before || {}),
    after_json: safeJsonStringify(params.after || {}),
    ip: params.ip || '',
    user_agent: params.user_agent || '',
    thoi_gian: nowIso()
  };

  appendObjectRow('SYSTEM', 'AuditLog', data);
}