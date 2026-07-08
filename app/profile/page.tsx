"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ErrorBox, PageLoading } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import {
  getRoles,
  getToken,
  normalizePermissions,
  normalizeRoles,
  updateStoredUser,
} from "@/lib/auth";
import {
  formatBooleanLabel,
  formatPermission,
  formatRole,
  formatStatus,
} from "@/lib/labels";
import type { AuthMeData, AuthUser } from "@/types/api";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async function loadProfile() {
    setLoading(true);
    setError("");

    const response = await gasFetch<AuthMeData>({
      path: "auth/me",
      method: "GET",
    });

    setLoading(false);

    if (!response.success || !response.data?.user) {
      setError(response.message || "Không tải được hồ sơ đăng nhập.");
      return;
    }

    setUser(response.data.user);
    setPermissions(normalizePermissions(response.data.permissions || []));
    setRoles(normalizeRoles(response.data.roles || getRoles()));

    updateStoredUser(
      response.data.user,
      response.data.permissions || [],
      response.data.roles || [],
    );
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadProfile();
    });
  }, [loadProfile, router]);

  if (loading) {
    return (
      <AppShell>
        <PageLoading title="Đang tải hồ sơ..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            My Profile
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Hồ sơ cá nhân
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Xem thông tin tài khoản, vai trò và quyền truy cập hiện tại.
          </p>
        </section>

        {error ? <ErrorBox message={error} /> : null}

        {user ? (
          <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="fts-card rounded-[2rem] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-sky-500 to-teal-400 text-3xl font-black text-white shadow-xl shadow-sky-100">
                  {(user.username || user.email_dang_nhap || "F")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-bold text-sky-600">Tài khoản</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {user.username}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.email_dang_nhap}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <InfoRow label="User ID" value={user.id} />
                <InfoRow label="Person ID" value={user.person_id || "-"} />
                <InfoRow
                  label="Trạng thái"
                  value={formatStatus(user.trang_thai)}
                />
                <InfoRow
                  label="Yêu cầu đổi mật khẩu"
                  value={formatBooleanLabel(user.require_password_change)}
                />
                <InfoRow
                  label="Đăng nhập gần nhất"
                  value={user.last_login_at || "-"}
                />
              </div>

              <a
                href="/change-password"
                className="mt-6 inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:bg-slate-800"
              >
                Đổi mật khẩu
              </a>
            </div>

            <div className="space-y-5">
              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">Vai trò</h2>

                <div className="mt-5 flex flex-wrap gap-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100"
                      >
                        {formatRole(role)}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Chưa có dữ liệu vai trò.
                    </p>
                  )}
                </div>
              </div>

              <div className="fts-card rounded-[2rem] p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Quyền truy cập
                </h2>

                <div className="mt-5 grid gap-2 md:grid-cols-2">
                  {permissions.length > 0 ? (
                    permissions.map((permission) => (
                      <div
                        key={permission}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100"
                      >
                        {formatPermission(permission)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Backend chưa trả về danh sách quyền. Menu sẽ hiển thị theo
                      chế độ tương thích.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
