const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);

  // If token is invalid or was revoked due to a password reset on another device
  if (res.status === 401 && !path.includes('/api/auth/login') && !path.includes('/api/auth/signup') && !path.includes('/api/auth/forgot-password')) {
    try {
      const cloned = res.clone();
      const data = await cloned.json();
      if (data?.code === 'SESSION_REVOKED') {
        window.dispatchEvent(
          new CustomEvent('finatle:session_revoked', {
            detail: {
              message: data.message || 'Your session expired because your password was changed from another device. Please log in again.',
            },
          })
        );
      }
    } catch {
      // Ignore clone/json parse errors
    }
  }

  return res;
}
