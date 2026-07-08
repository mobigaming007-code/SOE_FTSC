"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { PeopleDirectoryData, PeopleDirectoryItem } from "@/types/api";

const keyPositionPatterns = [
  "POS_DIRECTOR",
  "POS_DEPUTY_DIRECTOR",
  "POS_CHAIRMAN",
  "POS_VICE_CHAIRMAN",
  "POS_HR",
  "POS_ACCOUNTANT",
  "POS_DEPARTMENT_MANAGER",
  "POS_DEPUTY_DEPARTMENT_MANAGER",
  "POS_MANAGER",
  "POS_CLUB_GENERAL_LEADER",
  "POS_CLUB_DEPUTY_GENERAL_LEADER",
  "POS_CLUB_DEPARTMENT_HEAD",
  "POS_CLUB_DEPARTMENT_DEPUTY",
  "POS_CLUB_OFFICE_CHIEF",
  "POS_CLUB_OFFICE_DEPUTY",
  "POS_CLUB_DEPARTMENT_MANAGER",
  "POS_CLUB_DEPUTY_DEPARTMENT_MANAGER",
  "POS_CLUB_BRANCH_LEADER",
  "POS_CLUB_BRANCH_DEPUTY",
  "POS_CLUB_BRANCH_STANDING_DEPUTY",
  "POS_CLUB_BRANCH_OFFICE_CHIEF",
  "POS_CLUB_BRANCH_OFFICE_DEPUTY",
  "POS_CLUB_BRANCH_DEPARTMENT_HEAD",
  "POS_CLUB_BRANCH_DEPARTMENT_DEPUTY",
  "GIAM_DOC",
  "PHO_GIAM_DOC",
  "CHU_TICH",
  "PHO_CHU_TICH",
  "HR",
  "KE_TOAN",
  "TRUONG_PHONG",
  "PHO_TRUONG_PHONG",
  "TRUONG_DON_VI",
  "TONG_CHU_NHIEM",
  "PHO_TONG_CHU_NHIEM",
  "TRUONG_BAN",
  "PHO_TRUONG_BAN",
  "CHANH_VAN_PHONG",
  "PHO_CHANH_VAN_PHONG",
  "CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_CHI_NHANH",
  "PHO_CHU_NHIEM_TT_CHI_NHANH",
  "CHANH_VAN_PHONG_CHI_NHANH",
  "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  "TRUONG_BAN_CHI_NHANH",
  "PHO_TRUONG_BAN_CHI_NHANH",
];

const positionLabels: Record<string, string> = {
  POS_DIRECTOR: "Giám đốc",
  POS_DEPUTY_DIRECTOR: "Phó Giám đốc",
  POS_CHAIRMAN: "Chủ tịch",
  POS_VICE_CHAIRMAN: "Phó Chủ tịch",
  POS_HR: "Nhân sự/HR",
  POS_ACCOUNTANT: "Kế toán",
  POS_DEPARTMENT_MANAGER: "Trưởng Phòng",
  POS_DEPUTY_DEPARTMENT_MANAGER: "Phó Trưởng Phòng",
  POS_MANAGER: "Quản lý/Trưởng đơn vị",
  POS_SPECIALIST: "Chuyên viên",
  POS_INTERN: "Thực tập sinh",
  POS_CLUB_GENERAL_LEADER: "Tổng Chủ nhiệm",
  POS_CLUB_DEPUTY_GENERAL_LEADER: "Phó Tổng Chủ nhiệm",
  POS_CLUB_DEPARTMENT_HEAD: "Trưởng Ban",
  POS_CLUB_DEPARTMENT_DEPUTY: "Phó Trưởng Ban",
  POS_CLUB_OFFICE_CHIEF: "Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  POS_CLUB_OFFICE_DEPUTY: "Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  POS_CLUB_DEPARTMENT_MANAGER: "Trưởng Phòng",
  POS_CLUB_DEPUTY_DEPARTMENT_MANAGER: "Phó Trưởng Phòng",
  POS_CLUB_BRANCH_LEADER: "Chủ nhiệm Chi nhánh",
  POS_CLUB_BRANCH_DEPUTY: "Phó Chủ nhiệm Chi nhánh",
  POS_CLUB_BRANCH_STANDING_DEPUTY: "Phó Chủ nhiệm Thường trực Chi nhánh",
  POS_CLUB_BRANCH_OFFICE_CHIEF: "Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  POS_CLUB_BRANCH_OFFICE_DEPUTY: "Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  POS_CLUB_BRANCH_DEPARTMENT_HEAD: "Trưởng Ban thuộc Chi nhánh",
  POS_CLUB_BRANCH_DEPARTMENT_DEPUTY: "Phó Trưởng Ban thuộc Chi nhánh",
  POS_CLUB_VOLUNTEER: "Tình nguyện viên",
};

