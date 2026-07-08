"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import StatCard from "@/components/StatCard";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { patchById } from "@/lib/list-state";
import type {
  MarkAllNotificationReadData,
  MarkNotificationReadData,
  NotificationItem,
  NotificationListData,
} from "@/types/api";

export default function EmployeeNotificationsPage() {
  const router = useRouter();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadNotifications(targetUnreadOnly = unreadOnly) {
    setLoading(true);
    setError("");

    const response = await gasFetch<NotificationListData>({
      path: "notifications",
      method: "GET",
      params: {
        unread_only: targetUnreadOnly ? "TRUE" : "FALSE",
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được thông báo.");
      return;
    }

    setItems(response.data.items || []);
    setUnread(response.data.unread || 0);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    loadNotifications(false);
  }, []);

  async function markRead(item: NotificationItem) {
    setProcessingId(item.id);
    setError("");
    setNotice("");

    const response = await gasFetch<MarkNotificationReadData>({
      path: "notifications/read",
      method: "POST",
      body: {
        notification_id: item.id,
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không đánh dấu đọc được.");
      return;
    }

    setItems((prev) =>
      patchById(prev, item.id, {
        read_at: new Date().toISOString(),
      }),
    );

    setUnread((prev) => Math.max(0, prev - 1));
    setNotice("Đã đánh dấu thông báo là đã đọc.");
  }

  async function markAllRead() {
    setProcessingId("ALL");
    setError("");
    setNotice("");

    const response = await gasFetch<MarkAllNotificationReadData>({
      path: "notifications/read-all",
      method: "POST",
      body: {},
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không đánh dấu tất cả được.");
      return;
    }

    const now = new Date().toISOString();

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at || now,
      })),
    );

    setUnread(0);
    setNotice(
      `Đã đánh dấu ${response.data?.updated_count || 0} thông báo là đã đọc.`,
    );
  }

  function changeFilter(value: boolean) {
    setUnreadOnly(value);
    loadNotifications(value);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            My Notifications
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Thông báo của tôi
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Theo dõi thông báo hệ thống, văn bản, đơn nghỉ, chấm công và các
            nhắc việc cá nhân.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Tổng thông báo"
            value={formatNumber(items.length)}
            subtitle="Đang hiển thị"
            icon="🔔"
            tone="sky"
          />

          <StatCard
            title="Chưa đọc"
            value={formatNumber(unread)}
            subtitle="Cần xem"
            icon="✨"
            tone={unread > 0 ? "gold" : "teal"}
          />

          <StatCard
            title="Bộ lọc"
            value={unreadOnly ? "Chưa đọc" : "Tất cả"}
            subtitle="Trạng thái hiện tại"
            icon="🔎"
            tone="navy"
          />
        </section>

        {notice ? (
          <div className="rounded-3xl bg-teal-50 p-4 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
            {notice}
          </div>
        ) : null}

        {error ? <ErrorBox message={error} /> : null}

        <section className="fts-card rounded-[2rem] p-5">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => changeFilter(false)}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-black ring-1",
                !unreadOnly
                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                  : "bg-white text-slate-600 ring-slate-200",
              ].join(" ")}
            >
              Tất cả
            </button>

            <button
              onClick={() => changeFilter(true)}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-black ring-1",
                unreadOnly
                  ? "bg-amber-50 text-amber-700 ring-amber-100"
                  : "bg-white text-slate-600 ring-slate-200",
              ].join(" ")}
            >
              Chưa đọc
            </button>

            <button
              disabled={processingId === "ALL"}
              onClick={markAllRead}
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        </section>

        {loading ? <LoadingBlock text="Đang tải thông báo..." /> : null}

        {!loading ? (
          <section className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="fts-card rounded-[2rem] p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">
                        {item.title}
                      </h2>
                      <Badge value={item.type} />
                      <ReadBadge read={Boolean(item.read_at)} />
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.message}
                    </p>

                    <p className="mt-3 text-xs text-slate-400">
                      {item.created_at || "-"}
                    </p>

                    {item.target_url ? (
                      <a
                        href={item.target_url}
                        className="mt-4 inline-flex rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100"
                      >
                        Mở liên kết →
                      </a>
                    ) : null}
                  </div>

                  {!item.read_at ? (
                    <button
                      disabled={processingId === item.id}
                      onClick={() => markRead(item)}
                      className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 ring-1 ring-teal-100 disabled:opacity-60"
                    >
                      Đã đọc
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {items.length === 0 ? (
              <div className="fts-card rounded-[2rem] p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  Không có thông báo phù hợp.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Badge({ value }: { value?: string }) {
  const text = value || "INFO";

  const className =
    text === "ERROR"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : text === "WARNING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : text === "SUCCESS"
          ? "bg-teal-50 text-teal-700 ring-teal-100"
          : "bg-sky-50 text-sky-700 ring-sky-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {text}
    </span>
  );
}

function ReadBadge({ read }: { read: boolean }) {
  const className = read
    ? "bg-slate-100 text-slate-600 ring-slate-200"
    : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {read ? "Đã đọc" : "Chưa đọc"}
    </span>
  );
}
