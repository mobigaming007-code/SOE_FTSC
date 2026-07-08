"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoadingBlock from "@/components/LoadingBlock";
import ModuleCard from "@/components/ModuleCard";
import { gasFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { fileToBase64, formatFileSize } from "@/lib/file";
import type {
  CreateMembershipData,
  CreateUserAccountData,
  EmployeeBankAccount,
  EmployeeContract,
  Membership,
  OrgTreeData,
  OrgUnitNode,
  Person,
  PersonDetailData,
  PersonDocument,
  PersonHrmData,
  PersonRelative,
  SavePersonHrmData,
  UserAccount,
} from "@/types/api";

type HrmUploadData = {
  file_id: string;
  file_url: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
};

const tabs = [
  "Thông tin cá nhân",
  "CCCD",
  "Hợp đồng lao động",
  "Bằng cấp",
  "Chứng chỉ",
  "Tài khoản ngân hàng",
  "BHXH",
  "Thuế",
  "Người thân",
  "Tài khoản nội bộ",
];

const vietnamBankOptions = [
  "Ngân hàng TMCP Ngoại Thương Việt Nam - Vietcombank (VCB)",
  "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - BIDV (BIDV)",
  "Ngân hàng TMCP Công thương Việt Nam - Vietinbank (ICB)",
  "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam - Agribank (VBA)",
  "Ngân hàng TMCP Kỹ thương Việt Nam - Techcombank (TCB)",
  "Ngân hàng TMCP Quân đội - MBBank (MB)",
  "Ngân hàng TMCP Tiên Phong - TPBank (TPB)",
  "Ngân hàng TMCP Việt Nam Thịnh Vượng - VPBank (VPB)",
  "Ngân hàng TMCP Quốc tế Việt Nam - VIB (VIB)",
  "Ngân hàng TMCP Sài Gòn Tài Lộc - Sacombank (STB)",
  "Ví điện tử MoMo (MOMO)",
  "Viettel Money - Tài khoản tiền di động (VIETTELMONEY)",
  "Trung tâm dịch vụ tài chính số VNPT- Chi nhánh Tổng công ty truyền thông (VNPT Fintech) (VNPTMONEY)",
  "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank (CAKE)",
  "Ngân hàng TMCP An Bình (ABB)",
  "Ngân hàng TMCP Á Châu (ACB)",
  "Ngân hàng TMCP Bắc Á (BAB)",
  "Ngân hàng TMCP Bảo Việt (BVB)",
  "Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam (CBB)",
  "Ngân hàng TNHH MTV CIMB Việt Nam (CIMB)",
  "Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội (CITIBANK)",
  "Ngân hàng Hợp tác xã Việt Nam (COOPBANK)",
  "DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh (DBS)",
  "Ngân hàng TMCP Đông Á (DOB)",
  "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam (EIB)",
  "Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu (GPB)",
  "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh (HDB)",
  "Ngân hàng TNHH MTV Hong Leong Việt Nam (HLBVN)",
  "Ngân hàng TNHH MTV HSBC (Việt Nam) (HSBC)",
  "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh (IBK - HCM)",
  "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội (IBK - HN)",
  "Ngân hàng TNHH Indovina (IVB)",
  "Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh (KBHCM)",
  "Ngân hàng Kookmin - Chi nhánh Hà Nội (KBHN)",
  "Ngân hàng Đại chúng TNHH Kasikornbank (KBank)",
  "Ngân hàng KEB Hana – Chi nhánh Thành phố Hồ Chí Minh (KEBHANAHCM)",
  "Ngân hàng KEB Hana – Chi nhánh Hà Nội (KEBHANAHN)",
  "Ngân hàng TMCP Kiên Long (KLB)",
  "Ngân hàng TMCP Ngân hàng TMCP Lộc Phát Việt Nam (LPBANK)",
  "Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam) (MAFC)",
  "Ngân hàng TMCP Hàng Hải (MSB)",
  "Ngân hàng TMCP Nam Á (NAB)",
  "Ngân hàng TMCP Quốc Dân (NCB)",
  "Ngân hàng Nonghyup - Chi nhánh Hà Nội (NHB HN)",
  "Ngân hàng TMCP Phương Đông (OCB)",
  "Ngân hàng Thương mại TNHH MTV Đại Dương (Oceanbank)",
  "Ngân hàng TNHH MTV Public Việt Nam (PBVN)",
  "Ngân hàng TMCP Xăng dầu Petrolimex (PGB)",
  "Ngân hàng TMCP Đại Chúng Việt Nam (PVCB)",
  "Ngân hàng TMCP Sài Gòn (SCB)",
  "Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam (SCVN)",
  "Ngân hàng TMCP Đông Nam Á (SEAB)",
  "Ngân hàng TMCP Sài Gòn Công Thương (SGICB)",
  "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
  "Ngân hàng TNHH MTV Shinhan Việt Nam (SHBVN)",
  "Ngân hàng số Timo by Ban Viet Bank (Timo by Ban Viet Bank) (TIMO)",
  "Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh (UOB)",
  "TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank (Ubank)",
  "Ngân hàng TMCP Việt Á (VAB)",
  "Ngân hàng Chính sách Xã hội (VBSP)",
  "Ngân hàng TMCP Bản Việt - BVBank (VCCB)",
  "Ngân hàng TMCP Việt Nam Thương Tín (VIETBANK)",
  "Ngân hàng Liên doanh Việt - Nga (VRB)",
  "Tổng Công ty Dịch vụ số Viettel - Chi nhánh tập đoàn công nghiệp viễn thông Quân Đội (VTLMONEY)",
  "Ngân hàng TNHH MTV Woori Việt Nam (WVN)",
];

const positionOptions = [
  { value: "POS_DIRECTOR", label: "Giám đốc" },
  { value: "POS_DEPUTY_DIRECTOR", label: "Phó Giám đốc" },
  { value: "POS_CHAIRMAN", label: "Chủ tịch" },
  { value: "POS_VICE_CHAIRMAN", label: "Phó Chủ tịch" },
  { value: "POS_HR", label: "Nhân sự / HR" },
  { value: "POS_ACCOUNTANT", label: "Kế toán" },
  { value: "POS_DEPARTMENT_MANAGER", label: "Trưởng Phòng" },
  { value: "POS_DEPUTY_DEPARTMENT_MANAGER", label: "Phó Trưởng Phòng" },
  { value: "POS_MANAGER", label: "Quản lý / Trưởng đơn vị" },
  { value: "POS_DEPUTY_MANAGER", label: "Phó đơn vị" },
  { value: "POS_SPECIALIST", label: "Chuyên viên" },
  { value: "POS_INTERN", label: "Thực tập sinh" },
  { value: "POS_CLUB_GENERAL_LEADER", label: "Tổng Chủ nhiệm Nhóm" },
  { value: "POS_CLUB_DEPUTY_GENERAL_LEADER", label: "Phó Tổng Chủ nhiệm Nhóm" },
  { value: "POS_CLUB_DEPARTMENT_HEAD", label: "Trưởng Ban" },
  { value: "POS_CLUB_DEPARTMENT_DEPUTY", label: "Phó Trưởng Ban" },
  {
    value: "POS_CLUB_OFFICE_CHIEF",
    label: "Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  },
  {
    value: "POS_CLUB_OFFICE_DEPUTY",
    label: "Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  },
  { value: "POS_CLUB_DEPARTMENT_MANAGER", label: "Trưởng Phòng CLB" },
  {
    value: "POS_CLUB_DEPUTY_DEPARTMENT_MANAGER",
    label: "Phó Trưởng Phòng CLB",
  },
  { value: "POS_CLUB_BRANCH_LEADER", label: "Chủ nhiệm Chi nhánh" },
  { value: "POS_CLUB_BRANCH_DEPUTY", label: "Phó Chủ nhiệm Chi nhánh" },
  {
    value: "POS_CLUB_BRANCH_STANDING_DEPUTY",
    label: "Phó Chủ nhiệm Thường trực Chi nhánh",
  },
  {
    value: "POS_CLUB_BRANCH_OFFICE_CHIEF",
    label: "Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  },
  {
    value: "POS_CLUB_BRANCH_OFFICE_DEPUTY",
    label: "Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  },
  {
    value: "POS_CLUB_BRANCH_DEPARTMENT_HEAD",
    label: "Trưởng Ban thuộc Chi nhánh",
  },
  {
    value: "POS_CLUB_BRANCH_DEPARTMENT_DEPUTY",
    label: "Phó Trưởng Ban thuộc Chi nhánh",
  },
  { value: "POS_CLUB_VOLUNTEER", label: "Tình nguyện viên" },
];

const companyPositionCodes = [
  "POS_DIRECTOR",
  "POS_DEPUTY_DIRECTOR",
  "POS_CHAIRMAN",
  "POS_VICE_CHAIRMAN",
  "POS_HR",
  "POS_ACCOUNTANT",
  "POS_DEPARTMENT_MANAGER",
  "POS_DEPUTY_DEPARTMENT_MANAGER",
  "POS_MANAGER",
  "POS_SPECIALIST",
  "POS_INTERN",
];

const clubRootPositionCodes = [
  "POS_CLUB_GENERAL_LEADER",
  "POS_CLUB_DEPUTY_GENERAL_LEADER",
  "POS_CLUB_DEPARTMENT_HEAD",
  "POS_CLUB_DEPARTMENT_DEPUTY",
  "POS_CLUB_OFFICE_CHIEF",
  "POS_CLUB_OFFICE_DEPUTY",
  "POS_CLUB_DEPARTMENT_MANAGER",
  "POS_CLUB_DEPUTY_DEPARTMENT_MANAGER",
  "POS_CLUB_VOLUNTEER",
];

const clubBranchPositionCodes = [
  "POS_CLUB_BRANCH_LEADER",
  "POS_CLUB_BRANCH_DEPUTY",
  "POS_CLUB_BRANCH_STANDING_DEPUTY",
  "POS_CLUB_BRANCH_OFFICE_CHIEF",
  "POS_CLUB_BRANCH_OFFICE_DEPUTY",
  "POS_CLUB_BRANCH_DEPARTMENT_HEAD",
  "POS_CLUB_BRANCH_DEPARTMENT_DEPUTY",
  "POS_CLUB_VOLUNTEER",
];

const positionRoleMap: Record<string, string> = {
  POS_DIRECTOR: "GIAM_DOC",
  POS_DEPUTY_DIRECTOR: "PHO_GIAM_DOC",
  POS_CHAIRMAN: "CHU_TICH",
  POS_VICE_CHAIRMAN: "PHO_CHU_TICH",
  POS_HR: "HR",
  POS_ACCOUNTANT: "KE_TOAN",
  POS_DEPARTMENT_MANAGER: "TRUONG_PHONG",
  POS_DEPUTY_DEPARTMENT_MANAGER: "PHO_TRUONG_PHONG",
  POS_MANAGER: "TRUONG_DON_VI",
  POS_SPECIALIST: "CHUYEN_VIEN",
  POS_INTERN: "THUC_TAP_SINH",
  POS_CLUB_GENERAL_LEADER: "TONG_CHU_NHIEM",
  POS_CLUB_DEPUTY_GENERAL_LEADER: "PHO_TONG_CHU_NHIEM",
  POS_CLUB_DEPARTMENT_HEAD: "TRUONG_BAN",
  POS_CLUB_DEPARTMENT_DEPUTY: "PHO_TRUONG_BAN",
  POS_CLUB_OFFICE_CHIEF: "CHANH_VAN_PHONG",
  POS_CLUB_OFFICE_DEPUTY: "PHO_CHANH_VAN_PHONG",
  POS_CLUB_DEPARTMENT_MANAGER: "TRUONG_PHONG",
  POS_CLUB_DEPUTY_DEPARTMENT_MANAGER: "PHO_TRUONG_PHONG",
  POS_CLUB_BRANCH_LEADER: "CHU_NHIEM_CHI_NHANH",
  POS_CLUB_BRANCH_DEPUTY: "PHO_CHU_NHIEM_CHI_NHANH",
  POS_CLUB_BRANCH_STANDING_DEPUTY: "PHO_CHU_NHIEM_TT_CHI_NHANH",
  POS_CLUB_BRANCH_OFFICE_CHIEF: "CHANH_VAN_PHONG_CHI_NHANH",
  POS_CLUB_BRANCH_OFFICE_DEPUTY: "PHO_CHANH_VAN_PHONG_CHI_NHANH",
  POS_CLUB_BRANCH_DEPARTMENT_HEAD: "TRUONG_BAN_CHI_NHANH",
  POS_CLUB_BRANCH_DEPARTMENT_DEPUTY: "PHO_TRUONG_BAN_CHI_NHANH",
  POS_CLUB_VOLUNTEER: "TINH_NGUYEN_VIEN",
};

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Quản trị tối cao" },
  { value: "GIAM_DOC", label: "Giám đốc" },
  { value: "PHO_GIAM_DOC", label: "Phó Giám đốc" },
  { value: "CHU_TICH", label: "Chủ tịch" },
  { value: "PHO_CHU_TICH", label: "Phó Chủ tịch" },
  { value: "HR", label: "Nhân sự/HR" },
  { value: "KE_TOAN", label: "Kế toán" },
  { value: "TRUONG_PHONG", label: "Trưởng Phòng" },
  { value: "PHO_TRUONG_PHONG", label: "Phó Trưởng Phòng" },
  { value: "TRUONG_DON_VI", label: "Trưởng đơn vị" },
  { value: "PHO_DON_VI", label: "Phó đơn vị" },
  { value: "CHUYEN_VIEN", label: "Chuyên viên" },
  { value: "THUC_TAP_SINH", label: "Thực tập sinh" },
  { value: "NGUOI_XEM", label: "Người xem" },
  { value: "CHU_NHIEM_CHI_NHANH", label: "Chủ nhiệm Chi nhánh" },
  { value: "PHO_CHU_NHIEM_CHI_NHANH", label: "Phó Chủ nhiệm Chi nhánh" },
  { value: "TINH_NGUYEN_VIEN", label: "Tình nguyện viên" },
  { value: "TONG_CHU_NHIEM", label: "Tổng Chủ nhiệm" },
  { value: "PHO_TONG_CHU_NHIEM", label: "Phó Tổng Chủ nhiệm" },
  { value: "CHANH_VAN_PHONG", label: "Chánh Văn phòng Ban Chủ nhiệm Nhóm" },
  { value: "TRUONG_BAN", label: "Trưởng Ban" },
  {
    value: "PHO_CHANH_VAN_PHONG",
    label: "Phó Chánh Văn phòng Ban Chủ nhiệm Nhóm",
  },
  {
    value: "CHANH_VAN_PHONG_CHI_NHANH",
    label: "Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  },
  {
    value: "PHO_CHANH_VAN_PHONG_CHI_NHANH",
    label: "Phó Chánh Văn phòng Ban Chủ nhiệm Chi nhánh",
  },
  {
    value: "PHO_CHU_NHIEM_TT_CHI_NHANH",
    label: "Phó Chủ nhiệm Thường trực Chi nhánh",
  },
  { value: "PHO_TRUONG_BAN", label: "Phó Trưởng Ban" },
  { value: "TRUONG_BAN_CHI_NHANH", label: "Trưởng Ban thuộc Chi nhánh" },
  {
    value: "PHO_TRUONG_BAN_CHI_NHANH",
    label: "Phó Trưởng Ban thuộc Chi nhánh",
  },
];

const emptyHrm: PersonHrmData = {
  cccd: {},
  documents: [],
  contracts: [],
  bank_accounts: [],
  insurance: {},
  tax: {},
  relatives: [],
};

function normalizePhoneDisplay(value: string) {
  const phone = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");
  return /^\d{9}$/.test(phone) ? `0${phone}` : phone;
}

function normalizeCccdDisplay(value: string) {
  const cccd = value.trim().replace(/\s+/g, "").replace(/\D/g, "");
  return /^\d{11}$/.test(cccd) ? `0${cccd}` : cccd;
}

function syncCccdToTax(current: PersonHrmData, nextCccd: string) {
  const normalizedCccd = normalizeCccdDisplay(nextCccd);
  const previousCccd = current.cccd.so_cccd_encrypted || "";
  const currentTax = current.tax.mst_ca_nhan_encrypted || "";
  const shouldSyncTax =
    !currentTax ||
    currentTax === previousCccd ||
    normalizeCccdDisplay(currentTax) === normalizeCccdDisplay(previousCccd);

  return {
    ...current,
    cccd: { ...current.cccd, so_cccd_encrypted: normalizedCccd },
    tax: {
      ...current.tax,
      mst_ca_nhan_encrypted: shouldSyncTax
        ? normalizedCccd
        : normalizeCccdDisplay(currentTax),
    },
  };
}

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const personId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [person, setPerson] = useState<Person | null>(null);
  const [personForm, setPersonForm] = useState<Person | null>(null);
  const [hrm, setHrm] = useState<PersonHrmData>(emptyHrm);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitNode[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [membershipForm, setMembershipForm] = useState({
    org_type: "COMPANY",
    org_unit_id: "",
    position_id: "POS_SPECIALIST",
    loai_quan_he: "EMPLOYEE",
    ngay_bat_dau: new Date().toISOString().slice(0, 10),
    ghi_chu: "",
  });

  const [accountForm, setAccountForm] = useState({
    email_dang_nhap: "",
    username: "",
    password: "",
    role_code: "CHUYEN_VIEN",
    org_unit_id: "",
    scope_type: "SELF",
  });

  const flatOrgUnits = useMemo(() => flattenOrgUnits(orgUnits), [orgUnits]);

  const loadDetail = useCallback(
    async function loadDetail() {
      setLoading(true);
      setError("");

      const [detailResponse, orgResponse] = await Promise.all([
        gasFetch<PersonDetailData>({
          path: "people/detail",
          method: "GET",
          params: { id: personId },
        }),
        gasFetch<OrgTreeData>({
          path: "org/tree",
          method: "GET",
        }),
      ]);

      setLoading(false);

      if (!detailResponse.success || !detailResponse.data) {
        setError(
          detailResponse.message ||
            "Không tải được chi tiết hồ sơ. Hãy kiểm tra lại ID người dùng hoặc thử đăng nhập lại.",
        );
        return;
      }

      const detail = detailResponse.data;
      const nextHrm = normalizeHrm(detail.hrm);

      setPerson(detail.person);
      setPersonForm(detail.person);
      setHrm(nextHrm);
      setMemberships(detail.memberships || []);
      setAccounts(detail.user_accounts || []);

      setAccountForm((prev) => ({
        ...prev,
        email_dang_nhap: detail.person.email || "",
        username: detail.person.email || "",
      }));

      if (orgResponse.success && orgResponse.data) {
        const tree = orgResponse.data.tree || orgResponse.data.items || [];
        setOrgUnits(tree);

        const firstOrg = flattenOrgUnits(tree)[0]?.id || "";
        setMembershipForm((prev) => ({
          ...prev,
          org_unit_id: prev.org_unit_id || firstOrg,
        }));
        setAccountForm((prev) => ({
          ...prev,
          org_unit_id: prev.org_unit_id || firstOrg,
        }));
      }
    },
    [personId],
  );

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    queueMicrotask(() => {
      loadDetail();
    });
  }, [loadDetail, router]);

  async function saveAll() {
    if (!personForm) return;

    const currentPersonId = person?.id || personId;

    setSaving(true);
    setError("");
    setNotice("");

    const response = await gasFetch<SavePersonHrmData>({
      path: "people/update",
      method: "POST",
      body: {
        ...personForm,
        id: currentPersonId,
        hrm,
      },
    });

    setSaving(false);

    if (!response.success || !response.data) {
      setError(response.message || "Không lưu được hồ sơ HRM.");
      return;
    }

    setPerson(response.data.person);
    setPersonForm(response.data.person);
    if (response.data.hrm) {
      setHrm(normalizeHrm(response.data.hrm));
      setNotice("Đã lưu thông tin cá nhân và HRM.");
    } else {
      setNotice(
        "Đã lưu thông tin cá nhân. Backend people/update hiện tại chưa nhận HRM, hãy deploy lại Apps Script để lưu CCCD, hợp đồng, ngân hàng, BHXH, thuế và người thân.",
      );
    }
  }

  async function createMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const currentPersonId = person?.id || personId;

    const response = await gasFetch<CreateMembershipData>({
      path: "memberships/create",
      method: "POST",
      body: {
        person_id: currentPersonId,
        ...membershipForm,
      },
    });

    if (!response.success) {
      setError(response.message || "Không thêm được quan hệ chức.");
      return;
    }

    setNotice("Đã thêm quan hệ chức.");
    loadDetail();
  }

  async function updateMembership(
    membershipId: string,
    patch: Partial<Membership>,
  ) {
    setError("");
    setNotice("");

    const response = await gasFetch<CreateMembershipData>({
      path: "memberships/update",
      method: "POST",
      body: {
        id: membershipId,
        ...patch,
      },
    });

    if (!response.success || !response.data) {
      setError(response.message || "Không cập nhật được chức danh.");
      return;
    }

    setMemberships((current) =>
      current.map((membership) =>
        membership.id === membershipId ? response.data!.membership : membership,
      ),
    );
    setNotice("Đã cập nhật chức danh.");
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const currentPersonId = person?.id || personId;

    const body: Record<string, unknown> = {
      person_id: currentPersonId,
      email_dang_nhap: accountForm.email_dang_nhap,
      username: accountForm.username,
      role_code: accountForm.role_code,
      org_unit_id: accountForm.org_unit_id,
      scope_type: accountForm.scope_type,
    };

    if (accountForm.password.trim()) {
      body.password = accountForm.password.trim();
    }

    const response = await gasFetch<CreateUserAccountData>({
      path: "users/create",
      method: "POST",
      body,
    });

    if (!response.success || !response.data) {
      setError(response.message || "Không tạo được tài khoản.");
      return;
    }

    setNotice(
      `Đã tạo tài khoản. Mật khẩu tạm: ${response.data.temporary_password}`,
    );
    setAccountForm((prev) => ({ ...prev, password: "" }));
    loadDetail();
  }

  async function updateAccountStatus(
    userId: string,
    status: "ACTIVE" | "LOCKED",
  ) {
    setError("");
    setNotice("");

    const response = await gasFetch({
      path: "users/status",
      method: "POST",
      body: {
        user_id: userId,
        trang_thai: status,
      },
    });

    if (!response.success) {
      setError(response.message || "Không cập nhật được trạng thái tài khoản.");
      return;
    }

    setNotice(
      status === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
    );
    loadDetail();
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock text="Đang tải chi tiết hồ sơ..." />
      </AppShell>
    );
  }

  if (!person || !personForm) {
    return (
      <AppShell>
        <div className="rounded-3xl bg-rose-50 p-5 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error || "Không tìm thấy hồ sơ."}
        </div>
      </AppShell>
    );
  }

  const resolvedPersonId = person.id;
  const degreeDocs = hrm.documents.filter((item) => item.doc_type === "DEGREE");
  const certificateDocs = hrm.documents.filter(
    (item) => item.doc_type === "CERTIFICATE",
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="fts-hero rounded-[2rem] p-6 text-white md:p-8">
          <button
            onClick={() => router.push("/people")}
            className="mb-5 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
          >
            ← Quay lại danh sách
          </button>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white text-3xl font-black text-sky-600 shadow-xl">
                {person.ho_ten?.charAt(0)?.toUpperCase() || "F"}
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-100">
                  HỒ SƠ NHÂN VIÊN
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                  {person.ho_ten}
                </h1>
                <p className="mt-2 text-sm text-sky-50">
                  {person.ma_dinh_danh} Â· {person.email || "Chưa có email"}
                </p>
              </div>
            </div>

            <button
              disabled={saving}
              onClick={saveAll}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-lg transition hover:bg-sky-50 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu toàn bộ"}
            </button>
          </div>
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

        <section className="fts-card rounded-[2rem] p-3">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition",
                  activeTab === tab
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {activeTab === tabs[0] ? (
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="fts-card rounded-[2rem] p-6">
              <SectionTitle title="Thông tin cá nhân" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputField
                  label="Mã định danh"
                  value={personForm.ma_dinh_danh}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, ma_dinh_danh: value })
                  }
                />
                <InputField
                  label="Họ và tên"
                  value={personForm.ho_ten}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, ho_ten: value })
                  }
                />
                <InputField
                  label="Ngày sinh"
                  type="date"
                  value={personForm.ngay_sinh}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, ngay_sinh: value })
                  }
                />
                <InputField
                  label="Giới tính"
                  value={personForm.gioi_tinh}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, gioi_tinh: value })
                  }
                />
                <InputField
                  label="Số điện thoại"
                  value={personForm.sdt}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, sdt: value })
                  }
                  onBlur={() =>
                    setPersonForm({
                      ...personForm,
                      sdt: normalizePhoneDisplay(personForm.sdt),
                    })
                  }
                />
                <InputField
                  label="Email"
                  type="email"
                  value={personForm.email}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, email: value })
                  }
                />
                <InputField
                  label="Địa chỉ thường trú"
                  value={personForm.dia_chi_thuong_tru}
                  onChange={(value) =>
                    setPersonForm({
                      ...personForm,
                      dia_chi_thuong_tru: value,
                    })
                  }
                />
                <InputField
                  label="Nơi ở hiện tại"
                  value={personForm.noi_o_hien_tai}
                  onChange={(value) =>
                    setPersonForm({ ...personForm, noi_o_hien_tai: value })
                  }
                />
              </div>
            </div>

            <OrgMembershipPanel
              memberships={memberships}
              flatOrgUnits={flatOrgUnits}
              membershipForm={membershipForm}
              setMembershipForm={setMembershipForm}
              createMembership={createMembership}
              updateMembership={updateMembership}
            />
          </section>
        ) : null}

        {activeTab === "CCCD" ? (
          <section className="fts-card rounded-[2rem] p-6">
            <SectionTitle title="CCCD" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InputField
                label="Số CCCD"
                value={hrm.cccd.so_cccd_encrypted || ""}
                onChange={(value) =>
                  setHrm((current) => syncCccdToTax(current, value))
                }
                onBlur={() =>
                  setHrm((current) =>
                    syncCccdToTax(
                      current,
                      normalizeCccdDisplay(
                        current.cccd.so_cccd_encrypted || "",
                      ),
                    ),
                  )
                }
              />
              <InputField
                label="Ngày cấp"
                type="date"
                value={hrm.cccd.ngay_cap || ""}
                onChange={(value) =>
                  setHrm({ ...hrm, cccd: { ...hrm.cccd, ngay_cap: value } })
                }
              />
              <InputField
                label="Nơi cấp"
                value={hrm.cccd.noi_cap || ""}
                onChange={(value) =>
                  setHrm({ ...hrm, cccd: { ...hrm.cccd, noi_cap: value } })
                }
              />
              <HrmFileUploadField
                label="Mặt trước CCCD"
                personId={resolvedPersonId}
                fileType="CCCD_FRONT"
                fileUrl={hrm.cccd.file_url_mat_truoc || ""}
                onUploaded={(file) =>
                  setHrm({
                    ...hrm,
                    cccd: {
                      ...hrm.cccd,
                      file_id_mat_truoc: file.file_id,
                      file_url_mat_truoc: file.file_url,
                    },
                  })
                }
              />
              <HrmFileUploadField
                label="Mặt sau CCCD"
                personId={resolvedPersonId}
                fileType="CCCD_BACK"
                fileUrl={hrm.cccd.file_url_mat_sau || ""}
                onUploaded={(file) =>
                  setHrm({
                    ...hrm,
                    cccd: {
                      ...hrm.cccd,
                      file_id_mat_sau: file.file_id,
                      file_url_mat_sau: file.file_url,
                    },
                  })
                }
              />
            </div>
          </section>
        ) : null}

        {activeTab === "Hợp đồng lao động" ? (
          <ListSection
            title="Hợp đồng lao động"
            addLabel="Thêm hợp đồng"
            onAdd={() =>
              setHrm({
                ...hrm,
                contracts: [
                  ...hrm.contracts,
                  {
                    loai_hop_dong: "LABOR",
                    trang_thai: "ACTIVE",
                  },
                ],
              })
            }
          >
            {hrm.contracts.map((contract, index) => (
              <ContractEditor
                key={index}
                personId={resolvedPersonId}
                contract={contract}
                onChange={(next) =>
                  setHrm({
                    ...hrm,
                    contracts: replaceAt(hrm.contracts, index, next),
                  })
                }
                onRemove={() =>
                  setHrm({
                    ...hrm,
                    contracts: removeAt(hrm.contracts, index),
                  })
                }
              />
            ))}
          </ListSection>
        ) : null}

        {activeTab === "Bằng cấp" ? (
          <DocumentListSection
            title="Bằng cấp"
            docs={degreeDocs}
            docType="DEGREE"
            personId={resolvedPersonId}
            hrm={hrm}
            setHrm={setHrm}
          />
        ) : null}

        {activeTab === "Chứng chỉ" ? (
          <DocumentListSection
            title="Chứng chỉ"
            docs={certificateDocs}
            docType="CERTIFICATE"
            personId={resolvedPersonId}
            hrm={hrm}
            setHrm={setHrm}
          />
        ) : null}

        {activeTab === "Tài khoản ngân hàng" ? (
          <ListSection
            title="Tài khoản ngân hàng"
            addLabel="Thêm tài khoản"
            onAdd={() =>
              setHrm({
                ...hrm,
                bank_accounts: [...hrm.bank_accounts, { trang_thai: "ACTIVE" }],
              })
            }
          >
            {hrm.bank_accounts.map((bank, index) => (
              <BankEditor
                key={index}
                bank={bank}
                onChange={(next) =>
                  setHrm({
                    ...hrm,
                    bank_accounts: replaceAt(hrm.bank_accounts, index, next),
                  })
                }
                onRemove={() =>
                  setHrm({
                    ...hrm,
                    bank_accounts: removeAt(hrm.bank_accounts, index),
                  })
                }
              />
            ))}
          </ListSection>
        ) : null}

        {activeTab === "BHXH" ? (
          <section className="fts-card rounded-[2rem] p-6">
            <SectionTitle title="BHXH" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InputField
                label="Số BHXH"
                value={hrm.insurance.so_bhxh_encrypted || ""}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    insurance: { ...hrm.insurance, so_bhxh_encrypted: value },
                  })
                }
              />
              <InputField
                label="Mức đóng"
                value={String(hrm.insurance.muc_dong || "")}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    insurance: { ...hrm.insurance, muc_dong: value },
                  })
                }
              />
              <InputField
                label="Ngày bắt đầu"
                type="date"
                value={hrm.insurance.ngay_bat_dau || ""}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    insurance: { ...hrm.insurance, ngay_bat_dau: value },
                  })
                }
              />
              <InputField
                label="Ghi chú"
                value={hrm.insurance.ghi_chu || ""}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    insurance: { ...hrm.insurance, ghi_chu: value },
                  })
                }
              />
            </div>
          </section>
        ) : null}

        {activeTab === "Thuế" ? (
          <section className="fts-card rounded-[2rem] p-6">
            <SectionTitle title="Thuế" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InputField
                label="Mã số thuế cá nhân"
                value={hrm.tax.mst_ca_nhan_encrypted || ""}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    tax: { ...hrm.tax, mst_ca_nhan_encrypted: value },
                  })
                }
              />
              <InputField
                label="Số người phụ thuộc"
                value={String(hrm.tax.so_nguoi_phu_thuoc || "")}
                onChange={(value) =>
                  setHrm({
                    ...hrm,
                    tax: { ...hrm.tax, so_nguoi_phu_thuoc: value },
                  })
                }
              />
              <InputField
                label="Ghi chú"
                value={hrm.tax.ghi_chu || ""}
                onChange={(value) =>
                  setHrm({ ...hrm, tax: { ...hrm.tax, ghi_chu: value } })
                }
              />
            </div>
          </section>
        ) : null}

        {activeTab === "Người thân" ? (
          <ListSection
            title="Người thân"
            addLabel="Thêm người thân"
            onAdd={() =>
              setHrm({
                ...hrm,
                relatives: [...hrm.relatives, { lien_he_khan_cap: "FALSE" }],
              })
            }
          >
            {hrm.relatives.map((relative, index) => (
              <RelativeEditor
                key={index}
                relative={relative}
                onChange={(next) =>
                  setHrm({
                    ...hrm,
                    relatives: replaceAt(hrm.relatives, index, next),
                  })
                }
                onRemove={() =>
                  setHrm({
                    ...hrm,
                    relatives: removeAt(hrm.relatives, index),
                  })
                }
              />
            ))}
          </ListSection>
        ) : null}

        {activeTab === "Tài khoản nội bộ" ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <AccountPanel
              accounts={accounts}
              updateAccountStatus={updateAccountStatus}
            />
            <CreateAccountPanel
              accountForm={accountForm}
              setAccountForm={setAccountForm}
              flatOrgUnits={flatOrgUnits}
              createAccount={createAccount}
            />
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            title="Chấm công"
            description="Xem công, dữ liệu chấm công và bản ghi cần duyệt"
            href={`/attendance?person_id=${resolvedPersonId}`}
            icon="CC"
            accent="from-teal-500 to-cyan-400"
          />
          <ModuleCard
            title="Nghỉ phép"
            description="Xem đơn nghỉ, duyệt và theo dõi phép năm."
            href={`/leave?person_id=${resolvedPersonId}`}
            icon="NP"
            accent="from-amber-500 to-orange-400"
          />
          <ModuleCard
            title="Lương"
            description="Xem công, phụ cấp, OT, thưởng, khấu trừ và phiếu lương."
            href={`/payroll/payslips?person_id=${resolvedPersonId}`}
            icon="LG"
            accent="from-slate-700 to-slate-500"
          />
          <ModuleCard
            title="Xuất bảng lương"
            description="Tạo và lưu trữ bảng lương theo tháng."
            href="/payroll/generate"
            icon="XL"
            accent="from-indigo-500 to-sky-400"
          />
        </section>
      </div>
    </AppShell>
  );
}

