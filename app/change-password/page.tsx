"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ErrorBox, SuccessBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ChangePasswordData } from "@/types/api";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (form.new_password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSaving(true);

    const response = await gasFetch<ChangePasswordData>({
      path: "auth/change-password",
      method: "POST",
      body: {
        old_password: form.old_password,
        new_password: form.new_password,
      },
    });

    setSaving(false);

    if (!response.success) {
      setError(response.message || "Không đổi được mật khẩu.");
      return;
    }

    setNotice("Đã đổi mật khẩu thành công.");

    setForm({
      old_password: "",
      new_password: "",
      confirm_password: "",
    });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Security
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Đổi mật khẩu
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Cập nhật mật khẩu đăng nhập của tài khoản hiện tại.
          </p>
        </section>

        {notice ? <SuccessBox message={notice} /> : null}
        {error ? <ErrorBox message={error} /> : null}

        <section className="fts-card rounded-[2rem] p-6">
          <h2 className="text-xl font-black text-slate-950">
            Thông tin mật khẩu
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <PasswordField
              label="Mật khẩu hiện tại"
              value={form.old_password}
              onChange={(value) =>
                setForm({
                  ...form,
                  old_password: value,
                })
              }
            />

            <PasswordField
              label="Mật khẩu mới"
              value={form.new_password}
              onChange={(value) =>
                setForm({
                  ...form,
                  new_password: value,
                })
              }
            />

            <PasswordField
              label="Nhập lại mật khẩu mới"
              value={form.confirm_password}
              onChange={(value) =>
                setForm({
                  ...form,
                  confirm_password: value,
                })
              }
            />

            <button
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
            >
              {saving ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function PasswordField({
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
        required
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="fts-input"
      />
    </div>
  );
}
