"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gasFetch } from "@/lib/api";
import {
  clearAuth,
  getToken,
  markAuthVerified,
  shouldVerifyAuth,
  updateStoredUser,
  userNeedsPasswordChange,
} from "@/lib/auth";
import type { AuthMeData } from "@/types/api";
import { PageLoading } from "./PageState";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (PUBLIC_PATHS.includes(pathname)) {
        if (!cancelled) setChecking(false);
        return;
      }

      const token = getToken();

      if (!token) {
        clearAuth();
        router.replace("/login");
        return;
      }

      if (!shouldVerifyAuth()) {
        if (!cancelled) setChecking(false);
        return;
      }

      const response = await gasFetch<AuthMeData>({
        path: "auth/me",
        method: "GET",
      });

      if (cancelled) return;

      if (!response.success || !response.data?.user) {
        clearAuth();
        router.replace("/login");
        return;
      }

      updateStoredUser(
        response.data.user,
        response.data.permissions || [],
        response.data.roles || [],
      );

      markAuthVerified();

      if (
        userNeedsPasswordChange(response.data.user) &&
        pathname !== "/change-password"
      ) {
        router.replace("/change-password");
        return;
      }

      setChecking(false);
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <PageLoading
        title="Đang kiểm tra phiên đăng nhập..."
        description="Hệ thống đang xác thực tài khoản của bạn."
      />
    );
  }

  return <>{children}</>;
}
