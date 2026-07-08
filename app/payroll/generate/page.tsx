"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import EmployeePicker from "@/components/EmployeePicker";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  GeneratePayrollData,
  PayrollAdjustmentData,
  PayrollPeriod,
  PayrollPeriodListData,
} from "@/types/api";

const adjustmentTypes = [
  { value: "ALLOWANCE", label: "Phụ cấp" },
  { value: "OT", label: "OT" },
  { value: "BONUS", label: "Thưởng" },
  { value: "DEDUCTION", label: "Khấu trừ" },
  { value: "ADVANCE", label: "Tạm ứng" },
  { value: "OTHER_ADD", label: "Khoản cộng khác" },
  { value: "OTHER_DEDUCT", label: "Khoản trừ khác" },
];

export default function PayrollGeneratePage() {
  const router = useRouter();

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [defaultSalary, setDefaultSalary] = useState("6000000");
  const [defaultAllowance, setDefaultAllowance] = useState("0");
  const [standardWorkDays, setStandardWorkDays] = useState("26");
  const [overwrite, setOverwrite] = useState("TRUE");

  const [adjustmentForm, setAdjustmentForm] = useState({
    person_id: "",
    adjustment_type: "ALLOWANCE",
    ten_khoan: "Phụ cấp",
    so_tien: "",
    ghi_chu: "",
  });

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<GeneratePayrollData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPeriods = useCallback(async function loadPeriods() {
    setLoading(true);
    setError("");

    const response = await gasFetch<PayrollPeriodListData>({
      path: "payroll/periods",
      method: "GET",
      params: {
        nam: String(new Date().getFullYear()),
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được kỳ lương.");
      return;
    }

    const items = response.data.items || [];
    setPeriods(items);
    setPeriodId((current) => current || items[0]?.id || "");
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadPeriods();
    });
  }, [loadPeriods, router]);

  async function addAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setError("");
    setNotice("");

    const response = await gasFetch<PayrollAdjustmentData>({
      path: "payroll/adjustments/create",
      method: "POST",
      body: {
        payroll_period_id: periodId,
        ...adjustmentForm,
      },
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Không thêm được điều chỉnh.");
      return;
    }

    setNotice("Đã thêm điều chỉnh lương.");
    setAdjustmentForm({
      person_id: "",
      adjustment_type: "ALLOWANCE",
      ten_khoan: "Phụ cấp",
      so_tien: "",
      ghi_chu: "",
    });
  }

  async function generatePayroll() {
    setProcessing(true);
    setError("");
    setNotice("");
    setResult(null);

    const response = await gasFetch<GeneratePayrollData>({
      path: "payroll/generate",
      method: "POST",
      body: {
        payroll_period_id: periodId,
        org_unit_id: orgUnitId,
        default_luong_co_ban: defaultSalary,
        default_phu_cap: defaultAllowance,
        so_cong_chuan: standardWorkDays,
        overwrite,
      },
    });

    setProcessing(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tính được bảng lương.");
      return;
    }

    setResult(response.data);
    setNotice("Đã xuất và lưu bảng lương tháng thành công.");
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

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Payroll Generate
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Xuất bảng lương tháng
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            Tạo và lưu trữ phiếu lương tháng từ công, nghỉ phép được duyệt,
            phụ cấp, OT, thưởng, khấu trừ và các khoản điều chỉnh.
          </p>
        </section>

        {loading ? <LoadingBlock text="Đang tải kỳ lương..." /> : null}

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
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Tham số xuất bảng lương
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Kỳ lương"
                  value={periodId}
                  onChange={setPeriodId}
                  options={periods.map((period) => ({
                    value: period.id,
                    label: `Tháng ${period.thang}/${period.nam} - ${period.trang_thai}`,
                  }))}
                />

                <InputField
                  label="Org Unit ID"
                  value={orgUnitId}
                  onChange={setOrgUnitId}
                  placeholder="Để trống để tính toàn bộ"
                />

                <InputField
                  label="Lương cơ bản mặc định"
                  value={defaultSalary}
                  onChange={setDefaultSalary}
                  placeholder="6000000"
                />

                <InputField
                  label="Phụ cấp mặc định"
                  value={defaultAllowance}
                  onChange={setDefaultAllowance}
                  placeholder="0"
                />

                <InputField
                  label="Số công chuẩn"
                  value={standardWorkDays}
                  onChange={setStandardWorkDays}
                  placeholder="26"
                />

                <SelectField
                  label="Ghi đè phiếu cũ"
                  value={overwrite}
                  onChange={setOverwrite}
                  options={[
                    { value: "TRUE", label: "Có, tính lại" },
                    { value: "FALSE", label: "Không, bỏ qua phiếu đã có" },
                  ]}
                />

                <div className="md:col-span-2">
                  <button
                    disabled={processing || !periodId}
                    onClick={generatePayroll}
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                  >
                    {processing ? "Đang xuất..." : "Xuất bảng lương tháng"}
                  </button>
                </div>
              </div>
            </div>

            <div className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Thêm điều chỉnh lương
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Dùng để thêm phụ cấp, OT, thưởng, khấu trừ hoặc tạm ứng cho từng
                người trước khi xuất bảng lương tháng.
              </p>

              <form
                onSubmit={addAdjustment}
                className="mt-5 grid gap-4 md:grid-cols-2"
              >
                <EmployeePicker
                  label="Nhân viên"
                  value={adjustmentForm.person_id}
                  onChange={(personId) =>
                    setAdjustmentForm({ ...adjustmentForm, person_id: personId })
                  }
                  helperText="Nhập họ tên, số điện thoại hoặc mã định danh để chọn nhân viên điều chỉnh lương."
                  required
                />

                <SelectField
                  label="Loại điều chỉnh"
                  value={adjustmentForm.adjustment_type}
                  onChange={(value) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      adjustment_type: value,
                      ten_khoan:
                        adjustmentTypes.find((item) => item.value === value)
                          ?.label || value,
                    })
                  }
                  options={adjustmentTypes}
                />

                <InputField
                  label="Tên khoản"
                  value={adjustmentForm.ten_khoan}
                  onChange={(value) =>
                    setAdjustmentForm({ ...adjustmentForm, ten_khoan: value })
                  }
                  required
                />

                <InputField
                  label="Số tiền"
                  value={adjustmentForm.so_tien}
                  onChange={(value) =>
                    setAdjustmentForm({ ...adjustmentForm, so_tien: value })
                  }
                  placeholder="500000"
                  required
                />

                <div className="md:col-span-2">
                  <InputField
                    label="Ghi chú"
                    value={adjustmentForm.ghi_chu}
                    onChange={(value) =>
                      setAdjustmentForm({ ...adjustmentForm, ghi_chu: value })
                    }
                    placeholder="VD: Phụ cấp xăng xe tháng này"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    disabled={processing || !periodId}
                    className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Thêm điều chỉnh
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">
              Kết quả xuất bảng lương
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ResultBox
                label="Đã tạo phiếu"
                value={formatNumber(result.generated_count)}
              />
              <ResultBox
                label="Bỏ qua"
                value={formatNumber(result.skipped_count)}
              />
              <ResultBox
                label="Tổng thực nhận"
                value={formatCurrency(
                  result.payslips.reduce(
                    (sum, item) => sum + Number(item.thuc_nhan_encrypted || 0),
                    0,
                  ),
                )}
              />
            </div>

            <div className="mt-5">
              <a
                href={`/payroll/payslips?period=${periodId}`}
                className="inline-flex rounded-2xl bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
              >
                Xem danh sách phiếu lương →
              </a>
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
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        placeholder={placeholder}
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

function ResultBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
