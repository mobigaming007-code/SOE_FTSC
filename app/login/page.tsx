"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gasFetch } from "@/lib/api";
import { getToken, normalizePermissions, normalizeRoles, saveAuth } from "@/lib/auth";
import { canAccessAdminPortal } from "@/lib/permissions";
import type { LoginData } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "admin@flytosky.vn",
    password: "ChangeMe@123456",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (token) {
      router.push("/employee");
    }
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const response = await gasFetch<LoginData>({
      path: "auth/login",
      method: "POST",
      body: form,
      skipAuth: true,
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Đăng nhập thất bại.");
      return;
    }

    const permissions = normalizePermissions(response.data.permissions || []);
    const roles = normalizeRoles(response.data.roles || []);

    saveAuth(response.data.token, response.data.user, permissions, roles);

    router.push(canAccessAdminPortal(permissions, roles) ? "/admin" : "/employee");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.36),transparent_34rem),radial-gradient(circle_at_top_right,rgba(20,184,166,0.28),transparent_32rem),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_26rem)]" />

      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex min-h-[42vh] flex-col justify-between p-6 text-white md:p-10 lg:min-h-screen">
          <div className="inline-flex w-fit items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-xl">
            <Image
              src="/logo.png"
              alt="Fly To Sky"
              width={48}
              height={48}
              className="h-12 w-12 rounded-2xl bg-white/15 p-1.5 object-contain ring-1 ring-white/20"
              priority
            />
            <div>
              <p className="text-sm font-bold text-sky-100">Fly To Sky</p>
              <p className="text-lg font-black">Văn phòng số</p>
            </div>
          </div>

          <div className="max-w-3xl py-12">
            <div className="mb-5 inline-flex rounded-full bg-sky-400/15 px-4 py-2 text-sm font-black text-sky-100 ring-1 ring-sky-300/20">
              Digital Office Platform
            </div>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              Quản trị nội bộ
              <span className="block bg-gradient-to-r from-sky-200 via-cyan-100 to-teal-200 bg-clip-text text-transparent">
                gọn, đẹp, trực quan.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Hệ thống quản lý nhân sự, chấm công GPS/QR, nghỉ phép, lương, văn
              bản và quản trị vận hành cho Fly To Sky.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 md:grid-cols-3">
              <FeaturePill icon="👥" label="Nhân sự" />
              <FeaturePill icon="📍" label="Chấm công" />
              <FeaturePill icon="💳" label="Lương" />
              <FeaturePill icon="📄" label="Văn bản" />
              <FeaturePill icon="🗓️" label="Nghỉ phép" />
              <FeaturePill icon="⚙️" label="Quản trị" />
            </div>
          </div>

          <p className="text-sm text-slate-400">
            © Fly To Sky. Hệ thống văn phòng số nội bộ.
          </p>
        </section>

        <section className="flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white/90 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-2xl md:p-8">
            <div className="mb-8 text-center">
              <Image
                src="/logo.png"
                alt="Fly To Sky"
                width={64}
                height={64}
                className="mx-auto mb-5 h-16 w-16 rounded-[1.4rem] bg-white p-2 object-contain shadow-xl shadow-sky-100 ring-1 ring-sky-100"
                priority
              />

              <h2 className="text-3xl font-black text-slate-950">Đăng nhập</h2>

              <p className="mt-2 text-sm text-slate-500">
                Truy cập hệ thống văn phòng số Fly To Sky.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Tài khoản
                </label>
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      username: event.target.value,
                    })
                  }
                  className="fts-input"
                  placeholder="admin@flytosky.vn"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  className="fts-input"
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <button
                disabled={loading}
                className="fts-button-primary w-full disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
              </button>
            </form>

            <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
              Tài khoản mặc định chỉ dùng để khởi tạo hệ thống. Sau khi vào hệ
              thống thật, hãy đổi mật khẩu ngay tại trang hồ sơ cá nhân.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 backdrop-blur-xl">
      <span className="mr-2">{icon}</span>
      {label}
    </div>
  );
}
