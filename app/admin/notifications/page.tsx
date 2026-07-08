"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type {
  CreateNotificationData,
  MarkAllNotificationReadData,
  MarkNotificationReadData,
  NotificationItem,
  NotificationListData,
} from "@/types/api";

const defaultForm = {
  user_id: "",
  title: "",
  message: "",
  type: "INFO",
  target_url: "",
};

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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

    setNotifications(response.data.items || []);
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

  async function createNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setNotice("");

    const response = await gasFetch<CreateNotificationData>({
      path: "notifications/create",
      method: "POST",
      body: form,
    });

    setCreating(false);

    if (!response.success) {
      setError(response.message || "Không tạo được thông báo.");
      return;
    }

    setNotice("Đã tạo thông báo.");
    setForm(defaultForm);
    loadNotifications(unreadOnly);
  }

  async function markRead(notification: NotificationItem) {
    setProcessingId(notification.id);
    setError("");
    setNotice("");

    const response = await gasFetch<MarkNotificationReadData>({
      path: "notifications/read",
      method: "POST",
      body: {
        notification_id: notification.id,
      },
    });

    setProcessingId("");

    if (!response.success) {
      setError(response.message || "Không đánh dấu đọc được thông báo.");
      return;
    }

    setNotice("Đã đánh dấu thông báo là đã đọc.");
    loadNotifications(unreadOnly);
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

    setNotice(
      `Đã đánh dấu ${response.data?.updated_count || 0} thông báo là đã đọc.`,
    );
    loadNotifications(unreadOnly);
  }

  function changeUnreadOnly(value: boolean) {
    setUnreadOnly(value);
    loadNotifications(value);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại Admin
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Notifications
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Thông báo nội bộ
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            Tạo thông báo cho người dùng và quản lý thông báo của tài khoản hiện
            tại.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MiniStat
            title="Tổng thông báo"
            value={formatNumber(notifications.length)}
          />
          <MiniStat title="Chưa đọc" value={formatNumber(unread)} tone="gold" />
          <MiniStat
            title="Đang lọc"
            value={unreadOnly ? "Chưa đọc" : "Tất cả"}
            tone={unreadOnly ? "gold" : "sky"}
          />
        </section>

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

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="fts-card rounded-[2rem] p-6">
            <h2 className="text-xl font-black text-slate-950">Tạo thông báo</h2>

            <form onSubmit={createNotification} className="mt-5 grid gap-4">
              <InputField
                label="User ID người nhận"
                value={form.user_id}
                onChange={(value) => setForm({ ...form, user_id: value })}
                placeholder="USER_xxxxx"
                required
              />

              <InputField
                label="Tiêu đề"
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
                placeholder="Thông báo hệ thống"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nội dung
                </label>
                <textarea
                  required
                  value={form.message}
                  onChange={(event) =>
                    setForm({ ...form, message: event.target.value })
                  }
                  rows={5}
                  className="fts-input"
                  placeholder="Nội dung thông báo..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Loại"
                  value={form.type}
                  onChange={(value) => setForm({ ...form, type: value })}
                  options={[
                    { value: "INFO", label: "INFO" },
                    { value: "SUCCESS", label: "SUCCESS" },
                    { value: "WARNING", label: "WARNING" },
                    { value: "ERROR", label: "ERROR" },
                  ]}
                />

                <InputField
                  label="Target URL"
                  value={form.target_url}
                  onChange={(value) => setForm({ ...form, target_url: value })}
                  placeholder="/dashboard"
                />
              </div>

              <button
                disabled={creating}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
              >
                {creating ? "Đang tạo..." : "Tạo thông báo"}
              </button>
            </form>
          </div>

          <div className="fts-card rounded-[2rem] p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Thông báo của tôi
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Xem và đánh dấu thông báo đã đọc.
                </p>
              </div>

              <button
                disabled={processingId === "ALL"}
                onClick={markAllRead}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => changeUnreadOnly(false)}
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
                onClick={() => changeUnreadOnly(true)}
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
                onClick={() => loadNotifications(unreadOnly)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-200"
              >
                Tải lại
              </button>
            </div>

            {loading ? (
              <div className="mt-5">
                <LoadingBlock text="Đang tải thông báo..." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-950">
                            {item.title}
                          </p>
                          <TypeBadge type={item.type} />
                          <ReadBadge read={Boolean(item.read_at)} />
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {item.created_at || "-"}
                        </p>

                        {item.target_url ? (
                          <a
                            href={item.target_url}
                            className="mt-3 inline-flex text-sm font-black text-sky-600 hover:text-sky-700"
                          >
                            Mở liên kết →
                          </a>
                        ) : null}
                      </div>

                      {!item.read_at ? (
                        <button
                          disabled={processingId === item.id}
                          onClick={() => markRead(item)}
                          className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100 disabled:opacity-60"
                        >
                          Đã đọc
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {notifications.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                    Không có thông báo phù hợp.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MiniStat({
  title,
  value,
  tone = "sky",
}: {
  title: string;
  value: string;
  tone?: "sky" | "gold";
}) {
  const className =
    tone === "gold"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-sky-50 text-sky-700 ring-sky-100";

  return (
    <div className="fts-card rounded-3xl p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p
        className={`mt-3 inline-flex rounded-2xl px-4 py-2 text-2xl font-black ring-1 ${className}`}
      >
        {value}
      </p>
    </div>
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

function TypeBadge({ type }: { type: string }) {
  const value = type || "INFO";

  const className =
    value === "ERROR"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : value === "WARNING"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "SUCCESS"
          ? "bg-teal-50 text-teal-700 ring-teal-100"
          : "bg-sky-50 text-sky-700 ring-sky-100";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {value}
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
