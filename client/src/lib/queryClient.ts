import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "include",
  });

  await throwIfResNotOk(res);

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * getQueryFn
 * - Centralized QueryFunction used as React Query default.
 * - Builds the request URL from queryKey robustly:
 *   * If queryKey is a single string -> use as-is.
 *   * If queryKey is [base, value] -> call `${base}?q=value`.
 *   * If queryKey is [base, ...rest] with multiple rest args ->
 *       - if extra args are objects/params, this implements simple argN= encoding.
 * - Sends Authorization header when token is present in localStorage.
 * - Honors on401 behavior (returnNull or throw).
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Build URL
    let url = '';
    if (typeof queryKey === 'string') {
      url = queryKey;
    } else if (Array.isArray(queryKey) && typeof queryKey[0] === 'string') {
      url = queryKey[0];
      const rest = queryKey.slice(1).filter((r) => r !== undefined && r !== null);

      if (rest.length === 1) {
        // Common pattern: ['/api/users/search', searchQuery]
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}q=${encodeURIComponent(String(rest[0]))}`;
      } else if (rest.length > 1) {
        // Multiple extras -> arg1=..., arg2=...
        const sep = url.includes('?') ? '&' : '?';
        const params = rest.map((r, i) => `arg${i + 1}=${encodeURIComponent(String(r))}`).join('&');
        url = `${url}${sep}${params}`;
      }
    } else {
      // Fallback: stringify the whole queryKey
      url = String(queryKey);
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
