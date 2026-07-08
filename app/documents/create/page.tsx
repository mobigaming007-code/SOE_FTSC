"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { CreateDocumentData } from "@/types/api";

const documentTypes = [
  { value: "CONG_VAN", label: "Công văn" },
  { value: "QUY_DINH", label: "Quy định" },
  { value: "QUYET_DINH", label: "Quyết định" },
  { value: "HUONG_DAN", label: "Hướng dẫn" },
  { value: "THONG_BAO", label: "Thông báo" },
  { value: "QUY_CHE", label: "Quy chế" },
  { value: "BIEN_BAN_HOP", label: "Biên bản họp" },
  { value: "HOP_DONG_DOI_TAC", label: "Hợp đồng đối tác" },
  { value: "HOP_DONG_DU_AN", label: "Hợp đồng dự án" },
  { value: "QUY_TRINH_NOI_BO", label: "Quy trình nội bộ" },
  { value: "BBHT", label: "Biên bản hợp tác" },
  { value: "HOP_DONG", label: "Hợp đồng" },
  { value: "KHAC", label: "Khác" },
];

export default function CreateDocumentPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    ma_van_ban: "",
    ten_van_ban: "",
    loai_van_ban: "CONG_VAN",
    org_unit_id: "",
    muc_do_bao_mat: "INTERNAL",
    trang_thai: "DRAFT",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    const response = await gasFetch<CreateDocumentData>({
      path: "documents/create",
      method: "POST",
      body: form,
    });

    setSubmitting(false);

    if (!response.success || !response.data?.document) {
      setError(response.message || "Không tạo được hồ sơ văn bản.");
      return;
    }

    router.push(`/documents/${response.data.document.id}`);
  }

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
            Create Document
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Tạo hồ sơ văn bản
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Tạo hồ sơ trước, sau đó upload file phiên bản tại trang chi tiết văn
            bản.
          </p>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <section className="fts-card rounded-[2rem] p-6">
          <h2 className="text-xl font-black text-slate-950">
            Thông tin văn bản
          </h2>

          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <InputField
              label="Mã văn bản"
              value={form.ma_van_ban}
              onChange={(value) => setForm({ ...form, ma_van_ban: value })}
              placeholder="VD: QD-001-2026, để trống hệ thống tự sinh"
            />

            <InputField
              label="Tên văn bản"
              value={form.ten_van_ban}
              onChange={(value) => setForm({ ...form, ten_van_ban: value })}
              placeholder="VD: Quy định chấm công nội bộ"
              required
            />

            <SelectField
              label="Loại văn bản"
              value={form.loai_van_ban}
              onChange={(value) => setForm({ ...form, loai_van_ban: value })}
              options={documentTypes}
            />

            <InputField
              label="Org Unit ID"
              value={form.org_unit_id}
              onChange={(value) => setForm({ ...form, org_unit_id: value })}
              placeholder="VD: ORG_COMPANY_TC_HC"
            />

            <SelectField
              label="Mức độ bảo mật"
              value={form.muc_do_bao_mat}
              onChange={(value) => setForm({ ...form, muc_do_bao_mat: value })}
              options={[
                { value: "PUBLIC", label: "Công khai" },
                { value: "INTERNAL", label: "Nội bộ" },
                { value: "CONFIDENTIAL", label: "Mật" },
                { value: "SECRET", label: "Tối mật" },
              ]}
            />

            <SelectField
              label="Trạng thái"
              value={form.trang_thai}
              onChange={(value) => setForm({ ...form, trang_thai: value })}
              options={[
                { value: "DRAFT", label: "Bản nháp" },
                { value: "PUBLISHED", label: "Đã ban hành" },
                { value: "ARCHIVED", label: "Lưu trữ" },
              ]}
            />

            <div className="md:col-span-2">
              <button
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
              >
                {submitting ? "Đang tạo..." : "Tạo hồ sơ văn bản"}
              </button>
            </div>
          </form>
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
