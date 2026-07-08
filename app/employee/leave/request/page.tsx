"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmployeePicker, { formatPersonLabel } from "@/components/EmployeePicker";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type { CreateLeaveRequestData } from "@/types/api";

const leaveTypes = [
  { value: "PHEP_NAM", label: "Phép năm" },
  { value: "NGHI_KHONG_LUONG", label: "Nghỉ không lương" },
  { value: "CONG_TAC", label: "Công tác" },
  { value: "NGHI_OM", label: "Nghỉ ốm" },
  { value: "NGHI_CHE_DO", label: "Nghỉ chế độ" },
  { value: "NGHI_VIEC_RIENG", label: "Nghỉ việc riêng" },
  { value: "KHAC", label: "Khác" },
];

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

export default function LeaveRequestPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    loai_nghi: "PHEP_NAM",
    tu_ngay: "",
    den_ngay: "",
    buoi_tu: "FULL",
    buoi_den: "FULL",
    ly_do: "",
    nguoi_ban_giao: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateLeaveRequestData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      const today = todayText();

      setForm((prev) => ({
        ...prev,
        tu_ngay: prev.tu_ngay || today,
        den_ngay: prev.den_ngay || today,
      }));
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setCreated(null);

    const response = await gasFetch<CreateLeaveRequestData>({
      path: "leave/request",
      method: "POST",
      body: form,
    });

    setSubmitting(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tạo được đơn nghỉ.");
      return;
    }

    setCreated(response.data);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/employee/leave")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại nghỉ phép
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Leave Request
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Tạo đơn nghỉ / xin phép
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Điền thông tin nghỉ phép. Với loại Phép năm, hệ thống sẽ kiểm tra số
            dư phép còn lại.
          </p>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {created ? (
          <div className="rounded-3xl bg-teal-50 p-5 ring-1 ring-teal-100">
            <p className="text-sm font-black text-teal-700">
              Tạo đơn nghỉ thành công.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Mã đơn: <b>{created.leave_request.id}</b>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Trạng thái: <b>{formatStatus(created.leave_request.trang_thai)}</b>
            </p>

            {created.balance ? (
              <p className="mt-1 text-sm text-slate-600">
                Phép còn lại: <b>{formatNumber(created.balance.con_lai)}</b>{" "}
                ngày
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/employee/leave")}
                className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-black text-white"
              >
                Xem danh sách đơn
              </button>

              <button
                onClick={() => setCreated(null)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-teal-700 ring-1 ring-teal-100"
              >
                Tạo đơn khác
              </button>
            </div>
          </div>
        ) : null}

        <section className="fts-card rounded-[2rem] p-6">
          <h2 className="text-xl font-black text-slate-950">
            Thông tin đơn nghỉ
          </h2>

          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <SelectField
              label="Loại nghỉ"
              value={form.loai_nghi}
              onChange={(value) => setForm({ ...form, loai_nghi: value })}
              options={leaveTypes}
            />

            <EmployeePicker
              label="Người bàn giao"
              value={form.nguoi_ban_giao}
              onChange={(value, person) =>
                setForm({
                  ...form,
                  nguoi_ban_giao: person ? formatPersonLabel(person) : value,
                })
              }
              helperText="Nhập họ tên, số điện thoại hoặc mã định danh để chọn người nhận bàn giao."
            />

            <InputField
              label="Từ ngày"
              type="date"
              value={form.tu_ngay}
              onChange={(value) => setForm({ ...form, tu_ngay: value })}
              required
            />

            <InputField
              label="Đến ngày"
              type="date"
              value={form.den_ngay}
              onChange={(value) => setForm({ ...form, den_ngay: value })}
              required
            />

            <SelectField
              label="Buổi bắt đầu"
              value={form.buoi_tu}
              onChange={(value) => setForm({ ...form, buoi_tu: value })}
              options={[
                { value: "FULL", label: "Cả ngày" },
                { value: "AM", label: "Buổi sáng" },
                { value: "PM", label: "Buổi chiều" },
              ]}
            />

            <SelectField
              label="Buổi kết thúc"
              value={form.buoi_den}
              onChange={(value) => setForm({ ...form, buoi_den: value })}
              options={[
                { value: "FULL", label: "Cả ngày" },
                { value: "AM", label: "Buổi sáng" },
                { value: "PM", label: "Buổi chiều" },
              ]}
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Lý do
              </label>
              <textarea
                required
                value={form.ly_do}
                onChange={(event) =>
                  setForm({ ...form, ly_do: event.target.value })
                }
                rows={5}
                className="fts-input"
                placeholder="Nhập lý do nghỉ / xin phép..."
              />
            </div>

            <div className="md:col-span-2">
              <button
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
              >
                {submitting ? "Đang gửi đơn..." : "Gửi đơn nghỉ"}
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
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
        type={type}
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

