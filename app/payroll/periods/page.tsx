"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type {
  CreatePayrollPeriodData,
  PayrollPeriod,
  PayrollPeriodListData,
  UpdatePayrollPeriodStatusData,
} from "@/types/api";

const defaultForm = {
  thang: "",
  nam: "",
  tu_ngay: "",
  den_ngay: "",
  ghi_chu: "",
};

function currentYearText() {
  return String(new Date().getFullYear());
}

function monthRange(year: string, month: string) {
  const m = String(month).padStart(2, "0");
  const last = new Date(Number(year), Number(month), 0).getDate();

  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${String(last).padStart(2, "0")}`,
  };
}

export default function PayrollPeriodsPage() {
  const router = useRouter();

  const [year, setYear] = useState("");
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPeriods = useCallback(async function loadPeriods(targetYear: string) {
    setLoading(true);
    setError("");

    const response = await gasFetch<PayrollPeriodListData>({
      path: "payroll/periods",
      method: "GET",
      params: {
        nam: targetYear,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được kỳ lương.");
      return;
    }

    setPeriods(response.data.items || []);
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const y = currentYearText();
    queueMicrotask(() => {
      setYear(y);
      setForm((prev) => ({
        ...prev,
        nam: y,
      }));
      loadPeriods(y);
    });
  }, [loadPeriods, router]);

  function updateMonth(month: string) {
    const range = form.nam ? monthRange(form.nam, month) : { from: "", to: "" };

    setForm({
      ...form,
      thang: month,
      tu_ngay: range.from,
      den_ngay: range.to,
    });
  }

  function updateYear(newYear: string) {
    const range = form.thang
      ? monthRange(newYear, form.thang)
      : { from: "", to: "" };

    setForm({
      ...form,
      nam: newYear,
      tu_ngay: range.from,
      den_ngay: range.to,
    });
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setNotice("");

    const response = await gasFetch<CreatePayrollPeriodData>({
      path: "payroll/periods/create",
      method: "POST",
      body: form,
    });

    setCreating(false);

    if (!response.success) {
      setError(response.message || "Không tạo được kỳ lương.");
      return;
    }

    setNotice("Đã tạo kỳ lương.");
    setForm({
      ...defaultForm,
      nam: year,
    });

    if (response.data?.payroll_period) {
      setPeriods((current) => [response.data!.payroll_period, ...current]);
    }
  }

  async function updateStatus(
    period: PayrollPeriod,
    status: "FINALIZED" | "CLOSED" | "DRAFT",
  ) {
    setProcessingId(period.id);
    setError("");
    setNotice("");

    const response = await gasFetch<UpdatePayrollPeriodStatusData>({
      path: "payroll/periods/status",
      method: "POST",
      body: {
        payroll_period_id: period.id,
        trang_thai: status,
        ghi_chu: period.ghi_chu || "",
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không cập nhật được kỳ lương.");
      return;
    }

    setNotice(`Đã cập nhật kỳ lương sang ${status}.`);

    if (response.data?.payroll_period) {
      setPeriods((current) =>
        current.map((item) =>
          item.id === response.data!.payroll_period.id
            ? response.data!.payroll_period
            : item,
        ),
      );
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/payroll")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại lương
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Payroll Periods
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Kỳ lương
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Tạo kỳ lương theo tháng, theo dõi trạng thái và chốt kỳ để lưu trữ
            bảng lương từng tháng.
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
            <h2 className="text-xl font-black text-slate-950">Tạo kỳ lương</h2>

            <form
              onSubmit={createPeriod}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <InputField
                label="Tháng"
                value={form.thang}
                onChange={updateMonth}
                placeholder="7"
                required
              />

              <InputField
                label="Năm"
                value={form.nam}
                onChange={updateYear}
                placeholder="2026"
                required
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

              <div className="md:col-span-2">
                <InputField
                  label="Ghi chú"
                  value={form.ghi_chu}
                  onChange={(value) => setForm({ ...form, ghi_chu: value })}
                  placeholder="VD: Kỳ lương tháng 7/2026"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  disabled={creating}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  {creating ? "Đang tạo..." : "Tạo kỳ lương"}
                </button>
              </div>
            </form>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">Lọc kỳ lương</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <InputField
                label="Năm"
                value={year}
                onChange={setYear}
                placeholder="2026"
              />

              <div className="flex items-end">
                <button
                  onClick={() => loadPeriods(year)}
                  className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 md:w-auto"
                >
                  Tải danh sách
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-sky-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-sky-100">
              Trạng thái nên dùng: <b>DRAFT</b> khi mới tạo, <b>CALCULATED</b>{" "}
              sau khi xuất bảng lương, <b>FINALIZED</b> khi đã chốt và lưu trữ.
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingBlock text="Đang tải kỳ lương..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách kỳ lương
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {periods.length} kỳ.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Kỳ</th>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Ngày tạo</th>
                    <th className="px-5 py-4">Ngày chốt</th>
                    <th className="px-5 py-4">Ghi chú</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          Tháng {period.thang}/{period.nam}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {period.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {period.tu_ngay} → {period.den_ngay}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={period.trang_thai} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {period.ngay_tao || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {period.ngay_chot || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {period.ghi_chu || "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/payroll/payslips?period=${period.id}`}
                            className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100"
                          >
                            Phiếu
                          </a>

                          <button
                            disabled={processingId === period.id}
                            onClick={() => updateStatus(period, "FINALIZED")}
                            className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 ring-1 ring-teal-100 disabled:opacity-60"
                          >
                            Chốt
                          </button>

                          <button
                            disabled={processingId === period.id}
                            onClick={() => updateStatus(period, "DRAFT")}
                            className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100 disabled:opacity-60"
                          >
                            Mở
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {periods.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có kỳ lương.
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

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "FINALIZED" || value === "CLOSED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "CALCULATED"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : value === "DRAFT"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
