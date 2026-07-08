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
  return Array.from(new Set(values.filter(Boolean)));
}

function splitTextList(value: string) {
  return value
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
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
      "code",
      "name",
      "permission",
      "Permission",
    ];

    for (const field of directFields) {
      const value = input[field];

      if (typeof value === "string") {
        return splitTextList(value);
      }
    }

    const nestedFields = ["permissions", "Permissions", "quyen", "Quyen"];

    return nestedFields.flatMap((field) => extractPermissionValues(input[field]));
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
      "code",
      "role_name",
      "roleName",
      "role",
      "Role",
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
      "position",
      "Position",
      "title",
      "Title",
    ];

    const directValues = directFields.flatMap((field) => {
      const value = input[field];
      return typeof value === "string" ? splitTextList(value) : [];
    });

    const nestedFields = ["roles", "Roles", "roleList", "RoleList", "chucVu", "ChucVu"];
    const nestedValues = nestedFields.flatMap((field) => extractRoleValues(input[field]));

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
  const normalizedRoles = unique([...normalizeRoles(roles), ...normalizeRoles(user)]);

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

  localStorage.setItem(USER_KEY, JSON.stringify(user || null));

  if (permissions !== undefined) {
    localStorage.setItem(
      PERMISSIONS_KEY,
      JSON.stringify(unique([...normalizePermissions(permissions), ...normalizePermissions(user)])),
    );
  }

  if (roles !== undefined) {
    localStorage.setItem(
      ROLES_KEY,
      JSON.stringify(unique([...normalizeRoles(roles), ...normalizeRoles(user)])),
    );
  }

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

  const raw = localStorage.getItem(PERMISSIONS_KEY);

  if (!raw) return [];

  try {
    return normalizePermissions(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function getRoles() {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(ROLES_KEY);

  if (!raw) return [];

  try {
    return normalizeRoles(JSON.parse(raw));
  } catch {
    return [];
  }
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
