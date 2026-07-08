"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type {
  CreateOfficeData,
  Office,
  OfficeListData,
  QrToken,
  QrTokenData,
  QrTokenListData,
} from "@/types/api";

function officeLabel(office: Office) {
  return [office.ma_diem, office.ten_diem].filter(Boolean).join(" - ");
}

function tokenOfficeLabel(token: QrToken) {
  return (
    [token.office_code, token.office_name].filter(Boolean).join(" - ") ||
    token.office_id
  );
}

function buildPayload(token: QrToken) {
  return JSON.stringify({
    type: "FTS_ATTENDANCE_QR",
    mode: token.het_han === "STATIC" ? "STATIC" : "EXPIRING",
    office_id: token.office_id,
    token: token.token,
  });
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "-";
  }

  if (value === "STATIC" || value === "PERMANENT") {
    return "Không hết hạn";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (value === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "LOCKED") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

type OfficeForm = {
  id: string;
  ma_diem: string;
  ten_diem: string;
  dia_chi: string;
  lat: string;
  lng: string;
  ban_kinh_gps_m: string;
};

const emptyOfficeForm: OfficeForm = {
  id: "",
  ma_diem: "",
  ten_diem: "",
  dia_chi: "",
  lat: "",
  lng: "",
  ban_kinh_gps_m: "150",
};

function officeToForm(office: Office): OfficeForm {
  return {
    id: office.id,
    ma_diem: String(office.ma_diem || ""),
    ten_diem: String(office.ten_diem || ""),
    dia_chi: String(office.dia_chi || ""),
    lat: String(office.lat || ""),
    lng: String(office.lng || ""),
    ban_kinh_gps_m: String(office.ban_kinh_gps_m || "150"),
  };
}

export default function AttendanceQrAdminPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [officeId, setOfficeId] = useState("");
  const [officeForm, setOfficeForm] = useState<OfficeForm>(emptyOfficeForm);
  const [expiresAt, setExpiresAt] = useState("");
  const [payload, setPayload] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const renderPayload = useCallback(async function renderPayload(
    nextPayload: string,
  ) {
    setPayload(nextPayload);

    if (!nextPayload) {
      setQrImage("");
      return;
    }

    const image = await QRCode.toDataURL(nextPayload, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    setQrImage(image);
  }, []);

  const loadData = useCallback(
    async function loadData(preferredOfficeId = officeId) {
      setLoading(true);
      setError("");

      const [officesResponse, tokensResponse] = await Promise.all([
        gasFetch<OfficeListData>({
          path: "attendance/offices",
          method: "GET",
        }),
        gasFetch<QrTokenListData>({
          path: "attendance/qr/list",
          method: "GET",
        }),
      ]);

      setLoading(false);

      if (!officesResponse.success || !officesResponse.data) {
        setError(
          officesResponse.message || "Không tải được danh sách địa điểm.",
        );
        return;
      }

      if (!tokensResponse.success || !tokensResponse.data) {
        setError(tokensResponse.message || "Không tải được lịch sử QR token.");
        return;
      }

      const activeOffices = officesResponse.data.items.filter(
        (office) => office.trang_thai === "ACTIVE",
      );

      setOffices(activeOffices);
      setTokens(tokensResponse.data.items);
      const nextId = preferredOfficeId || "";
      const selectedOffice = activeOffices.find(
        (office) => office.id === nextId,
      );
      setOfficeId(nextId);
      setOfficeForm(
        selectedOffice ? officeToForm(selectedOffice) : emptyOfficeForm,
      );
    },
    [officeId],
  );

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  function updateOfficeForm(field: keyof OfficeForm, value: string) {
    setOfficeForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectOffice(nextOfficeId: string) {
    const office = offices.find((item) => item.id === nextOfficeId);

    setOfficeId(nextOfficeId);
    setOfficeForm(office ? officeToForm(office) : emptyOfficeForm);
  }

  function startNewOffice() {
    setOfficeId("");
    setOfficeForm(emptyOfficeForm);
    setPayload("");
    setQrImage("");
  }

  function validateOfficeForm() {
    if (!officeForm.ma_diem.trim()) {
      return "Vui lòng nhập mã địa điểm.";
    }

    if (!officeForm.ten_diem.trim()) {
      return "Vui lòng nhập tên địa điểm.";
    }

    if (!officeForm.lat.trim() || !officeForm.lng.trim()) {
      return "Vui lòng nhập kinh độ và vĩ độ.";
    }

    if (
      !Number.isFinite(Number(officeForm.lat)) ||
      !Number.isFinite(Number(officeForm.lng))
    ) {
      return "Kinh độ hoặc vĩ độ không hợp lệ.";
    }

    if (!Number.isFinite(Number(officeForm.ban_kinh_gps_m))) {
      return "Bán kính GPS không hợp lệ.";
    }

    return "";
  }

  async function saveOfficeAndCreateToken() {
    const validationMessage = validateOfficeForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const officeBody = {
      ma_diem: officeForm.ma_diem.trim(),
      ten_diem: officeForm.ten_diem.trim(),
      dia_chi: officeForm.dia_chi.trim(),
      lat: officeForm.lat.trim(),
      lng: officeForm.lng.trim(),
      ban_kinh_gps_m: officeForm.ban_kinh_gps_m.trim() || "150",
      trang_thai: "ACTIVE",
    };

    const officeResponse = await gasFetch<CreateOfficeData>({
      path: officeForm.id
        ? "attendance/offices/update"
        : "attendance/offices/create",
      method: "POST",
      body: officeForm.id
        ? {
            id: officeForm.id,
            ...officeBody,
          }
        : officeBody,
    });

    if (!officeResponse.success || !officeResponse.data) {
      setSaving(false);
      setError(officeResponse.message || "Không lưu được địa điểm chấm công.");
      return;
    }

    const savedOffice = officeResponse.data.office;

    const response = await gasFetch<QrTokenData>({
      path: "attendance/qr/generate",
      method: "POST",
      body: {
        office_id: savedOffice.id,
        het_han: expiresAt || "STATIC",
      },
    });

    setSaving(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tạo được QR token.");
      return;
    }

    setOfficeId(savedOffice.id);
    setOfficeForm(officeToForm(savedOffice));
    setNotice(response.message || "Đã lưu địa điểm và tạo QR token.");
    await renderPayload(response.data.qr_payload);
    await loadData(savedOffice.id);
  }

  async function updateStatus(
    id: string,
    trangThai: "ACTIVE" | "LOCKED" | "DELETED",
  ) {
    setSaving(true);
    setError("");
    setNotice("");

    const response = await gasFetch<QrTokenData>({
      path:
        trangThai === "DELETED"
          ? "attendance/qr/delete"
          : "attendance/qr/status",
      method: "POST",
      body: {
        id,
        trang_thai: trangThai,
      },
    });

    setSaving(false);

    if (!response.success) {
      setError(response.message || "Không cập nhật được QR token.");
      return;
    }

    setNotice(response.message || "Đã cập nhật QR token.");
    await loadData();
  }

  async function showToken(token: QrToken) {
    await renderPayload(buildPayload(token));
  }

  async function copyPayload() {
    if (!payload) {
      return;
    }

    await navigator.clipboard.writeText(payload);
    setNotice("Đã copy payload QR.");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Attendance QR
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            QR chấm công
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Tạo QR theo địa điểm làm việc, chọn hạn sử dụng và quản lý lịch sử
            token đã phát hành
          </p>
        </section>

        {loading ? (
          <LoadingBlock text="Đang tải cấu hình QR chấm công..." />
        ) : null}

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.55fr)]">
          <div className="fts-card rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <label className="flex-1">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Nạp địa điểm đã có
                </span>
                <select
                  value={officeId}
                  onChange={(event) => selectOffice(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Tạo địa điểm mới</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {officeLabel(office)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={startNewOffice}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Tạo mới
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField
                label="Mã địa điểm"
                value={officeForm.ma_diem}
                onChange={(value) => updateOfficeForm("ma_diem", value)}
              />
              <TextField
                label="Tên địa điểm"
                value={officeForm.ten_diem}
                onChange={(value) => updateOfficeForm("ten_diem", value)}
              />
              <TextField
                label="Địa chỉ"
                value={officeForm.dia_chi}
                onChange={(value) => updateOfficeForm("dia_chi", value)}
                className="md:col-span-2"
              />
              <TextField
                label="Vĩ độ"
                value={officeForm.lat}
                onChange={(value) => updateOfficeForm("lat", value)}
                inputMode="decimal"
              />
              <TextField
                label="Kinh độ"
                value={officeForm.lng}
                onChange={(value) => updateOfficeForm("lng", value)}
                inputMode="decimal"
              />
              <TextField
                label="Bán kính GPS (m)"
                value={officeForm.ban_kinh_gps_m}
                onChange={(value) => updateOfficeForm("ban_kinh_gps_m", value)}
                inputMode="numeric"
              />
              <label>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Ngày hết hạn QR
                </span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>

            <button
              onClick={saveOfficeAndCreateToken}
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-xl transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu địa điểm và tạo QR"}
            </button>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Địa điểm</th>
                    <th className="px-4 py-3">Thao tác</th>
                    <th className="px-4 py-3">Hết hạn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tokens.map((token) => (
                    <tr key={token.id}>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {tokenOfficeLabel(token)}
                        <p className="mt-1 max-w-[260px] truncate text-xs font-medium text-slate-400">
                          {token.token}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDateTime(
                          token.thoi_gian_tao || token.created_at,
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDateTime(token.het_han)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
                            statusClass(token.trang_thai),
                          ].join(" ")}
                        >
                          {formatStatus(token.trang_thai)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => showToken(token)}
                            className="rounded-2xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                          >
                            Xem QR
                          </button>
                          {token.trang_thai !== "LOCKED" &&
                          token.trang_thai !== "DELETED" ? (
                            <button
                              onClick={() => updateStatus(token.id, "LOCKED")}
                              disabled={saving}
                              className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 transition hover:bg-amber-100 disabled:opacity-60"
                            >
                              Khóa
                            </button>
                          ) : null}
                          {token.trang_thai === "LOCKED" ? (
                            <button
                              onClick={() => updateStatus(token.id, "ACTIVE")}
                              disabled={saving}
                              className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-60"
                            >
                              Mở
                            </button>
                          ) : null}
                          {token.trang_thai !== "DELETED" ? (
                            <button
                              onClick={() => updateStatus(token.id, "DELETED")}
                              disabled={saving}
                              className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              Xóa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!tokens.length ? (
                <div className="bg-white p-6 text-center text-sm font-semibold text-slate-500">
                  Chưa có QR token nào.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">QR đang xem</h2>

            <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImage}
                  alt="QR chấm công"
                  className="h-auto w-full max-w-[320px] rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
                />
              ) : (
                <p className="max-w-xs text-center text-sm font-semibold text-slate-500">
                  Chọn một token trong lịch sử hoặc tạo QR mới để hiển thị mã
                  in.
                </p>
              )}
            </div>

            <textarea
              value={payload}
              readOnly
              rows={6}
              className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 outline-none"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={copyPayload}
                disabled={!payload}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Copy payload
              </button>
              <button
                onClick={() => window.print()}
                disabled={!qrImage}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                In QR
              </button>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  className = "",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <label className={className}>
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
