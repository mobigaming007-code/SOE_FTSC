"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getPermissions, getRoles, getToken } from "@/lib/auth";
import { canAccessAdminPortal } from "@/lib/permissions";
import type {
  AttendanceActionData,
  Office,
  OfficeListData,
  QrTokenData,
  ShiftListData,
  WorkShift,
} from "@/types/api";

type AttendanceMethod = "GPS" | "QR";

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function buildAttendanceTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());
  const hours = padTimePart(date.getHours());
  const minutes = padTimePart(date.getMinutes());
  const seconds = padTimePart(date.getSeconds());

  return {
    dateText: `${year}-${month}-${day}`,
    dateTimeText: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
  };
}

function canUseAdminAttendance() {
  return canAccessAdminPortal(getPermissions(), getRoles());
}

export default function AttendanceCheckinPage() {
  const router = useRouter();

  const [offices, setOffices] = useState<Office[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [officeId, setOfficeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [method, setMethod] = useState<AttendanceMethod>("GPS");
  const [qrToken, setQrToken] = useState("");
  const [deviceId, setDeviceId] = useState("WEB_DEVICE");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [generatedQr, setGeneratedQr] = useState<QrTokenData | null>(null);

  const loadConfig = useCallback(async function loadConfig() {
    setLoading(true);
    setError("");

    const [officeResponse, shiftResponse] = await Promise.all([
      gasFetch<OfficeListData>({
        path: "attendance/offices",
        method: "GET",
      }),
      gasFetch<ShiftListData>({
        path: "attendance/shifts",
        method: "GET",
      }),
    ]);

    setLoading(false);

    if (!officeResponse.success || !officeResponse.data) {
      setError(officeResponse.message || "Không tải được danh sách địa điểm.");
      return;
    }

    if (!shiftResponse.success || !shiftResponse.data) {
      setError(shiftResponse.message || "Không tải được danh sách ca làm.");
      return;
    }

    const officeItems = officeResponse.data.items || [];
    const shiftItems = shiftResponse.data.items || [];

    setOffices(officeItems);
    setShifts(shiftItems);

    setOfficeId((current) => current || officeItems[0]?.id || "");
    setShiftId((current) => current || shiftItems[0]?.id || "");
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!canUseAdminAttendance()) {
      router.replace("/employee/attendance/qr");
      return;
    }

    void Promise.resolve().then(loadConfig);
  }, [loadConfig, router]);

  function getGps() {
    setError("");
    setNotice("");

    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ lấy vị trí GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setNotice("Đã lấy vị trí GPS hiện tại.");
      },
      (geoError) => {
        setError(geoError.message || "Không lấy được vị trí GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  async function submitAttendance(type: "checkin" | "checkout") {
    setSubmitting(true);
    setError("");
    setNotice("");

    const attendanceTime = buildAttendanceTimestamp();
    const body: Record<string, unknown> = {
      office_id: officeId,
      shift_id: shiftId,
      ngay: attendanceTime.dateText,
      thoi_gian: attendanceTime.dateTimeText,
      hinh_thuc: method,
      device_id: deviceId,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : "Web",
    };

    if (method === "GPS") {
      body.lat = lat;
      body.lng = lng;
    }

    if (method === "QR") {
      body.qr_token = qrToken;
    }

    const response = await gasFetch<AttendanceActionData>({
      path: type === "checkin" ? "attendance/checkin" : "attendance/checkout",
      method: "POST",
      body,
    });

    setSubmitting(false);

    if (!response.success) {
      setError(response.message || "Chấm công thất bại.");
      return;
    }

    setNotice(response.message || "Chấm công thành công.");
  }

  async function generateQr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setNotice("");
    setGeneratedQr(null);

    const response = await gasFetch<QrTokenData>({
      path: "attendance/qr/generate",
      method: "POST",
      body: {
        office_id: officeId,
      },
    });

    setSubmitting(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không sinh được QR.");
      return;
    }

    const payload =
      response.data.qr_payload ||
      response.data.token ||
      response.data.qr_token?.token ||
      "";

    setGeneratedQr({
      ...response.data,
      qr_payload: payload,
    });
    setQrToken(payload);
    setNotice("Đã sinh QR token. Có thể copy payload để chấm công QR.");
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
            Check-in / Check-out
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Chấm công GPS/QR
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Chọn địa điểm, ca làm và hình thức chấm công. GPS sẽ kiểm tra khoảng
            cách so với tọa độ địa điểm.
          </p>
        </section>

        {loading ? (
          <LoadingBlock text="Đang tải địa điểm và ca làm..." />
        ) : null}

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

        {!loading ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Thông tin chấm công
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Địa điểm"
                  value={officeId}
                  onChange={setOfficeId}
                  options={offices.map((office) => ({
                    value: office.id,
                    label: `${office.ma_diem} - ${office.ten_diem}`,
                  }))}
                />

                <SelectField
                  label="Ca làm"
                  value={shiftId}
                  onChange={setShiftId}
                  options={shifts.map((shift) => ({
                    value: shift.id,
                    label: `${shift.ma_ca} - ${shift.ten_ca}`,
                  }))}
                />

                <SelectField
                  label="Hình thức"
                  value={method}
                  onChange={(value) => setMethod(value as AttendanceMethod)}
                  options={[
                    { value: "GPS", label: "GPS" },
                    { value: "QR", label: "QR payload" },
                  ]}
                />

                <InputField
                  label="Device ID"
                  value={deviceId}
                  onChange={setDeviceId}
                />

                {method === "GPS" ? (
                  <>
                    <InputField
                      label="Latitude"
                      value={lat}
                      onChange={setLat}
                    />
                    <InputField
                      label="Longitude"
                      value={lng}
                      onChange={setLng}
                    />

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={getGps}
                        className="w-full rounded-2xl bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                      >
                        Lấy vị trí GPS hiện tại
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      QR payload
                    </label>
                    <textarea
                      value={qrToken}
                      onChange={(event) => setQrToken(event.target.value)}
                      rows={4}
                      className="fts-input"
                      placeholder="Dán QR payload tại đây"
                    />
                  </div>
                )}

                <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                  <button
                    disabled={submitting}
                    onClick={() => submitAttendance("checkin")}
                    className="rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                  >
                    Check-in
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => submitAttendance("checkout")}
                    className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Check-out
                  </button>
                </div>
              </div>
            </div>

            <div className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Sinh QR cho địa điểm
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Dành cho quản lý điểm hoặc admin. QR token là mã cố định theo
                địa điểm để in ra; nhân viên quét QR vẫn phải gửi GPS hiện tại.
              </p>

              <form onSubmit={generateQr} className="mt-5 space-y-4">
                <SelectField
                  label="Địa điểm tạo QR"
                  value={officeId}
                  onChange={setOfficeId}
                  options={offices.map((office) => ({
                    value: office.id,
                    label: `${office.ma_diem} - ${office.ten_diem}`,
                  }))}
                />

                <button
                  disabled={submitting}
                  className="w-full rounded-2xl bg-amber-500 px-5 py-3 font-black text-white shadow-xl shadow-amber-100 transition hover:bg-amber-600 disabled:opacity-60"
                >
                  Sinh QR token
                </button>
              </form>

              {generatedQr ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    QR payload
                  </p>

                  <textarea
                    readOnly
                    value={generatedQr.qr_payload}
                    rows={5}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700"
                  />

                  <p className="mt-3 text-xs text-slate-500">
                    Hiệu lực: {generatedQr.qr_token?.het_han || "STATIC"}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function InputField({
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
        value={value}
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
