"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { CreateShiftData, ShiftListData, WorkShift } from "@/types/api";
import { prependUniqueById } from "@/lib/list-state";

const defaultForm = {
  ma_ca: "",
  ten_ca: "",
  org_unit_id: "",
  gio_bat_dau: "08:00",
  gio_ket_thuc: "17:00",
  gio_checkin_som_nhat: "07:00",
  gio_checkin_muon_nhat: "08:30",
  gio_checkout_som_nhat: "16:30",
  gio_checkout_muon_nhat: "18:00",
  so_cong: "1",
};

export default function AttendanceShiftsPage() {
  const router = useRouter();

  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadShifts() {
    setLoading(true);
    setError("");

    const response = await gasFetch<ShiftListData>({
      path: "attendance/shifts",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được ca làm.");
      return;
    }

    setShifts(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadShifts();
    });
  }, [router]);

  async function createShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setNotice("");

    const response = await gasFetch<CreateShiftData>({
      path: "attendance/shifts/create",
      method: "POST",
      body: {
        ...form,
        trang_thai: "ACTIVE",
      },
    });

    setCreating(false);

    if (!response.success) {
      setError(response.message || "Không tạo được ca làm.");
      return;
    }

    setNotice("Đã tạo ca làm.");
    setForm(defaultForm);

    if (response.data?.shift) {
      setShifts((current) => prependUniqueById(current, response.data!.shift));
    }
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
            Work Shifts
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Ca làm việc
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
            <h2 className="text-xl font-black text-slate-950">Tạo ca làm</h2>

            <form
              onSubmit={createShift}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <InputField
                label="Mã ca"
                value={form.ma_ca}
                onChange={(value) => setForm({ ...form, ma_ca: value })}
                required
              />

              <InputField
                label="Tên ca"
                value={form.ten_ca}
                onChange={(value) => setForm({ ...form, ten_ca: value })}
                required
              />

              <InputField
                label="Org Unit ID"
                value={form.org_unit_id}
                onChange={(value) => setForm({ ...form, org_unit_id: value })}
                placeholder="Để trống nếu dùng chung"
              />

              <InputField
                label="Số công"
                value={form.so_cong}
                onChange={(value) => setForm({ ...form, so_cong: value })}
              />

              <InputField
                label="Giờ bắt đầu"
                type="time"
                value={form.gio_bat_dau}
                onChange={(value) => setForm({ ...form, gio_bat_dau: value })}
              />

              <InputField
                label="Giờ kết thúc"
                type="time"
                value={form.gio_ket_thuc}
                onChange={(value) => setForm({ ...form, gio_ket_thuc: value })}
              />

              <InputField
                label="Check-in sớm nhất"
                type="time"
                value={form.gio_checkin_som_nhat}
                onChange={(value) =>
                  setForm({ ...form, gio_checkin_som_nhat: value })
                }
              />

              <InputField
                label="Check-in muộn nhất"
                type="time"
                value={form.gio_checkin_muon_nhat}
                onChange={(value) =>
                  setForm({ ...form, gio_checkin_muon_nhat: value })
                }
              />

              <InputField
                label="Check-out sớm nhất"
                type="time"
                value={form.gio_checkout_som_nhat}
                onChange={(value) =>
                  setForm({ ...form, gio_checkout_som_nhat: value })
                }
              />

              <InputField
                label="Check-out muộn nhất"
                type="time"
                value={form.gio_checkout_muon_nhat}
                onChange={(value) =>
                  setForm({ ...form, gio_checkout_muon_nhat: value })
                }
              />

              <div className="md:col-span-2">
                <button
                  disabled={creating}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  {creating ? "Đang tạo..." : "Tạo ca làm"}
                </button>
              </div>
            </form>
          </div>

          <div className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách ca
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {shifts.length} ca làm.
              </p>
            </div>

            {loading ? (
              <div className="p-5">
                <LoadingBlock text="Đang tải ca làm..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Mã ca</th>
                      <th className="px-5 py-4">Tên ca</th>
                      <th className="px-5 py-4">Thời gian</th>
                      <th className="px-5 py-4">Cửa chấm công</th>
                      <th className="px-5 py-4">Số công</th>
                      <th className="px-5 py-4">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {shift.ma_ca}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">
                          {shift.ten_ca}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {shift.gio_bat_dau} - {shift.gio_ket_thuc}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          IN: {shift.gio_checkin_som_nhat} -{" "}
                          {shift.gio_checkin_muon_nhat}
                          <br />
                          OUT: {shift.gio_checkout_som_nhat} -{" "}
                          {shift.gio_checkout_muon_nhat}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {shift.so_cong}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={shift.trang_thai} />
                        </td>
                      </tr>
                    ))}

                    {shifts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có ca làm.
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        required={required}
        type={type}
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
