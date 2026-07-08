"use client";

import { useEffect, useMemo, useState } from "react";
import { gasFetch } from "@/lib/api";
import type { PeopleListData, Person } from "@/types/api";

export function formatPersonLabel(person?: Partial<Person> | null) {
  if (!person) {
    return "";
  }

  const name = person.ho_ten || "";
  const code = person.ma_dinh_danh || "";
  const phone = person.sdt || "";

  if (name && code) {
    return `${name} - ${code}${phone ? ` - ${phone}` : ""}`;
  }

  return name || code || phone || person.id || "";
}

type EmployeePickerProps = {
  label: string;
  value: string;
  onChange: (personId: string, person?: Person) => void;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
};

export default function EmployeePicker({
  label,
  value,
  onChange,
  placeholder = "Nhập họ tên, SĐT hoặc mã định danh",
  required = false,
  helperText = "Chọn nhân viên từ danh sách gợi ý.",
}: EmployeePickerProps) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const keyword = query.trim();

    if (keyword.length < 2) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);

      const response = await gasFetch<PeopleListData>({
        path: "people",
        method: "GET",
        params: {
          q: keyword,
        },
      });

      setLoading(false);

      if (response.success && response.data) {
        setItems(response.data.items || []);
        setOpen(true);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const selectedLabel = useMemo(() => {
    if (!selected || selected.id !== value) {
      return "";
    }

    return formatPersonLabel(selected);
  }, [selected, value]);

  function selectPerson(person: Person) {
    setSelected(person);
    setQuery(formatPersonLabel(person));
    setOpen(false);
    onChange(person.id, person);
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        required={required && !value}
        value={selectedLabel || query}
        placeholder={placeholder}
        onFocus={() => setOpen(items.length > 0)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setSelected(null);
          setQuery(nextQuery);
          if (nextQuery.trim().length < 2) {
            setItems([]);
            setOpen(false);
          }
          onChange("");
        }}
        className="fts-input"
      />

      <input tabIndex={-1} className="sr-only" value={value} readOnly />

      {helperText ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {helperText}
        </p>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {loading ? (
            <div className="px-3 py-2 text-sm font-semibold text-slate-500">
              Đang tìm nhân viên...
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="px-3 py-2 text-sm font-semibold text-slate-500">
              Không tìm thấy nhân viên phù hợp.
            </div>
          ) : null}

          {items.map((person) => (
            <button
              key={person.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPerson(person)}
              className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-sky-50"
            >
              <span className="block text-sm font-black text-slate-950">
                {person.ho_ten || person.ma_dinh_danh || person.id}
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {[person.ma_dinh_danh, person.sdt, person.email]
                  .filter(Boolean)
                  .join(" - ")}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
