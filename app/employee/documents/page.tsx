"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { DocumentListData, DocumentRecord } from "@/types/api";

const documentTypes = [
  { value: "", label: "Tất cả loại văn bản" },
  { value: "CONG_VAN", label: "Công văn" },
  { value: "QUY_DINH", label: "Quy định" },
  { value: "QUYET_DINH", label: "Quyết định" },
  { value: "HUONG_DAN", label: "Hướng dẫn" },
  { value: "THONG_BAO", label: "Thông báo" },
  { value: "QUY_CHE", label: "Quy chế" },
  { value: "BIEN_BAN_HOP", label: "Biên bản họp" },
  { value: "HOP_DONG", label: "Hợp đồng" },
  { value: "QUY_TRINH_NOI_BO", label: "Quy trình nội bộ" },
  { value: "KHAC", label: "Khác" },
];

const fileFilters = [
  { value: "", label: "Tất cả file" },
  { value: "WITH_FILE", label: "Có file" },
  { value: "NO_FILE", label: "Chưa có file" },
];

export default function EmployeeDocumentsPage() {
  const router = useRouter();

  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [fileFilter, setFileFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async function loadDocuments() {
    setLoading(true);
    setError("");

    const response = await gasFetch<DocumentListData>({
      path: "employee/documents",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được văn bản của tôi.");
      return;
    }

    setItems(response.data.items || []);
  }, []);

  const orgOptions = useMemo(() => {
    const ids = Array.from(
      new Set(items.map((item) => item.org_unit_id).filter(Boolean)),
    );

    return ids.map((id) => ({ value: id, label: id }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return items.filter((doc) => {
      if (keyword) {
        const text = [
          doc.ma_van_ban,
          doc.ten_van_ban,
          doc.loai_van_ban,
          doc.org_unit_id,
        ]
          .join(" ")
          .toLowerCase();

        if (!text.includes(keyword)) {
          return false;
        }
      }

      if (type && doc.loai_van_ban !== type) {
        return false;
      }

      if (orgUnitId && doc.org_unit_id !== orgUnitId) {
        return false;
      }

      if (fileFilter === "WITH_FILE" && !doc.latest_version?.file_url) {
        return false;
      }

      if (fileFilter === "NO_FILE" && doc.latest_version?.file_url) {
        return false;
      }

      return true;
    });
  }, [fileFilter, items, orgUnitId, q, type]);

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
  }

  function clearFilters() {
    setQ("");
    setType("");
    setOrgUnitId("");
    setFileFilter("");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            My Documents
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Văn bản của tôi
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Xem các văn bản công khai đã ban hành dành cho nhân viên.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black text-slate-950">
              Bộ lọc văn bản
            </h2>
            <p className="text-sm text-slate-500">
              Đang hiển thị {filteredItems.length}/{items.length} văn bản được phép xem.
            </p>
          </div>

          <form onSubmit={submitSearch} className="mt-5 grid gap-4">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm theo mã, tên, loại văn bản, đơn vị..."
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
                value={orgUnitId}
                onChange={(event) => setOrgUnitId(event.target.value)}
                className="fts-input"
              >
                <option value="">Tất cả đơn vị</option>
                {orgOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={fileFilter}
                onChange={(event) => setFileFilter(event.target.value)}
                className="fts-input"
              >
                {fileFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="fts-button-primary sm:flex-1">
                Lọc văn bản
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={loadDocuments}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
              >
                Tải lại
              </button>
            </div>
          </form>
        </section>

        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải văn bản..." /> : null}

        {!loading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((doc) => (
              <div key={doc.id} className="fts-card rounded-[2rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-sky-600">
                      {formatDocumentType(doc.loai_van_ban)}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-xl font-black text-slate-950">
                      {doc.ten_van_ban}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {doc.ma_van_ban || doc.id}
                    </p>
                  </div>

                  <Badge value={doc.muc_do_bao_mat} />
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  Cập nhật: {doc.updated_at || doc.ngay_tao || "-"}
                </p>

                {doc.latest_version?.file_url ? (
                  <a
                    href={doc.latest_version.file_url}
                    target="_blank"
                    className="mt-5 inline-flex w-full justify-center rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                  >
                    Mở file văn bản
                  </a>
                ) : (
                  <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                    Chưa có file
                  </div>
                )}
              </div>
            ))}

            {filteredItems.length === 0 ? (
              <div className="fts-card rounded-[2rem] p-8 text-center md:col-span-2 xl:col-span-3">
                <p className="text-sm font-semibold text-slate-500">
                  Chưa có văn bản phù hợp.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatDocumentType(type?: string) {
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

  return map[type || ""] || type || "-";
}

function Badge({ value }: { value?: string }) {
  const text = value || "INTERNAL";

  const className =
    text === "PUBLIC"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : text === "INTERNAL"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : text === "CONFIDENTIAL"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-rose-50 text-rose-700 ring-rose-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(text)}
    </span>
  );
}
