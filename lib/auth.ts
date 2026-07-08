import type { AuthUser } from "@/types/api";
import { normalizeRoleCode } from "@/lib/permissions";

const TOKEN_KEY = "fts_office_token";
const USER_KEY = "fts_office_user";
const PERMISSIONS_KEY = "fts_office_permissions";
const ROLES_KEY = "fts_office_roles";
const AUTH_VERIFIED_AT_KEY = "fts_office_auth_verified_at";
const AUTH_CHANGED_EVENT = "fts_office_auth_changed";

const DEFAULT_AUTH_VERIFY_TTL_MS = 10 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function splitTextList(value: string) {
  return value
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJsonStorage(key: string): unknown {
  if (typeof window === "undefined") return undefined;

  const raw = localStorage.getItem(key);

  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function notifyAuthChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeAuthChanged(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function extractPermissionValues(input: unknown): string[] {
  if (!input) return [];

  if (typeof input === "string") {
    return splitTextList(input);
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => extractPermissionValues(item));
  }

  if (isRecord(input)) {
    const directFields = [
      "permission_code",
      "permissionCode",
      "permission_name",
      "permissionName",
      "permission",
      "Permission",
    ];

    const directValues = directFields.flatMap((field) =>
      extractPermissionValues(input[field]),
    );

    const nestedFields = [
      "permissions",
      "Permissions",
      "permissionList",
      "PermissionList",
      "quyen",
      "Quyen",
      "quyenHan",
      "QuyenHan",
    ];

    const nestedValues = nestedFields.flatMap((field) =>
      extractPermissionValues(input[field]),
    );

    return [...directValues, ...nestedValues];
  }

  return [];
}

export function normalizePermissions(input: unknown): string[] {
  return unique(extractPermissionValues(input));
}

function extractRoleValues(input: unknown): string[] {
  if (!input) return [];

  if (typeof input === "string") {
    return splitTextList(input);
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => extractRoleValues(item));
  }

  if (isRecord(input)) {
    const directFields = [
      "role_code",
      "roleCode",
      "role_name",
      "roleName",
      "role",
      "Role",
      "code",
      "Code",
      "chucDanh",
      "ChucDanh",
      "chuc_danh",
      "Chuc_danh",
      "Chức danh",
      "Chuc danh",
      "capQuyen",
      "CapQuyen",
      "cap_quyen",
      "Cấp quyền",
      "Cap quyen",
      "chucVu",
      "ChucVu",
      "chuc_vu",
      "Chức vụ",
      "Chuc vu",
      "position",
      "Position",
      "title",
      "Title",
    ];

    const directValues = directFields.flatMap((field) =>
      extractRoleValues(input[field]),
    );

    const nestedFields = [
      "roles",
      "Roles",
      "roleList",
      "RoleList",
      "userRoles",
      "UserRoles",
    ];

    const nestedValues = nestedFields.flatMap((field) =>
      extractRoleValues(input[field]),
    );

    return [...directValues, ...nestedValues];
  }

  return [];
}

export function normalizeRoles(input: unknown): string[] {
  return unique(extractRoleValues(input).map((role) => normalizeRoleCode(role)));
}

export function markAuthVerified() {
  if (typeof window === "undefined") return;

  localStorage.setItem(AUTH_VERIFIED_AT_KEY, String(Date.now()));
}

export function shouldVerifyAuth(ttlMs = DEFAULT_AUTH_VERIFY_TTL_MS) {
  if (typeof window === "undefined") return true;

  const raw = localStorage.getItem(AUTH_VERIFIED_AT_KEY);

  if (!raw) return true;

  const verifiedAt = Number(raw);

  if (!Number.isFinite(verifiedAt)) return true;

  return Date.now() - verifiedAt > ttlMs;
}

export function invalidateAuthVerified() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(AUTH_VERIFIED_AT_KEY);
}

export function saveAuth(
  token: string,
  user: AuthUser | unknown,
  permissions: unknown = [],
  roles: unknown = [],
) {
  if (typeof window === "undefined") return;

  const normalizedPermissions = unique([
    ...normalizePermissions(permissions),
    ...normalizePermissions(user),
  ]);
  const normalizedRoles = unique([
    ...normalizeRoles(roles),
    ...normalizeRoles(user),
  ]);

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(normalizedPermissions));
  localStorage.setItem(ROLES_KEY, JSON.stringify(normalizedRoles));

  markAuthVerified();
  notifyAuthChanged();
}

export function updateStoredUser(
  user: AuthUser | unknown,
  permissions?: unknown,
  roles?: unknown,
) {
  if (typeof window === "undefined") return;

  const previousPermissions = normalizePermissions(readJsonStorage(PERMISSIONS_KEY));
  const previousRoles = normalizeRoles(readJsonStorage(ROLES_KEY));
  const nextPermissions = unique([
    ...previousPermissions,
    ...normalizePermissions(user),
    ...(permissions !== undefined ? normalizePermissions(permissions) : []),
  ]);
  const nextRoles = unique([
    ...previousRoles,
    ...normalizeRoles(user),
    ...(roles !== undefined ? normalizeRoles(roles) : []),
  ]);

  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(nextPermissions));
  localStorage.setItem(ROLES_KEY, JSON.stringify(nextRoles));

  notifyAuthChanged();
}

export function getToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getCurrentUser<T = AuthUser>(): T | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getPermissions() {
  if (typeof window === "undefined") return [];

  return unique([
    ...normalizePermissions(readJsonStorage(PERMISSIONS_KEY)),
    ...normalizePermissions(readJsonStorage(USER_KEY)),
  ]);
}

export function getRoles() {
  if (typeof window === "undefined") return [];

  return unique([
    ...normalizeRoles(readJsonStorage(ROLES_KEY)),
    ...normalizeRoles(readJsonStorage(USER_KEY)),
  ]);
}

export function clearAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(ROLES_KEY);
  localStorage.removeItem(AUTH_VERIFIED_AT_KEY);
  notifyAuthChanged();
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function userNeedsPasswordChange(user?: AuthUser | null) {
  if (!user) return false;

  return String(user.require_password_change || "").toUpperCase() === "TRUE";
}
