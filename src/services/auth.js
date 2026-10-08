const AUTH_STORAGE_KEY = 'app_current_user';

export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Lỗi khi đọc thông tin đăng nhập:', e);
  }
  return null;
}

export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Lỗi khi lưu thông tin đăng nhập:', e);
  }
}

export function logout() {
  setCurrentUser(null);
}

export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === 'admin';
}
