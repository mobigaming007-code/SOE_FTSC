"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { fileToBase64, formatFileSize } from "@/lib/file";
import {
  formatDocumentPermission,
  formatPermissionTargetType,
} from "@/lib/labels";
import type {
  DocumentDetailData,
  DocumentPermission,
  DocumentRecord,
  DocumentViewLog,
  DocumentViewLogListData,
  SendDocumentEmailData,
  SetDocumentPermissionData,
  UploadDocumentVersionData,
} from "@/types/api";

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [documentData, setDocumentData] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentDetailData["versions"]>([]);
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [viewLogs, setViewLogs] = useState<DocumentViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editForm, setEditForm] = useState({
    ma_van_ban: "",
    ten_van_ban: "",
    loai_van_ban: "CONG_VAN",
    org_unit_id: "",
    muc_do_bao_mat: "INTERNAL",
    trang_thai: "DRAFT",
  });

  const [uploadNote, setUploadNote] = useState("");

  const [permissionForm, setPermissionForm] = useState({
    doi_tuong_type: "USER",
    doi_tuong_id: "",
    loai_quyen: "VIEW",
  });

  const [emailForm, setEmailForm] = useState({
    to_email: "",
    cc: "",
    bcc: "",
    subject: "",
    body_text: "",
    body_html: "",
  });

  async function loadDetail() {
    setLoading(true);
    setError("");

    const response = await gasFetch<DocumentDetailData>({
      path: "documents/detail",
      method: "GET",
      params: {
        id: documentId,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được chi tiết văn bản.");
      return;
    }

    const doc = response.data.document;

    setDocumentData(doc);
    setVersions(response.data.versions || []);
    setPermissions(response.data.permissions || []);

    setEditForm({
      ma_van_ban: doc.ma_van_ban || "",
      ten_van_ban: doc.ten_van_ban || "",
      loai_van_ban: doc.loai_van_ban || "CONG_VAN",
      org_unit_id: doc.org_unit_id || "",
      muc_do_bao_mat: doc.muc_do_bao_mat || "INTERNAL",
      trang_thai: doc.trang_thai || "DRAFT",
    });

    setEmailForm((prev) => ({
      ...prev,
      subject: prev.subject || `Gửi văn bản: ${doc.ten_van_ban}`,
      body_text:
        prev.body_text ||
        `Kính gửi anh/chị,\n\nEm gửi kèm văn bản: ${doc.ten_van_ban}.\n\nTrân trọng.`,
      body_html:
        prev.body_html ||
        `<p>Kính gửi anh/chị,</p><p>Em gửi kèm văn bản: <b>${doc.ten_van_ban}</b>.</p><p>Trân trọng.</p>`,
    }));
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadDetail();
    });
  }, [documentId, router]);

  async function updateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "documents/update",
      method: "POST",
      body: {
        id: documentId,
        ...editForm,
      },
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Không cập nhật được văn bản.");
      return;
    }

    setNotice("Đã cập nhật văn bản.");
    loadDetail();
  }

  async function uploadVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Vui lòng chọn file cần upload.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    const base64 = await fileToBase64(file);

    const response = await gasFetch<UploadDocumentVersionData>({
      path: "documents/versions/upload",
      method: "POST",
      body: {
        document_id: documentId,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        base64_data: base64,
        ghi_chu_thay_doi: uploadNote,
      },
    });

    setUploading(false);

    if (!response.success) {
      setError(response.message || "Không upload được phiên bản văn bản.");
      return;
    }

    setNotice("Đã upload phiên bản văn bản.");
    setFile(null);
    setUploadNote("");
    loadDetail();
  }

  async function setPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setError("");
    setNotice("");

    const response = await gasFetch<SetDocumentPermissionData>({
      path: "documents/permissions/set",
      method: "POST",
      body: {
        document_id: documentId,
        ...permissionForm,
      },
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Không cập nhật được phân quyền.");
      return;
    }

    setNotice("Đã cập nhật phân quyền.");
    setPermissionForm({
      doi_tuong_type: "USER",
      doi_tuong_id: "",
      loai_quyen: "VIEW",
    });
    loadDetail();
  }

  async function removePermission(permissionId: string) {
    setProcessing(true);
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "documents/permissions/remove",
      method: "POST",
      body: {
        permission_id: permissionId,
      },
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Không xóa được phân quyền.");
      return;
    }

    setNotice("Đã xóa phân quyền.");
    loadDetail();
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setError("");
    setNotice("");

    const response = await gasFetch<SendDocumentEmailData>({
      path: "documents/email/send",
      method: "POST",
      body: {
        document_id: documentId,
        ...emailForm,
      },
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Gửi email thất bại.");
      return;
    }

    setNotice("Đã gửi email văn bản.");
  }

  async function loadViewLogs() {
    setProcessing(true);
    setError("");

    const response = await gasFetch<DocumentViewLogListData>({
      path: "documents/view-logs",
      method: "GET",
      params: {
        document_id: documentId,
      },
    });

    setProcessing(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được lịch sử xem văn bản.");
      return;
    }

    setViewLogs(response.data.items || []);
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock text="Đang tải chi tiết văn bản..." />
      </AppShell>
    );
  }

  if (!documentData) {
    return (
      <AppShell>
        <div className="rounded-3xl bg-rose-50 p-5 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error || "Không tìm thấy văn bản."}
        </div>
      </AppShell>
    );
  }

  const latestVersion = versions[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/documents")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại văn bản
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Document Detail
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            {documentData.ten_van_ban}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-sky-50 md:text-base">
            {documentData.ma_van_ban || documentData.id} ·{" "}
            {documentData.loai_van_ban} · {documentData.muc_do_bao_mat}
          </p>

          {latestVersion ? (
            <a
              href={latestVersion.file_url}
              target="_blank"
              className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              Mở file mới nhất v{latestVersion.so_phien_ban}
            </a>
          ) : null}
        </section>

        {notice ? (
          <div className="rounded-3xl bg-teal-50 p-4 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Cập nhật thông tin
            </h2>

            <form
              onSubmit={updateDocument}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <InputField
                label="Mã văn bản"
                value={editForm.ma_van_ban}
                onChange={(value) =>
                  setEditForm({ ...editForm, ma_van_ban: value })
                }
              />

              <InputField
                label="Tên văn bản"
                value={editForm.ten_van_ban}
                onChange={(value) =>
                  setEditForm({ ...editForm, ten_van_ban: value })
                }
                required
              />

              <SelectField
                label="Loại văn bản"
                value={editForm.loai_van_ban}
                onChange={(value) =>
                  setEditForm({ ...editForm, loai_van_ban: value })
                }
                options={[
                  { value: "CONG_VAN", label: "Công văn" },
                  { value: "QUY_DINH", label: "Quy định" },
                  { value: "QUY_CHE", label: "Quy chế" },
                  { value: "QUYET_DINH", label: "Quyết định" },
                  { value: "HUONG_DAN", label: "Hướng dẫn" },
                  { value: "THONG_BAO", label: "Thông báo" },
                  { value: "BIEN_BAN_HOP", label: "Biên bản họp" },
                  { value: "HOP_DONG_DOI_TAC", label: "Hợp đồng đối tác" },
                  { value: "HOP_DONG_DU_AN", label: "Hợp đồng dự án" },
                  { value: "QUY_TRINH_NOI_BO", label: "Quy trình nội bộ" },
                  { value: "BBHT", label: "Biên bản hợp tác" },
                  { value: "HOP_DONG", label: "Hợp đồng" },
                  { value: "KHAC", label: "Khác" },
                ]}
              />

              <InputField
                label="Org Unit ID"
                value={editForm.org_unit_id}
                onChange={(value) =>
                  setEditForm({ ...editForm, org_unit_id: value })
                }
              />

              <SelectField
                label="Mức độ bảo mật"
                value={editForm.muc_do_bao_mat}
                onChange={(value) =>
                  setEditForm({ ...editForm, muc_do_bao_mat: value })
                }
                options={[
                  { value: "PUBLIC", label: "Công khai" },
                  { value: "INTERNAL", label: "Nội bộ" },
                  { value: "CONFIDENTIAL", label: "Mật" },
                  { value: "SECRET", label: "Tối mật" },
                ]}
              />

              <SelectField
                label="Trạng thái"
                value={editForm.trang_thai}
                onChange={(value) =>
                  setEditForm({ ...editForm, trang_thai: value })
                }
                options={[
                  { value: "DRAFT", label: "Bản nháp" },
                  { value: "PUBLISHED", label: "Đã ban hành" },
                  { value: "ARCHIVED", label: "Lưu trữ" },
                ]}
              />

              <div className="md:col-span-2">
                <button
                  disabled={processing}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  Cập nhật văn bản
                </button>
              </div>
            </form>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Upload phiên bản mới
            </h2>

            <form onSubmit={uploadVersion} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  File văn bản
                </label>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="fts-input"
                />
                {file ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Đã chọn: {file.name} · {formatFileSize(file.size)}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Ghi chú thay đổi
                </label>
                <textarea
                  value={uploadNote}
                  onChange={(event) => setUploadNote(event.target.value)}
                  rows={4}
                  className="fts-input"
                  placeholder="VD: Phiên bản cập nhật điều khoản chấm công"
                />
              </div>

              <button
                disabled={uploading}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-60"
              >
                {uploading ? "Đang upload..." : "Upload phiên bản"}
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Lịch sử phiên bản
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Phiên bản</th>
                    <th className="px-5 py-4">File</th>
                    <th className="px-5 py-4">Người upload</th>
                    <th className="px-5 py-4">Ngày upload</th>
                    <th className="px-5 py-4">Ghi chú</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        v{version.so_phien_ban}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={version.file_url}
                          target="_blank"
                          className="text-sm font-black text-sky-600 hover:text-sky-700"
                        >
                          Mở file
                        </a>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {version.nguoi_upload || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {version.ngay_upload || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {version.ghi_chu_thay_doi || "-"}
                      </td>
                    </tr>
                  ))}

                  {versions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có phiên bản file.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Gửi văn bản qua email
            </h2>

            <form onSubmit={sendEmail} className="mt-5 grid gap-4">
              <InputField
                label="Email người nhận"
                value={emailForm.to_email}
                onChange={(value) =>
                  setEmailForm({ ...emailForm, to_email: value })
                }
                placeholder="nguoinhan@example.com"
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="CC"
                  value={emailForm.cc}
                  onChange={(value) =>
                    setEmailForm({ ...emailForm, cc: value })
                  }
                />

                <InputField
                  label="BCC"
                  value={emailForm.bcc}
                  onChange={(value) =>
                    setEmailForm({ ...emailForm, bcc: value })
                  }
                />
              </div>

              <InputField
                label="Tiêu đề"
                value={emailForm.subject}
                onChange={(value) =>
                  setEmailForm({ ...emailForm, subject: value })
                }
                required
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nội dung text
                </label>
                <textarea
                  value={emailForm.body_text}
                  onChange={(event) =>
                    setEmailForm({
                      ...emailForm,
                      body_text: event.target.value,
                    })
                  }
                  rows={5}
                  className="fts-input"
                />
              </div>

              <button
                disabled={processing}
                className="w-full rounded-2xl bg-amber-500 px-5 py-3 font-black text-white shadow-xl shadow-amber-100 transition hover:bg-amber-600 disabled:opacity-60"
              >
                Gửi email văn bản
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Phân quyền văn bản
            </h2>

            <form onSubmit={setPermission} className="mt-5 grid gap-4">
              <SelectField
                label="Loại đối tượng"
                value={permissionForm.doi_tuong_type}
                onChange={(value) =>
                  setPermissionForm({
                    ...permissionForm,
                    doi_tuong_type: value,
                  })
                }
                options={[
                  { value: "USER", label: "Người dùng" },
                  { value: "ORG_UNIT", label: "Đơn vị" },
                  { value: "ROLE", label: "Vai trò" },
                ]}
              />

              <InputField
                label="ID đối tượng"
                value={permissionForm.doi_tuong_id}
                onChange={(value) =>
                  setPermissionForm({ ...permissionForm, doi_tuong_id: value })
                }
                placeholder="USER_ID / ORG_UNIT_ID / ROLE_CODE"
                required
              />

              <SelectField
                label="Loại quyền"
                value={permissionForm.loai_quyen}
                onChange={(value) =>
                  setPermissionForm({ ...permissionForm, loai_quyen: value })
                }
                options={[
                  { value: "VIEW", label: "Xem" },
                  { value: "EDIT", label: "Sửa" },
                  { value: "APPROVE", label: "Duyệt/quản lý" },
                  { value: "OWNER", label: "Chủ sở hữu" },
                ]}
              />

              <button
                disabled={processing}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
              >
                Cập nhật phân quyền
              </button>
            </form>
          </div>

          <div className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách phân quyền
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Đối tượng</th>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Quyền</th>
                    <th className="px-5 py-4">Cập nhật</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {formatPermissionTargetType(permission.doi_tuong_type)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {permission.doi_tuong_id}
                      </td>
                      <td className="px-5 py-4">
                        <PermissionBadge value={permission.loai_quyen} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {permission.updated_at || permission.created_at || "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          disabled={processing}
                          onClick={() => removePermission(permission.id)}
                          className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-60"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}

                  {permissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có phân quyền.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="fts-card rounded-[2rem] p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Lịch sử xem văn bản
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Chỉ tài khoản có quyền quản trị/duyệt văn bản mới xem được mục
                này.
              </p>
            </div>

            <button
              disabled={processing}
              onClick={loadViewLogs}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-60"
            >
              Tải lịch sử xem
            </button>
          </div>

          {viewLogs.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Người xem</th>
                    <th className="px-5 py-4">Hành động</th>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">User Agent</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {viewLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {log.user_id}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.hanh_dong}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {log.thoi_gian}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {log.user_agent || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PermissionBadge({ value }: { value: string }) {
  const className =
    value === "OWNER"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : value === "APPROVE"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "EDIT"
          ? "bg-sky-50 text-sky-700 ring-sky-100"
          : "bg-teal-50 text-teal-700 ring-teal-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatDocumentPermission(value)}
    </span>
  );
}
