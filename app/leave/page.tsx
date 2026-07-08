"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import StatCard from "@/components/StatCard";
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

export default function LeavePage() {
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async function loadRequests(
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
  }, [from, status, to]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadRequests("", "", "");
    });
  }, [loadRequests, router]);

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

  const pendingCount = requests.filter(
    (item) => item.trang_thai === "PENDING",
  ).length;
  const approvedCount = requests.filter(
    (item) => item.trang_thai === "APPROVED",
  ).length;
  const rejectedCount = requests.filter(
    (item) => item.trang_thai === "REJECTED",
  ).length;
  const totalDays = requests.reduce(
    (sum, item) => sum + Number(item.so_ngay || 0),
    0,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-50">
                Leave Administration
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Quản trị nghỉ phép
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Xem tổng quan nghỉ phép, kiểm tra số dư phép và duyệt hoặc từ chối
                đơn nghỉ của nhân viên. Việc tạo đơn nghỉ nằm ở cổng nhân viên.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tổng đơn trong bộ lọc"
            value={formatNumber(requests.length)}
            subtitle={`${from} đến ${to}`}
            icon="NP"
            tone="sky"
          />

          <StatCard
            title="Đã duyệt"
            value={formatNumber(approvedCount)}
            subtitle={`${formatNumber(totalDays)} ngày nghỉ`}
            icon="OK"
            tone="teal"
          />

          <StatCard
            title="Chờ duyệt"
            value={formatNumber(pendingCount)}
            subtitle="Cần quản trị xử lý"
            icon="CL"
            tone="gold"
          />

          <StatCard
            title="Từ chối"
            value={formatNumber(rejectedCount)}
            subtitle="Đơn không được duyệt"
            icon="TC"
            tone="rose"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Nghiệp vụ quản trị
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ModuleCard
                title="Số dư phép"
                description="Tra cứu và cập nhật tổng phép năm cho từng nhân sự."
                href="/leave/balance"
                icon="SD"
                accent="from-indigo-500 to-sky-400"
              />

              <ModuleCard
                title="Duyệt đơn chờ"
                description="Mở danh sách đơn nghỉ đang chờ để duyệt hoặc từ chối."
                href="/leave/approvals"
                icon="DU"
                accent="from-amber-500 to-orange-400"
              />
            </div>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Bộ lọc danh sách đơn nghỉ
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <FilterDate label="Từ ngày" value={from} onChange={setFrom} />
              <FilterDate label="Đến ngày" value={to} onChange={setTo} />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="fts-input"
                >
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                  <option value="CANCELLED">Đã hủy</option>
                  <option value="">Tất cả</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => loadRequests(from, to, status)}
                  className="fts-button-primary w-full md:w-auto"
                >
                  Tải danh sách
                </button>
              </div>
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
          <LoadingBlock text="Đang tải danh sách đơn nghỉ..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách đơn nghỉ nhân viên
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Mặc định hiển thị các đơn đã duyệt. Chuyển bộ lọc sang chờ duyệt
                để xử lý đơn mới.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Nhân viên</th>
                    <th className="px-5 py-4">Loại nghỉ</th>
                    <th className="px-5 py-4">Thời gian</th>
                    <th className="px-5 py-4">Số ngày</th>
                    <th className="px-5 py-4">Lý do</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Ghi chú duyệt</th>
                    <th className="px-5 py-4 text-right">Duyệt</th>
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
                        {item.tu_ngay} &rarr; {item.den_ngay}
                        <br />
                        <span className="text-xs text-slate-400">
                          {item.buoi_tu} &rarr; {item.buoi_den}
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

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.ghi_chu_duyet || "-"}
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
                        colSpan={8}
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

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      />
    </div>
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
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
