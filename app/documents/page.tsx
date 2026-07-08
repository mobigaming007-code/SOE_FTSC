"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type { DocumentListData, DocumentRecord } from "@/types/api";

const documentTypes = [
  { value: "", label: "Tất cả loại văn bản" },
  { value: "CONG_VAN", label: "Công văn" },
  { value: "QUY_DINH", label: "Quy định" },
  { value: "QUY_CHE", label: "Quy chế" },
  { value: "BIEN_BAN_HOP", label: "Biên bản họp" },
  { value: "HOP_DONG_DOI_TAC", label: "Hợp đồng đối tác" },
  { value: "HOP_DONG_DU_AN", label: "Hợp đồng dự án" },
  { value: "QUY_TRINH_NOI_BO", label: "Quy trình nội bộ" },
  { value: "KHAC", label: "Khác" },
];

const securityLevels = [
  { value: "", label: "Tất cả mức bảo mật" },
  { value: "PUBLIC", label: "Công khai" },
  { value: "INTERNAL", label: "Nội bộ" },
  { value: "CONFIDENTIAL", label: "Mật" },
  { value: "SECRET", label: "Tối mật" },
];

export default function DocumentsPage() {
  const router = useRouter();

  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [security, setSecurity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async function loadDocuments() {
    setLoading(true);
    setError("");

    const response = await gasFetch<DocumentListData>({
      path: "documents",
      method: "GET",
      params: {
        q,
        loai_van_ban: type,
        trang_thai: status,
        muc_do_bao_mat: security,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách văn bản.");
      return;
    }

    setItems(response.data.items || []);
  }, [q, security, status, type]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadDocuments();
    });
  }, [loadDocuments, router]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadDocuments();
  }

  const published = items.filter(
    (item) => item.trang_thai === "PUBLISHED",
  ).length;
  const draft = items.filter((item) => item.trang_thai === "DRAFT").length;
  const archived = items.filter(
    (item) => item.trang_thai === "ARCHIVED",
  ).length;
  const withVersion = items.filter((item) => item.latest_version).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                Documents
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Quản lý văn bản
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Quản lý hồ sơ văn bản, phiên bản file, phân quyền xem/sửa và gửi
                văn bản qua email.
              </p>
            </div>

            <Link
              href="/documents/create"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              + Tạo văn bản
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tổng văn bản"
            value={formatNumber(items.length)}
            subtitle="Văn bản đang hiển thị"
            icon="📄"
            tone="sky"
          />

          <StatCard
            title="Đã ban hành"
            value={formatNumber(published)}
            subtitle={`${formatNumber(draft)} bản nháp`}
            icon="✅"
            tone="teal"
          />

          <StatCard
            title="Có file"
            value={formatNumber(withVersion)}
            subtitle="Đã upload phiên bản"
            icon="📎"
            tone="gold"
          />

          <StatCard
            title="Lưu trữ"
            value={formatNumber(archived)}
            subtitle="Văn bản đã lưu trữ"
            icon="🗂️"
            tone="navy"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Lối tắt văn bản
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ModuleCard
                title="Tạo văn bản"
                description="Tạo hồ sơ văn bản mới trước khi upload file."
                href="/documents/create"
                icon="✍️"
                accent="from-sky-500 to-teal-400"
              />

              <ModuleCard
                title="Phân quyền"
                description="Gán quyền xem, sửa, duyệt hoặc chủ sở hữu văn bản."
                href="/documents/permissions"
                icon="🔐"
                accent="from-indigo-500 to-sky-400"
              />

              <ModuleCard
                title="Gửi email"
                description="Gửi văn bản mới nhất cho người nhận qua email."
                href="/documents/send"
                icon="✉️"
                accent="from-amber-500 to-orange-400"
              />

              <ModuleCard
                title="Dashboard"
                description="Xem thống kê văn bản ở trang tổng quan."
                href="/dashboard"
                icon="📈"
                accent="from-slate-700 to-slate-500"
              />
            </div>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Bộ lọc văn bản
            </h2>

            <form onSubmit={submitSearch} className="mt-5 grid gap-4">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Tìm theo mã, tên, loại văn bản..."
                className="fts-input"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="fts-input"
                >
                  {documentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="fts-input"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="PUBLISHED">Đã ban hành</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>

              <select
                value={security}
                onChange={(event) => setSecurity(event.target.value)}
                className="fts-input"
              >
                {securityLevels.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button className="flex-1 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600">
                  Tìm kiếm
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setType("");
                    setStatus("");
                    setSecurity("");
                    setTimeout(loadDocuments, 0);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              </div>
            </form>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock text="Đang tải danh sách văn bản..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách văn bản
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {items.length} văn bản.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Văn bản</th>
                    <th className="px-5 py-4">Loại</th>
                    <th className="px-5 py-4">Bảo mật</th>
                    <th className="px-5 py-4">Phiên bản</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Cập nhật</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((doc) => (
                    <tr key={doc.id} className="transition hover:bg-sky-50/50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {doc.ten_van_ban}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.ma_van_ban || doc.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {formatDocumentType(doc.loai_van_ban)}
                      </td>

                      <td className="px-5 py-4">
                        <SecurityBadge level={doc.muc_do_bao_mat} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {doc.latest_version ? (
                          <a
                            href={doc.latest_version.file_url}
                            target="_blank"
                            className="font-black text-sky-600 hover:text-sky-700"
                          >
                            v{doc.latest_version.so_phien_ban}
                          </a>
                        ) : (
                          <span className="text-slate-400">Chưa có file</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={doc.trang_thai} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {doc.updated_at || doc.ngay_tao || "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => router.push(`/documents/${doc.id}`)}
                          className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có văn bản phù hợp.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function formatDocumentType(type: string) {
  const map: Record<string, string> = {
    CONG_VAN: "Công văn",
    QUY_DINH: "Quy định",
    QUYET_DINH: "Quyết định",
    HUONG_DAN: "Hướng dẫn",
    THONG_BAO: "Thông báo",
    QUY_CHE: "Quy chế",
    BIEN_BAN_HOP: "Biên bản họp",
    HOP_DONG_DOI_TAC: "Hợp đồng đối tác",
    HOP_DONG_DU_AN: "Hợp đồng dự án",
    QUY_TRINH_NOI_BO: "Quy trình nội bộ",
    BBHT: "Biên bản hợp tác",
    HOP_DONG: "Hợp đồng",
    KHAC: "Khác",
  };

  return map[type] || type || "-";
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "PUBLISHED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "DRAFT"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "ARCHIVED"
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function SecurityBadge({ level }: { level?: string }) {
  const value = level || "INTERNAL";

  const className =
    value === "PUBLIC"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "INTERNAL"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : value === "CONFIDENTIAL"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : value === "SECRET"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
