export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const {
    timeoutMs = 180000,
    headers,
    body,
    ...rest
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body,
      signal: controller.signal,
    });
    return res;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('等待超過時間，請確認後端是否正常運作後再試', 408);
    }
    throw new ApiError('無法連線後端，請稍後再試', 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiJson(path, body, options = {}) {
  const res = await apiFetch(path, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: body == null ? undefined : JSON.stringify(body),
    timeoutMs: options.timeoutMs,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.error) {
    throw new ApiError(data.error || res.statusText || '請求失敗', res.status);
  }
  return data;
}

export async function apiGetJson(path, options = {}) {
  const res = await apiFetch(path, { method: 'GET', timeoutMs: options.timeoutMs });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.error) {
    throw new ApiError(data.error || res.statusText || '請求失敗', res.status);
  }
  return data;
}
