/**
 * Connection Configuration
 * Manages Server/Client mode for LAN data synchronization.
 * 
 * Server mode: This machine runs json-server, others connect to it.
 * Client mode: This machine connects to a remote json-server on another machine.
 */

const STORAGE_KEY = 'app_connection_config';

const DEFAULT_CONFIG = {
  mode: 'server',       // 'server' | 'client'
  serverIP: '',         // IP of remote server (only used in client mode)
  serverPort: 5000,
  helperPort: 5001,
};

export function getConnectionConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to read connection config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConnectionConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save connection config:', e);
  }
}

/**
 * Get the base API URL based on current connection mode.
 * - Server mode: http://localhost:5000
 * - Client mode: http://<serverIP>:5000
 */
export function getApiBaseUrl() {
  const config = getConnectionConfig();
  if (config.mode === 'client' && config.serverIP) {
    return `http://${config.serverIP}:${config.serverPort}`;
  }
  return `http://localhost:${config.serverPort}`;
}

/**
 * Get the helper API URL based on current connection mode.
 * - Server mode: http://localhost:5001
 * - Client mode: http://<serverIP>:5001
 */
export function getHelperUrl() {
  const config = getConnectionConfig();
  if (config.mode === 'client' && config.serverIP) {
    return `http://${config.serverIP}:${config.helperPort}`;
  }
  return `http://localhost:${config.helperPort}`;
}

/**
 * Test connection to a remote server.
 * Returns { success: boolean, message: string }
 */
export async function testConnection(ip, port = 5000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`http://${ip}:${port}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return { success: true, message: 'Kết nối thành công!' };
    }
    return { success: false, message: `Server trả về lỗi: ${res.status}` };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, message: 'Hết thời gian chờ (5 giây). Kiểm tra IP và đảm bảo server đang chạy.' };
    }
    return { success: false, message: `Không thể kết nối: ${e.message}` };
  }
}
