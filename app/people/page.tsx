"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatStatus } from "@/lib/labels";
import type { CreatePersonData, PeopleListData, Person } from "@/types/api";
import { prependUniqueById } from "@/lib/list-state";

type PersonForm = {
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  sdt: string;
  email: string;
  dia_chi_thuong_tru: string;
  noi_o_hien_tai: string;
};

const defaultForm: PersonForm = {
  ho_ten: "",
  ngay_sinh: "",
  gioi_tinh: "Nam",
  sdt: "",
  email: "",
  dia_chi_thuong_tru: "",
  noi_o_hien_tai: "",
};

function normalizePhoneDisplay(value: string) {
  const phone = value.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
  return /^\d{9}$/.test(phone) ? `0${phone}` : phone;
}

export default function PeoplePage() {
  const router = useRouter();

  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PersonForm>(defaultForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPeople = useCallback(async function loadPeople(keyword = "") {
    setLoading(true);
    setError("");

    const response = await gasFetch<PeopleListData>({
      path: "people",
      method: "GET",
      params: {
        q: keyword,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh sách nhân sự.");
      return;
    }

    setPeople(response.data.items || []);
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadPeople("");
    });
  }, [loadPeople, router]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadPeople(q);
  }

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setNotice("");

    const response = await gasFetch<CreatePersonData>({
      path: "people/create",
      method: "POST",
      body: form,
    });

    setCreating(false);

    if (!response.success || !response.data?.person) {
      setError(response.message || "Không tạo được hồ sơ.");
      return;
    }

    setNotice("Đã tạo hồ sơ nhân sự thành công.");
    setShowCreate(false);
    setForm(defaultForm);

    const createdPerson = response.data.person;
    const keyword = q.trim().toLowerCase();
    const matchesFilter = !keyword
      || [
        createdPerson.ho_ten,
        createdPerson.ma_dinh_danh,
        createdPerson.email,
        createdPerson.sdt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

    if (matchesFilter) {
      setPeople((current) => prependUniqueById(current, createdPerson));
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                Human Resource
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Quản lý nhân sự
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
                Quản lý hồ sơ cá nhân, quan hệ Công ty/CLB, tài khoản đăng nhập
                và phân quyền người dùng.
              </p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50"
            >
              + Tạo hồ sơ
            </button>
          </div>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <form onSubmit={search} className="flex flex-col gap-3 md:flex-row">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm theo họ tên, mã định danh, email, SĐT..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600">
              Tìm kiếm
            </button>

            <button
              type="button"
              onClick={() => {
                setQ("");
                loadPeople("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Làm mới
            </button>
          </form>
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

        {loading ? (
          <LoadingBlock text="Đang tải danh sách nhân sự..." />
        ) : (
          <section className="fts-card overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Danh sách hồ sơ
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {people.length} hồ sơ.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Họ tên</th>
                    <th className="px-5 py-4">Mã định danh</th>
                    <th className="px-5 py-4">Liên hệ</th>
                    <th className="px-5 py-4">Giới tính</th>
                    <th className="px-5 py-4">Ngày sinh</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {people.map((person) => (
                    <tr
                      key={person.id}
                      className="transition hover:bg-sky-50/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 font-black text-white">
                            {person.ho_ten?.charAt(0)?.toUpperCase() || "F"}
                          </div>
                          <div>
                            <p className="font-black text-slate-950">
                              {person.ho_ten || "Chưa có tên"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {person.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {person.ma_dinh_danh || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {person.sdt || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {person.email || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {person.gioi_tinh || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {person.ngay_sinh || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={person.trang_thai} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            router.push(
                              `/people/${encodeURIComponent(person.ma_dinh_danh || person.id)}`,
                            )
                          }
                          className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}

                  {people.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <p className="text-sm font-semibold text-slate-500">
                          Chưa có hồ sơ phù hợp.
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showCreate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-sky-600">
                    Hồ sơ nhân sự
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Tạo hồ sơ mới
                  </h2>
                </div>

                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
                >
                  Đóng
                </button>
              </div>

              <form
                onSubmit={createPerson}
                className="grid gap-4 md:grid-cols-2"
              >
                <FormField
                  label="Họ và tên"
                  value={form.ho_ten}
                  required
                  onChange={(value) => setForm({ ...form, ho_ten: value })}
                />

                <FormField
                  label="Ngày sinh"
                  type="date"
                  value={form.ngay_sinh}
                  onChange={(value) => setForm({ ...form, ngay_sinh: value })}
                />

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Giới tính
                  </label>
                  <select
                    value={form.gioi_tinh}
                    onChange={(event) =>
                      setForm({ ...form, gioi_tinh: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  >
                    <option>Nam</option>
                    <option>Nữ</option>
                    <option>Khác</option>
                  </select>
                </div>

                <FormField
                  label="Số điện thoại"
                  value={form.sdt}
                  onChange={(value) => setForm({ ...form, sdt: value })}
                  onBlur={() =>
                    setForm({ ...form, sdt: normalizePhoneDisplay(form.sdt) })
                  }
                />

                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                />

                <FormField
                  label="Địa chỉ thường trú"
                  value={form.dia_chi_thuong_tru}
                  onChange={(value) =>
                    setForm({ ...form, dia_chi_thuong_tru: value })
                  }
                />

                <div className="md:col-span-2">
                  <FormField
                    label="Nơi ở hiện tại"
                    value={form.noi_o_hien_tai}
                    onChange={(value) =>
                      setForm({ ...form, noi_o_hien_tai: value })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    disabled={creating}
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-3 font-black text-white shadow-xl shadow-sky-100 transition hover:from-sky-600 hover:to-teal-500 disabled:opacity-60"
                  >
                    {creating ? "Đang tạo..." : "Tạo hồ sơ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function FormField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="fts-input"
      />
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";

  const className =
    value === "ACTIVE"
      ? "bg-teal-50 text-teal-700 ring-teal-100"
      : value === "LOCKED"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : value === "DELETED"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}
