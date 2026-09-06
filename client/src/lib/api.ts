const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}