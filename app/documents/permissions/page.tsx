"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SetDocumentPermissionData } from "@/types/api";

export default function DocumentPermissionsPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    document_id: "",
    doi_tuong_type: "USER",
    doi_tuong_id: "",
    loai_quyen: "VIEW",
  });

  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setNotice("");
    setError("");

    const response = await gasFetch<SetDocumentPermissionData>({
      path: "documents/permissions/set",
      method: "POST",
      body: form,
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Không cập nhật được phân quyền.");
      return;
    }

    setNotice("Đã cập nhật phân quyền văn bản.");
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
            Document Permissions
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Phân quyền văn bản
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Gán quyền xem, sửa, duyệt hoặc chủ sở hữu cho người dùng, đơn vị
            hoặc vai trò.
          </p>
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

        <section className="fts-card rounded-[2rem] p-6">
          <h2 className="text-xl font-black text-slate-950">
            Thông tin phân quyền
          </h2>

          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <InputField
              label="Document ID"
              value={form.document_id}
              onChange={(value) => setForm({ ...form, document_id: value })}
              required
            />

            <SelectField
              label="Loại đối tượng"
              value={form.doi_tuong_type}
              onChange={(value) => setForm({ ...form, doi_tuong_type: value })}
              options={[
                { value: "USER", label: "Người dùng" },
                { value: "ORG_UNIT", label: "Đơn vị" },
                { value: "ROLE", label: "Vai trò" },
              ]}
            />

            <InputField
              label="ID đối tượng"
              value={form.doi_tuong_id}
              onChange={(value) => setForm({ ...form, doi_tuong_id: value })}
              placeholder="USER_ID / ORG_UNIT_ID / ROLE_CODE"
              required
            />

            <SelectField
              label="Loại quyền"
              value={form.loai_quyen}
              onChange={(value) => setForm({ ...form, loai_quyen: value })}
              options={[
                { value: "VIEW", label: "Xem" },
                { value: "EDIT", label: "Sửa" },
                { value: "APPROVE", label: "Duyệt/quản lý" },
                { value: "OWNER", label: "Chủ sở hữu" },
              ]}
            />

            <div className="md:col-span-2">
              <button
                disabled={processing}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
              >
                Cập nhật phân quyền
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
