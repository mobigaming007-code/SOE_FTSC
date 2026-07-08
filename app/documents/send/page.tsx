"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SendDocumentEmailData } from "@/types/api";

export default function SendDocumentPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    document_id: "",
    to_email: "",
    cc: "",
    bcc: "",
    subject: "",
    body_text: "",
    body_html: "",
  });

  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessing(true);
    setNotice("");
    setError("");

    const response = await gasFetch<SendDocumentEmailData>({
      path: "documents/email/send",
      method: "POST",
      body: form,
    });

    setProcessing(false);

    if (!response.success) {
      setError(response.message || "Gửi email văn bản thất bại.");
      return;
    }

    setNotice("Đã gửi email văn bản.");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/documents")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại văn bản
          </button>

          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-50">
            Send Document
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Gửi văn bản qua email
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50 md:text-base">
            Hệ thống sẽ gửi phiên bản file mới nhất của văn bản qua email.
          </p>
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

        <section className="fts-card rounded-[2rem] p-6">
          <h2 className="text-xl font-black text-slate-950">
            Thông tin gửi email
          </h2>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <InputField
              label="Document ID"
              value={form.document_id}
              onChange={(value) => setForm({ ...form, document_id: value })}
              required
            />

            <InputField
              label="Email người nhận"
              value={form.to_email}
              onChange={(value) => setForm({ ...form, to_email: value })}
              placeholder="nguoinhan@example.com"
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="CC"
                value={form.cc}
                onChange={(value) => setForm({ ...form, cc: value })}
              />

              <InputField
                label="BCC"
                value={form.bcc}
                onChange={(value) => setForm({ ...form, bcc: value })}
              />
            </div>

            <InputField
              label="Tiêu đề"
              value={form.subject}
              onChange={(value) => setForm({ ...form, subject: value })}
              placeholder="Gửi văn bản từ hệ thống Fly To Sky"
              required
            />

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Nội dung text
              </label>
              <textarea
                value={form.body_text}
                onChange={(event) =>
                  setForm({ ...form, body_text: event.target.value })
                }
                rows={6}
                className="fts-input"
                placeholder="Kính gửi anh/chị,..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Nội dung HTML
              </label>
              <textarea
                value={form.body_html}
                onChange={(event) =>
                  setForm({ ...form, body_html: event.target.value })
                }
                rows={6}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="<p>Kính gửi anh/chị,</p>"
              />
            </div>

            <button
              disabled={processing}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
            >
              {processing ? "Đang gửi..." : "Gửi email văn bản"}
            </button>
          </form>
        </section>
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