function normalizeHrm(input?: PersonHrmData): PersonHrmData {
  return {
    cccd: input?.cccd || {},
    documents: input?.documents || [],
    contracts: input?.contracts || [],
    bank_accounts: input?.bank_accounts || [],
    insurance: input?.insurance || {},
    tax: input?.tax || {},
    relatives: input?.relatives || [],
  };
}

function replaceAt<T>(items: T[], index: number, next: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

function removeAt<T>(items: T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function flattenOrgUnits(nodes: OrgUnitNode[], result: OrgUnitNode[] = []) {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children?.length) flattenOrgUnits(node.children, result);
  });
  return result;
}

function getOrgName(orgs: OrgUnitNode[], id: string) {
  return orgs.find((org) => org.id === id)?.ten_don_vi || id || "-";
}

function getPositionName(id: string) {
  return positionOptions.find((item) => item.value === id)?.label || id || "-";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isClubBranchUnit(org: OrgUnitNode | undefined, orgs: OrgUnitNode[]) {
  if (!org || org.org_type !== "CLUB") return false;

  const orgType = normalizeSearchText(org.loai_don_vi || "");
  const orgCode = normalizeSearchText(org.ma_don_vi || "");
  const orgName = normalizeSearchText(org.ten_don_vi || "");

  if (
    orgType.includes("chi_nhanh") ||
    orgType.includes("nhom_chi_nhanh") ||
    orgCode.startsWith("cn_") ||
    orgName.includes("chi nhanh")
  ) {
    return true;
  }

  const parent = orgs.find((item) => item.id === org.parent_id);
  return isClubBranchUnit(parent, orgs);
}

function getPositionCodesForOrgUnit(
  org: OrgUnitNode | undefined,
  orgs: OrgUnitNode[],
) {
  if (!org) return companyPositionCodes;
  if (org.org_type === "COMPANY") return companyPositionCodes;
  if (isClubBranchUnit(org, orgs)) return clubBranchPositionCodes;
  return clubRootPositionCodes;
}

function buildOptionsWithCurrent(
  options: { value: string; label: string }[],
  currentValue?: string,
) {
  if (!currentValue || options.some((item) => item.value === currentValue)) {
    return options;
  }

  return [
    { value: currentValue, label: getPositionName(currentValue) },
    ...options,
  ];
}

function getPositionOptionsForOrgUnit(
  orgUnitId: string,
  orgs: OrgUnitNode[],
  currentValue?: string,
) {
  const org = orgs.find((item) => item.id === orgUnitId);
  const allowedCodes = getPositionCodesForOrgUnit(org, orgs);
  const options = positionOptions.filter((item) =>
    allowedCodes.includes(item.value),
  );

  return buildOptionsWithCurrent(options, currentValue);
}

function getRoleOptionsForOrgUnit(
  orgUnitId: string,
  orgs: OrgUnitNode[],
  currentValue?: string,
) {
  const org = orgs.find((item) => item.id === orgUnitId);
  const roleCodes = getPositionCodesForOrgUnit(org, orgs)
    .map((code) => positionRoleMap[code])
    .filter(
      (code, index, list): code is string =>
        Boolean(code) && list.indexOf(code) === index,
    );
  const options = roleOptions.filter((item) => roleCodes.includes(item.value));

  if (!currentValue || options.some((item) => item.value === currentValue)) {
    return options;
  }

  const currentRole = roleOptions.find((item) => item.value === currentValue);
  return currentRole ? [currentRole, ...options] : options;
}

function getFirstOptionValue(options: { value: string; label: string }[]) {
  return options[0]?.value || "";
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-black text-slate-950">{title}</h2>;
}

function InputField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
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

async function uploadHrmFile(personId: string, file: File, fileType: string) {
  const base64Data = await fileToBase64(file);

  const response = await gasFetch<HrmUploadData>({
    path: "files/upload-hrm",
    method: "POST",
    body: {
      person_id: personId,
      file_type: fileType,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      base64_data: base64Data,
    },
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || "Không upload được file.");
  }

  return response.data;
}

function HrmFileUploadField({
  label,
  personId,
  fileType,
  fileUrl,
  onUploaded,
}: {
  label: string;
  personId: string;
  fileType: string;
  fileUrl?: string;
  onUploaded: (file: HrmUploadData) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState("");
  const [error, setError] = useState("");

  async function handleUpload(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    setError("");
    setUploadedInfo("");

    try {
      const uploaded = await uploadHrmFile(personId, file, fileType);
      onUploaded(uploaded);
      setUploadedInfo(
        `${uploaded.file_name || file.name} · ${formatFileSize(uploaded.size_bytes || file.size)}`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không upload được file.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <input
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          disabled={uploading}
          onChange={(event) => {
            void handleUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
          className="block w-full text-sm font-semibold text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-black file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-60"
        />
        <div className="mt-2 min-h-5 text-xs font-semibold">
          {uploading ? (
            <span className="text-sky-700">Đang upload...</span>
          ) : uploadedInfo ? (
            <span className="text-teal-700">{uploadedInfo}</span>
          ) : fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline-offset-4 hover:underline"
            >
              Mở file đã upload
            </a>
          ) : (
            <span className="text-slate-400">Chưa có file</span>
          )}
          {error ? <p className="mt-1 text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ListSection({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="fts-card rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <SectionTitle title={title} />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100"
        >
          {addLabel}
        </button>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function DocumentListSection({
  title,
  docs,
  docType,
  personId,
  hrm,
  setHrm,
}: {
  title: string;
  docs: PersonDocument[];
  docType: string;
  personId: string;
  hrm: PersonHrmData;
  setHrm: (value: PersonHrmData) => void;
}) {
  function updateDoc(doc: PersonDocument, next: PersonDocument) {
    setHrm({
      ...hrm,
      documents: hrm.documents.map((item) => (item === doc ? next : item)),
    });
  }

  function removeDoc(doc: PersonDocument) {
    setHrm({
      ...hrm,
      documents: hrm.documents.filter((item) => item !== doc),
    });
  }

  return (
    <ListSection
      title={title}
      addLabel={`Thêm ${title.toLowerCase()}`}
      onAdd={() =>
        setHrm({
          ...hrm,
          documents: [
            ...hrm.documents,
            { doc_type: docType, ten_tai_lieu: "", trang_thai: "ACTIVE" },
          ],
        })
      }
    >
      {docs.map((doc, index) => (
        <DocumentEditor
          key={index}
          doc={doc}
          personId={personId}
          onChange={(next) => updateDoc(doc, next)}
          onRemove={() => removeDoc(doc)}
        />
      ))}
    </ListSection>
  );
}

function DocumentEditor({
  doc,
  personId,
  onChange,
  onRemove,
}: {
  doc: PersonDocument;
  personId: string;
  onChange: (value: PersonDocument) => void;
  onRemove: () => void;
}) {
  return (
    <EditorCard onRemove={onRemove}>
      <InputField
        label="Tên tài liệu"
        value={doc.ten_tai_lieu || ""}
        onChange={(value) => onChange({ ...doc, ten_tai_lieu: value })}
      />
      <InputField
        label="Số hiệu"
        value={doc.so_hieu || ""}
        onChange={(value) => onChange({ ...doc, so_hieu: value })}
      />
      <InputField
        label="Ngày cấp"
        type="date"
        value={doc.ngay_cap || ""}
        onChange={(value) => onChange({ ...doc, ngay_cap: value })}
      />
      <InputField
        label="Ngày hết hạn"
        type="date"
        value={doc.ngay_het_han || ""}
        onChange={(value) => onChange({ ...doc, ngay_het_han: value })}
      />
      <InputField
        label="Nơi cấp"
        value={doc.noi_cap || ""}
        onChange={(value) => onChange({ ...doc, noi_cap: value })}
      />
      <HrmFileUploadField
        label="File tài liệu"
        personId={personId}
        fileType={doc.doc_type || "PERSON_DOCUMENT"}
        fileUrl={doc.file_url || ""}
        onUploaded={(file) =>
          onChange({ ...doc, file_id: file.file_id, file_url: file.file_url })
        }
      />
    </EditorCard>
  );
}

function ContractEditor({
  personId,
  contract,
  onChange,
  onRemove,
}: {
  personId: string;
  contract: EmployeeContract;
  onChange: (value: EmployeeContract) => void;
  onRemove: () => void;
}) {
  return (
    <EditorCard onRemove={onRemove}>
      <InputField
        label="Loại hợp đồng"
        value={contract.loai_hop_dong || ""}
        onChange={(value) => onChange({ ...contract, loai_hop_dong: value })}
      />
      <InputField
        label="Số hợp đồng"
        value={contract.so_hop_dong || ""}
        onChange={(value) => onChange({ ...contract, so_hop_dong: value })}
      />
      <InputField
        label="Ngày ký"
        type="date"
        value={contract.ngay_ky || ""}
        onChange={(value) => onChange({ ...contract, ngay_ky: value })}
      />
      <InputField
        label="Ngày hiệu lực"
        type="date"
        value={contract.ngay_hieu_luc || ""}
        onChange={(value) => onChange({ ...contract, ngay_hieu_luc: value })}
      />
      <InputField
        label="Ngày hết hạn"
        type="date"
        value={contract.ngay_het_han || ""}
        onChange={(value) => onChange({ ...contract, ngay_het_han: value })}
      />
      <InputField
        label="Mức lương"
        value={String(contract.muc_luong_encrypted || "")}
        onChange={(value) =>
          onChange({ ...contract, muc_luong_encrypted: value })
        }
      />
      <HrmFileUploadField
        label="File hợp đồng"
        personId={personId}
        fileType="CONTRACT"
        fileUrl={contract.file_url || ""}
        onUploaded={(file) =>
          onChange({
            ...contract,
            file_id: file.file_id,
            file_url: file.file_url,
          })
        }
      />
    </EditorCard>
  );
}

function BankEditor({
  bank,
  onChange,
  onRemove,
}: {
  bank: EmployeeBankAccount;
  onChange: (value: EmployeeBankAccount) => void;
  onRemove: () => void;
}) {
  return (
    <EditorCard onRemove={onRemove}>
      <BankSelectField
        label="Tên ngân hàng"
        value={bank.ten_ngan_hang || ""}
        onChange={(value) => onChange({ ...bank, ten_ngan_hang: value })}
      />
      <InputField
        label="Chi nhánh"
        value={bank.chi_nhanh || ""}
        onChange={(value) => onChange({ ...bank, chi_nhanh: value })}
      />
      <InputField
        label="Số tài khoản"
        value={bank.so_tai_khoan_encrypted || ""}
        onChange={(value) =>
          onChange({ ...bank, so_tai_khoan_encrypted: value })
        }
      />
      <InputField
        label="Chủ tài khoản"
        value={bank.chu_tai_khoan || ""}
        onChange={(value) => onChange({ ...bank, chu_tai_khoan: value })}
      />
    </EditorCard>
  );
}

function BankSelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = useId();

  return (
    <label className="space-y-2 text-sm font-bold text-slate-600">
      <span>{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Gõ mã hoặc tên ngân hàng, ví dụ VCB, Quân đội"
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-sky-100 transition focus:border-sky-300 focus:ring-4"
      />
      <datalist id={listId}>
        {vietnamBankOptions.map((bankName) => (
          <option key={bankName} value={bankName} />
        ))}
      </datalist>
    </label>
  );
}

function RelativeEditor({
  relative,
  onChange,
  onRemove,
}: {
  relative: PersonRelative;
  onChange: (value: PersonRelative) => void;
  onRemove: () => void;
}) {
  return (
    <EditorCard onRemove={onRemove}>
      <InputField
        label="Họ tên"
        value={relative.ho_ten || ""}
        onChange={(value) => onChange({ ...relative, ho_ten: value })}
      />
      <InputField
        label="Quan hệ"
        value={relative.quan_he || ""}
        onChange={(value) => onChange({ ...relative, quan_he: value })}
      />
      <InputField
        label="Số điện thoại"
        value={relative.sdt || ""}
        onChange={(value) => onChange({ ...relative, sdt: value })}
        onBlur={() =>
          onChange({
            ...relative,
            sdt: normalizePhoneDisplay(relative.sdt || ""),
          })
        }
      />
      <InputField
        label="Địa chỉ"
        value={relative.dia_chi || ""}
        onChange={(value) => onChange({ ...relative, dia_chi: value })}
      />
      <SelectField
        label="Liên hệ khẩn cấp"
        value={relative.lien_he_khan_cap || "FALSE"}
        onChange={(value) => onChange({ ...relative, lien_he_khan_cap: value })}
        options={[
          { value: "FALSE", label: "Không" },
          { value: "TRUE", label: "Có" },
        ]}
      />
    </EditorCard>
  );
}

function EditorCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-4 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100"
      >
        Xóa khỏi hồ sơ
      </button>
    </div>
  );
}

function OrgMembershipPanel({
  memberships,
  flatOrgUnits,
  membershipForm,
  setMembershipForm,
  createMembership,
  updateMembership,
}: {
  memberships: Membership[];
  flatOrgUnits: OrgUnitNode[];
  membershipForm: {
    org_type: string;
    org_unit_id: string;
    position_id: string;
    loai_quan_he: string;
    ngay_bat_dau: string;
    ghi_chu: string;
  };
  setMembershipForm: (value: {
    org_type: string;
    org_unit_id: string;
    position_id: string;
    loai_quan_he: string;
    ngay_bat_dau: string;
    ghi_chu: string;
  }) => void;
  createMembership: (event: FormEvent<HTMLFormElement>) => void;
  updateMembership: (
    membershipId: string,
    patch: Partial<Membership>,
  ) => Promise<void>;
}) {
  function getOrgOptions(orgType: string) {
    return flatOrgUnits
      .filter((org) => org.org_type === orgType)
      .map((org) => ({
        value: org.id,
        label: `${"- ".repeat(Number(org.cap_do || 1) - 1)}${org.ten_don_vi}`,
      }));
  }

  function updateMembershipOrgType(orgType: string) {
    const orgOptions = getOrgOptions(orgType);
    const nextOrgUnitId = orgOptions[0]?.value || "";
    const positionOptionsForOrg = getPositionOptionsForOrgUnit(
      nextOrgUnitId,
      flatOrgUnits,
    );

    setMembershipForm({
      ...membershipForm,
      org_type: orgType,
      org_unit_id: nextOrgUnitId,
      position_id:
        getFirstOptionValue(positionOptionsForOrg) ||
        membershipForm.position_id,
    });
  }

  function updateMembershipOrgUnit(orgUnitId: string) {
    const positionOptionsForOrg = getPositionOptionsForOrgUnit(
      orgUnitId,
      flatOrgUnits,
      membershipForm.position_id,
    );
    const nextPositionId = positionOptionsForOrg.some(
      (item) => item.value === membershipForm.position_id,
    )
      ? membershipForm.position_id
      : getFirstOptionValue(positionOptionsForOrg);

    setMembershipForm({
      ...membershipForm,
      org_unit_id: orgUnitId,
      position_id: nextPositionId,
    });
  }

  const membershipPositionOptions = getPositionOptionsForOrgUnit(
    membershipForm.org_unit_id,
    flatOrgUnits,
    membershipForm.position_id,
  );

  return (
    <div className="fts-card rounded-[2rem] p-6">
      <SectionTitle title="Quan hệ tổ chức" />
      <div className="mt-5 space-y-3">
        {memberships.map((membership) => (
          <MembershipEditorCard
            key={`${membership.id}-${membership.org_unit_id}-${membership.position_id}-${membership.loai_quan_he}`}
            membership={membership}
            flatOrgUnits={flatOrgUnits}
            updateMembership={updateMembership}
          />
        ))}
      </div>

      <form
        onSubmit={createMembership}
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <SelectField
          label="Loại tổ chức"
          value={membershipForm.org_type}
          onChange={updateMembershipOrgType}
          options={[
            { value: "COMPANY", label: "Công ty" },
            { value: "CLUB", label: "CLB / Nhóm" },
          ]}
        />
        <SelectField
          label="Đơn vị"
          value={membershipForm.org_unit_id}
          onChange={updateMembershipOrgUnit}
          options={getOrgOptions(membershipForm.org_type)}
        />
        <SelectField
          label="Chức danh"
          value={membershipForm.position_id}
          onChange={(value) =>
            setMembershipForm({ ...membershipForm, position_id: value })
          }
          options={membershipPositionOptions}
        />
        <InputField
          label="Ngày bắt đầu"
          type="date"
          value={membershipForm.ngay_bat_dau}
          onChange={(value) =>
            setMembershipForm({ ...membershipForm, ngay_bat_dau: value })
          }
        />
        <div className="md:col-span-2">
          <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">
            Thêm quan hệ tổ chức
          </button>
        </div>
      </form>
    </div>
  );
}

function MembershipEditorCard({
  membership,
  flatOrgUnits,
  updateMembership,
}: {
  membership: Membership;
  flatOrgUnits: OrgUnitNode[];
  updateMembership: (
    membershipId: string,
    patch: Partial<Membership>,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    org_unit_id: membership.org_unit_id,
    position_id: membership.position_id,
    loai_quan_he: membership.loai_quan_he,
  });
  const [saving, setSaving] = useState(false);

  const currentOrg = flatOrgUnits.find((org) => org.id === draft.org_unit_id);
  const orgOptions = flatOrgUnits
    .filter((org) => org.org_type === membership.org_type)
    .map((org) => ({
      value: org.id,
      label: `${"- ".repeat(Number(org.cap_do || 1) - 1)}${org.ten_don_vi}`,
    }));
  const positionOptionsForOrg = getPositionOptionsForOrgUnit(
    draft.org_unit_id,
    flatOrgUnits,
    draft.position_id,
  );
  const hasChanged =
    draft.org_unit_id !== membership.org_unit_id ||
    draft.position_id !== membership.position_id ||
    draft.loai_quan_he !== membership.loai_quan_he;

  function updateDraftOrgUnit(orgUnitId: string) {
    const nextPositionOptions = getPositionOptionsForOrgUnit(
      orgUnitId,
      flatOrgUnits,
      draft.position_id,
    );
    const nextPositionId = nextPositionOptions.some(
      (item) => item.value === draft.position_id,
    )
      ? draft.position_id
      : getFirstOptionValue(nextPositionOptions);

    setDraft({
      ...draft,
      org_unit_id: orgUnitId,
      position_id: nextPositionId,
    });
  }

  async function saveMembership() {
    setSaving(true);
    await updateMembership(membership.id, {
      org_type: currentOrg?.org_type || membership.org_type,
      org_unit_id: draft.org_unit_id,
      position_id: draft.position_id,
      loai_quan_he: draft.loai_quan_he,
    });
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="Đơn vị"
          value={draft.org_unit_id}
          onChange={updateDraftOrgUnit}
          options={orgOptions}
        />
        <SelectField
          label="Chức danh"
          value={draft.position_id}
          onChange={(value) => setDraft({ ...draft, position_id: value })}
          options={positionOptionsForOrg}
        />
        <InputField
          label="Loại quan hệ"
          value={draft.loai_quan_he || ""}
          onChange={(value) => setDraft({ ...draft, loai_quan_he: value })}
        />
        <div className="flex items-end">
          <button
            type="button"
            disabled={!hasChanged || saving}
            onClick={saveMembership}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {saving ? "Đang lưu..." : "Cập nhật chức danh"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">
        Hiện tại: {getOrgName(flatOrgUnits, membership.org_unit_id)} ·{" "}
        {getPositionName(membership.position_id)}
      </p>
    </div>
  );
}

function AccountPanel({
  accounts,
  updateAccountStatus,
}: {
  accounts: UserAccount[];
  updateAccountStatus: (userId: string, status: "ACTIVE" | "LOCKED") => void;
}) {
  return (
    <div className="fts-card rounded-[2rem] p-6">
      <SectionTitle title="Tài khoản hiện có" />
      <div className="mt-5 space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-3xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="font-black text-slate-950">{account.username}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {account.email_dang_nhap}
                </p>
              </div>
              <button
                onClick={() =>
                  updateAccountStatus(
                    account.id,
                    account.trang_thai === "ACTIVE" ? "LOCKED" : "ACTIVE",
                  )
                }
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
              >
                {account.trang_thai === "ACTIVE" ? "Khóa" : "Mở"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateAccountPanel({
  accountForm,
  setAccountForm,
  flatOrgUnits,
  createAccount,
}: {
  accountForm: {
    email_dang_nhap: string;
    username: string;
    password: string;
    role_code: string;
    org_unit_id: string;
    scope_type: string;
  };
  setAccountForm: (value: {
    email_dang_nhap: string;
    username: string;
    password: string;
    role_code: string;
    org_unit_id: string;
    scope_type: string;
  }) => void;
  flatOrgUnits: OrgUnitNode[];
  createAccount: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const filteredRoleOptions = getRoleOptionsForOrgUnit(
    accountForm.org_unit_id,
    flatOrgUnits,
    accountForm.role_code,
  );

  function updateAccountOrgUnit(orgUnitId: string) {
    const nextRoleOptions = getRoleOptionsForOrgUnit(
      orgUnitId,
      flatOrgUnits,
      accountForm.role_code,
    );
    const nextRoleCode = nextRoleOptions.some(
      (item) => item.value === accountForm.role_code,
    )
      ? accountForm.role_code
      : getFirstOptionValue(nextRoleOptions);

    setAccountForm({
      ...accountForm,
      org_unit_id: orgUnitId,
      role_code: nextRoleCode,
    });
  }

  return (
    <div className="fts-card rounded-[2rem] p-6">
      <SectionTitle title="Cập tài khoản nội bộ" />
      <form onSubmit={createAccount} className="mt-5 grid gap-4 md:grid-cols-2">
        <InputField
          label="Email đăng nhập"
          type="email"
          value={accountForm.email_dang_nhap}
          onChange={(value) =>
            setAccountForm({
              ...accountForm,
              email_dang_nhap: value,
              username: accountForm.username || value,
            })
          }
        />
        <InputField
          label="Username"
          value={accountForm.username}
          onChange={(value) =>
            setAccountForm({ ...accountForm, username: value })
          }
        />
        <InputField
          label="Mật khẩu tạm"
          value={accountForm.password}
          placeholder="Bỏ trống để tự sinh"
          onChange={(value) =>
            setAccountForm({ ...accountForm, password: value })
          }
        />
        <SelectField
          label="Vai trò"
          value={accountForm.role_code}
          onChange={(value) =>
            setAccountForm({ ...accountForm, role_code: value })
          }
          options={filteredRoleOptions}
        />
        <SelectField
          label="Phạm vi đơn vị"
          value={accountForm.org_unit_id}
          onChange={updateAccountOrgUnit}
          options={flatOrgUnits.map((org) => ({
            value: org.id,
            label: `${"- ".repeat(Number(org.cap_do || 1) - 1)}${org.ten_don_vi}`,
          }))}
        />
        <SelectField
          label="Kiểu phạm vi"
          value={accountForm.scope_type}
          onChange={(value) =>
            setAccountForm({ ...accountForm, scope_type: value })
          }
          options={[
            { value: "SELF", label: "Chỉ bản thân" },
            { value: "ORG_ONLY", label: "Chỉ đơn vị này" },
            { value: "ORG_TREE", label: "Đơn vị và cấp dưới" },
            { value: "ALL", label: "Toàn hệ thống" },
          ]}
        />
        <div className="md:col-span-2">
          <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">
            Tạo tài khoản đăng nhập
          </button>
        </div>
      </form>
    </div>
  );
}
