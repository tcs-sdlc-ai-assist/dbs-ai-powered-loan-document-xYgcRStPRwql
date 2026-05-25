"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (url: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  get: (url: string, options?: Omit<RequestOptions, "method" | "body">) => Promise<ApiResponse<T>>;
  post: (url: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) => Promise<ApiResponse<T>>;
  put: (url: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) => Promise<ApiResponse<T>>;
  del: (url: string, options?: Omit<RequestOptions, "method" | "body">) => Promise<ApiResponse<T>>;
  reset: () => void;
}

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** If true, the body is sent as FormData (no JSON serialization, no Content-Type header) */
  formData?: boolean;
  /** If true, loading state is not set (useful for background refreshes) */
  silent?: boolean;
}

// ---------------------------------------------------------------------------
// Default headers
// ---------------------------------------------------------------------------

function buildHeaders(
  options?: RequestOptions
): HeadersInit {
  const headers: Record<string, string> = {};

  // Do not set Content-Type for FormData — the browser sets it with the boundary
  if (!options?.formData) {
    headers["Content-Type"] = "application/json";
  }

  // Merge any custom headers
  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers[key] = value;
    }
  }

  return headers;
}

// ---------------------------------------------------------------------------
// useApi Hook
// ---------------------------------------------------------------------------

function useApi<T = unknown>(): UseApiReturn<T> {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [state, setState] = React.useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  // Use a ref to track whether the component is still mounted
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Core execute method
  // ---------------------------------------------------------------------------

  const execute = React.useCallback(
    async (url: string, options?: RequestOptions): Promise<ApiResponse<T>> => {
      const method = options?.method ?? "GET";
      const silent = options?.silent ?? false;

      if (!silent && mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));
      }

      try {
        // Build fetch init
        const fetchInit: RequestInit = {
          method,
          headers: buildHeaders(options),
          credentials: "include",
        };

        // Attach body for non-GET requests
        if (options?.body !== undefined && method !== "GET") {
          if (options.formData && options.body instanceof FormData) {
            fetchInit.body = options.body;
            // Remove Content-Type so the browser can set it with the boundary
            const headers = fetchInit.headers as Record<string, string>;
            delete headers["Content-Type"];
          } else {
            fetchInit.body = JSON.stringify(options.body);
          }
        }

        const response = await fetch(url, fetchInit);

        // Handle 401 — redirect to login
        if (response.status === 401) {
          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              data: null,
              error: "Authentication required. Redirecting to login…",
              loading: false,
            }));
          }

          // Sign out and redirect
          await signOut({ redirect: false });
          router.push("/login");

          return {
            success: false,
            error: "Authentication required",
          };
        }

        // Parse JSON response
        let responseData: ApiResponse<T>;

        try {
          responseData = await response.json();
        } catch {
          const errorMessage = `Unexpected response format (HTTP ${response.status})`;

          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              data: null,
              error: errorMessage,
              loading: false,
            }));
          }

          return {
            success: false,
            error: errorMessage,
          };
        }

        // Handle non-OK responses
        if (!response.ok || !responseData.success) {
          const errorMessage =
            responseData.error ??
            responseData.message ??
            `Request failed with status ${response.status}`;

          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              data: null,
              error: errorMessage,
              loading: false,
            }));
          }

          return {
            success: false,
            error: errorMessage,
            meta: responseData.meta,
          };
        }

        // Success
        if (mountedRef.current) {
          setState({
            data: responseData.data ?? null,
            error: null,
            loading: false,
          });
        }

        return responseData;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred";

        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            data: null,
            error: errorMessage,
            loading: false,
          }));
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [router]
  );

  // ---------------------------------------------------------------------------
  // Convenience methods
  // ---------------------------------------------------------------------------

  const get = React.useCallback(
    async (
      url: string,
      options?: Omit<RequestOptions, "method" | "body">
    ): Promise<ApiResponse<T>> => {
      return execute(url, { ...options, method: "GET" });
    },
    [execute]
  );

  const post = React.useCallback(
    async (
      url: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">
    ): Promise<ApiResponse<T>> => {
      return execute(url, { ...options, method: "POST", body });
    },
    [execute]
  );

  const put = React.useCallback(
    async (
      url: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">
    ): Promise<ApiResponse<T>> => {
      return execute(url, { ...options, method: "PUT", body });
    },
    [execute]
  );

  const del = React.useCallback(
    async (
      url: string,
      options?: Omit<RequestOptions, "method" | "body">
    ): Promise<ApiResponse<T>> => {
      return execute(url, { ...options, method: "DELETE" });
    },
    [execute]
  );

  // ---------------------------------------------------------------------------
  // Reset state
  // ---------------------------------------------------------------------------

  const reset = React.useCallback(() => {
    if (mountedRef.current) {
      setState({
        data: null,
        error: null,
        loading: false,
      });
    }
  }, []);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    execute,
    get,
    post,
    put,
    del,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default useApi;
export { useApi };
export type { UseApiReturn, UseApiState, RequestOptions, HttpMethod };