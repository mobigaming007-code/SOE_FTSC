import { getToken } from "./auth";
import type { ApiResponse } from "@/types/api";

type GasOptions = {
  path: string;
  method?: "GET" | "POST";
  params?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  withToken?: boolean;
  skipAuth?: boolean;
};

export async function gasFetch<T = unknown>({
  path,
  method = "GET",
  params = {},
  body = {},
  withToken = true,
  skipAuth = false,
}: GasOptions): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams();
  searchParams.set("path", path);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const token = withToken && !skipAuth ? getToken() : "";

  if (method === "GET" && token) {
    searchParams.set("token", token);
  }

  const url = `/api/gas?${searchParams.toString()}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "text/plain",
    },
    body:
      method === "POST"
        ? JSON.stringify({
            ...body,
            ...(token ? { token } : {}),
          })
        : undefined,
  });

  const text = await response.text();

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      code: "INVALID_JSON",
      message: "API không trả về JSON hợp lệ.",
      detail: text,
    };
  }
}
