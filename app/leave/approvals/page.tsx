"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { formatStatus } from "@/lib/labels";
import type {
  ApproveLeaveData,
  LeaveListData,
  LeaveRequest,
} from "@/types/api";

function formatEmployeeLabel(item: LeaveRequest) {
  const name = item.ho_ten || item.ten_nhan_su || "";
  const code = item.ma_dinh_danh || "";

  if (name && code) {
    return `${name} - ${code}`;
  }

  return name || code || item.person_id;
}

export default function LeaveApprovalsPage() {
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRequests(
    targetFrom = from,
    targetTo = to,
    targetStatus = status,
  ) {
    setLoading(true);
    setError("");

    const response = await gasFetch<LeaveListData>({
      path: "leave/pending",
      method: "GET",
      params: {
        from: targetFrom,
        to: targetTo,
        trang_thai: targetStatus,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách đơn nghỉ.");
      return;
    }

    setRequests(response.data.items || []);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      setFrom("");
      setTo("");
      loadRequests("", "", "PENDING");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function approveLeave(
    request: LeaveRequest,
    action: "APPROVE" | "REJECT",
  ) {
    const defaultNote =
      action === "APPROVE" ? "Đồng ý cho nghỉ" : "Không đồng ý đơn nghỉ";

    const note = window.prompt("Nhập ghi chú duyệt:", defaultNote);

    if (note === null) return;

    setProcessingId(request.id);
    setError("");
    setNotice("");

    const response = await gasFetch<ApproveLeaveData>({
      path: "leave/approve",
      method: "POST",
      body: {
        leave_request_id: request.id,
        action,
        ghi_chu: note,
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không xử lý được đơn nghỉ.");
      return;
    }

    setNotice(
      action === "APPROVE" ? "Đã duyệt đơn nghỉ." : "Đã từ chối đơn nghỉ.",
    );
    const updated = response.data?.leave_request;

    if (updated) {
      setRequests((current) => {
        if (status && updated.trang_thai !== status) {
          return current.filter((item) => item.id !== updated.id);
        }

        return current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        );
      });
    } else {
      setRequests((current) => current.filter((item) => item.id !== request.id));
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/leave")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại nghỉ phép
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Leave Approvals
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Duyệt đơn nghỉ
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            HR/Admin xem các đơn nghỉ đang chờ, duyệt hoặc từ chối kèm ghi chú.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Từ ngày
              </label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Đến ngày
              </label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="">Tất cả</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadRequests(from, to, status)}
                className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 md:w-auto"
              >
                Tải danh sách
              </button>
            </div>
          </div>
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

        {loading ? (
          <LoadingBlock text="Đang tải đơn nghỉ..." />
        ) : (
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
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Người nghỉ</th>
                    <th className="px-5 py-4">Loại</th>
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
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {formatEmployeeLabel(item)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.person_id} · {item.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {formatLeaveType(item.loai_nghi)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.tu_ngay} → {item.den_ngay}
                        <br />
                        <span className="text-xs text-slate-400">
                          {item.buoi_tu} → {item.buoi_den}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {formatNumber(item.so_ngay)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.ly_do || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.trang_thai} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        {item.trang_thai === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={processingId === item.id}
                              onClick={() => approveLeave(item, "APPROVE")}
                              className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100 disabled:opacity-60"
                            >
                              Duyệt
                            </button>

                            <button
                              disabled={processingId === item.id}
                              onClick={() => approveLeave(item, "REJECT")}
                              className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Không có đơn nghỉ phù hợp.
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

function formatLeaveType(type: string) {
  const map: Record<string, string> = {
    PHEP_NAM: "Phép năm",
    NGHI_KHONG_LUONG: "Nghỉ không lương",
    CONG_TAC: "Công tác",
    NGHI_OM: "Nghỉ ốm",
    NGHI_CHE_DO: "Nghỉ chế độ",
    NGHI_VIEC_RIENG: "Nghỉ việc riêng",
    KHAC: "Khác",
  };

  return map[type] || type || "-";
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "APPROVED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "PENDING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "REJECTED"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : value === "CANCELLED"
            ? "bg-slate-100 text-slate-600 ring-slate-200"
            : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
