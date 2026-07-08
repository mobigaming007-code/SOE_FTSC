"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import StatCard from "@/components/StatCard";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import { patchById } from "@/lib/list-state";
import type {
  LeaveBalanceData,
  LeaveListData,
  LeaveRequest,
} from "@/types/api";

export default function EmployeeLeavePage() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalanceData["balance"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [requestResponse, balanceResponse] = await Promise.all([
      gasFetch<LeaveListData>({
        path: "leave/my",
        method: "GET",
      }),
      gasFetch<LeaveBalanceData>({
        path: "leave/balance",
        method: "GET",
        params: {
          nam: String(new Date().getFullYear()),
        },
      }),
    ]);

    setLoading(false);

    if (requestResponse.success && requestResponse.data) {
      setRequests(requestResponse.data.items || []);
    } else {
      setError(requestResponse.message || "Không tải được đơn nghỉ của tôi.");
    }

    if (balanceResponse.success && balanceResponse.data) {
      setBalance(balanceResponse.data.balance);
    }
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadData();
    });
  }, [router]);

  async function cancelLeave(request: LeaveRequest) {
    const reason = window.prompt(
      "Nhập lý do hủy đơn:",
      "Không còn nhu cầu nghỉ",
    );

    if (reason === null) return;

    setProcessingId(request.id);
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "leave/cancel",
      method: "POST",
      body: {
        leave_request_id: request.id,
        reason,
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không hủy được đơn nghỉ.");
      return;
    }

    setRequests((prev) =>
      patchById(prev, request.id, {
        trang_thai: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      }),
    );

    setNotice("Đã hủy đơn nghỉ.");
  }

  const pending = requests.filter(
    (item) => item.trang_thai === "PENDING",
  ).length;
  const approved = requests.filter(
    (item) => item.trang_thai === "APPROVED",
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                My Leave
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Nghỉ phép của tôi
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Tạo đơn nghỉ, theo dõi trạng thái duyệt và xem số dư phép năm.
              </p>
            </div>

            <Link
              href="/employee/leave/request"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              + Tạo đơn nghỉ
            </Link>
          </div>
        </section>

        {notice ? (
          <div className="rounded-3xl bg-teal-50 p-4 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
            {notice}
          </div>
        ) : null}

        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải nghỉ phép của tôi..." /> : null}

        {!loading ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng phép năm"
                value={formatNumber(balance?.tong_phep || 0)}
                subtitle="Số ngày phép được cấp"
                icon="PN"
                tone="sky"
              />

              <StatCard
                title="Còn lại"
                value={formatNumber(balance?.con_lai || 0)}
                subtitle={`${formatNumber(balance?.da_dung || 0)} ngày đã dùng`}
                icon="OK"
                tone="teal"
              />

              <StatCard
                title="Chờ duyệt"
                value={formatNumber(pending)}
                subtitle={`${formatNumber(balance?.dang_cho_duyet || 0)} ngày đang giữ chỗ`}
                icon="CL"
                tone="gold"
              />

              <StatCard
                title="Đã duyệt"
                value={formatNumber(approved)}
                subtitle="Đơn nghỉ đã được duyệt"
                icon="DD"
                tone="navy"
              />
            </section>

            <section className="fts-card overflow-hidden rounded-[2rem]">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Danh sách đơn nghỉ
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tổng cộng {requests.length} đơn.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Loại nghỉ</th>
                      <th className="px-5 py-4">Thời gian</th>
                      <th className="px-5 py-4">Số ngày</th>
                      <th className="px-5 py-4">Lý do</th>
                      <th className="px-5 py-4">Trạng thái</th>
                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {requests.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {item.loai_nghi}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.tu_ngay} → {item.den_ngay}
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {formatNumber(item.so_ngay)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.ly_do || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={item.trang_thai} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {["PENDING", "APPROVED"].includes(item.trang_thai) ? (
                            <button
                              disabled={processingId === item.id}
                              onClick={() => cancelLeave(item)}
                              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-60"
                            >
                              Hủy đơn
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {requests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Chưa có đơn nghỉ.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Badge({ value }: { value?: string }) {
  const text = value || "-";

  const className =
    text === "APPROVED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : text === "PENDING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : text === "REJECTED"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(text)}
    </span>
  );
}

