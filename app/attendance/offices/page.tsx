"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { CreateOfficeData, Office, OfficeListData } from "@/types/api";
import { prependUniqueById } from "@/lib/list-state";

const defaultForm = {
  ma_diem: "",
  ten_diem: "",
  org_unit_id: "",
  dia_chi: "",
  lat: "",
  lng: "",
  ban_kinh_gps_m: "150",
};

export default function AttendanceOfficesPage() {
  const router = useRouter();

  const [offices, setOffices] = useState<Office[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOffices() {
    setLoading(true);
    setError("");

    const response = await gasFetch<OfficeListData>({
      path: "attendance/offices",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được địa điểm chấm công.");
      return;
    }

    setOffices(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadOffices();
    });
  }, [router]);

  async function createOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setNotice("");

    const response = await gasFetch<CreateOfficeData>({
      path: "attendance/offices/create",
      method: "POST",
      body: {
        ...form,
        trang_thai: "ACTIVE",
      },
    });

    setCreating(false);

    if (!response.success) {
      setError(response.message || "Không tạo được địa điểm.");
      return;
    }

    const newOffice = response.data?.office;

    if (newOffice) {
      setOffices((prev) => prependUniqueById(prev, newOffice));
    }

    setNotice("Đã tạo địa điểm chấm công.");
    setForm(defaultForm);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/attendance")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại chấm công
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Offices
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Địa điểm chấm công
          </h1>
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
            <h2 className="text-xl font-black text-slate-950">Tạo địa điểm</h2>

            <form
              onSubmit={createOffice}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <InputField
                label="Mã điểm"
                value={form.ma_diem}
                onChange={(value) => setForm({ ...form, ma_diem: value })}
                required
              />

              <InputField
                label="Tên điểm"
                value={form.ten_diem}
                onChange={(value) => setForm({ ...form, ten_diem: value })}
                required
              />

              <InputField
                label="Org Unit ID"
                value={form.org_unit_id}
                onChange={(value) => setForm({ ...form, org_unit_id: value })}
                placeholder="VD: ORG_COMPANY_TC_HC"
              />

              <InputField
                label="Địa chỉ"
                value={form.dia_chi}
                onChange={(value) => setForm({ ...form, dia_chi: value })}
              />

              <InputField
                label="Latitude"
                value={form.lat}
                onChange={(value) => setForm({ ...form, lat: value })}
              />

              <InputField
                label="Longitude"
                value={form.lng}
                onChange={(value) => setForm({ ...form, lng: value })}
              />

              <InputField
                label="Bán kính GPS mét"
                value={form.ban_kinh_gps_m}
                onChange={(value) =>
                  setForm({ ...form, ban_kinh_gps_m: value })
                }
              />

              <div className="flex items-end">
                <button
                  disabled={creating}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  {creating ? "Đang tạo..." : "Tạo địa điểm"}
                </button>
              </div>
            </form>
          </div>

          <div className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách địa điểm
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {offices.length} địa điểm.
              </p>
            </div>

            {loading ? (
              <div className="p-5">
                <LoadingBlock text="Đang tải địa điểm..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Mã điểm</th>
                      <th className="px-5 py-4">Tên điểm</th>
                      <th className="px-5 py-4">Tọa độ</th>
                      <th className="px-5 py-4">Bán kính</th>
                      <th className="px-5 py-4">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {offices.map((office) => (
                      <tr key={office.id}>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {office.ma_diem}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-700">
                            {office.ten_diem}
                          </p>
                          <p className="text-xs text-slate-500">
                            {office.dia_chi || "-"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {office.lat}, {office.lng}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {office.ban_kinh_gps_m}m
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={office.trang_thai} />
                        </td>
                      </tr>
                    ))}

                    {offices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có địa điểm.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "ACTIVE"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
