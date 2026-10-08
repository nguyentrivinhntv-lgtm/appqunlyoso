import axios from 'axios';
import { getApiBaseUrl, getHelperUrl } from './connectionConfig';

function BASE_URL() { return getApiBaseUrl(); }
function STUDENTS_API() { return `${BASE_URL()}/students`; }
function PROCESSED_API() { return `${getApiBaseUrl()}/processedProfiles`; }
function PRINT_QUEUE_API() { return `${getApiBaseUrl()}/printQueue`; }
function USERS_API() { return `${getApiBaseUrl()}/users`; }
function LOGS_API() { return `${getApiBaseUrl()}/activityLogs`; }
function HELPER() { return getHelperUrl(); }

export const api = {
  // --- Students API ---
  getStudents: async () => {
    const res = await axios.get(`${STUDENTS_API()}?_t=${Date.now()}`);
    return res.data;
  },
  
  updateStudent: async (id, updatedData) => {
    const res = await axios.put(`${STUDENTS_API()}/${id}`, updatedData);
    return res.data;
  },

  fetchStudentFromWeb: async (studentId) => {
    const res = await axios.post(`${HELPER()}/fetch-student-web`, { studentId });
    return res.data;
  },

  // --- Processed Profiles API ---
  getProcessedProfiles: async () => {
    const res = await axios.get(`${PROCESSED_API()}?_t=${Date.now()}`);
    return res.data;
  },
  
  recordProcessedProfile: async (recordData) => {
    const res = await axios.post(PROCESSED_API(), recordData);
    return res.data;
  },
  
  deleteProcessedProfile: async (id) => {
    const res = await axios.delete(`${PROCESSED_API()}/${id}`);
    return res.data;
  },

  // --- Print Queue API ---
  getPrintQueue: async () => {
    try {
      const res = await axios.get(`${PRINT_QUEUE_API()}?_t=${Date.now()}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      console.warn("Print queue may not exist yet in db.json", e);
      return [];
    }
  },

  addToPrintQueue: async (item) => {
    const res = await axios.post(PRINT_QUEUE_API(), item);
    return res.data;
  },

  removeFromPrintQueue: async (id) => {
    const res = await axios.delete(`${PRINT_QUEUE_API()}/${id}`);
    return res.data;
  },

  updatePrintQueueItem: async (id, item) => {
    const res = await axios.put(`${PRINT_QUEUE_API()}/${id}`, item);
    return res.data;
  },

  replacePrintQueue: async (queueArray) => {
    try {
      await axios.post(`${HELPER()}/replace-queue`, queueArray);
    } catch (e) {
      console.error('Lỗi khi lưu hàng đợi mới:', e);
    }
  },

  // --- Users API ---
  getUsers: async () => {
    const res = await axios.get(`${USERS_API()}?_t=${Date.now()}`);
    return res.data;
  },
  createUser: async (user) => {
    const res = await axios.post(USERS_API(), user);
    return res.data;
  },
  updateUser: async (id, data) => {
    const res = await axios.put(`${USERS_API()}/${id}`, data);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await axios.delete(`${USERS_API()}/${id}`);
    return res.data;
  },

  // --- Activity Logs API ---
  getLogs: async () => {
    const res = await axios.get(`${LOGS_API()}?_t=${Date.now()}`);
    return res.data;
  },
  logActivity: async (action, details = '') => {
    try {
      const stored = localStorage.getItem('app_current_user');
      const currentUser = stored ? JSON.parse(stored) : { fullName: 'Unknown', username: 'unknown' };
      const config = localStorage.getItem('app_connection_config');
      const machineMode = config ? JSON.parse(config).mode : 'server';
      
      const logEntry = {
        action,
        details,
        userFullName: currentUser.fullName,
        username: currentUser.username,
        machine: machineMode,
        timestamp: new Date().toISOString()
      };
      await axios.post(LOGS_API(), logEntry);
    } catch (e) {
      console.error('Lỗi khi ghi log:', e);
    }
  }
};
