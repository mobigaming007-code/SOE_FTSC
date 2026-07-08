"use client";

import { useEffect, useState } from "react";
import AuthGuard from "./AuthGuard";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getPermissions, getRoles, subscribeAuthChanged } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    function syncAuthState() {
      setPermissions(getPermissions());
      setRoles(getRoles());
    }

    queueMicrotask(() => {
      syncAuthState();
    });

    return subscribeAuthChanged(syncAuthState);
  }, []);

  return (
    <AuthGuard>
      <div className="relative h-screen overflow-hidden bg-slate-50">
        <div className="fts-page-grid" />

        <div className="relative z-10 flex h-screen overflow-hidden">
          <Sidebar permissions={permissions} roles={roles} />

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
              />

              <div className="absolute inset-y-0 left-0">
                <Sidebar
                  mobile
                  permissions={permissions}
                  roles={roles}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </div>
          ) : null}

          <main className="h-screen min-w-0 flex-1 overflow-y-auto">
            <Topbar onOpenSidebar={() => setMobileOpen(true)} />

            <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
