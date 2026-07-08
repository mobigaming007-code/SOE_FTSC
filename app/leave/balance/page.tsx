"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmployeePicker, { formatPersonLabel } from "@/components/EmployeePicker";
import StatCard from "@/components/StatCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type { LeaveBalance, LeaveBalanceData, Person } from "@/types/api";

export default function LeaveBalancePage() {
  const router = useRouter();

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [personId, setPersonId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  async function loadBalance(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setError("");
    setBalance(null);

    if (!personId.trim()) {
      setError("Vui lòng chọn nhân viên cần tra cứu.");
      return;
    }

    setLoading(true);

    const response = await gasFetch<LeaveBalanceData>({
      path: "leave/balance",
      method: "GET",
      params: {
        person_id: personId.trim(),
        nam: year,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được số dư phép của nhân viên.");
      return;
    }

    setBalance(response.data.balance);
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

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Leave Balance
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Tra cứu số dư phép
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Cổng quản trị dùng màn hình này để xem số dư phép của nhân viên theo
            năm. Nhân viên tạo đơn nghỉ tại cổng nhân viên.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-6">
          <form
            onSubmit={loadBalance}
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <EmployeePicker
              label="Nhân viên"
              value={personId}
              onChange={(value, person) => {
                setPersonId(value);
                setSelectedPerson(person || null);
              }}
              helperText="Nhập họ tên, số điện thoại hoặc mã định danh để chọn nhân viên."
              required
            />

            <InputField
              label="Năm"
              value={year}
              onChange={setYear}
              placeholder="2026"
              required
            />

            <div className="flex items-end">
              <button
                disabled={loading}
                className="fts-button-primary w-full md:w-auto disabled:opacity-60"
              >
                {loading ? "Đang tra cứu..." : "Tra cứu"}
              </button>
            </div>
          </form>
        </section>

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {balance ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng phép"
                value={formatNumber(balance.tong_phep)}
                subtitle={`Năm ${balance.nam || year}`}
                icon="TP"
                tone="sky"
              />

              <StatCard
                title="Đã dùng"
                value={formatNumber(balance.da_dung)}
                subtitle="Ngày đã được duyệt"
                icon="DD"
                tone="teal"
              />

              <StatCard
                title="Đang chờ"
                value={formatNumber(balance.dang_cho_duyet)}
                subtitle="Ngày đang chờ duyệt"
                icon="CL"
                tone="gold"
              />

              <StatCard
                title="Còn lại"
                value={formatNumber(balance.con_lai)}
                subtitle="Ngày phép khả dụng"
                icon="CR"
                tone="navy"
              />
            </section>

            <section className="fts-card rounded-[2rem] p-6">
              <h2 className="text-xl font-black text-slate-950">
                Chi tiết số dư
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoBox
                  label="Nhân viên"
                  value={formatPersonLabel(selectedPerson) || balance.person_id}
                />
                <InfoBox label="Năm" value={String(balance.nam)} />
                <InfoBox
                  label="Tổng phép"
                  value={`${formatNumber(balance.tong_phep)} ngày`}
                />
                <InfoBox
                  label="Đã dùng"
                  value={`${formatNumber(balance.da_dung)} ngày`}
                />
                <InfoBox
                  label="Chờ duyệt"
                  value={`${formatNumber(balance.dang_cho_duyet)} ngày`}
                />
                <InfoBox
                  label="Còn lại"
                  value={`${formatNumber(balance.con_lai)} ngày`}
                />
              </div>
            </section>
          </>
        ) : (
          <section className="fts-card rounded-[2rem] p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Chọn nhân viên và năm để tra cứu số dư phép.
            </p>
          </section>
        )}
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
