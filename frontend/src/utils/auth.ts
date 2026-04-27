export function getToken(): string | null {
  return localStorage.getItem('license_admin_token');
}

export function setToken(token: string): void {
  localStorage.setItem('license_admin_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('license_admin_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp || timestamp <= 0) {
    return 'Invalid Date';
  }
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp || timestamp <= 0) {
    return 'Invalid Date';
  }
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
