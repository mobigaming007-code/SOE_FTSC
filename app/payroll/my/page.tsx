"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatPayrollItemType, formatStatus } from "@/lib/labels";
import type { Payslip, PayslipDetailData, PayslipListData } from "@/types/api";

export default function MyPayslipsPage() {
  const router = useRouter();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [detail, setDetail] = useState<PayslipDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMyPayslips() {
    setLoading(true);
    setError("");

    const response = await gasFetch<PayslipListData>({
      path: "payroll/payslips/my",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được phiếu lương của tôi.");
      return;
    }

    setPayslips(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadMyPayslips();
    });
  }, [router]);

  async function openDetail(payslipId: string) {
    setDetailLoading(true);
    setError("");
    setDetail(null);

    const response = await gasFetch<PayslipDetailData>({
      path: "payroll/payslips/detail",
      method: "GET",
      params: {
        id: payslipId,
      },
    });

    setDetailLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được chi tiết phiếu lương.");
      return;
    }

    setDetail(response.data);
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
            My Payslips
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Phiếu lương của tôi
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Xem các phiếu lương cá nhân đã được hệ thống tạo.
          </p>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock text="Đang tải phiếu lương..." />
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payslips.map((payslip) => (
              <div key={payslip.id} className="fts-card rounded-[2rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-sky-600">
                      Phiếu lương
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      {formatCurrency(payslip.thuc_nhan_encrypted)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Công: {formatNumber(payslip.tong_cong)}
                    </p>
                  </div>

                  <StatusBadge status={payslip.trang_thai} />
                </div>

                <div className="mt-5 space-y-2 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <MiniRow
                    label="Lương cơ bản"
                    value={formatCurrency(payslip.luong_co_ban_encrypted)}
                  />
                  <MiniRow
                    label="Phụ cấp"
                    value={formatCurrency(payslip.phu_cap)}
                  />
                  <MiniRow
                    label="Thưởng/OT"
                    value={formatCurrency(
                      Number(payslip.thuong || 0) + Number(payslip.ot || 0),
                    )}
                  />
                  <MiniRow
                    label="Khấu trừ"
                    value={formatCurrency(payslip.khau_tru)}
                  />
                </div>

                <button
                  onClick={() => openDetail(payslip.id)}
                  className="mt-5 w-full rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                >
                  Xem chi tiết
                </button>
              </div>
            ))}

            {payslips.length === 0 ? (
              <div className="fts-card rounded-[2rem] p-8 text-center md:col-span-2 xl:col-span-3">
                <p className="text-sm font-semibold text-slate-500">
                  Chưa có phiếu lương nào.
                </p>
              </div>
            ) : null}
          </section>
        )}

        {detail || detailLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-sky-600">
                    Chi tiết phiếu lương
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {detail?.payroll_period
                      ? `Tháng ${detail.payroll_period.thang}/${detail.payroll_period.nam}`
                      : "Đang tải..."}
                  </h2>
                </div>

                <button
                  onClick={() => setDetail(null)}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"
                >
                  Đóng
                </button>
              </div>

              {detailLoading ? (
                <LoadingBlock text="Đang tải chi tiết..." />
              ) : detail ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <InfoBox
                      label="Công"
                      value={formatNumber(detail.payslip.tong_cong)}
                    />
                    <InfoBox
                      label="Phụ cấp"
                      value={formatCurrency(detail.payslip.phu_cap)}
                    />
                    <InfoBox
                      label="Khấu trừ"
                      value={formatCurrency(detail.payslip.khau_tru)}
                    />
                    <InfoBox
                      label="Thực nhận"
                      value={formatCurrency(detail.payslip.thuc_nhan_encrypted)}
                    />
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Loại khoản</th>
                          <th className="px-4 py-3">Tên khoản</th>
                          <th className="px-4 py-3">Số tiền</th>
                          <th className="px-4 py-3">Ghi chú</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {detail.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm font-bold text-slate-700">
                              {formatPayrollItemType(item.loai_khoan)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {item.ten_khoan}
                            </td>
                            <td className="px-4 py-3 text-sm font-black text-slate-950">
                              {formatCurrency(item.so_tien)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {item.ghi_chu || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "FINALIZED" || value === "SENT"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "CALCULATED"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
