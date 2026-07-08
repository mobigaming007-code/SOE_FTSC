"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { ErrorBox, SuccessBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AttendanceActionData, Office, OfficeListData } from "@/types/api";

type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function parseQrPayload(rawValue: string) {
  const raw = rawValue.trim();

  if (!raw) {
    return { token: "", office_id: "", raw: "" };
  }

  try {
    const payload = JSON.parse(raw) as {
      token?: string;
      qr_token?: string;
      office_id?: string;
    };

    return {
      token: payload.token || payload.qr_token || raw,
      office_id: payload.office_id || "",
      raw,
    };
  } catch {
    try {
      const url = new URL(raw);

      return {
        token:
          url.searchParams.get("token") ||
          url.searchParams.get("qr_token") ||
          raw,
        office_id: url.searchParams.get("office_id") || "",
        raw,
      };
    } catch {
      return { token: raw, office_id: "", raw };
    }
  }
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ lấy GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

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
    displayText: `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`,
  };
}

function scanQrWithCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement | null,
) {
  if (!canvas || !video.videoWidth || !video.videoHeight) {
    return "";
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return "";
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  });

  return qr?.data || "";
}

export default function EmployeeQrAttendancePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [deviceId, setDeviceId] = useState("EMPLOYEE_WEB_QR");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scannerUnsupported, setScannerUnsupported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(buildAttendanceTimestamp);

  const selectedOffice = offices.find((office) => office.id === officeId);
  const parsedPayload = parseQrPayload(qrPayload);

  const stopScanner = useCallback(function stopScanner() {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const applyScannedPayload = useCallback(
    function applyScannedPayload(rawValue: string) {
      const parsed = parseQrPayload(rawValue);

      setQrPayload(rawValue);

      if (parsed.office_id) {
        setOfficeId(parsed.office_id);
      }

      setNotice("Đã nhận QR. Vui lòng kiểm tra địa điểm rồi bấm Chấm công.");
      stopScanner();
    },
    [stopScanner],
  );

  const loadConfig = useCallback(async function loadConfig() {
    setLoading(true);
    setError("");

    const response = await gasFetch<OfficeListData>({
      path: "attendance/offices",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách địa điểm.");
      return;
    }

    const activeOffices = (response.data.items || []).filter(
      (office) => office.trang_thai === "ACTIVE",
    );

    setOffices(activeOffices);
    setOfficeId((current) => current || activeOffices[0]?.id || "");
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    void Promise.resolve().then(loadConfig);

    return () => stopScanner();
  }, [loadConfig, router, stopScanner]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(buildAttendanceTimestamp());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function startScanner() {
    setError("");
    setNotice("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

      if (!detector) {
        setScannerUnsupported(true);
      }

      setScanning(true);

      const scan = async () => {
        if (!videoRef.current) {
          return;
        }

        try {
          let value = "";

          if (detector) {
            const results = await detector.detect(videoRef.current);
            value = results[0]?.rawValue || "";
          } else {
            value = scanQrWithCanvas(videoRef.current, canvasRef.current);
          }

          if (value) {
            applyScannedPayload(value);
            return;
          }
        } catch {
          if (detector) {
            setScannerUnsupported(true);
          }
        }

        scanFrameRef.current = requestAnimationFrame(scan);
      };

      scanFrameRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được camera.");
      stopScanner();
    }
  }

  async function submitAttendance() {
    setSubmitting(true);
    setError("");
    setNotice("");

    if (!officeId) {
      setSubmitting(false);
      setError("Chưa chọn địa điểm chấm công.");
      return;
    }

    if (!parsedPayload.token) {
      setSubmitting(false);
      setError("Chưa có QR token để chấm công.");
      return;
    }

    try {
      const position = await getCurrentPosition();
      const attendanceTime = buildAttendanceTimestamp();

      const response = await gasFetch<AttendanceActionData>({
        path: "attendance/mark",
        method: "POST",
        body: {
          office_id: officeId,
          ngay: attendanceTime.dateText,
          thoi_gian: attendanceTime.dateTimeText,
          loai_cham_cong: "ATTENDANCE",
          hinh_thuc: "QR",
          qr_token: qrPayload || parsedPayload.token,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          device_id: deviceId,
          user_agent: navigator.userAgent,
        },
      });

      if (!response.success) {
        setError(response.message || "Không chấm công được bằng QR.");
        return;
      }

      const validation = response.data?.validation;
      const distanceText =
        validation?.distance_m !== undefined
          ? ` Khoảng cách GPS: ${Math.round(validation.distance_m)}m.`
          : "";

      setNotice(
        `${response.message || "Đã ghi nhận chấm công, chờ quản trị duyệt."}${distanceText}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lấy được GPS hiện tại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/employee/attendance")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            Quay lại bảng công
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            QR Attendance
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Chấm công
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Quét QR cố định tại địa điểm làm việc, chọn đúng địa điểm và bấm
            Chấm công. Bản ghi sẽ chờ quản trị duyệt trước khi tính công.
          </p>
        </section>

        {notice ? <SuccessBox message={notice} /> : null}
        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải địa điểm..." /> : null}

        {!loading ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div className="fts-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Camera quét QR
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Đưa QR in tại văn phòng vào khung hình.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startScanner}
                    disabled={scanning}
                    className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-600 disabled:opacity-60"
                  >
                    Mở camera
                  </button>
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
                  >
                    Dừng
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl bg-slate-950 ring-1 ring-slate-200">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="aspect-video w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {scannerUnsupported ? (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  Trình duyệt không hỗ trợ BarcodeDetector, hệ thống đang dùng
                  bộ quét QR tương thích qua camera.
                </p>
              ) : null}
            </div>

            <div className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Thông tin chấm công
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Địa điểm
                  </label>
                  <select
                    value={officeId}
                    onChange={(event) => setOfficeId(event.target.value)}
                    className="fts-input"
                  >
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {[office.ma_diem, office.ten_diem]
                          .filter(Boolean)
                          .join(" - ")}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOffice ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                    <p className="font-black text-slate-950">
                      {selectedOffice.ten_diem}
                    </p>
                    <p className="mt-1">{selectedOffice.dia_chi || "-"}</p>
                    <p className="mt-1">
                      Bán kính GPS: {selectedOffice.ban_kinh_gps_m || 100}m
                    </p>
                  </div>
                ) : null}

                <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800 ring-1 ring-sky-100">
                  <p className="font-black text-sky-950">
                    Thời điểm chấm công
                  </p>
                  <p className="mt-1 font-semibold">{currentTime.displayText}</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Payload QR
                  </label>
                  <textarea
                    value={qrPayload}
                    onChange={(event) => {
                      const value = event.target.value;
                      const parsed = parseQrPayload(value);
                      setQrPayload(value);

                      if (parsed.office_id) {
                        setOfficeId(parsed.office_id);
                      }
                    }}
                    placeholder="Dán payload QR nếu camera không quét được"
                    className="fts-input min-h-28"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Thiết bị
                  </label>
                  <input
                    value={deviceId}
                    onChange={(event) => setDeviceId(event.target.value)}
                    className="fts-input"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitAttendance}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-4 text-sm font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                >
                  {submitting ? "Đang chấm công..." : "Chấm công"}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
