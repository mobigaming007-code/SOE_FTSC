"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type {
  SystemConfig,
  SystemConfigListData,
  UpdateSystemConfigData,
} from "@/types/api";

const defaultForm = {
  key: "",
  value: "",
  value_type: "STRING",
  group: "GENERAL",
  description: "",
  is_secret: "FALSE",
};

export default function AdminConfigPage() {
  const router = useRouter();

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [group, setGroup] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadConfigs(targetGroup = group) {
    setLoading(true);
    setError("");

    const response = await gasFetch<SystemConfigListData>({
      path: "admin/config",
      method: "GET",
      params: {
        group: targetGroup,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được cấu hình hệ thống.");
      return;
    }

    setConfigs(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    loadConfigs("");
  }, []);

  function editConfig(config: SystemConfig) {
    setForm({
      key: config.key || "",
      value: config.value === "********" ? "" : config.value || "",
      value_type: config.value_type || "STRING",
      group: config.group || "GENERAL",
      description: config.description || "",
      is_secret: config.is_secret || "FALSE",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    const response = await gasFetch<UpdateSystemConfigData>({
      path: "admin/config/update",
      method: "POST",
      body: form,
    });

    setSaving(false);

    if (!response.success) {
      setError(response.message || "Không lưu được cấu hình.");
      return;
    }

    setNotice("Đã lưu cấu hình hệ thống.");
    setForm(defaultForm);
    loadConfigs(group);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại Admin
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            System Config
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Cấu hình hệ thống
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Quản lý SystemConfig dùng cho QR, nghỉ phép, lương, văn bản,
            dashboard và các phân hệ khác.
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

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Thêm / cập nhật cấu hình
            </h2>

            <form onSubmit={saveConfig} className="mt-5 grid gap-4">
              <InputField
                label="Key"
                value={form.key}
                onChange={(value) => setForm({ ...form, key: value })}
                placeholder="VD: QR_EXPIRE_SECONDS"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Value
                </label>
                <textarea
                  value={form.value}
                  onChange={(event) =>
                    setForm({ ...form, value: event.target.value })
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Giá trị cấu hình"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Value type"
                  value={form.value_type}
                  onChange={(value) => setForm({ ...form, value_type: value })}
                  options={[
                    { value: "STRING", label: "STRING" },
                    { value: "NUMBER", label: "NUMBER" },
                    { value: "BOOLEAN", label: "BOOLEAN" },
                    { value: "JSON", label: "JSON" },
                  ]}
                />

                <InputField
                  label="Group"
                  value={form.group}
                  onChange={(value) => setForm({ ...form, group: value })}
                  placeholder="GENERAL / PAYROLL / DOCUMENTS"
                />
              </div>

              <InputField
                label="Description"
                value={form.description}
                onChange={(value) => setForm({ ...form, description: value })}
                placeholder="Mô tả cấu hình"
              />

              <SelectField
                label="Is secret"
                value={form.is_secret}
                onChange={(value) => setForm({ ...form, is_secret: value })}
                options={[
                  { value: "FALSE", label: "Không" },
                  { value: "TRUE", label: "Có" },
                ]}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </button>

                <button
                  type="button"
                  onClick={() => setForm(defaultForm)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Làm mới form
                </button>
              </div>
            </form>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">Lọc cấu hình</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <InputField
                label="Group"
                value={group}
                onChange={setGroup}
                placeholder="Để trống để xem tất cả"
              />

              <div className="flex items-end">
                <button
                  onClick={() => loadConfigs(group)}
                  className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 md:w-auto"
                >
                  Tải cấu hình
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-sky-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-sky-100">
              Cấu hình có `is_secret = TRUE` sẽ được backend trả về dạng
              `********`. Khi cập nhật secret, hãy nhập lại giá trị mới.
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingBlock text="Đang tải cấu hình..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách SystemConfig
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {configs.length} cấu hình.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Key</th>
                    <th className="px-5 py-4">Value</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Group</th>
                    <th className="px-5 py-4">Secret</th>
                    <th className="px-5 py-4">Cập nhật</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {configs.map((config) => (
                    <tr key={config.key}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {config.key}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {config.description || "-"}
                        </p>
                      </td>

                      <td className="max-w-[320px] px-5 py-4">
                        <div className="max-h-24 overflow-auto rounded-2xl bg-slate-50 p-3 font-mono text-xs text-slate-600 ring-1 ring-slate-100">
                          {config.value || ""}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {config.value_type}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                          {config.group || "GENERAL"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {config.is_secret}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {config.updated_at || "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => editConfig(config)}
                          className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}

                  {configs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có cấu hình phù hợp.
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
