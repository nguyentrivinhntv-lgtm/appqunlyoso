import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { History, Search, Loader2, Monitor, User } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getLogs();
      // Sort by newest first
      const sorted = (data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(sorted);
    } catch (err) {
      toast.error('Lỗi khi tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.username?.toLowerCase().includes(search) ||
      log.userFullName?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search) ||
      log.details?.toLowerCase().includes(search)
    );
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-primary-600" />
            Nhật Ký Hệ Thống
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Theo dõi mọi hoạt động của người dùng trên toàn bộ các máy
          </p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm hành động, người dùng..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-48">Thời gian</th>
                <th className="px-6 py-4 w-48">Người thực hiện</th>
                <th className="px-6 py-4 w-40">Hành động</th>
                <th className="px-6 py-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.userFullName}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        Tài khoản: {log.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span>{log.details}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Monitor className="w-3 h-3" /> 
                        Thực hiện từ: {log.machine === 'server' ? 'Máy Server' : 'Máy Client'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    Không tìm thấy dữ liệu nhật ký
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
