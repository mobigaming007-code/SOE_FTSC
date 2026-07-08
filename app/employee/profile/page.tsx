"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import { ErrorBox } from "@/components/PageState";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatBooleanLabel, formatStatus } from "@/lib/labels";
import type {
  EmployeeProfileData,
  Payslip,
  PayslipListData,
  PersonDocument,
} from "@/types/api";

export default function EmployeeProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async function loadProfile() {
    setLoading(true);
    setError("");

    const [profileResponse, payslipResponse] = await Promise.all([
      gasFetch<EmployeeProfileData>({
        path: "people/me",
        method: "GET",
      }),
      gasFetch<PayslipListData>({
        path: "payroll/payslips/my",
        method: "GET",
      }),
    ]);

    setLoading(false);

    if (!profileResponse.success || !profileResponse.data) {
      setError(profileResponse.message || "Không tải được hồ sơ cá nhân.");
      return;
    }

    setProfile(profileResponse.data);

    if (payslipResponse.success && payslipResponse.data) {
      setPayslips(payslipResponse.data.items || []);
    }
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

  const latestPayslip = payslips[0];
  const documents = profile?.hrm?.documents || [];
  const degreeDocs = documents.filter((item) => item.doc_type === "DEGREE");
  const certificateDocs = documents.filter(
    (item) => item.doc_type === "CERTIFICATE",
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
            Employee Profile
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Hồ sơ cá nhân
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
            Xem toàn bộ thông tin nhân sự, tổ chức, tài khoản nội bộ và lương
            của chính bạn.
          </p>
        </section>

        {error ? <ErrorBox message={error} /> : null}
        {loading ? <LoadingBlock text="Đang tải hồ sơ cá nhân..." /> : null}

        {!loading && profile ? (
          <>
            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <InfoSection title="Thông tin cá nhân">
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoRow label="Họ và tên" value={profile.person.ho_ten} />
                  <InfoRow
                    label="Mã định danh"
                    value={profile.person.ma_dinh_danh}
                  />
                  <InfoRow label="Ngày sinh" value={profile.person.ngay_sinh} />
                  <InfoRow label="Giới tính" value={profile.person.gioi_tinh} />
                  <InfoRow label="Số điện thoại" value={profile.person.sdt} />
                  <InfoRow label="Email" value={profile.person.email} />
                  <InfoRow
                    label="Địa chỉ thường trú"
                    value={profile.person.dia_chi_thuong_tru}
                  />
                  <InfoRow
                    label="Nơi ở hiện tại"
                    value={profile.person.noi_o_hien_tai}
                  />
                </div>
              </InfoSection>

              <InfoSection title="Chức danh, phòng, ban, đơn vị">
                <div className="space-y-3">
                  {profile.memberships.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {item.ten_chuc_danh || item.position_id || "-"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.ten_don_vi || item.org_unit_id || "-"}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {item.org_type || "-"} · {item.loai_don_vi || "-"} ·{" "}
                        {item.loai_quan_he || "-"}
                      </p>
                    </div>
                  ))}

                  {profile.memberships.length === 0 ? <EmptyText /> : null}
                </div>
              </InfoSection>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <InfoSection title="CCCD">
                <InfoRow
                  label="Số CCCD"
                  value={profile.hrm.cccd.so_cccd_encrypted}
                />
                <InfoRow label="Ngày cấp" value={profile.hrm.cccd.ngay_cap} />
                <InfoRow label="Nơi cấp" value={profile.hrm.cccd.noi_cap} />
              </InfoSection>

              <InfoSection title="BHXH">
                <InfoRow
                  label="Số BHXH"
                  value={profile.hrm.insurance.so_bhxh_encrypted}
                />
                <InfoRow
                  label="Mức đóng"
                  value={formatCurrency(profile.hrm.insurance.muc_dong)}
                />
                <InfoRow
                  label="Ngày bắt đầu"
                  value={profile.hrm.insurance.ngay_bat_dau}
                />
              </InfoSection>

              <InfoSection title="Thuế">
                <InfoRow
                  label="Mã số thuế"
                  value={profile.hrm.tax.mst_ca_nhan_encrypted}
                />
                <InfoRow
                  label="Người phụ thuộc"
                  value={formatNumber(profile.hrm.tax.so_nguoi_phu_thuoc)}
                />
                <InfoRow label="Ghi chú" value={profile.hrm.tax.ghi_chu} />
              </InfoSection>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <ListSection title="Hợp đồng lao động">
                {(profile.hrm.contracts || []).map((item) => (
                  <RecordCard key={item.id || item.so_hop_dong}>
                    <InfoRow label="Số hợp đồng" value={item.so_hop_dong} />
                    <InfoRow label="Loại hợp đồng" value={item.loai_hop_dong} />
                    <InfoRow label="Ngày ký" value={item.ngay_ky} />
                    <InfoRow label="Hiệu lực" value={item.ngay_hieu_luc} />
                    <InfoRow label="Hết hạn" value={item.ngay_het_han} />
                    <InfoRow
                      label="Mức lương"
                      value={formatCurrency(item.muc_luong_encrypted)}
                    />
                  </RecordCard>
                ))}
              </ListSection>

              <ListSection title="Tài khoản ngân hàng">
                {(profile.hrm.bank_accounts || []).map((item) => (
                  <RecordCard key={item.id || item.so_tai_khoan_encrypted}>
                    <InfoRow label="Ngân hàng" value={item.ten_ngan_hang} />
                    <InfoRow label="Chi nhánh" value={item.chi_nhanh} />
                    <InfoRow
                      label="Số tài khoản"
                      value={item.so_tai_khoan_encrypted}
                    />
                    <InfoRow label="Chủ tài khoản" value={item.chu_tai_khoan} />
                  </RecordCard>
                ))}
              </ListSection>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <DocumentSection title="Bằng cấp" docs={degreeDocs} />
              <DocumentSection title="Chứng chỉ" docs={certificateDocs} />
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <ListSection title="Người thân">
                {(profile.hrm.relatives || []).map((item) => (
                  <RecordCard key={item.id || `${item.ho_ten}-${item.sdt}`}>
                    <InfoRow label="Họ và tên" value={item.ho_ten} />
                    <InfoRow label="Quan hệ" value={item.quan_he} />
                    <InfoRow label="Số điện thoại" value={item.sdt} />
                    <InfoRow label="Địa chỉ" value={item.dia_chi} />
                    <InfoRow
                      label="Liên hệ khẩn cấp"
                      value={formatBooleanLabel(item.lien_he_khan_cap)}
                    />
                  </RecordCard>
                ))}
              </ListSection>

              <ListSection title="Tài khoản nội bộ">
                {profile.user_accounts.map((item) => (
                  <RecordCard key={item.id}>
                    <InfoRow label="Tên đăng nhập" value={item.username} />
                    <InfoRow label="Email" value={item.email_dang_nhap} />
                    <InfoRow
                      label="Trạng thái"
                      value={formatStatus(item.trang_thai)}
                    />
                    <InfoRow
                      label="Đăng nhập gần nhất"
                      value={item.last_login_at}
                    />
                  </RecordCard>
                ))}
              </ListSection>
            </section>

            <InfoSection title="Lương, phụ cấp, OT, thưởng, khấu trừ">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <InfoRow
                  label="Lương"
                  value={formatCurrency(latestPayslip?.luong_co_ban_encrypted)}
                />
                <InfoRow
                  label="Phụ cấp"
                  value={formatCurrency(latestPayslip?.phu_cap)}
                />
                <InfoRow label="OT" value={formatCurrency(latestPayslip?.ot)} />
                <InfoRow
                  label="Thưởng"
                  value={formatCurrency(latestPayslip?.thuong)}
                />
                <InfoRow
                  label="Khấu trừ"
                  value={formatCurrency(latestPayslip?.khau_tru)}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-sm font-bold text-slate-300">
                  Thực nhận gần nhất
                </p>
                <p className="mt-2 text-3xl font-black">
                  {formatCurrency(latestPayslip?.thuc_nhan_encrypted)}
                </p>
              </div>
            </InfoSection>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="fts-card rounded-[2rem] p-6">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function ListSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1;

  return (
    <InfoSection title={title}>
      <div className="space-y-3">{children}</div>
      {count === 0 ? <EmptyText /> : null}
    </InfoSection>
  );
}

function DocumentSection({
  title,
  docs,
}: {
  title: string;
  docs: PersonDocument[];
}) {
  return (
    <ListSection title={title}>
      {docs.map((item) => (
        <RecordCard key={item.id || item.ten_tai_lieu}>
          <InfoRow label="Tên tài liệu" value={item.ten_tai_lieu} />
          <InfoRow label="Số hiệu" value={item.so_hieu} />
          <InfoRow label="Ngày cấp" value={item.ngay_cap} />
          <InfoRow label="Nơi cấp" value={item.noi_cap} />
          <InfoRow label="Hết hạn" value={item.ngay_het_han} />
        </RecordCard>
      ))}
    </ListSection>
  );
}

function RecordCard({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-2">
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value === undefined || value === null || value === "" ? "-" : value}
      </p>
    </div>
  );
}

function EmptyText() {
  return (
    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
      Chưa có dữ liệu.
    </p>
  );
}
