"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmployeePicker from "@/components/EmployeePicker";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { Payslip, PayslipListData } from "@/types/api";

function formatEmployeeLabel(item: Payslip) {
  const name = item.ho_ten || item.ten_nhan_su || "";
  const code = item.ma_dinh_danh || "";

  if (name && code) {
    return `${name} - ${code}`;
  }

  return name || code || item.person_id;
}

export default function PayrollPayslipsPage() {
  return (
    <Suspense fallback={<PayrollPayslipsFallback />}>
      <PayrollPayslipsContent />
    </Suspense>
  );
}

function PayrollPayslipsFallback() {
  return (
    <AppShell>
      <LoadingBlock text="Đang tải phiếu lương..." />
    </AppShell>
  );
}

function PayrollPayslipsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [periodId, setPeriodId] = useState(searchParams.get("period") || "");
  const [personId, setPersonId] = useState(searchParams.get("person_id") || "");
  const [items, setItems] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayslips = useCallback(async function loadPayslips(
    targetPeriod = periodId,
    targetPerson = personId,
  ) {
    setLoading(true);
    setError("");

    const response = await gasFetch<PayslipListData>({
      path: "payroll/payslips",
      method: "GET",
      params: {
        payroll_period_id: targetPeriod,
        person_id: targetPerson,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách phiếu lương.");
      return;
    }

    setItems(response.data.items || []);
  }, [periodId, personId]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadPayslips(periodId, personId);
    });
  }, [loadPayslips, periodId, personId, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadPayslips(periodId, personId);
  }

  const totalNetPay = items.reduce(
    (sum, item) => sum + Number(item.thuc_nhan_encrypted || 0),
    0,
  );

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
            Payroll Archive
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Lưu trữ phiếu lương
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Xem bảng lương đã xuất theo từng kỳ tháng, từng nhân viên và trạng thái
            phiếu lương.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Payroll Period ID
              </label>
              <input
                value={periodId}
                onChange={(event) => setPeriodId(event.target.value)}
                placeholder="Để trống để xem tất cả kỳ"
                className="fts-input"
              />
            </div>

            <div>
              <EmployeePicker
                label="Nhân viên"
                value={personId}
                onChange={setPersonId}
                helperText="Để trống để xem toàn bộ nhân viên."
              />
            </div>

            <div className="flex items-end">
              <button className="fts-button-primary w-full md:w-auto">
                Tải danh sách
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryBox label="Tổng phiếu" value={formatNumber(items.length)} />
          <SummaryBox label="Tổng thực nhận" value={formatCurrency(totalNetPay)} />
          <SummaryBox
            label="Kỳ đang lọc"
            value={periodId || "Tất cả kỳ"}
          />
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock text="Đang tải phiếu lương..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách phiếu lương
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Dữ liệu được lưu theo kỳ lương tháng sau khi xuất bảng lương.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Nhân viên</th>
                    <th className="px-5 py-4">Kỳ lương</th>
                    <th className="px-5 py-4">Công</th>
                    <th className="px-5 py-4">Phụ cấp</th>
                    <th className="px-5 py-4">OT</th>
                    <th className="px-5 py-4">Thưởng</th>
                    <th className="px-5 py-4">Khấu trừ</th>
                    <th className="px-5 py-4">Thực nhận</th>
                    <th className="px-5 py-4">Trạng thái</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {formatEmployeeLabel(item)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.person_id} · {item.id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.payroll_period_id}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {formatNumber(item.tong_cong)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatCurrency(item.phu_cap)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatCurrency(item.ot)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatCurrency(item.thuong)}
                      </td>
                      <td className="px-5 py-4 text-sm text-rose-600">
                        {formatCurrency(item.khau_tru)}
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {formatCurrency(item.thuc_nhan_encrypted)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.trang_thai} />
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Chưa có phiếu lương phù hợp.
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

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="fts-card rounded-[2rem] p-5">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";
  const className =
    value === "FINALIZED" || value === "SENT"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "DRAFT"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {formatStatus(value)}
    </span>
  );
}