function getPositionLabel(item: PeopleDirectoryItem) {
  const currentName = item.ten_chuc_danh || "";

  return (
    (currentName.startsWith("POS_") ? "" : currentName) ||
    positionLabels[item.position_id || ""] ||
    item.ma_chuc_danh ||
    "-"
  );
}

function isKeyPosition(item: PeopleDirectoryItem) {
  const text = [
    item.ma_chuc_danh,
    item.ten_chuc_danh,
    item.position_id,
  ]
    .join(" ")
    .toUpperCase();

  return keyPositionPatterns.some((pattern) => text.includes(pattern));
}

function groupByUnit(items: PeopleDirectoryItem[]) {
  return items.reduce<Record<string, PeopleDirectoryItem[]>>((acc, item) => {
    const unit = item.ten_don_vi || "Chưa phân đơn vị";

    if (!acc[unit]) {
      acc[unit] = [];
    }

    acc[unit].push(item);
    return acc;
  }, {});
}

export default function EmployeeDirectoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<PeopleDirectoryItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDirectory = useCallback(async function loadDirectory(search = q) {
    setLoading(true);
    setError("");

    const response = await gasFetch<PeopleDirectoryData>({
      path: "people/directory",
      method: "GET",
      params: {
        q: search,
      },
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không tải được danh bạ nhân viên.");
      return;
    }

    setItems(response.data.items || []);
  }, [q]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      void loadDirectory("");
    });
  }, [loadDirectory, router]);

  const grouped = useMemo(() => groupByUnit(items), [items]);
  const groupNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Directory
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Danh bạ nhân viên
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Tra cứu thông tin liên hệ, chức danh và đơn vị của nhân sự trong hệ
            thống.
          </p>
        </section>

        <section className="fts-card rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm theo mã định danh, họ tên, số điện thoại, email, chức danh, đơn vị..."
              className="fts-input"
            />
            <button
              type="button"
              onClick={() => loadDirectory(q)}
              className="fts-button-primary"
            >
              Tìm kiếm
            </button>
          </div>
        </section>

        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải danh bạ..." /> : null}

        {!loading ? (
          <div className="space-y-5">
            {groupNames.map((unit) => (
              <section
                key={unit}
                className="fts-card overflow-hidden rounded-[2rem]"
              >
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-black text-slate-950">{unit}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {grouped[unit].length} nhân sự
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Mã định danh</th>
                        <th className="px-5 py-4">Họ tên</th>
                        <th className="px-5 py-4">Số điện thoại</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Chức danh</th>
                        <th className="px-5 py-4">Phòng/Ban/Đơn vị</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {grouped[unit].map((item) => {
                        const keyPosition = isKeyPosition(item);
                        const positionLabel = getPositionLabel(item);

                        return (
                          <tr
                            key={`${item.person.id}-${item.org_unit_id || "unit"}`}
                            className={
                              keyPosition ? "bg-amber-50/60" : "bg-white"
                            }
                          >
                            <td className="px-5 py-4 text-sm font-black text-slate-950">
                              {item.person.ma_dinh_danh || "-"}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-black text-slate-950">
                                {item.person.ho_ten || "-"}
                              </p>
                              {keyPosition ? (
                                <p className="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                                  Chức danh chủ chốt
                                </p>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {item.person.sdt || "-"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {item.person.email || "-"}
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-slate-700">
                              <span
                                className={
                                  keyPosition
                                    ? "inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-800 ring-1 ring-sky-100"
                                    : ""
                                }
                              >
                                {positionLabel}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              <p className="font-bold text-slate-700">
                                {item.ten_don_vi || "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {item.loai_don_vi || "-"} · {item.org_type || "-"}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            {items.length === 0 ? (
              <section className="fts-card rounded-[2rem] p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  Chưa có nhân sự phù hợp.
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
