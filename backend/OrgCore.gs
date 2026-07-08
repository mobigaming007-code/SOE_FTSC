function getOrgTreeHandler(e) {
  const user = requireAuth(e);
  requirePermission(user, 'org.view');

  const orgUnits = readAllObjects('CORE_HR', 'OrgUnits')
    .filter(function (row) {
      return String(row.trang_thai || '') !== 'DELETED';
    });

  const tree = buildOrgTree(orgUnits);

  return ok({
    items: orgUnits,
    tree: tree
  }, 'Lấy cây tổ chức thành công.');
}

function buildOrgTree(orgUnits) {
  const map = {};
  const roots = [];

  orgUnits.forEach(function (item) {
    const id = String(item.id || '');

    map[id] = {
      id: item.id,
      org_type: item.org_type,
      ma_don_vi: item.ma_don_vi,
      ten_don_vi: item.ten_don_vi,
      parent_id: item.parent_id,
      cap_do: item.cap_do,
      loai_don_vi: item.loai_don_vi,
      thu_tu: item.thu_tu,
      trang_thai: item.trang_thai,
      children: []
    };
  });

  Object.keys(map).forEach(function (id) {
    const node = map[id];
    const parentId = String(node.parent_id || '');

    if (parentId && map[parentId]) {
      map[parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  function sortChildren(nodes) {
    nodes.sort(function (a, b) {
      return Number(a.thu_tu || 0) - Number(b.thu_tu || 0);
    });

    nodes.forEach(function (node) {
      sortChildren(node.children);
    });
  }

  sortChildren(roots);

  return roots;
}