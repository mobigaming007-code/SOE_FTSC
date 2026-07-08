"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { AttendanceListData, AttendanceLog } from "@/types/api";

type AttendanceGroup = {
  key: string;
  personLabel: string;
  date: string;
  shiftId: string;
  logs: AttendanceLog[];
};

type WorkTimeInputs = {
  start: string;
  end: string;
};

function formatEmployeeLabel(log: AttendanceLog) {
  const name = log.ho_ten || log.ten_nhan_su || "";
  const code = log.ma_dinh_danh || "";

  if (name && code) {
    return `${name} - ${code}`;
  }

  return name || code || log.person_id;
}

function formatDateTime(value?: string) {
  const parsed = parseLogTime(value);

  if (!parsed) {
    return value || "-";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDateOnly(value?: string) {
  const parsed = parseLogTime(value);

  if (!parsed) {
    return value || "-";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
}

function parseLogTime(value?: string) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const vietnameseMatch = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (vietnameseMatch) {
    const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] =
      vietnameseMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text.replace(" ", "T"));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateWorkHours(
  selectedLogs: AttendanceLog[],
  restHoursText: string,
  workStartText: string,
  workEndText: string,
) {
  if (selectedLogs.length !== 2) {
    return 0;
  }

  const firstTime = parseLogTime(selectedLogs[0].thoi_gian);
  const lastTime = parseLogTime(selectedLogs[1].thoi_gian);
  const workStart = buildDateWithTime(firstTime, workStartText);
  const workEnd = buildDateWithTime(lastTime, workEndText);

  if (!workStart || !workEnd) {
    return 0;
  }

  const totalHours = Math.max(
    0,
    (workEnd.getTime() - workStart.getTime()) / 3600000,
  );
  const restHours = Math.max(0, parseDecimalInput(restHoursText));

  return Math.max(0, Math.round((totalHours - restHours) * 100) / 100);
}

function formatTimeInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function buildDateWithTime(baseDate: Date | null, timeText: string) {
  const match = String(timeText || "").match(/^(\d{2}):(\d{2})$/);

  if (!baseDate || !match) {
    return null;
  }

  const parsed = new Date(baseDate);
  parsed.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return parsed;
}

function getDefaultWorkTimes(selectedLogs: AttendanceLog[]): WorkTimeInputs {
  if (selectedLogs.length !== 2) {
    return { start: "", end: "" };
  }

  const firstTime = parseLogTime(selectedLogs[0].thoi_gian);
  const lastTime = parseLogTime(selectedLogs[1].thoi_gian);
  let workStart = firstTime;
  let workEnd = lastTime;
  const shiftStart = buildDateWithTime(firstTime, selectedLogs[0].gio_bat_dau_ca || "");
  const shiftEnd = buildDateWithTime(lastTime, selectedLogs[1].gio_ket_thuc_ca || selectedLogs[0].gio_ket_thuc_ca || "");

  if (firstTime && shiftStart && firstTime.getTime() < shiftStart.getTime()) {
    workStart = shiftStart;
  }

  if (lastTime && shiftEnd && lastTime.getTime() > shiftEnd.getTime()) {
    workEnd = shiftEnd;
  }

  return {
    start: formatTimeInput(workStart),
    end: formatTimeInput(workEnd),
  };
}

function parseDecimalInput(value?: string) {
  const normalized = String(value || "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getSelectedPair(logs: AttendanceLog[], selectedIds: string[]) {
  return selectedIds
    .map((id) => logs.find((log) => log.id === id))
    .filter((log): log is AttendanceLog => Boolean(log))
    .sort((left, right) => {
      const leftTime = parseLogTime(left.thoi_gian)?.getTime() || 0;
      const rightTime = parseLogTime(right.thoi_gian)?.getTime() || 0;

      return leftTime - rightTime;
    });
}

export default function AttendanceApprovalsPage() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [expandedKey, setExpandedKey] = useState("");
  const [selectedIdsByGroup, setSelectedIdsByGroup] = useState<Record<string, string[]>>({});
  const [restHoursByGroup, setRestHoursByGroup] = useState<Record<string, string>>({});
  const [workDaysByGroup, setWorkDaysByGroup] = useState<Record<string, string>>({});
  const [workTimesByGroup, setWorkTimesByGroup] = useState<Record<string, WorkTimeInputs>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const groups = useMemo<AttendanceGroup[]>(() => {
    const groupMap = new Map<string, AttendanceGroup>();

    logs.forEach((log) => {
      const key = [log.person_id, log.ngay, log.shift_id || ""].join("|");
      const existing = groupMap.get(key);

      if (existing) {
        existing.logs.push(log);
        return;
      }

      groupMap.set(key, {
        key,
        personLabel: formatEmployeeLabel(log),
        date: log.ngay,
        shiftId: log.shift_id || "",
        logs: [log],
      });
    });

    return Array.from(groupMap.values()).map((group) => ({
      ...group,
      logs: group.logs.sort((left, right) => {
        const leftTime = parseLogTime(left.thoi_gian)?.getTime() || 0;
        const rightTime = parseLogTime(right.thoi_gian)?.getTime() || 0;

        return leftTime - rightTime;
      }),
    }));
  }, [logs]);

  const loadPending = useCallback(async function loadPending(targetDate: string) {
    setLoading(true);
    setError("");

    const params: Record<string, string> = {
      trang_thai_duyet: "PENDING",
    };

    if (targetDate) {
      params.ngay = targetDate;
    }

    const response = await gasFetch<AttendanceListData>({
      path: "attendance/team",
      method: "GET",
      params,
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách chờ duyệt.");
      return;
    }

    setLogs(response.data.items || []);
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    void Promise.resolve().then(() => loadPending(""));
  }, [loadPending, router]);

  function toggleLog(groupKey: string, logId: string) {
    setWorkTimesByGroup((current) => {
      const next = { ...current };
      delete next[groupKey];
      return next;
    });

    setSelectedIdsByGroup((current) => {
      const selected = current[groupKey] || [];

      if (selected.includes(logId)) {
        return {
          ...current,
          [groupKey]: selected.filter((id) => id !== logId),
        };
      }

      return {
        ...current,
        [groupKey]: [...selected, logId].slice(-2),
      };
    });
  }

  async function reject(log: AttendanceLog) {
    setProcessingId(log.id);
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "attendance/approve",
      method: "POST",
      body: {
        attendance_log_id: log.id,
        action: "REJECT",
        ghi_chu: "Từ chối từ giao diện quản trị",
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không xử lý được bản ghi.");
      return;
    }

    setNotice("Đã từ chối bản ghi.");
    setLogs((current) => current.filter((item) => item.id !== log.id));
  }

  async function approvePair(group: AttendanceGroup) {
    const selectedIds = selectedIdsByGroup[group.key] || [];
    const selectedPair = getSelectedPair(group.logs, selectedIds);
    const defaultWorkTimes = getDefaultWorkTimes(selectedPair);
    const workTimes = workTimesByGroup[group.key] || defaultWorkTimes;

    if (selectedIds.length !== 2) {
      setError("Vui lòng chọn đúng 2 bản ghi chấm công để duyệt.");
      return;
    }

    setProcessingId(group.key);
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "attendance/approve",
      method: "POST",
      body: {
        attendance_log_ids: selectedIds,
        action: "APPROVE",
        so_gio_nghi_ngoi: parseDecimalInput(restHoursByGroup[group.key]),
        so_cong_quan_tri: Number(workDaysByGroup[group.key] || 0),
        gio_vao_tinh_cong: workTimes.start,
        gio_ra_tinh_cong: workTimes.end,
        ghi_chu: "Duyệt theo cặp bản ghi chấm công",
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không duyệt được bảng công.");
      return;
    }

    setNotice("Đã duyệt 2 bản ghi và cập nhật bảng công.");
    setSelectedIdsByGroup((current) => ({ ...current, [group.key]: [] }));
    setWorkTimesByGroup((current) => {
      const next = { ...current };
      delete next[group.key];
      return next;
    });
    setLogs((current) =>
      current.filter((item) => !selectedIds.includes(item.id)),
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/attendance")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            Quay lại chấm công
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Duyệt bảng công
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Duyệt chấm công theo nhân viên
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            Mở từng nhân viên, chọn 2 lần chấm công, nhập giờ nghỉ và số công để hệ thống ghi vào bảng công.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Ngày cần duyệt
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Để trống để xem tất cả bản ghi chờ duyệt.
              </p>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadPending(date)}
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
          <LoadingBlock text="Đang tải bản ghi chờ duyệt..." />
        ) : (
          <section className="space-y-4">
            <div className="fts-card rounded-[2rem] p-5">
              <h2 className="text-xl font-black text-slate-950">
                Nhân viên có bản ghi chờ duyệt
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {logs.length} bản ghi trong {groups.length} nhóm.
              </p>
            </div>

            {groups.map((group) => {
              const selectedIds = selectedIdsByGroup[group.key] || [];
              const selectedPair = getSelectedPair(group.logs, selectedIds);
              const restHours = restHoursByGroup[group.key] || "0";
              const workDays = workDaysByGroup[group.key] || "";
              const defaultWorkTimes = getDefaultWorkTimes(selectedPair);
              const workTimes = workTimesByGroup[group.key] || defaultWorkTimes;
              const workHours = calculateWorkHours(
                selectedPair,
                restHours,
                workTimes.start,
                workTimes.end,
              );
              const isExpanded = expandedKey === group.key;

              return (
                <section key={group.key} className="fts-card overflow-hidden rounded-[2rem]">
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? "" : group.key)}
                    className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-black text-slate-950">
                        {group.personLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Ngày {formatDateOnly(group.date)} · {group.logs.length} bản ghi chờ duyệt
                      </p>
                    </div>

                    <span className="text-sm font-black text-sky-700">
                      {isExpanded ? "Ẩn danh sách chấm công" : "Xem danh sách chấm công"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-100 p-5">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left">
                          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Chọn</th>
                              <th className="px-4 py-3">Thời gian</th>
                              <th className="px-4 py-3">Loại</th>
                              <th className="px-4 py-3">Hình thức</th>
                              <th className="px-4 py-3">Hệ thống</th>
                              <th className="px-4 py-3">GPS</th>
                              <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {group.logs.map((log) => (
                              <tr key={log.id}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(log.id)}
                                    onChange={() => toggleLog(group.key, log.id)}
                                    className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-700">
                                  {formatDateTime(log.thoi_gian)}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {log.loai_cham_cong || "Chấm công"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {log.hinh_thuc || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={log.trang_thai_he_thong} />
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">
                                  {log.lat || "-"}, {log.lng || "-"} · {log.khoang_cach_m || "-"}m
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    disabled={processingId === log.id}
                                    onClick={() => reject(log)}
                                    className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    Từ chối
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Số giờ nghỉ ngơi
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={restHours}
                            onChange={(event) =>
                              setRestHoursByGroup((current) => ({
                                ...current,
                                [group.key]: event.target.value,
                              }))
                            }
                            className="fts-input"
                            placeholder="Ví dụ 0.5 = 30 phút"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Có thể nhập số thập phân: 0.25 = 15 phút, 0.5 = 30 phút, 1.5 = 1 giờ 30 phút.
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Số công
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={workDays}
                            onChange={(event) =>
                              setWorkDaysByGroup((current) => ({
                                ...current,
                                [group.key]: event.target.value,
                              }))
                            }
                            className="fts-input"
                            placeholder="Quản trị nhập tay"
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Giờ vào tính công
                          </label>
                          <input
                            type="time"
                            value={workTimes.start}
                            onChange={(event) =>
                              setWorkTimesByGroup((current) => ({
                                ...current,
                                [group.key]: {
                                  ...workTimes,
                                  start: event.target.value,
                                },
                              }))
                            }
                            className="fts-input"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Giờ ra tính công
                          </label>
                          <input
                            type="time"
                            value={workTimes.end}
                            onChange={(event) =>
                              setWorkTimesByGroup((current) => ({
                                ...current,
                                [group.key]: {
                                  ...workTimes,
                                  end: event.target.value,
                                },
                              }))
                            }
                            className="fts-input"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Mặc định giới hạn theo ca làm; có thể sửa nếu cần tính sớm/trễ.
                          </p>
                        </div>

                        <div className="flex items-end">
                          <button
                            disabled={processingId === group.key || selectedIds.length !== 2}
                            onClick={() => approvePair(group)}
                            className="fts-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                          >
                            Duyệt 2 công đã chọn
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
                        <table className="w-full min-w-[760px] text-left">
                          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Giờ vào</th>
                              <th className="px-4 py-3">Giờ ra</th>
                              <th className="px-4 py-3">Giờ vào tính công</th>
                              <th className="px-4 py-3">Giờ ra tính công</th>
                              <th className="px-4 py-3">Số giờ nghỉ ngơi</th>
                              <th className="px-4 py-3">Số giờ tính công</th>
                              <th className="px-4 py-3">Số công</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-4 text-sm font-bold text-slate-700">
                                {formatDateTime(selectedPair[0]?.thoi_gian)}
                              </td>
                              <td className="px-4 py-4 text-sm font-bold text-slate-700">
                                {formatDateTime(selectedPair[1]?.thoi_gian)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {workTimes.start || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {workTimes.end || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {restHours || 0}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {workHours}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {workDays || "-"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}

            {groups.length === 0 ? (
              <div className="fts-card rounded-[2rem] px-5 py-12 text-center text-sm font-semibold text-slate-500">
                Không có bản ghi chờ duyệt trong ngày này.
              </div>
            ) : null}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "VALID" || value === "APPROVED"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "PENDING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "OUT_OF_GEOFENCE" || value === "REJECTED"
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
